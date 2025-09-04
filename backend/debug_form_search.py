from services.master_template import get_company_pdf_path
import fitz
import sys
import os
sys.path.append('.')


def debug_form_search():
    """Debug why the form search isn't finding L-1, L-2, L-4, etc."""
    filename = "SBI Life  S FY2023 Q1.pdf"
    pdf_path = get_company_pdf_path("sbi", filename)

    doc = fitz.open(pdf_path)

    # Test the forms that are missing
    missing_forms = ['L-1-A-REVENUE', 'L-2-A-PROFIT',
                     'L-4-PREMIUM', 'L-5-COMMISSION']

    for form_no in missing_forms:
        print(f"\n=== SEARCHING FOR {form_no} ===")
        found_pages = []

        # Check first 15 pages where these forms should be
        for page_num in range(min(15, doc.page_count)):
            page = doc.load_page(page_num)
            page_text = page.get_text()

            # Skip the forms index page
            if "List of Website Disclosures" in page_text:
                continue

            # Show what's actually on the page
            first_200_chars = page_text[:200].replace('\n', ' ').strip()

            # Test different search patterns
            search_patterns = [
                f"Form {form_no}",
                f"Form {form_no.replace('-', '-')}",
                f"Form {form_no.replace('-', ' ')}",
                f"{form_no}",
                # More specific patterns based on what we saw earlier
                f"Form L-1-A-RA",  # For L-1-A-REVENUE
                f"Form L-2-A-PL",  # For L-2-A-PROFIT
                f"Form L-4 Premium",  # For L-4-PREMIUM
                f"Form L-5- Commission",  # For L-5-COMMISSION
            ]

            matches = []
            for pattern in search_patterns:
                if pattern in page_text[:200]:
                    matches.append(pattern)

            if matches:
                print(f"  Page {page_num + 1}: FOUND - {matches}")
                print(f"    Content: {first_200_chars}")
                found_pages.append(page_num + 1)
            else:
                # Show content anyway for debugging
                if page_num <= 10:  # Only for first few pages
                    print(
                        f"  Page {page_num + 1}: No match - {first_200_chars}")

        print(f"  Final result: {form_no} found on pages {found_pages}")

    doc.close()


if __name__ == "__main__":
    debug_form_search()
