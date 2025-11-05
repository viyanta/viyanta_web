import json
import re
from pathlib import Path
import pdfplumber
import camelot
import string

# template for L-24 VALUATION OF NET LIABILITIES (adjust paths as needed)
TEMPLATE_JSON = r"../templates/icici/L-29 DETAIL REGARDING DEBT SECURITIES.json"
INPUT_PDF = r"pdf_splits_auto/L-29-Detail regarding debt securities.pdf"
OUTPUT_JSON = r"L-29_finalss-extracted.json"


def load_template(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def normalize_text(s: str) -> str:
    if not s:
        return ""
    s = re.sub(r"\s+", " ", s).strip()
    return s.strip(string.punctuation + " ").lower()


def extract_period(text):
    match = re.search(
        r"(for the .*?ended.*?\d{4}|revenue account.*?ended.*?\d{4}|period ended.*?\d{4}|balance sheet.*?\d{4})",
        text, flags=re.IGNORECASE)
    return match.group(1).strip() if match else ""


def extract_metadata(text, template):
    meta = {}
    # 1. Form No
    form_val = ""
    for key in template.keys():
        if re.match(r"form[\s\-_]*", key, re.IGNORECASE):
            form_val = template[key]
            break
    if not form_val:
        match = re.search(r"(L[-\dA-Z]+)", text, flags=re.IGNORECASE)
        if match:
            form_val = match.group(1).upper()
    meta["Form No"] = form_val

    # 2. Title
    company_match = re.search(
        r"([A-Z0-9\s&\.\-']+(?:INSURANCE COMPANY LIMITED|COMPANY LIMITED|INSURANCE LIMITED|COMPANY LTD|INSURANCE CO\.? LTD))",
        text,
        flags=re.IGNORECASE
    )
    title_raw = company_match.group(
        1) if company_match else template.get("Title", "")
    title = re.sub(r"^(RA|BS|P&L|Revenue Account|Balance Sheet|REVENUE|BALANCE)\s*[\:\-]?\s*", "", (title_raw or ""),
                   flags=re.IGNORECASE)
    meta["Title"] = re.sub(r"\s+", " ", title).strip()

    # 3. Registration number
    reg_match = re.search(
        r"(?:Regn\.?\s*No\.?|Registration\s*Number|Reg\s*No|Reg\s*Number|registration\s*no)\s*[:\-]?\s*(.+?)(?:\n|$)",
        text,
        flags=re.IGNORECASE
    )
    meta["RegistrationNumber"] = reg_match.group(
        1).strip() if reg_match else ""

    # 4. Period
    raw_period = extract_period(text) or template.get("Period", "")
    rp = raw_period
    rp = re.sub(r"REVENUE\s+ACCOUNT\s+FOR\s+THE\s+QUARTER\s+ENDED",
                "For the quarter ended", rp, flags=re.IGNORECASE)
    rp = re.sub(r"FOR\s+THE\s+PERIOD\s+ENDED",
                "For the period ended", rp, flags=re.IGNORECASE)
    rp = re.sub(r"BALANCE\s+SHEET\s+AS\s+AT", "As at", rp, flags=re.IGNORECASE)
    meta["Period"] = rp.strip()

    # 5. Currency
    currency_match = re.search(
        r"(?:\(|\b)(₹|Rs|INR).{0,20}?(lakh|lac|lacs|crore|cr)\b", text, flags=re.IGNORECASE)
    if currency_match:
        unit = currency_match.group(2).lower()
        if "cr" in unit or "crore" in unit:
            meta["Currency"] = "in Crores"
        else:
            meta["Currency"] = "in Lakhs"
    else:
        if re.search(r"(amt\.?\s*in\s*rs\.?\s*lakhs|rs\.?\s*in\s*lakhs)", text, flags=re.IGNORECASE):
            meta["Currency"] = "in Lakhs"
        elif re.search(r"(amt\.?\s*in\s*rs\.?\s*crores|rs\.?\s*in\s*crores)", text, flags=re.IGNORECASE):
            meta["Currency"] = "in Crores"
        else:
            meta["Currency"] = ""

    return meta


def extract_tables_from_page(pdf_path, page_number):
    tables = []
    try:
        camelot_tables = camelot.read_pdf(
            pdf_path, pages=str(page_number), flavor="stream")
        for t in camelot_tables:
            tables.append(t.df.values.tolist())
    except Exception:
        pass
    if not tables:
        with pdfplumber.open(pdf_path) as pdf:
            page = pdf.pages[page_number - 1]
            tb = page.extract_table()
            if tb:
                tables.append(tb)
    return tables


# ---------- header-like detection ----------
def build_header_token_set(flat_headers):
    tokens = set()
    for h in flat_headers:
        if not h:
            continue
        raw = re.sub(r"[^A-Za-z0-9\s]", " ", h)
        raw = re.sub(r"\s+", " ", raw).strip().lower()
        if raw:
            tokens.add(raw)
            for w in raw.split():
                tokens.add(w)
    extras = {"particulars", "schedule", "total", "grand", "linked", "non", "participating",
              "business", "life", "pension", "health", "var", "ins", "insurance", "annuity", }
    tokens.update(extras)
    return tokens


def cell_is_header_like(cell_value: str, header_tokens: set):
    if not cell_value:
        return False
    nv = normalize_text(cell_value)
    if not nv:
        return False
    if re.search(r"₹|rs\b|inr\b|\(.*lakh.*\)|lakh\b|crore\b|amt\.? in", cell_value, flags=re.IGNORECASE):
        return True
    if nv in header_tokens:
        return True
    words = [w for w in re.findall(r"[a-z]+", nv)]
    if words and all(w in header_tokens for w in words):
        return True
    if len(nv) <= 4 and any(nv == t[:len(nv)] for t in header_tokens):
        return True
    return False


def is_row_header_like(mapped_row: dict, header_tokens: set, meta_values_norm: set):
    non_empty = [(h, v) for h, v in mapped_row.items() if v and v.strip()]
    if not non_empty:
        return True
    particulars_raw = mapped_row.get("Particulars", "") or ""
    particulars_norm = normalize_text(particulars_raw)
    if particulars_norm and any(particulars_norm in mv for mv in meta_values_norm):
        return True
    if particulars_norm in header_tokens:
        return True
    header_like_count = 0
    for _, val in non_empty:
        if cell_is_header_like(val, header_tokens):
            header_like_count += 1
    if header_like_count >= 2:
        return True
    return False


# ---------- NEW: normalize multi-value rows ----------
def normalize_row(mapped, flat_headers):
    """
    Clean and redistribute values across headers.
    - Split multi-values in one cell (by \n or big spaces).
    - Shift values left-to-right into correct headers.
    - Keep '-' as valid.
    """
    all_values = []
    for h in flat_headers:
        cell = mapped.get(h, "").replace("\n", " ").strip()
        if cell:
            tokens = [tok.strip() for tok in re.split(
                r"\s{2,}|\n", cell) if tok.strip()]
            all_values.extend(tokens)
        else:
            all_values.append("")

    # Now redistribute across headers
    cleaned = {}
    v_index = 0
    for h in flat_headers:
        if v_index < len(all_values):
            val = all_values[v_index].strip()
            cleaned[h] = val
            v_index += 1
        else:
            cleaned[h] = ""
    return cleaned


def map_to_rows(table, flat_headers, meta):
    """
    Map extracted table rows to template headers, skipping junk.
    """
    data_rows = table[1:] if len(table) > 1 else table
    mapped_rows = []

    header_tokens = build_header_token_set(flat_headers)
    meta_values_norm = {normalize_text(str(v)) for v in meta.values() if v}

    for row in data_rows:
        cleaned = [c.strip() if c else "" for c in row]
        mapped = {header: (cleaned[i] if i < len(cleaned) else "")
                  for i, header in enumerate(flat_headers)}

        if not mapped.get("Particulars", "").strip():
            continue
        if is_row_header_like(mapped, header_tokens, meta_values_norm):
            continue

        # ✅ Always normalize the row (even if single values)
        normalized = normalize_row(mapped, flat_headers)
        mapped_rows.append(normalized)

    return mapped_rows


def extract_form(pdf_path, template_json, output_json):
    template = load_template(template_json)
    flat_headers = template.get("FlatHeaders", [])
    results = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_idx, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            meta = extract_metadata(text, template)
            tables = extract_tables_from_page(pdf_path, page_idx)
            for table in tables:
                rows = map_to_rows(table, flat_headers, meta)
                results.append({
                    **meta,
                    "PagesUsed": page_idx,
                    "FlatHeaders": flat_headers,
                    "Rows": rows
                })

    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    return output_json


if __name__ == "__main__":
    out = extract_form(INPUT_PDF, TEMPLATE_JSON, OUTPUT_JSON)
    print(f"✅ Extracted and saved to {out}")
