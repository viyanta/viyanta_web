#!/usr/bin/env python3
import json

# Load new multipage corrected JSON
with open('l-1-a-ra_hdfc_corrected_multipage.json', 'r') as f:
    data = json.load(f)

print("New Corrected JSON structure:")
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
else:
    print("Not a multi-page structure!")
