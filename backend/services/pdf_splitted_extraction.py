import json
import re
from pathlib import Path
import pdfplumber
import camelot
import string
from typing import List, Dict, Any


def load_template(path):
    with open(path, "r", encoding="utf-8") as f:
        template = json.load(f)

    # If this is a config file rather than a form template, create a basic template
    if "form_types" in template and "FlatHeaders" not in template:
        # This is a config file, create a basic template structure
        print(f"Converting config file to template format")

        # Create basic template with common headers for financial forms
        template["FlatHeaders"] = [
            "Particulars", "Current_Year", "Previous_Year"]
        print(f"Added default FlatHeaders: {template['FlatHeaders']}")

    # Handle both FlatHeaders (new format) and Headers (existing format)
    if "FlatHeaders" in template:
        if isinstance(template["FlatHeaders"], list):
            return template
        elif isinstance(template["FlatHeaders"], dict):
            # Convert FlatHeaders dict to list
            flat_headers = list(template["FlatHeaders"].keys())
            template["FlatHeaders"] = flat_headers
            return template

    if "Headers" in template:
        # Convert Headers to FlatHeaders for compatibility
        headers = template["Headers"]
        flat_headers = list(headers.keys())
        template["FlatHeaders"] = flat_headers
        return template

    # If still no headers, add basic ones
    if "FlatHeaders" not in template:
        template["FlatHeaders"] = [
            "Particulars", "Current_Year", "Previous_Year"]
        print(f"Added fallback FlatHeaders: {template['FlatHeaders']}")

    return template


def normalize_text(s: str) -> str:
    if not s:
        return ""
    s = re.sub(r"\s+", " ", s).strip()
    return s.strip(string.punctuation + " ").lower()


def normalize_header_for_display(h: str) -> str:
    if not h:
        return ""
    # Remove internal newlines / multiple spaces; keep single space
    h2 = re.sub(r"\s+", " ", h.replace("\n", " ").replace("\r", " ")).strip()
    return h2


def extract_period(text):
    match = re.search(
        r"(for the .*?ended.*?\d{4}|revenue account.*?ended.*?\d{4}|period ended.*?\d{4}|balance sheet.*?\d{4})",
        text, flags=re.IGNORECASE)
    return match.group(1).strip() if match else ""


