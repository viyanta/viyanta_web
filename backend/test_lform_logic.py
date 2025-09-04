#!/usr/bin/env python3
"""
Test script to verify L-form extraction logic.
"""

from services.master_template import _add_pages_to_range
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


def test_lform_page_logic():
    """Test the L-form page extraction logic."""
    print("Testing L-form page extraction logic...")
    print("=" * 50)

    # Test cases with 2-page gap applied to each page in original range
    test_cases = [
        ("1", 2, "3"),  # Single page: 1 + 2 gap = 3
        ("1-4", 2, "3-6"),  # Range: 1+2=3, 4+2=6 (for SBI Life L-1-A-REVENUE)
        ("3-4", 2, "5-6"),  # Range: 3+2=5, 4+2=6
        ("7", 2, "9"),  # Single page: 7 + 2 gap = 9
        ("6-9", 2, "8-11"),  # Range: 6+2=8, 9+2=11
        ("15", 2, "17"),  # Single page: 15 + 2 gap = 17
    ]

    for original_pages, additional_pages, expected in test_cases:
        result = _add_pages_to_range(original_pages, additional_pages)
        status = "✅ PASS" if result == expected else "❌ FAIL"
        print(
            f"{status} | Original: {original_pages} | Expected: {expected} | Got: {result}")

    print("\n" + "=" * 50)
    print("L-form logic test completed!")
    
    # Test specific L-1-A-REVENUE case
    print("\nTesting L-1-A-REVENUE specific case:")
    print("=" * 50)
    import asyncio
    from services.master_template import _find_pages_for_form
    
    try:
        result = asyncio.run(_find_pages_for_form('sbi', 'L-1-A-REVENUE', 'sbi/SBI Life  S FY2023 9M.pdf'))
        expected = "3-6"
        status = "✅ PASS" if result == expected else "❌ FAIL"
        print(f"{status} | L-1-A-REVENUE for SBI: Expected {expected}, Got {result}")
    except Exception as e:
        print(f"❌ ERROR | L-1-A-REVENUE test failed: {e}")
        
    print("=" * 50)


if __name__ == "__main__":
    test_lform_page_logic()
