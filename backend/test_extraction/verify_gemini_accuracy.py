#!/usr/bin/env python3
import fitz  # PyMuPDF
import json
import re


def extract_pdf_table_data(pdf_path, page_num=0):
    """Extract structured table data from a specific PDF page"""
    doc = fitz.open(pdf_path)
    page = doc[page_num]
    text = page.get_text("text")
    doc.close()

    lines = text.split('\n')

    # Find the row for "(a) Premium" and extract its values
    premium_row_data = None
    found_premium = False

    for i, line in enumerate(lines):
        if "(a) Premium" in line:
            found_premium = True
            print(f"Found '(a) Premium' at line {i}: {line}")

            # The numerical data is usually in the next few lines
            data_lines = []
            for j in range(i+1, min(i+5, len(lines))):
                data_line = lines[j].strip()
                if data_line and re.search(r'\d', data_line):
                    data_lines.append(data_line)
                    print(f"  Data line {j}: {data_line}")

            # Extract numbers from these lines
            all_numbers = []
            for data_line in data_lines:
                # Find all comma-separated numbers (including larger numbers)
                numbers = re.findall(
                    r'\d{1,2}(?:,\d{2,3})*(?:,\d{3})*', data_line)
                all_numbers.extend(numbers)

            print(f"  Extracted numbers: {all_numbers}")
            premium_row_data = all_numbers
            break

    return premium_row_data


def compare_with_gemini(pdf_numbers, gemini_row):
    """Compare PDF extracted numbers with Gemini output"""
    print("\nCOMPARISON:")
    print(f"PDF extracted numbers: {pdf_numbers}")
    print(f"Gemini row data:")

    # Extract non-empty values from Gemini row
    gemini_values = []
    for key, value in gemini_row.items():
        if key != 'Particulars' and key != 'Schedule' and value and value != '-' and value != '':
            gemini_values.append(value)

    print(f"Gemini non-empty values: {gemini_values}")

    # Check if all PDF numbers appear in Gemini values
    matches = 0
    total_pdf_numbers = len(pdf_numbers)

    for pdf_num in pdf_numbers:
        if pdf_num in gemini_values:
            matches += 1
            print(f"  ✓ {pdf_num} - MATCH")
        else:
            print(f"  ✗ {pdf_num} - MISSING in Gemini")

    # Check for extra values in Gemini
    for gemini_val in gemini_values:
        if gemini_val not in pdf_numbers:
            print(f"  ? {gemini_val} - EXTRA in Gemini (not found in PDF)")

    match_percentage = (matches / total_pdf_numbers *
                        100) if total_pdf_numbers > 0 else 0
    print(
        f"\nMatch rate: {matches}/{total_pdf_numbers} ({match_percentage:.1f}%)")

    return match_percentage


# Main verification
print("VERIFYING GEMINI OUTPUT AGAINST PDF CONTENT")
print("="*60)

try:
    # Extract PDF data for page 1
    pdf_path = "hdfc_pdf_splits_auto/L-1-A-RA_Revenue_Account_1-4_3_6.pdf"
    pdf_numbers = extract_pdf_table_data(pdf_path, page_num=0)

    if pdf_numbers:
        # Load Gemini corrected data
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
            match_rate = compare_with_gemini(pdf_numbers, premium_row)

            print(f"\n{'='*60}")
            if match_rate >= 90:
                print("✅ EXCELLENT: Gemini output closely matches PDF content")
            elif match_rate >= 70:
                print("⚠️  GOOD: Gemini output mostly matches PDF content")
            elif match_rate >= 50:
                print("⚠️  FAIR: Some discrepancies between Gemini and PDF")
            else:
                print("❌ POOR: Significant discrepancies found")

        else:
            print("❌ Could not find '(a) Premium' row in Gemini data")
    else:
        print("❌ Could not extract numerical data from PDF")

except Exception as e:
    print(f"❌ Error during verification: {e}")
    import traceback
    traceback.print_exc()
