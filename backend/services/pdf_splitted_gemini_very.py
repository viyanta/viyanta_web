#!/usr/bin/env python3
"""
Gemini PDF Splitted Verifier v2.0 -- Multithreaded chunked correction with enhanced header matching

This version includes:
- Multithreaded parallel processing for faster correction
- Enhanced header matching with split PDF content
- Configurable worker count and batch sizes
- Improved prompts for better PDF-to-JSON alignment
- Auto-scaling worker count based on data size
- Environment variable controls for production deployment
"""

import json
import re
import sys
import os
import logging
import argparse
import time
import uuid
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai
import fitz  # PyMuPDF
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
import threading

# Optional repair libs
try:
    from json_repair import repair_json as json_repair
except Exception:
    json_repair = None

try:
    import demjson3 as demjson
except Exception:
    demjson = None

# Environment configuration with performance optimizations
DEFAULT_WORKERS = int(os.getenv("GEMINI_WORKERS", "6")
                      )  # Increased default workers
# Reduced for better parallelization
DEFAULT_BATCH_SIZE = int(os.getenv("GEMINI_BATCH_SIZE", "8"))
# Reduced for faster processing
MAX_PROMPT_SIZE = int(os.getenv("GEMINI_MAX_PROMPT_SIZE", "20000"))
ENABLE_MULTITHREADING = os.getenv(
    "GEMINI_MULTITHREADING", "true").lower() == "true"

