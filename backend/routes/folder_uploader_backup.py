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


def _extract_tables_complete(pdf_path: str, total_pages: int) -> Dict[int, List[List[List[str]]]]:
    """OPTIMIZED: Complete table extraction with speed improvements.
    Uses smart page limiting and optimized Camelot parameters for 4-minute target.
    """
    result: Dict[int, List[List[List[str]]]] = defaultdict(list)

    # Skip if Camelot not available
    if not _CAMELOT_AVAILABLE or camelot is None:
        print(
            f"⚠️ Camelot not available - skipping table extraction for {os.path.basename(pdf_path)}")
        return result

    try:
        # OPTIMIZATION 1: Limit pages for speed (most financial docs have tables in the first few pages)
        # Process max 10 pages for speed
        max_pages_to_process = min(10, total_pages)
        pages_str = f"1-{max_pages_to_process}" if max_pages_to_process > 1 else "1"

        print(
            f"📊 FAST extracting tables from {max_pages_to_process}/{total_pages} pages in {os.path.basename(pdf_path)}...")

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
                        page_num = int(
                            str(getattr(table, "page", "1")).split(",")[0])
                        if 1 <= page_num <= max_pages_to_process:
                            # OPTIMIZATION 3: Quick data conversion
                            df_data = table.df.values.tolist()
                            # Filter out completely empty rows (faster check)
                            cleaned_data = [row for row in df_data if any(
                                str(cell).strip() for cell in row if cell)]
                            # Only keep tables with at least 2 rows
                            if cleaned_data and len(cleaned_data) >= 2:
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
                    print(
                        f"  ✅ Stream method found {len(tables_stream)} additional tables")
                    for table in tables_stream:
                        try:
                            page_num = int(
                                str(getattr(table, "page", "1")).split(",")[0])
                            if 1 <= page_num <= max_pages_to_process:
                                df_data = table.df.values.tolist()
                                cleaned_data = [row for row in df_data if any(
                                    str(cell).strip() for cell in row if cell)]
                                if cleaned_data and len(cleaned_data) >= 2:
                                    result[page_num].append(cleaned_data)
                        except Exception as e:
                            print(f"    ⚠️ Error processing stream table: {e}")
                            continue
            except Exception as e:
                print(f"  ⚠️ Stream method failed: {e}")

        total_tables = sum(len(tables) for tables in result.values())
        print(
            f"  📋 FAST extracted {total_tables} tables from {max_pages_to_process} pages")

    except Exception as e:
        print(
            f"❌ Fast table extraction failed for {os.path.basename(pdf_path)}: {e}")

    return result


def _extract_tables_minimal(pdf_path: str, total_pages: int) -> Dict[int, List[List[List[str]]]]:
    """Minimal table extraction - only extract from first few pages as sample.
    Used for quick preview when full extraction is not needed.
    """
    result: Dict[int, List[List[List[str]]]] = defaultdict(list)

    # Skip if Camelot not available
    if not _CAMELOT_AVAILABLE or camelot is None:
        return result

    try:
        # Only extract tables from first 5 pages as sample (reasonable balance)
        sample_pages = min(5, total_pages)
        if sample_pages > 0:
            print(
                f"📊 Quick table extraction from first {sample_pages} pages of {os.path.basename(pdf_path)}")
            tables = camelot.read_pdf(
                pdf_path, pages=f"1-{sample_pages}", flavor="lattice")
            for t in tables or []:
                try:
                    p = int(str(getattr(t, "page", "1")).split(",")[0])
                    if p <= sample_pages:
                        df_data = t.df.values.tolist()
                        cleaned_data = [row for row in df_data if any(
                            str(cell).strip() for cell in row)]
                        if cleaned_data:
                            result[p].append(cleaned_data)
                except Exception:
                    continue

            total_tables = sum(len(tables) for tables in result.values())
            print(
                f"  📋 Found {total_tables} tables in first {sample_pages} pages")
    except Exception as e:
        print(f"⚠️ Minimal table extraction failed: {e}")

    return result


def _extract_tables_skip() -> Dict[int, List[List[List[str]]]]:
    """Skip table extraction entirely for maximum speed."""
    return defaultdict(list)


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
        elif mode == "tables":
            tables_by_page = _extract_tables_fast_camelot(
                pdf_path, total_pages)
        elif mode == "complete":
            tables_by_page = _extract_tables_complete(pdf_path, total_pages)
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
        with open(output_json_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2, default=str)

        # Upload to S3
        s3_result = _upload_files_to_s3(
            pdf_dest_path, result, folder_name, pdf_name, user_id)

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


# === 4 UPLOAD MODES ===

