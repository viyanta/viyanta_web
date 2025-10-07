"""
Robust index->metadata extractor (metadata-only).
Writes <pdf_stem>_metadata.json files and includes warnings/confidence info.

Dependencies: PyPDF2
"""
import re
import json
import os
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from collections import Counter
from PyPDF2 import PdfReader
import statistics

# ---------------- CONFIG ----------------
# how many first pages to inspect when looking for an index region
INDEX_PAGES_MAX_SCAN = 8
DEFAULT_INDEX_PAGES = 3         # fallback if auto-detect fails
# how many lines at top of page to check for content tokens
FIRST_LINES_TO_SCAN = 8
# allow bigger threshold but only apply offset if consistent
MAX_OFFSET_THRESHOLD = 20
MIN_MATCHES_FOR_OFFSET = 2      # minimum matched entries to consider computing offset

# ---------------- helpers ----------------


def normalize_form_code(s: str) -> str:
    s = (s or "").upper()
    s = s.replace("_", "-").replace(" ", "-").replace("\u2013",
                                                      "-").replace("\u2014", "-")
    s = re.sub(r"-+", "-", s)
    # handle L14A -> L-14A
    s = re.sub(r'^(L)(\d)', r'\1-\2', s)
    s = re.sub(r'[^A-Z0-9\-]', '', s)
    return s


def roman_to_int(s: str) -> Optional[int]:
    s = s.strip().upper()
    roman_map = {'M': 1000, 'CM': 900, 'D': 500, 'CD': 400, 'C': 100,
                 'XC': 90, 'L': 50, 'XL': 40, 'X': 10, 'IX': 9, 'V': 5, 'IV': 4, 'I': 1}
    i = 0
    res = 0
    try:
        while i < len(s):
            if i+1 < len(s) and s[i:i+2] in roman_map:
                res += roman_map[s[i:i+2]]
                i += 2
            else:
                res += roman_map[s[i]]
                i += 1
        return res
    except Exception:
        return None


def read_pages_text(pdf_path: Path, pages: List[int]) -> List[str]:
    r = PdfReader(str(pdf_path))
    texts = []
    for p in pages:
        if 1 <= p <= len(r.pages):
            texts.append(r.pages[p-1].extract_text() or "")
        else:
            texts.append("")
    return texts

# ---------------- index region detection ----------------


def detect_index_span(pdf_path: Path, max_pages: int = INDEX_PAGES_MAX_SCAN) -> Tuple[int, int, List[str]]:
    """Try to find a contiguous index/TOC block near start. Return (start, end, page_texts_sample)."""
    r = PdfReader(str(pdf_path))
    total = len(r.pages)
    max_pages = min(max_pages, total)
    keywords = ("TABLE OF CONTENTS", "CONTENTS", "INDEX",
                "TABLE OF CONTENT", "CONTENTS OF THE REPORT")
    page_texts = [(i+1, (r.pages[i].extract_text() or "").upper())
                  for i in range(max_pages)]

    # if any page contains a keyword, find contiguous block around it where lines look like index
    candidate_pages = [p for p, t in page_texts if any(
        k in t for k in keywords)]
    if candidate_pages:
        # expand forward until lines no longer look like index
        start = min(candidate_pages)
        end = max(candidate_pages)
        # try expand earlier/later if neighboring pages also contain many dotted lines or form tokens

        def looks_like_index_text(text: str) -> bool:
            lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
            if not lines:
                return False
            dots = sum(1 for ln in lines if '....' in ln or '...' in ln)
            tokens = sum(1 for ln in lines if re.search(
                r'\bL[\s\-_]?\d', ln, re.I))
            return dots + tokens >= 1
        # expand backwards
        while start-1 >= 1:
            t = (r.pages[start-2].extract_text() or "").upper()
            if looks_like_index_text(t):
                start -= 1
            else:
                break
        # expand forwards
        while end+1 <= total and end < max_pages:
            t = (r.pages[end].extract_text() or "").upper()
            if looks_like_index_text(t):
                end += 1
            else:
                break
        texts = [(i+1, (r.pages[i].extract_text() or ""))
                 for i in range(start-1, min(end, max_pages))]
        return start, end, [t for _, t in texts]

    # fallback: if first N pages contain many L-tokens, treat them as index pages
    token_counts = []
    for p, t in page_texts:
        token_counts.append(
            (p, len(re.findall(r'\bL[\s\-_]?\d+[A-Za-z0-9]*\b', t, re.I))))
    # pick contiguous region near start where token count > 0
    pages_with_tokens = [p for p, c in token_counts if c > 0]
    if pages_with_tokens:
        start = min(pages_with_tokens)
        end = max(pages_with_tokens)
        texts = [(i+1, (r.pages[i].extract_text() or ""))
                 for i in range(start-1, end)]
        return start, end, [t for _, t in texts]

    # final fallback: first DEFAULT_INDEX_PAGES pages
    end = min(DEFAULT_INDEX_PAGES, total)
    texts = [(i+1, (r.pages[i].extract_text() or "")) for i in range(0, end)]
    return 1, end, [t for _, t in texts]

