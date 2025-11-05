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


def get_gemini_model(model_name="gemini-2.5-flash"):
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


def convert_pdf_to_images(pdf_path: str, max_pages: int = None) -> list:
    """
    Convert PDF pages to images for Gemini Vision API.
    Returns list of PIL Image objects.
    """
    try:
        from PIL import Image
        import io

        doc = fitz.open(pdf_path)
        total_pages = len(doc)
        pages_to_convert = total_pages if max_pages is None else min(
            max_pages, total_pages)

        images = []
        safe_info(
            f"Converting {pages_to_convert} PDF pages to images for Gemini Vision...")

        for page_num in range(pages_to_convert):
            page = doc[page_num]
            # Render page as image at high DPI for better quality
            # 200 DPI for good quality without huge file size
            pix = page.get_pixmap(dpi=200)

            # Convert to PIL Image
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))
            images.append(img)
            safe_info(
                f"Converted page {page_num + 1}/{pages_to_convert} to image")

        doc.close()
        safe_info(f"Successfully converted {len(images)} pages to images")
        return images

    except Exception as e:
        safe_error(f"Failed to convert PDF to images: {e}")
        return []


def check_if_pdf_has_text(pdf_path: str) -> bool:
    """Check if PDF has extractable text or is image-based."""
    try:
        doc = fitz.open(pdf_path)
        total_chars = 0
        sample_pages = min(3, len(doc))

        for i in range(sample_pages):
            text = doc[i].get_text("text") or ""
            total_chars += len(text.strip())

        doc.close()

        avg_chars = total_chars / max(sample_pages, 1)
        has_text = avg_chars > 50  # More than 50 chars per page on average

        safe_info(
            f"PDF text check: {total_chars} chars across {sample_pages} pages (avg: {avg_chars:.0f})")
        safe_info(
            f"PDF is {'TEXT-BASED' if has_text else 'IMAGE-BASED/SCANNED'}")

        return has_text
    except Exception as e:
        safe_error(f"Failed to check PDF text: {e}")
        return False


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

Your job is to analyze and correct extracted JSON data using ONLY the actual PDF content below.

=== CRITICAL RULES ===
1a. **NEVER miss ANY DATA** - Do not omit any rows or values present in the PDF
1. **NEVER ASSUME OR INVENT DATA** - Only use data that is explicitly visible in the PDF content
2. **NEVER FILL IN MISSING DATA WITH GUESSES** - If data is not in the PDF, leave it as "" (empty string)
3. **NEVER GENERATE PLACEHOLDER OR EXAMPLE DATA** - Every value must come from the actual PDF
4. **VERIFY EVERY SINGLE VALUE** - Cross-check each number, text, and cell against the PDF content
5. **IF PDF HAS NO DATA** - Return the structure with empty Rows: []
6. **DO NOT EXTRAPOLATE OR CALCULATE** - Only extract what is explicitly written
7. **Handle multiple tables**:
   - If the PDF has multiple tables, create separate data entries
   - Use TableIndex: 1, 2, 3, 4, etc.

=== OBJECTIVE ===
- Identify and correct ALL incorrect, inconsistent, or missing values using PDF content ONLY
- Do NOT miss any data from the PDF tables
- If any part of the extracted JSON is empty or missing, FILL it ONLY if the data exists in the PDF
- Follow the template structure and headers exactly
- If the template headers are **incorrect, incomplete, or mismatched**, you MUST:
   - Detect and correct them using the actual PDF table headers
   - Use the **exact PDF header text** (normalized and cleaned) to replace wrong ones
   - Maintain the same data structure — only correct the header names and their mapped values
   - Keep header order similar to the PDF table order if possible
- Maintain the same keys, order, and JSON structure
- Use "" (empty string) when data is not found in the PDF
- Use 0 for numeric fields (PagesUsed, TableIndex) when data is not found
- Return ONLY the corrected JSON output (no explanations, no markdown)

HEADERS: {headers_str}

TEMPLATE STRUCTURE (first 2 rows):
```json
{json.dumps({"data": template.get("data", [])[:2]}, indent=2)}
```

PDF CONTENT (all pages - THIS IS THE ONLY SOURCE OF TRUTH):
{pdf_text}

EXTRACTED DATA (may contain errors or be empty):
```json
{json.dumps({"data": extracted_data}, indent=2)}
```

**IMPORTANT**: 
- If the PDF content above is empty or has no tables, return {{"data": []}}
- If you cannot find specific data in the PDF, use "" for text fields and 0 for numbers
- Every row you return MUST have a corresponding entry in the PDF content above
- Do NOT create synthetic or example data

