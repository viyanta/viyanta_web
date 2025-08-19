#!/usr/bin/env python3
"""
Test script to verify table extraction is working properly.
"""
import os
import sys
import json

# Add current directory to path to import our modules
sys.path.append('.')

from routes.folder_uploader import extract_pdf_to_json, _extract_tables_complete, _CAMEL0T_AVAILABLE

def test_table_extraction():
    print("🧪 Testing Table Extraction")
    print("="*50)
    
    print(f"Camelot available: {_CAMEL0T_AVAILABLE}")
    
    # Test with one of the available PDFs
    test_pdf = os.path.join("..", "data", "HDFC Life  S FY2023 9M - 3.pdf")
    
    if not os.path.exists(test_pdf):
        print(f"❌ Test PDF not found: {test_pdf}")
        return
    
    print(f"📄 Testing with: {os.path.basename(test_pdf)}")
    
    # Create a temporary output directory
    test_output_dir = os.path.join(".", "test_output")
    os.makedirs(test_output_dir, exist_ok=True)
    
    try:
        print("\n🔄 Extracting PDF with tables enabled...")
        result = extract_pdf_to_json(test_pdf, test_output_dir, skip_tables=False)
        
        print(f"✅ Extraction completed!")
        print(f"📊 Pages processed: {result.get('pages', 0)}")
        print(f"⏱️  Processing time: {result.get('processing_time_ms', 0)}ms")
        print(f"📋 Table workers: {result.get('table_workers', 0)}")
        
        # Check the generated JSON for tables
        json_path = result.get('output_json', '')
        if json_path and os.path.exists(os.path.join("..", json_path)):
            full_json_path = os.path.join("..", json_path)
            with open(full_json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            total_tables = 0
            pages_with_tables = 0
            
            for page in data.get('pages', []):
                page_tables = page.get('tables', [])
                if page_tables:
                    pages_with_tables += 1
                    total_tables += len(page_tables)
            
            print(f"📋 Total tables found: {total_tables}")
            print(f"📃 Pages with tables: {pages_with_tables}/{len(data.get('pages', []))}")
            
            if total_tables > 0:
                print("✅ TABLE EXTRACTION IS WORKING! 🎉")
                
                # Show sample table info
                for i, page in enumerate(data.get('pages', [])[:3]):  # Check first 3 pages
                    page_tables = page.get('tables', [])
                    if page_tables:
                        print(f"   Page {page.get('page_number', i+1)}: {len(page_tables)} table(s)")
                        if page_tables[0]:  # Show first table dimensions
                            first_table = page_tables[0]
                            rows = len(first_table)
                            cols = len(first_table[0]) if first_table else 0
                            print(f"     First table: {rows}x{cols}")
            else:
                print("⚠️  No tables found - this might be normal if the PDF has no tables")
                
        else:
            print(f"❌ Could not read generated JSON: {json_path}")
            
    except Exception as e:
        print(f"❌ Extraction failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_table_extraction()
