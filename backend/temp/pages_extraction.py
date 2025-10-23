# extraction.py
import re
import json
import os
from pathlib import Path
from PyPDF2 import PdfReader, PdfWriter

# --- CONFIG ---
INPUT_PDF = r"../pdfs_selected_company/sbi/SBI Life  S FY2023 9M.pdf"
OUTPUT_DIR = "pdf_splits_auto"
INDEX_PAGES_TO_SCAN = 4
VALID_INDEX_MIN_RATIO = 0.6  # require 60% of index entries to validate
# --------------


def extract_index_entries(pdf_path, index_pages=INDEX_PAGES_TO_SCAN):
    """
    Try to extract index entries from the first few pages.
    Returns list of dicts. If start/end pages were parsed they are included.
    """
    reader = PdfReader(str(pdf_path))
    index_text = ""
    for i in range(min(index_pages, len(reader.pages))):
        t = reader.pages[i].extract_text() or ""
        index_text += t + "\n"

    # Try to capture "serial" "form_no + description" "start" [ - end ]
    pattern_with_pages = re.compile(
        r"(\d+)\s+((?:L[-\w\d&\s\(\)\/\,]+?))\s+(\d{1,4})(?:\s*-\s*(\d{1,4}))?",
        flags=re.IGNORECASE | re.MULTILINE,
    )

    entries = []
    for m in pattern_with_pages.finditer(index_text):
        serial = m.group(1).strip()
        form_no = m.group(2).strip()
        start = int(m.group(3))
        end = int(m.group(4)) if m.group(4) else start
        entries.append({
            "serial_no": serial,
            "form_no": form_no,
            "start_page": start,
            "end_page": end
        })

    # If nothing with pages found, try to at least capture list of forms without pages
    if not entries:
        pattern_no_pages = re.compile(
            r"(\d+)\s+((?:L[-\w\d&\s\(\)\/\,]+?))($|\n)", flags=re.IGNORECASE | re.MULTILINE)
        for m in pattern_no_pages.finditer(index_text):
            serial = m.group(1).strip()
            form_no = m.group(2).strip()
            entries.append({
                "serial_no": serial,
                "form_no": form_no
            })

    return entries


def detect_form_page_ranges_merged(pdf_path):
    """
    Scan every page. Look at the first ~4 lines for 'FORM L-*' markers.
    Merge consecutive pages that belong to the same form.
    """
    reader = PdfReader(str(pdf_path))
    form_ranges = []
    current_form = None
    start_page = None

    # regex to match "FORM L-..." (be permissive)
    form_re = re.compile(
        r"FORM\s+(L[-\dA-Za-z\&\s\(\)\.\/\-]+)", flags=re.IGNORECASE)

    for page_num, page in enumerate(reader.pages, 1):
        text = page.extract_text() or ""
        first_lines = "\n".join(text.splitlines()[:4])
        m = form_re.search(first_lines)
        if m:
            # normalize (collapse spaces, uppercase)
            new_form = re.sub(r"\s+", " ", m.group(1)).strip().upper()

            if current_form and new_form != current_form:
                # close previous
                form_ranges.append({
                    "form_no": current_form,
                    "start_page": start_page,
                    "end_page": page_num - 1
                })
                start_page = page_num

            if not current_form:
                start_page = page_num

            current_form = new_form

    if current_form:
        form_ranges.append({
            "form_no": current_form,
            "start_page": start_page,
            "end_page": len(reader.pages)
        })

    return form_ranges


def _page_contains_form(reader, page_num, form_code):
    """Return True if the page (or nearby pages) contains the form_code / L-xx marker."""
    n = len(reader.pages)
    search_re = re.compile(re.escape(form_code), flags=re.IGNORECASE)
    # check page, page-1, page+1 (if exist)
    candidates = [page_num]
    if page_num - 1 >= 1:
        candidates.append(page_num - 1)
    if page_num + 1 <= n:
        candidates.append(page_num + 1)
    for p in candidates:
        text = reader.pages[p - 1].extract_text() or ""
        # look in first ~8 lines for header
        if search_re.search("\n".join(text.splitlines()[:8])):
            return True
    return False


