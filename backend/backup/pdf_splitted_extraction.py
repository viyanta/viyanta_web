import json
import re
from pathlib import Path
import pdfplumber
import camelot
import string
from typing import List, Dict, Any

# Removed obsolete hardcoded TEMPLATE_JSON / INPUT_PDF / OUTPUT_JSON constants.
# All paths must be supplied via function arguments or CLI parameters.

# ---------------- New globals / helpers for special-form handling ----------------
# collects alignment/remap info for special forms
AUDIT_LOG: List[Dict[str, Any]] = []
# forms needing 5-col remap (Particulars + 4 period columns)
SPECIAL_FIVE_COL_FORMS = {"L-6A", "L-7"}


def load_template(path):
    with open(path, "r", encoding="utf-8") as f:
        template = json.load(f)

        print(f"Original template keys: {list(template.keys())}")
        print(f"Has FlatHeaders: {'FlatHeaders' in template}")
        print(f"Has Headers: {'Headers' in template}")

        # Handle both FlatHeaders (new format) and Headers (existing format)
        if "FlatHeaders" in template and isinstance(template["FlatHeaders"], list):
            print(f"Using existing FlatHeaders: {template['FlatHeaders']}")
            return template
        elif "Headers" in template:
            # Convert Headers to FlatHeaders for compatibility
            headers = template["Headers"]
            print(f"Original headers: {headers}")
            flat_headers = list(headers.keys())
            print(f"Extracted keys: {flat_headers}")
            template["FlatHeaders"] = flat_headers
            print(f"Set FlatHeaders to: {template['FlatHeaders']}")
            return template
        else:
            # If no headers found, try to extract from structure
            print("WARNING: No Headers or FlatHeaders found in template")
            template["FlatHeaders"] = []
            return template


def normalize_text(s: str) -> str:
    if not s:
        return ""
    s = re.sub(r"\s+", " ", s).strip()
    return s.strip(string.punctuation + " ").lower()


# Added: display/header normalization for frontend safety
HEADER_WS_RE = re.compile(r"\s+")


def normalize_header_for_display(h: str) -> str:
    if not h:
        return ""
    # Remove internal newlines / multiple spaces; keep single space
    h2 = HEADER_WS_RE.sub(" ", h.replace("\n", " ").replace("\r", " ")).strip()
    return h2


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
    print(f"Extracting tables from page {page_number} of {pdf_path}")

    # PRIMARY: Use pdfplumber first (more reliable for text and tables)
    print("Using pdfplumber for table extraction...")
    with pdfplumber.open(pdf_path) as pdf:
        if page_number <= len(pdf.pages):
            page = pdf.pages[page_number - 1]

            # Try to extract table first
            tb = page.extract_table()
            if tb:
                print(
                    f"PDFplumber table: {len(tb)} rows, {len(tb[0]) if tb else 0} cols")
                tables.append(tb)
            else:
                print("No structured table found with pdfplumber")

                # If no table, try to extract text in a structured way
                text = page.extract_text()
                if text:
                    print(
                        f"Extracting data from text content ({len(text)} chars)")

                    # Try to parse text into table-like structure
                    lines = text.split('\n')
                    potential_table = []

                    for line in lines:
                        line = line.strip()
                        if not line:
                            continue

                        # Look for lines that might be table rows (contain numbers, specific patterns)
                        if (re.search(r'\d', line) or
                                any(keyword in line.lower() for keyword in ['commission', 'total', 'gross', 'net', 'premium', 'expense'])):

                            # Split by multiple spaces or tabs to create columns
                            cols = re.split(r'\s{2,}|\t+', line)
                            if len(cols) > 1:  # Only if we have multiple columns
                                potential_table.append(cols)

                    if potential_table:
                        print(
                            f"Extracted text-based table: {len(potential_table)} rows")
                        tables.append(potential_table)
                    else:
                        print("No tabular data found in text")

                        # Last resort: create a simple structure from all text
                        print("Creating basic text extraction...")
                        text_rows = []
                        for line in lines:
                            line = line.strip()
                            if line and len(line) > 3:  # Ignore very short lines
                                # Single column with the line
                                text_rows.append([line])

                        if text_rows:
                            tables.append(text_rows)
                            print(
                                f"Created text-based extraction: {len(text_rows)} lines")
                else:
                    print("No text found on page")
        else:
            print(
                f"Page {page_number} does not exist (total pages: {len(pdf.pages)})")

    # FALLBACK: Try camelot only if pdfplumber failed completely
    if not tables:
        print("Falling back to camelot...")
        try:
            camelot_tables = camelot.read_pdf(
                pdf_path, pages=str(page_number), flavor="stream")
            print(f"Camelot found {len(camelot_tables)} tables")
            for i, t in enumerate(camelot_tables):
                table_data = t.df.values.tolist()
                print(
                    f"Camelot table {i}: {len(table_data)} rows, {len(table_data[0]) if table_data else 0} cols")
                tables.append(table_data)
        except Exception as e:
            print(f"Camelot extraction failed: {e}")

    print(f"Total tables extracted: {len(tables)}")
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


