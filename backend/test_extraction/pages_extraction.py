import re
import json
import os
import sys
import argparse
import glob
from pathlib import Path
from PyPDF2 import PdfReader, PdfWriter

INPUT_PDF = r"../pdfs_selected_company/hdfc/HDFC Life  S FY2023 9M.pdf"
OUTPUT_DIR = "pdf_splits_auto"


# --- Step 1: Extract index entries ---
def extract_index_entries(pdf_path):
    """
    Extract index entries from first 3 pages.
    Enhanced parsing strategy:
      - Look for serial numbers at start (1, 2, 3, etc.)
      - Find L-form codes anywhere in line
      - Detect page numbers/ranges with multiple patterns:
        * At end after dotted leaders: "L-1 Revenue Account ........ 1-4"
        * At end with spaces: "L-1 Revenue Account 1-4"
        * Embedded after description: "L-1 Revenue Account 1-4 Additional text"
        * In parentheses: "L-1 Revenue Account (1-4)"
    """
    reader = PdfReader(str(pdf_path))
    index_text = ""
    for i in range(min(3, len(reader.pages))):
        text = reader.pages[i].extract_text() or ""
        index_text += text + "\n"

    entries = []
    debug_lines = []

    for line in index_text.splitlines():
        raw = line.strip()
        if not raw:
            continue

        # Look for serial number at start (1, 2, 3, etc.)
        serial_match = re.match(r"^\(?(\d{1,3})[.)]?\s+", raw)
        if not serial_match:
            continue  # Skip lines without serial numbers

        serial_no = serial_match.group(1)

        # Find L-form code anywhere in the line
        form_match = re.search(
            r"(L[-_\*]?\d+[A-Za-z0-9\-\_\*\s\/&\(\)\.]{0,60})", raw, flags=re.IGNORECASE)
        if not form_match:
            continue  # Skip lines without L-form codes

        form_no = re.sub(r"\s+", " ", form_match.group(1)).strip()

        # Multiple strategies to find page numbers:
        page_match = None

        # Strategy 1: Dotted leaders pattern "........ 1-4"
        page_match = re.search(
            r"\.{2,}\s*(\d{1,4})(?:\s*[-–]\s*(\d{1,4}))?\s*$", raw)

        if not page_match:
            # Strategy 2: Page numbers in parentheses "(1-4)"
            page_match = re.search(
                r"\(\s*(\d{1,4})(?:\s*[-–]\s*(\d{1,4}))?\s*\)", raw)

        if not page_match:
            # Strategy 3: Page numbers after form description, before additional text
            # Look for pattern: "L-1 Description 1-4 more text" or "L-1 Description 1-4"
            # Extract everything after the L-form, then find page numbers
            form_end = form_match.end()
            remaining = raw[form_end:].strip()
            page_match = re.search(
                r"\b(\d{1,4})(?:\s*[-–]\s*(\d{1,4}))?\b", remaining)

        if not page_match:
            # Strategy 4: Simple page number at end of line
            page_match = re.search(
                r"\s+(\d{1,4})(?:\s*[-–]\s*(\d{1,4}))?\s*$", raw)

        entry = {
            "serial_no": serial_no,
            "form_no": form_no
        }

        if page_match:
            start = int(page_match.group(1))
            end = int(page_match.group(2)) if page_match.group(2) else start
            # Sanity check: page numbers should be reasonable (1-1000)
            if 1 <= start <= 1000 and start <= end <= 1000:
                entry["start_page"] = start
                entry["end_page"] = end

        entries.append(entry)
        debug_lines.append(f"Parsed: {raw[:100]}... -> {entry}")

    # Debug: print first few parsed lines to understand the format
    if entries:
        print(f"\n🔍 Sample parsed index lines (first 5):")
        for line in debug_lines[:5]:
            print(f"   {line}")
        print()

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
    ranges = []

    # Case A: Index has page ranges
    entries_with_pages = [e for e in index_entries if "start_page" in e]
    page_coverage = len(entries_with_pages) / \
        len(index_entries) if index_entries else 0

    if page_coverage >= 0.7:  # Use index if 70%+ of entries have page numbers
        ranges = entries_with_pages  # Only use entries that have page numbers

        # Check offset rule (only if L-1 starts at 1)
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

    # Case B: Low page coverage → scan PDF content
    else:
        print(
            f"⚡ Low page coverage in index ({len(entries_with_pages)}/{len(index_entries)} entries, {page_coverage:.1%}), scanning PDF...")
        ranges = detect_form_starts(pdf_path, index_entries)

    # Post-process ranges: sort by page number but keep individual entries
    if ranges:
        ranges.sort(key=lambda x: x.get("start_page", 0))

    # --- Write PDFs ---
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

    # Save JSON mapping
    json_path = output_dir / "ranges.json"
    with open(json_path, "w", encoding="utf-8") as jf:
        json.dump(ranges, jf, indent=2)

    return output_files, ranges