# Logging configuration
os.makedirs("logs", exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(processName)s:%(threadName)s] [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("logs/gemini_debug.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)

# Thread-safe logging
log_lock = Lock()


def thread_safe_log(level, message, *args):
    """Thread-safe logging function"""
    with log_lock:
        if args:
            logging.log(level, message, *args)
        else:
            logging.log(level, message)


def safe_info(message, *args):
    thread_safe_log(logging.INFO, message, *args)


def safe_warning(message, *args):
    thread_safe_log(logging.WARNING, message, *args)


def safe_error(message, *args):
    thread_safe_log(logging.ERROR, message, *args)


# Load API key
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    safe_error(
        "GEMINI_API_KEY not found in .env. Add GEMINI_API_KEY=... and rerun.")
    sys.exit(1)
genai.configure(api_key=API_KEY)

# Thread-local storage for Gemini models
thread_local = threading.local()


def get_gemini_model(model_name: str = "gemini-1.5-pro"):
    """Get thread-local Gemini model instance"""
    if not hasattr(thread_local, 'model'):
        thread_local.model = genai.GenerativeModel(model_name)
    return thread_local.model

# ---------- Utilities ----------


def extract_text_from_pdf_page(pdf_path: str, page_num: int) -> str:
    """Extract text from a specific page of the PDF"""
    try:
        doc = fitz.open(pdf_path)
        if page_num >= len(doc):
            safe_warning(
                f"Page {page_num} not found in PDF (total pages: {len(doc)})")
            doc.close()
            return ""

        page = doc[page_num]
        text = page.get_text("text") or ""
        doc.close()
        return text
    except Exception as e:
        safe_error(f"Failed to extract text from PDF page {page_num}: {e}")
        return ""


def extract_comprehensive_pdf_context(pdf_path: str, max_pages: int = 10) -> str:
    """Extract text from multiple pages for comprehensive context"""
    try:
        doc = fitz.open(pdf_path)
        total_pages = len(doc)
        pages_to_extract = min(max_pages, total_pages)

        context_parts = []
        for i in range(pages_to_extract):
            page = doc[i]
            text = page.get_text("text") or ""
            if text.strip():
                context_parts.append(f"=== PAGE {i+1} ===\n{text}")

        doc.close()
        full_context = "\n\n".join(context_parts)

        # Truncate if too long
        if len(full_context) > MAX_PROMPT_SIZE:
            safe_warning(
                f"PDF context truncated from {len(full_context)} to {MAX_PROMPT_SIZE} chars")
            full_context = full_context[:MAX_PROMPT_SIZE] + "\n... [TRUNCATED]"

        return full_context
    except Exception as e:
        safe_error(f"Failed to extract PDF context: {e}")
        return ""


def strip_code_fence(text: str) -> str:
    """Extract JSON from code fences or find JSON objects"""
    text = text.strip()
    m = re.search(r"```(?:json)?\s*(.*?)```", text, flags=re.S | re.I)
    if m:
        return m.group(1).strip()

    # Fallback: extract first balanced JSON object
    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last != -1 and last > first:
        return text[first:last + 1]
    return text


def heuristically_fix_json(s: str) -> str:
    """Enhanced JSON repair with better handling of common Gemini formatting issues"""
    s = s.replace("\u201c", '"').replace("\u201d", '"').replace(
        "\u2018", "'").replace("\u2019", "'")
    s = s.strip()

    # Fix common Gemini formatting issues
    # 1. Fix pattern: "},\n        {" -> "},\n    {"
    s = re.sub(r'},\s*\n\s*{', '},\n    {', s)

    # 2. Fix trailing commas before closing braces/brackets
    s = re.sub(r",\s*([}\]])", r"\1", s)

    # 3. Fix repeated double-quotes
    s = s.replace('""', '"')

    # 4. Fix missing commas between objects in arrays
    s = re.sub(r'}\s*{', '},{', s)

    # 5. Fix null values without quotes
    s = re.sub(r':\s*null(?=\s*[,}])', ': ""', s)

    # 6. Fix unescaped quotes in values
    s = re.sub(r':\s*"([^"]*)"([^",}\]]*)"', r': "\1\2"', s)

    return s


def parse_json_safely(s: str) -> dict:
    """Attempt to parse JSON with multiple fallback strategies"""
    original_s = s

    # First attempt: direct parse
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        pass

    # Second attempt: strip code fences
    s = strip_code_fence(s)
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        pass

    # Third attempt: heuristic fixes
    s = heuristically_fix_json(s)
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        pass

    # Fourth attempt: json_repair library
    if json_repair:
        try:
            repaired = json_repair(s)
            return json.loads(repaired)
        except Exception:
            pass

    # Fifth attempt: demjson
    if demjson:
        try:
            return demjson.decode(s)
        except Exception:
            pass

    # Final fallback: extract partial data
    safe_warning(
        f"All JSON parsing attempts failed for text length {len(original_s)}")
    return {}


def create_enhanced_correction_prompt(template_structure: dict, chunk_data: list,
                                      pdf_context: str, chunk_idx: int, total_chunks: int) -> str:
    """Create an enhanced prompt with better PDF-to-JSON alignment instructions"""

    # Extract headers from template
    headers = []
    if "data" in template_structure and template_structure["data"]:
        first_row = template_structure["data"][0]
        if isinstance(first_row, dict):
            headers = list(first_row.keys())
        elif isinstance(first_row, list):
            headers = first_row

    # Show first 10 headers
    headers_str = ", ".join(f'"{h}"' for h in headers[:10])

    prompt = f"""You are a financial data extraction specialist. Your task is to correct and complete extracted JSON data by matching it precisely with the PDF content.

**CRITICAL INSTRUCTIONS:**
1. **HEADER MATCHING**: The JSON must use EXACTLY these headers from the split PDF: {headers_str}
2. **PDF ALIGNMENT**: Every data value must correspond to actual text/numbers visible in the PDF pages shown below
3. **PRESERVE STRUCTURE**: Maintain the exact same JSON structure as the template
4. **COMPLETE DATA**: Fill in missing values by finding corresponding data in the PDF
5. **ACCURACY**: If data is unclear in PDF, mark as empty string "" rather than guessing

**TEMPLATE STRUCTURE:**
```json
{json.dumps({"data": template_structure.get("data", [])[:2]}, indent=2)}
```

**PDF CONTENT (Pages from split document):**
```
{pdf_context[:15000]}  
```

**CURRENT DATA TO CORRECT (Chunk {chunk_idx+1}/{total_chunks}):**
```json
{json.dumps({"data": chunk_data}, indent=2)}
```

**YOUR TASK:**
1. Compare each row in the current data with the PDF content above
2. Correct any mismatched values by finding the right data in the PDF
3. Fill in empty fields with data from the PDF if available
4. Ensure all headers match the template exactly
5. Maintain consistent formatting (numbers as strings if template uses strings)

**OUTPUT FORMAT:**
Return ONLY the corrected JSON in this exact format:
```json
{{"data": [corrected_rows_here]}}
```

**IMPORTANT:** 
- Match the PDF content exactly - don't interpolate or estimate
- Keep the same number of rows as input unless PDF clearly shows more data
- Use empty string "" for truly missing data
- Ensure headers align with the split PDF's table structure"""

    return prompt


def correct_chunk_with_gemini(chunk_data: list, template_structure: dict,
                              pdf_context: str, chunk_idx: int, total_chunks: int,
                              model_name: str = "gemini-1.5-pro", retries: int = 3,
                              backoff: float = 2.0) -> list:
    """Correct a single chunk using Gemini with thread-safe operations and performance monitoring"""

    thread_id = threading.current_thread().name
    chunk_start_time = time.time()
    safe_info(
        f"[Thread {thread_id}] Processing chunk {chunk_idx+1}/{total_chunks} with {len(chunk_data)} rows")

    model = get_gemini_model(model_name)
    prompt = create_enhanced_correction_prompt(
        template_structure, chunk_data, pdf_context, chunk_idx, total_chunks
    )

    # Debug: Log prompt size
    prompt_size = len(prompt)
    safe_info(
        f"[Thread {thread_id}] Prompt size for chunk {chunk_idx+1}: {prompt_size} chars")

    for attempt in range(retries):
        try:
            safe_info(
                f"[Thread {thread_id}] Chunk {chunk_idx+1} attempt {attempt+1}")

            # Generate content with Gemini
            try:
                response = model.generate_content(prompt)
                raw_text = response.text if response.text else ""
            except Exception as api_error:
                safe_error(
                    f"[Thread {thread_id}] Gemini API error for chunk {chunk_idx+1}: {api_error}")
                time.sleep(backoff * (attempt + 1))
                continue

            if not raw_text.strip():
                safe_warning(
                    f"[Thread {thread_id}] Empty response for chunk {chunk_idx+1}")
                time.sleep(backoff * (attempt + 1))
                continue

            # Parse the response
            corrected_json = parse_json_safely(raw_text)

            if corrected_json and "data" in corrected_json:
                corrected_data = corrected_json["data"]
                chunk_time = time.time() - chunk_start_time
                safe_info(
                    f"[Thread {thread_id}] Successfully corrected chunk {chunk_idx+1} - {len(corrected_data)} rows in {chunk_time:.2f}s")
                return corrected_data
            else:
                safe_warning(
                    f"[Thread {thread_id}] Invalid JSON structure in response for chunk {chunk_idx+1}")

        except Exception as e:
            safe_error(
                f"[Thread {thread_id}] Error processing chunk {chunk_idx+1}, attempt {attempt+1}: {e}")

        if attempt < retries - 1:
            sleep_time = backoff * (2 ** attempt)
            safe_info(
                f"[Thread {thread_id}] Retrying chunk {chunk_idx+1} in {sleep_time}s")
            time.sleep(sleep_time)

    chunk_total_time = time.time() - chunk_start_time
    safe_error(
        f"[Thread {thread_id}] Failed to correct chunk {chunk_idx+1} after {retries} attempts ({chunk_total_time:.2f}s total)")
    return chunk_data  # Return original data if all attempts fail


def determine_optimal_workers(data_size: int, max_workers: int = None) -> int:
    """Determine optimal number of workers based on data size with aggressive optimization"""
    if max_workers is None:
        max_workers = DEFAULT_WORKERS

    # More aggressive auto-scaling for better performance
    if data_size <= 20:
        return min(3, max_workers)  # More workers for small datasets
    elif data_size <= 50:
        return min(4, max_workers)  # Increased from 2
    elif data_size <= 100:
        return min(6, max_workers)  # New tier for medium datasets
    elif data_size <= 200:
        return min(8, max_workers)  # Increased from 4
    else:
        return max_workers


def verify_and_correct_multipage_parallel(template_path: Path, extracted_path: Path,
                                          pdf_path: Path, output_path: Path,
                                          model_name: str = "gemini-1.5-pro",
                                          batch_size: int = None, max_pages: int = 10,
                                          retries: int = 3, backoff: float = 2.0,
                                          max_workers: int = None):
    """Main function with parallel processing support"""

    if batch_size is None:
        batch_size = DEFAULT_BATCH_SIZE
    if max_workers is None:
        max_workers = DEFAULT_WORKERS

    start_time = time.time()
    safe_info(
        f"Starting parallel correction with {max_workers} workers, batch size {batch_size}")

    # Validate API key
    if not API_KEY:
        safe_error("GEMINI_API_KEY is not set - cannot proceed with correction")
        return

    # Load template and extracted data
    try:
        with open(template_path, "r", encoding="utf-8") as f:
            template_structure = json.load(f)
        safe_info(f"Template loaded: {template_path}")
    except Exception as e:
        safe_error(f"Failed to load template file {template_path}: {e}")
        return

    try:
        with open(extracted_path, "r", encoding="utf-8") as f:
            extracted_data = json.load(f)
        safe_info(f"Extracted data loaded: {extracted_path}")
        safe_info(f"Extracted data type: {type(extracted_data)}")
        if isinstance(extracted_data, list):
            safe_info(f"Direct list format with {len(extracted_data)} items")
        elif isinstance(extracted_data, dict):
            data_items = len(extracted_data.get("data", []))
            safe_info(
                f"Dictionary format with {data_items} items in 'data' key")
    except Exception as e:
        safe_error(f"Failed to load extracted data file {extracted_path}: {e}")
        return

    # Extract PDF context
    safe_info(f"Extracting PDF context from {max_pages} pages...")
    pdf_context = extract_comprehensive_pdf_context(str(pdf_path), max_pages)

    if not pdf_context:
        safe_warning(
            "No PDF context extracted - proceeding with template-only correction")
        pdf_context = "No PDF content available for reference."

    # Get data to process - handle both list and dict formats
    if isinstance(extracted_data, list):
        # Direct list format
        data_to_correct = extracted_data
        safe_info("Extracted data is in direct list format")
    elif isinstance(extracted_data, dict):
        # Dictionary format with 'data' key
        data_to_correct = extracted_data.get("data", [])
        safe_info("Extracted data is in dictionary format")
    else:
        safe_error(f"Unexpected extracted data format: {type(extracted_data)}")
        return

    if not data_to_correct:
        safe_warning("No data found in extracted JSON")
        return

    total_rows = len(data_to_correct)
    safe_info(f"Processing {total_rows} rows in batches of {batch_size}")

    # Determine optimal worker count
    optimal_workers = determine_optimal_workers(total_rows, max_workers)
    safe_info(f"Using {optimal_workers} workers for {total_rows} rows")

    # Create chunks
    chunks = []
    for i in range(0, len(data_to_correct), batch_size):
        chunk = data_to_correct[i:i + batch_size]
        chunks.append((i // batch_size, chunk))

    safe_info(f"Created {len(chunks)} chunks for processing")

    # Process chunks in parallel if multithreading is enabled
    corrected_chunks = {}

    if ENABLE_MULTITHREADING and len(chunks) > 1:
        safe_info("Processing chunks in parallel...")

        with ThreadPoolExecutor(max_workers=optimal_workers) as executor:
            # Submit all chunks
            future_to_chunk = {}
            for chunk_idx, chunk_data in chunks:
                future = executor.submit(
                    correct_chunk_with_gemini,
                    chunk_data, template_structure, pdf_context,
                    chunk_idx, len(chunks), model_name, retries, backoff
                )
                future_to_chunk[future] = chunk_idx

            # Collect results
            for future in as_completed(future_to_chunk):
                chunk_idx = future_to_chunk[future]
                try:
                    result = future.result()
                    corrected_chunks[chunk_idx] = result
                    safe_info(f"Completed chunk {chunk_idx + 1}/{len(chunks)}")
                except Exception as e:
                    safe_error(f"Chunk {chunk_idx + 1} failed: {e}")
                    # Use original data
                    corrected_chunks[chunk_idx] = chunks[chunk_idx][1]
    else:
        # Sequential processing
        safe_info("Processing chunks sequentially...")
        for chunk_idx, chunk_data in chunks:
            corrected_data = correct_chunk_with_gemini(
                chunk_data, template_structure, pdf_context,
                chunk_idx, len(chunks), model_name, retries, backoff
            )
            corrected_chunks[chunk_idx] = corrected_data

    # Reassemble the corrected data in order
    final_corrected_data = []
    for i in range(len(chunks)):
        if i in corrected_chunks:
            final_corrected_data.extend(corrected_chunks[i])
        else:
            safe_warning(f"Missing chunk {i}, using original data")
            final_corrected_data.extend(chunks[i][1])

    # Create output structure
    output_structure = {
        "metadata": {
            "correction_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "template_file": str(template_path.name),
            "pdf_file": str(pdf_path.name),
            "original_rows": len(data_to_correct),
            "corrected_rows": len(final_corrected_data),
            "processing_time_seconds": round(time.time() - start_time, 2),
            "parallel_workers": optimal_workers,
            "batch_size": batch_size,
            "model_used": model_name
        },
        "data": final_corrected_data
    }

    # Save the corrected data
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output_structure, f, indent=2, ensure_ascii=False)

        processing_time = time.time() - start_time
        safe_info(f"Correction completed in {processing_time:.2f}s")
        safe_info(f"Saved corrected data to: {output_path}")
        safe_info(
            f"Original rows: {len(data_to_correct)}, Corrected rows: {len(final_corrected_data)}")

    except Exception as e:
        safe_error(f"Failed to save output: {e}")

# ---------- CLI ----------


def main():
    parser = argparse.ArgumentParser(
        description="Gemini multithreaded verifier/corrector for extracted JSON with enhanced PDF matching")
    parser.add_argument("--template", required=True, help="Template JSON path")
    parser.add_argument("--extracted", help="Extracted JSON path (single)")
    parser.add_argument("--pdf", help="Split PDF path (single)")
    parser.add_argument("--output", help="Output corrected JSON path (single)")
    parser.add_argument("--model", default="gemini-1.5-pro",
                        help="Gemini model name")
    parser.add_argument("--retries", type=int, default=3,
                        help="Retries per chunk")
    parser.add_argument("--backoff", type=float, default=2.0,
                        help="Base backoff time in seconds")
    parser.add_argument("--batch-size", type=int,
                        default=None, help="Rows per Gemini call")
    parser.add_argument("--max-pages", type=int, default=10,
                        help="Pages to extract from PDF for context")
    parser.add_argument("--workers", type=int, default=None,
                        help="Number of parallel workers")
    parser.add_argument("--no-parallel", action="store_true",
                        help="Disable parallel processing")

    args = parser.parse_args()

    # Override environment settings with CLI args
    global ENABLE_MULTITHREADING
    if args.no_parallel:
        ENABLE_MULTITHREADING = False

    template_path = Path(args.template)
    if not template_path.exists():
        safe_error(f"Template not found: {template_path}")
        sys.exit(2)

    if args.extracted and args.pdf:
        extracted_path = Path(args.extracted)
        pdf_path = Path(args.pdf)
        output_path = Path(args.output) if args.output else extracted_path.with_name(
            f"{extracted_path.stem}_corrected_parallel.json")

        if not extracted_path.exists():
            safe_error(f"Extracted JSON not found: {extracted_path}")
            sys.exit(2)
        if not pdf_path.exists():
            safe_error(f"PDF not found: {pdf_path}")
            sys.exit(2)

        verify_and_correct_multipage_parallel(
            template_path, extracted_path, pdf_path, output_path,
            model_name=args.model,
            batch_size=args.batch_size,
            max_pages=args.max_pages,
            retries=args.retries,
            backoff=args.backoff,
            max_workers=args.workers
        )
    else:
        safe_error("Missing required arguments: --extracted and --pdf")
        sys.exit(2)


if __name__ == "__main__":
    main()
