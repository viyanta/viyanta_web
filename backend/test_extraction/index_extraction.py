import re
import json
import os
import statistics
from pathlib import Path
from typing import List, Dict, Optional
from PyPDF2 import PdfReader, PdfWriter

# --- CONFIG ---
INPUT_PDF = r"../pdfs_selected_company/shriram life/Shriram Life S FY2026 Q1.pdf"
OUTPUT_DIR = "shriram2_pdf_splits_auto"
# how many first pages to scan for the index (increase if index spans more)
INDEX_PAGES_TO_SCAN = 3
FIRST_LINES_TO_SCAN = 4     # how many top lines per page to check for form marker
MAX_OFFSET_THRESHOLD = 2    # if computed offset is > this, ignore it (safety)

# ---------------- helpers ----------------


def normalize_form_code(s: str) -> str:
    """Normalize form notation: L 14A, L-14 A, L_14 => L-14A (uppercase)."""
    s = s or ""
    s = s.upper()
    s = s.replace("_", "-").replace(" ", "-").replace("\u2013",
                                                      "-").replace("\u2014", "-")
    s = re.sub(r"-+", "-", s)                 # collapse multiple hyphens
    # ensure prefix L- for tokens like L14A -> L-14A
    if re.match(r"^L\d", s):
        s = "L-" + s[1:]
    # keep only letters, digits and hyphen
    s = re.sub(r"[^A-Z0-9\-]", "", s)
    return s


def read_index_text(pdf_path: Path, pages_to_scan: int) -> str:
    r = PdfReader(str(pdf_path))
    n = min(pages_to_scan, len(r.pages))
    text = ""
    for i in range(n):
        page_text = r.pages[i].extract_text() or ""
        text += page_text + "\n"
    return text


def stitch_lines(lines: List[str]) -> List[str]:
    """
    Heuristic: If a line contains a form token but no page numbers,
    and the following line contains only the page or range, join them.
    Also removes repeated empty lines and trims whitespace.
    """
    out = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        # detect possible form token
        has_form = re.search(r'\bL[\s\-_]?\d+[A-Za-z0-9\-]*\b', line, re.I)
        has_page = re.search(
            r'(\d{1,3}\s*(?:[-–—to]+\s*\d{1,3})?|\bpp\.\s*\d{1,3}\b)$', line)
        if has_form and not has_page and i + 1 < len(lines):
            nxt = lines[i + 1].strip()
            # next line is likely the page or range
            if re.match(r'^\d{1,3}\s*(?:[-–—to]+\s*\d{1,3})?$', nxt):
                # join and skip next
                combined = f"{line} {nxt}"
                out.append(combined)
                i += 2
                continue
            # or next line begins with dots and page numbers at its end
            if re.search(r'\.{2,}\s*\d', nxt):
                out.append(line + " " + nxt)
                i += 2
                continue
        out.append(line)
        i += 1
    return out

# ---------------- index parsing ----------------


