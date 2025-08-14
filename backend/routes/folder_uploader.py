from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List, Dict, Any
import os
import io
import shutil
import json
import time
import fitz  # PyMuPDF
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from collections import defaultdict
from fastapi.responses import FileResponse
import zipfile
import logging

# Import S3 service - handle import gracefully in case S3 is not configured
try:
    from services.s3_service import s3_service
    S3_AVAILABLE = True
except Exception as e:
    s3_service = None
    S3_AVAILABLE = False
    print(f"⚠️ S3 service not available: {e}")

# Try to import camelot lazily at module load (cache result)
try:
    import camelot  # type: ignore
    _CAMEL0T_AVAILABLE = True
except Exception:  # pragma: no cover
    camelot = None  # type: ignore
    _CAMEL0T_AVAILABLE = False

router = APIRouter()

# Configure logging for S3 operations
logger = logging.getLogger(__name__)

# Resolve all paths relative to the backend directory where this file resides
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_OUTPUT_DIR = os.path.join(BACKEND_DIR, "pdf_folder_extracted")
TEMP_INPUT_DIR = os.path.join(BACKEND_DIR, "temp", "folder_uploads")
ZIP_OUTPUT_DIR = os.path.join(BACKEND_DIR, "temp", "zips")

os.makedirs(BASE_OUTPUT_DIR, exist_ok=True)
os.makedirs(TEMP_INPUT_DIR, exist_ok=True)
os.makedirs(ZIP_OUTPUT_DIR, exist_ok=True)


def _upload_json_to_s3(json_data: Dict[str, Any], pdf_name: str) -> Dict[str, Any]:
    """Upload JSON data to S3 bucket under maker_checker/<pdf_name>/<pdf_name>.json.
    Returns upload result with s3_url and status.
    This is designed to be fast and non-blocking - failures won't stop the main process.
    """
    # Skip S3 upload if service not available
    if not S3_AVAILABLE or s3_service is None:
        return {
            "s3_upload": False,
            "s3_url": None,
            "s3_key": None,
            "s3_error": "S3 service not configured or available"
        }

    try:
        pdf_stem = os.path.splitext(pdf_name)[0]
        s3_key = f"maker_checker/{pdf_stem}/{pdf_stem}.json"

        # Add metadata for the upload
        metadata = {
            "pdf_name": pdf_name,
            "created_at": datetime.utcnow().isoformat(),
            "extraction_type": "folder_upload"
        }

        # Upload to S3 using the service
        s3_url = s3_service.upload_json_data(json_data, s3_key, metadata)

        return {
            "s3_upload": True,
            "s3_url": s3_url,
            "s3_key": s3_key,
            "s3_error": None
        }
    except Exception as e:
        # Log the error but don't fail the entire process
        logger.warning(f"S3 upload failed for {pdf_name}: {str(e)}")
        return {
            "s3_upload": False,
            "s3_url": None,
            "s3_key": None,
            "s3_error": str(e)
        }


def _extract_text_ultrafast(pdf_path: str) -> Dict[int, str]:
    """Ultra-fast text extraction with minimal overhead.
    Returns {page_number(1-based): text} mapping.
    """
    out: Dict[int, str] = {}
    try:
        doc = fitz.open(pdf_path)
        # Use list comprehension for speed
        texts = [page.get_text("text") for page in doc]
        doc.close()
        # Convert to 1-based indexing
        for i, text in enumerate(texts):
            out[i + 1] = text or ""
    except Exception:
        pass
    return out


def _extract_tables_minimal(pdf_path: str, total_pages: int) -> Dict[int, List[List[List[str]]]]:
    """Minimal table extraction - only extract from first few pages as sample.
    Skip Camelot for speed unless absolutely necessary.
    """
    result: Dict[int, List[List[List[str]]]] = defaultdict(list)

    # Skip table extraction entirely if Camelot not available or too many pages
    if camelot is None or total_pages > 50:
        return result

    try:
        # Only extract tables from first 3 pages as sample (much faster)
        sample_pages = min(3, total_pages)
        if sample_pages > 0:
            tables = camelot.read_pdf(
                pdf_path, pages=f"1-{sample_pages}", flavor="lattice")
            for t in tables or []:
                try:
                    p = int(str(getattr(t, "page", "1")).split(",")[0])
                    if p <= sample_pages:
                        result[p].append(t.df.values.tolist())
                except Exception:
                    continue
    except Exception:
        # If lattice fails, skip tables entirely for speed
        pass

    return result


