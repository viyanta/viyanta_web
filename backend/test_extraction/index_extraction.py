import re
from pathlib import Path
from PyPDF2 import PdfReader, PdfWriter


def extract_index_entries(pdf_path):
    """
    Try to extract index entries from first 2–3 pages.
    Return list with optional page ranges.
    """
    reader = PdfReader(str(pdf_path))
    index_text = ""

    for i in range(min(3, len(reader.pages))):
        text = reader.pages[i].extract_text()
        if text:
            index_text += text + "\n"

    # Pattern with page ranges
    pattern_with_pages = re.compile(
        r"(\d+)\s+(L-[\w-]+.*?)\s+(\d+)(?:\s*-\s*(\d+))?")
    # Pattern without page ranges (just form + description)
    pattern_no_pages = re.compile(
        r"(\d+)\s+(L-\d+[A-Z\-]*)(.*?)($|\n)", re.MULTILINE)

    entries = []

    # Try with page numbers first
    for match in pattern_with_pages.finditer(index_text):
        serial = match.group(1)
        form_no = match.group(2).strip()
        start = int(match.group(3))
        end = int(match.group(4)) if match.group(4) else start
        entries.append({
            "serial_no": serial,
            "form_no": form_no,
            "start_page": start,
            "end_page": end
        })

    # If no ranges found → fallback to form-only index
    if not entries:
        for match in pattern_no_pages.finditer(index_text):
            serial = match.group(1).strip()
            form_no = match.group(2).strip()
            desc = match.group(3).strip()
            entries.append({
                "serial_no": serial,
                "form_no": form_no,
                "description": desc
            })

    return entries


def detect_form_page_ranges(pdf_path):
    """
    Detect start and end pages by scanning the text of each page.
    Merge consecutive pages with the same FORM L-*.
    """
    reader = PdfReader(str(pdf_path))
    form_ranges = []

    current_form = None
    start_page = None

    for page_num, page in enumerate(reader.pages, 1):
        text = page.extract_text() or ""
        first_lines = "\n".join(text.splitlines()[:4])  # check first 4 lines
        match = re.search(
            r"FORM\s+(L-\d+[A-Z\-]*)", first_lines, re.IGNORECASE)

        if match:
            new_form = match.group(1)

            if current_form and new_form != current_form:
                # close previous form
                form_ranges.append({
                    "form_no": current_form,
                    "start_page": start_page,
                    "end_page": page_num - 1
                })
                start_page = page_num

            if not current_form:
                start_page = page_num

            current_form = new_form

    # close last form
    if current_form:
        form_ranges.append({
            "form_no": current_form,
            "start_page": start_page,
            "end_page": len(reader.pages)
        })

    return form_ranges


def split_pdf(pdf_path, output_dir="pdf_splits_auto"):
    """
    1. Try extracting index with page ranges.
    2. If missing → detect by scanning PDF.
    3. Split PDF accordingly.
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(exist_ok=True)

    index_entries = extract_index_entries(pdf_path)

    # Case 1: index had page numbers
    if index_entries and "start_page" in index_entries[0]:
        ranges = index_entries
    else:
        # Case 2: no ranges → scan PDF
        ranges = detect_form_page_ranges(pdf_path)

    reader = PdfReader(str(pdf_path))
    output_files = []

    for entry in ranges:
        writer = PdfWriter()
        for page_num in range(entry["start_page"] - 1, entry["end_page"]):
            writer.add_page(reader.pages[page_num])

        safe_name = re.sub(r"[^\w\d-]+", "_", entry["form_no"])
        filename = f"{entry['form_no']}_{entry['start_page']}_{entry['end_page']}.pdf"
        filepath = output_dir / filename

        with open(filepath, "wb") as f:
            writer.write(f)

        output_files.append(filepath)

    return output_files, ranges


# -----------------
# Example usage
# -----------------
if __name__ == "__main__":
    input_pdf = "pdfs_selected_company/icici/ICICI Prudential Life  C FY2023 9M.pdf"

    files, ranges = split_pdf(input_pdf)

    print("Detected Ranges:")
    for r in ranges:
        print(r)

    print("\nPDFs created:")
    for f in files:
        print(f)
