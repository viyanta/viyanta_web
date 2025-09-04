#!/usr/bin/env python3

import fitz
import sys
import os
import asyncio
import re
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


async def analyze_forms_index_format():
    """Analyze the exact format used by companies that only extract 2 forms"""

    # Test one company - Bajaj Allianz
    company = "bajaj allianz life"
    filename = "BAJAJ Allianz S FY2023 9M.pdf"

    pdf_path = f"pdfs_selected_company/{company}/{filename}"
    print(f"🔍 Analyzing forms index format for: {company}/{filename}")
    print("=" * 80)

    # Open PDF and get the index page (page 2 based on previous debug)
    doc = fitz.open(pdf_path)
    page = doc.load_page(1)  # Page 2 (0-indexed)
    page_text = page.get_text()
    doc.close()

    print("📄 Forms index page text:")
    print("-" * 50)
    print(page_text)
    print("-" * 50)

    # Split into lines and analyze each line
    lines = [line.strip() for line in page_text.split('\n') if line.strip()]

    print("\n📋 Line-by-line analysis:")
    print("-" * 50)

    for i, line in enumerate(lines):
        if 'L-' in line or re.search(r'^\d+', line):
            print(f"Line {i:>2}: '{line}'")

            # Test different regex patterns
            patterns = [
                (r'^(\d+)\s+([A-Z]-\d+(?:-[A-Z]+)*)', 'SBI-style: Sr + Form'),
                (r'^(\d+)$', 'HDFC-style: Sr only'),
                (r'^([A-Z]-\d+(?:-[A-Z]+)*)', 'Direct form'),
                (r'(\d+)\s+([A-Z]-\d+(?:-[A-Z]+)*)\s+(.+?)\s+(\d+(?:-\d+)?)',
                 'Full line: Sr + Form + Desc + Pages'),
                (r'(\d+)\s+([A-Z]-\d+(?:-[A-Z]+)*)\s+(.+)',
                 'Sr + Form + Desc'),
            ]

            for pattern, description in patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    print(f"     ✅ Matches '{description}': {match.groups()}")
                else:
                    print(f"     ❌ No match for '{description}'")
            print()


def main():
    asyncio.run(analyze_forms_index_format())


if __name__ == "__main__":
    main()
