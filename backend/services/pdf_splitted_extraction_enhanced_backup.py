#!/usr/bin/env python3
"""
Enhanced PDF Splitted Extraction v2.0 - Comprehensive table extraction with proper multi-row cell handling

This version includes:
- Multi-row cell detection and merging
- Advanced table structure analysis
- Template column alignment with fuzzy matching
- Comprehensive text extraction from complex tables
- Better handling of merged cells and spanning text
"""

import json
import re
import string
from pathlib import Path
import pdfplumber
import camelot
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional
from collections import defaultdict
import difflib

def load_template(path):
    """Load and normalize template structure"""
    with open(path, "r", encoding="utf-8") as f:
        template = json.load(f)

    # Handle different template formats
    if "FlatHeaders" in template and isinstance(template["FlatHeaders"], list):
        return template
    elif "FlatHeaders" in template and isinstance(template["FlatHeaders"], dict):
        template["FlatHeaders"] = list(template["FlatHeaders"].keys())
        return template
    elif "Headers" in template:
        template["FlatHeaders"] = list(template["Headers"].keys())
        return template
    else:
        # Create default structure
        template["FlatHeaders"] = ["Particulars", "Current_Year", "Previous_Year"]
        print(f"Added fallback FlatHeaders: {template['FlatHeaders']}")
    
    return template

def normalize_text(s: str) -> str:
    """Normalize text for comparison"""
    if not s:
        return ""
    s = re.sub(r"\s+", " ", s).strip()
    return s.strip(string.punctuation + " ").lower()

def extract_comprehensive_tables(pdf_path: str, page_num: int) -> List[List[List[str]]]:
    """Extract tables using multiple methods and merge results"""
    all_tables = []
    
    print(f"🔍 Extracting tables from page {page_num} using multiple methods...")
    
    # Method 1: Camelot (best for structured tables)
    try:
        for flavor in ["stream", "lattice"]:
            camelot_tables = camelot.read_pdf(pdf_path, pages=str(page_num), flavor=flavor)
            for i, table in enumerate(camelot_tables):
                if table.accuracy > 50:  # Only use high-accuracy tables
                    table_data = table.df.fillna("").values.tolist()
                    if table_data and len(table_data) > 1:
                        all_tables.append({
                            'method': f'camelot_{flavor}',
                            'data': table_data,
                            'accuracy': table.accuracy,
                            'rows': len(table_data),
                            'cols': len(table_data[0]) if table_data else 0
                        })
                        print(f"✅ Camelot {flavor} table {i}: {len(table_data)} rows, accuracy: {table.accuracy}%")
    except Exception as e:
        print(f"⚠️ Camelot extraction failed: {e}")
    
    # Method 2: PDFplumber (best for text-based tables)
    try:
        with pdfplumber.open(pdf_path) as pdf:
            if page_num <= len(pdf.pages):
                page = pdf.pages[page_num - 1]
                
                # Extract all tables
                tables = page.extract_tables()
                for i, table in enumerate(tables or []):
                    if table and len(table) > 1:
                        # Clean the table data
                        cleaned_table = []
                        for row in table:
                            cleaned_row = [str(cell).strip() if cell else "" for cell in row]
                            cleaned_table.append(cleaned_row)
                        
                        all_tables.append({
                            'method': 'pdfplumber',
                            'data': cleaned_table,
                            'accuracy': 100,  # Assume high accuracy for pdfplumber
                            'rows': len(cleaned_table),
                            'cols': len(cleaned_table[0]) if cleaned_table else 0
                        })
                        print(f"✅ PDFplumber table {i}: {len(cleaned_table)} rows")
                
                # Method 3: Enhanced text-based extraction for complex layouts
                if not all_tables:
                    print("🔍 Attempting enhanced text-based extraction...")
                    text_table = extract_table_from_text_enhanced(page)
                    if text_table:
                        all_tables.append({
                            'method': 'text_enhanced',
                            'data': text_table,
                            'accuracy': 80,
                            'rows': len(text_table),
                            'cols': len(text_table[0]) if text_table else 0
                        })
                        print(f"✅ Text-based table: {len(text_table)} rows")
    
    except Exception as e:
        print(f"⚠️ PDFplumber extraction failed: {e}")
    
    # Deduplicate and return best tables
    best_tables = select_best_tables(all_tables)
    return [table['data'] for table in best_tables]

