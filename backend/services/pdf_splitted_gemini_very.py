#!/usr/bin/env python3
"""
gemini_test_fixed.py -- chunked correction mode with proper multi-page support

This version preserves the original page structure instead of combining all pages.
"""

import os
import sys
import time
import json
import re
import logging
import argparse
from pathlib import Path
from dotenv import load_dotenv

import fitz  # PyMuPDF
import google.generativeai as genai

# optional repair libs
try:
    from json_repair import repair_json as json_repair
except Exception:
    json_repair = None

try:
    import demjson3 as demjson
except Exception:
    demjson = None

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler(
        "gemini_debug.log", encoding="utf-8"), logging.StreamHandler(sys.stdout)]
)

# Load API key
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    logging.critical(
        "GEMINI_API_KEY not found in .env. Add GEMINI_API_KEY=... and rerun.")
    sys.exit(1)
genai.configure(api_key=API_KEY)


# ---------- Utilities ----------
def extract_text_from_pdf_page(pdf_path: str, page_num: int) -> str:
    """Extract text from a specific page of the PDF"""
    try:
        doc = fitz.open(pdf_path)
        if page_num >= len(doc):
            logging.warning(
                f"Page {page_num} not found in PDF (total pages: {len(doc)})")
            doc.close()
            return ""

        page = doc[page_num]
        text = page.get_text("text") or ""
        doc.close()
        return text
    except Exception as e:
        logging.error(f"Failed to extract text from PDF page {page_num}: {e}")
        return ""


def save_raw_response(raw_text: str, prefix: str):
    fname = f"{prefix}_raw.txt"
    with open(fname, "w", encoding="utf-8") as f:
        f.write(raw_text)
    logging.info(f"Saved raw Gemini response to {fname}")


def strip_code_fence(text: str) -> str:
    text = text.strip()
    m = re.search(r"```(?:json)?\s*(.*?)```", text, flags=re.S | re.I)
    if m:
        return m.group(1).strip()
    # fallback: extract first balanced JSON object if present
    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last != -1 and last > first:
        return text[first:last + 1]
    return text


def heuristically_fix_json(s: str) -> str:
    # common fixes
    s = s.replace("\u201c", '"').replace("\u201d", '"').replace(
        "\u2018", "'").replace("\u2019", "'")
    s = s.strip()
    s = re.sub(r",\s*([}\]])", r"\1", s)  # trailing commas
    # try to fix repeated double-quotes
    s = s.replace('""', '"')
    # add missing closing braces/brackets naive
    open_braces = s.count("{") - s.count("}")
    if open_braces > 0:
        s += "}" * open_braces
    open_brackets = s.count("[") - s.count("]")
    if open_brackets > 0:
        s += "]" * open_brackets
    return s


def parse_json_with_fallback(raw_text: str, prefix: str):
    # 1. strip fences
    candidate = strip_code_fence(raw_text)
    save_raw_response(candidate, prefix)

    # 2. try normal json
    try:
        return json.loads(candidate)
    except Exception as e:
        logging.warning(f"Direct json.loads failed: {e}")

    # 3. heuristic fix
    try:
        cand2 = heuristically_fix_json(candidate)
        return json.loads(cand2)
    except Exception as e:
        logging.warning(f"Heuristic json.loads failed: {e}")

    # 4. json_repair if available
    if json_repair:
        try:
            repaired = json_repair(candidate)
            return json.loads(repaired)
        except Exception as e:
            logging.warning(f"json_repair failed: {e}")

    # 5. demjson
    if demjson:
        try:
            return demjson.decode(candidate)
        except Exception as e:
            logging.warning(f"demjson failed: {e}")

    # 6. try to parse largest balanced substring
    first = candidate.find("{")
    last = candidate.rfind("}")
    if first != -1 and last != -1 and last > first:
        sub = candidate[first:last + 1]
        try:
            return json.loads(heuristically_fix_json(sub))
        except Exception:
            pass

    raise ValueError(
        "Unable to parse / repair JSON from Gemini response. Inspect raw file.")


# ---------- Core chunked workflow ----------
def chunkify(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i:i + n]


