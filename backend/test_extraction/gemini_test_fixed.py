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
    Prompt instructs Gemini to correct only the provided chunk of rows.
    Gemini should return a JSON object with key "Rows" containing corrected rows (with same order).
    """
    prompt = f"""
You are given:
- TEMPLATE JSON (describes FlatHeaders):
{json.dumps(template_json, ensure_ascii=False, indent=2)}

- FLAT HEADERS (exact order must be preserved):
{json.dumps(flat_headers, ensure_ascii=False)}

- CHUNK OF EXTRACTED ROWS (array). Each row is an object mapping header->value, but values may be wrong, merged, or multiline:
{json.dumps(chunk_rows, ensure_ascii=False, indent=2)}

- PDF TEXT (excerpt). Use it as ground truth for corrections:
{pdf_excerpt}

Task (strict):
- For every row in the CHUNK OF EXTRACTED ROWS, correct any missing/wrong/merged values by verifying against the PDF excerpt.
- Do NOT invent values not present in the PDF. If you cannot find a correction, keep the original value (but clean formatting).
- Ensure each returned row:
  * has exactly the SAME keys as FLAT HEADERS (all keys present in same order),
  * each cell contains a SINGLE clean value (no newlines, no multiple numbers per cell),
  * numeric values preserve commas, parentheses and negative signs as in PDF,
  * empty or unknown values should be empty string "".
- Return ONLY a JSON object with a single top-level key "Rows" whose value is the corrected array of row objects.
- Do NOT output any commentary or extra fields or markdown fences — output pure JSON only.

Respond now with that JSON only.
"""
    return prompt


def correct_single_page(template_json, page_obj, pdf_path, pdf_page_num, model_name="gemini-2.0-flash",
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

            # if parsed is dict with "Rows"
            if isinstance(parsed, dict) and "Rows" in parsed:
                rows_chunk = parsed["Rows"]
            elif isinstance(parsed, list):
                # Gemini returned array directly
                rows_chunk = parsed
            elif isinstance(parsed, dict) and all(isinstance(v, dict) for v in parsed.get("Rows", [])):
                rows_chunk = parsed.get("Rows", [])
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

    logging.info(
        f"Page {page_num} correction completed: {len(corrected_rows_all)} rows")
    return corrected_page


def verify_and_correct_multipage(template_path: Path, extracted_path: Path, pdf_path: Path, output_path: Path,
                                 model_name="gemini-2.0-flash", batch_size=20, max_pages=10, retries=5, backoff=5.0):
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

    logging.info(f"Final corrected JSON saved to {output_path}")
    return str(output_path)


# ---------- CLI ----------
def main():
    parser = argparse.ArgumentParser(
        description="Gemini chunked verifier/corrector for extracted JSON with proper multi-page support")
    parser.add_argument("--template", required=True, help="Template JSON path")
    parser.add_argument("--extracted", help="Extracted JSON path (single)")
    parser.add_argument("--pdf", help="Split PDF path (single)")
    parser.add_argument("--output", help="Output corrected JSON path (single)")
    parser.add_argument("--model", default="gemini-2.0-flash",
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