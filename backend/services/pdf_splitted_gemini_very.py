#!/usr/bin/env python3
"""
Gemini PDF Single-Call Verifier v1.0

- Fast single-call correction
- Full debug logging
- Robust JSON parsing and repair
- Truncated PDF content for speed
"""

import json
import re
import os
import sys
import logging
import argparse
import time
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai
import fitz
import threading

# Optional JSON repair libraries
try:
    from json_repair import repair_json as json_repair
except ImportError:
    json_repair = None

try:
    import demjson3 as demjson
except ImportError:
    demjson = None

# ------------------ Logging ------------------
os.makedirs("logs", exist_ok=True)
log_lock = threading.Lock()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(threadName)s] [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("logs/gemini_single_call.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)


def thread_safe_log(level, message, *args):
    with log_lock:
        logging.log(level, message, *args)


def safe_info(msg, *args): thread_safe_log(logging.INFO, msg, *args)
def safe_warning(msg, *args): thread_safe_log(logging.WARNING, msg, *args)
def safe_error(msg, *args): thread_safe_log(logging.ERROR, msg, *args)


# ------------------ API ------------------
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    safe_error("GEMINI_API_KEY not found in .env")
    sys.exit(1)
genai.configure(api_key=API_KEY)

thread_local = threading.local()


def get_gemini_model(model_name="gemini-2.5-pro"):
    if not hasattr(thread_local, 'model'):
        thread_local.model = genai.GenerativeModel(model_name)
    return thread_local.model


# ------------------ PDF Utilities ------------------
# Remove limits for robust, full-data correction
MAX_PROMPT_SIZE = None  # No prompt size limit
MAX_ROWS = None  # No row limit


def extract_pdf_context(pdf_path: str, max_pages: int = None) -> str:
    try:
        doc = fitz.open(pdf_path)
        total_pages = len(doc)
        pages_to_extract = total_pages if max_pages is None else min(
            max_pages, total_pages)
        parts = []
        for i in range(pages_to_extract):
            text = doc[i].get_text("text") or ""
            if text.strip():
                parts.append(f"=== PAGE {i+1} ===\n{text}")
        doc.close()
        full_text = "\n\n".join(parts)
        if MAX_PROMPT_SIZE is not None and len(full_text) > MAX_PROMPT_SIZE:
            safe_warning(
                f"PDF content truncated from {len(full_text)} to {MAX_PROMPT_SIZE} chars")
            full_text = full_text[:MAX_PROMPT_SIZE] + "\n... [TRUNCATED]"
        else:
            if len(full_text) > 50000:
                safe_warning(
                    f"PDF content is very large ({len(full_text)} chars), Gemini may truncate internally.")
        safe_info(
            f"Extracted {len(parts)} pages from PDF (all pages included)")
        return full_text
    except Exception as e:
        safe_error(f"Failed to extract PDF: {e}")
        return ""

# ------------------ JSON Utilities ------------------


def strip_code_fence(text: str) -> str:
    text = text.strip()
    m = re.search(r"```(?:json)?\s*(.*?)```", text, flags=re.S | re.I)
    if m:
        return m.group(1).strip()
    first, last = text.find("{"), text.rfind("}")
    return text[first:last+1] if first != -1 and last != -1 else text


def heuristically_fix_json(s: str) -> str:
    s = s.replace("\u201c", '"').replace("\u201d", '"').replace(
        "\u2018", "'").replace("\u2019", "'").strip()
    s = re.sub(r'},\s*\n\s*{', '},\n    {', s)
    s = re.sub(r",\s*([}\]])", r"\1", s)
    s = s.replace('""', '"')
    s = re.sub(r'}\s*{', '},{', s)
    s = re.sub(r':\s*null(?=\s*[,}])', ': ""', s)
    return s


def parse_json_safely(s: str) -> dict:
    original_s = s
    for fn in [json.loads, lambda x: json.loads(strip_code_fence(x)), lambda x: json.loads(heuristically_fix_json(x))]:
        try:
            return fn(s)
        except:
            continue
    if json_repair:
        try:
            return json.loads(json_repair(s))
        except:
            pass
    if demjson:
        try:
            return demjson.decode(s)
        except:
            pass
    safe_warning(
        f"All JSON parsing failed (length={len(original_s)}), returning empty dict")
    return {}

# ------------------ Prompt ------------------


def create_single_call_prompt(template: dict, extracted, pdf_text: str) -> str:
    headers = list(template.get("data", [{}])[
                   0].keys()) if template.get("data") else []
    headers_str = ", ".join(f'"{h}"' for h in headers[:10])
    # Support both dict and list for extracted
    if isinstance(extracted, dict):
        extracted_data = extracted.get("data", [])
    elif isinstance(extracted, list):
        extracted_data = extracted
    else:
        extracted_data = []
    # No truncation: use all rows
    if MAX_ROWS is not None and len(extracted_data) > MAX_ROWS:
        safe_warning(
            f"Extracted data truncated from {len(extracted_data)} to {MAX_ROWS} rows for Gemini prompt")
        extracted_data = extracted_data[:MAX_ROWS]
    else:
        if len(extracted_data) > 1000:
            safe_warning(
                f"Extracted data is very large ({len(extracted_data)} rows), Gemini may truncate internally.")
    prompt = f"""
You are a financial data extraction and correction specialist.

Your job is to analyze and correct extracted JSON data using the actual PDF content below.

=== OBJECTIVE ===
- Identify and correct ALL incorrect, inconsistent, or missing values.
- If any part of the extracted JSON is empty or missing, FILL it using the PDF content.
- Follow the template structure and headers exactly.
- Maintain the same keys, order, and JSON structure.
- Use "" (empty string) when data is not found.
- Return ONLY the corrected JSON output (no explanations, no markdown).

HEADERS: {headers_str}

TEMPLATE STRUCTURE (first 2 rows):
```json
{json.dumps({"data": template.get("data", [])[:2]}, indent=2)}
```

PDF CONTENT (all pages):
{pdf_text}

EXTRACTED DATA:
```json
{json.dumps({"data": extracted_data}, indent=2)}
```

"" for missing data

Return ONLY JSON in this format: {{"data":[corrected_rows_here]}}"""
    safe_info(
        f"Prompt created (length={len(prompt)} chars, {len(extracted_data)} rows, PDF chars: {len(pdf_text)})")
    return prompt


def correct_with_gemini(template_path, extracted_path, pdf_path, output_path, model="gemini-2.5-pro"):
    start_time = time.time()
    with open(template_path, "r", encoding="utf-8") as f:
        template = json.load(f)
    with open(extracted_path, "r", encoding="utf-8") as f:
        extracted = json.load(f)
    pdf_text = extract_pdf_context(str(pdf_path))
    prompt = create_single_call_prompt(template, extracted, pdf_text)
    # Support both dict and list for extracted
    if isinstance(extracted, dict):
        extracted_data = extracted.get("data", [])
    elif isinstance(extracted, list):
        extracted_data = extracted
    else:
        extracted_data = []
    safe_info(f"Sending single prompt to Gemini ({len(extracted_data)} rows)")
    try:
        response = get_gemini_model(model).generate_content(prompt)
        corrected_json = parse_json_safely(
            response.text if response.text else "")
        if not corrected_json:
            safe_error("Gemini returned invalid JSON, using extracted data")
            corrected_json = {"data": extracted_data}
    except Exception as e:
        safe_error(f"Gemini API error: {e}")
        corrected_json = {"data": extracted_data}
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(corrected_json, f, indent=2, ensure_ascii=False)
    safe_info(
        f"✅ Single-call Gemini output saved: {output_path} in {round(time.time()-start_time, 2)}s")

# ------------------ CLI ------------------


def main():
    parser = argparse.ArgumentParser(
        description="Single-call Gemini PDF verifier")
    parser.add_argument("--template", required=True)
    parser.add_argument("--extracted", required=True)
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", default="gemini-2.5-pro")
    args = parser.parse_args()
    for path in [args.template, args.extracted, args.pdf]:
        if not Path(path).exists():
            safe_error(f"File not found: {path}")
            sys.exit(2)
    correct_with_gemini(Path(args.template), Path(args.extracted), Path(
        args.pdf), Path(args.output), model=args.model)


if __name__ == "__main__":
    main()
