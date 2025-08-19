from fastapi import APIRouter, UploadFile, File, HTTPException, Form
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

# Import Gemini verifier - handle import gracefully
try:
    from services.gemini_pdf_verifier import verify_extraction
    GEMINI_AVAILABLE = True
    print("✅ Gemini PDF verifier available")
except Exception as e:
    verify_extraction = None
    GEMINI_AVAILABLE = False
    print(f"⚠️ Gemini verifier not available: {e}")

# Try to import camelot lazily at module load (cache result)
try:
    import camelot  # type: ignore
    _CAMELOT_AVAILABLE = True
    print("✅ Camelot-py available for table extraction")
except Exception:  # pragma: no cover
    camelot = None  # type: ignore
    _CAMELOT_AVAILABLE = False
    print("⚠️ Camelot-py not available - table extraction will be skipped")

router = APIRouter()

# Configure logging for S3 operations
logger = logging.getLogger(__name__)

# Resolve all paths relative to the backend directory where this file resides
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# New folder structure: vifiles/users/{user_id}/{folder_name}/pdf/ and /json/
VIFILES_BASE_DIR = os.path.join(BACKEND_DIR, "vifiles")
TEMP_INPUT_DIR = os.path.join(BACKEND_DIR, "temp", "folder_uploads")
ZIP_OUTPUT_DIR = os.path.join(BACKEND_DIR, "temp", "zips")

os.makedirs(VIFILES_BASE_DIR, exist_ok=True)
os.makedirs(TEMP_INPUT_DIR, exist_ok=True)
os.makedirs(ZIP_OUTPUT_DIR, exist_ok=True)


def get_user_folder_path(user_id: str, folder_name: str) -> str:
    """Get the user-specific folder path in the new structure"""
    return os.path.join(VIFILES_BASE_DIR, "users", user_id, folder_name)


def ensure_user_directories(user_id: str, folder_name: str) -> tuple[str, str]:
    """Ensure user directories exist and return PDF and JSON paths"""
    base_path = get_user_folder_path(user_id, folder_name)
    pdf_dir = os.path.join(base_path, "pdf")
    json_dir = os.path.join(base_path, "json")

    os.makedirs(pdf_dir, exist_ok=True)
    os.makedirs(json_dir, exist_ok=True)

    return pdf_dir, json_dir