def extract_table_from_text_enhanced(page) -> List[List[str]]:
    """Enhanced text-based table extraction for complex layouts"""
    text = page.extract_text()
    if not text:
        return []
    
    lines = text.split('\n')
    table_lines = []
    
    # Identify table-like lines (lines with numbers, structured data)
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Check if line looks like table data
        if (re.search(r'\d+', line) and  # Has numbers
            len(line.split()) >= 2 and  # Has multiple words
            not line.lower().startswith(('note', 'page', 'form', 'company')) and  # Not metadata
            not re.match(r'^[A-Z\s]+$', line)):  # Not all caps (likely headers)
            table_lines.append(line)
    
    if len(table_lines) < 2:
        return []
    
    # Convert lines to table structure
    table = []
    for line in table_lines:
        # Split by multiple spaces or tabs
        columns = re.split(r'\s{2,}|\t', line.strip())
        if len(columns) >= 2:
            table.append(columns)
    
    return table if len(table) > 1 else []

def select_best_tables(all_tables: List[dict]) -> List[dict]:
    """Select the best tables from multiple extraction methods"""
    if not all_tables:
        return []
    
    # Sort by accuracy and row count
    sorted_tables = sorted(all_tables, key=lambda x: (x['accuracy'], x['rows']), reverse=True)
    
    selected = []
    used_signatures = set()
    
    for table in sorted_tables:
        # Create a signature for deduplication
        data = table['data']
        if not data:
            continue
            
        # Use first and last rows as signature
        signature = (
            str(data[0][:3]) if len(data[0]) >= 3 else str(data[0]),
            str(data[-1][:3]) if len(data) > 1 and len(data[-1]) >= 3 else str(data[-1]) if len(data) > 1 else ""
        )
        
        if signature not in used_signatures:
            selected.append(table)
            used_signatures.add(signature)
            if len(selected) >= 3:  # Limit to top 3 unique tables
                break
    
    return selected

def detect_multi_row_cells(table: List[List[str]]) -> List[List[str]]:
    """Detect and merge multi-row cells in table data"""
    if not table or len(table) < 2:
        return table
    
    print(f"🔍 Analyzing table for multi-row cells ({len(table)} rows)")
    
    # Create a copy to work with
    merged_table = []
    
    i = 0
    while i < len(table):
        current_row = table[i][:]
        
        # Check if next rows might be continuations
        continuation_rows = []
        j = i + 1
        
        while j < len(table):
            next_row = table[j]
            
            # Check if this looks like a continuation row
            if is_continuation_row(current_row, next_row):
                continuation_rows.append(next_row)
                j += 1
            else:
                break
        
        # Merge continuation rows
        if continuation_rows:
            merged_row = merge_row_continuations(current_row, continuation_rows)
            merged_table.append(merged_row)
            print(f"📝 Merged {len(continuation_rows)} continuation rows into main row")
            i = j  # Skip the merged rows
        else:
            merged_table.append(current_row)
            i += 1
    
    print(f"✅ Multi-row analysis complete: {len(table)} → {len(merged_table)} rows")
    return merged_table

def is_continuation_row(main_row: List[str], test_row: List[str]) -> bool:
    """Check if test_row is a continuation of main_row"""
    if not main_row or not test_row:
        return False
    
    # If first column is empty or very short, might be continuation
    first_col = test_row[0].strip() if test_row else ""
    
    # Continuation indicators
    continuation_indicators = [
        len(first_col) == 0,  # Empty first column
        len(first_col) < 5 and not re.search(r'\d', first_col),  # Short non-numeric
        first_col.startswith(('(', '-', '•', '*')),  # Starts with continuation markers
        first_col.lower() in ['', 'continued', 'cont.', 'etc.']  # Explicit continuation
    ]
    
    # If most columns in test_row are empty except first few, likely continuation
    non_empty_cols = sum(1 for col in test_row if col.strip())
    mostly_empty = non_empty_cols <= 2
    
    return any(continuation_indicators) or mostly_empty

