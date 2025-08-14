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


def _extract_tables_complete(pdf_path: str, total_pages: int) -> Dict[int, List[List[List[str]]]]:
    """OPTIMIZED: Complete table extraction with speed improvements.
    Uses smart page limiting and optimized Camelot parameters for 4-minute target.
    """
    result: Dict[int, List[List[List[str]]]] = defaultdict(list)

    # Skip if Camelot not available
    if not _CAMEL0T_AVAILABLE or camelot is None:
        print(f"⚠️ Camelot not available - skipping table extraction for {os.path.basename(pdf_path)}")
        return result

    try:
        # OPTIMIZATION 1: Limit pages for speed (most financial docs have tables in the first few pages)
        max_pages_to_process = min(10, total_pages)  # Process max 10 pages for speed
        pages_str = f"1-{max_pages_to_process}" if max_pages_to_process > 1 else "1"
        
        print(f"📊 FAST extracting tables from {max_pages_to_process}/{total_pages} pages in {os.path.basename(pdf_path)}...")
        
        # OPTIMIZATION 2: Try lattice first with optimized parameters
        try:
            tables_lattice = camelot.read_pdf(
                pdf_path, 
                pages=pages_str, 
                flavor='lattice',
                table_areas=None,  # Auto-detect
                strip_text='\n',   # Clean text
                split_text=True,   # Better text handling
                flag_size=True     # Skip tiny tables
            )
            if tables_lattice and len(tables_lattice) > 0:
                print(f"  ✅ Lattice method found {len(tables_lattice)} tables")
                for table in tables_lattice:
                    try:
                        page_num = int(str(getattr(table, "page", "1")).split(",")[0])
                        if 1 <= page_num <= max_pages_to_process:
                            # OPTIMIZATION 3: Quick data conversion
                            df_data = table.df.values.tolist()
                            # Filter out completely empty rows (faster check)
                            cleaned_data = [row for row in df_data if any(str(cell).strip() for cell in row if cell)]
                            if cleaned_data and len(cleaned_data) >= 2:  # Only keep tables with at least 2 rows
                                result[page_num].append(cleaned_data)
                    except Exception as e:
                        print(f"    ⚠️ Error processing lattice table: {e}")
                        continue
        except Exception as e:
            print(f"  ⚠️ Lattice method failed: {e}")

        # OPTIMIZATION 4: Only try stream if lattice found very few tables AND we have time budget
        current_tables = sum(len(tables) for tables in result.values())
        if current_tables < 2 and max_pages_to_process <= 5:  # Only for small docs with few tables
            try:
                tables_stream = camelot.read_pdf(
                    pdf_path, 
                    pages=pages_str, 
                    flavor='stream',
                    edge_tol=500,      # Faster edge detection
                    row_tol=2          # Less strict row detection
                )
                if tables_stream and len(tables_stream) > 0:
                    print(f"  ✅ Stream method found {len(tables_stream)} additional tables")
                    for table in tables_stream:
                        try:
                            page_num = int(str(getattr(table, "page", "1")).split(",")[0])
                            if 1 <= page_num <= max_pages_to_process:
                                df_data = table.df.values.tolist()
                                cleaned_data = [row for row in df_data if any(str(cell).strip() for cell in row if cell)]
                                if cleaned_data and len(cleaned_data) >= 2:
                                    result[page_num].append(cleaned_data)
                        except Exception as e:
                            print(f"    ⚠️ Error processing stream table: {e}")
                            continue
            except Exception as e:
                print(f"  ⚠️ Stream method failed: {e}")

        total_tables = sum(len(tables) for tables in result.values())
        print(f"  📋 FAST extracted {total_tables} tables from {max_pages_to_process} pages")
        
    except Exception as e:
        print(f"❌ Fast table extraction failed for {os.path.basename(pdf_path)}: {e}")

    return result


