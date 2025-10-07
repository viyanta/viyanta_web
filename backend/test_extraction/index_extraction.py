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
    lines = stitch_lines(raw_lines)

    entries = []
    # Regex attempts (try from most-specific to fallback)
    pattern_range = re.compile(
        r'^\s*(?:(\d{1,3})[\.\)]?\s+)?'                 # optional serial
        r'([Ll][\s\-_]*\d+[A-Za-z0-9\-\s]*)'            # form token
        # any separator/desc (lazy)
        r'(?:[^\d\n]{0,80})'
        r'(\d{1,3})\s*(?:[-–—to]+)\s*(\d{1,3})\b',      # start - end
        flags=re.I
    )
    pattern_single = re.compile(
        r'^\s*(?:(\d{1,3})[\.\)]?\s+)?'
        r'([Ll][\s\-_]*\d+[A-Za-z0-9\-\s]*)'
        r'(?:[^\d\n]{0,80})'
        r'(?:pp?\.\s*)?(\d{1,3})\b',
        flags=re.I
    )
    pattern_form = re.compile(r'([Ll][\s\-_]*\d+[A-Za-z0-9\-]*)', flags=re.I)

    for line in lines:
        if not line:
            continue
        # first try range
        m = pattern_range.search(line)
        if m:
            serial = (m.group(1) or "").strip()
            raw_form = m.group(2).strip()
            start = int(m.group(3))
            end = int(m.group(4))
            desc = line[:m.start(3)].strip()
            norm = normalize_form_code(raw_form)
            entries.append({
                "serial_no": serial,
                "original_form_no": raw_form,
                "form_code": norm,
                "description": desc,
                "start_page": start,
                "end_page": end
            })
            continue
        # then single page
        m2 = pattern_single.search(line)
        if m2:
            serial = (m2.group(1) or "").strip()
            raw_form = m2.group(2).strip()
            start = int(m2.group(3))
            desc = line[:m2.start(3)].strip()
            norm = normalize_form_code(raw_form)
            entries.append({
                "serial_no": serial,
                "original_form_no": raw_form,
                "form_code": norm,
                "description": desc,
                "start_page": start,
                "end_page": start
            })
            continue
        # fallback: detect form token only (no page numbers)
        m3 = pattern_form.search(line)
        if m3:
            raw_form = m3.group(1).strip()
            norm = normalize_form_code(raw_form)
            # try to parse trailing page numbers anywhere else in the line
            p = re.search(
                r'(\d{1,3})\s*(?:[-–—to]+\s*(\d{1,3}))?', line[m3.end():])
            if p:
                s = int(p.group(1))
                e = int(p.group(2)) if p.group(2) else s
                entries.append({
                    "serial_no": "",
                    "original_form_no": raw_form,
                    "form_code": norm,
                    "description": line,
                    "start_page": s,
                    "end_page": e
                })
            else:
                entries.append({
                    "serial_no": "",
                    "original_form_no": raw_form,
                    "form_code": norm,
                    "description": line
                })
            continue
        # otherwise skip
    # deduplicate while preserving order (keep first appearance)
    seen = set()
    final = []
    for e in entries:
        key = e["form_code"]
        if key in seen:
            # if we already have it, attempt to merge missing info
            for prev in final:
                if prev["form_code"] == key:
                    # fill missing fields
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


def compute_final_ranges(pdf_path: str, index_entries: List[Dict]) -> List[Dict]:
    reader = PdfReader(str(pdf_path))
    total_pages = len(reader.pages)
    entries = [dict(e) for e in index_entries]  # copy
    # detect occurrences in PDF
    detected = scan_pdf_for_forms(pdf_path, entries)

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
        # apply to all index range fields present
        for e in entries:
            if "start_page" in e and e["start_page"]:
                e["start_page"] = e["start_page"] + offset
            if "end_page" in e and e["end_page"]:
                e["end_page"] = e["end_page"] + offset

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


def split_pdf(pdf_path: str, output_dir: str = OUTPUT_DIR):
    pdf_path = Path(pdf_path)
    output_dir = Path(output_dir) / pdf_path.stem
    output_dir.mkdir(parents=True, exist_ok=True)

    index_entries = extract_index_entries(
        str(pdf_path), pages_to_scan=INDEX_PAGES_TO_SCAN)
    ranges = compute_final_ranges(str(pdf_path), index_entries)

    reader = PdfReader(str(pdf_path))
    split_files = []

    for r in ranges:
        if not r.get("start_page"):
            print(f"Skipping {r.get('form_code')} — no start page detected.")
            continue
        writer = PdfWriter()
        for p in range(r["start_page"] - 1, r["end_page"]):
            if 0 <= p < len(reader.pages):
                writer.add_page(reader.pages[p])
        safe_name = re.sub(r"[^\w\d\-_]+", "_", r["form_code"])[:80] or "form"
        filename = f"{safe_name}_{r['start_page']}_{r['end_page']}.pdf"
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

    # metadata (no user_id/upload_id)
    metadata = {
        "company_name": pdf_path.parent.name,
        "original_filename": pdf_path.name,
        "original_path": str(pdf_path),
        "splits_folder": str(output_dir),
        "total_splits": len(split_files),
        "split_files": split_files,
        "ranges": [{"form_no": r["form_code"], "start_page": r.get("start_page"), "end_page": r.get("end_page")} for r in ranges],
        "method": "index+content",
    }

    meta_path = output_dir / "metadata.json"
    with open(meta_path, "w", encoding="utf-8") as jf:
        json.dump(metadata, jf, indent=2)

    print(f"\nWrote {len(split_files)} split files into: {output_dir}")
    print(f"Metadata written to: {meta_path}")
    return split_files, ranges, metadata


# ---------------- main ----------------
if __name__ == "__main__":
    print("INPUT:", os.path.abspath(INPUT_PDF))
    print("Exists:", os.path.exists(INPUT_PDF))
    files, ranges, metadata = split_pdf(
        INPUT_PDF, OUTPUT_DIR)
    print("\nDetected Ranges:")
    for r in ranges:
        print(r)
    print("\nSplit files:")
    for f in files:
        print(f)