Return ONLY JSON in this format: {{
  "data": [
    {{
      "Form No": "",
      "Title": "",
      "RegistrationNumber": "",
      "Period": "",
      "Currency": "",
      "PagesUsed": 0,
      "TableIndex": 1,
      "FlatHeaders": [],
      "FlatHeadersNormalized": [],
      "Rows": [
        {{
          // Only include rows that exist in the PDF content above
        }}
      ]
    }}
  ]
}}"""
    safe_info(
        f"Prompt created (length={len(prompt)} chars, {len(extracted_data)} rows, PDF chars: {len(pdf_text)})")
    return prompt


def create_vision_extraction_prompt(template: dict, pdf_path: str) -> str:
    """
    Create a prompt for direct extraction from PDF images using Gemini Vision.
    This is used when standard extraction fails or PDF is image-based.
    """
    headers = list(template.get("data", [{}])[
                   0].keys()) if template.get("data") else []
    headers_str = ", ".join(f'"{h}"' for h in headers[:15])

    # Get template structure
    template_example = template.get(
        "data", [])[:1] if template.get("data") else []

    prompt = f"""
You are an expert financial data extraction specialist with vision capabilities.

Your task is to EXTRACT ALL DATA from the PDF images shown below and structure it as JSON.

=== CRITICAL RULES ===
1. **EXTRACT EVERYTHING YOU SEE** - Do not miss any data from tables, forms, or text
2. **BE THOROUGH AND COMPLETE** - Extract every single row, cell, and value visible
3. **NEVER ASSUME OR GUESS** - Only extract what you can actually see in the images
4. **PRESERVE EXACT VALUES** - Copy numbers, percentages, and text exactly as shown
5. **IF YOU SEE NO DATA** - Return {{"data": []}}
6. **VERIFY TABLE STRUCTURE** - Match headers to the template headers provided

=== EXPECTED DATA STRUCTURE ===

The data should follow this JSON structure:

```json
{json.dumps({"data": template_example}, indent=2)}
```

=== HEADERS TO EXTRACT ===
{headers_str}

=== EXTRACTION INSTRUCTIONS ===

1. **Look at the PDF images carefully** - Identify all tables, forms, and data sections
2. **Extract metadata first**:
   - Form No (e.g., L-9, L-15, L-3-A-BS,L-9A)
   - Title (form title/heading)
   - Registration Number
   - Period (date range or as-at date)
   - Currency (if mentioned)
   - Pages used
   
3. **Identify table headers** - Match them to the template headers above
   - If headers in PDF differ slightly, normalize them to match template
   - Example: "Number of Shares" → "As_at_Current_Year_Number_of_Shares"

4. **Extract ALL table rows**:
   - Go row by row through the entire table
   - Extract every cell value exactly as shown
   - Use "" (empty string) for truly empty cells
   - Use "0" or "-" if that's what's shown
   - Do NOT skip any rows

5. **Handle multiple tables**:
   - If the PDF has multiple tables, create separate data entries
   - Use TableIndex: 1, 2, 3, 4,etc.

6. **Quality checks**:
   - Count: Did you extract ALL rows you see?
   - Accuracy: Are numbers copied exactly?
   - Completeness: Did you miss any columns?

=== OUTPUT FORMAT ===

Return ONLY valid JSON (no markdown, no explanations):

{{
  "data": [
    {{
      "Form No": "extracted form number",
      "Title": "extracted title",
      "RegistrationNumber": "extracted reg number",
      "Period": "extracted period",
      "Currency": "extracted currency",
      "PagesUsed": 1,
      "TableIndex": 1,
      "FlatHeaders": ["Header1", "Header2", "..."],
      "FlatHeadersNormalized": ["header1", "header2", "..."],
      "Rows": [
        {{
          "Header1": "value1",
          "Header2": "value2",
          "...": "..."
        }},
        // ... ALL rows from the table ...
      ]
    }}
  ]
}}

**IMPORTANT**: 
- Extract EVERY row you see in the tables
- Do NOT summarize or sample - extract COMPLETE data
- If you cannot read something clearly, use your best interpretation but do NOT skip it
- The image quality is good enough to read all text and numbers