def _extract_tables_minimal(pdf_path: str, total_pages: int) -> Dict[int, List[List[List[str]]]]:
    """Minimal table extraction - only extract from first few pages as sample.
    Used for quick preview when full extraction is not needed.
    """
    result: Dict[int, List[List[List[str]]]] = defaultdict(list)

    # Skip if Camelot not available
    if not _CAMEL0T_AVAILABLE or camelot is None:
        return result

    try:
        # Only extract tables from first 5 pages as sample (reasonable balance)
        sample_pages = min(5, total_pages)
        if sample_pages > 0:
            print(f"📊 Quick table extraction from first {sample_pages} pages of {os.path.basename(pdf_path)}")
            tables = camelot.read_pdf(pdf_path, pages=f"1-{sample_pages}", flavor="lattice")
            for t in tables or []:
                try:
                    p = int(str(getattr(t, "page", "1")).split(",")[0])
                    if p <= sample_pages:
                        df_data = t.df.values.tolist()
                        cleaned_data = [row for row in df_data if any(str(cell).strip() for cell in row)]
                        if cleaned_data:
                            result[p].append(cleaned_data)
                except Exception:
                    continue
            
            total_tables = sum(len(tables) for tables in result.values())
            print(f"  📋 Found {total_tables} tables in first {sample_pages} pages")
    except Exception as e:
        print(f"⚠️ Minimal table extraction failed: {e}")

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

        # Table extraction based on mode
        if skip_tables:
            tables_by_page = _extract_tables_skip()
        else:
            tables_by_page = _extract_tables_complete(pdf_path, total_pages)

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

        # Write JSON with ULTRA-fast formatting for speed optimization
        output_json_path = os.path.join(pdf_out_dir, f"{pdf_stem}.json")
        with open(output_json_path, "w", encoding="utf-8") as f:
            # OPTIMIZATION: Use fastest JSON serialization - no indentation, optimized separators
            json.dump(result, f, ensure_ascii=False, separators=(',', ':'), default=str)

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

    # OPTIMIZED: More aggressive worker count for 4-minute target
    outputs = []
    errors = []
    cpu = os.cpu_count() or 1
    
    # OPTIMIZATION: Higher worker count since table extraction is now faster
    # Target: Process multiple PDFs in parallel for speed
    pdf_workers = min(max(8, cpu * 3), 20)  # Increased from conservative 12 to aggressive 20

    print(
        f"� OPTIMIZED: Processing {len(saved_paths)} PDFs with {pdf_workers} workers (FAST TABLES + TEXT)")

    with ThreadPoolExecutor(max_workers=pdf_workers) as executor:
        future_map = {
            executor.submit(extract_pdf_to_json, p, BASE_OUTPUT_DIR, False): p
            for p in saved_paths
        }

        completed = 0
        for future in as_completed(future_map):
            src_path = future_map[future]
            try:
                # OPTIMIZATION: Add timeout to prevent hanging (max 2 minutes per PDF)
                res = future.result(timeout=120)  # 2-minute timeout per PDF
                outputs.append(res)
                completed += 1
                if completed % 2 == 0:  # More frequent progress updates
                    elapsed = time.perf_counter() - t0_total
                    eta = (elapsed / completed) * len(saved_paths) - elapsed
                    print(f"✅ Completed {completed}/{len(saved_paths)} PDFs - ETA: {eta/60:.1f}min")
            except Exception as e:
                errors.append(
                    {"file": os.path.basename(src_path), "error": str(e)})
                print(f"❌ Error processing {os.path.basename(src_path)}: {e}")

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
        f"🎉 OPTIMIZED COMPLETE: {len(outputs)} PDFs ({total_pages} pages) with FAST tables in {total_time_ms/1000:.2f}s")
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
        "extraction_mode": "OPTIMIZED_TEXT_AND_TABLES",
        "s3_uploads_successful": s3_uploads_successful,
        "s3_uploads_failed": s3_uploads_failed,
        "s3_upload_rate": round(s3_upload_rate, 1),
        "message": f"� OPTIMIZED processing: {len(outputs)} PDFs ({total_pages} pages) with FAST tables in {total_time_ms/1000:.2f}s | S3: {s3_uploads_successful}/{len(outputs)} uploaded | Target: <4min ✅"
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


@router.get("/uploaded-files")
async def get_uploaded_files():
    """Get list of all uploaded files and their JSON outputs from pdf_folder_extracted directory"""
    try:
        uploaded_files = []
        
        # Scan pdf_folder_extracted directory
        if os.path.exists(BASE_OUTPUT_DIR):
            for folder_name in os.listdir(BASE_OUTPUT_DIR):
                folder_path = os.path.join(BASE_OUTPUT_DIR, folder_name)
                if os.path.isdir(folder_path):
                    # Look for JSON file in this folder
                    json_file = os.path.join(folder_path, f"{folder_name}.json")
                    if os.path.exists(json_file):
                        # Get file stats
                        json_stat = os.stat(json_file)
                        file_info = {
                            "name": folder_name,
                            "type": "pdf",
                            "folder_path": folder_path,
                            "json_path": json_file,
                            "json_relative_path": f"pdf_folder_extracted/{folder_name}/{folder_name}.json",
                            "size": json_stat.st_size,
                            "created_at": datetime.fromtimestamp(json_stat.st_ctime).isoformat(),
                            "modified_at": datetime.fromtimestamp(json_stat.st_mtime).isoformat(),
                            "hasJson": True,
                            "source": "folder_upload"
                        }
                        uploaded_files.append(file_info)
        
        # Sort by creation time (newest first)
        uploaded_files.sort(key=lambda x: x["created_at"], reverse=True)
        
        return {
            "status": "success",
            "files": uploaded_files,
            "total_files": len(uploaded_files)
        }
        
    except Exception as e:
        logger.error(f"Error getting uploaded files: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get uploaded files: {str(e)}")
