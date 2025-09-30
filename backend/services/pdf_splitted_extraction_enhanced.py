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


def _clean_extracted_value(value):
    """Clean and normalize extracted cell values"""
    if value is None:
        return ""

    str_value = str(value).strip()

    # Remove common OCR artifacts
    str_value = re.sub(r'[^\w\s\-\.\,\(\)\%\$₹]', '', str_value)

    # Clean up extra whitespace
    str_value = re.sub(r'\s+', ' ', str_value)

    return str_value


def _normalize_amount(amount_str):
    """Normalize financial amounts for consistency"""
    if not amount_str:
        return ""

    # Remove currency symbols and extra spaces
    cleaned = re.sub(r'[^\d\-\.\,\(\)]', '', str(amount_str))

    # Handle parentheses for negative numbers
    if '(' in cleaned and ')' in cleaned:
        cleaned = '-' + cleaned.replace('(', '').replace(')', '')

    return cleaned.strip()


def _is_header_row(row, expected_headers):
    """Determine if a row is likely a header row"""
    if not row or not expected_headers:
        return False

    row_text = [str(cell).strip().lower() for cell in row if str(cell).strip()]

    # If row is empty, it's not a header
    if not row_text:
        return False

    # Check if row contains typical header keywords
    header_keywords = [
        'particulars', 'current', 'previous', 'year', 'quarter', 'amount',
        'total', 'new', 'business', 'renewal', 'premium', 'commission',
        'revenue', 'expense', 'description', 'company', 'meeting', 'vote',
        'proposal', 'recommendation', 'percentage', 'date', 'type'
    ]

    # Count how many cells in the row match expected headers or contain header keywords
    matches = 0
    for cell in row_text:
        # Direct match with expected headers
        for header in expected_headers:
            if cell in header.lower() or header.lower() in cell:
                matches += 1
                break
        else:
            # Check for header keywords
            if any(keyword in cell for keyword in header_keywords):
                matches += 1

    # If more than half the cells look like headers, consider it a header row
    header_threshold = max(1, len(row_text) // 2)
    return matches >= header_threshold


def _is_valid_data_row(mapped_row, headers, meta_values_norm=None):
    """Check if a mapped row contains valid data (not just headers or empty)

    Args:
        mapped_row: Dictionary with row data mapped to headers
        headers: List of header names or header tokens (for backward compatibility)
        meta_values_norm: Optional normalized metadata values (for backward compatibility)
    """
    if not mapped_row:
        return False

    # Count non-empty cells
    non_empty_count = sum(
        1 for value in mapped_row.values() if str(value).strip())

    # Need at least one non-empty cell
    if non_empty_count == 0:
        return False

    # Check if this looks like a header row by examining the content
    first_cell = str(list(mapped_row.values())[0]).strip().lower()

    # Only skip rows that are EXACT header matches - be very selective
    exact_header_matches = [
        'particulars', 'current year', 'previous year', 'current quarter',
        'previous quarter', 'description', 'company name'
    ]

    # Only skip if the first cell is EXACTLY one of these headers (not just contains)
    if first_cell in exact_header_matches:
        return False

    # Skip completely empty rows or rows with just separators/dashes
    if first_cell in ['', '-', '--', '---', '____', '_____', '|', '||']:
        return False

    # Handle backward compatibility for old calling pattern
    if isinstance(headers, list) and headers and not isinstance(headers[0], str):
        # This is the old pattern with header_tokens and meta_values_norm
        # Use a simplified validation for backward compatibility
        return non_empty_count > 0 and len(first_cell) >= 1

    # New pattern: headers is a list of strings
    first_col_name = headers[0] if headers else 'Particulars'
    first_col_value = str(mapped_row.get(first_col_name, '')).strip()

    # Much more permissive - only need at least 1 character for meaningful data
    if len(first_col_value) < 1:
        return False

    return True


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
        # Try lattice first (better for bordered tables)
        print("[INFO] Trying camelot lattice...")
        camelot_tables = camelot.read_pdf(
            pdf_path,
            pages=str(page_number),
            flavor="lattice",
            line_scale=40,  # Adjust line detection sensitivity
            # Copy text in vertical and horizontal directions
            copy_text=['v', 'h'],
            shift_text=['l', 't', 'r']  # Shift text left, top, right
        )
        print(f"Camelot lattice found {len(camelot_tables)} tables")

        for i, t in enumerate(camelot_tables):
            # Check table quality
            accuracy = getattr(t, 'accuracy', 0)
            print(f"Camelot lattice table {i} accuracy: {accuracy}")

            if accuracy > 50:  # Only use tables with decent accuracy
                table_data = t.df.values.tolist()
                if table_data and len(table_data) > 1:  # Must have at least 2 rows
                    print(
                        f"Camelot lattice table {i}: {len(table_data)} rows, {len(table_data[0]) if table_data else 0} cols")
                    tables.append(table_data)

        # If lattice didn't find good tables, try stream
        if not tables:
            print("[INFO] Trying camelot stream...")
            camelot_tables = camelot.read_pdf(
                pdf_path,
                pages=str(page_number),
                flavor="stream",
                edge_tol=500,  # Increase edge tolerance
                row_tol=2,     # Row tolerance
                column_tol=0   # Column tolerance
            )
            print(f"Camelot stream found {len(camelot_tables)} tables")

            for i, t in enumerate(camelot_tables):
                accuracy = getattr(t, 'accuracy', 0)
                print(f"Camelot stream table {i} accuracy: {accuracy}")

                if accuracy > 30:  # Lower threshold for stream
                    table_data = t.df.values.tolist()
                    if table_data and len(table_data) > 1:
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

                # Method 1: Extract all tables with better settings
                table_settings = {
                    "vertical_strategy": "lines_strict",
                    "horizontal_strategy": "lines_strict",
                    "explicit_vertical_lines": [],
                    "explicit_horizontal_lines": [],
                    "snap_tolerance": 3,
                    "join_tolerance": 3,
                    "edge_min_length": 3,
                    # Removed keep_blank_chars as it's not a valid parameter
                    "text_tolerance": 3,
                    "text_x_tolerance": 3,
                    "text_y_tolerance": 3,
                    "intersection_tolerance": 3,
                    "intersection_x_tolerance": 3,
                    "intersection_y_tolerance": 3
                }

                all_tables = page.extract_tables(table_settings)
                if all_tables:
                    print(
                        f"[SUCCESS] PDFplumber found {len(all_tables)} tables with strict settings")
                    for i, table in enumerate(all_tables):
                        if table and len(table) > 1:  # Must have at least 2 rows
                            print(
                                f"PDFplumber table {i}: {len(table)} rows, {len(table[0]) if table else 0} cols")
                            # Only add if we don't already have this data
                            if not _is_similar_table(table, tables):
                                tables.append(table)

                # Method 2: Try looser settings if strict didn't work well
                if len(tables) == 0:
                    print("[INFO] Trying pdfplumber with looser settings...")
                    loose_settings = {
                        "vertical_strategy": "text",
                        "horizontal_strategy": "text",
                        "snap_tolerance": 5,
                        "join_tolerance": 5,
                        "edge_min_length": 3,
                        "min_words_vertical": 2,
                        "min_words_horizontal": 1
                    }

                    loose_tables = page.extract_tables(loose_settings)
                    if loose_tables:
                        print(
                            f"[SUCCESS] PDFplumber found {len(loose_tables)} tables with loose settings")
                        for i, table in enumerate(loose_tables):
                            if table and len(table) > 1:
                                print(
                                    f"PDFplumber loose table {i}: {len(table)} rows, {len(table[0]) if table else 0} cols")
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
    """Clean and normalize mapped row data without over-processing."""
    cleaned = {}

    for header in flat_headers:
        cell_value = mapped.get(header, "")

        # Clean the cell value
        if cell_value:
            # Replace newlines with spaces and normalize whitespace
            cleaned_value = re.sub(
                r'\s+', ' ', str(cell_value).replace('\n', ' ').replace('\r', ' ')).strip()

            # Handle special cases for financial data
            if cleaned_value:
                # Fix common formatting issues in financial data
                cleaned_value = re.sub(
                    # (123) -> -123
                    r'^\((\d+[\d,]*\.?\d*)\)$', r'-\1', cleaned_value)
                cleaned_value = re.sub(
                    r'^Rs\.?\s*', '', cleaned_value)  # Remove Rs. prefix
                cleaned_value = re.sub(
                    r'₹\s*', '', cleaned_value)  # Remove ₹ prefix

            cleaned[header] = cleaned_value
        else:
            cleaned[header] = ""

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

    # Common header patterns for insurance forms
    header_patterns = [
        'particulars', 'current', 'previous', 'amount', 'balance',
        'quarter', 'year', 'period', 'value', 'total', 'item',
        'description', 'name', 'type', 'category', 'details'
    ]

    for i, row in enumerate(rows[:7]):  # Check first 7 rows
        if isinstance(row, str):
            row = _smart_split_row(row)

        # Convert to strings and clean
        row_clean = [str(c).strip().lower() if c else "" for c in row]

        # Skip empty rows
        if not any(cell for cell in row_clean):
            continue

        # Check if this row contains header-like terms
        header_matches = 0
        total_cells = len([cell for cell in row_clean if cell])

        for cell in row_clean:
            if cell and len(cell) > 1:  # Ignore single characters
                # Check against template headers (fuzzy matching)
                for header in flat_headers:
                    if header and (
                        normalize_text(header).lower() in cell or
                        cell in normalize_text(header).lower() or
                        _fuzzy_header_match(cell, header)
                    ):
                        header_matches += 1
                        break

                # Check against common header patterns
                if any(pattern in cell for pattern in header_patterns):
                    header_matches += 1

        # If majority of cells look like headers, this is likely the header row
        if total_cells > 0 and header_matches >= min(2, max(1, total_cells // 2)):
            print(
                f"Found header row at index {i}: {header_matches} matches out of {total_cells} cells")
            return i

    return -1  # No clear header row found


def _smart_split_row(row_str):
    """Intelligently split a row string into columns"""
    if not row_str:
        return []

    # Clean up the string first
    row_str = row_str.strip()

    # Try different splitting strategies
    # 1. Split by multiple spaces (3 or more for better precision)
    cols = re.split(r'\s{3,}', row_str)
    if len(cols) > 1:
        return [c.strip() for c in cols if c.strip()]

    # 2. Split by tabs
    cols = row_str.split('\t')
    if len(cols) > 1:
        return [c.strip() for c in cols if c.strip()]

    # 3. Split by pipes or vertical bars (common in PDFs)
    if '|' in row_str:
        cols = row_str.split('|')
        if len(cols) > 1:
            return [c.strip() for c in cols if c.strip()]

    # 4. Split by number-text boundaries (for financial data)
    # Look for patterns like: text...123,456 text...789,012
    cols = re.split(
        r'(?<=\d)\s{2,}(?=[A-Za-z])|(?<=[a-z])\s{2,}(?=\d)', row_str)
    if len(cols) > 1:
        return [c.strip() for c in cols if c.strip()]

    # 5. Split by financial number patterns
    # Match patterns like: 1,234.56 or (1,234) or 1,234-
    cols = re.split(
        r'\s+(?=(?:\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\(\d{1,3}(?:,\d{3})*\)|\d{1,3}(?:,\d{3})*\-))', row_str)
    if len(cols) > 1:
        return [c.strip() for c in cols if c.strip()]

    # 6. Split by common financial terms
    cols = re.split(r'\s+(?=Rs\.|₹|INR|USD|\$)', row_str)
    if len(cols) > 1:
        return [c.strip() for c in cols if c.strip()]

    # 7. If it's very long text, try to split on sentence boundaries
    if len(row_str) > 100:
        # Split on periods followed by space and capital letter
        cols = re.split(r'\.\s+(?=[A-Z])', row_str)
        if len(cols) > 1:
            return [c.strip() for c in cols if c.strip()]

    # 8. Last resort: single column
    return [row_str.strip()]


def _map_row_to_headers(cleaned_cells, flat_headers):
    """Map row cells to headers with intelligent column detection"""
    mapped = {}

    # Initialize all headers to empty
    for header in flat_headers:
        mapped[header] = ""

    if not cleaned_cells:
        return mapped

    # Clean cells and remove empty ones from the end
    valid_cells = []
    for cell in cleaned_cells:
        valid_cells.append(str(cell).strip() if cell is not None else "")

    # Remove trailing empty cells
    while valid_cells and not valid_cells[-1]:
        valid_cells.pop()

    if not valid_cells:
        return mapped

    print(f"Mapping {len(valid_cells)} cells to {len(flat_headers)} headers")

    # Strategy 1: Direct mapping if counts match or close
    if len(valid_cells) == len(flat_headers):
        for i, header in enumerate(flat_headers):
            mapped[header] = valid_cells[i]
        return mapped

    # Strategy 2: Handle more cells than headers
    if len(valid_cells) > len(flat_headers):
        print(
            f"More cells ({len(valid_cells)}) than headers ({len(flat_headers)})")

        # Check if first cell is description/particulars (common in financial tables)
        first_header = flat_headers[0] if flat_headers else ""
        if first_header and ("particular" in first_header.lower() or "description" in first_header.lower()):
            mapped[first_header] = valid_cells[0]

            # Distribute remaining cells to remaining headers
            remaining_cells = valid_cells[1:]
            remaining_headers = flat_headers[1:]

            if remaining_cells and remaining_headers:
                # If we have numeric data, try to align from right (common in financial data)
                if any(re.search(r'[\d,]+\.?\d*', cell) for cell in remaining_cells):
                    # Right-align numeric columns
                    cell_idx = len(remaining_cells) - 1
                    for header_idx in range(len(remaining_headers) - 1, -1, -1):
                        if cell_idx >= 0:
                            mapped[remaining_headers[header_idx]
                                   ] = remaining_cells[cell_idx]
                            cell_idx -= 1
                else:
                    # Left-align for non-numeric data
                    for i, header in enumerate(remaining_headers):
                        if i < len(remaining_cells):
                            mapped[header] = remaining_cells[i]
        else:
            # Distribute evenly
            for i, header in enumerate(flat_headers):
                if i < len(valid_cells):
                    mapped[header] = valid_cells[i]

        return mapped

    # Strategy 3: Handle fewer cells than headers
    if len(valid_cells) < len(flat_headers):
        print(
            f"Fewer cells ({len(valid_cells)}) than headers ({len(flat_headers)})")

        # Map from left for short rows (usually description only)
        for i, cell in enumerate(valid_cells):
            if i < len(flat_headers):
                mapped[flat_headers[i]] = cell

        return mapped

    return mapped


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
            flat_headers = ["Particulars", "Current_Year", "Previous_Year"]
            print(f"Using absolute fallback headers: {flat_headers}")

        results = []

        with pdfplumber.open(pdf_path) as pdf:
            print(f"PDF has {len(pdf.pages)} pages")

            # Track all tables found across pages
            all_tables_data = []

            for page_idx, page in enumerate(pdf.pages, start=1):
                print(f"\nProcessing page {page_idx}")
                text = page.extract_text() or ""

                if len(text) < 20:
                    print(
                        f"Page {page_idx} has very little text ({len(text)} chars), skipping...")
                    continue

                if is_table_of_contents_page(text):
                    print(
                        f"Skipping page {page_idx} - detected as table of contents")
                    continue

                # Extract metadata from this page
                meta = extract_metadata(text, template)
                print(
                    f"Extracted metadata: Form No='{meta.get('Form No', '')}', Title='{meta.get('Title', '')}', Currency='{meta.get('Currency', '')}'")

                # Extract tables from this page
                tables = extract_tables_from_page(pdf_path, page_idx)
                print(f"Found {len(tables)} tables on page {page_idx}")

                for table_idx, table in enumerate(tables):
                    # Need at least header + 1 data row
                    if not table or len(table) < 2:
                        continue

                    print(
                        f"Processing table {table_idx + 1}/{len(tables)} on page {page_idx}")
                    print(
                        f"Table dimensions: {len(table)} rows x {len(table[0]) if table else 0} cols")

                    # Enhanced table processing with proper row-to-header mapping
                    valid_rows = []

                    # Skip the first row if it looks like headers
                    start_row = 1 if _is_header_row(
                        table[0], flat_headers) else 0

                    for row_idx, row in enumerate(table[start_row:], start=start_row):
                        if not row or all(not str(cell).strip() for cell in row):
                            continue

                        # Clean and normalize row cells using helper function
                        cleaned_row = [_clean_extracted_value(
                            cell) for cell in row]

                        # Skip empty rows after cleaning
                        if not any(cell for cell in cleaned_row):
                            continue

                        # Map cells to headers intelligently
                        mapped_row = {}

                        # Handle different scenarios for row length vs header length
                        if len(cleaned_row) == len(flat_headers):
                            # Perfect match - direct mapping
                            for i, header in enumerate(flat_headers):
                                value = cleaned_row[i]
                                # Special handling for amount columns
                                if any(keyword in header.lower() for keyword in ['year', 'quarter', 'amount', 'total', 'business', 'renewal']):
                                    if value and any(c.isdigit() for c in value):
                                        value = _normalize_amount(value)
                                mapped_row[header] = value
                        elif len(cleaned_row) > len(flat_headers):
                            # More cells than headers - combine extras into appropriate columns
                            for i, header in enumerate(flat_headers[:-1]):
                                value = cleaned_row[i] if i < len(
                                    cleaned_row) else ""
                                # Special handling for amount columns
                                if any(keyword in header.lower() for keyword in ['year', 'quarter', 'amount', 'total', 'business', 'renewal']):
                                    if value and any(c.isdigit() for c in value):
                                        value = _normalize_amount(value)
                                mapped_row[header] = value

                            # Handle remaining cells - if they're all numbers, combine them
                            last_header = flat_headers[-1]
                            remaining_cells = cleaned_row[len(flat_headers)-1:]

                            # If remaining cells are numbers, combine as separate values
                            if all(cell and any(c.isdigit() for c in cell) for cell in remaining_cells if cell):
                                combined_value = " / ".join(_normalize_amount(cell)
                                                            for cell in remaining_cells if cell)
                            else:
                                combined_value = " | ".join(
                                    cell for cell in remaining_cells if cell)

                            mapped_row[last_header] = combined_value
                        else:
                            # Fewer cells than headers - fill what we can
                            for i, header in enumerate(flat_headers):
                                if i < len(cleaned_row):
                                    value = cleaned_row[i]
                                    # Special handling for amount columns
                                    if any(keyword in header.lower() for keyword in ['year', 'quarter', 'amount', 'total', 'business', 'renewal']):
                                        if value and any(c.isdigit() for c in value):
                                            value = _normalize_amount(value)
                                    mapped_row[header] = value
                                else:
                                    mapped_row[header] = ""

                        # Only add if row has meaningful data (not just empty or header-like)
                        if _is_valid_data_row(mapped_row, flat_headers):
                            valid_rows.append(mapped_row)
                            print(
                                f"Added data row: {mapped_row.get(flat_headers[0] if flat_headers else 'Particulars', 'N/A')[:50]}...")

                    # If we found valid data, create a result entry for this table
                    if valid_rows:
                        # Helper function to safely convert metadata to string
                        def safe_str(value):
                            if isinstance(value, list):
                                return ", ".join(str(v) for v in value) if value else ""
                            return str(value).strip() if value else ""

                        table_result = {
                            "Form No": safe_str(meta.get("Form No", "")),
                            "Title": safe_str(meta.get("Title", "")),
                            # Use title as insurer
                            "Insurer": safe_str(meta.get("Title", "")),
                            "Period": safe_str(meta.get("Period", "")),
                            "Currency": safe_str(meta.get("Currency", "")),
                            "PagesUsed": page_idx,
                            "Headers": flat_headers,  # Always use template headers
                            "Rows": valid_rows
                        }

                        # Add registration number if available
                        if meta.get("RegistrationNumber"):
                            table_result["RegistrationNumber"] = safe_str(
                                meta.get("RegistrationNumber", ""))

                        results.append(table_result)
                        print(
                            f"[OK] Created result entry with {len(valid_rows)} rows for page {page_idx}, table {table_idx + 1}")

        # If no results found, create a minimal structure
        if not results:
            print("[WARNING] No data extracted from any page!")
            results = [{
                "Form No": "",
                "Title": "No data extracted",
                "Insurer": "",
                "Period": "",
                "Currency": "",
                "PagesUsed": 0,
                "Headers": flat_headers,
                "Rows": []
            }]

        print(
            f"\nExtraction complete: {len(results)} result sections with data")

        # Save results
        output_path = Path(output_json)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

        return output_json

    except Exception as e:
        print(f"[ERROR] Extraction error: {e}")
        import traceback
        traceback.print_exc()

        # Create error result in expected format
        error_result = [{
            "Form No": "ERROR",
            "Title": f"Extraction failed: {str(e)}",
            "Insurer": "",
            "Period": "",
            "Currency": "",
            "PagesUsed": 0,
            "Headers": ["Particulars", "Current_Year", "Previous_Year"],
            "Rows": []
        }]

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
    """Get appropriate headers based on detected form type"""

    form_specific_headers = {
        "L-43": ["Meeting_Date", "Company_Name", "Meeting_Type", "Proposal", "Description", "Recommendation", "Vote", "Reason"],
        "L-44": ["Particulars", "Current_Year", "Previous_Year"],
        "L-32": ["Particulars", "Amount", "Percentage"],
        "L-1-A": ["Particulars", "Current_Quarter", "Previous_Quarter", "Current_Year", "Previous_Year"],
        "L-3-A": ["Particulars", "Current_Year", "Previous_Year"],
        "L-2-A": ["Particulars", "Current_Year", "Previous_Year"],
        "L-4": ["Particulars", "New_Business", "Renewal", "Total"],
        "L-5": ["Particulars", "Current_Quarter", "Previous_Quarter"],
    }

    return form_specific_headers.get(form_type, default_headers)


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
