import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import asyncio
from services.master_template import list_forms, _find_form_header_pages

async def test_aditya_birla_specific():
    """Test Aditya Birla specific header search"""
    
    print("Testing Aditya Birla header search...")
    
    # Test the header search function directly
    pdf_path = "pdfs_selected_company/ADITYA BIRLA SUN LIFE/Aditya Birla Life S FY2023 9M.pdf"
    
    if os.path.exists(pdf_path):
        # Test L-1-A-RA specifically
        result = _find_form_header_pages(pdf_path, "L-1-A-RA")
        print(f"Header search result for L-1-A-RA: {result}")
        
        # Test a few other forms
        for form in ["L-2-A-PL", "L-3-A-BS", "L-4"]:
            result = _find_form_header_pages(pdf_path, form)
            print(f"Header search result for {form}: {result}")
    else:
        print(f"PDF not found: {pdf_path}")
    
    # Now test the full extraction
    print("\nTesting full extraction...")
    forms = await list_forms("ADITYA BIRLA SUN LIFE", "Aditya Birla Life S FY2023 9M.pdf")
    
    print(f"Total forms: {len(forms)}")
    
    # Show first 10 forms
    for i, form in enumerate(forms[:10]):
        pages = form.get('pages') or 'No pages'
        source = form.get('pages_source', 'index')
        print(f"{i+1:2}: {form['form_no']:<15} - {pages:<15} ({source})")

if __name__ == "__main__":
    asyncio.run(test_aditya_birla_specific())