# ---------------- Special remap for L-6A / L-7 (5-column structure) ----------------
# simplistic numeric-ish / dash
NUMERIC_TOKEN_RE = re.compile(r"^[\d,().\-]+$|")


def looks_numeric_or_dash(val: str) -> bool:
    if not val:
        return False
    v = val.strip()
    if v in {"-", "—", "–"}:
        return True
    # Accept digits with commas, parentheses, periods
    return bool(re.match(r"^[()\d,.-]+$", v))


def remap_five_col_special(row_cells: List[str], flat_headers: List[str], form_no: str, page_idx: int, row_idx: int):
    """Return dict restricted to flat_headers for special 5-col forms.
    Strategy:
      row_cells[0] -> Particulars
      Collect subsequent numeric/dash values in appearance order -> assign to remaining headers sequentially.
      Extra non-empty values beyond needed are logged in AUDIT_LOG.
    """
    target_len = len(flat_headers)
    result = {h: "" for h in flat_headers}
    if not row_cells:
        return result

    result[flat_headers[0]] = row_cells[0].strip()
    value_headers = flat_headers[1:]

    collected = []
    overflow = []
    for c in row_cells[1:]:
        c_clean = (c or "").strip()
        if not c_clean:
            continue
        if looks_numeric_or_dash(c_clean):
            collected.append(c_clean)
        else:
            # Sometimes particulars might be wrapped / multi-line – append to particulars if still same line
            if not looks_numeric_or_dash(c_clean) and len(c_clean.split()) > 2 and not collected:
                # treat as continuation of particulars
                result[flat_headers[0]] = (
                    result[flat_headers[0]] + " " + c_clean).strip()
            else:
                overflow.append(c_clean)

    # Fill headers with collected numeric values
    for i, header in enumerate(value_headers):
        if i < len(collected):
            result[header] = collected[i]
        else:
            result[header] = ""

    # Anything left after using first len(value_headers) numeric entries is overflow
    if len(collected) > len(value_headers):
        for extra_val in collected[len(value_headers):]:
            overflow.append(extra_val)

    if overflow:
        AUDIT_LOG.append({
            "Form": form_no,
            "Page": page_idx,
            "Row": row_idx,
            "DiscardedValues": overflow,
            "Particulars": result.get(flat_headers[0], "")
        })

    return result


def map_to_rows(table, flat_headers, meta, form_no: str, page_idx: int):
    """
    Map extracted table rows to template headers, skipping junk.
    For special forms (L-6A / L-7 with 5 headers) perform ordered numeric remap.
    """
    if not table or not flat_headers:
        print("WARNING: Empty table or no headers available")
        return []

    print(
        f"Mapping table with {len(table)} rows to {len(flat_headers)} headers: {flat_headers}")

    data_rows = table[1:] if len(table) > 1 else table
    mapped_rows = []

    header_tokens = build_header_token_set(flat_headers)
    meta_values_norm = {normalize_text(str(v)) for v in meta.values() if v}

    special_mode = any(form_no.startswith(code)
                       for code in SPECIAL_FIVE_COL_FORMS) and len(flat_headers) == 5

    for r_idx, row in enumerate(data_rows):
        # row can be list of cells
        if isinstance(row, str):
            # If row is a single string, try to split it
            row = re.split(r'\s{2,}|\t+', row.strip())

        cleaned_cells = [str(c).strip() if c else "" for c in row]
        if not cleaned_cells or all(not cell for cell in cleaned_cells):
            continue

        print(f"Processing row {r_idx}: {cleaned_cells[:3]}..." if len(
            cleaned_cells) > 3 else f"Processing row {r_idx}: {cleaned_cells}")

        if special_mode:
            # Ensure there is at least a particulars cell
            if not cleaned_cells[0]:
                continue
            mapped = remap_five_col_special(
                cleaned_cells, flat_headers, form_no, page_idx, r_idx)
        else:
            # Standard mapping - extend or truncate to match headers
            mapped = {}
            for i, header in enumerate(flat_headers):
                if i < len(cleaned_cells):
                    mapped[header] = cleaned_cells[i]
                else:
                    mapped[header] = ""

            # If we have more cells than headers, try to combine them intelligently
            if len(cleaned_cells) > len(flat_headers):
                print(
                    f"More cells ({len(cleaned_cells)}) than headers ({len(flat_headers)}), combining extras")
                # Add extra data to the last column or particulars
                last_header = flat_headers[-1]
                extra_data = cleaned_cells[len(flat_headers):]
                if extra_data:
                    mapped[last_header] += " " + " ".join(extra_data)

        # Check if the first column (usually Particulars) has meaningful content
        first_col_value = mapped.get(
            flat_headers[0], "").strip() if flat_headers else ""
        if not first_col_value:
            print(f"Skipping row {r_idx}: empty first column")
            continue

        # Less strict filtering - allow more rows through
        if is_row_header_like(mapped, header_tokens, meta_values_norm):
            print(f"Skipping row {r_idx}: detected as header-like")
            continue

        normalized = normalize_row(mapped, flat_headers)
        mapped_rows.append(normalized)
        print(f"Added row {r_idx}: {first_col_value}")

    print(f"Final mapped rows: {len(mapped_rows)}")
    return mapped_rows


