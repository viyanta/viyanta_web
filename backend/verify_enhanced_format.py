#!/usr/bin/env python3
"""
Verify that the enhanced files match the user's expected format.
"""

import json
from pathlib import Path


def verify_user_format():
    """Verify that our enhanced files match the user's requested format"""

    print("🔍 Verifying Enhanced File Formats")

    # Test the L-6A file that should have quarterly data
    test_file = Path(
        "extractions/hdfc_life/HDFC Life  S FY2023 9M/L-6A-SHAREHOLDERS_11_11_corrected_enhanced.json")

    if not test_file.exists():
        print("❌ Test file not found")
        return

    with open(test_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    page = data[0] if isinstance(data, list) else data

    print(f"📄 Analyzing: {test_file.name}")
    print(f"📋 FlatHeaders: {page.get('FlatHeaders', [])}")

    # Check if headers match user's expected format
    expected_headers = [
        "Particulars",
        "For the quarter ended \nDecember 31, 2022",
        "Up to the period ended\n   December 31, 2022",
        "For the quarter ended \nDecember 31, 2021",
        "Up to the period ended\n   December 31, 2021"
    ]

    actual_headers = page.get('FlatHeaders', [])

    print(f"\n✅ Expected headers: {expected_headers}")
    print(f"🔍 Actual headers: {actual_headers}")

    headers_match = actual_headers == expected_headers
    print(f"🎯 Headers match expected format: {headers_match}")

    # Check sample rows
    rows = page.get('Rows', [])
    if rows:
        print(f"\n📊 Sample row structure:")
        sample_row = rows[0]
        print(f"  Keys: {list(sample_row.keys())}")

        # Count data points
        data_count = sum(1 for row in rows for val in row.values()
                         if val and str(val).strip())
        print(f"  Total data points: {data_count}")

        # Show first few rows with data
        print(f"\n📈 Sample data (first 3 rows with data):")
        count = 0
        for i, row in enumerate(rows):
            has_data = any(val and str(val).strip() for val in row.values())
            if has_data and count < 3:
                print(f"  Row {i+1}: {dict(row)}")
                count += 1

    return headers_match


def check_all_enhanced_files():
    """Check all enhanced files for data integrity"""

    print("\n🔍 Checking All Enhanced Files")

    backend_dir = Path(".")
    enhanced_files = list(backend_dir.rglob("*_enhanced.json"))

    print(f"Found {len(enhanced_files)} enhanced files")

    for enhanced_file in enhanced_files[:5]:  # Check first 5
        print(f"\n📄 {enhanced_file.name}")

        try:
            with open(enhanced_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            page = data[0] if isinstance(data, list) else data
            rows = page.get('Rows', [])

            # Count data points
            data_count = sum(1 for row in rows for val in row.values()
                             if val and str(val).strip() and str(val).strip() not in ["", "-"])

            print(f"  📊 Data points: {data_count}")
            print(f"  📋 Headers: {len(page.get('FlatHeaders', []))}")
            print(f"  📝 Rows: {len(rows)}")

        except Exception as e:
            print(f"  ❌ Error: {e}")


if __name__ == "__main__":
    # Change to backend directory
    import os
    if Path("services").exists():
        os.chdir(Path.cwd())
    else:
        os.chdir(Path(__file__).parent)

    verify_user_format()
    check_all_enhanced_files()