Now, analyze the PDF images below and extract ALL data:
"""

    return prompt


def correct_with_gemini(template_path, extracted_path, pdf_path, output_path, model="gemini-2.5-flash"):
    start_time = time.time()
    with open(template_path, "r", encoding="utf-8") as f:
        template = json.load(f)
    with open(extracted_path, "r", encoding="utf-8") as f:
        extracted = json.load(f)

    # Support both dict and list for extracted
    if isinstance(extracted, dict):
        extracted_data = extracted.get("data", [])
    elif isinstance(extracted, list):
        extracted_data = extracted
    else:
        extracted_data = []

    # Check if extraction is empty or has minimal data
    has_meaningful_data = False
    if extracted_data:
        for item in extracted_data:
            rows = item.get("Rows", [])
            if rows and len(rows) > 0:
                # Check if rows have actual content
                for row in rows:
                    if any(str(v).strip() and str(v).strip() not in ['', '-', 'None', 'null'] for v in row.values()):
                        has_meaningful_data = True
                        break
            if has_meaningful_data:
                break

    # Check if PDF has extractable text
    pdf_has_text = check_if_pdf_has_text(str(pdf_path))

    # Decision: Use Vision API if extraction failed/empty OR PDF is image-based
    use_vision_extraction = (not has_meaningful_data) or (not pdf_has_text)

    if use_vision_extraction:
        safe_info("=" * 60)
        safe_info("VISION-BASED EXTRACTION MODE")
        safe_info("=" * 60)
        safe_info(
            f"Reason: {'Extraction failed/empty' if not has_meaningful_data else 'PDF is image-based'}")
        safe_info("Converting PDF to images for Gemini Vision API...")

        try:
            # Convert PDF to images
            pdf_images = convert_pdf_to_images(str(pdf_path), max_pages=10)

            if not pdf_images:
                safe_error(
                    "Failed to convert PDF to images, falling back to text-based correction")
                use_vision_extraction = False
            else:
                # Create vision extraction prompt
                vision_prompt = create_vision_extraction_prompt(
                    template, str(pdf_path))

                # Prepare content for Gemini Vision (text + images)
                safe_info(
                    f"Sending {len(pdf_images)} images to Gemini Vision API...")
                content_parts = [vision_prompt]
                content_parts.extend(pdf_images)

                # Send to Gemini with images
                try:
                    response = get_gemini_model(
                        model).generate_content(content_parts)
                    corrected_json = parse_json_safely(
                        response.text if response.text else "")

                    if not corrected_json or not corrected_json.get("data"):
                        safe_warning("Vision extraction returned empty data")
                        corrected_json = {"data": []}
                    else:
                        safe_info(
                            f"✅ Vision extraction successful: {len(corrected_json.get('data', []))} tables extracted")

                except Exception as vision_err:
                    safe_error(f"Gemini Vision API error: {vision_err}")
                    safe_info("Falling back to text-based correction...")
                    use_vision_extraction = False

        except Exception as img_err:
            safe_error(f"Image conversion failed: {img_err}")
            safe_info("Falling back to text-based correction...")
            use_vision_extraction = False

    # Fallback: Use standard text-based correction if vision failed or not needed
    if not use_vision_extraction:
        safe_info("Using standard text-based correction mode")
        pdf_text = extract_pdf_context(str(pdf_path))
        prompt = create_single_call_prompt(template, extracted, pdf_text)

        safe_info(
            f"Sending single prompt to Gemini ({len(extracted_data)} rows)")
        try:
            response = get_gemini_model(model).generate_content(prompt)
            corrected_json = parse_json_safely(
                response.text if response.text else "")
            if not corrected_json:
                safe_error(
                    "Gemini returned invalid JSON, using extracted data")
                corrected_json = {"data": extracted_data}
        except Exception as e:
            safe_error(f"Gemini API error: {e}")
            corrected_json = {"data": extracted_data}

    # Save output
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(corrected_json, f, indent=2, ensure_ascii=False)

    elapsed_time = round(time.time() - start_time, 2)
    safe_info(f"Gemini output saved: {output_path} in {elapsed_time}s")

    # Log final stats
    final_data = corrected_json.get("data", [])
    if final_data:
        total_rows = sum(len(item.get("Rows", [])) for item in final_data)
        safe_info(
            f"Final output: {len(final_data)} tables, {total_rows} total rows")
    else:
        safe_info("Final output: No data extracted")

# ------------------ CLI ------------------


def main():
    parser = argparse.ArgumentParser(
        description="Single-call Gemini PDF verifier")
    parser.add_argument("--template", required=True)
    parser.add_argument("--extracted", required=True)
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", default="gemini-2.5-flash")
    args = parser.parse_args()
    for path in [args.template, args.extracted, args.pdf]:
        if not Path(path).exists():
            safe_error(f"File not found: {path}")
            sys.exit(2)
    correct_with_gemini(Path(args.template), Path(args.extracted), Path(
        args.pdf), Path(args.output), model=args.model)


if __name__ == "__main__":
    main()