def make_chunk_prompt(template_json, flat_headers, chunk_rows, pdf_excerpt):
    """
    Ultra-comprehensive prompt that ensures perfect PDF-to-JSON matching with header correction and metadata extraction.
    """
    prompt = f"""
You are an expert financial data extraction and correction specialist. Your mission is to create a PERFECT match between the PDF content and the extracted JSON data.

**GIVEN DATA:**

1. **TEMPLATE STRUCTURE** (reference only - may be incorrect):
{json.dumps(template_json, ensure_ascii=False, indent=2)}

2. **CURRENT FLAT HEADERS** (may need correction):
{json.dumps(flat_headers, ensure_ascii=False)}

3. **EXTRACTED ROWS** (incomplete/incorrect data to be fixed):
{json.dumps(chunk_rows, ensure_ascii=False, indent=2)}

4. **ORIGINAL PDF CONTENT** (ABSOLUTE TRUTH - use this to correct everything):
{pdf_excerpt}

**🎯 ULTIMATE MISSION: PERFECT PDF-JSON SYNCHRONIZATION**

**📋 STEP 1: PDF CONTENT FORENSIC ANALYSIS**
- Scan EVERY character, number, symbol, table, and text in the PDF
- Identify the EXACT table structure: number of columns, header names, data rows
- Extract ALL form metadata: Form Number, Company Title, Registration Number, Period, Currency
- Map every piece of data to its precise location and context
- Note ALL formatting: commas, parentheses, dashes, decimals, percentages

**🔧 STEP 2: HEADER CORRECTION & VALIDATION**
- Compare PDF table headers with current flat_headers
- If PDF headers differ from template headers, CORRECT them to match PDF exactly
- If PDF has more/fewer columns than template, ADJUST the structure accordingly
- Ensure header names match PDF exactly (case, spacing, special characters)
- Create corrected header list that perfectly matches the PDF table structure

**📊 STEP 3: FORM METADATA EXTRACTION**
- Extract Form Number (e.g., "L-3", "L-28", etc.) from PDF text
- Extract Company Title/Name from PDF content
- Extract Registration Number from PDF text
- Extract Period information (date ranges, "As at", "For the period ended")
- Extract Currency unit ("in Lakhs", "in Crores", etc.)

**🔍 STEP 4: COMPLETE DATA RECOVERY**
- Find ALL table rows that exist in PDF but missing from extracted data
- Recover ALL financial figures, particulars, and data points from PDF
- Add missing rows with correct data in proper column positions
- Ensure NO data from PDF is omitted or overlooked
- Cross-reference every PDF table cell with extracted JSON

**✅ STEP 5: PRECISION DATA CORRECTION**
- Fix ALL incorrect numbers, text, or misplaced data
- Correct column misalignments (move data to correct headers)
- Preserve EXACT PDF formatting: "1,23,456", "(123)", "-", etc.
- Match text case, spelling, punctuation exactly as in PDF
- Ensure each cell contains only ONE clean value (no merged data)

**🎯 CRITICAL SUCCESS CRITERIA:**
❌ ZERO tolerance for missing PDF data
❌ ZERO tolerance for incorrect values or wrong formatting
❌ ZERO tolerance for column misalignments
❌ ZERO tolerance for wrong headers when PDF differs from template
✅ Headers MUST match PDF table structure exactly
✅ ALL PDF data MUST be captured in JSON
✅ Formatting MUST preserve PDF appearance exactly
✅ Structure MUST adapt to PDF reality, not template assumptions

** MANDATORY OUTPUT FORMAT:**
You MUST return a JSON object with these exact keys:

{{
  "FormInfo": {{
    "Form No": "extracted form number from PDF",
    "Title": "extracted company title from PDF", 
    "RegistrationNumber": "extracted registration info from PDF",
    "Period": "extracted period/date from PDF",
    "Currency": "extracted currency unit from PDF"
  }},
  "CorrectedHeaders": ["header1", "header2", "header3"],
  "Rows": [
    {{"header1": "value1", "header2": "value2"}},
    {{"header1": "value1", "header2": "value2"}}
  ]
}}

**⚠️ CRITICAL INSTRUCTIONS:**
- FormInfo MUST contain metadata extracted from PDF content
- CorrectedHeaders MUST match PDF table structure exactly
- Rows MUST use CorrectedHeaders as keys
- Every row MUST have all CorrectedHeaders keys (empty string if no data)
- NO explanations, comments, or markdown fences
- ONLY return the JSON object

**🚀 EXECUTE PERFECT PDF-TO-JSON TRANSFORMATION NOW:**
"""
    return prompt


