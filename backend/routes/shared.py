# Shared utility functions for file routes
import PyPDF2
import pandas as pd
import json
import os
import re
from typing import List, Dict, Any, Tuple
from fastapi import HTTPException


def extract_text_from_pdf(pdf_file):
    """Enhanced PDF text extraction with table and header detection"""
    try:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text_data = []

        for page_num, page in enumerate(pdf_reader.pages):
            text = page.extract_text()
            if text.strip():
                # Analyze the text structure
                structured_content = analyze_text_structure(text, page_num + 1)
                text_data.extend(structured_content)

        return text_data
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error processing PDF: {str(e)}")


def analyze_text_structure(text: str, page_num: int) -> List[Dict[str, Any]]:
    """Analyze text to identify headers, tables, and normal text"""
    lines = text.split('\n')
    structured_data = []
    current_table = []
    in_table = False

    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue

        # Detect table rows (lines with multiple whitespace-separated values or special chars)
        if is_table_row(line):
            if not in_table:
                in_table = True
                current_table = []

            # Parse table row
            table_row = parse_table_row(line)
            current_table.append(table_row)

        else:
            # If we were in a table, save it
            if in_table and current_table:
                structured_data.append({
                    "page": page_num,
                    "type": "table",
                    "content": current_table,
                    "headers": detect_table_headers(current_table),
                    "row_count": len(current_table)
                })
                current_table = []
                in_table = False

            # Classify the line
            line_type = classify_line_type(line)
            structured_data.append({
                "page": page_num,
                "type": line_type,
                "content": line,
                "original_text": line
            })

    # Handle any remaining table data
    if in_table and current_table:
        structured_data.append({
            "page": page_num,
            "type": "table",
            "content": current_table,
            "headers": detect_table_headers(current_table),
            "row_count": len(current_table)
        })

    return structured_data


def is_table_row(line: str) -> bool:
    """Detect if a line is likely part of a table"""
    # Check for patterns that suggest tabular data
    patterns = [
        r'\s+\d+\s+\d+\s+',  # Numbers with spaces
        r'\|\s*[^|]*\s*\|',  # Pipe-delimited
        r'\s{3,}',           # Multiple spaces (column separators)
        r'\d+[\.,]\d+\s+\d+[\.,]\d+',  # Financial numbers
        r'^\s*[A-Z][^a-z]*\s+\d+',     # Category followed by numbers
    ]

    for pattern in patterns:
        if re.search(pattern, line):
            return True

    # Check if line has multiple "words" that could be columns
    parts = re.split(r'\s{2,}', line)  # Split on 2+ spaces
    if len(parts) >= 3:  # At least 3 columns
        return True

    return False


def parse_table_row(line: str) -> Dict[str, str]:
    """Parse a table row into columns"""
    # Try different parsing methods

    # Method 1: Split on multiple spaces
    parts = re.split(r'\s{2,}', line.strip())
    if len(parts) >= 2:
        columns = {}
        for i, part in enumerate(parts):
            columns[f"column_{i+1}"] = part.strip()
        return columns

    # Method 2: Split on pipes if present
    if '|' in line:
        parts = [part.strip() for part in line.split('|') if part.strip()]
        columns = {}
        for i, part in enumerate(parts):
            columns[f"column_{i+1}"] = part
        return columns

    # Method 3: Split on tabs or single spaces (fallback)
    parts = line.split()
    if len(parts) >= 2:
        columns = {}
        for i, part in enumerate(parts):
            columns[f"column_{i+1}"] = part
        return columns

    # Fallback: single column
    return {"column_1": line.strip()}


def detect_table_headers(table_data: List[Dict[str, str]]) -> List[str]:
    """Try to detect table headers from the first few rows"""
    if not table_data:
        return []

    first_row = table_data[0]
    headers = []

    # Check if first row looks like headers (mostly text, no numbers)
    is_header_row = True
    for key, value in first_row.items():
        if re.match(r'^\d+[\.,]?\d*$', value.strip()):  # Pure number
            is_header_row = False
            break

    if is_header_row:
        headers = list(first_row.values())
    else:
        # Generate generic headers
        headers = [f"Column {i+1}" for i in range(len(first_row))]

    return headers


def classify_line_type(line: str) -> str:
    """Classify a line as header, subheader, or normal text"""
    line = line.strip()

    # Headers: All caps, short, or followed by colon
    if (line.isupper() and len(line) < 100) or line.endswith(':'):
        return "header"

    # Subheaders: Start with number/letter followed by period or parenthesis
    if re.match(r'^[A-Za-z0-9]+[\.\)]\s+', line):
        return "subheader"

    # Lists: Start with bullet points or dashes
    if re.match(r'^[\-\*\•]\s+', line):
        return "list_item"

    # Financial/numerical data
    if re.search(r'\d+[\.,]\d+', line) and len(line.split()) <= 10:
        return "numerical_data"

    return "text"


