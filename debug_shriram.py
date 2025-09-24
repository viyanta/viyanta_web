#!/usr/bin/env python3

from PyPDF2 import PdfReader
from index_extraction import extract_index_entries
import sys
import os
sys.path.append('backend/test_extraction')


# Test Shriram Life PDF
pdf_path = "backend/pdfs_selected_company/shriram life/Shriram Life S FY2023 9M.pdf"

print(f"Testing: {pdf_path}")
print(f"Exists: {os.path.exists(pdf_path)}")

if os.path.exists(pdf_path):
    reader = PdfReader(pdf_path)
    print(f"Total pages: {len(reader.pages)}")

    # Extract index text from first 3 pages
    index_text = ""
    for i in range(min(3, len(reader.pages))):
        text = reader.pages[i].extract_text() or ""
        index_text += text + "\n"

    print("\n" + "="*60)
    print("RAW INDEX TEXT (first 3 pages)")
    print("="*60)
    print(index_text[:2000])  # First 2000 chars

    print("\n" + "="*60)
    print("PARSED INDEX ENTRIES")
    print("="*60)

    entries = extract_index_entries(pdf_path)
    for i, entry in enumerate(entries[:10]):  # First 10 entries
        print(f"{i+1:2d}: {entry}")

    if len(entries) > 10:
        print(f"... and {len(entries) - 10} more entries")

    has_pages = all("start_page" in e for e in entries)
    print(f"\nTotal entries: {len(entries)}")
    print(f"All have page numbers: {has_pages}")

    if has_pages:
        print("✅ Would use INDEX method")
    else:
        print("⚡ Would use CONTENT_SCAN method")
else:
    print("❌ File not found")