def extract_index_entries(pdf_path: str, pages_to_scan: int = INDEX_PAGES_TO_SCAN) -> List[Dict]:
    """
    Return ordered list of index entries with possible start_page/end_page.
    Each entry: { serial_no?, original_form_no, form_code(normalized), description?, start_page?, end_page? }
    """
    pdf_path = Path(pdf_path)
    index_text = read_index_text(pdf_path, pages_to_scan)
    raw_lines = index_text.splitlines()
    # --- Improved stitching: join lines where form code and page number are split ---
    lines = []
    i = 0
    while i < len(raw_lines):
        line = raw_lines[i].strip()
        if not line:
            i += 1
            continue
        # If line has form code but no page number, and next line is just a number/range, join
        has_form = re.search(r'\bL[\s\-_]?\d+[A-Za-z0-9\-]*\b', line, re.I)
        has_page = re.search(
            r'(\d{1,3}\s*(?:[-–—to]+\s*\d{1,3})?|\bpp\.\s*\d{1,3}\b)$', line)
        if has_form and not has_page and i + 1 < len(raw_lines):
            nxt = raw_lines[i + 1].strip()
            if re.match(r'^\d{1,3}\s*(?:[-–—to]+\s*\d{1,3})?$', nxt):
                lines.append(f"{line} {nxt}")
                i += 2
                continue
            if re.search(r'\.{2,}\s*\d', nxt):
                lines.append(line + " " + nxt)
                i += 2
                continue
        lines.append(line)
        i += 1

    entries = []
    pattern_form = re.compile(r'([Ll][\s\-_]*\d+[A-Za-z0-9\-]*)', flags=re.I)
    for line in lines:
        if not line:
            continue
        m_form = pattern_form.search(line)
        if not m_form:
            continue
        raw_form = m_form.group(1).strip()
        norm = normalize_form_code(raw_form)
        # Find last number or range at end of line
        m_range = re.search(r'(\d{1,3})\s*[-–—to]+\s*(\d{1,3})\s*$', line)
        if m_range:
            start = int(m_range.group(1))
            end = int(m_range.group(2))
            desc = line[:m_range.start()].strip()
            entries.append({
                "serial_no": "",
                "original_form_no": raw_form,
                "form_code": norm,
                "description": desc,
                "start_page": start,
                "end_page": end
            })
            continue
        m_single = re.search(r'(\d{1,3})\s*$', line)
        if m_single:
            start = int(m_single.group(1))
            desc = line[:m_single.start()].strip()
            entries.append({
                "serial_no": "",
                "original_form_no": raw_form,
                "form_code": norm,
                "description": desc,
                "start_page": start,
                "end_page": start
            })
            continue
        # fallback: just form code and description
        entries.append({
            "serial_no": "",
            "original_form_no": raw_form,
            "form_code": norm,
            "description": line
        })
    # deduplicate while preserving order (keep first appearance)
    seen = set()
    final = []
    for e in entries:
        key = e["form_code"]
        if key in seen:
            for prev in final:
                if prev["form_code"] == key:
                    for k in ("serial_no", "original_form_no", "description", "start_page", "end_page"):
                        if k not in prev or not prev.get(k):
                            if e.get(k):
                                prev[k] = e[k]
                    break
            continue
        seen.add(key)
        final.append(e)
    return final

# ---------------- content detection ----------------


def scan_pdf_for_forms(pdf_path: str, expected_forms: List[Dict]) -> Dict[str, int]:
    """
    Scans the whole PDF and returns the first-detected page number for each normalized form_code found.
    Only returns forms that were actually found in text (not everything in expected_forms).
    """
    expected_norms = {e["form_code"] for e in expected_forms}
    reader = PdfReader(str(pdf_path))
    found = {}
    # regex to find L-like tokens in text
    token_re = re.compile(r'\bL[\s\-_]?\d+[A-Za-z0-9]*\b', re.I)
    for page_num, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        # check only first N lines to avoid false positives lower in page (configurable)
        first_lines = "\n".join(text.splitlines()[:FIRST_LINES_TO_SCAN])
        for m in token_re.finditer(first_lines):
            token = normalize_form_code(m.group(0))
            if token in expected_norms and token not in found:
                found[token] = page_num
        # optimization: stop early if we found all expected
        if len(found) == len(expected_norms):
            break
    return found

# ---------------- compute ranges + apply offset ----------------