def convert_to_parquet(file_path: str, file_type: str, original_filename: str):
    """Enhanced conversion with structured data extraction"""
    try:
        if file_type == "csv":
            df = pd.read_csv(file_path)
        elif file_type == "json":
            with open(file_path, 'r', encoding='utf-8') as f:
                json_data = json.load(f)
            if isinstance(json_data, list):
                df = pd.DataFrame(json_data)
            elif isinstance(json_data, dict):
                df = pd.DataFrame([json_data])
            else:
                raise ValueError("Unsupported JSON structure")
        elif file_type == "pdf":
            with open(file_path, 'rb') as f:
                structured_data = extract_text_from_pdf(f)

            # Convert structured data to DataFrame
            df = create_structured_dataframe(structured_data)

            # Also save detailed extraction results
            save_extraction_details(structured_data, original_filename)

        else:
            raise ValueError(f"Unsupported file type: {file_type}")

        # Save to converted directory (standardized)
        base_name = os.path.splitext(original_filename)[0]
        output_filename = f"{base_name}_{os.urandom(4).hex()}.parquet"
        output_path = os.path.join("converted", output_filename)
        os.makedirs("converted", exist_ok=True)

        df.to_parquet(output_path, index=False)
        return output_path, output_filename, len(df)

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Conversion failed: {str(e)}")


def create_structured_dataframe(structured_data: List[Dict[str, Any]]) -> pd.DataFrame:
    """Create a DataFrame from structured extraction data"""
    rows = []

    for item in structured_data:
        if item["type"] == "table" and isinstance(item["content"], list):
            # Add table rows
            for table_row in item["content"]:
                row = {
                    "page": item["page"],
                    "type": "table_row",
                    "content": str(table_row),
                    **table_row  # Add individual column data
                }
                rows.append(row)
        else:
            # Add other content types
            rows.append({
                "page": item["page"],
                "type": item["type"],
                "content": item["content"],
                "original_text": item.get("original_text", item["content"])
            })

    if not rows:
        # Fallback to simple structure
        return pd.DataFrame([{"page": 1, "type": "text", "content": "No extractable content"}])

    return pd.DataFrame(rows)


def save_extraction_details(structured_data: List[Dict[str, Any]], original_filename: str):
    """Save detailed extraction results for analysis"""
    try:
        base_name = os.path.splitext(original_filename)[0]
        details_filename = f"{base_name}_{os.urandom(4).hex()}_metadata.json"
        details_path = os.path.join("converted", details_filename)

        # Summarize extraction results
        summary = {
            "original_filename": original_filename,
            "total_items": len(structured_data),
            "content_types": {},
            "tables_found": 0,
            "headers_found": 0,
            "pages_processed": len(set(item["page"] for item in structured_data)),
            "extraction_details": structured_data
        }

        # Count content types
        for item in structured_data:
            content_type = item["type"]
            summary["content_types"][content_type] = summary["content_types"].get(
                content_type, 0) + 1

            if content_type == "table":
                summary["tables_found"] += 1
            elif content_type in ["header", "subheader"]:
                summary["headers_found"] += 1

        with open(details_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)

    except Exception as e:
        print(f"Warning: Could not save extraction details: {e}")


def get_file_extraction_summary(file_id: str) -> Dict[str, Any]:
    """Get extraction summary for a processed file"""
    try:
        # This would be called from a route to get extraction metadata
        # Implementation depends on how file_id maps to metadata files
        pass
    except Exception as e:
        return {"error": str(e)}


# Legacy function for backward compatibility
def extract_text_from_pdf_simple(pdf_file):
    """Simple PDF text extraction (legacy)"""
    try:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text_data = []
        for page_num, page in enumerate(pdf_reader.pages):
            text = page.extract_text()
            if text.strip():
                text_data.append(
                    {"page": page_num + 1, "content": text.strip()})
        return text_data
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error processing PDF: {str(e)}")


def get_parquet_file_path(parquet_filename: str) -> str:
    """Get the full path to a parquet file, checking both converted and extracted directories"""
    # First check the new converted directory
    converted_path = os.path.join("converted", parquet_filename)
    if os.path.exists(converted_path):
        return converted_path

    # Fallback to extracted directory for backward compatibility
    extracted_path = os.path.join("extracted", parquet_filename)
    if os.path.exists(extracted_path):
        return extracted_path

    # Return the preferred path even if file doesn't exist (for error handling)
    return converted_path
