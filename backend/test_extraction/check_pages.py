#!/usr/bin/env python3
import json

# Load original extracted JSON
with open('l-1-a-ra_extracted-hdfc-v2.json', 'r') as f:
    data = json.load(f)

print("Original extracted JSON structure:")
print(f"Type: {type(data)}")
if isinstance(data, list):
    print(f"Number of pages: {len(data)}")
    total_rows = 0
    for i, page in enumerate(data):
        if isinstance(page, dict):
            rows = page.get('Rows', [])
            page_used = page.get('PagesUsed', 'unknown')
            period = page.get('Period', 'unknown')
            print(f"Page {i+1}: {len(rows)} rows, PagesUsed: {page_used}")
            print(f"  Period: {period}")
            total_rows += len(rows)
    print(f"Total rows across all pages: {total_rows}")

print("\n" + "="*50)

# Load corrected JSON (try both old and new format)
corrected_files = ['geminil-1-a-ra_corrected.json',
                   'l-1-a-ra_hdfc_corrected_multipage.json']
corrected = None
corrected_file_used = None

for filename in corrected_files:
    try:
        with open(filename, 'r') as f:
            corrected = json.load(f)
            corrected_file_used = filename
            break
    except FileNotFoundError:
        continue

if corrected is None:
    print("No corrected JSON file found!")
else:
    print(f"Corrected JSON structure (from {corrected_file_used}):")
    print(f"Type: {type(corrected)}")

    if isinstance(corrected, dict):
        rows = corrected.get('Rows', [])
        print(f"Total rows: {len(rows)}")
        print(f"Period: {corrected.get('Period', 'unknown')}")
        print(f"Pages: {corrected.get('Pages', 'unknown')}")
    elif isinstance(corrected, list):
        print(f"Number of pages: {len(corrected)}")
        total_rows = 0
        for i, page in enumerate(corrected):
            if isinstance(page, dict):
                rows = page.get('Rows', [])
                page_used = page.get('PagesUsed', 'unknown')
                period = page.get('Period', 'unknown')
                print(f"Page {i+1}: {len(rows)} rows, PagesUsed: {page_used}")
                print(f"  Period: {period}")
                total_rows += len(rows)
        print(f"Total rows across all pages: {total_rows}")