def merge_row_continuations(main_row: List[str], continuation_rows: List[List[str]]) -> List[str]:
    """Merge continuation rows into main row"""
    merged = main_row[:]
    
    for cont_row in continuation_rows:
        for i, cell in enumerate(cont_row):
            if i < len(merged) and cell.strip():
                # Merge cell content
                if merged[i].strip():
                    merged[i] = f"{merged[i].strip()} {cell.strip()}"
                else:
                    merged[i] = cell.strip()
    
    return merged

def align_with_template_columns(table: List[List[str]], template_headers: List[str]) -> List[dict]:
    """Align table columns with template headers using fuzzy matching"""
    if not table or not template_headers:
        return []
    
    print(f"🎯 Aligning table columns with template headers")
    print(f"Template headers: {template_headers}")
    
    # Detect header row
    header_row_idx = detect_header_row(table, template_headers)
    
    if header_row_idx >= 0:
        header_row = table[header_row_idx]
        data_rows = table[header_row_idx + 1:]
        print(f"Header row found at index {header_row_idx}: {header_row}")
    else:
        # No clear header row, use first row and guess alignment
        header_row = table[0] if table else []
        data_rows = table[1:] if len(table) > 1 else table
        print("No clear header row found, using first row")
    
    # Create column mapping
    column_mapping = create_column_mapping(header_row, template_headers)
    print(f"Column mapping: {column_mapping}")
    
    # Convert data rows to template format
    aligned_rows = []
    for row_idx, row in enumerate(data_rows):
        if is_empty_row(row):
            continue
            
        aligned_row = {}
        
        # Initialize all template headers
        for header in template_headers:
            aligned_row[header] = ""
        
        # Map available data
        for col_idx, cell_value in enumerate(row):
            if col_idx in column_mapping:
                template_header = column_mapping[col_idx]
                aligned_row[template_header] = str(cell_value).strip()
        
        # Only add rows that have meaningful data
        if has_meaningful_data(aligned_row):
            aligned_rows.append(aligned_row)
    
    print(f"✅ Aligned {len(aligned_rows)} data rows to template structure")
    return aligned_rows

def detect_header_row(table: List[List[str]], template_headers: List[str]) -> int:
    """Detect which row contains the table headers"""
    if not table or len(table) < 2:
        return -1
    
    best_score = 0
    best_row_idx = -1
    
    # Check first few rows for header-like content
    for row_idx, row in enumerate(table[:5]):
        score = 0
        
        for cell in row:
            cell_clean = normalize_text(str(cell))
            
            # Check similarity with template headers
            for template_header in template_headers:
                template_clean = normalize_text(template_header)
                
                # Exact match
                if cell_clean == template_clean:
                    score += 10
                # Partial match
                elif template_clean in cell_clean or cell_clean in template_clean:
                    score += 5
                # Fuzzy match
                elif difflib.SequenceMatcher(None, cell_clean, template_clean).ratio() > 0.6:
                    score += 3
            
            # Check for common header keywords
            header_keywords = ['particulars', 'current', 'previous', 'amount', 'balance', 
                             'year', 'period', 'total', 'description', 'item']
            if any(keyword in cell_clean for keyword in header_keywords):
                score += 2
        
        if score > best_score:
            best_score = score
            best_row_idx = row_idx
    
    return best_row_idx if best_score > 3 else -1

def create_column_mapping(header_row: List[str], template_headers: List[str]) -> Dict[int, str]:
    """Create mapping from table column indices to template headers"""
    mapping = {}
    used_headers = set()
    
    for col_idx, column_header in enumerate(header_row):
        if not column_header or not str(column_header).strip():
            continue
            
        column_clean = normalize_text(str(column_header))
        
        best_match = None
        best_score = 0
        
        for template_header in template_headers:
            if template_header in used_headers:
                continue
                
            template_clean = normalize_text(template_header)
            
            # Calculate similarity score
            if column_clean == template_clean:
                score = 100
            elif template_clean in column_clean or column_clean in template_clean:
                score = 80
            else:
                score = int(difflib.SequenceMatcher(None, column_clean, template_clean).ratio() * 100)
            
            if score > best_score and score > 50:  # Minimum 50% similarity
                best_score = score
                best_match = template_header
        
        if best_match:
            mapping[col_idx] = best_match
            used_headers.add(best_match)
    
    # Handle unmapped template headers (assign to remaining columns)
    unmapped_headers = [h for h in template_headers if h not in used_headers]
    unmapped_cols = [i for i in range(len(header_row)) if i not in mapping]
    
    for i, header in enumerate(unmapped_headers):
        if i < len(unmapped_cols):
            mapping[unmapped_cols[i]] = header
    
    return mapping

