#!/usr/bin/env python3

import traceback
import fitz
from services.master_template import list_forms
import sys
import os
import asyncio
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


async def debug_low_extraction_companies():
    """Debug companies that are only extracting 2 forms instead of the expected 20+"""

    # Companies that only extract 2 forms
    companies_to_check = [
        ("aditya birla sun life", "Aditya Birla Life S FY2023 9M.pdf"),
        ("bajaj allianz life", "BAJAJ Allianz S FY2023 9M.pdf"),
        ("godigit life", "GO Digit Life S FY2024 9M.pdf"),
        ("shriram life", "Shriram Life S FY2023 9M.pdf")
    ]

    for company, filename in companies_to_check:
        print(f"\n{'='*80}")
        print(f"🔍 Debugging: {company.upper()}")
        print(f"📄 File: {filename}")
        print("="*80)

        try:
            # Check the PDF structure first
            pdf_path = f"pdfs_selected_company/{company}/{filename}"

            if not os.path.exists(pdf_path):
                print(f"❌ PDF not found: {pdf_path}")
                continue

            # Open PDF and check the first few pages
            doc = fitz.open(pdf_path)
            print(f"📖 PDF has {doc.page_count} pages")

            # Look for index sections
            for page_num in range(min(5, doc.page_count)):
                page = doc.load_page(page_num)
                page_text = page.get_text()

                print(f"\n📄 Page {page_num + 1} content (first 1000 chars):")
                print("-" * 50)
                print(page_text[:1000])

                # Check for forms index keywords
                index_keywords = [
                    "List of Website Disclosures",
                    "Website Disclosures",
                    "List of Disclosures",
                    "Forms Index",
                    "Index of Forms",
                    "Contents",
                    "Table of Contents"
                ]

                found_keywords = []
                for keyword in index_keywords:
                    if keyword.lower() in page_text.lower():
                        found_keywords.append(keyword)

                if found_keywords:
                    print(
                        f"🎯 Found index keywords on page {page_num + 1}: {found_keywords}")

                # Look for form patterns
                import re
                form_patterns = [
                    r'L-\d+(?:-[A-Z]+)*',
                    r'Form\s+L-\d+',
                    r'\d+\s+L-\d+'
                ]

                for pattern in form_patterns:
                    matches = re.findall(pattern, page_text, re.IGNORECASE)
                    if matches:
                        print(
                            f"📋 Found form patterns '{pattern}' on page {page_num + 1}: {matches[:10]}")

            doc.close()

            # Now test extraction
            forms = await list_forms(company, filename)
            print(f"\n📊 Extraction result: {len(forms)} forms found")

            for i, form in enumerate(forms):
                print(
                    f"   {i+1}: {form.get('form_no', 'Unknown')} - {form.get('description', 'No desc')} - {form.get('pages', 'No pages')}")

        except Exception as e:
            print(f"❌ ERROR: {e}")
            traceback.print_exc()


def main():
    asyncio.run(debug_low_extraction_companies())


if __name__ == "__main__":
    main()
