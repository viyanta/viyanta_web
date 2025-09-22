#!/usr/bin/env python3
import json

# Load original extracted JSON
with open('l-1-a-ra_extracted-hdfc-v2.json', 'r') as f:
    original = json.load(f)

# Load corrected JSON
with open('l-1-a-ra_hdfc_corrected_multipage.json', 'r') as f:
    corrected = json.load(f)

print("COMPARISON: Original vs Corrected")
print("=" * 50)

# Compare Page 1 first few rows
page1_orig = original[0]['Rows'][:5]
page1_corr = corrected[0]['Rows'][:5]

for i, (orig_row, corr_row) in enumerate(zip(page1_orig, page1_corr)):
    print(f"\nROW {i+1}:")
    print(f"Original Particulars: '{orig_row.get('Particulars', '')}'")
    print(f"Corrected Particulars: '{corr_row.get('Particulars', '')}'")

    # Check a few key fields
    for field in ['LINKED_BUSINESS_LIFE', 'GRAND_TOTAL']:
        orig_val = orig_row.get(field, '')
        corr_val = corr_row.get(field, '')
        if orig_val != corr_val:
            print(f"  {field}: '{orig_val}' -> '{corr_val}' (CHANGED)")
        else:
            print(f"  {field}: '{orig_val}' (same)")

print("\n" + "=" * 50)
print("SUMMARY:")
print(f"Original Page 1 rows: {len(page1_orig)}")
print(f"Corrected Page 1 rows: {len(page1_corr)}")

# Check if structures match
orig_headers = original[0].get('FlatHeaders', [])
corr_headers = corrected[0].get('FlatHeaders', [])
print(f"Headers match: {orig_headers == corr_headers}")
print(f"Original headers count: {len(orig_headers)}")
print(f"Corrected headers count: {len(corr_headers)}")
