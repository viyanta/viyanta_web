#!/usr/bin/env python3
"""
Test VAR. INS extraction to verify column mapping fixes
"""
import asyncio
import sys
import os
import json

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from master_template import extract_form

async def test_var_ins_extraction():
    """Test VAR. INS extraction specifically"""
    try:
        print("🔍 TESTING VAR. INS EXTRACTION")
        print("=" * 60)
        
        # Test with SBI file
        pdf_path = "pdfs_selected_company/sbi.pdf"
        if not os.path.exists(pdf_path):
            print(f"❌ PDF file not found: {pdf_path}")
            return
        
        print(f"📁 Testing with: {pdf_path}")
        
        # Run extraction
        result = await extract_form("sbi", "L-1-A")
        
        rows = result.get('Rows', [])
        headers = result.get('Headers', [])
        
        print(f"📊 Results:")
        print(f"  • Total Rows: {len(rows)}")
        print(f"  • Headers: {headers}")
        
        # Look for VAR. INS columns
        var_ins_columns = [h for h in headers if 'VAR. INS' in h or 'VAR.INS' in h]
        print(f"  • VAR. INS Columns Found: {var_ins_columns}")
        
        # Check specific rows for VAR. INS data
        print(f"\n🔍 CHECKING VAR. INS DATA IN PREMIUMS EARNED ROWS:")
        print("-" * 50)
        
        for i, row in enumerate(rows):
            particulars = row.get('Particulars', '').lower()
            if 'premium' in particulars and 'earned' in particulars:
                print(f"\nRow {i+1}: {row.get('Particulars', '')}")
                for col in var_ins_columns:
                    value = row.get(col, '')
                    print(f"  {col}: '{value}'")
                    
                    # Check if this should be a hyphen
                    if 'premium' in particulars and 'earned' in particulars:
                        if value and value != '-' and value != '':
                            print(f"    ⚠️  WARNING: Expected hyphen (-) but got '{value}'")
                        else:
                            print(f"    ✅ CORRECT: Shows hyphen (-)")
        
        # Check for any rows with large numbers in VAR. INS columns
        print(f"\n🔍 CHECKING FOR MISALIGNED DATA IN VAR. INS COLUMNS:")
        print("-" * 50)
        
        for i, row in enumerate(rows):
            for col in var_ins_columns:
                value = row.get(col, '')
                if value and value != '-' and value != '':
                    # Check if it's a large number (might be misaligned)
                    try:
                        num_value = float(value.replace(',', ''))
                        if num_value > 1000:  # Large number
                            print(f"Row {i+1} - {col}: '{value}' (Large number - might be misaligned)")
                    except:
                        pass
        
        print(f"\n✅ Test completed!")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_var_ins_extraction())