def correct_single_page(template_json, page_obj, pdf_path, pdf_page_num, model_name="gemini-1.5-pro",
                        batch_size=20, retries=5, backoff=5.0, page_num=1,
                        extracted_path_stem="extracted"):
    """
    Corrects a single page object using Gemini with page-specific PDF content.
    Returns a corrected page object with the same structure as input.
    """

    rows = page_obj.get("Rows", [])
    if not rows:
        logging.warning(f"Page {page_num} has no rows to correct")
        return page_obj

    flat_headers = template_json.get(
        "FlatHeaders") or page_obj.get("FlatHeaders") or []
    if not flat_headers:
        logging.error(f"FlatHeaders not found for page {page_num}")
        return page_obj

    # Extract text from the specific PDF page
    pdf_text = extract_text_from_pdf_page(pdf_path, pdf_page_num)
    if not pdf_text:
        logging.warning(
            f"PDF text extraction returned empty for page {pdf_page_num}; continuing but results may be limited.")

    pdf_excerpt = pdf_text[:20000]  # keep excerpt length reasonable
    logging.info(
        f"Using PDF page {pdf_page_num} content for JSON page {page_num}")

    corrected_rows_all = []

    # Store corrected metadata and headers (will be updated by first successful chunk)
    final_form_info = None
    final_corrected_headers = None

    model = genai.GenerativeModel(model_name)

    # Try using generation_config response_mime_type if supported
    support_response_mime = True
    tried_response_mime = False

    logging.info(
        f"Processing page {page_num} with {len(rows)} rows in chunks of {batch_size}")

    for idx, chunk in enumerate(chunkify(rows, batch_size), start=1):
        logging.info(f" Page {page_num}, chunk {idx} ({len(chunk)} rows) ...")
        prompt = make_chunk_prompt(
            template_json, flat_headers, chunk, pdf_excerpt)

        last_raw = None
        success = False

        for attempt in range(1, retries + 1):
            logging.info(
                f"  Page {page_num}, chunk {idx} attempt {attempt}/{retries}")
            try:
                if not tried_response_mime and support_response_mime:
                    tried_response_mime = True
                    try:
                        resp = model.generate_content(prompt, generation_config={
                                                      "response_mime_type": "application/json"})
                    except Exception as e:
                        logging.warning(
                            f"SDK doesn't support response_mime_type: {e}")
                        support_response_mime = False
                        resp = model.generate_content(prompt)
                else:
                    resp = model.generate_content(prompt)

            except Exception as e:
                error_msg = str(e).lower()
                logging.error(
                    f"  Gemini call failed for page {page_num} chunk {idx}: {e}")

                # Check for specific API overload conditions
                if "overloaded" in error_msg or "503" in error_msg or "unavailable" in error_msg:
                    if attempt < retries:
                        # Use exponential backoff with jitter for API overload
                        import random
                        sleep = backoff * (2 ** (attempt - 1)) + \
                            random.uniform(1, 5)
                        logging.info(
                            f"  API overloaded. Sleeping {sleep:.1f}s then retry...")
                        time.sleep(sleep)
                        continue
                elif "429" in error_msg or "quota" in error_msg:
                    if attempt < retries:
                        # Longer wait for quota issues
                        sleep = backoff * (3 ** (attempt - 1)) + 10
                        logging.info(
                            f"  Quota exceeded. Sleeping {sleep:.1f}s then retry...")
                        time.sleep(sleep)
                        continue
                else:
                    if attempt < retries:
                        sleep = backoff * (2 ** (attempt - 1))
                        logging.info(f"  Sleeping {sleep:.1f}s then retry...")
                        time.sleep(sleep)
                        continue

                # If this is the last attempt, continue with fallback
                if attempt == retries:
                    logging.error(
                        f"All attempts failed for page {page_num} chunk {idx}. Using fallback cleanup.")
                    break

            raw = getattr(resp, "text", None)
            if raw is None:
                raw = str(resp)

            last_raw = raw
            prefix = f"gemini_{extracted_path_stem}_page{page_num}_chunk{idx}"
            save_raw_response(raw, prefix)

            # try parse
            try:
                parsed = parse_json_with_fallback(raw, prefix)
            except Exception as e:
                logging.warning(
                    f"  parse_json_with_fallback failed for page {page_num} chunk {idx} attempt {attempt}: {e}")
                if attempt < retries:
                    sleep = backoff * (2 ** (attempt - 1))
                    logging.info(f"  Sleeping {sleep:.1f}s then retry...")
                    time.sleep(sleep)
                    continue
                else:
                    logging.error(
                        f"All attempts failed for page {page_num} chunk {idx}. Using best-effort cleanup of last raw and moving on.")
                    # best-effort: try heuristics one last time
                    try:
                        candidate = strip_code_fence(raw)
                        candidate2 = heuristically_fix_json(candidate)
                        parsed = json.loads(candidate2)
                    except Exception as e2:
                        logging.error(
                            f"  Final heuristics failed for page {page_num} chunk {idx}: {e2}. Will append original rows unchanged.")
                        parsed = None

            # Parse the enhanced response with FormInfo and CorrectedHeaders
            form_info = None
            corrected_headers = None

            # Extract FormInfo and CorrectedHeaders if present
            if isinstance(parsed, dict):
                if "FormInfo" in parsed:
                    form_info = parsed["FormInfo"]
                    if final_form_info is None:  # Use first valid form info
                        final_form_info = form_info
                    logging.info(f"Extracted FormInfo: {form_info}")

                if "CorrectedHeaders" in parsed:
                    corrected_headers = parsed["CorrectedHeaders"]
                    if final_corrected_headers is None:  # Use first valid headers
                        final_corrected_headers = corrected_headers
                    logging.info(
                        f"Extracted CorrectedHeaders: {corrected_headers}")

                if "Rows" in parsed:
                    rows_chunk = parsed["Rows"]
                else:
                    rows_chunk = None
            elif isinstance(parsed, list):
                # Gemini returned array directly (fallback)
                rows_chunk = parsed
            else:
                rows_chunk = None

            if rows_chunk is None:
                # fallback: keep original chunk rows but cleaned (strip newlines)
                cleaned = []
                for r in chunk:
                    cleaned_row = {h: (str(r.get(h, "")).replace(
                        "\n", " ").strip()) for h in flat_headers}
                    cleaned.append(cleaned_row)
                corrected_rows_all.extend(cleaned)
                logging.warning(
                    f"Appended original cleaned chunk for page {page_num} chunk {idx} (no valid corrected rows returned).")
                success = True
                break

            # Ensure each row in rows_chunk has exact flat_headers keys; map/clean as needed
            normalized_rows = []
            for r in rows_chunk:
                # r might have keys with different case/spacing; map by header tokens
                if not isinstance(r, dict):
                    continue
                normalized = {}
                # Try direct mapping first
                for h in flat_headers:
                    if h in r:
                        val = r[h]
                    else:
                        # attempt relaxed match: lower, underscores, spaces
                        found = None
                        key_variants = {k.lower().replace(" ", "_").replace(
                            "-", "_"): k for k in r.keys()}
                        key_try = h.lower().replace(" ", "_").replace("-", "_")
                        if key_try in key_variants:
                            found = key_variants[key_try]
                            val = r.get(found, "")
                        else:
                            # fallback: empty
                            val = r.get(h, "")
                    if val is None:
                        val = ""
                    # stringify and clean internal newlines
                    val = str(val).replace("\n", " ").strip()
                    normalized[h] = val
                normalized_rows.append(normalized)

            corrected_rows_all.extend(normalized_rows)
            success = True
            break

        if not success:
            logging.error(
                f"Page {page_num} chunk {idx} ultimately failed after retries; original rows appended cleaned.")
            for r in chunk:
                cleaned_row = {h: (str(r.get(h, "")).replace(
                    "\n", " ").strip()) for h in flat_headers}
                corrected_rows_all.append(cleaned_row)

    # Create corrected page object with same structure as input
    corrected_page = page_obj.copy()
    corrected_page["Rows"] = corrected_rows_all

    # Apply corrected metadata and headers if Gemini provided them
    if final_form_info:
        for key, value in final_form_info.items():
            corrected_page[key] = value
        logging.info(f"Applied corrected form metadata: {final_form_info}")

    if final_corrected_headers:
        corrected_page["FlatHeaders"] = final_corrected_headers
        logging.info(f"Applied corrected headers: {final_corrected_headers}")

    logging.info(
        f"Page {page_num} correction completed: {len(corrected_rows_all)} rows")
    return corrected_page