def validate_index_entries(entries, pdf_path):
    """
    Validate that the index-derived ranges look real:
    - start/end pages must be within pdf range
    - the form code (L-xxx) should appear on the start page (or ±1)
    If majority of entries validate, return True (use index). Else False (fallback).
    """
    if not entries or "start_page" not in entries[0]:
        return False

    reader = PdfReader(str(pdf_path))
    n_pages = len(reader.pages)
    valid_count = 0
    total = 0

    for e in entries:
        total += 1
        start = e.get("start_page")
        end = e.get("end_page", start)
        # basic sanity
        if not (1 <= start <= n_pages and 1 <= end <= n_pages and start <= end):
            continue

        # try to extract L-code like "L-12" or "L-9 & L9A" from form text
        m = re.search(r"(L[-\dA-Za-z\&\s\(\)\/\-]+)",
                      e.get("form_no", ""), flags=re.IGNORECASE)
        form_code = (m.group(1).strip().upper()
                     if m else e.get("form_no", "").strip().upper())

        # pick a short key to search: prefer "L-" followed by digits
        m2 = re.search(r"(L-\d+)", form_code, flags=re.IGNORECASE)
        search_key = m2.group(1) if m2 else form_code.split()[
            0] if form_code else ""

        if not search_key:
            continue

        if _page_contains_form(reader, start, search_key):
            valid_count += 1

    # need at least some entries and a good ratio
    if total == 0:
        return False

    ratio = valid_count / total
    # require minimum ratio and at least 3 validated entries for reliability
    return (ratio >= VALID_INDEX_MIN_RATIO) and (total >= 3)


def split_pdf(pdf_path, output_dir=OUTPUT_DIR):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1) try index
    index_entries = extract_index_entries(pdf_path)

    use_index = validate_index_entries(index_entries, pdf_path)
    if use_index:
        print("Using page ranges from index (validated).")
        ranges = []
        # normalize entries to our (form_no, start_page, end_page) format
        for e in index_entries:
            ranges.append({
                "form_no": re.sub(r"\s+", " ", e["form_no"]).strip(),
                "start_page": int(e["start_page"]),
                "end_page": int(e.get("end_page", e["start_page"]))
            })
    else:
        print("Index ranges not reliable — falling back to full-document scan.")
        ranges = detect_form_page_ranges_merged(pdf_path)

    # If ranges empty, nothing to split
    if not ranges:
        print("No form markers found. Nothing to split.")
        return [], []

    # Write splits
    reader = PdfReader(str(pdf_path))
    output_files = []
    for entry in ranges:
        # sanitize filename
        safe_name = re.sub(r"[^\w\d\-_]+", "_", entry["form_no"])[:80]
        filename = f"{safe_name}_{entry['start_page']}_{entry['end_page']}.pdf"
        outpath = output_dir / filename

        writer = PdfWriter()
        for p in range(entry["start_page"] - 1, entry["end_page"]):
            writer.add_page(reader.pages[p])

        with open(outpath, "wb") as f:
            writer.write(f)
        output_files.append(str(outpath))

    # save ranges as JSON next to splits
    json_path = output_dir / "ranges.json"
    with open(json_path, "w", encoding="utf-8") as jf:
        json.dump(ranges, jf, indent=2)

    print(
        f"Created {len(output_files)} pdf(s) in {output_dir}. JSON saved to {json_path}")
    return output_files, ranges


if __name__ == "__main__":
    # resolve & print debugging info
    input_pdf = INPUT_PDF
    print("Looking for:", os.path.abspath(input_pdf))
    print("Exists:", os.path.exists(input_pdf))
    files, ranges = split_pdf(input_pdf)
    print("\nDetected Ranges:")
    for r in ranges:
        print(r)
    print("\nPDFs created:")
    for f in files:
        print(f)