def compute_final_ranges(pdf_path: str, index_entries: List[Dict], force_offset: int = None) -> List[Dict]:
    reader = PdfReader(str(pdf_path))
    total_pages = len(reader.pages)
    entries = [dict(e) for e in index_entries]  # copy
    detected = scan_pdf_for_forms(pdf_path, entries)

    # --- Offset logic ---
    if force_offset is not None:
        offset = force_offset
        for e in entries:
            if e.get('form_code', '').startswith('L-'):
                if e.get('start_page'):
                    e['start_page'] += offset
                if e.get('end_page'):
                    e['end_page'] += offset
    else:
        # Compute offset using entries that have start_page from index AND detected page
        diffs = []
        for e in entries:
            if "start_page" in e and e["start_page"] and e["form_code"] in detected:
                diffs.append(detected[e["form_code"]] - e["start_page"])
        offset = 0
        if diffs:
            offset = int(round(statistics.median(diffs)))
            if abs(offset) > MAX_OFFSET_THRESHOLD:
                print(
                    f"Computed offset {offset} > threshold ({MAX_OFFSET_THRESHOLD}) -> ignoring offset")
                offset = 0
        if offset != 0:
            print(
                f"Applying offset {offset} to index page numbers (detected vs index mismatch).")
            for e in entries:
                if e.get('start_page'):
                    e['start_page'] = e['start_page'] + offset
                if e.get('end_page'):
                    e['end_page'] = e['end_page'] + offset

    # fill missing start_pages with detected pages
    for e in entries:
        if not e.get("start_page") and e["form_code"] in detected:
            e["start_page"] = detected[e["form_code"]]

    # compute end_pages:
    for i, e in enumerate(entries):
        if e.get("end_page"):
            continue
        # prefer explicit end if exists
        # else derive from next known start_page -1
        next_start = None
        for j in range(i + 1, len(entries)):
            if entries[j].get("start_page"):
                next_start = entries[j]["start_page"]
                break
        if next_start:
            e["end_page"] = max(e.get("start_page", 1), next_start - 1)
        else:
            # last form -> to end of PDF
            e["end_page"] = total_pages

    # final validation & clamp
    for e in entries:
        # clamp to [1, total_pages]
        if e.get("start_page") is None:
            print(
                f"WARNING: start_page missing for {e['form_code']} (original: {e.get('original_form_no')}).")
        else:
            e["start_page"] = max(1, min(total_pages, int(e["start_page"])))
        if e.get("end_page") is None:
            e["end_page"] = total_pages
        else:
            e["end_page"] = max(1, min(total_pages, int(e["end_page"])))
        if e.get("start_page") and e["end_page"] < e["start_page"]:
            print(
                f"NOTE: end_page < start_page for {e['form_code']} -> fixing by swapping.")
            s, t = e["start_page"], e["end_page"]
            e["start_page"], e["end_page"] = min(s, t), max(s, t)
    return entries

# ---------------- split and write metadata ----------------


