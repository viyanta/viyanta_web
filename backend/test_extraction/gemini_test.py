#!/usr/bin/env python3
"""
gemini_test.py -- chunked correction mode

Examples:
  python gemini_test.py --template ../templates/hdfc/l-1-a-ra.json \
    --extracted l-1-a-ra_extracted-hdfc-v2.json \
    --pdf hdfc_pdf_splits_auto/L-1-A-RA_Revenue_Account_1-4_3_6.pdf \
    --output l-1-a-ra_hdfc_corrected.json

  python gemini_test.py --template ../templates/hdfc/l-1-a-ra.json \
    --extracted-dir extracted_jsons/ --pdf-dir pdf_splits_auto/ --output-dir corrected_jsons/
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
def extract_text_from_pdf(pdf_path: str, max_pages: int = 10) -> str:
    t = []
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        logging.error(f"Failed to open PDF {pdf_path}: {e}")
        return ""
    for i, page in enumerate(doc):
        if i >= max_pages:
            break
        try:
            t.append(page.get_text("text") or "")
        except Exception:
            t.append("")
    doc.close()
    return "\n".join(t)


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


def verify_and_correct_chunks(template_path: Path, extracted_path: Path, pdf_path: Path, output_path: Path,
                              model_name="gemini-1.5-pro", batch_size=30, max_pages=10, retries=5, backoff=5.0):
    logging.info(
        f"verify_and_correct_chunks: extracted={extracted_path} pdf={pdf_path}")

    with open(template_path, "r", encoding="utf-8") as f:
        template_json = json.load(f)

    with open(extracted_path, "r", encoding="utf-8") as f:
        extracted_json = json.load(f)

    # Combine rows if extracted_json is a list of page-level objects
    if isinstance(extracted_json, list):
        combined_rows = []
        first_meta = extracted_json[0] if extracted_json else {}
        for page_obj in extracted_json:
            if isinstance(page_obj, dict) and "Rows" in page_obj:
                combined_rows.extend(page_obj.get("Rows", []))
    elif isinstance(extracted_json, dict):
        combined_rows = extracted_json.get("Rows", []) or []
        first_meta = extracted_json
    else:
        raise ValueError("Unsupported extracted.json structure")

    logging.info(f"Total rows found to correct: {len(combined_rows)}")

    # Decide flat_headers: prefer template FlatHeaders, fallback to extracted / meta
    flat_headers = template_json.get(
        "FlatHeaders") or first_meta.get("FlatHeaders") or []
    if not flat_headers:
        logging.error(
            "FlatHeaders not found in template or extracted metadata. Aborting.")
        raise ValueError("FlatHeaders missing")

    # PDF excerpt
    pdf_text = extract_text_from_pdf(str(pdf_path), max_pages=max_pages)
    if not pdf_text:
        logging.warning(
            "PDF text extraction returned empty; continuing but results may be limited.")
    pdf_excerpt = pdf_text[:20000]  # keep excerpt length reasonable

    corrected_rows_all = []
    chunk_count = 0

    model = genai.GenerativeModel(model_name)

    # Try using generation_config response_mime_type if supported
    support_response_mime = True
    tried_response_mime = False

    for idx, chunk in enumerate(chunkify(combined_rows, batch_size), start=1):
        chunk_count += 1
        logging.info(f"Processing chunk {idx} ({len(chunk)} rows) ...")
        prompt = make_chunk_prompt(
            template_json, flat_headers, chunk, pdf_excerpt)

        last_raw = None
        success = False

        for attempt in range(1, retries + 1):
            logging.info(f" Chunk {idx} attempt {attempt}/{retries}")
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
                logging.error(f" Gemini call failed for chunk {idx}: {e}")

                # Check for specific API overload conditions
                if "overloaded" in error_msg or "503" in error_msg or "unavailable" in error_msg:
                    if attempt < retries:
                        # Use exponential backoff with jitter for API overload
                        import random
                        sleep = backoff * (2 ** (attempt - 1)) + \
                            random.uniform(1, 5)
                        logging.info(
                            f" API overloaded. Sleeping {sleep:.1f}s then retry...")
                        time.sleep(sleep)
                        continue
                elif "429" in error_msg or "quota" in error_msg:
                    if attempt < retries:
                        # Longer wait for quota issues
                        sleep = backoff * (3 ** (attempt - 1)) + 10
                        logging.info(
                            f" Quota exceeded. Sleeping {sleep:.1f}s then retry...")
                        time.sleep(sleep)
                        continue
                else:
                    if attempt < retries:
                        sleep = backoff * (2 ** (attempt - 1))
                        logging.info(f" Sleeping {sleep:.1f}s then retry...")
                        time.sleep(sleep)
                        continue

                # If this is the last attempt, continue with fallback
                if attempt == retries:
                    logging.error(
                        f"All attempts failed for chunk {idx}. Using fallback cleanup.")
                    break

            raw = getattr(resp, "text", None)
            if raw is None:
                raw = str(resp)

            last_raw = raw
            prefix = f"gemini_{extracted_path.stem}_chunk{idx}"
            save_raw_response(raw, prefix)

            # try parse
            try:
                parsed = parse_json_with_fallback(raw, prefix)
            except Exception as e:
                logging.warning(
                    f" parse_json_with_fallback failed for chunk {idx} attempt {attempt}: {e}")
                if attempt < retries:
                    sleep = backoff * (2 ** (attempt - 1))
                    logging.info(f" Sleeping {sleep:.1f}s then retry...")
                    time.sleep(sleep)
                    continue
                else:
                    logging.error(
                        f"All attempts failed for chunk {idx}. Using best-effort cleanup of last raw and moving on.")
                    # best-effort: try heuristics one last time
                    try:
                        candidate = strip_code_fence(raw)
                        candidate2 = heuristically_fix_json(candidate)
                        parsed = json.loads(candidate2)
                    except Exception as e2:
                        logging.error(
                            f" Final heuristics failed for chunk {idx}: {e2}. Will append original rows unchanged.")
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
                    f"Appended original cleaned chunk {idx} (no valid corrected rows returned).")
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

            # Save progress after each successful chunk
            if idx % 5 == 0 or idx == 1:  # Save every 5 chunks and first chunk
                progress_file = output_path.with_name(
                    f"{output_path.stem}_progress_{idx}.json")
                temp_output = {
                    "Form No": first_meta.get("Form No", ""),
                    "Title": first_meta.get("Title", ""),
                    "Registration Number": first_meta.get("Registration Number", ""),
                    "Period": first_meta.get("Period", ""),
                    "Pages": first_meta.get("Pages", ""),
                    "Currency": first_meta.get("Currency", ""),
                    "FlatHeaders": flat_headers,
                    "Rows": corrected_rows_all,
                    "_progress": {"chunks_completed": idx, "total_chunks_estimated": len(list(chunkify(combined_rows, batch_size)))}
                }
                with open(progress_file, "w", encoding="utf-8") as pf:
                    json.dump(temp_output, pf, indent=2, ensure_ascii=False)
                logging.info(f"Progress saved to {progress_file}")

            break

        if not success:
            logging.error(
                f"Chunk {idx} ultimately failed after retries; original rows appended cleaned.")
            for r in chunk:
                cleaned_row = {h: (str(r.get(h, "")).replace(
                    "\n", " ").strip()) for h in flat_headers}
                corrected_rows_all.append(cleaned_row)

    # Build final output object
    allowed_keys = {"Form No", "Title", "Registration Number",
                    "Period", "Pages", "Currency", "FlatHeaders", "Rows"}

    final_meta = {}
    # Try to fill from extracted first_meta, then template
    final_meta["Form No"] = first_meta.get("Form No") or first_meta.get(
        "Form") or template_json.get("Form") or ""
    final_meta["Title"] = first_meta.get(
        "Title") or template_json.get("Title") or ""
    final_meta["Registration Number"] = first_meta.get(
        "RegistrationNumber") or first_meta.get("Registration Number") or ""
    final_meta["Period"] = first_meta.get(
        "Period") or template_json.get("Period") or ""
    # Pages: try extracted meta or count pages in PDF if required (we keep extracted if present)
    final_meta["Pages"] = first_meta.get(
        "Pages") or first_meta.get("PagesUsed") or ""
    final_meta["Currency"] = first_meta.get(
        "Currency") or template_json.get("Currency") or ""

    final_meta["FlatHeaders"] = flat_headers
    final_meta["Rows"] = corrected_rows_all

    # Save final JSON but strictly keep only allowed keys (and canonical names)
    output_obj = {
        "Form No": final_meta["Form No"],
        "Title": final_meta["Title"],
        "Registration Number": final_meta["Registration Number"],
        "Period": final_meta["Period"],
        "Pages": final_meta["Pages"],
        "Currency": final_meta["Currency"],
        "FlatHeaders": final_meta["FlatHeaders"],
        "Rows": final_meta["Rows"],
    }

    with open(output_path, "w", encoding="utf-8") as outf:
        json.dump(output_obj, outf, indent=2, ensure_ascii=False)

    logging.info(
        f"Final corrected JSON saved to {output_path} (rows: {len(corrected_rows_all)})")
    return str(output_path)


# ---------- CLI ----------
def main():
    parser = argparse.ArgumentParser(
        description="Gemini chunked verifier/corrector for extracted JSON")
    parser.add_argument("--template", required=True, help="Template JSON path")
    parser.add_argument("--extracted", help="Extracted JSON path (single)")
    parser.add_argument("--pdf", help="Split PDF path (single)")
    parser.add_argument("--output", help="Output corrected JSON path (single)")
    parser.add_argument("--extracted-dir",
                        help="Directory with extracted JSONs (batch)")
    parser.add_argument("--pdf-dir", help="Directory with split PDFs (batch)")
    parser.add_argument(
        "--output-dir", help="Directory to write corrected JSONs (batch)")
    parser.add_argument("--model", default="gemini-1.5-pro",
                        help="Gemini model name")
    parser.add_argument("--retries", type=int, default=5,
                        help="Retries per chunk")
    parser.add_argument("--backoff", type=float, default=5.0,
                        help="Base backoff time in seconds")
    parser.add_argument("--batch-size", type=int,
                        default=20, help="Rows per Gemini call (reduced for stability)")
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
        if not extracted_path.exists() or not pdf_path.exists():
            logging.critical("Extracted or PDF file not found.")
            sys.exit(2)
        output_path = Path(args.output) if args.output else extracted_path.with_name(
            extracted_path.stem + "_corrected.json")
        verify_and_correct_chunks(template_path, extracted_path, pdf_path, output_path,
                                  model_name=args.model, batch_size=args.batch_size, max_pages=args.max_pages, retries=args.retries, backoff=args.backoff)
    elif args.extracted_dir and args.pdf_dir:
        extracted_dir = Path(args.extracted_dir)
        pdf_dir = Path(args.pdf_dir)
        out_dir = Path(args.output_dir) if args.output_dir else Path(
            "corrected_jsons")
        out_dir.mkdir(parents=True, exist_ok=True)
        for extracted_file in sorted(extracted_dir.glob("*.json")):
            # find matching PDF by filename heuristics
            stem = extracted_file.stem
            matched_pdf = None
            # exact match
            for p in pdf_dir.glob("*.pdf"):
                if p.stem.lower().startswith(stem.lower()):
                    matched_pdf = p
                    break
            if not matched_pdf:
                logging.warning(
                    f"No PDF matched for {extracted_file.name}; skipping.")
                continue
            outpath = out_dir / (extracted_file.stem + "_corrected.json")
            verify_and_correct_chunks(template_path, extracted_file, matched_pdf, outpath,
                                      model_name=args.model, batch_size=args.batch_size, max_pages=args.max_pages, retries=args.retries, backoff=args.backoff)
    else:
        parser.print_help()
        sys.exit(2)


if __name__ == "__main__":
    main()
