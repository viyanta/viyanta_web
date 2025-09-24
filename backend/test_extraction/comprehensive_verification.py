#!/usr/bin/env python3
import fitz  # PyMuPDF
import json
import re


def verify_all_pages(pdf_path, gemini_json_path):
    """Verify all pages of Gemini output against PDF"""

    # Load Gemini data
    with open(gemini_json_path, 'r') as f:
        gemini_data = json.load(f)

    # Open PDF
    doc = fitz.open(pdf_path)

    print("COMPREHENSIVE VERIFICATION: PDF vs Gemini JSON")
    print("="*80)

    total_matches = 0
    total_checks = 0

    for page_num in range(len(doc)):
        print(f"\nPAGE {page_num + 1}:")
        print("-" * 40)

        # Extract text from this PDF page
        page = doc[page_num]
        page_text = page.get_text("text")

        # Get corresponding Gemini page data
        if page_num < len(gemini_data):
            gemini_page = gemini_data[page_num]

            # Extract key information
            print(f"Period: {gemini_page.get('Period', 'Unknown')}")
            print(f"Rows count: {len(gemini_page.get('Rows', []))}")

            # Look for some key values that should match
            page_matches = 0
            page_checks = 0

            # Find all numbers in PDF text for this page
            pdf_numbers = re.findall(r'\d{1,2},\d{2,3}(?:,\d{3})*', page_text)

            # Get all numbers from Gemini rows
            gemini_numbers = []
            for row in gemini_page.get('Rows', []):
                for key, value in row.items():
                    if key not in ['Particulars', 'Schedule'] and value and value != '-' and value != '':
                        # Extract numbers from value
                        nums = re.findall(
                            r'\d{1,2},\d{2,3}(?:,\d{3})*', str(value))
                        gemini_numbers.extend(nums)

            # Remove duplicates and sort for comparison
            pdf_numbers_unique = sorted(list(set(pdf_numbers)))
            gemini_numbers_unique = sorted(list(set(gemini_numbers)))

            print(f"PDF numbers found: {len(pdf_numbers_unique)}")
            print(f"Gemini numbers found: {len(gemini_numbers_unique)}")

            # Calculate match rate
            matches = len(set(pdf_numbers_unique) & set(gemini_numbers_unique))
            total_numbers = len(set(pdf_numbers_unique) |
                                set(gemini_numbers_unique))

            if total_numbers > 0:
                match_rate = (matches / total_numbers) * 100
                print(
                    f"Match rate: {matches}/{total_numbers} ({match_rate:.1f}%)")

                page_matches += matches
                page_checks += total_numbers
            else:
                print("No numbers to compare")

            # Show some examples of matches and mismatches
            matches_found = set(pdf_numbers_unique) & set(
                gemini_numbers_unique)
            pdf_only = set(pdf_numbers_unique) - set(gemini_numbers_unique)
            gemini_only = set(gemini_numbers_unique) - set(pdf_numbers_unique)

            if matches_found:
                print(f"Examples of matches: {list(matches_found)[:5]}")
            if pdf_only:
                print(f"In PDF only: {list(pdf_only)[:5]}")
            if gemini_only:
                print(f"In Gemini only: {list(gemini_only)[:5]}")

            total_matches += page_matches
            total_checks += page_checks

        else:
            print(f"❌ No corresponding Gemini data for page {page_num + 1}")

    doc.close()

    # Overall summary
    print(f"\n{'='*80}")
    print("OVERALL VERIFICATION SUMMARY")
    print("="*80)

    if total_checks > 0:
        overall_match_rate = (total_matches / total_checks) * 100
        print(
            f"Total matches: {total_matches}/{total_checks} ({overall_match_rate:.1f}%)")

        if overall_match_rate >= 90:
            print("✅ EXCELLENT: Gemini JSON closely matches PDF content")
            status = "EXCELLENT"
        elif overall_match_rate >= 75:
            print("✅ GOOD: Gemini JSON mostly matches PDF content")
            status = "GOOD"
        elif overall_match_rate >= 60:
            print("⚠️  FAIR: Some discrepancies between Gemini and PDF")
            status = "FAIR"
        else:
            print("❌ POOR: Significant discrepancies found")
            status = "POOR"
    else:
        print("❌ No data to compare")
        status = "NO_DATA"

    return status, overall_match_rate if total_checks > 0 else 0


# Run comprehensive verification
try:
    pdf_path = "hdfc_pdf_splits_auto/L-1-A-RA_Revenue_Account_1-4_3_6.pdf"
    gemini_path = "l-1-a-ra_hdfc_corrected_multipage.json"

    status, match_rate = verify_all_pages(pdf_path, gemini_path)

    print(f"\nFINAL RESULT: {status} ({match_rate:.1f}% match)")

    if status in ["EXCELLENT", "GOOD"]:
        print(
            "\n🎉 SUCCESS: The Gemini corrected JSON accurately represents the PDF content!")
        print("✅ You can confidently use this JSON as your final output.")
    else:
        print("\n⚠️  The verification shows some discrepancies.")
        print("💡 Consider re-running the Gemini correction with adjusted parameters.")

except Exception as e:
    print(f"❌ Error during verification: {e}")
    import traceback
    traceback.print_exc()