def is_empty_row(row: List[str]) -> bool:
    """Check if a row is effectively empty"""
    return not any(str(cell).strip() for cell in row)

def has_meaningful_data(row_dict: Dict[str, str]) -> bool:
    """Check if a row has meaningful data beyond just whitespace"""
    meaningful_cells = 0
    
    for key, value in row_dict.items():
        value_clean = str(value).strip()
        if value_clean and len(value_clean) > 1:
            # Check if it's not just punctuation or single characters
            if re.search(r'[a-zA-Z0-9]', value_clean):
                meaningful_cells += 1
    
    return meaningful_cells >= 1  # At least one meaningful cell

def extract_metadata_enhanced(text: str, template: dict) -> dict:
    """Enhanced metadata extraction"""
    meta = {}
    
    # Form Number
    form_patterns = [
        r'\bL[-\s]?(\d+)[-\s]?([A-Z]*)\b',
        r'\bForm\s+L[-\s]?(\d+)[-\s]?([A-Z]*)\b',
        r'\b(L\d+[A-Z]*)\b'
    ]
    
    form_no = ""
    for pattern in form_patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            if len(match.groups()) >= 2:
                form_no = f"L-{match.group(1)}-{match.group(2)}" if match.group(2) else f"L-{match.group(1)}"
            else:
                form_no = match.group(1)
            break
    
    meta["Form No"] = form_no
    
    # Company Name/Title
    company_patterns = [
        r'([A-Z0-9\s&\.\-\']+(?:INSURANCE COMPANY LIMITED|COMPANY LIMITED|INSURANCE LIMITED|COMPANY LTD|INSURANCE CO\.? LTD))',
        r'([A-Z\s]+INSURANCE[A-Z\s]*(?:COMPANY|LIMITED|LTD))',
    ]
    
    title = ""
    for pattern in company_patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            title = match.group(1).strip()
            break
    
    meta["Title"] = title or template.get("Title", "")
    
    # Registration Number
    reg_patterns = [
        r'(?:Regn\.?\s*No\.?|Registration\s*Number|Reg\s*No)\s*[:\-]?\s*([^\n]+)',
        r'Registration\s*[:\-]\s*([^\n]+)'
    ]
    
    reg_no = ""
    for pattern in reg_patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            reg_no = match.group(1).strip()
            break
    
    meta["RegistrationNumber"] = reg_no
    
    # Period
    period_patterns = [
        r'(?:for the .*?ended.*?\d{4})',
        r'(?:as at.*?\d{4})',
        r'(?:period ended.*?\d{4})',
        r'(?:quarter ended.*?\d{4})'
    ]
    
    period = ""
    for pattern in period_patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            period = match.group(0).strip()
            break
    
    meta["Period"] = period
    
    # Currency
    currency_patterns = [
        r'(?:\(|\b)(₹|Rs|INR).{0,20}?(lakh|lac|crore|cr)\b',
        r'amt\.?\s*in\s*rs\.?\s*(lakhs?|crores?)',
        r'rs\.?\s*in\s*(lakhs?|crores?)'
    ]
    
    currency = ""
    for pattern in currency_patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            unit = match.group(-1).lower()  # Last captured group
            if 'crore' in unit or 'cr' in unit:
                currency = "in Crores"
            else:
                currency = "in Lakhs"
            break
    
    meta["Currency"] = currency or "in Lakhs"
    
    return meta