def _upload_files_to_s3(pdf_path: str, json_data: Dict[str, Any], folder_name: str, pdf_name: str, user_id: str) -> Dict[str, Any]:
    """Upload both PDF and JSON to S3 under the vifiles bucket structure.
    S3 structure: vifiles/users/{user_id}/{folder_name}/pdf/*.pdf and vifiles/users/{user_id}/{folder_name}/json/*.json
    """
    if not S3_AVAILABLE or s3_service is None:
        return {
            "s3_upload": False,
            "s3_pdf_result": {"success": False, "error": "S3 service not configured"},
            "s3_json_result": {"success": False, "error": "S3 service not configured"}
        }

    try:
        pdf_stem = os.path.splitext(pdf_name)[0]
        json_filename = f"{pdf_stem}.json"

        # Upload PDF file using new method
        pdf_result = s3_service.upload_pdf_file(
            pdf_path,
            user_id,
            folder_name,
            pdf_name,
            metadata={
                "extraction_mode": json_data.get("mode", "unknown"),
                "total_pages": str(json_data.get("total_pages", 0)),
                "uploaded_at": datetime.utcnow().isoformat()
            }
        )

        # Upload JSON data using new method
        json_result = s3_service.upload_json_extraction(
            json_data,
            user_id,
            folder_name,
            json_filename,
            metadata={
                "pdf_name": pdf_name,
                "extraction_mode": json_data.get("mode", "unknown"),
                "total_pages": str(json_data.get("total_pages", 0)),
                "uploaded_at": datetime.utcnow().isoformat()
            }
        )

        return {
            "s3_upload": True,
            "s3_pdf_result": pdf_result,
            "s3_json_result": json_result
        }

    except Exception as e:
        logger.warning(f"S3 upload failed for {pdf_name}: {str(e)}")
        return {
            "s3_upload": False,
            "s3_pdf_result": {"success": False, "error": str(e)},
            "s3_json_result": {"success": False, "error": str(e)}
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


def _extract_tables_fast_camelot(pdf_path: str, total_pages: int) -> Dict[int, List[Dict[str, Any]]]:
    """FAST table extraction using camelot-py with proper table structure.
    Returns tables in a structured format with headers and data.
    """
    result: Dict[int, List[Dict[str, Any]]] = defaultdict(list)

    if not _CAMELOT_AVAILABLE or camelot is None:
        print(
            f"⚠️ Camelot not available - skipping table extraction for {os.path.basename(pdf_path)}")
        return result

    try:
        # Process first 10 pages for better coverage while maintaining speed
        max_pages = min(10, total_pages)
        pages_str = f"1-{max_pages}" if max_pages > 1 else "1"

        print(
            f"⚡ FAST table extraction from {max_pages}/{total_pages} pages in {os.path.basename(pdf_path)}...")

        # Try lattice method first (best for well-structured tables)
        try:
            tables_lattice = camelot.read_pdf(
                pdf_path,
                pages=pages_str,
                flavor='lattice',
                strip_text='\n',
                split_text=True,
                flag_size=True
            )

            if tables_lattice and len(tables_lattice) > 0:
                print(
                    f"  ✅ Found {len(tables_lattice)} tables using lattice method")
                for table in tables_lattice:
                    try:
                        page_num = table.page
                        df = table.df

                        # Skip empty tables
                        if df.empty or len(df) < 2:
                            continue

                        # Convert DataFrame to structured format
                        table_data = _convert_df_to_structured_table(
                            df, table.accuracy)
                        if table_data and table_data.get('data'):
                            result[page_num].append(table_data)

                    except Exception as e:
                        print(f"    ⚠️ Error processing lattice table: {e}")
                        continue

        except Exception as e:
            print(f"  ⚠️ Lattice method failed: {e}")

        # If lattice found few/no tables, try stream method
        if sum(len(tables) for tables in result.values()) < 2:
            try:
                tables_stream = camelot.read_pdf(
                    pdf_path,
                    pages=pages_str,
                    flavor='stream',
                    strip_text='\n',
                    flag_size=True
                )

                if tables_stream and len(tables_stream) > 0:
                    print(
                        f"  ✅ Found {len(tables_stream)} additional tables using stream method")
                    for table in tables_stream:
                        try:
                            page_num = table.page
                            df = table.df

                            # Skip if we already have tables on this page from lattice
                            if page_num in result and len(result[page_num]) > 0:
                                continue

                            # Skip empty tables
                            if df.empty or len(df) < 2:
                                continue

                            # Convert DataFrame to structured format
                            table_data = _convert_df_to_structured_table(
                                df, getattr(table, 'accuracy', 0.0))
                            if table_data and table_data.get('data'):
                                result[page_num].append(table_data)

                        except Exception as e:
                            print(f"    ⚠️ Error processing stream table: {e}")
                            continue

            except Exception as e:
                print(f"  ⚠️ Stream method failed: {e}")

        total_tables = sum(len(tables) for tables in result.values())
        print(
            f"  📋 FAST extracted {total_tables} tables from {max_pages} pages")

    except Exception as e:
        print(
            f"❌ Fast table extraction failed for {os.path.basename(pdf_path)}: {e}")

    return result


def _convert_df_to_structured_table(df, accuracy: float = 0.0) -> Dict[str, Any]:
    """Convert pandas DataFrame to structured table format with headers and data"""
    try:
        if df.empty or len(df) < 1:
            return None

        # Clean the DataFrame
        df = df.fillna('')

        # Use first row as headers if it looks like headers, otherwise generate column names
        if len(df) > 1:
            potential_headers = df.iloc[0].astype(str).str.strip().tolist()
            # Check if first row looks like headers (contains text, not just numbers)
            if any(header and not header.replace('.', '').replace(',', '').replace('-', '').isdigit()
                   for header in potential_headers if header):
                headers = [str(h).strip() if str(h).strip() else f"Column_{i+1}"
                           for i, h in enumerate(potential_headers)]
                data_rows = df.iloc[1:]
            else:
                headers = [f"Column_{i+1}" for i in range(len(df.columns))]
                data_rows = df
        else:
            headers = [f"Column_{i+1}" for i in range(len(df.columns))]
            data_rows = df

        # Convert data rows to list of dictionaries
        table_data = []
        for _, row in data_rows.iterrows():
            row_dict = {}
            row_values = row.astype(str).str.strip().tolist()

            for i, value in enumerate(row_values):
                header = headers[i] if i < len(headers) else f"Column_{i+1}"
                row_dict[header] = value if value else ""

            # Only add row if it has at least one non-empty value
            if any(v for v in row_dict.values() if v):
                table_data.append(row_dict)

        # Return structured table only if we have meaningful data
        if table_data and len(table_data) > 0:
            return {
                "table_number": 1,  # Will be adjusted by caller
                "method": "camelot",
                "accuracy": accuracy,
                "headers": headers,
                "data": table_data,
                "total_rows": len(table_data),
                "total_columns": len(headers)
            }

        return None

    except Exception as e:
        print(f"Error converting DataFrame to structured table: {e}")
        return None


def extract_pdf_to_json(pdf_path: str, user_id: str, folder_name: str, mode: str = "text") -> Dict[str, Any]:
    """Extract text and optionally tables from a PDF into a page-by-page JSON structure.
    mode: 'text' (text only), 'tables' (fast table extraction), 'complete' (full extraction)
    user_id: User ID for organizing files by user
    folder_name: Folder name for organizing files
    """
    t0 = time.perf_counter()

    pdf_name = os.path.basename(pdf_path)
    pdf_stem, _ = os.path.splitext(pdf_name)

    # Create user-specific directories
    pdf_dir, json_dir = ensure_user_directories(user_id, folder_name)

    try:
        # Get page count quickly
        doc = fitz.open(pdf_path)
        total_pages = doc.page_count
        doc.close()

        if total_pages == 0:
            dt_ms = int((time.perf_counter() - t0) * 1000)
            return {
                "pdf_name": pdf_name,
                "user_id": user_id,
                "folder_name": folder_name,
                "pages": 0,
                "processing_time_ms": dt_ms,
                "mode": mode,
                "error": "Empty PDF - no content found"
            }

        # Ultra-fast text extraction
        page_text_map = _extract_text_ultrafast(pdf_path)

        # Table extraction based on mode with better error handling
        if mode == "text":
            tables_by_page = defaultdict(list)
        elif mode in ["tables", "complete"]:
            tables_by_page = _extract_tables_fast_camelot(
                pdf_path, total_pages)
        else:
            tables_by_page = defaultdict(list)

        # Build result with minimal structure for speed
        result = {
            "pdf_name": pdf_name,
            "user_id": user_id,
            "folder_name": folder_name,
            "total_pages": total_pages,
            "mode": mode,
            "pages": [
                {
                    "page_number": page_num,
                    "text": page_text_map.get(page_num, ""),
                    "tables": tables_by_page.get(page_num, []),
                }
                for page_num in range(1, total_pages + 1)
            ],
            "created_at": datetime.utcnow().isoformat() + "Z",
            "summary": {
                "total_tables_found": sum(len(tables) for tables in tables_by_page.values()),
                "pages_with_tables": len([p for p in range(1, total_pages + 1) if tables_by_page.get(p)]),
                "extraction_mode": mode
            }
        }

        # Copy PDF to user folder
        pdf_dest_path = os.path.join(pdf_dir, pdf_name)
        shutil.copy2(pdf_path, pdf_dest_path)

        # Write JSON to user folder
        json_filename = f"{pdf_stem}.json"
        output_json_path = os.path.join(json_dir, json_filename)

        # Apply Gemini verification if available
        verified_result = result
        if GEMINI_AVAILABLE:
            try:
                print(f"🔍 Applying Gemini verification for {pdf_name}...")
                from services.gemini_pdf_verifier import GeminiPDFVerifier
                verifier = GeminiPDFVerifier()
                verified_result = verifier.verify_pdf_json(pdf_path, result)
                print(f"✅ Gemini verification completed for {pdf_name}")
            except Exception as e:
                print(f"⚠️ Gemini verification failed for {pdf_name}: {e}")
                # Continue with original result if verification fails
                verified_result = result

        with open(output_json_path, "w", encoding="utf-8") as f:
            json.dump(verified_result, f, ensure_ascii=False,
                      indent=2, default=str)

        # Upload to S3 (use verified result)
        s3_result = _upload_files_to_s3(
            pdf_dest_path, verified_result, folder_name, pdf_name, user_id)

        dt_ms = int((time.perf_counter() - t0) * 1000)
        table_count = sum(len(tables) for tables in tables_by_page.values())

        return {
            "pdf_name": pdf_name,
            "user_id": user_id,
            "folder_name": folder_name,
            "pages": total_pages,
            "tables_found": table_count,
            "processing_time_ms": dt_ms,
            "mode": mode,
            "local_pdf_path": pdf_dest_path,
            "local_json_path": output_json_path,
            **s3_result  # Include S3 upload results
        }
    except Exception as e:
        dt_ms = int((time.perf_counter() - t0) * 1000)
        logger.error(f"Extraction failed for {pdf_name}: {str(e)}")
        return {
            "pdf_name": pdf_name,
            "user_id": user_id,
            "folder_name": folder_name,
            "pages": 0,
            "processing_time_ms": dt_ms,
            "mode": mode,
            "error": str(e)
        }


# === NEW USER-BASED ENDPOINTS ===

@router.post("/upload_single_instant")
async def upload_single_pdf_instant(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    folder_name: str = Form(...)
):
    """Upload a single PDF and extract text/tables instantly with user-based organization"""
    t0 = time.perf_counter()

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400, detail="Only PDF files are allowed")

    # Save to temp first
    safe_filename = os.path.basename(file.filename.replace("\\", "/"))
    temp_path = os.path.join(TEMP_INPUT_DIR, safe_filename)

    try:
        with open(temp_path, "wb") as temp_file:
            shutil.copyfileobj(file.file, temp_file)

        # Extract with table support
        result = extract_pdf_to_json(temp_path, user_id, folder_name, "tables")

        total_time_ms = int((time.perf_counter() - t0) * 1000)

        return {
            "status": "success",
            "filename": safe_filename,
            "user_id": user_id,
            "folder_name": folder_name,
            "result": result,
            "total_time_ms": total_time_ms,
            "message": f"✅ Single PDF processed in {total_time_ms}ms with table extraction"
        }

    except Exception as e:
        logger.error(f"Single PDF upload failed: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Processing failed: {str(e)}")
    finally:
        # Clean up temp file
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


