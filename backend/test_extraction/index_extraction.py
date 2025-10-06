import re
import json
import os
from pathlib import Path
from PyPDF2 import PdfReader, PdfWriter

INPUT_PDF = r"../pdfs_selected_company/shriram life/Shriram Life S FY2023 9M.pdf"
OUTPUT_DIR = "pdf_splits_auto"


# --- Step 1: Extract index entries ---
def extract_index_entries(pdf_path):
    """
    Extract index entries from first 3 pages.
    Handles various index formats robustly.
    Returns list of dicts: may contain start_page/end_page if present
    """
    reader = PdfReader(str(pdf_path))
    index_text = ""
    for i in range(min(3, len(reader.pages))):
        text = reader.pages[i].extract_text() or ""
        index_text += text + "\n"

    entries = []
    for line in index_text.splitlines():
        line = line.strip()
        if not line:
            continue
        # Debug: print each line being processed
        print(f"Index line: {line}")
        # Updated regex to match L-* patterns: L-*, L-1-*, L-1A-*, L_*, L_1*
        m = re.match(
            r"^(\d+)\s+((?:L[-_][0-9A-Z]+(?:-[0-9A-Z]+)?))"  # serial, form
            r"(?:\s+[A-Za-z0-9&\-\(\)/\s]+?)?"  # description (optional)
            r"\s+(\d+)(?:\s*-\s*(\d+))?$",  # start_page, end_page (optional)
            line,
            flags=re.IGNORECASE,
        )
        if m:
            serial = m.group(1).strip()
            form = re.sub(r"\s+", " ", m.group(2)).strip()
            start = int(m.group(3))
            end = int(m.group(4)) if m.group(4) else start
            entries.append({
                "serial_no": serial,
                "form_no": form,
                "start_page": start,
                "end_page": end
            })
            print(
                f"Matched with page numbers: {serial}, {form}, {start}-{end}")
            continue
        # Try to match without page numbers
        m2 = re.match(
            r"^(\d+)\s+((?:L[-_][0-9A-Z]+(?:-[0-9A-Z]+)?))",
            line,
            flags=re.IGNORECASE
        )
        if m2:
            serial = m2.group(1).strip()
            form = re.sub(r"\s+", " ", m2.group(2)).strip()
            entries.append({
                "serial_no": serial,
                "form_no": form
            })
            print(f"Matched without page numbers: {serial}, {form}")
            continue
        # Fallback: match any L-* pattern
        m3 = re.search(r"(L[-_][0-9A-Z]+(?:-[0-9A-Z]+)?)",
                       line, flags=re.IGNORECASE)
        if m3:
            form = re.sub(r"\s+", " ", m3.group(1)).strip()
            entries.append({
                "form_no": form})
            print(f"Fallback match: {form}")
    print(f"Total index entries extracted: {len(entries)}")
    return entries


# --- Step 2: Content-based detection ---
def detect_form_starts(pdf_path, form_list):
    """
    Scan the PDF for actual L-* form markers.
    Match against forms listed in the index (order matters).
    """
    reader = PdfReader(str(pdf_path))
    form_ranges = []
    form_idx = 0
    current_form = None
    start_page = None

    # Regex to detect any L-* variant
    form_re = re.compile(
        r"(L[-_\*]?\d+[A-Za-z0-9\-\_\*\s]*)", flags=re.IGNORECASE)

    for page_num, page in enumerate(reader.pages, 1):
        if form_idx >= len(form_list):
            break

        text = page.extract_text() or ""
        first_lines = "\n".join(text.splitlines()[:8])  # scan first 8 lines
        match = form_re.search(first_lines)

        if match:
            detected = re.sub(r"\s+", " ", match.group(1)).strip().upper()
            expected_form = form_list[form_idx]["form_no"].upper()

            # relaxed match: just check prefix
            if expected_form.startswith(detected.split()[0][:3]):
                if current_form:
                    form_ranges.append({
                        "form_no": current_form,
                        "start_page": start_page,
                        "end_page": page_num - 1
                    })
                current_form = expected_form
                start_page = page_num
                form_idx += 1

    # close the last form
    if current_form:
        form_ranges.append({
            "form_no": current_form,
            "start_page": start_page,
            "end_page": len(reader.pages)
        })

    return form_ranges


# --- Step 3: Split PDF ---
def split_pdf(pdf_path, output_dir=OUTPUT_DIR):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    index_entries = extract_index_entries(pdf_path)
    # Separate entries with and without page numbers
    entries_with_pages = [
        e for e in index_entries if "start_page" in e and "end_page" in e]
    entries_without_pages = [e for e in index_entries if not (
        "start_page" in e and "end_page" in e)]
    ranges = []

    # Case A: Index has page ranges
    if entries_with_pages:
        # Offset logic as before
        offset = 1
        for e in entries_with_pages:
            if e["form_no"].upper().startswith("L-1") and e["start_page"] == 1:
                offset = 2
                break
        if offset:
            for e in entries_with_pages:
                e["start_page"] += offset
                e["end_page"] += offset
        print("✅ Using index page numbers with offset =", offset)
        ranges.extend(entries_with_pages)

    # For entries without page numbers, use content-based detection
    if entries_without_pages:
        print("⚡ Scanning PDF for forms without page numbers...")
        detected_ranges = detect_form_starts(pdf_path, entries_without_pages)
        ranges.extend(detected_ranges)

    # --- Write PDFs ---
    reader = PdfReader(str(pdf_path))
    output_files = []

    for entry in ranges:
        writer = PdfWriter()
        for p in range(entry["start_page"] - 1, entry["end_page"]):
            if p < len(reader.pages):
                writer.add_page(reader.pages[p])
        safe_name = re.sub(r"[^\w\d\-_]+", "_", entry["form_no"])[:80]
        filename = f"{safe_name}_{entry['start_page']}_{entry['end_page']}.pdf"
        outpath = output_dir / filename
        with open(outpath, "wb") as f:
            writer.write(f)
        output_files.append(str(outpath))

    # Save JSON mapping
    json_path = output_dir / "ranges.json"
    with open(json_path, "w", encoding="utf-8") as jf:
        json.dump(ranges, jf, indent=2)

    return output_files, ranges


if __name__ == "__main__":
    print("Looking for:", os.path.abspath(INPUT_PDF))
    print("Exists:", os.path.exists(INPUT_PDF))

    files, ranges = split_pdf(INPUT_PDF)

    print("\nDetected Ranges:")
    for r in ranges:
        print(r)

    print("\nPDFs created:")
    for f in files:
        print(f)