def extract_form_enhanced(pdf_path: str, template_json: str, output_json: str) -> str:
    """Enhanced form extraction with comprehensive table processing"""
    
    print(f"[ENHANCED] Starting enhanced extraction")
    print(f"[PDF] {pdf_path}")
    print(f"[TEMPLATE] {template_json}")
    print(f"[OUTPUT] {output_json}")
    
    try:
        # Load template
        template = load_template(template_json)
        flat_headers = template.get("FlatHeaders", [])
        
        if not flat_headers:
            flat_headers = ["Particulars", "Current_Year", "Previous_Year"]
            print(f"⚠️ Using fallback headers: {flat_headers}")
        
        print(f"📊 Template headers: {flat_headers}")
        
        results = []
        
        with pdfplumber.open(pdf_path) as pdf:
            print(f"📄 PDF has {len(pdf.pages)} pages")
            
            for page_idx, page in enumerate(pdf.pages, start=1):
                print(f"\n🔍 Processing page {page_idx}/{len(pdf.pages)}")
                
                # Extract text for metadata
                page_text = page.extract_text() or ""
                
                if len(page_text.strip()) < 50:
                    print(f"⚠️ Page {page_idx} has minimal text, skipping")
                    continue
                
                # Extract metadata
                meta = extract_metadata_enhanced(page_text, template)
                print(f"📝 Metadata: Form={meta.get('Form No', 'N/A')}, Currency={meta.get('Currency', 'N/A')}")
                
                # Extract tables from page
                raw_tables = extract_comprehensive_tables(pdf_path, page_idx)
                
                if not raw_tables:
                    print(f"⚠️ No tables found on page {page_idx}")
                    continue
                
                page_results = []
                
                # Process each table
                for table_idx, raw_table in enumerate(raw_tables):
                    print(f"\n🔄 Processing table {table_idx + 1}/{len(raw_tables)}")
                    print(f"📐 Raw table: {len(raw_table)} rows × {len(raw_table[0]) if raw_table else 0} cols")
                    
                    # Detect and merge multi-row cells
                    merged_table = detect_multi_row_cells(raw_table)
                    
                    # Align with template columns
                    aligned_rows = align_with_template_columns(merged_table, flat_headers)
                    
                    if aligned_rows:
                        table_result = {
                            **meta,
                            "PagesUsed": page_idx,
                            "TableIndex": table_idx + 1,
                            "FlatHeaders": flat_headers,
                            "FlatHeadersNormalized": flat_headers,
                            "Rows": aligned_rows
                        }
                        page_results.append(table_result)
                        print(f"✅ Table {table_idx + 1}: {len(aligned_rows)} aligned rows added")
                    else:
                        print(f"⚠️ Table {table_idx + 1}: No valid data rows found")
                
                results.extend(page_results)
                print(f"📊 Page {page_idx} summary: {len(page_results)} table sections with data")
        
        # Save results
        if not results:
            print("⚠️ No data extracted, creating empty result")
            results = [{
                "Form No": "",
                "Title": "No data extracted",
                "RegistrationNumber": "",
                "Period": "",
                "Currency": "",
                "PagesUsed": 0,
                "TableIndex": 0,
                "FlatHeaders": flat_headers,
                "FlatHeadersNormalized": flat_headers,
                "Rows": []
            }]
        
        # Ensure output directory exists
        output_path = Path(output_json)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        total_rows = sum(len(result.get("Rows", [])) for result in results)
        print(f"\n🎉 Extraction complete!")
        print(f"📊 Total sections: {len(results)}")
        print(f"📊 Total rows: {total_rows}")
        print(f"💾 Saved to: {output_json}")
        
        return output_json
        
    except Exception as e:
        print(f"❌ Extraction error: {e}")
        import traceback
        traceback.print_exc()
        
        # Create error result
        error_result = [{
            "Form No": "ERROR",
            "Title": f"Extraction failed: {str(e)}",
            "RegistrationNumber": "",
            "Period": "",
            "Currency": "",
            "PagesUsed": 0,
            "TableIndex": 0,
            "FlatHeaders": flat_headers if 'flat_headers' in locals() else ["Particulars", "Current_Year", "Previous_Year"],
            "FlatHeadersNormalized": flat_headers if 'flat_headers' in locals() else ["Particulars", "Current_Year", "Previous_Year"],
            "Rows": []
        }]
        
        output_path = Path(output_json)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(error_result, f, indent=2, ensure_ascii=False)
        
        return output_json

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Enhanced PDF form extraction with multi-row cell support")
    parser.add_argument("--template", required=True, help="Template JSON path")
    parser.add_argument("--pdf", required=True, help="PDF file path")
    parser.add_argument("--output", required=True, help="Output JSON path")

    args = parser.parse_args()

    result_path = extract_form_enhanced(args.pdf, args.template, args.output)
    print(f"📄 Enhanced extraction completed: {result_path}")
