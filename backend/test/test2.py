import os
import re
import json
import pdfplumber
from PyPDF2 import PdfReader, PdfWriter


def detect_index_pages(pdf_path, max_check_pages=3):
    """Detect the true index page: the one with the most form lines (30+), else fallback."""
    index_page_indices = []
    form_lines_per_page = []
    with pdfplumber.open(pdf_path) as pdf:
        for i in range(min(max_check_pages, len(pdf.pages))):
            text = pdf.pages[i].extract_text() or ""
            lines = [l.strip() for l in text.splitlines() if l.strip()]
            form_lines = [l for l in lines if re.search(
                r"\bL-\d+(?:-[A-Z0-9]+)*\b", l)]
            form_lines_per_page.append((i, len(form_lines)))
            print(f"Page {i+1}: {len(form_lines)} form lines detected.")
    # Find the page with the most form lines (30+)
    likely_index = [i for i, count in form_lines_per_page if count >= 30]
    if likely_index:
        index_page_indices = likely_index
    print(
        f"📘 Index pages detected: {len(index_page_indices)} (pages: {[p+1 for p in index_page_indices]})")
    return index_page_indices


def extract_index_forms(pdf_path, index_page_indices):
    """Extract all L-x style form numbers from the index pages (including L-1-A-RA etc)."""
    forms = []
    with pdfplumber.open(pdf_path) as pdf:
        for i in index_page_indices:
            text = pdf.pages[i].extract_text() or ""
            print(f"--- Extracted text from index page {i+1} ---")
            for line in text.splitlines():
                print(repr(line))
                line = line.strip()
                match = re.search(
                    r"""
\b
(?:FORM\s+)?                        # Optional FORM or Form prefix
(?:
    L-\d+(?:-[A-Z0-9]+)*            # L- style code with optional segments
    (?:-Form\s*\d+[A-Z0-9]*)?       # Optional -Form 3A style suffix
  |
    \d+(?:-[A-Z0-9]+)*               # Numeric form code like 16-FXED
) |
(L-\d+(?:-[A-Z0-9]+)*|L\d+[A-Z]*)
\b
""", line)
                if match:
                    try:
                        form_no = match.group(1).strip()
                    except IndexError:
                        form_no = match.group(0).strip()
                    if form_no not in forms:
                        forms.append(form_no)
            print("--- End of extracted text ---")
    print(f"Extracted forms from index: {forms}")
    return forms


# def generate_parent_codes(form_code):
#     parts = form_code.split('-')
#     codes = []
#     for i in range(2, len(parts)+1):
#         codes.append('-'.join(parts[:i]))
#     return codes


def generate_parent_codes(form_code):
    parts = form_code.split('-')
    codes = []
    for i in range(2, len(parts)+1):
        code = '-'.join(parts[:i])
        codes.append(code)
        # Special handling: if code is L-16, also add 16 and 16- patterns
        if code == 'L-16':
            codes.append('16')
            codes.append('16-')
        if code == 'L-9A':
            codes.append('L-9A')
            codes.append('L-9A -')
            codes.append('L-9 A-')
            codes.append('L-9 A -')
        if code == 'L-14A':
            codes.append('L-14A')
            codes.append('L-14A -')
            codes.append('L-14 A-')
            codes.append('L-14 A -')
        if code == 'L-25 (i)':
            codes.append('L-25 (i)')
            codes.append('L-25 (i)-')
            codes.append('L-25(i) -')
            codes.append('L-25(i)-')
            codes.append('L-25- (i)')
            codes.append('L-25 - (i)')
            codes.append('L-25 -(i)')
            codes.append('L-25- (i) :')
            codes.append('L-25- (i):')
            codes.append('L-25 -(i) : ')
        if code == 'L-25 (ii)':
            codes.append('L-25 (ii)')
            codes.append('L-25 (ii)-')
            codes.append('L-25(ii) -')
            codes.append('L-25(ii)-')
            codes.append('L-25- (ii)')
            codes.append('L-25 - (ii)')
            codes.append('L-25 -(ii)')
            codes.append('L-25- (ii):')
            codes.append('L-25- (ii) :')

    return codes