def extract_metadata(text, template):
    meta = {}

    # 1. Form No - try multiple methods
    form_val = ""

    # Method 1: From template
    for key in template.keys():
        if re.match(r"form[\s\-_]*", key, re.IGNORECASE):
            form_val = template[key]
            break

    # Method 2: Extract from filename or content
    if not form_val:
        # Look for L-XX patterns in text
        match = re.search(r"(L[-\s]?\d+[A-Z]*)", text, flags=re.IGNORECASE)
        if match:
            form_val = match.group(1).upper().replace(" ", "-")

    # Method 3: Handle special cases based on content
    if not form_val or form_val == "":
        if "embedded value" in text.lower():
            form_val = "L-44"
        elif "voting activity" in text.lower() or "stewardship" in text.lower():
            form_val = "L-43"
        elif "solvency margin" in text.lower():
            form_val = "L-32"
        elif "revenue account" in text.lower():
            form_val = "L-1-A"
        elif "balance sheet" in text.lower():
            form_val = "L-3-A"
        elif "profit" in text.lower() and "loss" in text.lower():
            form_val = "L-2-A"

    meta["Form No"] = form_val

    # 2. Title
    company_match = re.search(
        r"([A-Z0-9\s&\.\-']+(?:INSURANCE COMPANY LIMITED|COMPANY LIMITED|INSURANCE LIMITED|COMPANY LTD|INSURANCE CO\.? LTD))",
        text,
        flags=re.IGNORECASE
    )
    title_raw = company_match.group(
        1) if company_match else template.get("Title", "")
    title = re.sub(r"^(RA|BS|P&L|Revenue Account|Balance Sheet|REVENUE|BALANCE|Form\s*L[-\s]?\d+)\s*[\:\-]?\s*", "", (title_raw or ""),
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

    # PRIMARY: Use camelot first (better for complex tables)
    print("[INFO] Trying camelot extraction...")
    try:
        # Try lattice first (works better for bordered tables), then stream
        camelot_tables = camelot.read_pdf(
            pdf_path, pages=str(page_number), flavor="lattice")
        print(f"Camelot lattice found {len(camelot_tables)} tables")

        for i, t in enumerate(camelot_tables):
            table_data = t.df.values.tolist()
            if table_data and len(table_data) > 0:
                print(
                    f"Camelot table {i}: {len(table_data)} rows, {len(table_data[0]) if table_data else 0} cols")
                tables.append(table_data)

        # If lattice didn't find good tables, try stream as a fallback
        if not tables:
            print("[INFO] Trying camelot stream as fallback...")
            camelot_tables = camelot.read_pdf(
                pdf_path, pages=str(page_number), flavor="stream")
            print(f"Camelot stream found {len(camelot_tables)} tables")

            for i, t in enumerate(camelot_tables):
                table_data = t.df.values.tolist()
                if table_data and len(table_data) > 0:
                    print(
                        f"Camelot stream table {i}: {len(table_data)} rows, {len(table_data[0]) if table_data else 0} cols")
                    tables.append(table_data)

    except Exception as e:
        print(f"[WARNING] Camelot extraction failed: {e}")

    # FALLBACK: Use pdfplumber for more thorough extraction
    print("[INFO] Using pdfplumber for additional extraction...")
    try:
        with pdfplumber.open(pdf_path) as pdf:
            if page_number <= len(pdf.pages):
                page = pdf.pages[page_number - 1]

                # Method 1: Extract structured table
                tb = page.extract_table()
                if tb and len(tb) > 0:
                    print(
                        f"[SUCCESS] PDFplumber structured table: {len(tb)} rows, {len(tb[0]) if tb else 0} cols")
                    # Only add if we don't already have this data
                    if not tables or not _is_similar_table(tb, tables):
                        tables.append(tb)

                # Method 2: Extract all tables (multiple tables per page)
                all_tables = page.extract_tables()
                if all_tables:
                    print(
                        f"[SUCCESS] PDFplumber found {len(all_tables)} tables")
                    for i, table in enumerate(all_tables):
                        if table and len(table) > 0:
                            print(
                                f"PDFplumber table {i}: {len(table)} rows, {len(table[0]) if table else 0} cols")
                            # Only add if we don't already have this data
                            if not _is_similar_table(table, tables):
                                tables.append(table)

                # Method 3: Text-based extraction (for poorly formatted tables)
                if not tables:
                    print("[INFO] Attempting text-based table extraction...")
                    text = page.extract_text()
                    if text:
                        text_table = _extract_table_from_text(text)
                        if text_table:
                            print(
                                f"[SUCCESS] Text-based table: {len(text_table)} rows")
                            tables.append(text_table)

            else:
                print(
                    f"[ERROR] Page {page_number} does not exist (total pages: {len(pdf.pages)})")

    except Exception as e:
        print(f"[ERROR] PDFplumber extraction failed: {e}")

    print(f"[SUMMARY] Total tables extracted: {len(tables)}")
    return tables


def _is_similar_table(new_table, existing_tables):
    """Check if a table is similar to existing ones to avoid duplicates"""
    if not existing_tables or not new_table:
        return False

    new_rows = len(new_table)
    new_cols = len(new_table[0]) if new_table else 0

    for existing in existing_tables:
        existing_rows = len(existing)
        existing_cols = len(existing[0]) if existing else 0

        # Similar dimensions
        if abs(new_rows - existing_rows) <= 1 and abs(new_cols - existing_cols) <= 1:
            # Check first few cells for similarity
            if new_table and existing:
                try:
                    new_first = str(
                        new_table[0][0] if new_table[0] else "").strip().lower()
                    existing_first = str(
                        existing[0][0] if existing[0] else "").strip().lower()
                    if new_first and existing_first and new_first == existing_first:
                        return True
                except (IndexError, AttributeError):
                    pass

    return False


def _extract_table_from_text(text):
    """Extract table-like data from plain text when structured extraction fails"""
    lines = text.split('\n')
    potential_table = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Look for lines that might be table rows
        # Criteria: contains numbers, financial terms, or typical table patterns
        if (re.search(r'\d', line) or
                any(keyword in line.lower() for keyword in [
                    'commission', 'total', 'gross', 'net', 'premium', 'expense',
                    'particulars', 'revenue', 'income', 'claims', 'assets',
                    'liabilities', 'surplus', 'reserve', 'fund', 'balance'
                ])):

            # Split by multiple spaces, tabs, or common separators
            cols = re.split(
                r'\s{2,}|\t+|(?<=\d)\s+(?=[A-Za-z])|(?<=[a-z])\s+(?=\d)', line)

            # Clean and filter columns
            cols = [col.strip() for col in cols if col.strip()]

            if len(cols) > 1:  # Only if we have multiple columns
                potential_table.append(cols)

    # Return table only if we have substantial data
    if len(potential_table) >= 2:  # At least 2 rows
        return potential_table

    return None


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
              "business", "life", "pension", "health", "var", "ins", "insurance", "annuity"}
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


