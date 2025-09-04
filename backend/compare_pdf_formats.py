from services.master_template import get_company_pdf_path
import fitz
import sys
import os
sys.path.append('.')


def compare_pdf_formats():
    # Compare the forms sections between 9M and Q1 PDFs
    test_files = [
        ("SBI Life  S FY2023 9M.pdf", "9M"),
        ("SBI Life  S FY2023 Q1.pdf", "Q1")
    ]

    for filename, label in test_files:
        print(f"\n{'='*60}")
        print(f"ANALYZING {label} PDF: {filename}")
        print(f"{'='*60}")

        pdf_path = get_company_pdf_path("sbi", filename)

        if not os.path.exists(pdf_path):
            print(f"PDF not found: {pdf_path}")
            continue

        doc = fitz.open(pdf_path)

        # Search for the forms index section
        for page_num in range(min(5, doc.page_count)):
            page = doc.load_page(page_num)
            page_text = page.get_text()

            if "List of Website Disclosures" in page_text:
                print(f"Found forms index on page {page_num + 1}")
                lines = [line.strip()
                         for line in page_text.split('\n') if line.strip()]

                # Show the first 15 form lines
                form_count = 0
                for i, line in enumerate(lines):
                    if line and line[0].isdigit() and 'L-' in line:
                        form_count += 1
                        print(f"Form {form_count:>2}: '{line}'")
                        # Show next 2 lines to see if page numbers are there
                        for j in range(1, 3):
                            if i + j < len(lines):
                                next_line = lines[i + j].strip()
                                if next_line and not (next_line[0].isdigit() and 'L-' in next_line):
                                    print(f"        +{j}: '{next_line}'")

                        if form_count >= 10:  # Just show first 10 forms for comparison
                            break
                break

        doc.close()


if __name__ == "__main__":
    compare_pdf_formats()