def detect_form_ranges(pdf_path, form_codes, index_page_indices):
    """Detect start/end pages for forms after skipping index pages. Only scan after the last index page."""
    import pdfplumber
    import re

    # Build a set of all unique parent codes from the extracted forms
    all_codes = set()
    form_to_parents = {}
    for code in form_codes:
        parents = generate_parent_codes(code)
        all_codes.update(parents)
        form_to_parents[code] = parents[::-1]  # from most specific to least
    all_codes = list(all_codes)

    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        positions = {}

        # Only scan after the last index page
        scan_start = max(index_page_indices) + 1 if index_page_indices else 0
        print(
            f"🔍 Scanning {total_pages - scan_start} pages for form headers (starting from page {scan_start+1})..."
        )

        for i in range(scan_start, total_pages):
            text = pdf.pages[i].extract_text() or ""
            text = text.replace("‐", "-").replace("–", "-").replace("—", "-")

            # Scan top portion of the page
            lines = text.splitlines()
            text = " ".join(lines[:5]).upper()

            for form in all_codes:
                safe_form = re.escape(form)

                pattern = re.compile(
                    rf"""
                    (?i)
                    \bFORM[-\s]*{safe_form.replace("\\-", "[-\\s]*")}
                    (?:[-\s]*(?:SCHEDULE|STATEMENT|PATTERN|FORM|BS|PL|PART|DETAILS|INFORMATION))?
                    |
                    \b{safe_form.replace("\\-", "[-\\s]*")}
                    (?:[-\s]*(?:FORM|SCHEDULE|STATEMENT|PATTERN|BS|PL|PART|DETAILS|INFORMATION))?
                    """,
                    re.VERBOSE,
                )

                try:
                    if pattern.search(text):
                        if form not in positions:
                            positions[form] = i + 1
                            print(f"   🏷️ Found {form} on page {i + 1}")
                except re.error:
                    if form.upper() in text and form not in positions:
                        positions[form] = i + 1
                        print(f"   🏷️ Found {form} (fallback) on page {i + 1}")

        # ✅ --- FIXED RANGE DETECTION SECTION ---
        form_ranges = []
        seen_forms = set()

        # Sort all forms actually found by their detected page positions
        sorted_forms = sorted(
            [(form, positions[parent])
             for form in form_codes
             for parent in form_to_parents[form]
             if parent in positions],
            key=lambda x: x[1]
        )

        for idx, (form, start_page) in enumerate(sorted_forms):
            if form in seen_forms:
                continue
            seen_forms.add(form)

            # Find the next form’s start page
            next_found = None
            for j in range(idx + 1, len(sorted_forms)):
                next_found = sorted_forms[j][1]
                if next_found:
                    break

            end_page = next_found - 1 if next_found else total_pages
            if end_page < start_page:
                end_page = start_page

            form_ranges.append({
                "form_no": form,
                "start_page": start_page,
                "end_page": end_page,
            })

        return form_ranges


def split_pdf_by_ranges(pdf_path, output_dir, form_ranges, index_page_indices):
    """Split PDF by detected form ranges."""
    os.makedirs(output_dir, exist_ok=True)
    reader = PdfReader(pdf_path)
    split_files = []

    for r in form_ranges:
        writer = PdfWriter()
        for p in range(r["start_page"] - 1, r["end_page"]):
            if p not in index_page_indices:
                writer.add_page(reader.pages[p])

        filename = f"{r['form_no']}_{r['start_page']}_{r['end_page']}.pdf"
        output_path = os.path.join(output_dir, filename)
        with open(output_path, "wb") as f_out:
            writer.write(f_out)

        split_files.append({
            "filename": filename,
            "path": output_path.replace("\\", "/"),
            "form_name": r["form_no"],
            "form_code": r["form_no"],
            "serial_no": "",
            "start_page": r["start_page"],
            "end_page": r["end_page"],
            "original_form_no": r["form_no"]
        })

    return split_files


def generate_metadata(company_name, pdf_path, output_dir, form_ranges, split_files):
    """Generate structured JSON metadata."""
    return {
        "company_name": company_name,
        "original_filename": os.path.basename(pdf_path),
        "original_path": pdf_path.replace("\\", "/"),
        "splits_folder": output_dir.replace("\\", "/"),
        "total_splits": len(split_files),
        "split_files": split_files,
        "ranges": form_ranges,
        "method": "auto_index+content"
    }


def main():
    company_name = "Acko Life"
    pdf_path = r"C:\Users\vicky\OneDrive\Desktop\Viyanta-project\viyanta_web\backend\test\Acko Life S FY2025 HY.pdf"
    output_dir = os.path.splitext(pdf_path)[0]

    print(f"📄 Processing: {pdf_path}")

    skip_pages = detect_index_pages(pdf_path)
    print(f"🧾 Detected {skip_pages} index page(s) to skip.")

    index_page_indices = detect_index_pages(pdf_path)

    print(f"🧾 Detected {len(index_page_indices)} index page(s) to skip.")

    forms = extract_index_forms(pdf_path, index_page_indices)

    forms = extract_index_forms(pdf_path, skip_pages)
    print(f"✅ Found {len(forms)} index forms: {forms}")

    # Fallback: if no forms found, use hardcoded L-1 to L-45
    if not forms:
        forms = [f"L-{i}" for i in range(1, 46)]
        extra_forms = ["L-6A", "L-9A", "L-14A", "L-25 (i)", "L-25 (ii)"]
        forms.extend(extra_forms)
        print(f"⚠️  No index forms found, using hardcoded forms: {forms}")

    form_ranges = detect_form_ranges(pdf_path, forms, skip_pages)
    print(
        f"✅ Detected {len(form_ranges)} valid form ranges (after skipping index pages).")

    split_files = split_pdf_by_ranges(
        pdf_path, output_dir, form_ranges, skip_pages)
    print(f"✂️ Created {len(split_files)} split PDFs in {output_dir}")

    metadata = generate_metadata(
        company_name, pdf_path, output_dir, form_ranges, split_files)

    meta_path = os.path.join(output_dir, "metadata.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    print(f"🧾 Metadata written to: {meta_path}")
    print("🎉 Done!")


if __name__ == "__main__":
    main()