def normalize_row(mapped, flat_headers):
    """Clean and redistribute values across headers."""
    all_values = []
    for h in flat_headers:
        cell = mapped.get(h, "").replace("\n", " ").strip()
        if cell:
            # Split long cell values using multiple-spaces or semicolons, but keep single-word values intact
            tokens = [tok.strip() for tok in re.split(
                r"\s{2,}|\n|;|\|", cell) if tok.strip()]
            # If a token looks like multiple serial numbers ("1 2 3"), keep it as-is for now
            all_values.extend(tokens)
        else:
            all_values.append("")

    # Helper to detect numeric-like token
    def is_numeric_like(s: str) -> bool:
        if not s:
            return False
        # Consider digits, parentheses markers, a/b labels and common markers as numeric-like
        s2 = s.replace(',', '').replace('*', '').strip()
        return bool(re.search(r"\d", s2))

    # If headers expect a leading serial number but the first value is non-numeric
    # and another cell contains numeric data, try to realign by moving the rightmost numeric token into the serial column
    cleaned = {h: "" for h in flat_headers}
    v_index = 0
    # Simple fill left-to-right first
    for h in flat_headers:
        if v_index < len(all_values):
            cleaned[h] = all_values[v_index]
            v_index += 1
        else:
            cleaned[h] = ""

    # Post-process alignment heuristics
    # If first header looks like a serial (sl, sl., s.no, no.) but value is not numeric
    first_h = flat_headers[0].lower() if flat_headers else ""
    if any(tok in first_h for tok in ["sl", "no", "s.no", "sl.", "serial"]) and not is_numeric_like(cleaned.get(flat_headers[0], "")):
        # find rightmost numeric-like column
        right_numeric_idx = None
        for idx in range(len(flat_headers)-1, -1, -1):
            if is_numeric_like(cleaned.get(flat_headers[idx], "")):
                right_numeric_idx = idx
                break

        if right_numeric_idx is not None and right_numeric_idx != 0:
            # Move that numeric into the first column and shift intermediate values rightwards
            numeric_val = cleaned[flat_headers[right_numeric_idx]]
            for i in range(right_numeric_idx, 0, -1):
                cleaned[flat_headers[i]] = cleaned[flat_headers[i-1]]
            cleaned[flat_headers[0]] = numeric_val

    return cleaned


