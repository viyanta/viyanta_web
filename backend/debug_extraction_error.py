#!/usr/bin/env python3

import sys
import os
import json
import traceback
from pathlib import Path

def debug_extraction_error():
    """Debug the specific extraction error for HDFC Life embedded value"""
    
    print("🔍 Debugging extraction error...")
    
    sys.path.append('.')
    
    # Find the problematic file
    company = "HDFC Life"
    pdf_name = "HDFC Life  S FY2023 9M"  # Note: double space in original
    split_name = "L-44-EMBEDDED_VALUE_Embedded_Value_86_88_88.pdf"
    
    # Check file structure
    print(f"Looking for: {company} / {pdf_name} / {split_name}")
    
    # Check various possible locations
    possible_paths = [
        f"pdf_splits/hdfc_life/{pdf_name}/{split_name}",
        f"pdf_splits/{company}/{pdf_name}/{split_name}",
        f"pdfs_selected_company/{company}/{pdf_name}/{split_name}",
        f"temp/{split_name}",
        f"uploads/{split_name}",
        f"pdf_folder_extracted/{split_name}",
        f"vifiles/{company}/{pdf_name}/{split_name}",
    ]
    
    pdf_file = None
    for path in possible_paths:
        if os.path.exists(path):
            pdf_file = path
            print(f"✅ Found PDF at: {path}")
            break
    
    if not pdf_file:
        print("❌ PDF file not found in expected locations")
        print("Available directories:")
        for dir_name in ["pdfs_selected_company", "temp", "uploads", "pdf_folder_extracted", "vifiles"]:
            if os.path.exists(dir_name):
                print(f"  {dir_name}/")
                try:
                    contents = os.listdir(dir_name)[:5]  # First 5 items
                    for item in contents:
                        print(f"    {item}")
                    if len(os.listdir(dir_name)) > 5:
                        print(f"    ... and {len(os.listdir(dir_name)) - 5} more")
                except:
                    print(f"    (cannot list contents)")
        return False
    
    # Find template
    template_file = None
    config_dir = "config"
    if os.path.exists(config_dir):
        templates = [f for f in os.listdir(config_dir) if f.endswith('.json')]
        if "hdfc.json" in templates:
            template_file = os.path.join(config_dir, "hdfc.json")
        elif templates:
            template_file = os.path.join(config_dir, templates[0])
    
    if not template_file:
        print("❌ Template file not found")
        return False
    
    print(f"✅ Using template: {template_file}")
    
    # Test extraction step by step
    try:
        from services.pdf_splitted_extraction import (
            load_template, extract_tables_from_page, extract_metadata,
            map_to_rows, extract_form
        )
        
        print("\n1. Testing template loading...")
        template = load_template(template_file)
        print(f"✅ Template loaded: {list(template.keys())}")
        
        flat_headers = template.get("FlatHeaders", [])
        if not flat_headers:
            # Try to extract from template structure
            if "Headers" in template:
                flat_headers = list(template["Headers"].keys())
            elif "form_types" in template:
                # This might be a config file, not a template
                print("⚠️  This looks like a config file, not a form template")
                # Create a basic template for L-44
                flat_headers = ["Particulars", "Current_Year", "Previous_Year"]
                print(f"Using default headers for L-44: {flat_headers}")
        
        print(f"✅ Headers: {flat_headers}")
        
        print("\n2. Testing PDF reading...")
        import pdfplumber
        with pdfplumber.open(pdf_file) as pdf:
            print(f"✅ PDF opened: {len(pdf.pages)} pages")
            
            # Test first page
            if pdf.pages:
                page = pdf.pages[0]
                text = page.extract_text()
                print(f"✅ Page 1 text length: {len(text) if text else 0} chars")
                if text:
                    print(f"First 200 chars: {text[:200]}")
                
        print("\n3. Testing table extraction...")
        tables = extract_tables_from_page(pdf_file, 1)
        print(f"✅ Extracted {len(tables)} tables from page 1")
        
        for i, table in enumerate(tables):
            print(f"Table {i+1}: {len(table)} rows x {len(table[0]) if table else 0} cols")
            if table:
                print(f"First row: {table[0]}")
        
        print("\n4. Testing metadata extraction...")
        with pdfplumber.open(pdf_file) as pdf:
            if pdf.pages:
                text = pdf.pages[0].extract_text() or ""
                meta = extract_metadata(text, template)
                print(f"✅ Metadata: {meta}")
        
        print("\n5. Testing row mapping...")
        if tables and flat_headers:
            rows = map_to_rows(tables[0], flat_headers, meta)
            print(f"✅ Mapped {len(rows)} rows")
            if rows:
                print(f"Sample row: {rows[0]}")
        
        print("\n6. Testing full extraction...")
        output_file = "test_extraction_debug.json"
        result = extract_form(pdf_file, template_file, output_file)
        print(f"✅ Full extraction completed: {result}")
        
        # Check result
        if os.path.exists(output_file):
            with open(output_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            print(f"✅ Result file: {len(data)} entries")
            if data:
                print(f"First entry: {list(data[0].keys())}")
                if 'Rows' in data[0]:
                    print(f"Rows extracted: {len(data[0]['Rows'])}")
        
    except Exception as e:
        print(f"❌ Error during extraction: {e}")
        print(f"Error type: {type(e).__name__}")
        print("Traceback:")
        traceback.print_exc()
        return False
    
    print("\n✅ Debugging completed!")
    return True

if __name__ == "__main__":
    debug_extraction_error()