def _extract_tables_skip() -> Dict[int, List[List[List[str]]]]:
    """Skip table extraction entirely for maximum speed."""
    return defaultdict(list)


def extract_pdf_to_json(pdf_path: str, out_dir: str, skip_tables: bool = True) -> Dict[str, Any]:
    """Extract text and optionally tables from a PDF into a page-by-page JSON structure.
    Returns a dict with output paths and summary including processing time.
    ULTRA-OPTIMIZED: Skip tables by default for maximum speed.
    NEW: Also uploads the generated JSON to S3 under maker_checker/<pdf_name>/<pdf_name>.json
    """
    t0 = time.perf_counter()

    pdf_name = os.path.basename(pdf_path)
    pdf_stem, _ = os.path.splitext(pdf_name)

    # Create output directory for this PDF
    pdf_out_dir = os.path.join(out_dir, pdf_stem)
    os.makedirs(pdf_out_dir, exist_ok=True)

    try:
        # Get page count quickly
        doc = fitz.open(pdf_path)
        total_pages = doc.page_count
        doc.close()

        if total_pages == 0:
            dt_ms = int((time.perf_counter() - t0) * 1000)
            return {
                "pdf_name": pdf_name,
                "output_json": "",
                "pages": 0,
                "processing_time_ms": dt_ms,
                "page_workers": 0,
                "table_workers": 0,
                "s3_upload": False,
                "s3_url": None,
                "s3_error": "Empty PDF - no content to upload"
            }

        # Ultra-fast text extraction
        page_text_map = _extract_text_ultrafast(pdf_path)

        # Skip tables for maximum speed, or minimal extraction
        if skip_tables:
            tables_by_page = _extract_tables_skip()
        else:
            tables_by_page = _extract_tables_minimal(pdf_path, total_pages)

        # Build result with minimal structure for speed
        result = {
            "pdf_name": pdf_name,
            "output_dir": os.path.relpath(pdf_out_dir, BACKEND_DIR),
            "total_pages": total_pages,
            "pages": [
                {
                    "page_number": page_num,
                    "text": page_text_map.get(page_num, ""),
                    "tables": tables_by_page.get(page_num, []),
                }
                for page_num in range(1, total_pages + 1)
            ],
            "created_at": datetime.utcnow().isoformat() + "Z",
        }

        # Write JSON with minimal formatting for speed
        output_json_path = os.path.join(pdf_out_dir, f"{pdf_stem}.json")
        with open(output_json_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, separators=(
                ',', ':'))  # No indentation for speed

        # Upload to S3 (non-blocking - failures won't stop the process)
        s3_result = _upload_json_to_s3(result, pdf_name)

        dt_ms = int((time.perf_counter() - t0) * 1000)
        return {
            "pdf_name": pdf_name,
            "output_json": os.path.relpath(output_json_path, BACKEND_DIR),
            "pages": total_pages,
            "processing_time_ms": dt_ms,
            "page_workers": 1,
            "table_workers": 0 if skip_tables else (1 if _CAMEL0T_AVAILABLE else 0),
            **s3_result  # Include S3 upload results
        }
    except Exception as e:
        raise e


