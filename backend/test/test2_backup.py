import os
import re
import json
import pdfplumber
from PyPDF2 import PdfReader, PdfWriter


def detect_index_pages(pdf_path, max_check_pages=3):
    """Detect index pages by checking only the first 3 pages for lines with at least 5 form codes (L-1-A-RA etc)."""
    index_pages = 0
    with pdfplumber.open(pdf_path) as pdf:
        for i in range(min(max_check_pages, len(pdf.pages))):
            text = pdf.pages[i].extract_text() or ""
            lines = [l.strip() for l in text.splitlines() if l.strip()]
            form_lines = [l for l in lines if re.search(
                r"\bL-\d+(?:-[A-Z0-9]+)*\b", l)]

            # If at least 5 form-like lines, treat as index page
            if len(form_lines) >= 5:
                index_pages += 1
            else:
                break

    print(f"📘 Index pages detected: {index_pages}")
    return index_pages


def extract_index_forms(pdf_path, index_pages):
    """Extract all L-x style form numbers from the index pages (including L-1-A-RA etc)."""
    forms = []
    with pdfplumber.open(pdf_path) as pdf:
        for i in range(index_pages):
            text = pdf.pages[i].extract_text() or ""
            for line in text.splitlines():
                # Corrected regex: single backslash for word boundary
                match = re.search(r"\b(L-\d+(?:-[A-Z0-9]+)*)\b", line)
                if match:
                    form_no = match.group(1).strip()
                    if form_no not in forms:
                        forms.append(form_no)
    return forms


def detect_form_ranges(pdf_path, form_codes, skip_pages):
    """Detect start/end pages for forms after skipping index pages."""
    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        positions = {}

        print(
            f"🔍 Scanning {total_pages - skip_pages} pages for form headers (skipping {skip_pages} index pages)...")

        for i in range(skip_pages, total_pages):
            lines = (pdf.pages[i].extract_text() or "").splitlines()
            text = " ".join(lines[:5]).upper()  # Only first 5 lines
            for form in form_codes:
                safe_form = re.escape(form)

                pattern = re.compile(
                    rf"""
    \b
    (?:FORM|Form)?\s*       # optional "Form"
    # allow dashes/spaces in between
    {re.escape(form).replace("\\-", "[-\\s]*")}
    (?:\s*[-:]?\s*          # optional dash or colon
    [A-Z ]*(SCHEDULE|STATEMENT|PATTERN|FORM|BS|PL))?
    """,
                    re.IGNORECASE | re.VERBOSE,
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

        form_ranges = []
        found_forms = [f for f in form_codes if f in positions]

        for idx, form in enumerate(found_forms):
            start = positions[form]
            end = positions[found_forms[idx + 1]] - \
                1 if idx + 1 < len(found_forms) else total_pages
            if end < start:
                end = start
            form_ranges.append({
                "form_no": form,
                "start_page": start,
                "end_page": end
            })

        return form_ranges


def split_pdf_by_ranges(pdf_path, output_dir, form_ranges, skip_pages):
    """Split PDF by detected form ranges."""
    os.makedirs(output_dir, exist_ok=True)
    reader = PdfReader(pdf_path)
    split_files = []

    for r in form_ranges:
        writer = PdfWriter()
        for p in range(r["start_page"] - 1, r["end_page"]):
            if p >= skip_pages:
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
    company_name = "StarUnion Daichi Life"
    pdf_path = r"C:\Users\vicky\OneDrive\Desktop\Viyanta-project\viyanta_web\backend\test\StarUnion Daichi Life S FY2025 HY.pdf"
    output_dir = os.path.splitext(pdf_path)[0]

    print(f"📄 Processing: {pdf_path}")

    skip_pages = detect_index_pages(pdf_path)
    print(f"🧾 Detected {skip_pages} index page(s) to skip.")

    forms = extract_index_forms(pdf_path, skip_pages)
    print(f"✅ Found {len(forms)} index forms: {forms}")

    # Fallback: if no forms found, use hardcoded L-1 to L-45
    if not forms:
        forms = [f"L-{i}" for i in range(1, 46)]
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
