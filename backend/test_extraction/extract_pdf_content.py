#!/usr/bin/env python3
import fitz  # PyMuPDF
import json
import re


def extract_pdf_text_by_page(pdf_path):
    """Extract text from each page of the PDF"""
    doc = fitz.open(pdf_path)
    pages_text = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")
        pages_text.append({
            'page_num': page_num + 1,
            'text': text
        })

    doc.close()
    return pages_text


def find_table_data_in_text(text):
    """Extract potential table data from text"""
    lines = text.split('\n')
    table_lines = []

    # Look for lines that contain numerical data or specific patterns
    for line in lines:
        line = line.strip()
        if line and (
            re.search(r'\d+,\d+', line) or  # Contains comma-separated numbers
            'Premium' in line or
            'Total' in line or
            'Sub Total' in line or
            'TOTAL' in line or
            '(a)' in line or '(b)' in line or '(c)' in line
        ):
            table_lines.append(line)

    return table_lines


# Extract PDF content
pdf_path = "hdfc_pdf_splits_auto/L-1-A-RA_Revenue_Account_1-4_3_6.pdf"
print("Extracting PDF content...")

try:
    pages_data = extract_pdf_text_by_page(pdf_path)

    for page_data in pages_data:
        print(f"\n{'='*60}")
        print(f"PAGE {page_data['page_num']} CONTENT")
        print(f"{'='*60}")

        table_lines = find_table_data_in_text(page_data['text'])

        print(f"Found {len(table_lines)} potential table rows:")
        for i, line in enumerate(table_lines[:15]):  # Show first 15 lines
            print(f"{i+1:2d}: {line}")

        if len(table_lines) > 15:
            print(f"... and {len(table_lines) - 15} more lines")

except Exception as e:
    print(f"Error reading PDF: {e}")
    print("Please check if the PDF file exists at the specified path.")
