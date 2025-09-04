from services.master_template import get_company_pdf_path
import fitz
import sys
import os
import re
sys.path.append('.')


def debug_form_parsing():
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
            lines = [line.strip()
                     for line in page_text.split('\n') if line.strip()]

            # Simulate our parsing logic
            print("\n=== TESTING OUR PARSING LOGIC ===")
            forms = []
            i = 0

            # Skip header lines
            skip_keywords = [
                'sr no', 'form no', 'description', 'page no', 'pages',
                'contents', 'index', 'table', 'list of website disclosures',
                'website disclosures', 'disclosures', 'forms', 'particulars',
                'serial', 'number', 'details', 'heading', 'title', 'schedule',
                'name of the insurer', 'registration number', 'irda', 'irdai'
            ]

            while i < len(lines):
                line = lines[i]

                # Skip empty lines and headers
                if not line or len(line) < 3:
                    i += 1
                    continue

                # Skip header lines (case insensitive)
                if any(keyword in line.lower() for keyword in skip_keywords):
                    print(f"  SKIP (header): '{line}'")
                    i += 1
                    continue

                # Test SBI-style pattern
                sbi_match = re.search(
                    r'^(\d+)\s+([A-Z]-\d+(?:-[A-Z]+)*)\s*(.*)', line, re.IGNORECASE)
                if sbi_match:
                    sr_no, form_no, description_part = sbi_match.groups()

                    form_no = form_no.strip().upper()
                    description = description_part.strip()

                    # Look for page numbers on the next few lines
                    pages = None
                    j = i + 1

                    # Check next few lines for page numbers
                    while j < len(lines) and j < i + 4:
                        next_line = lines[j].strip()

                        if not next_line:
                            j += 1
                            continue

                        # Check if this line contains only page numbers
                        page_patterns = [
                            # "7-10" or "23"
                            r'^(\d+(?:-\d+)?)$',
                            # Just a number
                            r'^(\d+)\s*$',
                            # "Pages: 7-10"
                            r'^page[s]?\s*:?\s*(\d+(?:-\d+)?)$',
                        ]

                        page_found = False
                        for pattern in page_patterns:
                            page_match = re.match(
                                pattern, next_line, re.IGNORECASE)
                            if page_match:
                                pages = page_match.group(1)
                                page_found = True
                                break

                        if page_found:
                            break

                        # If we hit another form line, stop looking for pages
                        if re.search(r'^\d+\s+[A-Z]-\d+', next_line, re.IGNORECASE):
                            break

                        j += 1

                    # Validate form_no format and add to results
                    if re.match(r'^[A-Z]-\d+', form_no):
                        forms.append({
                            "sr_no": sr_no.strip(),
                            "form_no": form_no,
                            "description": description if description else form_no,
                            "pages": pages
                        })
                        print(
                            f"  FOUND: {sr_no} - {form_no} - {description} (Pages: {pages})")
                    else:
                        print(
                            f"  INVALID form_no: '{form_no}' from line '{line}'")

                    # Move to the next line (skip the page number line if found)
                    i = j if pages else i + 1
                    continue
                else:
                    print(f"  NO MATCH: '{line}'")

                i += 1

            print(f"\n=== FINAL RESULTS ===")
            print(f"Total forms found: {len(forms)}")

            target_forms = ['L-4-PREMIUM', 'L-5-COMMISSION',
                            'L-6-OPERATING', 'L-7-BENEFITS', 'L-8-SHARE']
            for target in target_forms:
                found = any(target in form['form_no'] for form in forms)
                status = "✅" if found else "❌"
                print(f"  {status} {target}")

            break

    doc.close()


if __name__ == "__main__":
    debug_form_parsing()