def split_pdf(pdf_path: str, output_dir: str = OUTPUT_DIR, company_name: str = None):
    pdf_path = Path(pdf_path)
    output_dir = Path(output_dir) / pdf_path.stem
    output_dir.mkdir(parents=True, exist_ok=True)

    # --- Normalize company_name for logic, keep original for metadata ---
    pretty_company_name = company_name or pdf_path.parent.name
    logic_company_name = (
        company_name or pdf_path.parent.name).lower().replace(' ', '_')

    index_entries = extract_index_entries(
        str(pdf_path), pages_to_scan=INDEX_PAGES_TO_SCAN)
    index_form_codes = {e['form_code']
                        for e in index_entries if 'form_code' in e}

    # --- Company-specific offset logic ---
    force_offset = None
    use_text_search = False
    if logic_company_name:
        cname = logic_company_name
        if 'bajaj_allianz' in cname:
            pass  # Standard logic, no offset
        elif 'canara_hsbc_life' in cname or 'hdfc_life' in cname:
            l1_entries = [e for e in index_entries if e['form_code'].startswith(
                'L-1') and e.get('start_page')]
            if l1_entries and l1_entries[0]['start_page'] == 1:
                force_offset = 2
        elif 'icici_prudential' in cname:
            # If most index entries have no start_page, use text search fallback
            if not any(e.get('start_page') for e in index_entries):
                use_text_search = True
        elif 'edelweiss_life' in cname:
            print(
                "Applying EDELWEISS Life specific logic for end_page assignment.*******")
            total_pages = len(PdfReader(str(pdf_path)).pages)
            valid_entries = [e for e in index_entries if e.get('start_page')]
            # Check if first L-1* form starts at page 1
            l1_entries = [
                e for e in valid_entries if e['form_code'].startswith('L-1')]
            offset = 0
            if l1_entries and l1_entries[0]['start_page'] == 1:
                offset = 1
            for i, entry in enumerate(valid_entries):
                if i + 1 < len(valid_entries):
                    entry['end_page'] = valid_entries[i+1]['start_page'] - 1
                else:
                    entry['end_page'] = total_pages
                if offset:
                    entry['start_page'] += offset
                    entry['end_page'] += offset
            # Now update index_entries with these end_pages and offset
            start_to_entry = {e['start_page']: e for e in valid_entries}
            for e in index_entries:
                if e.get('start_page') and e['start_page'] in start_to_entry:
                    e['end_page'] = start_to_entry[e['start_page']]['end_page']
                    print(
                        f"Set end_page for {e['form_code']} to {e['end_page']}")
                    if offset:
                        e['start_page'] += 0  # already offset above
                        e['end_page'] += 0
        else:  # Standard logic
            l1_entries = [e for e in index_entries if e['form_code'].startswith(
                'L-1') and e.get('start_page')]
            if l1_entries and l1_entries[0]['start_page'] == 1:
                force_offset = 2

    if use_text_search:
        ranges = assign_ranges_by_text_search(str(pdf_path), index_entries)
    else:
        ranges = compute_final_ranges(
            str(pdf_path), index_entries, force_offset=force_offset)

    reader = PdfReader(str(pdf_path))
    split_files = []
    valid_ranges = []

    # For ICICI Prudential and similar, do NOT skip forms with missing start_page/end_page
    skip_incomplete = not (
        logic_company_name and 'icici_prudential' in logic_company_name)

    for r in ranges:
        # Clamp start_page and end_page to valid range
        try:
            start_page = int(r.get("start_page", 1))
            end_page = int(r.get("end_page", 1))
        except Exception as e:
            print(f"Invalid page numbers for {r.get('form_code')}: {e}")
            continue
        start_page = max(1, min(len(reader.pages), start_page))
        end_page = max(1, min(len(reader.pages), end_page))
        if end_page < start_page:
            print(
                f"end_page < start_page for {r.get('form_code')} ({start_page} < {end_page}), fixing.")
            end_page = start_page
        r["start_page"] = start_page
        r["end_page"] = end_page

        if skip_incomplete and (not r.get("form_code") or not r.get("start_page") or not r.get("end_page")):
            print(f"Skipping incomplete range: {r}")
            continue
        if r["start_page"] == r["end_page"] and r["form_code"] not in index_form_codes:
            print(
                f"Skipping possible spurious single-page form: {r['form_code']} (page {r['start_page']})")
            continue
        safe_name = re.sub(r"[^\w\d\-_]+", "_", r["form_code"])[:80] or "form"
        filename = f"{safe_name}_{r['start_page']}_{r['end_page']}.pdf"
        writer = PdfWriter()
        try:
            for p in range(r["start_page"] - 1, r["end_page"]):
                if 0 <= p < len(reader.pages):
                    writer.add_page(reader.pages[p])
            outpath = output_dir / filename
            with open(outpath, "wb") as f:
                writer.write(f)
            split_files.append({
                "filename": filename,
                "path": str(outpath),
                "form_name": r.get("original_form_no") or r["form_code"],
                "form_code": r["form_code"],
                "serial_no": r.get("serial_no", ""),
                "start_page": r.get("start_page"),
                "end_page": r.get("end_page"),
                "original_form_no": r.get("original_form_no", r["form_code"])
            })
            valid_ranges.append({
                "form_no": r["form_code"],
                "start_page": r.get("start_page"),
                "end_page": r.get("end_page")
            })
        except Exception as e:
            print(f"Error splitting form {r.get('form_code')}: {e}")
            continue

    # metadata (no user_id/upload_id)
    metadata = {
        "company_name": pretty_company_name,
        "original_filename": pdf_path.name,
        "original_path": str(pdf_path),
        "splits_folder": str(output_dir),
        "total_splits": len(split_files),
        "split_files": split_files,
        "ranges": valid_ranges,
        "method": "index+content",
    }

    meta_path = output_dir / "metadata.json"
    with open(meta_path, "w", encoding="utf-8") as jf:
        json.dump(metadata, jf, indent=2)

    print(f"\nWrote {len(split_files)} split files into: {output_dir}")
    print(f"Metadata written to: {meta_path}")
    return split_files, valid_ranges, metadata


