#!/usr/bin/env python3
import re


def test_form_code_extraction():
    test_cases = [
        "L-1-A-RA_1_5.pdf",
        "L-10_18_18.pdf",
        "L-4-PREMIUM_3_5.pdf",
        "L-6A_schedule.pdf",
        "L-1-A-REVENUE_account.pdf"
    ]

    # Updated patterns from the new code
    patterns = [
        # L-1-A, L-2-A (captures L-X-Y, ignores -RA suffixes)
        r'(L-\d+-[A-Z]+)(?:-[A-Z]+)*',
        # L-6A, L-9A, L-14A (letter suffix without hyphen)
        r'(L-\d+[A-Z]+)',
        r'(L-\d+)',                     # L-10, L-11, L-28 (just numbers) - LAST
    ]

    for filename in test_cases:
        print(f"Testing: {filename}")

        # Simulate the actual code logic
        form_code = None
        for i, pattern in enumerate(patterns):
            match = re.search(pattern, filename.upper())
            if match:
                form_code = match.group(1)
                print(f"  Pattern {i+1}: {pattern}")
                print(f"  ✅ MATCH: {form_code}")
                break

        if not form_code:
            print("  ❌ No match found")

        print()


if __name__ == "__main__":
    test_form_code_extraction()