@router.post("/upload_multi_files")
async def upload_multiple_pdfs(
    files: List[UploadFile] = File(...),
    user_id: str = Form(...),
    folder_name: str = Form(...),
    mode: str = Form("tables")
):
    """Upload multiple PDFs with parallel processing and user-based organization"""
    t0_total = time.perf_counter()

    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded")

    # Filter and save PDFs
    saved_paths: List[str] = []
    for uploaded_file in files:
        if not uploaded_file.filename or not uploaded_file.filename.lower().endswith(".pdf"):
            continue

        safe_name = os.path.basename(uploaded_file.filename.replace("\\", "/"))
        temp_path = os.path.join(TEMP_INPUT_DIR, safe_name)

        with open(temp_path, "wb") as out:
            shutil.copyfileobj(uploaded_file.file, out)
        saved_paths.append(temp_path)

    if len(saved_paths) == 0:
        raise HTTPException(status_code=400, detail="No valid PDF files found")

    # Process in parallel
    outputs = []
    errors = []
    cpu = os.cpu_count() or 1
    max_workers = min(max(4, cpu * 2), 16)

    print(
        f"📄 Processing {len(saved_paths)} PDFs with {max_workers} workers (mode: {mode})")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_map = {
            executor.submit(extract_pdf_to_json, path, user_id, folder_name, mode): path
            for path in saved_paths
        }

        for future in as_completed(future_map):
            src_path = future_map[future]
            try:
                result = future.result(timeout=120)
                outputs.append(result)
            except Exception as e:
                errors.append({
                    "file": os.path.basename(src_path),
                    "error": str(e)
                })
                logger.error(
                    f"Error processing {os.path.basename(src_path)}: {e}")

    # Clean up temp files
    for temp_path in saved_paths:
        try:
            os.remove(temp_path)
        except Exception:
            pass

    total_time_ms = int((time.perf_counter() - t0_total) * 1000)
    total_pages = sum(o.get("pages", 0) for o in outputs)
    s3_uploads_successful = sum(
        1 for o in outputs if o.get("s3_upload", False))

    return {
        "status": "completed",
        "user_id": user_id,
        "folder_name": folder_name,
        "processed_count": len(outputs),
        "errors": errors,
        "outputs": outputs,
        "total_time_ms": total_time_ms,
        "total_pages": total_pages,
        "extraction_mode": mode,
        "s3_uploads_successful": s3_uploads_successful,
        "s3_uploads_failed": len(outputs) - s3_uploads_successful,
        "message": f"✅ Processed {len(outputs)} PDFs in {total_time_ms/1000:.2f}s | S3: {s3_uploads_successful}/{len(outputs)} uploaded"
    }


