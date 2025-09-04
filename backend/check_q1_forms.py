from services.master_template import get_company_pdf_path
import fitz
import sys
import os
sys.path.append('.')


def check_form_existence_in_q1():
    """Check if the forms without page numbers actually exist in the Q1 PDF"""
    filename = "SBI Life  S FY2023 Q1.pdf"
    pdf_path = get_company_pdf_path("sbi", filename)

    if not os.path.exists(pdf_path):
        print(f"PDF not found: {pdf_path}")
        return

    doc = fitz.open(pdf_path)
    print(f"Total pages in Q1 PDF: {doc.page_count}")

    # Check if forms L-1 through L-8 actually exist in the content
    forms_to_check = [
        "L-1-A-REVENUE", "L-2-A-PROFIT", "L-3", "L-4-PREMIUM",
        "L-5-COMMISSION", "L-6-OPERATING", "L-7-BENEFITS", "L-8-SHARE"
    ]

    print(f"\n=== CHECKING IF FORMS EXIST IN PDF CONTENT ===")

    for form in forms_to_check:
        found_pages = []

        # Search through all pages for this form
        for page_num in range(doc.page_count):
            page = doc.load_page(page_num)
            page_text = page.get_text()

            # Look for the form number in the page content (not just the index)
            if form in page_text and "List of Website Disclosures" not in page_text:
                found_pages.append(page_num + 1)

        if found_pages:
            print(f"✅ {form}: Found on pages {found_pages}")
        else:
            print(f"❌ {form}: Not found in PDF content")

    print(f"\n=== SAMPLE PAGE CONTENT CHECK ===")
    # Check what's actually on pages 3-10 (likely where L-1 to L-8 would be if they exist)
    for page_num in range(2, min(10, doc.page_count)):
        page = doc.load_page(page_num)
        page_text = page.get_text()
        first_line = page_text.split('\n')[0].strip() if page_text else ""
        print(f"Page {page_num + 1}: {first_line[:60]}...")

    doc.close()


if __name__ == "__main__":
    check_form_existence_in_q1()
