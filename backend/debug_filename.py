#!/usr/bin/env python3
"""
Debug what filename is being detected
"""
import asyncio
import sys
import os
import shutil

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.master_template import _find_pages_for_form

async def debug_filename():
    """Debug what filename is being detected"""
    try:
        print("🔍 DEBUGGING FILENAME DETECTION")
        print("=" * 50)
        
        # Test Q1 file
        q1_test_path = "uploads/SBI Life S FY2025 Q1.pdf"
        target_pdf_path_q1 = "pdfs_selected_company/sbi_q1.pdf"
        os.makedirs("pdfs_selected_company", exist_ok=True)
        shutil.copy2(q1_test_path, target_pdf_path_q1)
        
        print(f"📁 Testing Q1 file: {q1_test_path}")
        print(f"📁 Target path: {target_pdf_path_q1}")
        
        # Manually check what the function should detect
        uploads_dir = "uploads"
        original_filename = None
        
        if os.path.exists(uploads_dir):
            for filename in os.listdir(uploads_dir):
                if filename.upper().endswith('.PDF') and 'SBI' in filename.upper():
                    original_filename = filename.upper()
                    print(f"📁 Found original file: {filename}")
                    print(f"📁 Uppercase: {original_filename}")
                    print(f"📁 Contains 'Q1': {'Q1' in original_filename}")
                    print(f"📁 Contains 'FY': {'FY' in original_filename}")
                    break
        
        # Test the function
        pages = await _find_pages_for_form("sbi", "L-1-A", target_pdf_path_q1)
        print(f"📊 Function result: {pages}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_filename())