@router.post("/upload_folder_tables")
async def upload_pdf_folder_with_tables(
    files: List[UploadFile] = File(...),
    user_id: str = Form(...),
    folder_name: str = Form(...)
):
    """Upload a folder of PDFs with full table extraction and user-based organization"""
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

    # Process with optimized workers for table extraction
    outputs = []
    errors = []
    cpu = os.cpu_count() or 1
    pdf_workers = min(max(8, cpu * 3), 20)

    print(
        f"🚀 Processing {len(saved_paths)} PDFs with {pdf_workers} workers (TABLES + TEXT)")

    with ThreadPoolExecutor(max_workers=pdf_workers) as executor:
        future_map = {
            executor.submit(extract_pdf_to_json, p, user_id, folder_name, "tables"): p
            for p in saved_paths
        }

        completed = 0
        for future in as_completed(future_map):
            src_path = future_map[future]
            try:
                res = future.result(timeout=120)
                outputs.append(res)
                completed += 1
                if completed % 2 == 0:
                    elapsed = time.perf_counter() - t0_total
                    eta = (elapsed / completed) * len(saved_paths) - elapsed
                    print(
                        f"✅ Completed {completed}/{len(saved_paths)} PDFs - ETA: {eta/60:.1f}min")
            except Exception as e:
                errors.append(
                    {"file": os.path.basename(src_path), "error": str(e)})
                print(f"❌ Error processing {os.path.basename(src_path)}: {e}")

    # Clean up temp files
    for temp_path in saved_paths:
        try:
            os.remove(temp_path)
        except Exception:
            pass

    total_time_ms = int((time.perf_counter() - t0_total) * 1000)
    total_pages = sum(o.get("pages", 0) for o in outputs)
    pages_per_sec = total_pages / \
        (total_time_ms / 1000) if total_time_ms > 0 else 0

    s3_uploads_successful = sum(
        1 for o in outputs if o.get("s3_upload", False))
    s3_uploads_failed = len(outputs) - s3_uploads_successful
    s3_upload_rate = (s3_uploads_successful / len(outputs)
                      * 100) if outputs else 0

    print(
        f"🎉 COMPLETE: {len(outputs)} PDFs ({total_pages} pages) with tables in {total_time_ms/1000:.2f}s")
    print(
        f"☁️ S3 UPLOADS: {s3_uploads_successful}/{len(outputs)} successful ({s3_upload_rate:.1f}%)")

    return {
        "status": "completed",
        "user_id": user_id,
        "folder_name": folder_name,
        "processed_count": len(outputs),
        "errors": errors,
        "outputs": outputs,
        "workers": pdf_workers,
        "total_time_ms": total_time_ms,
        "total_pages": total_pages,
        "pages_per_second": round(pages_per_sec, 1),
        "extraction_mode": "TABLES_AND_TEXT",
        "s3_uploads_successful": s3_uploads_successful,
        "s3_uploads_failed": s3_uploads_failed,
        "s3_upload_rate": round(s3_upload_rate, 1),
        "message": f"🚀 Processing: {len(outputs)} PDFs ({total_pages} pages) with tables in {total_time_ms/1000:.2f}s | S3: {s3_uploads_successful}/{len(outputs)} uploaded"
    }


