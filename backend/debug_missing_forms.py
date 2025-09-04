from services.master_template import get_company_pdf_path
import fitz
import sys
import os
sys.path.append('.')


def debug_missing_forms():
    # Check SBI Life S FY2023 9M.pdf for the missing forms
    company = "sbi"
    filename = "SBI Life  S FY2023 9M.pdf"

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
            lines = page_text.split('\n')

            # Look for the missing forms specifically
            missing_forms = ['L-4-PREMIUM', 'L-5-COMMISSION',
                             'L-6-OPERATING', 'L-7-EXPENSES', 'L-8-MANAGEMENT']

            print("\n=== SEARCHING FOR MISSING FORMS ===")
            for i, line in enumerate(lines):
                line = line.strip()
                if any(form in line.upper() for form in missing_forms):
                    print(f"Line {i:>3}: '{line}'")
                    # Show context (prev and next lines)
                    if i > 0:
                        print(f"      -1: '{lines[i-1].strip()}'")
                    if i < len(lines) - 1:
                        print(f"      +1: '{lines[i+1].strip()}'")
                    print()

            print("\n=== ALL LINES WITH NUMBERS (potential forms) ===")
            for i, line in enumerate(lines):
                line = line.strip()
                if line and (line[0].isdigit() or 'L-' in line.upper()):
                    print(f"Line {i:>3}: '{line}'")

            break

    doc.close()


if __name__ == "__main__":
    debug_missing_forms()