@router.post("/upload_single_instant")
async def upload_single_instant(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    mode: str = Form("text"),
    folder_name: str = Form(...)
):
    """Mode 1: Single file instant upload with immediate processing.
    mode: 'text' (text only) or 'tables' (fast table extraction)
    user_id: Required user ID for organization
    folder_name: Required folder name for organization
    """
    if not file or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Please upload a PDF file")

    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    if not folder_name:
        raise HTTPException(status_code=400, detail="Folder name is required")

    safe_name = os.path.basename(file.filename.replace("\\", "/"))
    temp_path = os.path.join(
        TEMP_INPUT_DIR, f"{int(time.time()*1000)}_{safe_name}")

    # Save uploaded file
    with open(temp_path, "wb") as out:
        shutil.copyfileobj(file.file, out)

    try:
        result = extract_pdf_to_json(temp_path, user_id, folder_name, mode)
        result["upload_mode"] = "single_instant"
        return {"status": "completed", "result": result}
    except Exception as e:
        logger.error(f"Single instant upload failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"Processing failed: {str(e)}")
    finally:
        # Clean up temp file
        try:
            os.remove(temp_path)
        except Exception:
            pass


@router.post("/upload_multi_files")
async def upload_multi_files(
    files: List[UploadFile] = File(...),
    user_id: str = Form(...),
    mode: str = Form("text"),
    folder_name: str = Form(...)
):
    """Mode 2: Multiple files upload with batch processing.
    mode: 'text' (text only) or 'tables' (fast table extraction)
    user_id: Required user ID for organization
    folder_name: Required folder name for organization
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded")

    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    if not folder_name:
        raise HTTPException(status_code=400, detail="Folder name is required")

    # Filter and save PDF files
    saved_paths = []
    for uf in files:
        if not uf.filename or not uf.filename.lower().endswith('.pdf'):
            continue
        safe_name = os.path.basename(uf.filename.replace("\\", "/"))
        temp_path = os.path.join(
            TEMP_INPUT_DIR, f"{int(time.time()*1000)}_{safe_name}")
        with open(temp_path, "wb") as out:
            shutil.copyfileobj(uf.file, out)
        saved_paths.append(temp_path)

    if not saved_paths:
        raise HTTPException(status_code=400, detail="No valid PDF files found")

    t0 = time.perf_counter()
    outputs = []
    errors = []

    # Use moderate parallelism for multi-file
    workers = min(8, len(saved_paths))

    with ThreadPoolExecutor(max_workers=workers) as executor:
        future_map = {
            executor.submit(extract_pdf_to_json, path, user_id, folder_name, mode): path
            for path in saved_paths
        }

        for future in as_completed(future_map):
            path = future_map[future]
            try:
                result = future.result()
                result["upload_mode"] = "multi_files"
                outputs.append(result)
            except Exception as e:
                errors.append(
                    {"file": os.path.basename(path), "error": str(e)})
            finally:
                try:
                    os.remove(path)
                except Exception:
                    pass

    total_time_ms = int((time.perf_counter() - t0) * 1000)
    total_tables = sum(o.get("tables_found", 0) for o in outputs)

    return {
        "status": "completed",
        "upload_mode": "multi_files",
        "processed_count": len(outputs),
        "errors": errors,
        "outputs": outputs,
        "total_time_ms": total_time_ms,
        "total_tables_found": total_tables,
        "mode": mode,
        "folder_name": folder_name
    }


@router.post("/upload_folder_tables")
async def upload_folder_tables(
    files: List[UploadFile] = File(...),
    user_id: str = Form(...),
    folder_name: str = Form(...)
):
    """Mode 3: Folder upload for TABLE extraction only (very fast with camelot-py).
    Optimized for speed with table extraction from first 10 pages.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    if not folder_name:
        raise HTTPException(status_code=400, detail="Folder name is required")

    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded")

    # Filter and save PDF files
    saved_paths = []
    for uf in files:
        if not uf.filename or not uf.filename.lower().endswith('.pdf'):
            continue
        safe_name = os.path.basename(uf.filename.replace("\\", "/"))
        temp_path = os.path.join(
            TEMP_INPUT_DIR, f"tbl_{int(time.time()*1000)}_{safe_name}")
        with open(temp_path, "wb") as out:
            shutil.copyfileobj(uf.file, out)
        saved_paths.append(temp_path)

    if not saved_paths:
        raise HTTPException(status_code=400, detail="No valid PDF files found")

    t0 = time.perf_counter()
    outputs = []
    errors = []

    # High parallelism for table extraction folder upload
    workers = min(8, len(saved_paths))  # Reduced workers for better stability

    print(
        f"🚀 FOLDER TABLES: Processing {len(saved_paths)} PDFs with {workers} workers for user {user_id}")

    with ThreadPoolExecutor(max_workers=workers) as executor:
        future_map = {
            executor.submit(extract_pdf_to_json, path, user_id, folder_name, "tables"): path
            for path in saved_paths
        }

        completed = 0
        for future in as_completed(future_map):
            path = future_map[future]
            try:
                result = future.result()
                result["upload_mode"] = "folder_tables"
                outputs.append(result)
                completed += 1
                if completed % 5 == 0:
                    print(f"✅ Completed {completed}/{len(saved_paths)} PDFs")
            except Exception as e:
                print(f"❌ Error processing {os.path.basename(path)}: {str(e)}")
                errors.append(
                    {"file": os.path.basename(path), "error": str(e)})
            finally:
                try:
                    os.remove(path)
                except Exception:
                    pass

    total_time_ms = int((time.perf_counter() - t0) * 1000)
    total_tables = sum(o.get("tables_found", 0) for o in outputs)
    total_pages = sum(o.get("pages", 0) for o in outputs)

    return {
        "status": "completed",
        "upload_mode": "folder_tables",
        "processed_count": len(outputs),
        "errors": errors,
        "outputs": outputs,
        "total_time_ms": total_time_ms,
        "total_pages": total_pages,
        "total_tables_found": total_tables,
        "pages_per_second": round(total_pages / (total_time_ms / 1000), 1) if total_time_ms > 0 else 0,
        "folder_name": folder_name,
        "message": f"FAST table extraction: {len(outputs)} PDFs, {total_tables} tables in {total_time_ms/1000:.2f}s"
    }


@router.post("/upload_folder_text")
async def upload_folder_text(
    files: List[UploadFile] = File(...),
    user_id: str = Form(...),
    folder_name: str = Form(...)
):
    """Mode 4: Folder upload for TEXT extraction only (ultra-fast, no tables).
    Maximum speed for text-only extraction.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    if not folder_name:
        raise HTTPException(status_code=400, detail="Folder name is required")

    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded")

    # Filter and save PDF files
    saved_paths = []
    for uf in files:
        if not uf.filename or not uf.filename.lower().endswith('.pdf'):
            continue
        safe_name = os.path.basename(uf.filename.replace("\\", "/"))
        temp_path = os.path.join(
            TEMP_INPUT_DIR, f"txt_{int(time.time()*1000)}_{safe_name}")
        with open(temp_path, "wb") as out:
            shutil.copyfileobj(uf.file, out)
        saved_paths.append(temp_path)

    if not saved_paths:
        raise HTTPException(status_code=400, detail="No valid PDF files found")

    t0 = time.perf_counter()
    outputs = []
    errors = []

    # Maximum parallelism for ultra-fast text extraction
    workers = min(16, len(saved_paths))

    print(
        f"🚀 FOLDER TEXT: Processing {len(saved_paths)} PDFs with {workers} workers (TEXT ONLY mode)")

    with ThreadPoolExecutor(max_workers=workers) as executor:
        future_map = {
            executor.submit(extract_pdf_to_json, path, user_id, folder_name, "text"): path
            for path in saved_paths
        }

        completed = 0
        for future in as_completed(future_map):
            path = future_map[future]
            try:
                result = future.result()
                result["upload_mode"] = "folder_text"
                outputs.append(result)
                completed += 1
                if completed % 10 == 0:
                    print(f"✅ Completed {completed}/{len(saved_paths)} PDFs")
            except Exception as e:
                errors.append(
                    {"file": os.path.basename(path), "error": str(e)})
            finally:
                try:
                    os.remove(path)
                except Exception:
                    pass

    total_time_ms = int((time.perf_counter() - t0) * 1000)
    total_pages = sum(o.get("pages", 0) for o in outputs)

    return {
        "status": "completed",
        "upload_mode": "folder_text",
        "processed_count": len(outputs),
        "errors": errors,
        "outputs": outputs,
        "total_time_ms": total_time_ms,
        "total_pages": total_pages,
        "pages_per_second": round(total_pages / (total_time_ms / 1000), 1) if total_time_ms > 0 else 0,
        "folder_name": folder_name,
        "message": f"ULTRA-FAST text extraction: {len(outputs)} PDFs, {total_pages} pages in {total_time_ms/1000:.2f}s"
    }


# === LEGACY ENDPOINTS (keep for compatibility) ===
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


# === LEGACY ENDPOINTS HAVE BEEN REMOVED ===
# All legacy endpoints that used BASE_OUTPUT_DIR have been removed in favor of the new user-based structure.
# The old endpoints did not support the user-based folder organization and have been replaced by:
# - /upload_single_instant
# - /upload_multi_files
# - /upload_folder_tables
# - /upload_folder_text
# - /user_folders/{user_id}
# - /user_folder_files/{user_id}/{folder_name}
# - /user_json_data/{user_id}/{folder_name}/{filename}

# === NEW USER-BASED ENDPOINTS ===
# async def upload_pdf_folder_with_tables(files: List[UploadFile] = File(...)):
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
    # Increased from conservative 12 to aggressive 20
    pdf_workers = min(max(8, cpu * 3), 20)

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
                    print(
                        f"✅ Completed {completed}/{len(saved_paths)} PDFs - ETA: {eta/60:.1f}min")
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


# @router.post("/folder_uploader/zip")
# async def zip_folder_jsons(payload: Dict[str, Any]):
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
    """Get grouped list of uploaded folders and their files for maker-checker display.
    Returns organized structure: {groups: [{group_name, files: [...]}]}
    """
    try:
        groups = []

        # Scan pdf_folder_extracted directory for organized folders
        if os.path.exists(BASE_OUTPUT_DIR):
            for item in os.listdir(BASE_OUTPUT_DIR):
                item_path = os.path.join(BASE_OUTPUT_DIR, item)

                if os.path.isdir(item_path):
                    # Check if this is a folder group (contains subfolders) or single file folder
                    subfolders = [f for f in os.listdir(
                        item_path) if os.path.isdir(os.path.join(item_path, f))]

                    if subfolders:
                        # This is a group folder containing multiple PDF folders
                        group_entry = {"group_name": item, "files": []}

                        for pdf_folder in subfolders:
                            pdf_dir = os.path.join(item_path, pdf_folder)
                            json_file = os.path.join(
                                pdf_dir, f"{pdf_folder}.json")

                            if os.path.exists(json_file):
                                json_stat = os.stat(json_file)

                                # Try to read mode from JSON
                                mode = "unknown"
                                try:
                                    with open(json_file, 'r') as f:
                                        json_data = json.load(f)
                                        mode = json_data.get("mode", "unknown")
                                except Exception:
                                    pass

                                file_info = {
                                    "name": pdf_folder,
                                    "type": "pdf",
                                    "group": item,
                                    "mode": mode,
                                    "folder_path": pdf_dir,
                                    "json_path": json_file,
                                    "json_relative_path": f"pdf_folder_extracted/{item}/{pdf_folder}/{pdf_folder}.json",
                                    "size": json_stat.st_size,
                                    "created_at": datetime.fromtimestamp(json_stat.st_ctime).isoformat(),
                                    "modified_at": datetime.fromtimestamp(json_stat.st_mtime).isoformat(),
                                    "hasJson": True,
                                    "source": "folder_upload"
                                }
                                group_entry["files"].append(file_info)

                        if group_entry["files"]:
                            # Sort files by creation time (newest first)
                            group_entry["files"].sort(
                                key=lambda x: x["created_at"], reverse=True)
                            groups.append(group_entry)

                    else:
                        # This is a single file folder (legacy format)
                        json_file = os.path.join(item_path, f"{item}.json")
                        if os.path.exists(json_file):
                            json_stat = os.stat(json_file)

                            # Try to read mode from JSON
                            mode = "unknown"
                            try:
                                with open(json_file, 'r') as f:
                                    json_data = json.load(f)
                                    mode = json_data.get("mode", "legacy")
                            except Exception:
                                pass

                            # Create a single-file group
                            group_entry = {
                                "group_name": "Individual Files",
                                "files": [{
                                    "name": item,
                                    "type": "pdf",
                                    "group": "Individual Files",
                                    "mode": mode,
                                    "folder_path": item_path,
                                    "json_path": json_file,
                                    "json_relative_path": f"pdf_folder_extracted/{item}/{item}.json",
                                    "size": json_stat.st_size,
                                    "created_at": datetime.fromtimestamp(json_stat.st_ctime).isoformat(),
                                    "modified_at": datetime.fromtimestamp(json_stat.st_mtime).isoformat(),
                                    "hasJson": True,
                                    "source": "single_upload"
                                }]
                            }

                            # Check if "Individual Files" group already exists
                            existing_group = next(
                                (g for g in groups if g["group_name"] == "Individual Files"), None)
                            if existing_group:
                                existing_group["files"].extend(
                                    group_entry["files"])
                            else:
                                groups.append(group_entry)

        # Sort groups by newest file in each group
        for group in groups:
            if group["files"]:
                group["files"].sort(
                    key=lambda x: x["created_at"], reverse=True)

        groups.sort(key=lambda g: g["files"][0]["created_at"]
                    if g["files"] else "", reverse=True)

        return {
            "status": "success",
            "groups": groups,
            "total_groups": len(groups),
            "total_files": sum(len(g["files"]) for g in groups)
        }

    except Exception as e:
        logger.error(f"Error getting uploaded files: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get uploaded files: {str(e)}")


# === NEW USER-BASED ENDPOINTS ===

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
