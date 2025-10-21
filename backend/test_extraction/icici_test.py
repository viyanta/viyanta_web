#!/usr/bin/env python3
"""
ICICI Prudential PDF Auto Splitter v7.0
---------------------------------------
✅ Reads index page (usually page 2)
✅ Detects all FORM L-* patterns
✅ Uses strict prefix matching (L-2 != L-21)
✅ Computes start/end pages dynamically
✅ Produces clean metadata.json output
"""

import re
import json
from pathlib import Path
from PyPDF2 import PdfReader, PdfWriter

# ==============================
# CONFIG
# ==============================
PDF_PATH = r"ICICI Prudential Life  C FY2023 9M.pdf"
COMPANY_NAME = "icici_prudential"
OUTPUT_FOLDER = Path(f"pdf_splits/{COMPANY_NAME}/{Path(PDF_PATH).stem}")
OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)
OUTPUT_JSON = Path(f"{COMPANY_NAME}_metadata_output.json")
OFFSET = 2  # Page offset (PDF starts 2 pages after cover)

# ==============================
# UTILITIES
# ==============================


def normalize_text(text: str) -> str:
    """Clean up text: uppercase, remove spacing and special chars."""
    text = text.upper()
    text = re.sub(r'[\u2010-\u2015–—−]', '-', text)  # normalize dashes
    text = re.sub(r'[^A-Z0-9\-]', '', text)  # remove spaces/newlines
    return text


def extract_index_forms(pdf_reader, index_page_num=1):
    """Extract form numbers (L-1, L-2, etc.) from the index page."""
    print(f"🔍 Extracting forms from index page {index_page_num + 1}...")
    text = pdf_reader.pages[index_page_num].extract_text() or ""
    forms = re.findall(r'L[\- ]?\d+[A-Z]?', text, re.IGNORECASE)
    cleaned = []
    for f in forms:
        f = f.strip().upper().replace(" ", "")
        if f not in cleaned:
            cleaned.append(f)
    print(f"✅ Found {len(cleaned)} forms in index: {cleaned[:10]} ...")
    return cleaned


def extract_index_forms_with_pages(pdf_reader, index_page_num=1):
    """Extract all form codes and page numbers/ranges from the index page, robustly."""
    print(
        f"🔍 Extracting forms and pages from index page {index_page_num + 1}...")
    text = pdf_reader.pages[index_page_num].extract_text() or ""
    lines = text.splitlines()
    forms = []
    for line in lines:
        # Find all form codes in the line
        form_matches = list(re.finditer(
            r'(L[\- ]?\d+[A-Z]?)', line, re.IGNORECASE))
        if not form_matches:
            continue
        # Try to extract page numbers/ranges from any numeric columns
        tokens = re.split(r'\s+', line)
        nums = [t for t in tokens if t.isdigit()]
        # Prefer range if present
        m_range = re.search(r'(\d+)\s*[-–—to]+\s*(\d+)', line)
        if m_range:
            start = int(m_range.group(1))
            end = int(m_range.group(2))
            for m in form_matches:
                code = m.group(1).strip().upper().replace(
                    " ", "").replace("–", "-")
                forms.append((code, start, end))
        elif len(nums) >= 1:
            # Only start page given, end page will be inferred later
            start = int(nums[-1])
            for m in form_matches:
                code = m.group(1).strip().upper().replace(
                    " ", "").replace("–", "-")
                forms.append((code, start, None))
    print(f"✅ Found {len(forms)} forms in index with pages: {forms[:10]} ...")
    return forms


def find_form_pages(pdf_reader, forms):
    """Search for each form occurrence across the PDF (fallback if index missing)."""
    print("🧭 Searching for form pages (fallback)...")
    form_pages = {}
    total_pages = len(pdf_reader.pages)
    for i in range(total_pages):
        text = pdf_reader.pages[i].extract_text() or ""
        clean_text = normalize_text(text)
        for form in forms:
            code = form.upper().replace(" ", "")
            pattern = rf'(FORM)?L[-–]?{re.escape(code[2:])}\\b(?!\\d)'
            if re.search(pattern, clean_text):
                if code not in form_pages:
                    form_pages[code] = i + 1
                    print(f"📄 Found {code} on page {i + 1}")
    print(f"✅ Found {len(form_pages)} form start pages.")
    return form_pages