def test_all_pdfs():
    """Test index extraction on all PDFs in pdfs_selected_company"""
    pdf_dir = Path("../pdfs_selected_company")
    if not pdf_dir.exists():
        pdf_dir = Path("backend/pdfs_selected_company")

    if not pdf_dir.exists():
        print("❌ Could not find pdfs_selected_company directory")
        return

    # Find all PDFs
    pdfs = list(pdf_dir.glob("**/*.pdf"))

    print(f"Found {len(pdfs)} PDFs to test:\n")

    results = []

    for pdf_path in pdfs:
        try:
            print(f"📄 Testing: {pdf_path.name}")
            print(f"   Company: {pdf_path.parent.name}")

            reader = PdfReader(str(pdf_path))
            total_pages = len(reader.pages)

            index_entries = extract_index_entries(pdf_path)
            entries_with_pages = [
                e for e in index_entries if "start_page" in e]
            page_coverage = len(entries_with_pages) / \
                len(index_entries) if index_entries else 0
            has_page_numbers = page_coverage >= 0.7  # Same 70% threshold as split_pdf

            method = "INDEX" if has_page_numbers else "CONTENT_SCAN"

            print(f"   Pages: {total_pages}")
            print(f"   Index entries: {len(index_entries)}")
            print(f"   Entries with pages: {len(entries_with_pages)}")
            print(f"   Page coverage: {page_coverage:.1%}")
            print(f"   Method: {method}")

            if has_page_numbers:
                # Calculate coverage using the entries that have page numbers
                covered_pages = set()
                offset = 2 if any(e.get("form_no", "").upper().startswith(
                    "L-1") and e.get("start_page") == 1 for e in entries_with_pages) else 0
                for e in entries_with_pages:
                    start = e["start_page"] + offset
                    end = e["end_page"] + offset
                    covered_pages.update(range(start, end + 1))
                coverage = len(covered_pages) / total_pages * 100
                print(f"   PDF coverage: {coverage:.1f}%")

            results.append({
                "file": str(pdf_path),
                "company": pdf_path.parent.name,
                "total_pages": total_pages,
                "index_entries": len(index_entries),
                "has_page_numbers": has_page_numbers,
                "method": method
            })

            print("   ✅ OK\n")

        except Exception as e:
            print(f"   ❌ Error: {e}\n")
            results.append({
                "file": str(pdf_path),
                "company": pdf_path.parent.name,
                "error": str(e)
            })

    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)

    index_count = sum(1 for r in results if r.get("has_page_numbers"))
    content_count = sum(1 for r in results if not r.get(
        "has_page_numbers") and "error" not in r)
    error_count = sum(1 for r in results if "error" in r)

    print(f"📊 Index-based extraction: {index_count} PDFs")
    print(f"🔍 Content-based extraction: {content_count} PDFs")
    print(f"❌ Errors: {error_count} PDFs")

    if index_count > 0:
        print("\n✅ PDFs with page numbers in index:")
        for r in results:
            if r.get("has_page_numbers"):
                print(f"   • {r['company']}: {r['file'].split('/')[-1]}")

    if content_count > 0:
        print("\n⚡ PDFs requiring content scan:")
        for r in results:
            if not r.get("has_page_numbers") and "error" not in r:
                print(f"   • {r['company']}: {r['file'].split('/')[-1]}")

    if error_count > 0:
        print("\n❌ PDFs with errors:")
        for r in results:
            if "error" in r:
                print(
                    f"   • {r['company']}: {r['file'].split('/')[-1]} - {r['error']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Test PDF index extraction and splitting")
    parser.add_argument(
        "pdf", nargs="?", help="Path to specific PDF (or --test-all for all PDFs)")
    parser.add_argument("--test-all", action="store_true",
                        help="Test all PDFs in pdfs_selected_company")
    parser.add_argument(
        "--output", "-o", help="Output directory", default=OUTPUT_DIR)
    args = parser.parse_args()

    if args.test_all:
        test_all_pdfs()
        sys.exit(0)

    pdf_path = args.pdf or INPUT_PDF

    print("Looking for:", os.path.abspath(pdf_path))
    exists = os.path.exists(pdf_path)
    print("Exists:", exists)

    if not exists:
        # try a workspace-level search for similarly named files to help user
        print("\nFile not found. Searching for similar filenames under project root...\n")
        root = Path.cwd()
        found = []
        for dirpath, dirnames, filenames in os.walk(root):
            for fn in filenames:
                if fn.lower().endswith('.pdf'):
                    found.append(os.path.join(dirpath, fn))
        if found:
            print("Available PDFs:")
            for f in found[:20]:
                print(" -", f)
        else:
            print("No PDF files found under:", root)
        print("\nUsage:")
        print("  python index_extraction.py 'C:/path/to/file.pdf'  # Test specific PDF")
        print("  python index_extraction.py --test-all             # Test all PDFs")
        sys.exit(1)

    # run splitting (this will write files)
    files, ranges = split_pdf(pdf_path, output_dir=args.output)

    # Open reader to report coverage
    reader = PdfReader(str(pdf_path))
    total_pages = len(reader.pages)

    print("\nTotal pages in PDF:", total_pages)

    print("\nDetected Ranges:")
    for r in ranges:
        print(r)

    # compute covered pages
    covered = set()
    for r in ranges:
        sp = r.get("start_page")
        ep = r.get("end_page")
        if sp is None or ep is None:
            continue
        covered.update(range(sp, ep + 1))

    uncovered = [p for p in range(1, total_pages + 1) if p not in covered]
    if uncovered:
        # summarize uncovered as ranges
        def summarize(nums):
            if not nums:
                return ""
            ranges_out = []
            start = prev = nums[0]
            for n in nums[1:]:
                if n == prev + 1:
                    prev = n
                    continue
                ranges_out.append((start, prev))
                start = prev = n
            ranges_out.append((start, prev))
            return ", ".join(f"{a}" if a == b else f"{a}-{b}" for a, b in ranges_out)

        print("\n⚠️  Uncovered pages:", summarize(uncovered))
        print(
            f"   Coverage: {len(covered)}/{total_pages} pages ({len(covered)/total_pages*100:.1f}%)")
    else:
        print("\n✅ All pages covered by detected ranges.")

    print(f"\n📁 PDFs created: {len(files)}")
    for f in files:
        print("  ", f)