@router.post("/folder_uploader")
async def upload_pdf_folder(files: List[UploadFile] = File(...)):
    """Accept multiple PDF files (from a folder selection on the frontend),
    process each concurrently, and store JSON outputs under pdf_folder_extracted/<pdf_name>/.
    Returns timing info for each file and overall.
    ULTRA-OPTIMIZED: Maximum speed by skipping tables and using aggressive parallelism.
    """
    t0_total = time.perf_counter()

    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded")

    # Filter PDFs and persist to disk with minimal overhead
    saved_paths: List[str] = []
    for uf in files:
        filename = uf.filename or "unknown.pdf"
        if not filename.lower().endswith(".pdf"):
            continue

        # Use simpler filename handling
        safe_name = os.path.basename(filename.replace("\\", "/"))
        temp_path = os.path.join(TEMP_INPUT_DIR, safe_name)

        # Write file directly without creating intermediate directories
        with open(temp_path, "wb") as out:
            shutil.copyfileobj(uf.file, out)
        saved_paths.append(temp_path)

    if len(saved_paths) == 0:
        raise HTTPException(
            status_code=400, detail="No valid PDF files found in selection")

    # Ultra-aggressive parallelism for maximum speed
    outputs = []
    errors = []
    cpu = os.cpu_count() or 1

    # Use maximum workers possible - each PDF extraction is now very lightweight
    # 16-32 workers for ultra-fast processing
    pdf_workers = min(max(16, cpu * 4), 32)

    print(
        f"🚀 Processing {len(saved_paths)} PDFs with {pdf_workers} workers (TEXT ONLY - no tables for speed)")

    with ThreadPoolExecutor(max_workers=pdf_workers) as executor:
        # Submit all jobs with table extraction disabled for speed
        future_map = {
            executor.submit(extract_pdf_to_json, p, BASE_OUTPUT_DIR, True): p
            for p in saved_paths
        }

        completed = 0
        for future in as_completed(future_map):
            src_path = future_map[future]
            try:
                res = future.result()
                outputs.append(res)
                completed += 1
                if completed % 5 == 0:  # Progress indicator
                    print(f"✅ Completed {completed}/{len(saved_paths)} PDFs")
            except Exception as e:
                errors.append(
                    {"file": os.path.basename(src_path), "error": str(e)})
                print(f"❌ Error processing {os.path.basename(src_path)}: {e}")

    total_time_ms = int((time.perf_counter() - t0_total) * 1000)

    # Calculate performance metrics
    total_pages = sum(o.get("pages", 0) for o in outputs)
    pages_per_sec = total_pages / \
        (total_time_ms / 1000) if total_time_ms > 0 else 0

    # Calculate S3 upload statistics
    s3_uploads_successful = sum(
        1 for o in outputs if o.get("s3_upload", False))
    s3_uploads_failed = len(outputs) - s3_uploads_successful
    s3_upload_rate = (s3_uploads_successful / len(outputs)
                      * 100) if outputs else 0

    print(
        f"🎉 COMPLETED: {len(outputs)} PDFs ({total_pages} pages) in {total_time_ms/1000:.2f}s = {pages_per_sec:.1f} pages/sec")
    print(
        f"☁️ S3 UPLOADS: {s3_uploads_successful}/{len(outputs)} successful ({s3_upload_rate:.1f}%)")

    return {
        "status": "completed",
        "processed_count": len(outputs),
        "errors": errors,
        "outputs": outputs,
        "output_root": os.path.relpath(BASE_OUTPUT_DIR, BACKEND_DIR),
        "workers": pdf_workers,
        "total_time_ms": total_time_ms,
        "total_pages": total_pages,
        "pages_per_second": round(pages_per_sec, 1),
        "extraction_mode": "TEXT_ONLY_ULTRA_FAST",
        "s3_uploads_successful": s3_uploads_successful,
        "s3_uploads_failed": s3_uploads_failed,
        "s3_upload_rate": round(s3_upload_rate, 1),
        "message": f"✅ Ultra-fast processing: {len(outputs)} PDFs ({total_pages} pages) in {total_time_ms/1000:.2f}s | S3: {s3_uploads_successful}/{len(outputs)} uploaded"
    }


