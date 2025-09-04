import fitz  # PyMuPDF
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


def debug_aditya_birla_l1():
    """Debug L-1-A-RA extraction for Aditya Birla specifically"""

    pdf_path = "pdfs_selected_company/ADITYA BIRLA SUN LIFE/Aditya Birla Life S FY2023 9M.pdf"

    if not os.path.exists(pdf_path):
        print(f"PDF not found: {pdf_path}")
        return

    doc = fitz.open(pdf_path)
    print(f"Total pages in PDF: {doc.page_count}")

    # Search patterns for L-1-A-RA
    form_no = "L-1-A-RA"
    form_parts = form_no.upper().split('-')

    search_patterns = [
        "L-1-A-RA",
        "L 1 A RA",
        "L1ARA",
        "L1 A RA",
        "L-1 A RA",
        "L1-A-RA",
        "L 1 A R A",
        "FORM L1 - RA",      # This is what we see in the PDF!
        "FORM L1  - RA",     # With extra space
        "FORM L-1 - RA",
        "FORM L1 RA",
    ]

    print(f"\nSearching for form {form_no} with patterns: {search_patterns}")
    print("="*80)

    found_pages = []

    for page_num in range(min(20, doc.page_count)):  # Check first 20 pages
        page = doc.load_page(page_num)
        page_text = page.get_text()

        # Skip the forms index page
        if any(keyword in page_text.lower() for keyword in ["list of website disclosures", "website disclosures", "contents"]):
            print(f"Page {page_num + 1}: SKIPPED (Forms index)")
            continue

        # Get the first few lines of the page (where headers/titles typically appear)
        lines = [line.strip()
                 for line in page_text.split('\n') if line.strip()]
        header_text = ' '.join(lines[:5]).upper()

        print(f"Page {page_num + 1}: Header: {header_text[:100]}...")

        # Check if any pattern matches in the header
        pattern_found = False
        for pattern in search_patterns:
            if pattern in header_text:
                print(f"  ✅ MATCH: Found pattern '{pattern}' in header!")

                # Additional validation: ensure this looks like a form page
                form_indicators = [
                    "FORM" in header_text,
                    "SCHEDULE" in page_text.upper()[:500],
                    "(RS" in page_text.upper()[:500],
                    "FOR THE PERIOD ENDED" in page_text.upper()[:500],
                    "REVENUE" in page_text.upper()[:500],
                    "PROFIT" in page_text.upper()[:500],
                    "BALANCE" in page_text.upper()[:500],
                    "PREMIUM" in page_text.upper()[:500],
                    # Company registration info
                    "REGISTRATION NUMBER" in page_text.upper()[:500],
                ]

                valid_indicators = [ind for ind in form_indicators if ind]
                print(f"  📊 Form indicators found: {valid_indicators}")

                if any(form_indicators):
                    found_pages.append(page_num + 1)
                    print(f"  ✅ VALID FORM PAGE: Added page {page_num + 1}")
                    pattern_found = True
                    break
                else:
                    print(f"  ❌ NO FORM INDICATORS: Not a valid form page")

        if not pattern_found:
            print(f"  ❌ No pattern match")

    doc.close()

    print("="*80)
    print(f"SUMMARY for {form_no}:")
    print(f"Found on pages: {found_pages}")

    if found_pages:
        if len(found_pages) == 1:
            result = str(found_pages[0])
        else:
            # Check if pages are consecutive
            found_pages.sort()
            ranges = []
            start = found_pages[0]
            end = found_pages[0]

            for i in range(1, len(found_pages)):
                if found_pages[i] == end + 1:
                    end = found_pages[i]
                else:
                    if start == end:
                        ranges.append(str(start))
                    else:
                        ranges.append(f"{start}-{end}")
                    start = found_pages[i]
                    end = found_pages[i]

            # Add final range
            if start == end:
                ranges.append(str(start))
            else:
                ranges.append(f"{start}-{end}")

            result = ", ".join(ranges)

        print(f"Formatted result: {result}")
    else:
        print("No valid pages found")


if __name__ == "__main__":
    debug_aditya_birla_l1()
