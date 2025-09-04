#!/usr/bin/env python3

from services.master_template import _parse_forms_from_text
import fitz
import sys
import os
import asyncio
import re
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


def test_tabular_parsing():
    """Test the parsing logic specifically on tabular format"""

    # Get Bajaj Allianz index page
    company = "bajaj allianz life"
    filename = "BAJAJ Allianz S FY2023 9M.pdf"
    pdf_path = f"pdfs_selected_company/{company}/{filename}"

    # Get the index page text
    doc = fitz.open(pdf_path)
    page = doc.load_page(1)  # Page 2
    page_text = page.get_text()
    doc.close()

    print("🔍 Testing tabular parsing with actual text:")
    print("=" * 60)

    # Test our parsing function
    forms = _parse_forms_from_text(page_text)

    print(f"📊 Total forms found: {len(forms)}")
    print("\n📋 All forms:")
    for i, form in enumerate(forms):
        print(f"   {i+1:2}: {form.get('sr_no', '?'):>2} | {form.get('form_no', 'Unknown'):<15} | {form.get('description', 'No desc'):<30} | {form.get('pages', 'No pages')}")

    # Now let's manually check what forms should be there
    print(f"\n🎯 Manual check - looking for all L-* patterns:")
    lines = [line.strip() for line in page_text.split('\n') if line.strip()]

    form_lines = []
    for i, line in enumerate(lines):
        if re.search(r'L-\d+', line, re.IGNORECASE):
            form_lines.append((i, line))

    print(f"Found {len(form_lines)} lines with L-* patterns:")
    for i, (line_num, line) in enumerate(form_lines):
        print(f"   {i+1:2}: Line {line_num:3} | '{line}'")


if __name__ == "__main__":
    test_tabular_parsing()