def is_table_of_contents_page(text):
    """
    Detect if a page is a table of contents/index page and should be skipped.
    """
    text_lower = text.lower()

    # Strong indicators of table of contents
    toc_indicators = [
        "list of website disclosure",
        "table of contents",
        "index",
        "contents",
        "sl. no." and "form no." and "description",
        "form no." and "description" and not "revenue account"
    ]

    # Check for multiple form numbers in a list format (typical TOC pattern)
    form_pattern_matches = len(re.findall(
        r"\bL-\d+[A-Z]*\b", text, re.IGNORECASE))

    # If we find many form numbers but no actual financial data, it's likely a TOC
    has_many_forms = form_pattern_matches > 5
    has_financial_data = any(indicator in text_lower for indicator in [
        "revenue account", "balance sheet", "premium", "claims", "expenses",
        "income", "expenditure", "assets", "liabilities", "surplus"
    ])

    # Check for simple TOC patterns
    for indicator in toc_indicators:
        if isinstance(indicator, str) and indicator in text_lower:
            return True

    # If page has many form references but no financial data, likely TOC
    if has_many_forms and not has_financial_data:
        return True

    return False


def extract_form(pdf_path, template_json, output_json):
    print(
        f"Starting extraction: PDF={pdf_path}, Template={template_json}, Output={output_json}")

    template = load_template(template_json)
    flat_headers = template.get("FlatHeaders", [])

    # Debug: print both template structure and flat headers
    print(f"Template keys: {list(template.keys())}")
    print(f"Template FlatHeaders: {flat_headers}")
    print(f"FlatHeaders type: {type(flat_headers)}")

    if not flat_headers:
        print("ERROR: No FlatHeaders found, cannot proceed with extraction")
        return output_json

    # Keep original but also build normalized display version
    normalized_headers = [
        normalize_header_for_display(h) for h in flat_headers]
    results = []

    with pdfplumber.open(pdf_path) as pdf:
        print(f"PDF has {len(pdf.pages)} pages")

        for page_idx, page in enumerate(pdf.pages, start=1):
            print(f"\nProcessing page {page_idx}")
            text = page.extract_text() or ""

            if len(text) < 50:
                print(
                    f"Page {page_idx} has very little text ({len(text)} chars)")
            else:
                print(f"Page {page_idx} text length: {len(text)} chars")

            # Skip table of contents pages
            if is_table_of_contents_page(text):
                print(
                    f"Skipping page {page_idx} - detected as table of contents")
                continue

            meta = extract_metadata(text, template)
            form_no = meta.get("Form No", "")
            print(
                f"Extracted metadata: Form No='{form_no}', Title='{meta.get('Title', '')}', Currency='{meta.get('Currency', '')}'")

            tables = extract_tables_from_page(pdf_path, page_idx)

            total_rows_found = 0
            for table_idx, table in enumerate(tables):
                print(f"Processing table {table_idx + 1}/{len(tables)}")
                rows = map_to_rows(table, flat_headers,
                                   meta, form_no, page_idx)
                total_rows_found += len(rows)
                print(f"Table {table_idx + 1} produced {len(rows)} data rows")

                if rows:  # Only add pages with actual data rows
                    results.append({
                        **meta,
                        "PagesUsed": page_idx,
                        "FlatHeaders": flat_headers,
                        "FlatHeadersNormalized": normalized_headers,  # added for frontend safe display
                        "Rows": rows
                    })

            print(f"Page {page_idx} total data rows: {total_rows_found}")

    print(f"\nExtraction complete: {len(results)} result pages with data")

    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    # Write audit log if any special-form discards occurred
    if AUDIT_LOG:
        audit_path = Path(output_json).with_name(
            Path(output_json).stem + "_extraction_alignment_audit.json")
        with open(audit_path, "w", encoding="utf-8") as af:
            json.dump(AUDIT_LOG, af, indent=2, ensure_ascii=False)
        print(f"Audit log written: {audit_path} ({len(AUDIT_LOG)} entries)")

    return output_json


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Extract form data from PDF")
    parser.add_argument("--template", required=True, help="Template JSON path")
    parser.add_argument("--pdf", required=True, help="PDF file path")
    parser.add_argument("--output", required=True, help="Output JSON path")

    args = parser.parse_args()

    # Use the provided arguments instead of hardcoded paths
    template_json = args.template
    input_pdf = args.pdf
    output_json = args.output

    out = extract_form(input_pdf, template_json, output_json)
    print(f"Extracted and saved to {out}")
