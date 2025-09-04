#!/usr/bin/env python3

import fitz
import sys
import os
import asyncio
import re
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


def debug_step_by_step():
    """Debug the parsing step by step"""

    # Get Bajaj Allianz index page
    company = "bajaj allianz life"
    filename = "BAJAJ Allianz S FY2023 9M.pdf"
    pdf_path = f"pdfs_selected_company/{company}/{filename}"

    # Get the index page text
    doc = fitz.open(pdf_path)
    page = doc.load_page(1)  # Page 2
    page_text = page.get_text()
    doc.close()

    # Simulate our parsing logic step by step
    lines = [line.strip() for line in page_text.split('\n') if line.strip()]

    # Skip header keywords
    skip_keywords = [
        'sr no', 'form no', 'description', 'page no', 'pages',
        'contents', 'index', 'table', 'list of website disclosures',
        'website disclosures', 'disclosures', 'forms', 'particulars',
        'serial', 'number', 'details', 'heading', 'title',
        'name of the insurer', 'registration number', 'irda', 'irdai'
    ]

    print("🔍 Step-by-step parsing debug:")
    print("=" * 60)

    forms = []
    i = 0
    while i < len(lines) and i < 50:  # Limit to first 50 lines for debug
        line = lines[i]

        print(f"\nLine {i:2}: '{line}'")

        # Skip empty lines and headers
        if not line or len(line) < 3:
            print("   → SKIP: Empty or too short")
            i += 1
            continue

        # Skip header lines
        if (any(keyword in line.lower() for keyword in skip_keywords) and
                not re.match(r'^\d+\s+[A-Z]-\d+', line, re.IGNORECASE)):
            print(f"   → SKIP: Header keyword")
            i += 1
            continue

        # Method 0: Pure tabular format
        if re.match(r'^\d+$', line) and i + 1 < len(lines):
            print(f"   → TABULAR: Found serial number '{line}'")

            sr_no = line.strip()
            next_line = lines[i + 1].strip()
            print(f"   → Next line: '{next_line}'")

            # Check if next line contains a form number
            form_match = re.search(
                r'^([A-Z]-\d+(?:-[A-Z]+)*)', next_line, re.IGNORECASE)
            if form_match:
                form_no = form_match.group(1).upper()
                print(f"   → Found form: {form_no}")

                # Extract description from the rest of the form line
                description_from_form_line = re.sub(
                    r'^[A-Z]-\d+(?:-[A-Z]+)*\s*', '', next_line, flags=re.IGNORECASE).strip()
                print(
                    f"   → Description from form line: '{description_from_form_line}'")

                description_parts = []
                pages = None
                j = i + 2

                # If description was on the form line, use it
                if description_from_form_line and not re.match(r'^\d+(?:-\d+)?$', description_from_form_line):
                    description_parts.append(description_from_form_line)
                    print(
                        f"   → Added to description: '{description_from_form_line}'")

                # Look ahead for more description and pages
                while j < len(lines) and j < i + 6:
                    check_line = lines[j].strip()
                    print(f"   → Checking line {j}: '{check_line}'")

                    if not check_line:
                        j += 1
                        continue

                    # Check if this is the start of the next form
                    if re.match(r'^\d+$', check_line):
                        print(f"   → Found next serial number, stopping")
                        break

                    # Check if this line contains page numbers
                    page_patterns = [
                        r'^(\d+(?:-\d+)?)$',
                        r'^(\d+(?:,\s*\d+)*)$',
                        r'^page[s]?\s*:?\s*(\d+(?:-\d+)?)$',
                    ]

                    page_found = False
                    for pattern in page_patterns:
                        page_match = re.match(
                            pattern, check_line, re.IGNORECASE)
                        if page_match:
                            pages = page_match.group(1)
                            print(f"   → Found pages: '{pages}'")
                            page_found = True
                            break

                    if page_found:
                        j += 1
                        break

                    # Check if this looks like another form number
                    if re.search(r'^[A-Z]-\d+', check_line, re.IGNORECASE):
                        print(f"   → Found next form number, stopping")
                        break

                    # Otherwise, treat as description
                    if not description_parts:
                        description_parts.append(check_line)
                        print(f"   → Added description: '{check_line}'")

                    j += 1

                # Build description
                description = ' '.join(description_parts).strip()
                if not description:
                    description = form_no

                form_entry = {
                    "sr_no": sr_no,
                    "form_no": form_no,
                    "description": description,
                    "pages": pages
                }

                forms.append(form_entry)
                print(f"   ✅ ADDED FORM: {form_entry}")

                # Move to where we left off
                i = j
                continue
            else:
                print(f"   → No form number found in next line")

        # Other methods would go here...
        print(f"   → No match, moving to next line")
        i += 1

    print(f"\n📊 Total forms found: {len(forms)}")
    for form in forms:
        print(f"   {form}")


if __name__ == "__main__":
    debug_step_by_step()