def map_to_rows(table, flat_headers, meta):
    """Map extracted table rows to template headers, being more inclusive to avoid missing data."""
    if not table or not flat_headers:
        print("WARNING: Empty table or no headers available")
        return []

    print(
        f"Mapping table with {len(table)} rows to {len(flat_headers)} headers: {flat_headers}")

    # Don't automatically skip first row - analyze it first
    all_rows = table
    mapped_rows = []

    header_tokens = build_header_token_set(flat_headers)
    meta_values_norm = {normalize_text(str(v)) for v in meta.values() if v}

    # Find actual header row (might not be first row)
    header_row_idx = _find_header_row(all_rows, flat_headers, header_tokens)
    data_start_idx = header_row_idx + 1 if header_row_idx >= 0 else 0

    print(
        f"Header row detected at index: {header_row_idx}, data starts at: {data_start_idx}")

    # Process data rows
    data_rows = all_rows[data_start_idx:] if data_start_idx < len(
        all_rows) else all_rows

    for row_idx, row in enumerate(data_rows):
        # Handle different row formats
        if isinstance(row, str):
            # If row is a single string, try to split it intelligently
            row = _smart_split_row(row)

        # Clean and convert to list
        cleaned = [str(c).strip() if c is not None else "" for c in row]

        # Skip completely empty rows
        if not cleaned or all(not cell for cell in cleaned):
            continue

        print(f"Processing row {row_idx}: {str(cleaned[:3]).encode('ascii', 'ignore').decode('ascii')}..." if len(
            cleaned) > 3 else f"Processing row {row_idx}: {str(cleaned).encode('ascii', 'ignore').decode('ascii')}")

        # Map to headers - handle variable column counts
        mapped = _map_row_to_headers(cleaned, flat_headers)

        # Check if this looks like a data row (less strict filtering)
        if _is_valid_data_row(mapped, header_tokens, meta_values_norm):
            # Always normalize the row
            normalized = normalize_row(mapped, flat_headers)
            mapped_rows.append(normalized)
            print(
                f"Added row {row_idx}: {str(mapped.get(flat_headers[0], '')).encode('ascii', 'ignore').decode('ascii')}")
        else:
            print(f"Skipped row {row_idx}: detected as non-data row")

    print(f"Final mapped rows: {len(mapped_rows)}")
    return mapped_rows


