#!/usr/bin/env python3

from services.master_template import list_forms
import fitz
import sys
import os
import asyncio
import re
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


async def analyze_shriram_and_aditya():
    """Analyze the index structure for Shriram and Aditya Birla"""

    print("🔍 ANALYZING SHRIRAM LIFE:")
    print("=" * 60)

    # Check Shriram Life structure
    shriram_path = "pdfs_selected_company/shriram life/Shriram Life S FY2023 9M.pdf"
    doc = fitz.open(shriram_path)

    # Check first few pages to find the index
    for page_num in range(min(5, doc.page_count)):
        page = doc.load_page(page_num)
        page_text = page.get_text()

        if "List of Website" in page_text or "Disclosure" in page_text:
            print(f"📄 Found index on page {page_num + 1}:")
            print("-" * 50)
            lines = page_text.split('\n')[:30]  # First 30 lines
            for i, line in enumerate(lines):
                if line.strip():
                    print(f"{i:2}: {line.strip()}")
            break

    doc.close()

    print(f"\n📊 Current Shriram extraction:")
    shriram_forms = await list_forms('shriram life', 'Shriram Life S FY2023 9M.pdf')
    for i, form in enumerate(shriram_forms[:5]):
        pages = form.get('pages', 'No pages')
        source = form.get('pages_source', 'index')
        print(f"  {i+1}: {form.get('form_no')} - {pages} ({source})")

    print(f"\n" + "=" * 60)
    print("🔍 ANALYZING ADITYA BIRLA:")
    print("=" * 60)

    # Check Aditya Birla structure
    aditya_path = "pdfs_selected_company/aditya birla sun life/Aditya Birla Life S FY2023 9M.pdf"
    doc = fitz.open(aditya_path)

    # Check first few pages to find the index
    for page_num in range(min(5, doc.page_count)):
        page = doc.load_page(page_num)
        page_text = page.get_text()

        if "List of Website" in page_text or "Disclosure" in page_text:
            print(f"📄 Found index on page {page_num + 1}:")
            print("-" * 50)
            lines = page_text.split('\n')[:30]  # First 30 lines
            for i, line in enumerate(lines):
                if line.strip():
                    print(f"{i:2}: {line.strip()}")
            break

    doc.close()

    print(f"\n📊 Current Aditya Birla extraction:")
    aditya_forms = await list_forms('aditya birla sun life', 'Aditya Birla Life S FY2023 9M.pdf')
    for i, form in enumerate(aditya_forms[:5]):
        pages = form.get('pages', 'No pages')
        source = form.get('pages_source', 'index')
        print(f"  {i+1}: {form.get('form_no')} - {pages} ({source})")

if __name__ == "__main__":
    asyncio.run(analyze_shriram_and_aditya())