@router.post("/upload_folder_text")
async def upload_pdf_folder_text_only(
    files: List[UploadFile] = File(...),
    user_id: str = Form(...),
    folder_name: str = Form(...)
):
    """Upload a folder of PDFs with text-only extraction (ultra-fast) and user-based organization"""
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

    # Ultra-fast processing with high worker count
    outputs = []
    errors = []
    cpu = os.cpu_count() or 1
    pdf_workers = min(max(16, cpu * 4), 32)  # High worker count for text-only

    print(
        f"⚡ Ultra-fast processing {len(saved_paths)} PDFs with {pdf_workers} workers (TEXT ONLY)")

    with ThreadPoolExecutor(max_workers=pdf_workers) as executor:
        future_map = {
            executor.submit(extract_pdf_to_json, p, user_id, folder_name, "text"): p
            for p in saved_paths
        }

        completed = 0
        for future in as_completed(future_map):
            src_path = future_map[future]
            try:
                # Shorter timeout for text-only
                res = future.result(timeout=60)
                outputs.append(res)
                completed += 1
                if completed % 5 == 0:  # More frequent updates
                    elapsed = time.perf_counter() - t0_total
                    eta = (elapsed / completed) * len(saved_paths) - elapsed
                    print(
                        f"⚡ Completed {completed}/{len(saved_paths)} PDFs - ETA: {eta:.1f}s")
            except Exception as e:
                errors.append(
                    {"file": os.path.basename(src_path), "error": str(e)})
                print(f"❌ Error processing {os.path.basename(src_path)}: {e}")

    # Clean up temp files
    for temp_path in saved_paths:
        try:
            os.remove(temp_path)
        except Exception:
            pass

    total_time_ms = int((time.perf_counter() - t0_total) * 1000)
    total_pages = sum(o.get("pages", 0) for o in outputs)
    pages_per_sec = total_pages / \
        (total_time_ms / 1000) if total_time_ms > 0 else 0

    s3_uploads_successful = sum(
        1 for o in outputs if o.get("s3_upload", False))
    s3_uploads_failed = len(outputs) - s3_uploads_successful
    s3_upload_rate = (s3_uploads_successful / len(outputs)
                      * 100) if outputs else 0

    print(
        f"⚡ ULTRA-FAST COMPLETE: {len(outputs)} PDFs ({total_pages} pages) in {total_time_ms/1000:.2f}s")
    print(
        f"☁️ S3 UPLOADS: {s3_uploads_successful}/{len(outputs)} successful ({s3_upload_rate:.1f}%)")

    return {
        "status": "completed",
        "user_id": user_id,
        "folder_name": folder_name,
        "processed_count": len(outputs),
        "errors": errors,
        "outputs": outputs,
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


# === USER-BASED DATA MANAGEMENT ENDPOINTS ===

@router.get("/user_folders/{user_id}")
async def get_user_folders(user_id: str):
    """Get all folders for a specific user in the new structure"""
    try:
        user_base_path = os.path.join(VIFILES_BASE_DIR, "users", user_id)

        folders = []
        if os.path.exists(user_base_path):
            for folder_name in os.listdir(user_base_path):
                folder_path = os.path.join(user_base_path, folder_name)
                if os.path.isdir(folder_path):
                    pdf_dir = os.path.join(folder_path, "pdf")
                    json_dir = os.path.join(folder_path, "json")

                    folder_info = {
                        "folder_name": folder_name,
                        "pdf_count": 0,
                        "json_count": 0,
                        "created_at": datetime.fromtimestamp(os.path.getctime(folder_path)).isoformat()
                    }

                    # Count files
                    if os.path.exists(pdf_dir):
                        folder_info["pdf_count"] = len([f for f in os.listdir(pdf_dir)
                                                        if f.lower().endswith('.pdf')])

                    if os.path.exists(json_dir):
                        folder_info["json_count"] = len([f for f in os.listdir(json_dir)
                                                         if f.lower().endswith('.json')])

                    folders.append(folder_info)

        # Also get S3 folders if available
        s3_folders = []
        if S3_AVAILABLE and s3_service:
            try:
                s3_result = s3_service.list_user_folders(user_id)
                if s3_result.get("success"):
                    s3_folders = s3_result.get("folders", [])
            except Exception as e:
                logger.warning(
                    f"Failed to get S3 folders for user {user_id}: {e}")

        return {
            "user_id": user_id,
            "total_folders": len(folders),
            "folders": folders,
            "s3_folders": s3_folders
        }

    except Exception as e:
        logger.error(f"Error getting user folders: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get user folders: {str(e)}")


@router.get("/user_folder_files/{user_id}/{folder_name}")
async def get_user_folder_files(user_id: str, folder_name: str):
    """Get all files in a specific user folder"""
    try:
        folder_path = get_user_folder_path(user_id, folder_name)

        if not os.path.exists(folder_path):
            raise HTTPException(status_code=404, detail="Folder not found")

        pdf_dir = os.path.join(folder_path, "pdf")
        json_dir = os.path.join(folder_path, "json")

        files = []

        # Get PDF files and check for corresponding JSON files
        if os.path.exists(pdf_dir):
            for pdf_file in os.listdir(pdf_dir):
                if pdf_file.lower().endswith('.pdf'):
                    pdf_path = os.path.join(pdf_dir, pdf_file)
                    json_file = os.path.splitext(pdf_file)[0] + ".json"
                    json_path = os.path.join(json_dir, json_file)

                    file_info = {
                        "filename": pdf_file,
                        "type": "pdf",
                        "size": os.path.getsize(pdf_path),
                        "created_at": datetime.fromtimestamp(os.path.getctime(pdf_path)).isoformat(),
                        "has_json": os.path.exists(json_path),
                        "json_filename": json_file if os.path.exists(json_path) else None,
                        "local_pdf_path": pdf_path,
                        "local_json_path": json_path if os.path.exists(json_path) else None
                    }
                    files.append(file_info)

        # Also get S3 files if available
        s3_files = []
        if S3_AVAILABLE and s3_service:
            try:
                s3_result = s3_service.list_user_folder_files(
                    user_id, folder_name)
                if s3_result.get("success"):
                    s3_files = s3_result.get("files", [])
            except Exception as e:
                logger.warning(
                    f"Failed to get S3 files for {user_id}/{folder_name}: {e}")

        return {
            "user_id": user_id,
            "folder_name": folder_name,
            "total_files": len(files),
            "files": files,
            "s3_files": s3_files
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user folder files: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get folder files: {str(e)}")


@router.get("/user_json_data/{user_id}/{folder_name}/{filename}")
async def get_user_json_data(user_id: str, folder_name: str, filename: str):
    """Get JSON extraction data for a specific file"""
    try:
        # Ensure filename ends with .json
        if not filename.lower().endswith('.json'):
            filename += ".json"

        folder_path = get_user_folder_path(user_id, folder_name)
        json_path = os.path.join(folder_path, "json", filename)

        if not os.path.exists(json_path):
            # Try to get from S3 if local file doesn't exist
            if S3_AVAILABLE and s3_service:
                try:
                    s3_result = s3_service.get_json_file_content(
                        user_id, folder_name, filename)
                    if s3_result.get("success"):
                        return {
                            "user_id": user_id,
                            "folder_name": folder_name,
                            "filename": filename,
                            "source": "s3",
                            "data": s3_result["data"]
                        }
                except Exception as e:
                    logger.warning(f"Failed to get JSON from S3: {e}")

            raise HTTPException(status_code=404, detail="JSON file not found")

        # Read local JSON file
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        return {
            "user_id": user_id,
            "folder_name": folder_name,
            "filename": filename,
            "source": "local",
            "data": data
        }

    except HTTPException:
        raise
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Invalid JSON file")
    except Exception as e:
        logger.error(f"Error getting JSON data: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get JSON data: {str(e)}")


@router.delete("/user_folder/{user_id}/{folder_name}")
async def delete_user_folder(user_id: str, folder_name: str):
    """Delete a user folder and all its contents"""
    try:
        folder_path = get_user_folder_path(user_id, folder_name)

        if not os.path.exists(folder_path):
            raise HTTPException(status_code=404, detail="Folder not found")

        # Delete local folder
        shutil.rmtree(folder_path)

        # TODO: Delete from S3 if needed
        # This would require implementing delete_user_folder in S3Service

        return {
            "message": f"Folder '{folder_name}' deleted successfully",
            "user_id": user_id,
            "folder_name": folder_name
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user folder: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to delete folder: {str(e)}")


@router.get("/all_users_data")
async def get_all_users_data():
    """Get folders and files from all users for maker-checker view - FETCHES FROM S3"""
    try:
        # Fetch data directly from S3 instead of local files
        if S3_AVAILABLE and s3_service:
            try:
                s3_result = s3_service.list_all_users_data()
                if s3_result.get("success"):
                    # Return the S3 data in the expected format
                    return {
                        "total_users": s3_result.get("total_users", 0),
                        "users_data": s3_result.get("users_data", {}),
                        # For compatibility
                        "s3_data": s3_result.get("users_data", {}),
                        # Include debug info
                        "s3_debug": s3_result.get("s3_debug", {}),
                        "data_source": "s3"
                    }
                else:
                    logger.error(
                        f"S3 list_all_users_data failed: {s3_result.get('error')}")
                    return {
                        "total_users": 0,
                        "users_data": {},
                        "s3_data": {},
                        "error": s3_result.get("error"),
                        "s3_debug": s3_result.get("s3_debug", {}),
                        "data_source": "s3_failed"
                    }
            except Exception as e:
                logger.error(f"Failed to get S3 data for all users: {e}")
                return {
                    "total_users": 0,
                    "users_data": {},
                    "s3_data": {},
                    "error": str(e),
                    "data_source": "s3_exception"
                }
        else:
            logger.warning(
                "S3 service not available, falling back to empty response")
            return {
                "total_users": 0,
                "users_data": {},
                "s3_data": {},
                "error": "S3 service not available",
                "data_source": "s3_unavailable"
            }

    except Exception as e:
        logger.error(f"Error getting all users data: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get all users data: {str(e)}")


@router.get("/all_users_files/{user_id}/{folder_name}")
async def get_all_users_folder_files(user_id: str, folder_name: str):
    """Get files from a specific folder for any user (for maker-checker view) - fetches from S3"""
    try:
        if not S3_AVAILABLE:
            raise HTTPException(
                status_code=503, detail="S3 service not available")

        # Get folder data from S3
        folder_data = s3_service._get_folder_data_from_s3(user_id, folder_name)

        if folder_data is None:
            raise HTTPException(
                status_code=404, detail="Folder not found in S3")

        return {
            "user_id": user_id,
            "folder_name": folder_name,
            "total_files": len(folder_data['files']),
            "files": folder_data['files'],
            "debug_info": {
                "pdf_count": folder_data['pdf_count'],
                "json_count": folder_data['json_count'],
                "folder_created_at": folder_data['created_at']
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error getting files for user {user_id}, folder {folder_name}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get files: {str(e)}")


@router.get("/all_users_json_data/{user_id}/{folder_name}/{filename}")
async def get_all_users_json_data(user_id: str, folder_name: str, filename: str):
    """Get JSON data from any user's folder (for maker-checker view) - fetches from S3"""
    try:
        if not S3_AVAILABLE:
            raise HTTPException(
                status_code=503, detail="S3 service not available")

        # Construct S3 key for JSON file
        # Try both possible locations: in json/ subfolder and in root folder
        s3_keys_to_try = [
            f"users/{user_id}/{folder_name}/json/{filename}",
            f"users/{user_id}/{folder_name}/{filename}"
        ]

        json_content = None
        successful_key = None

        for s3_key in s3_keys_to_try:
            try:
                json_content = s3_service.download_file_content(s3_key)
                if json_content is not None:
                    successful_key = s3_key
                    break
            except Exception as e:
                logger.debug(f"Failed to get JSON from S3 key {s3_key}: {e}")
                continue

        if json_content is None:
            raise HTTPException(
                status_code=404, detail="JSON file not found in S3")

        # Parse JSON content
        try:
            data = json.loads(json_content)
        except json.JSONDecodeError:
            raise HTTPException(status_code=422, detail="Invalid JSON file")

        return {
            "user_id": user_id,
            "folder_name": folder_name,
            "filename": filename,
            "source": "s3",
            "s3_key": successful_key,
            "data": data
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting JSON data: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get JSON data: {str(e)}")


@router.post("/upload-folder-files-new/{folder_name}")
async def upload_folder_files_new(
    folder_name: str,
    files: List[UploadFile] = File(...),
    mode: str = Form("text")
):
    """
    Upload folder files with new S3 structure and Gemini verification
    New structure: vifiles/{folder_name}/{file_name}_type/files
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    if not folder_name.strip():
        raise HTTPException(status_code=400, detail="Folder name is required")

    start_time = time.time()
    logger.info(
        f"Starting folder upload with new structure: {folder_name}, files: {len(files)}, mode: {mode}")

    # Create local directories for new structure
    local_folder_path = os.path.join(VIFILES_BASE_DIR, folder_name)
    os.makedirs(local_folder_path, exist_ok=True)

    results = []
    pdf_files = []

    try:
        # Save uploaded files locally first
        for file in files:
            if not file.filename.lower().endswith('.pdf'):
                continue

            file_content = await file.read()
            file_name_base = os.path.splitext(file.filename)[0]

            # Create directory for original file
            original_dir = os.path.join(local_folder_path, file_name_base)
            os.makedirs(original_dir, exist_ok=True)

            # Save original PDF
            original_path = os.path.join(original_dir, file.filename)
            with open(original_path, 'wb') as f:
                f.write(file_content)

            pdf_files.append({
                "filename": file.filename,
                "file_name_base": file_name_base,
                "original_path": original_path,
                "folder_name": folder_name
            })

        if not pdf_files:
            raise HTTPException(
                status_code=400, detail="No valid PDF files found")

        # Process each PDF file
        for pdf_info in pdf_files:
            try:
                file_result = await _process_pdf_new_structure(pdf_info, mode)
                results.append(file_result)
            except Exception as e:
                logger.error(f"Error processing {pdf_info['filename']}: {e}")
                results.append({
                    "filename": pdf_info['filename'],
                    "status": "error",
                    "error": str(e)
                })

        # Calculate summary
        successful = len(
            [r for r in results if r.get("status") == "completed"])
        processing_time = round((time.time() - start_time) * 1000)

        response = {
            "status": "completed" if successful == len(results) else "partial",
            "processing_time_ms": processing_time,
            "total_files": len(results),
            "successful_files": successful,
            "failed_files": len(results) - successful,
            "folder_name": folder_name,
            "mode": mode,
            "results": results
        }

        logger.info(
            f"Folder upload completed: {successful}/{len(results)} files processed in {processing_time}ms")
        return response

    except Exception as e:
        logger.error(f"Error in folder upload: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


async def _process_pdf_new_structure(pdf_info: Dict[str, Any], mode: str) -> Dict[str, Any]:
    """
    Process a single PDF with new structure and Gemini verification
    """
    start_time = time.time()
    filename = pdf_info["filename"]
    file_name_base = pdf_info["file_name_base"]
    original_path = pdf_info["original_path"]
    folder_name = pdf_info["folder_name"]

    try:
        logger.info(f"Processing {filename} with mode: {mode}")

        # Extract data from PDF
        extracted_data = await _extract_pdf_data(original_path, mode)
        if not extracted_data:
            raise Exception("Failed to extract data from PDF")

        # Create JSON directory and save extracted JSON
        json_dir = os.path.join(
            VIFILES_BASE_DIR, folder_name, f"{file_name_base}_json")
        os.makedirs(json_dir, exist_ok=True)

        extracted_json_path = os.path.join(json_dir, f"{file_name_base}.json")
        with open(extracted_json_path, 'w', encoding='utf-8') as f:
            json.dump(extracted_data, f, indent=2, ensure_ascii=False)

        # Gemini verification step
        verified_data = extracted_data  # Default to extracted data
        verification_status = "skipped"

        if GEMINI_AVAILABLE and verify_extraction:
            try:
                logger.info(f"Starting Gemini verification for {filename}")
                verified_data = verify_extraction(
                    original_path, extracted_data, use_image_mode=True)
                verification_status = "completed"

                # Create verified JSON directory and save verified JSON
                verified_json_dir = os.path.join(
                    VIFILES_BASE_DIR, folder_name, f"{file_name_base}_verified_json")
                os.makedirs(verified_json_dir, exist_ok=True)

                verified_json_path = os.path.join(
                    verified_json_dir, f"{file_name_base}_verified.json")
                with open(verified_json_path, 'w', encoding='utf-8') as f:
                    json.dump(verified_data, f, indent=2, ensure_ascii=False)

                logger.info(f"Gemini verification completed for {filename}")

            except Exception as e:
                logger.error(f"Gemini verification failed for {filename}: {e}")
                verification_status = "failed"
                # Continue with extracted data if verification fails

        # Upload to S3 with new structure
        s3_results = {}
        if S3_AVAILABLE and s3_service:
            try:
                # Upload original PDF
                s3_results["original"] = s3_service.upload_file_new_structure(
                    original_path, folder_name, file_name_base, "original"
                )

                # Upload extracted JSON
                s3_results["json"] = s3_service.upload_file_new_structure(
                    extracted_json_path, folder_name, file_name_base, "json"
                )

                # Upload verified JSON if available
                if verification_status == "completed":
                    s3_results["verified_json"] = s3_service.upload_file_new_structure(
                        verified_json_path, folder_name, file_name_base, "verified_json"
                    )

            except Exception as e:
                logger.error(f"S3 upload failed for {filename}: {e}")
                s3_results["error"] = str(e)

        processing_time = round((time.time() - start_time) * 1000)

        result = {
            "filename": filename,
            "file_name_base": file_name_base,
            "status": "completed",
            "processing_time_ms": processing_time,
            "extraction": {
                "mode": mode,
                "pages_processed": extracted_data.get("total_pages", 1),
                "tables_found": len(extracted_data.get("pages", [{}])[0].get("tables", [])) if extracted_data.get("pages") else 0
            },
            "verification": {
                "status": verification_status,
                "accuracy_score": verified_data.get("verification_summary", {}).get("accuracy_score") if verification_status == "completed" else None
            },
            "storage": {
                "local_paths": {
                    "original": original_path,
                    "json": extracted_json_path,
                    "verified_json": verified_json_path if verification_status == "completed" else None
                },
                "s3_results": s3_results
            }
        }

        logger.info(
            f"Successfully processed {filename} in {processing_time}ms")
        return result

    except Exception as e:
        logger.error(f"Error processing {filename}: {e}")
        return {
            "filename": filename,
            "file_name_base": file_name_base,
            "status": "error",
            "error": str(e),
            "processing_time_ms": round((time.time() - start_time) * 1000)
        }


async def _extract_pdf_data(pdf_path: str, mode: str) -> Dict[str, Any]:
    """
    Extract data from PDF based on mode
    """
    try:
        doc = fitz.open(pdf_path)
        pages_data = []

        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            page_data = {
                "page_number": page_num + 1,
                "text": "",
                "tables": []
            }

            # Extract text
            if mode in ["text", "complete"]:
                page_data["text"] = page.get_text()

            # Extract tables
            if mode in ["tables", "complete"] and _CAMELOT_AVAILABLE:
                try:
                    tables = camelot.read_pdf(
                        pdf_path, pages=str(page_num + 1))
                    for i, table in enumerate(tables):
                        if not table.df.empty:
                            table_data = {
                                "table_number": i + 1,
                                "headers": table.df.columns.tolist(),
                                "data": table.df.values.tolist(),
                                "total_rows": len(table.df),
                                "total_columns": len(table.df.columns),
                                "accuracy": getattr(table, 'accuracy', 0.8),
                                "method": "camelot"
                            }
                            page_data["tables"].append(table_data)
                except Exception as e:
                    logger.warning(
                        f"Table extraction failed for page {page_num + 1}: {e}")

            pages_data.append(page_data)

        doc.close()

        return {
            "mode": mode,
            "total_pages": len(pages_data),
            "created_at": datetime.now().isoformat(),
            "pages": pages_data,
            "summary": {
                "total_tables_found": sum(len(page.get("tables", [])) for page in pages_data)
            }
        }

    except Exception as e:
        logger.error(f"Error extracting PDF data: {e}")
        return None


@router.get("/folders-new-structure")
async def get_folders_new_structure():
    """Get all folders using the new S3 structure"""
    try:
        # Get local folders
        local_folders = {}
        if os.path.exists(VIFILES_BASE_DIR):
            for folder_name in os.listdir(VIFILES_BASE_DIR):
                folder_path = os.path.join(VIFILES_BASE_DIR, folder_name)
                if os.path.isdir(folder_path) and not folder_name.startswith('users'):
                    folder_contents = _get_local_folder_contents_new_structure(
                        folder_name, folder_path)
                    local_folders[folder_name] = folder_contents

        # Get S3 folders
        s3_folders = {}
        if S3_AVAILABLE and s3_service:
            try:
                s3_result = s3_service.list_folders_new_structure()
                if s3_result.get("success"):
                    s3_folders = s3_result.get("folders", {})
            except Exception as e:
                logger.warning(f"Failed to get S3 folders: {e}")

        return {
            "total_folders": len(local_folders) + len(s3_folders),
            "local_folders": local_folders,
            "s3_folders": s3_folders
        }

    except Exception as e:
        logger.error(f"Error getting folders: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get folders: {str(e)}")


def _get_local_folder_contents_new_structure(folder_name: str, folder_path: str) -> Dict[str, Any]:
    """Get contents of a local folder in the new structure"""
    try:
        contents = {
            "folder_name": folder_name,
            "files": {}
        }

        for item in os.listdir(folder_path):
            item_path = os.path.join(folder_path, item)
            if os.path.isdir(item_path):
                # Check if this is a file directory (ends with _json, _verified_json, or is a base name)
                if item.endswith('_verified_json'):
                    file_base = item[:-14]  # Remove '_verified_json'
                    if file_base not in contents["files"]:
                        contents["files"][file_base] = {}
                    contents["files"][file_base]["verified_json"] = _get_directory_files(
                        item_path)
                elif item.endswith('_json'):
                    file_base = item[:-5]  # Remove '_json'
                    if file_base not in contents["files"]:
                        contents["files"][file_base] = {}
                    contents["files"][file_base]["json"] = _get_directory_files(
                        item_path)
                else:
                    # This is an original file directory
                    if item not in contents["files"]:
                        contents["files"][item] = {}
                    contents["files"][item]["original"] = _get_directory_files(
                        item_path)

        return contents

    except Exception as e:
        logger.error(
            f"Error getting local folder contents for {folder_name}: {e}")
        return {
            "folder_name": folder_name,
            "files": {},
            "error": str(e)
        }


def _get_directory_files(directory_path: str) -> List[Dict[str, Any]]:
    """Get list of files in a directory"""
    try:
        files = []
        for filename in os.listdir(directory_path):
            file_path = os.path.join(directory_path, filename)
            if os.path.isfile(file_path):
                files.append({
                    "filename": filename,
                    "size": os.path.getsize(file_path),
                    "created_at": datetime.fromtimestamp(os.path.getctime(file_path)).isoformat()
                })
        return files
    except Exception as e:
        logger.error(f"Error getting directory files: {e}")
        return []
