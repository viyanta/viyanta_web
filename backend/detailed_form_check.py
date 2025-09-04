from services.master_template import get_company_pdf_path
import fitz
import sys
import os
sys.path.append('.')


def detailed_form_check():
    """Detailed check of form content and page numbers in Q1 PDF"""
    filename = "SBI Life  S FY2023 Q1.pdf"
    pdf_path = get_company_pdf_path("sbi", filename)

    if not os.path.exists(pdf_path):
        print(f"PDF not found: {pdf_path}")
        return

    doc = fitz.open(pdf_path)
    print(f"Total pages in Q1 PDF: {doc.page_count}")

    print(f"\n=== CHECKING PAGES 3-13 FOR EARLY FORMS ===")

    for page_num in range(2, min(13, doc.page_count)):  # Pages 3-13
        page = doc.load_page(page_num)
        page_text = page.get_text()
        lines = page_text.split('\n')[:5]  # First 5 lines

        print(f"\nPage {page_num + 1}:")
        for i, line in enumerate(lines):
            if line.strip():
                print(f"  Line {i+1}: {line.strip()}")

    # Also check what the actual structure is
    print(f"\n=== FORMS INDEX ANALYSIS ===")

    # Get the forms index page again
    for page_num in range(min(5, doc.page_count)):
        page = doc.load_page(page_num)
        page_text = page.get_text()

        if "List of Website Disclosures" in page_text:
            lines = [line.strip()
                     for line in page_text.split('\n') if line.strip()]

            print("Early forms in index:")
            form_count = 0
            for i, line in enumerate(lines):
                if line and line[0].isdigit() and 'L-' in line and form_count < 10:
                    form_count += 1
                    print(f"  {line}")

            break

    doc.close()


if __name__ == "__main__":
    detailed_form_check()
