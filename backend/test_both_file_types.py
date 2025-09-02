#!/usr/bin/env python3
"""
Test both FY and Q1 file detection
"""
import asyncio
import sys
import os
import shutil

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.master_template import extract_form

async def test_both_file_types():
    """Test both FY and Q1 file detection"""
    try:
        print("🔍 TESTING BOTH FY AND Q1 FILE DETECTION")
        print("=" * 60)
        
        # Test 1: FY file
        print("\n📊 TEST 1: FY FILE")
        print("-" * 30)
        pdf_path_fy = "uploads/SBI Life  S FY2023 9M.pdf"
        target_pdf_path_fy = "pdfs_selected_company/sbi_fy.pdf"
        os.makedirs("pdfs_selected_company", exist_ok=True)
        shutil.copy2(pdf_path_fy, target_pdf_path_fy)
        
        print(f"📁 Testing FY file: {pdf_path_fy}")
        result_fy = await extract_form("sbi", "L-1-A")
        
        rows_fy = result_fy.get('Rows', [])
        pages_fy = result_fy.get('PagesUsed', 'N/A')
        
        print(f"📊 FY Results:")
        print(f"  • Total Rows: {len(rows_fy)}")
        print(f"  • Pages Used: {pages_fy}")
        
        if len(rows_fy) == 148 and pages_fy == "3-6":
            print("✅ FY file correctly detected - 148 rows from pages 3-6")
        else:
            print(f"❌ FY file detection failed - {len(rows_fy)} rows from pages {pages_fy}")
        
        # Test 2: Q1 file (simulate by creating a Q1 filename)
        print("\n📊 TEST 2: Q1 FILE")
        print("-" * 30)
        
        # Create a Q1 test file by copying the FY file but with Q1 in the name
        q1_test_path = "uploads/SBI Life S FY2025 Q1.pdf"
        if not os.path.exists(q1_test_path):
            shutil.copy2(pdf_path_fy, q1_test_path)
            print(f"📁 Created Q1 test file: {q1_test_path}")
        
        target_pdf_path_q1 = "pdfs_selected_company/sbi_q1.pdf"
        shutil.copy2(q1_test_path, target_pdf_path_q1)
        
        print(f"📁 Testing Q1 file: {q1_test_path}")
        result_q1 = await extract_form("sbi", "L-1-A")
        
        rows_q1 = result_q1.get('Rows', [])
        pages_q1 = result_q1.get('PagesUsed', 'N/A')
        
        print(f"📊 Q1 Results:")
        print(f"  • Total Rows: {len(rows_q1)}")
        print(f"  • Pages Used: {pages_q1}")
        
        if len(rows_q1) == 70 and pages_q1 == "3-4":
            print("✅ Q1 file correctly detected - 70 rows from pages 3-4")
        else:
            print(f"❌ Q1 file detection failed - {len(rows_q1)} rows from pages {pages_q1}")
        
        # Summary
        print("\n📋 SUMMARY")
        print("=" * 60)
        print(f"FY File: {len(rows_fy)} rows from pages {pages_fy} - {'✅ PASS' if len(rows_fy) == 148 and pages_fy == '3-6' else '❌ FAIL'}")
        print(f"Q1 File: {len(rows_q1)} rows from pages {pages_q1} - {'✅ PASS' if len(rows_q1) == 70 and pages_q1 == '3-4' else '❌ FAIL'}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_both_file_types())