# ---------------- line parsing helpers ----------------


def split_multicolumn_line(line: str) -> List[str]:
    """Split a line that may contain multiple columns by dotted separators or large whitespace."""
    if '....' in line or '...' in line:
        parts = re.split(r'\.{2,}', line)
        parts = [p.strip() for p in parts if p.strip()]
        if len(parts) > 1:
            return parts
    # split by lots of spaces (heuristic)
    parts = [p.strip() for p in re.split(r'\s{4,}|\t', line) if p.strip()]
    if len(parts) > 1:
        return parts
    return [line.strip()]


def find_page_numbers_in_text(s: str) -> List[Tuple[int, int]]:
    """
    Return list of (start,end) page tuples found in string (numbers or roman).
    Recognizes '12', '12-15', '12 to 15', 'pp. 12', 'xii' (roman).
    """
    out = []
    # arabic ranges
    for m in re.finditer(r'(\d{1,3})\s*(?:[-–—to]+\s*(\d{1,3}))?', s, re.I):
        a = int(m.group(1))
        b = int(m.group(2)) if m.group(2) else a
        out.append((a, b))
    # roman numerals (standalone)
    for m in re.finditer(r'\b([IVXLCDM]{1,7})\b', s, re.I):
        rv = roman_to_int(m.group(1))
        if rv:
            out.append((rv, rv))
    return out


def extract_entries_from_text_block(text_block: str) -> List[Dict]:
    """
    Given a block of index text (several lines), return candidate entries with optional start/end pages.
    """
    entries = []
    lines = [ln for ln in text_block.splitlines() if ln.strip()]
    form_token_re = re.compile(
        r'\b(?:FORM\s+)?(L[\s\-_]?\d+[A-Za-z0-9\-]*)\b', re.I)
    for raw_line in lines:
        # split probable columns
        segments = split_multicolumn_line(raw_line)
        for seg in segments:
            # find all form tokens and page numbers in the segment
            forms = [m.group(1) for m in form_token_re.finditer(seg)]
            pages = find_page_numbers_in_text(seg)
            # if same count, pair them in order
            if forms and pages and len(forms) == len(pages):
                for f, p in zip(forms, pages):
                    entries.append({
                        "original_form_no": f,
                        "form_code": normalize_form_code(f),
                        "description": seg,
                        "start_page": p[0],
                        "end_page": p[1]
                    })
            # if forms but no pages -> add form without pages
            elif forms and not pages:
                for f in forms:
                    entries.append({
                        "original_form_no": f,
                        "form_code": normalize_form_code(f),
                        "description": seg
                    })
            # if no explicit form token but pages look like entry (rare) -> ignore
            # if single form and single page pair them
            elif forms and pages:
                # pair the first form with first page
                entries.append({
                    "original_form_no": forms[0],
                    "form_code": normalize_form_code(forms[0]),
                    "description": seg,
                    "start_page": pages[0][0],
                    "end_page": pages[0][1]
                })
            else:
                # try fallback: any token that looks like L-... even without preceding "Form"
                m = re.search(r'\b(L[\s\-_]?\d+[A-Za-z0-9\-]*)\b', seg, re.I)
                if m:
                    entries.append({
                        "original_form_no": m.group(1),
                        "form_code": normalize_form_code(m.group(1)),
                        "description": seg
                    })
    # dedupe preserving order (keep first)
    seen = set()
    final = []
    for e in entries:
        k = e["form_code"]
        if k in seen:
            # merge missing fields
            for prev in final:
                if prev["form_code"] == k:
                    for fld in ("original_form_no", "description", "start_page", "end_page"):
                        if not prev.get(fld) and e.get(fld):
                            prev[fld] = e[fld]
                    break
            continue
        seen.add(k)
        final.append(e)
    return final