def compute_ranges(form_pages, total_pages):
    """Compute start and end pages for each form based on next start."""
    sorted_forms = sorted(form_pages.items(), key=lambda kv: int(
        re.sub(r'\D', '', kv[0]) or 0))
    ranges = []
    for i, (form, start) in enumerate(sorted_forms):
        start_page = start + OFFSET
        if i < len(sorted_forms) - 1:
            next_start = sorted_forms[i + 1][1] + OFFSET
            end_page = next_start - 1
        else:
            end_page = total_pages + OFFSET
        if end_page < start_page:
            end_page = start_page
        ranges.append((form, start_page, end_page))
    return ranges


def compute_ranges_from_index(forms, total_pages):
    """Compute start and end pages for each form from index, inferring end_page as next form's start_page-1."""
    # Remove duplicates, keep first occurrence
    seen = set()
    unique_forms = []
    for code, start, end in forms:
        if code not in seen:
            unique_forms.append((code, start, end))
            seen.add(code)
    # Sort by start page
    unique_forms.sort(key=lambda x: x[1])
    ranges = []
    for i, (code, start, end) in enumerate(unique_forms):
        if end is not None:
            ranges.append((code, start, end))
        else:
            # Infer end_page as next form's start_page-1
            if i < len(unique_forms) - 1:
                next_start = unique_forms[i+1][1]
                inferred_end = max(start, next_start - 1)
            else:
                inferred_end = total_pages
            ranges.append((code, start, inferred_end))
    return ranges


def build_metadata(ranges, pdf_name):
    """Build final JSON metadata with split details."""
    split_files = []
    for form_code, start, end in ranges:
        filename = f"{form_code}_{start}_{end}.pdf"
        path = OUTPUT_FOLDER / filename
        split_files.append({
            "filename": filename,
            "path": str(path).replace("/", "\\"),
            "form_name": form_code,
            "form_code": form_code,
            "serial_no": "",
            "start_page": start,
            "end_page": end,
            "original_form_no": form_code
        })
    metadata = {
        "company_name": COMPANY_NAME,
        "original_filename": pdf_name,
        "original_path": f"uploads\\{COMPANY_NAME}\\{pdf_name}",
        "splits_folder": str(OUTPUT_FOLDER).replace("/", "\\"),
        "total_splits": len(split_files),
        "split_files": split_files
    }
    return metadata


def split_pdf(pdf_reader, ranges):
    """Actually split the PDF pages."""
    print("✂️ Splitting PDF...")
    for form_code, start, end in ranges:
        writer = PdfWriter()
        for p in range(start - 1, min(end, len(pdf_reader.pages))):
            writer.add_page(pdf_reader.pages[p])
        filename = f"{form_code}_{start}_{end}.pdf"
        out_path = OUTPUT_FOLDER / filename
        with open(out_path, "wb") as f:
            writer.write(f)
    print("✅ Splitting complete!")


# ==============================
# MAIN
# ==============================
def main():
    pdf_reader = PdfReader(PDF_PATH)
    total_pages = len(pdf_reader.pages)
    print(f"📘 Loaded PDF with {total_pages} pages")

    forms_with_pages = extract_index_forms_with_pages(
        pdf_reader, index_page_num=1)
    if forms_with_pages:
        ranges = compute_ranges_from_index(forms_with_pages, total_pages)
    else:
        # fallback: use text search
        forms = extract_index_forms(pdf_reader, index_page_num=1)
        form_pages = find_form_pages(pdf_reader, forms)
        # assign each form a single page
        ranges = [(code, page, page) for code, page in form_pages.items()]

    metadata = build_metadata(ranges, Path(PDF_PATH).name)
    split_pdf(pdf_reader, ranges)

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    print(f"📄 Metadata written to {OUTPUT_JSON.resolve()}")


if __name__ == "__main__":
    main()