def verify_and_correct_multipage(template_path: Path, extracted_path: Path, pdf_path: Path, output_path: Path,
                                 model_name="gemini-1.5-pro", batch_size=20, max_pages=10, retries=5, backoff=5.0):
    """
    Corrects multi-page extracted JSON while preserving page structure.
    Uses page-specific PDF content for each JSON page.
    """
    logging.info(
        f"verify_and_correct_multipage: extracted={extracted_path} pdf={pdf_path}")

    with open(template_path, "r", encoding="utf-8") as f:
        template_json = json.load(f)

    with open(extracted_path, "r", encoding="utf-8") as f:
        extracted_json = json.load(f)

    # Handle both single page (dict) and multi-page (list) structures
    if isinstance(extracted_json, dict):
        # Single page structure - use page 0 from PDF
        logging.info("Processing single page structure")
        corrected_page = correct_single_page(
            template_json, extracted_json, str(pdf_path), 0, model_name,
            batch_size, retries, backoff, 1, extracted_path.stem
        )
        output_json = corrected_page

    elif isinstance(extracted_json, list):
        # Multi-page structure - process each page separately with corresponding PDF page
        logging.info(
            f"Processing multi-page structure with {len(extracted_json)} pages")
        corrected_pages = []

        for page_num, page_obj in enumerate(extracted_json, 1):
            if not isinstance(page_obj, dict):
                logging.warning(f"Page {page_num} is not a dict, skipping")
                corrected_pages.append(page_obj)
                continue

            # Use page_num-1 as PDF page index (0-based)
            pdf_page_index = page_num - 1
            logging.info(
                f"Processing JSON page {page_num} using PDF page {pdf_page_index}")

            corrected_page = correct_single_page(
                template_json, page_obj, str(
                    pdf_path), pdf_page_index, model_name,
                batch_size, retries, backoff, page_num, extracted_path.stem
            )
            corrected_pages.append(corrected_page)

            # Save progress after each page
            progress_file = output_path.with_name(
                f"{output_path.stem}_progress_page{page_num}.json")
            with open(progress_file, "w", encoding="utf-8") as pf:
                json.dump(corrected_pages, pf, indent=2, ensure_ascii=False)
            logging.info(f"Progress saved to {progress_file}")

        output_json = corrected_pages
    else:
        raise ValueError(
            "Unsupported extracted.json structure - must be dict or list")

    # Save final JSON
    with open(output_path, "w", encoding="utf-8") as outf:
        json.dump(output_json, outf, indent=2, ensure_ascii=False)

    # Perform comprehensive validation
    try:
        # Extract full PDF text for validation
        import fitz
        doc = fitz.open(str(pdf_path))
        full_pdf_text = ""
        for page in doc:
            full_pdf_text += page.get_text("text") + "\n"
        doc.close()

        # Validate the corrected data
        validation_report = validate_corrected_data(
            output_json, full_pdf_text, template_json, extracted_json)

        # Log validation results
        if validation_report["is_valid"]:
            logging.info(
                "✅ Validation PASSED: Corrected JSON meets quality standards")
        else:
            logging.warning("⚠️ Validation ISSUES found:")
            for issue in validation_report["issues"]:
                logging.warning(f"  - {issue}")

        if validation_report["warnings"]:
            logging.info("Validation warnings:")
            for warning in validation_report["warnings"]:
                logging.info(f"  - {warning}")

        # Log statistics
        stats = validation_report["stats"]
        logging.info(
            f"📊 Data Statistics: {stats['total_rows']} total rows, {stats['rows_with_data']} with data, {stats['numeric_values']} numeric values")

        # Save validation report
        validation_file = output_path.with_name(
            f"{output_path.stem}_validation.json")
        with open(validation_file, "w", encoding="utf-8") as vf:
            json.dump(validation_report, vf, indent=2, ensure_ascii=False)
        logging.info(f"Validation report saved to {validation_file}")

    except Exception as e:
        logging.error(f"Validation failed: {e}")

    logging.info(f"Final corrected JSON saved to {output_path}")
    return str(output_path)