# ---------------- content scanning ----------------


def scan_for_forms_in_pdf(pdf_path: Path, expected_codes: List[str] = None, whole_page: bool = False) -> Dict[str, int]:
    """
    Scan PDF for first occurrence page of each expected form code.
    If expected_codes is None, return all detected L-* tokens first places.
    whole_page: if True search whole page text; else search only top FIRST_LINES_TO_SCAN lines.
    """
    r = PdfReader(str(pdf_path))
    found = {}
    token_re = re.compile(r'\bL[\s\-_]?\d+[A-Za-z0-9]*\b', re.I)
    for pnum, page in enumerate(r.pages, start=1):
        text = page.extract_text() or ""
        if not whole_page:
            text = "\n".join(text.splitlines()[:FIRST_LINES_TO_SCAN])
        for m in token_re.finditer(text):
            code = normalize_form_code(m.group(0))
            if expected_codes:
                if code in expected_codes and code not in found:
                    found[code] = pnum
            else:
                if code not in found:
                    found[code] = pnum
        if expected_codes and len(found) == len(expected_codes):
            break
    return found

# ---------------- main metadata composer ----------------


def compute_ranges_and_metadata(pdf_path: Path) -> Dict:
    warnings = []
    r = PdfReader(str(pdf_path))
    total_pages = len(r.pages)
    # 1) detect index span & read text block
    start_idx, end_idx, texts = detect_index_span(pdf_path)
    index_block = "\n\n".join(texts)
    entries = extract_entries_from_text_block(index_block)

    # 2) If no index entries with pages - fallback strategies
    has_pages = any(e.get("start_page") for e in entries)
    if not entries:
        warnings.append("No index entries parsed from index pages.")
    if not has_pages and entries:
        warnings.append(
            "Index entries found but none had page numbers; will try content-scan fallback.")

    # 3) If entries have no pages -> get detected tokens and build ranges by ordering occurrences
    if not has_pages:
        detected = scan_for_forms_in_pdf(
            pdf_path, expected_codes=None, whole_page=True)
        if detected:
            # build list from detected tokens
            sorted_det = sorted(detected.items(), key=lambda x: x[1])
            entries = []
            for i, (code, start) in enumerate(sorted_det):
                end = sorted_det[i+1][1]-1 if i + \
                    1 < len(sorted_det) else total_pages
                entries.append({"original_form_no": code, "form_code": code,
                               "start_page": start, "end_page": end, "description": "detected_by_content"})
            warnings.append(
                "Built index entries from content scan (no page numbers in index).")
        else:
            warnings.append(
                "Content-scan fallback failed to detect any L- tokens; PDF may be scanned/OCR required.")

    # 4) Now we have entries (some may have start_page); compute offset using matched ones
    # normalize form_code fields
    for e in entries:
        e["form_code"] = normalize_form_code(
            e.get("form_code") or e.get("original_form_no", ""))

    # attempt to detect content-occurrence for forms that have a start_page in index
    expected_codes = [e["form_code"] for e in entries]
    detected = scan_for_forms_in_pdf(
        pdf_path, expected_codes=expected_codes, whole_page=False)

    # diffs where both index and detected exist
    diffs = []
    for e in entries:
        if e.get("start_page") and e["form_code"] in detected:
            diffs.append(detected[e["form_code"]] - e["start_page"])

    offset_to_apply = 0
    if len(diffs) >= MIN_MATCHES_FOR_OFFSET:
        # choose the mode-like offset (most common) but require majority support
        ctr = Counter(diffs)
        most_common_offset, freq = ctr.most_common(1)[0]
        if freq >= max(2, len(diffs)//2) and abs(most_common_offset) <= MAX_OFFSET_THRESHOLD:
            offset_to_apply = int(most_common_offset)
        else:
            # try median if it seems tight
            med = int(round(statistics.median(diffs)))
            close = sum(1 for d in diffs if abs(d - med) <= 1)
            if close >= max(2, len(diffs)//2) and abs(med) <= MAX_OFFSET_THRESHOLD:
                offset_to_apply = med
            else:
                warnings.append(
                    f"Inconsistent index vs content offsets (sample diffs={diffs}). Not applying automatic offset.")
    elif diffs:
        # small sample, be cautious
        med = int(round(statistics.median(diffs)))
        if abs(med) <= MAX_OFFSET_THRESHOLD:
            offset_to_apply = med
            warnings.append(
                "Small sample of diffs but applying median offset cautiously.")
        else:
            warnings.append(f"Computed offset {med} too large; not applying.")

    if offset_to_apply:
        for e in entries:
            if e.get("start_page"):
                e["start_page"] = e["start_page"] + offset_to_apply
            if e.get("end_page"):
                e["end_page"] = e["end_page"] + offset_to_apply

    # 5) Fill missing start pages with detected positions if available
    for e in entries:
        if not e.get("start_page") and e["form_code"] in detected:
            e["start_page"] = detected[e["form_code"]]

    # 6) Fill missing end_page by taking next start -1 or end of doc
    for i, e in enumerate(entries):
        if e.get("end_page"):
            continue
        next_start = None
        for j in range(i+1, len(entries)):
            if entries[j].get("start_page"):
                next_start = entries[j]["start_page"]
                break
        if next_start:
            e["end_page"] = max(e.get("start_page", 1), next_start-1)
        else:
            e["end_page"] = total_pages

    # 7) final clamp & sanity checks
    for e in entries:
        if e.get("start_page") is None:
            warnings.append(
                f"Missing start_page for {e.get('form_code')} (original: {e.get('original_form_no')}).")
        else:
            e["start_page"] = max(1, min(total_pages, int(e["start_page"])))
        if e.get("end_page") is None:
            e["end_page"] = total_pages
        else:
            e["end_page"] = max(1, min(total_pages, int(e["end_page"])))
        if e.get("start_page") and e["end_page"] < e["start_page"]:
            e["start_page"], e["end_page"] = min(
                e["start_page"], e["end_page"]), max(e["start_page"], e["end_page"])
            warnings.append(f"Fixed inverted range for {e['form_code']}.")

    # assign confidence per range
    for e in entries:
        if e.get("start_page") and e.get("original_form_no") and e["form_code"] in detected:
            e["confidence"] = "high"
        elif e.get("start_page"):
            e["confidence"] = "medium"
        else:
            e["confidence"] = "low"

    metadata = {
        "original_filename": pdf_path.name,
        "total_pages": total_pages,
        "index_detected_span": {"start_index_page": start_idx, "end_index_page": end_idx},
        "ranges": [
            {
                "form_no": e.get("form_code"),
                "original_form_no": e.get("original_form_no", e.get("form_code")),
                "start_page": e.get("start_page"),
                "end_page": e.get("end_page"),
                "description": e.get("description", ""),
                "confidence": e.get("confidence")
            } for e in entries
        ],
        "warnings": warnings,
        "method": "robust-index+content"
    }
    return metadata

# ---------------- runner for a folder or zip-extracted folder ----------------


def process_folder(folder: Path, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    pdfs = sorted(folder.rglob("*.pdf"))
    results = []
    for pdf in pdfs:
        try:
            meta = compute_ranges_and_metadata(pdf)
            out_path = out_dir / f"{pdf.stem}_metadata.json"
            with open(out_path, "w", encoding="utf-8") as jf:
                json.dump(meta, jf, indent=2)
            results.append((pdf.name, out_path, len(
                meta["ranges"]), meta["warnings"]))
            print(
                f"[OK] {pdf.name} -> {out_path} ({len(meta['ranges'])} ranges) warnings={len(meta['warnings'])}")
        except Exception as ex:
            print(f"[ERR] {pdf.name} -> {ex}")
    return results


# Example usage when running as script:
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print(
            "Usage: python robust_index_metadata.py <input_pdf_or_folder> <output_folder>")
        print("Example: python robust_index_metadata.py ./pdfs ./metadata_out")
        raise SystemExit(1)
    inp = Path(sys.argv[1])
    out = Path(sys.argv[2])
    if inp.is_file():
        # process single pdf
        meta = compute_ranges_and_metadata(inp)
        out.mkdir(parents=True, exist_ok=True)
        with open(out / f"{inp.stem}_metadata.json", "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)
        print("Wrote:", out / f"{inp.stem}_metadata.json")
    else:
        process_folder(inp, out)
