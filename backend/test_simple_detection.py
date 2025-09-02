#!/usr/bin/env python3
"""
Simple test to verify the detection logic is working
"""
import asyncio
import sys
import os
import shutil

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.master_template import _find_pages_for_form

async def test_simple_detection():
    """Test the detection logic directly"""
    try:
        print("🔍 TESTING DETECTION LOGIC DIRECTLY")
        print("=" * 50)
        
        # Test 1: FY file
        print("\n📊 TEST 1: FY FILE")
        print("-" * 30)
        pdf_path_fy = "uploads/SBI Life  S FY2023 9M.pdf"
        target_pdf_path_fy = "pdfs_selected_company/sbi_fy.pdf"
        os.makedirs("pdfs_selected_company", exist_ok=True)
        shutil.copy2(pdf_path_fy, target_pdf_path_fy)
        
        pages_fy = await _find_pages_for_form("sbi", "L-1-A", target_pdf_path_fy)
        print(f"FY file result: {pages_fy}")
        
        # Test 2: Q1 file
        print("\n📊 TEST 2: Q1 FILE")
        print("-" * 30)
        q1_test_path = "uploads/SBI Life S FY2025 Q1.pdf"
        target_pdf_path_q1 = "pdfs_selected_company/sbi_q1.pdf"
        shutil.copy2(q1_test_path, target_pdf_path_q1)
        
        pages_q1 = await _find_pages_for_form("sbi", "L-1-A", target_pdf_path_q1)
        print(f"Q1 file result: {pages_q1}")
        
        # Summary
        print("\n📋 SUMMARY")
        print("=" * 50)
        print(f"FY File: {pages_fy} - {'✅ PASS' if pages_fy == '3-6' else '❌ FAIL'}")
        print(f"Q1 File: {pages_q1} - {'✅ PASS' if pages_q1 == '3-4' else '❌ FAIL'}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_simple_detection())
