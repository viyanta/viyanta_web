#!/usr/bin/env python3
import fitz  # PyMuPDF
import json
import re


def extract_exact_pdf_line(pdf_path, page_num=0):
    """Extract the exact line containing (a) Premium data"""
    doc = fitz.open(pdf_path)
    page = doc[page_num]
    text = page.get_text("text")
    doc.close()

    lines = text.split('\n')

    # Find lines around "(a) Premium"
    for i, line in enumerate(lines):
        if "(a) Premium" in line:
            print(f"Found '(a) Premium' at line {i}: '{line}'")

            # Print surrounding lines to see the exact format
            for j in range(max(0, i-2), min(len(lines), i+8)):
                prefix = ">>>" if j == i else "   "
                print(f"{prefix} Line {j}: '{lines[j]}'")

            # Extract the data lines that contain numbers
            data_lines = []
            for j in range(i+1, min(i+6, len(lines))):
                line_content = lines[j].strip()
                if line_content and re.search(r'\d', line_content):
                    data_lines.append(line_content)

            return data_lines

    return None


# Run the exact extraction
print("EXTRACTING EXACT PDF CONTENT")
print("="*60)

try:
    pdf_path = "hdfc_pdf_splits_auto/L-1-A-RA_Revenue_Account_1-4_3_6.pdf"
    data_lines = extract_exact_pdf_line(pdf_path, page_num=0)

    if data_lines:
        print(f"\nData lines found:")
        for i, line in enumerate(data_lines):
            print(f"  {i+1}: '{line}'")

        # Now let's see what Gemini has for this row
        print(f"\n{'='*60}")
        print("GEMINI OUTPUT FOR (a) Premium ROW:")

        with open('l-1-a-ra_hdfc_corrected_multipage.json', 'r') as f:
            gemini_data = json.load(f)

        # Find the "(a) Premium" row in Gemini data (page 1)
        page1_rows = gemini_data[0]['Rows']
        premium_row = None

        for row in page1_rows:
            if row.get('Particulars') == '(a) Premium':
                premium_row = row
                break

        if premium_row:
            print(f"Gemini row:")
            for key, value in premium_row.items():
                if value and value != '' and value != '-':
                    print(f"  {key}: '{value}'")
        else:
            print("❌ Could not find '(a) Premium' row in Gemini data")
    else:
        print("❌ Could not find '(a) Premium' in PDF")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