def validate_corrected_data(corrected_json, pdf_text, template_json, extracted_json):
    """
    Comprehensive validation of corrected JSON against PDF content
    Returns validation report with issues found
    """
    validation_report = {
        "is_valid": True,
        "issues": [],
        "warnings": [],
        "stats": {
            "total_rows": 0,
            "rows_with_data": 0,
            "empty_cells": 0,
            "numeric_values": 0
        }
    }

    try:
        # Handle both single page and multi-page structures
        if isinstance(corrected_json, list):
            pages = corrected_json
        else:
            pages = [corrected_json]

        for page_idx, page_data in enumerate(pages):
            rows = page_data.get("Rows", [])
            flat_headers = page_data.get(
                "FlatHeaders", template_json.get("FlatHeaders", []))

            validation_report["stats"]["total_rows"] += len(rows)

            for row_idx, row in enumerate(rows):
                row_has_data = False

                # Check if row has all required headers
                missing_headers = set(flat_headers) - set(row.keys())
                if missing_headers:
                    validation_report["issues"].append(
                        f"Page {page_idx+1}, Row {row_idx+1}: Missing headers: {missing_headers}")
                    validation_report["is_valid"] = False

                # Check each cell
                for header in flat_headers:
                    cell_value = row.get(header, "")

                    if cell_value and cell_value.strip():
                        row_has_data = True

                        # Count numeric values
                        if re.search(r'\d', str(cell_value)):
                            validation_report["stats"]["numeric_values"] += 1
                    else:
                        validation_report["stats"]["empty_cells"] += 1

                if row_has_data:
                    validation_report["stats"]["rows_with_data"] += 1

                # Check for particulars column content
                particulars = row.get("Particulars", "")
                if particulars and len(particulars.strip()) > 100:
                    validation_report["warnings"].append(
                        f"Page {page_idx+1}, Row {row_idx+1}: Particulars field unusually long ({len(particulars)} chars)")

        # Validate against PDF content
        pdf_lower = pdf_text.lower()

        # Check for common financial terms that should be present
        expected_terms = ["total", "amount",
                          "profit", "loss", "income", "expense"]
        found_terms = []
        for term in expected_terms:
            if term in pdf_lower:
                found_terms.append(term)

        if len(found_terms) < 2:
            validation_report["warnings"].append(
                f"Few financial terms found in PDF content. Expected terms: {expected_terms}, Found: {found_terms}")

        # Compare row counts between original and corrected
        if isinstance(extracted_json, list):
            original_total_rows = sum(len(page.get("Rows", []))
                                      for page in extracted_json)
        else:
            original_total_rows = len(extracted_json.get("Rows", []))

        if validation_report["stats"]["total_rows"] < original_total_rows * 0.8:
            validation_report["issues"].append(
                f"Significant row count reduction: {validation_report['stats']['total_rows']} vs original {original_total_rows}")
            validation_report["is_valid"] = False

    except Exception as e:
        validation_report["issues"].append(f"Validation error: {str(e)}")
        validation_report["is_valid"] = False

    return validation_report


