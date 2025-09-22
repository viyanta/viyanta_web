#!/usr/bin/env python3
import json

# Load original and corrected JSON
with open('l-1-a-ra_extracted-hdfc-v2.json', 'r') as f:
    original = json.load(f)
with open('l-1-a-ra_hdfc_corrected_multipage.json', 'r') as f:
    corrected = json.load(f)

print("DETAILED VALUE COMPARISON - Page 1")
print("=" * 60)

page1_orig = original[0]['Rows']
page1_corr = corrected[0]['Rows']

changes_found = 0
missing_values_filled = 0
actual_corrections = 0

for i, (orig_row, corr_row) in enumerate(zip(page1_orig, page1_corr)):
    row_changes = []

    for field in orig_row.keys():
        orig_val = orig_row.get(field, '')
        corr_val = corr_row.get(field, '')

        if orig_val != corr_val:
            changes_found += 1

            # Categorize the change
            if orig_val == '' and corr_val != '':
                missing_values_filled += 1
                change_type = "FILLED"
            elif orig_val != '' and corr_val != '':
                actual_corrections += 1
                change_type = "CORRECTED"
            else:
                change_type = "OTHER"

            row_changes.append((field, orig_val, corr_val, change_type))

    if row_changes:
        print(f"\nRow {i+1} - '{orig_row.get('Particulars', 'Unknown')}':")
        for field, orig_val, corr_val, change_type in row_changes:
            print(f"  {field}: '{orig_val}' -> '{corr_val}' ({change_type})")

print("\n" + "=" * 60)
print("SUMMARY OF CHANGES:")
print(f"Total changes found: {changes_found}")
print(f"Missing values filled: {missing_values_filled}")
print(f"Actual value corrections: {actual_corrections}")
print(f"Rows compared: {min(len(page1_orig), len(page1_corr))}")

# Check row count differences
if len(page1_orig) != len(page1_corr):
    print(f"Row count difference: {len(page1_orig)} -> {len(page1_corr)}")
else:
    print("Row counts match perfectly")