def assign_ranges_by_text_search(pdf_path: str, index_entries: List[Dict]) -> List[Dict]:
    """
    For index entries without page numbers, assign start_page/end_page by searching the PDF for form tokens.
    Use both normalized code and full form name for matching. Assign tight, non-overlapping ranges. Output correct metadata fields.
    """
    reader = PdfReader(str(pdf_path))
    total_pages = len(reader.pages)
    # Build robust patterns for each form
    form_patterns = []
    for entry in index_entries:
        code = entry['form_code']
        orig = entry.get('original_form_no', '')
        desc = entry.get('description', '')
        # Build variants
        code_base = re.sub(r'[-_ ]+', r'[-_ ]*', code)
        orig_base = re.sub(r'[-_ ]+', r'[-_ ]*', orig.upper())
        desc_base = re.sub(r'[-_ ]+', r'[-_ ]*', desc.upper())
        # Accept L-1, L-1-*, FORM L-1-*, full form name, etc.
        patterns = [
            rf'\\b{code_base}\\b',
            rf'\\b{code_base}[-_ ]',
            rf'FORM[-_ ]*{code_base}\\b',
            rf'FORM[-_ ]*{code_base}[-_ ]',
        ]
        if orig_base and orig_base != code_base:
            patterns.append(rf'\\b{orig_base}\\b')
            patterns.append(rf'FORM[-_ ]*{orig_base}\\b')
        if desc_base and desc_base != code_base and desc_base != orig_base:
            patterns.append(rf'\\b{desc_base}\\b')
            patterns.append(rf'FORM[-_ ]*{desc_base}\\b')
        # Allow for trailing words (e.g., SCHEDULE, ACCOUNT)
        patterns = [p + r'(?:[\s\-_A-Z&]*)' for p in patterns]
        form_patterns.append((entry, [re.compile(p, re.I) for p in patterns]))
    # Search each page for each form
    found_pages = {}
    for page_num, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").upper()
        for entry, patterns in form_patterns:
            if entry['form_code'] in found_pages:
                continue
            for pat in patterns:
                if pat.search(text):
                    found_pages[entry['form_code']] = page_num
                    # Also try to match by original_form_no for more accuracy
                    if entry.get('original_form_no'):
                        found_pages[entry['original_form_no'].upper()
                                    ] = page_num
                    break
    # Assign detected start_pages
    for entry in index_entries:
        # Prefer matching by original_form_no if possible
        orig_key = entry.get('original_form_no', '').upper()
        if orig_key and orig_key in found_pages:
            entry['start_page'] = found_pages[orig_key]
        elif entry['form_code'] in found_pages:
            entry['start_page'] = found_pages[entry['form_code']]
    # Now assign start/end for all, sequentially, using detected as anchors
    # If index has page numbers, use them directly
    for i, entry in enumerate(index_entries):
        if entry.get('start_page') and entry.get('end_page'):
            continue  # already has both
        # If missing start_page, set to previous end_page+1 or 1
        if not entry.get('start_page'):
            if i > 0 and index_entries[i-1].get('end_page'):
                entry['start_page'] = index_entries[i-1]['end_page'] + 1
            else:
                entry['start_page'] = 1
        # If missing end_page, set to next start_page-1 or total_pages
        if not entry.get('end_page'):
            next_start = None
            for j in range(i+1, len(index_entries)):
                if index_entries[j].get('start_page') and index_entries[j]['start_page'] > entry['start_page']:
                    next_start = index_entries[j]['start_page']
                    break
            if next_start:
                entry['end_page'] = max(entry['start_page'], next_start - 1)
            else:
                entry['end_page'] = total_pages
        # Clamp
        entry['start_page'] = max(
            1, min(total_pages, int(entry['start_page'])))
        entry['end_page'] = max(1, min(total_pages, int(entry['end_page'])))
        if entry['end_page'] < entry['start_page']:
            entry['end_page'] = entry['start_page']
    return index_entries


# ---------------- main ----------------
if __name__ == "__main__":
    print("INPUT:", os.path.abspath(INPUT_PDF))
    print("Exists:", os.path.exists(INPUT_PDF))
    # Infer company_name from INPUT_PDF path
    pdf_path_obj = Path(INPUT_PDF)
    if pdf_path_obj.parent.name:
        company_name = pdf_path_obj.parent.name.lower().replace(" ", "_")
    else:
        company_name = None
    files, ranges, metadata = split_pdf(
        INPUT_PDF, OUTPUT_DIR, company_name=company_name)
    print("\nDetected Ranges:")
    for r in ranges:
        print(r)
    print("\nSplit files:")
    for f in files:
        print(f)