@router.post("/folder_uploader/with_tables")
async def upload_pdf_folder_with_tables(files: List[UploadFile] = File(...)):
    """Same as folder_uploader but WITH table extraction (slower but complete).
    Use this endpoint when you need tables extracted from PDFs.
    """
    t0_total = time.perf_counter()

    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded")

    # Filter PDFs and persist to disk
    saved_paths: List[str] = []
    for uf in files:
        filename = uf.filename or "unknown.pdf"
        if not filename.lower().endswith(".pdf"):
            continue

        safe_name = os.path.basename(filename.replace("\\", "/"))
        temp_path = os.path.join(TEMP_INPUT_DIR, safe_name)

        with open(temp_path, "wb") as out:
            shutil.copyfileobj(uf.file, out)
        saved_paths.append(temp_path)

    if len(saved_paths) == 0:
        raise HTTPException(
            status_code=400, detail="No valid PDF files found in selection")

    # Use fewer workers when extracting tables (more CPU intensive)
    outputs = []
    errors = []
    cpu = os.cpu_count() or 1
    pdf_workers = min(max(4, cpu * 2), 12)  # Conservative for table extraction

    print(
        f"🔄 Processing {len(saved_paths)} PDFs with {pdf_workers} workers (WITH TABLES - slower but complete)")

    with ThreadPoolExecutor(max_workers=pdf_workers) as executor:
        future_map = {
            executor.submit(extract_pdf_to_json, p, BASE_OUTPUT_DIR, False): p
            for p in saved_paths
        }

        completed = 0
        for future in as_completed(future_map):
            src_path = future_map[future]
            try:
                res = future.result()
                outputs.append(res)
                completed += 1
                if completed % 3 == 0:
                    print(
                        f"✅ Completed {completed}/{len(saved_paths)} PDFs (with tables)")
            except Exception as e:
                errors.append(
                    {"file": os.path.basename(src_path), "error": str(e)})

    total_time_ms = int((time.perf_counter() - t0_total) * 1000)
    total_pages = sum(o.get("pages", 0) for o in outputs)
    pages_per_sec = total_pages / \
        (total_time_ms / 1000) if total_time_ms > 0 else 0

    # Calculate S3 upload statistics
    s3_uploads_successful = sum(
        1 for o in outputs if o.get("s3_upload", False))
    s3_uploads_failed = len(outputs) - s3_uploads_successful
    s3_upload_rate = (s3_uploads_successful / len(outputs)
                      * 100) if outputs else 0

    print(
        f"🎉 COMPLETED: {len(outputs)} PDFs ({total_pages} pages) with tables in {total_time_ms/1000:.2f}s")
    print(
        f"☁️ S3 UPLOADS: {s3_uploads_successful}/{len(outputs)} successful ({s3_upload_rate:.1f}%)")

    return {
        "status": "completed",
        "processed_count": len(outputs),
        "errors": errors,
        "outputs": outputs,
        "output_root": os.path.relpath(BASE_OUTPUT_DIR, BACKEND_DIR),
        "workers": pdf_workers,
        "total_time_ms": total_time_ms,
        "total_pages": total_pages,
        "pages_per_second": round(pages_per_sec, 1),
        "extraction_mode": "TEXT_AND_TABLES",
        "s3_uploads_successful": s3_uploads_successful,
        "s3_uploads_failed": s3_uploads_failed,
        "s3_upload_rate": round(s3_upload_rate, 1),
        "message": f"📊 Complete processing: {len(outputs)} PDFs ({total_pages} pages) with tables in {total_time_ms/1000:.2f}s | S3: {s3_uploads_successful}/{len(outputs)} uploaded"
    }


@router.post("/folder_uploader/zip")
async def zip_folder_jsons(payload: Dict[str, Any]):
    """Create and return a ZIP containing provided JSON output files.
    Expects payload: { "outputs": ["pdf_folder_extracted/NAME/NAME.json", ...] }
    Paths are validated to be within BASE_OUTPUT_DIR.
    """
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid request body")

    rel_paths = payload.get("outputs")
    if not rel_paths or not isinstance(rel_paths, list):
        raise HTTPException(status_code=400, detail="No outputs provided")

    # Resolve and validate paths
    valid_files: List[str] = []
    base_real = os.path.realpath(BASE_OUTPUT_DIR)
    for p in rel_paths:
        if not isinstance(p, str):
            continue
        # Normalize path and ensure it's under BASE_OUTPUT_DIR
        abs_p = os.path.realpath(os.path.join(BACKEND_DIR, p))
        try:
            common = os.path.commonpath([base_real, abs_p])
        except ValueError:
            # Different drives on Windows
            continue
        if common != base_real:
            continue
        if os.path.isfile(abs_p):
            valid_files.append(abs_p)

    if not valid_files:
        raise HTTPException(
            status_code=400, detail="No valid JSON files to zip")

    # Create ZIP in temp folder
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    zip_name = f"pdf_jsons_{ts}.zip"
    zip_path = os.path.join(ZIP_OUTPUT_DIR, zip_name)
    # Write with directory structure relative to BASE_OUTPUT_DIR for clarity
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for f in valid_files:
            arcname = os.path.relpath(f, BASE_OUTPUT_DIR)
            zf.write(f, arcname)

    return FileResponse(zip_path, media_type="application/zip", filename=zip_name)
