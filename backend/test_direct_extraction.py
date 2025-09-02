#!/usr/bin/env python3
"""
Test direct extraction with Q1 file
"""
import asyncio
import sys
import os
import shutil

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.master_template import extract_form

async def test_direct_extraction():
    """Test direct extraction with Q1 file"""
    try:
        print("🔍 TESTING DIRECT EXTRACTION WITH Q1 FILE")
        print("=" * 60)
        
        # Use the Q1 file directly
        q1_test_path = "uploads/SBI Life S FY2025 Q1.pdf"
        target_pdf_path_q1 = "pdfs_selected_company/sbi.pdf"
        os.makedirs("pdfs_selected_company", exist_ok=True)
        shutil.copy2(q1_test_path, target_pdf_path_q1)
        
        print(f"📁 Using Q1 file: {q1_test_path}")
        print(f"📁 Copied to: {target_pdf_path_q1}")
        
        # Run extraction
        result = await extract_form("sbi", "L-1-A")
        
        rows = result.get('Rows', [])
        pages = result.get('PagesUsed', 'N/A')
        
        print(f"📊 Results:")
        print(f"  • Total Rows: {len(rows)}")
        print(f"  • Pages Used: {pages}")
        
        if len(rows) == 70 and pages == "3-4":
            print("✅ SUCCESS! Q1 file correctly extracted 70 rows from pages 3-4")
        else:
            print(f"❌ FAILED! Got {len(rows)} rows from pages {pages}")
            print("🔧 Expected: 70 rows from pages 3-4")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_direct_extraction())
