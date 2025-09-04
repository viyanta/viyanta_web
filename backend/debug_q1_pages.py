from services.master_template import get_company_pdf_path
import fitz
import sys
import os
sys.path.append('.')


def debug_q1_pages():
    # Check SBI Life S FY2023 Q1.pdf for the page number issue
    company = "sbi"
    filename = "SBI Life  S FY2023 Q1.pdf"

    pdf_path = get_company_pdf_path(company, filename)
    print(f"Opening PDF: {pdf_path}")

    if not os.path.exists(pdf_path):
        print(f"PDF not found: {pdf_path}")
        return

    doc = fitz.open(pdf_path)

    # Search for the forms index section
    for page_num in range(min(5, doc.page_count)):
        page = doc.load_page(page_num)
        page_text = page.get_text()

        if "List of Website Disclosures" in page_text:
            print(f"\n=== FOUND FORMS INDEX ON PAGE {page_num + 1} ===")
            lines = [line.strip()
                     for line in page_text.split('\n') if line.strip()]

            # Look specifically at the first 20 lines after the header
            print("\n=== FIRST 20 LINES AFTER HEADER ===")
            for i, line in enumerate(lines):
                if 'L-1-A-REVENUE' in line or i > 40:  # Start from L-1-A-REVENUE
                    print(f"Line {i:>3}: '{line}'")
                    if i > 60:  # Show next 20 lines
                        break

            # Also check specifically for the missing page patterns
            print("\n=== LOOKING FOR EARLY FORM PAGE PATTERNS ===")
            target_forms = ['L-1-A-REVENUE', 'L-2-A-PROFIT',
                            'L-3', 'L-4-PREMIUM', 'L-5-COMMISSION']

            for i, line in enumerate(lines):
                if any(form in line.upper() for form in target_forms):
                    print(f"Form line {i:>3}: '{line}'")
                    # Check next 3 lines for page numbers
                    for j in range(1, 4):
                        if i + j < len(lines):
                            next_line = lines[i + j].strip()
                            print(f"     +{j}: '{next_line}'")
                    print()

            break

    doc.close()


if __name__ == "__main__":
    debug_q1_pages()
