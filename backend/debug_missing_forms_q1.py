from services.master_template import get_company_pdf_path
import fitz
import sys
import os
sys.path.append('.')


def debug_missing_forms_q1():
    """Debug why L-4, L-5, L-6, L-7 are not being found"""
    filename = "SBI Life  S FY2023 Q1.pdf"
    pdf_path = get_company_pdf_path("sbi", filename)

    doc = fitz.open(pdf_path)

    # Check pages 7-14 where these forms should be
    print("=== CHECKING PAGES 7-14 FOR MISSING FORMS ===")

    for page_num in range(6, min(14, doc.page_count)):  # Pages 7-14
        page = doc.load_page(page_num)
        page_text = page.get_text()

        # Get first 3 lines
        lines = page_text.split('\n')[:3]
        page_start = ' '.join(lines).strip()

        print(f"\nPage {page_num + 1}:")
        print(f"  First 3 lines: {page_start}")

        # Check if company name exists
        has_company = "SBI LIFE" in page_text[:500]
        has_form_word = "Form" in page_start
        has_schedule = "Schedule" in page_text[:200]

        print(
            f"  Has company: {has_company}, Has 'Form': {has_form_word}, Has 'Schedule': {has_schedule}")

        # Test patterns for missing forms
        missing_forms = ['L-4-PREMIUM', 'L-5-COMMISSION',
                         'L-6-OPERATING', 'L-7-BENEFITS']

        for form in missing_forms:
            patterns = [f"Form {form}", f"{form}"]
            for pattern in patterns:
                if pattern in page_start:
                    print(f"  ✅ FOUND {form} with pattern '{pattern}'")
                    break
            else:
                # Check if any part of the form is there
                form_parts = form.split('-')
                if len(form_parts) >= 3:
                    short_form = '-'.join(form_parts[:3])
                    short_patterns = [f"Form {short_form}", f"{short_form}"]
                    for pattern in short_patterns:
                        if pattern in page_start:
                            print(
                                f"  ⚠️  FOUND {form} (shortened) with pattern '{pattern}'")
                            break

    doc.close()


if __name__ == "__main__":
    debug_missing_forms_q1()