# ---------- CLI ----------
def main():
    parser = argparse.ArgumentParser(
        description="Gemini chunked verifier/corrector for extracted JSON with proper multi-page support")
    parser.add_argument("--template", required=True, help="Template JSON path")
    parser.add_argument("--extracted", help="Extracted JSON path (single)")
    parser.add_argument("--pdf", help="Split PDF path (single)")
    parser.add_argument("--output", help="Output corrected JSON path (single)")
    parser.add_argument("--model", default="gemini-1.5-pro",
                        help="Gemini model name")
    parser.add_argument("--retries", type=int, default=5,
                        help="Retries per chunk")
    parser.add_argument("--backoff", type=float, default=5.0,
                        help="Base backoff time in seconds")
    parser.add_argument("--batch-size", type=int,
                        default=20, help="Rows per Gemini call")
    parser.add_argument("--max-pages", type=int, default=10,
                        help="Pages to extract from PDF for context")
    args = parser.parse_args()

    template_path = Path(args.template)
    if not template_path.exists():
        logging.critical("Template not found: %s", template_path)
        sys.exit(2)

    if args.extracted and args.pdf:
        extracted_path = Path(args.extracted)
        pdf_path = Path(args.pdf)
        output_path = Path(args.output) if args.output else extracted_path.with_name(
            f"{extracted_path.stem}_corrected_multipage.json")

        if not extracted_path.exists():
            logging.critical("Extracted JSON not found: %s", extracted_path)
            sys.exit(2)
        if not pdf_path.exists():
            logging.critical("PDF not found: %s", pdf_path)
            sys.exit(2)

        verify_and_correct_multipage(
            template_path, extracted_path, pdf_path, output_path,
            model_name=args.model, batch_size=args.batch_size,
            max_pages=args.max_pages, retries=args.retries, backoff=args.backoff
        )
    else:
        logging.critical("Missing required arguments: --extracted and --pdf")
        sys.exit(2)


if __name__ == "__main__":
    main()