def _find_header_row(rows, flat_headers, header_tokens):
    """Find the actual header row in the table"""
    if not rows:
        return -1

    for i, row in enumerate(rows[:10]):  # Check first 10 rows
        if isinstance(row, str):
            row = _smart_split_row(row)

        # Convert to strings and clean
        row_clean = [str(c).strip().lower() if c else "" for c in row]

        # Check if this row contains header-like terms
        header_matches = 0
        for cell in row_clean:
            if cell:
                # Check against known headers
                for header in flat_headers:
                    if header and normalize_text(header) in normalize_text(cell):
                        header_matches += 1
                        break
                # Check against common header terms
                if any(term in cell for term in ['particulars', 'current', 'previous', 'amount', 'balance']):
                    header_matches += 1

        # If majority of cells look like headers, this is likely the header row
        if header_matches >= max(1, min(2, len(flat_headers) // 2)):
            return i

    return -1  # No clear header row found


def _smart_split_row(row_str):
    """Intelligently split a row string into columns"""
    if not row_str:
        return []

    # Try different splitting strategies
    # 1. Split by multiple spaces (2 or more)
    cols = re.split(r'\s{2,}', row_str.strip())
    if len(cols) > 1:
        return cols

    # 2. Split by tabs
    cols = row_str.split('\t')
    if len(cols) > 1:
        return [c.strip() for c in cols if c.strip()]

    # 3. Split by number-text boundaries (for financial data)
    cols = re.split(r'(?<=\d)\s+(?=[A-Za-z])|(?<=[a-z])\s+(?=\d)', row_str)
    if len(cols) > 1:
        return [c.strip() for c in cols if c.strip()]

    # 4. Split by common patterns in financial documents
    cols = re.split(r'\s+(?=Rs\.|₹|\d+,\d+|\(\d+\))', row_str)
    if len(cols) > 1:
        return [c.strip() for c in cols if c.strip()]

    # 5. Detect leading series of serial numbers (e.g., "1 2 3  No. of branches ... 0")
    # If we detect multiple leading numbers separated by spaces followed by text, keep them joined with commas
    m = re.match(r'^((?:\d+\s+){2,})(.+)$', row_str.strip())
    if m:
        nums = m.group(1).strip()
        rest = m.group(2).strip()
        # Collapse multiple numbers into a single token separated by commas so downstream logic can decide
        collapsed = nums.replace(' ', ',')
        return [collapsed, rest]

    # 5. Last resort: single column
    return [row_str.strip()]


def _map_row_to_headers(cleaned_cells, flat_headers):
    """Map row cells to headers, handling mismatched column counts"""
    mapped = {}

    # If we have more cells than headers, try to intelligently combine
    if len(cleaned_cells) > len(flat_headers):
        print(
            f"More cells ({len(cleaned_cells)}) than headers ({len(flat_headers)}), adjusting...")

        # Strategy: If first header is 'Particulars' (textual) and last headers are numeric,
        # merge middle/extra cells into the Particulars column to preserve numeric columns alignment.
        first_h = flat_headers[0].lower() if flat_headers else ""
        if 'particular' in first_h or 'information' in first_h:
            # keep first column as is, try to compress trailing extras into the particulars column
            adjusted = []
            # Always take the first cleaned cell
            adjusted.append(cleaned_cells[0])
            # For numeric-like tail columns, try to align to the right
            tail_needed = len(flat_headers) - 1
            tail_cells = cleaned_cells[-tail_needed:] if tail_needed > 0 else []
            # Middle cells become part of particulars
            middle = cleaned_cells[1:len(
                cleaned_cells)-tail_needed] if tail_needed > 0 else cleaned_cells[1:]
            particulars_combined = " ".join([c for c in middle if c.strip()])
            # Insert particulars_combined as second token (if there is a separate particulars header)
            if len(flat_headers) > 1:
                adjusted.append(particulars_combined)
            # Append tail numeric cells (or blanks to fill)
            adjusted.extend(tail_cells)
            # If adjusted length still mismatches, pad or truncate
            if len(adjusted) > len(flat_headers):
                adjusted = adjusted[:len(flat_headers)]
            while len(adjusted) < len(flat_headers):
                adjusted.append("")
            cleaned_cells = adjusted
        else:
            # Default: combine extras into last column
            adjusted_cells = cleaned_cells[:len(flat_headers)-1]
            if len(cleaned_cells) >= len(flat_headers):
                # Combine remaining cells
                remaining = cleaned_cells[len(flat_headers)-1:]
                combined = " ".join(cell for cell in remaining if cell.strip())
                adjusted_cells.append(combined)
            cleaned_cells = adjusted_cells

    # Map cells to headers
    for i, header in enumerate(flat_headers):
        if i < len(cleaned_cells):
            mapped[header] = cleaned_cells[i]
        else:
            mapped[header] = ""

    return mapped


def _is_valid_data_row(mapped_row, header_tokens, meta_values_norm):
    """Check if a row contains valid data (less strict than before)"""
    non_empty = [(h, v) for h, v in mapped_row.items() if v and v.strip()]

    # Always allow rows with content
    if not non_empty:
        return False

    # Get the first column (usually Particulars)
    first_header = list(mapped_row.keys())[0] if mapped_row else ""
    first_value = mapped_row.get(first_header, "").strip()

    # Must have something in first column
    if not first_value:
        return False

    # Less strict filtering - allow more rows through
    particulars_norm = normalize_text(first_value)

    # Skip only obvious header rows or metadata
    skip_patterns = [
        'form no', 'form number', 'registration number', 'regn no',
        'revenue account', 'balance sheet', 'profit and loss',
        'insurance company', 'limited', 'page', 'continued'
    ]

    if any(pattern in particulars_norm for pattern in skip_patterns):
        return False

    # Skip if it looks like metadata (company name, period, etc.)
    if particulars_norm and any(particulars_norm in mv for mv in meta_values_norm):
        return False

    # Skip obvious header rows (multiple header-like cells)
    header_like_count = 0
    for _, val in non_empty:
        if cell_is_header_like(val, header_tokens):
            header_like_count += 1

    # Only skip if most cells are header-like
    # 70% threshold instead of strict rules
    if header_like_count >= len(non_empty) * 0.7:
        return False

    return True


def is_table_of_contents_page(text):
    """Detect if a page is a table of contents/index page and should be skipped."""
    text_lower = text.lower()

    # Strong indicators of table of contents (be more specific)
    strong_toc_indicators = [
        "list of website disclosure",
        "table of contents",
        "contents page",
        "index of forms"
    ]

    # Check for explicit TOC indicators
    for indicator in strong_toc_indicators:
        if indicator in text_lower:
            return True

    # Check for multiple form numbers in a list format (typical TOC pattern)
    form_pattern_matches = len(re.findall(
        r"\bL-\d+[A-Z]*\b", text, re.IGNORECASE))

    # More conservative: require many forms AND no financial data AND clear list structure
    has_many_forms = form_pattern_matches > 8  # Increased threshold
    has_financial_data = any(indicator in text_lower for indicator in [
        "revenue account", "balance sheet", "premium", "claims", "expenses",
        "income", "expenditure", "assets", "liabilities", "surplus", "reserve",
        "profit", "loss", "investment", "commission", "benefit"
    ])

    # Check for list-like structure (page numbers, dots, etc.)
    has_list_structure = bool(
        re.search(r'\.\.\.\.*\s*\d+|page\s+\d+|\d+\s*\.\s*\d+', text_lower))

    # Only skip if it's clearly a TOC: many forms, no financial data, and list structure
    if has_many_forms and not has_financial_data and has_list_structure:
        return True

    return False


def extract_form(pdf_path, template_json, output_json):
    print(
        f"Starting extraction: PDF={pdf_path}, Template={template_json}, Output={output_json}")

    try:
        template = load_template(template_json)
        flat_headers = template.get("FlatHeaders", [])

        print(f"Template keys: {list(template.keys())}")
        print(f"Template FlatHeaders: {flat_headers}")

        if not flat_headers:
            print("ERROR: No FlatHeaders found even after template processing")
            # Create absolute fallback
            flat_headers = ["Particulars", "Current_Year", "Previous_Year"]
            print(f"Using absolute fallback headers: {flat_headers}")

        # Build normalized display version
        normalized_headers = [
            normalize_header_for_display(h) for h in flat_headers]
        results = []

        with pdfplumber.open(pdf_path) as pdf:
            print(f"PDF has {len(pdf.pages)} pages")

            # First, analyze the content to adjust headers if needed
            if pdf.pages:
                sample_text = pdf.pages[0].extract_text() or ""
                form_type = _detect_form_type(sample_text)
                print(f"Detected form type: {form_type}")

                # Adjust headers based on detected form type
                adjusted_headers = _get_headers_for_form_type(
                    form_type, flat_headers)
                if adjusted_headers != flat_headers:
                    flat_headers = adjusted_headers
                    normalized_headers = [
                        normalize_header_for_display(h) for h in flat_headers]
                    print(f"Adjusted headers for {form_type}: {flat_headers}")

            for page_idx, page in enumerate(pdf.pages, start=1):
                print(f"\nProcessing page {page_idx}")
                text = page.extract_text() or ""

                # More lenient text length check
                if len(text) < 20:
                    print(
                        f"Page {page_idx} has very little text ({len(text)} chars), but still processing...")
                else:
                    print(f"Page {page_idx} text length: {len(text)} chars")

                # Skip table of contents pages (but be less aggressive)
                if is_table_of_contents_page(text):
                    print(
                        f"Skipping page {page_idx} - detected as table of contents")
                    continue

                meta = extract_metadata(text, template)
                form_no = meta.get("Form No", "")
                print(
                    f"Extracted metadata: Form No='{form_no}', Title='{meta.get('Title', '')}', Currency='{meta.get('Currency', '')}'")

                # Extract all tables from this page
                tables = extract_tables_from_page(pdf_path, page_idx)
                print(f"Found {len(tables)} tables on page {page_idx}")

                page_total_rows = 0
                page_has_data = False

                # Process each table separately and combine results
                for table_idx, table in enumerate(tables):
                    print(
                        f"\nProcessing table {table_idx + 1}/{len(tables)} on page {page_idx}")
                    print(
                        f"Table dimensions: {len(table)} rows x {len(table[0]) if table else 0} cols")

                    rows = map_to_rows(table, flat_headers, meta)
                    table_row_count = len(rows)
                    page_total_rows += table_row_count

                    print(
                        f"Table {table_idx + 1} produced {table_row_count} data rows")

                    # Add data for each table that has rows
                    if rows:
                        page_has_data = True
                        results.append({
                            **meta,
                            "PagesUsed": page_idx,
                            "TableIndex": table_idx + 1,  # Track which table this data came from
                            "FlatHeaders": flat_headers,
                            "FlatHeadersNormalized": normalized_headers,
                            "Rows": rows
                        })
                        print(
                            f"[OK] Added {table_row_count} rows from table {table_idx + 1}")

                print(
                    f"Page {page_idx} summary: {len(tables)} tables processed, {page_total_rows} total rows extracted")

                # If no data was found but we had tables, show a warning
                if tables and not page_has_data:
                    print(
                        f"[WARNING] Page {page_idx} had {len(tables)} tables but no data rows extracted!")

                    # Debug: show raw table data for first table
                    if tables:
                        print("Debug - First table raw data (first 3 rows):")
                        for i, row in enumerate(tables[0][:3]):
                            print(f"  Row {i}: {row}")

        print(
            f"\nExtraction complete: {len(results)} result sections with data")

        # If no results but we processed pages, that's concerning
        if not results:
            print(
                "[WARNING] No data extracted from any page! This might indicate an extraction issue.")

            # Still save an empty result to avoid errors
            results = [{
                "Form No": "",
                "Title": "No data extracted",
                "RegistrationNumber": "",
                "Period": "",
                "Currency": "",
                "PagesUsed": 0,
                "FlatHeaders": flat_headers,
                "FlatHeadersNormalized": normalized_headers,
                "Rows": []
            }]

        # Ensure output directory exists
        output_path = Path(output_json)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

        return output_json

    except Exception as e:
        print(f"[ERROR] Extraction error: {e}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()

        # Create error result
        error_result = [{
            "Form No": "ERROR",
            "Title": f"Extraction failed: {str(e)}",
            "RegistrationNumber": "",
            "Period": "",
            "Currency": "",
            "PagesUsed": 0,
            "FlatHeaders": ["Particulars", "Current_Year", "Previous_Year"],
            "FlatHeadersNormalized": ["Particulars", "Current_Year", "Previous_Year"],
            "Rows": []
        }]

        # Ensure output directory exists for error file
        output_path = Path(output_json)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(error_result, f, indent=2, ensure_ascii=False)

        return output_json


def _detect_form_type(text):
    """Detect the type of form based on content"""
    text_lower = text.lower()

    # Enhanced detection for L-43 voting activity forms
    if "voting activity" in text_lower or "stewardship" in text_lower or "form l 43" in text_lower:
        return "L-43"
    elif "embedded value" in text_lower:
        return "L-44"
    elif "solvency margin" in text_lower:
        return "L-32"
    elif "revenue account" in text_lower:
        return "L-1-A"
    elif "balance sheet" in text_lower:
        return "L-3-A"
    elif "profit" in text_lower and "loss" in text_lower:
        return "L-2-A"
    elif "premium" in text_lower:
        return "L-4"
    elif "commission" in text_lower:
        return "L-5"
    else:
        return "UNKNOWN"


def _get_headers_for_form_type(form_type, default_headers):
    """Get appropriate headers based on detected form type. No hardcoded headers, always use default_headers."""
    return default_headers


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
