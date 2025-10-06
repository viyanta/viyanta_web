from PyPDF2 import PdfReader
import re
import json
import os
import sys
import argparse
from pathlib import Path
from PyPDF2 import PdfReader, PdfWriter

INPUT_PDF = r"../pdfs_selected_company/icici/ICICI Prudential Life  C FY2023 9M.pdf"
OUTPUT_DIR = "icici_test_pdf_splits_auto"


# --- Step 1: Extract index entries ---


def extract_index_entries(pdf_path):
    reader = PdfReader(str(pdf_path))
    index_text = ""
    for i in range(min(3, len(reader.pages))):  # Index usually in first 3 pages
        text = reader.pages[i].extract_text() or ""
        index_text += text + "\n"

    entries = []
    debug_lines = []

    for line in index_text.splitlines():
        raw = line.strip()
        if not raw:
            continue

        # Serial no. like "1." or "(1)"
        serial_match = re.match(r"^\(?(\d{1,3})[.)]?\s+", raw)
        if not serial_match:
            continue
        serial_no = serial_match.group(1)

        # Match L-* (with support for multiple L-* separated by , or & or "and")
        form_match = re.search(
            r"(L[-_]\d+[A-Za-z0-9\-\s_]*(?:\s*(?:,|&|and)\s*L[-_]\d+[A-Za-z0-9\-\s_]*)*)",
            raw, flags=re.IGNORECASE
        )
        if not form_match:
            continue

        # Keep combined forms as single entry (don’t split them)
        form_no = re.sub(r"\s+", " ", form_match.group(1)).strip()

        # Try to find page numbers
        page_match = (
            re.search(r"\.{2,}\s*(\d{1,4})(?:[-–](\d{1,4}))?\s*$", raw)
            or re.search(r"\(\s*(\d{1,4})(?:[-–](\d{1,4}))?\)", raw)
            or re.search(r"\b(\d{1,4})(?:[-–](\d{1,4}))?\b", raw[form_match.end():].strip())
            or re.search(r"\s+(\d{1,4})(?:[-–](\d{1,4}))?\s*$", raw)
        )

        entry = {"serial_no": serial_no, "form_no": form_no}
        if page_match:
            start = int(page_match.group(1))
            end = int(page_match.group(2)) if page_match.group(2) else start
            if 1 <= start <= 2000 and start <= end <= 2000:
                entry["start_page"] = start
                entry["end_page"] = end

        entries.append(entry)
        debug_lines.append(f"Parsed: {raw[:100]}... -> {entry}")

    if entries:
        print("\n🔍 Sample parsed index lines (first 5):")
        for line in debug_lines[:5]:
            print("   ", line)
        print()

    return entries

# --- Step 2: Content-based detection ---


def detect_form_starts(pdf_path, form_list):
    reader = PdfReader(str(pdf_path))
    form_ranges = []
    form_idx = 0
    current_form = None
    start_page = None

    form_re = re.compile(r"(L[-_]\d+[A-Za-z0-9\-_\s]*)", flags=re.IGNORECASE)

    for page_num, page in enumerate(reader.pages, 1):
        if form_idx >= len(form_list):
            break

        text = page.extract_text() or ""
        first_lines = "\n".join(text.splitlines()[:8])
        match = form_re.search(first_lines)

        if match:
            detected = re.sub(r"\s+", " ", match.group(1)).strip().upper()
            expected_form = form_list[form_idx]["form_no"].upper()

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

    # close the last form → goes till end of PDF
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
    ranges = []

    entries_with_pages = [e for e in index_entries if "start_page" in e]
    page_coverage = len(entries_with_pages) / \
        len(index_entries) if index_entries else 0

    if page_coverage >= 0.7:
        ranges = entries_with_pages
        offset = 0
        for e in ranges:
            if e["form_no"].upper().startswith("L-1") and e["start_page"] == 1:
                offset = 2
                break
        if offset:
            for e in ranges:
                e["start_page"] += offset
                e["end_page"] += offset
        print(
            f"✅ Using index page numbers ({len(entries_with_pages)}/{len(index_entries)} entries, {page_coverage:.1%} coverage) with offset = {offset}")
    else:
        print(
            f"⚡ Low page coverage in index ({len(entries_with_pages)}/{len(index_entries)} entries, {page_coverage:.1%}), scanning PDF...")
        ranges = detect_form_starts(pdf_path, index_entries)

    if ranges:
        ranges.sort(key=lambda x: x.get("start_page", 0))

    reader = PdfReader(str(pdf_path))
    output_files = []

    for entry in ranges:
        if "start_page" not in entry or "end_page" not in entry:
            continue

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

    json_path = output_dir / "ranges.json"
    with open(json_path, "w", encoding="utf-8") as jf:
        json.dump(ranges, jf, indent=2)

    return output_files, ranges


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Split PDF by index or content scan")
    parser.add_argument("pdf", nargs="?", help="Path to specific PDF")
    parser.add_argument(
        "--output", "-o", help="Output directory", default=OUTPUT_DIR)
    args = parser.parse_args()

    pdf_path = args.pdf or INPUT_PDF
    print("Looking for:", os.path.abspath(pdf_path))
    exists = os.path.exists(pdf_path)
    print("Exists:", exists)

    if not exists:
        print("❌ File not found.")
        sys.exit(1)

    files, ranges = split_pdf(pdf_path, output_dir=args.output)

    print("\nDetected Ranges:")
    for r in ranges:
        print(r)

    print("\n📂 Output Files:")
    for f in files:
        print("  ", f)
