"""
PDF Table Extraction API Routes
Professional endpoints for handling bulk PDF processing
"""

import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Form
from fastapi.responses import FileResponse, JSONResponse
from typing import List, Optional
import os
import uuid
import json
import tempfile
import shutil
from datetime import datetime
import pandas as pd
import sys
import traceback
from pathlib import Path
import asyncio
import threading
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure comprehensive logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('extraction_debug.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Debug helper functions


def debug_log(message: str, data: any = None):
    """Enhanced debug logging with data inspection"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n{'='*60}")
    print(f"DEBUG [{timestamp}]: {message}")
    if data:
        if isinstance(data, dict):
            print(f"Data type: {type(data).__name__}")
            print(
                f"Keys: {list(data.keys()) if hasattr(data, 'keys') else 'N/A'}")
            print(
                f"Content: {json.dumps(data, indent=2, default=str)[:500]}...")
        else:
            print(f"Data type: {type(data).__name__}")
            print(f"Content: {str(data)[:500]}...")
    print(f"{'='*60}\n")


def trace_error(error: Exception, context: str = ""):
    """Detailed error tracing"""
    error_details = {
        "context": context,
        "error_type": type(error).__name__,
        "error_message": str(error),
        "traceback": traceback.format_exc()
    }
    debug_log(f"ERROR in {context}", error_details)
    return error_details


print("PDF Table Extraction API")
# Try to import the PDF extractor, fallback to simple version if not available
try:
    from services.pdf_extraction_service import PDFTableExtractor, create_extraction_summary
    EXTRACTOR_AVAILABLE = True
except ImportError:
    EXTRACTOR_AVAILABLE = False

# Try to import Gemini verifier
try:
    from gemini_verifier import GeminiVerifier
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("Gemini verifier not available")

router = APIRouter()

# Directories
UPLOAD_DIR = "uploads"
EXTRACTION_DIR = "extractions"
TEMP_DIR = "temp"

# Create directories
for directory in [UPLOAD_DIR, EXTRACTION_DIR, TEMP_DIR]:
    os.makedirs(directory, exist_ok=True)

# In-memory job storage (in production, use Redis or database)
job_status = {}

print("PDF Table Extraction API initialized")


class JobManager:
    """Manage extraction jobs status and results"""

    @staticmethod
    def create_job(job_id: str, total_files: int = 0):
        job_status[job_id] = {
            "id": job_id,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "total_files": total_files,
            "processed_files": 0,
            "current_file": None,
            "progress": 0,
            "results": None,
            "error": None
        }

    @staticmethod
    def update_job(job_id: str, **kwargs):
        if job_id in job_status:
            job_status[job_id].update(kwargs)
            if "processed_files" in kwargs and "total_files" in job_status[job_id]:
                total = job_status[job_id]["total_files"]
                processed = kwargs["processed_files"]
                job_status[job_id]["progress"] = (
                    processed / total * 100) if total > 0 else 0

    @staticmethod
    def get_job(job_id: str):
        return job_status.get(job_id)

    @staticmethod
    def complete_job(job_id: str, results: dict):
        if job_id in job_status:
            job_status[job_id].update({
                "status": "completed",
                "completed_at": datetime.now().isoformat(),
                "progress": 100,
                "results": results
            })

    @staticmethod
    def fail_job(job_id: str, error: str):
        if job_id in job_status:
            job_status[job_id].update({
                "status": "failed",
                "failed_at": datetime.now().isoformat(),
                "error": error
            })


print("JobManager initialized")


async def save_uploaded_files(files: List[UploadFile], job_id: str) -> List[str]:
    """Save uploaded files to temporary directory"""
    saved_paths = []
    job_dir = os.path.join(TEMP_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    for file in files:
        if not file.filename.lower().endswith('.pdf'):
            continue

        file_path = os.path.join(job_dir, file.filename)

        # Save file synchronously
        with open(file_path, 'wb') as f:
            content = await file.read()
            f.write(content)

        saved_paths.append(file_path)
        logger.info(f"Saved file: {file.filename}")
    print(f"Saved files for job {job_id}: {saved_paths}")
    print("All files saved successfully.")
    return saved_paths

print("PDF Table Extraction API initialized")


async def process_pdfs_background(file_paths: List[str], job_id: str):
    """Background processing of PDF files with enhanced debugging and Gemini verification"""
    debug_log(f"Starting background processing", {
        "job_id": job_id,
        "file_count": len(file_paths),
        "file_paths": file_paths
    })

    try:
        JobManager.update_job(job_id, status="processing")
        debug_log("Job status updated to processing")

        if not EXTRACTOR_AVAILABLE:
            error_msg = "PDF extraction engine not available. Please install required dependencies."
            debug_log("CRITICAL ERROR", {"error": error_msg})
            raise Exception(error_msg)

        extractor = PDFTableExtractor()
        gemini_verifier = GeminiVerifier() if GEMINI_AVAILABLE else None
        results = {}

        debug_log("Initialized extractors", {
            "extractor_available": EXTRACTOR_AVAILABLE,
            "gemini_available": GEMINI_AVAILABLE,
            "gemini_verifier": gemini_verifier is not None
        })

        # Create output directory for this job
        output_dir = os.path.join(EXTRACTION_DIR, job_id)
        os.makedirs(output_dir, exist_ok=True)
        debug_log(f"Created output directory: {output_dir}")

        total_files = len(file_paths)

        for i, pdf_path in enumerate(file_paths):
            file_start_time = datetime.now()
            try:
                filename = os.path.basename(pdf_path)
                debug_log(f"Processing file {i+1}/{total_files}", {
                    "filename": filename,
                    "pdf_path": pdf_path,
                    "file_exists": os.path.exists(pdf_path),
                    "file_size": os.path.getsize(pdf_path) if os.path.exists(pdf_path) else "N/A"
                })

                JobManager.update_job(
                    job_id,
                    current_file=filename,
                    processed_files=i,
                    status="extracting"
                )

                logger.info(f"Processing {filename} ({i+1}/{total_files})")

                # Step 1: Extract tables with debugging
                debug_log("Starting table extraction", {
                          "extractor_type": type(extractor).__name__})
                tables = extractor.extract_all_cleaned_tables(pdf_path)

                debug_log("Table extraction completed", {
                    "table_count": len(tables) if tables else 0,
                    "table_types": [type(t).__name__ for t in tables] if tables else []
                })

                if tables:
                    base_name = os.path.splitext(filename)[0]

                    # Step 2: Prepare data for Gemini verification
                    debug_log("Converting tables to JSON")
                    extracted_data = extractor.tables_to_json(
                        tables, {'filename': filename})

                    debug_log("Extracted data prepared", {
                        "data_keys": list(extracted_data.keys()) if extracted_data else [],
                        "table_count_in_data": len(extracted_data.get('tables', [])) if extracted_data else 0
                    })

                    # Step 3: Gemini verification (if available)
                    if gemini_verifier and GEMINI_AVAILABLE:
                        JobManager.update_job(
                            job_id, status="verifying_with_ai")
                        debug_log(f"Starting Gemini verification", {
                            "filename": filename,
                            "gemini_api_key_available": gemini_verifier.api_key is not None
                        })

                        try:
                            # Verify with Gemini AI
                            verification_start_time = datetime.now()
                            verified_data = await gemini_verifier.verify_extraction(
                                pdf_path, extracted_data)
                            verification_duration = (
                                datetime.now() - verification_start_time).total_seconds()

                            debug_log("Gemini verification completed", {
                                "filename": filename,
                                "verification_duration_seconds": verification_duration,
                                "verified_data_keys": list(verified_data.keys()) if verified_data else [],
                                "has_corrected_data": "corrected_data" in (verified_data or {}),
                                "has_verification_summary": "verification_summary" in (verified_data or {})
                            })

                            # Use verified/corrected data
                            final_data = verified_data.get(
                                'corrected_data', extracted_data)
                            verification_summary = verified_data.get(
                                'verification_summary', {})

                            debug_log("Using verified data", {
                                "accuracy_score": verification_summary.get('accuracy_score', 'N/A'),
                                "issues_found": verification_summary.get('issues_found', []),
                                "confidence_level": verification_summary.get('confidence_level', 'unknown')
                            })

                            logger.info(f"Gemini verification completed for {filename}. "
                                        f"Accuracy score: {verification_summary.get('accuracy_score', 'N/A')}")

                        except Exception as e:
                            error_details = trace_error(
                                e, f"Gemini verification for {filename}")
                            logger.error(
                                f"Gemini verification failed for {filename}: {str(e)}")
                            final_data = extracted_data
                            verified_data = gemini_verifier._create_fallback_response(
                                extracted_data)

                            debug_log("Using fallback response due to Gemini error", {
                                "error": str(e),
                                "fallback_data_keys": list(verified_data.keys()) if verified_data else []
                            })
                    else:
                        # No Gemini verification available
                        debug_log(
                            "No Gemini verification available, using raw extraction")
                        final_data = extracted_data
                        verified_data = {
                            "verification_summary": {
                                "accuracy_score": 80,
                                "issues_found": ["AI verification not available"],
                                "confidence_level": "medium"
                            },
                            "corrected_data": extracted_data,
                            "validation_notes": ["Basic extraction without AI verification"]
                        }

                    debug_log(f"Final data prepared for {filename}", {
                        "table_count": len(final_data.get('tables', [])),
                        "verification_available": GEMINI_AVAILABLE,
                        "accuracy_score": verified_data.get('verification_summary', {}).get('accuracy_score', 'N/A')
                    })

                    # Step 4: Save original CSV files
                    debug_log("Saving tables to CSV files")
                    saved_files = extractor.save_tables_to_csv(
                        tables, output_dir, base_name)
                    debug_log("CSV files saved", {"saved_files": saved_files})

                    # Step 5: Save verified JSON data
                    debug_log("Saving verified JSON data")
                    verified_json_file = os.path.join(
                        output_dir, f"{base_name}_verified_tables.json")
                    with open(verified_json_file, 'w') as f:
                        json.dump(verified_data, f, indent=2, default=str)
                    debug_log("Verified JSON saved", {
                              "file_path": verified_json_file})

                    # Step 6: Save original extraction for comparison
                    debug_log("Saving original extraction data")
                    original_json_file = os.path.join(
                        output_dir, f"{base_name}_original_tables.json")
                    with open(original_json_file, 'w') as f:
                        json.dump(extracted_data, f, indent=2, default=str)
                    debug_log("Original JSON saved", {
                              "file_path": original_json_file})

                    # Step 7: Save corrected CSV files using enhanced method
                    if GEMINI_AVAILABLE and 'corrected_data' in verified_data:
                        debug_log(
                            "Saving corrected CSV files with Gemini data")
                        try:
                            corrected_files = extractor.save_corrected_tables_to_csv(
                                verified_data['corrected_data'], output_dir, base_name)
                            debug_log("Corrected CSV files saved", {
                                "file_count": len(corrected_files),
                                "files": corrected_files
                            })
                        except Exception as e:
                            trace_error(
                                e, f"Saving corrected CSV for {filename}")
                            # Fallback to old method
                            debug_log("Using fallback CSV save method")
                            corrected_tables = verified_data['corrected_data'].get(
                                'tables', [])
                            for table_idx, table_info in enumerate(corrected_tables):
                                if 'data' in table_info and 'headers' in table_info:
                                    try:
                                        headers = table_info.get('headers', [])
                                        data = table_info.get('data', [])
                                        if headers and data:
                                            corrected_df = pd.DataFrame(
                                                data, columns=headers)
                                            corrected_csv_file = os.path.join(
                                                output_dir, f"{base_name}_verified_table_{table_idx+1}.csv")
                                            corrected_df.to_csv(
                                                corrected_csv_file, index=False)
                                            debug_log(f"Saved corrected table {table_idx+1}", {
                                                "file_path": corrected_csv_file,
                                                "rows": len(data),
                                                "columns": len(headers)
                                            })
                                    except Exception as e:
                                        trace_error(
                                            e, f"Saving individual corrected table {table_idx+1}")

                    # Convert DataFrames to JSON-serializable format
                    debug_log(
                        "Converting DataFrames to JSON-serializable format")
                    tables_json = []
                    for table in tables:
                        if hasattr(table, 'to_dict'):
                            tables_json.append(table.to_dict('records'))
                        else:
                            tables_json.append([])

                    results[filename] = {
                        'original_tables': tables_json,
                        'table_count': len(tables),
                        'verified_data': verified_data,
                        'verification_available': GEMINI_AVAILABLE
                    }
                else:
                    results[filename] = {
                        'original_tables': [],
                        'verified_data': None,
                        'verification_available': False
                    }

                JobManager.update_job(
                    job_id, processed_files=i+1, status="processing")

            except Exception as e:
                logger.error(f"Error processing {pdf_path}: {str(e)}")
                results[os.path.basename(pdf_path)] = {
                    'original_tables': [],
                    'verified_data': None,
                    'error': str(e)
                }

        # Create enhanced summary with verification data
        summary = create_enhanced_extraction_summary(results)

        # Save complete results with verification data
        results_file = os.path.join(
            output_dir, "extraction_summary_verified.json")
        final_results = {
            'job_id': job_id,
            'summary': summary,
            'output_directory': output_dir,
            'completed_at': datetime.now().isoformat(),
            'gemini_verification_enabled': GEMINI_AVAILABLE,
            'detailed_results': results
        }

        with open(results_file, 'w') as f:
            json.dump(final_results, f, indent=2)

        JobManager.complete_job(job_id, final_results)

        # Cleanup temp files
        temp_dir = os.path.join(TEMP_DIR, job_id)
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

        logger.info(f"Bulk processing completed for job {job_id}")

    except Exception as e:
        logger.error(
            f"Background processing failed for job {job_id}: {str(e)}")
        JobManager.fail_job(job_id, str(e))
    print(f"Background processing completed for job {job_id}")


@router.post("/extract/bulk")
async def extract_bulk_pdfs(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    extract_mode: str = Form("both")  # both, stream, lattice
):
    """
    Extract tables from multiple PDF files
    Supports up to 1000 PDF files for bulk processing
    """
    print("Bulk PDF extraction requested")

    # Validate files
    pdf_files = [f for f in files if f.filename.lower().endswith('.pdf')]

    if not pdf_files:
        raise HTTPException(status_code=400, detail="No PDF files provided")

    if len(pdf_files) > 1000:
        raise HTTPException(
            status_code=400, detail="Maximum 1000 PDF files allowed")

    if not EXTRACTOR_AVAILABLE:
        raise HTTPException(
            status_code=503, detail="PDF extraction engine not available. Please install required dependencies.")
    print(f"Received {len(pdf_files)} PDF files for extraction")
    # Create job
    job_id = str(uuid.uuid4())
    JobManager.create_job(job_id, len(pdf_files))
    print(
        f"Bulk PDF extraction started for job {job_id} with {len(pdf_files)} files")
    try:
        # Save uploaded files
        saved_paths = await save_uploaded_files(pdf_files, job_id)

        if not saved_paths:
            raise HTTPException(
                status_code=400, detail="Failed to save uploaded files")

        # Start background processing
        background_tasks.add_task(process_pdfs_background, saved_paths, job_id)

        return {
            "job_id": job_id,
            "status": "accepted",
            "message": f"Processing {len(saved_paths)} PDF files",
            "total_files": len(saved_paths),
            "check_status_url": f"/api/extraction/status/{job_id}"
        }

    except Exception as e:
        JobManager.fail_job(job_id, str(e))
        raise HTTPException(
            status_code=500, detail=f"Failed to start processing: {str(e)}")


@router.post("/extract/single")
async def extract_single_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    extract_mode: str = Form("both"),  # both, stream, lattice
    return_format: str = Form("json")  # json, tables, both
):
    """
    Extract tables from a single PDF file with immediate response
    Supports synchronous and asynchronous processing
    """
    debug_log("Single PDF extraction requested", {
        "filename": file.filename,
        "extract_mode": extract_mode,
        "return_format": return_format,
        "content_type": file.content_type
    })

    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    if not EXTRACTOR_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="PDF extraction engine not available. Please install required dependencies."
        )

    # Create unique job ID for tracking
    job_id = str(uuid.uuid4())
    JobManager.create_job(job_id, 1)

    try:
        # Save the uploaded file
        temp_dir = os.path.join(TEMP_DIR, job_id)
        os.makedirs(temp_dir, exist_ok=True)

        file_path = os.path.join(temp_dir, file.filename)
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        debug_log("File saved for single extraction", {
            "file_path": file_path,
            "file_size": len(content)
        })

        # Process immediately for single file
        extractor = PDFTableExtractor()
        gemini_verifier = GeminiVerifier() if GEMINI_AVAILABLE else None

        # Extract tables
        JobManager.update_job(job_id, status="extracting",
                              current_file=file.filename)
        tables = extractor.extract_all_cleaned_tables(file_path)

        if not tables:
            debug_log("No tables found in PDF")
            return {
                "job_id": job_id,
                "status": "completed",
                "filename": file.filename,
                "tables": [],
                "message": "No tables found in the PDF",
                "extraction_summary": {
                    "total_tables": 0,
                    "pages_processed": 1,
                    "extraction_method": extract_mode
                }
            }

        # Convert to JSON format
        extracted_data = extractor.tables_to_json(
            tables, {'filename': file.filename})

        # Gemini verification if available
        final_data = extracted_data
        verification_summary = {}

        if gemini_verifier and GEMINI_AVAILABLE:
            debug_log("Starting Gemini verification for single file")
            JobManager.update_job(job_id, status="verifying_with_ai")

            try:
                verified_data = await gemini_verifier.verify_extraction(file_path, extracted_data)
                final_data = verified_data.get(
                    'corrected_data', extracted_data)
                verification_summary = verified_data.get(
                    'verification_summary', {})

                debug_log("Single file Gemini verification completed", {
                    "accuracy_score": verification_summary.get('accuracy_score', 'N/A'),
                    "confidence_level": verification_summary.get('confidence_level', 'unknown')
                })
            except Exception as e:
                trace_error(e, "Single file Gemini verification")
                verification_summary = {
                    "accuracy_score": 75,
                    "issues_found": [f"Verification failed: {str(e)}"],
                    "confidence_level": "low"
                }

        # Save results to output directory
        output_dir = os.path.join(EXTRACTION_DIR, job_id)
        os.makedirs(output_dir, exist_ok=True)
        base_name = os.path.splitext(file.filename)[0]

        # Save JSON files
        verified_json_file = os.path.join(
            output_dir, f"{base_name}_verified_tables.json")
        with open(verified_json_file, 'w') as f:
            json.dump(final_data, f, indent=2, default=str)

        original_json_file = os.path.join(
            output_dir, f"{base_name}_original_tables.json")
        with open(original_json_file, 'w') as f:
            json.dump(extracted_data, f, indent=2, default=str)

        # Format response based on requested format
        response_data = {
            "job_id": job_id,
            "status": "completed",
            "filename": file.filename,
            "extraction_summary": {
                "total_tables": len(final_data.get('tables', [])),
                "pages_processed": len(set(table.get('metadata', {}).get('page_number', 1)
                                       for table in final_data.get('tables', []))),
                "extraction_method": extract_mode,
                "verification_available": GEMINI_AVAILABLE,
                "accuracy_score": verification_summary.get('accuracy_score', 'N/A'),
                "confidence_level": verification_summary.get('confidence_level', 'medium')
            },
            "files": {
                "verified_json": verified_json_file,
                "original_json": original_json_file
            }
        }

        if return_format in ["json", "both"]:
            response_data["tables"] = final_data.get('tables', [])

        if return_format in ["tables", "both"]:
            # Format tables for easy frontend display
            formatted_tables = []
            for i, table in enumerate(final_data.get('tables', [])):
                formatted_table = {
                    "table_id": i + 1,
                    "title": table.get('title', f'Table {i + 1}'),
                    "headers": table.get('headers', []),
                    "data": table.get('data', []),
                    "row_count": len(table.get('data', [])),
                    "column_count": len(table.get('headers', [])),
                    "page_number": table.get('metadata', {}).get('page_number', 1),
                    "table_type": table.get('metadata', {}).get('table_type', 'unknown')
                }
                formatted_tables.append(formatted_table)

            response_data["formatted_tables"] = formatted_tables

        if verification_summary:
            response_data["verification_summary"] = verification_summary

        # Update job status
        JobManager.update_job(job_id, status="completed", processed_files=1)

        debug_log("Single file extraction completed", {
            "job_id": job_id,
            "table_count": len(final_data.get('tables', [])),
            "verification_score": verification_summary.get('accuracy_score', 'N/A')
        })

        # Cleanup temp files
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

        return response_data

    except Exception as e:
        trace_error(e, f"Single file extraction for {file.filename}")
        JobManager.fail_job(job_id, str(e))

        # Cleanup temp files on error
        temp_dir = os.path.join(TEMP_DIR, job_id)
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

        raise HTTPException(
            status_code=500, detail=f"Extraction failed: {str(e)}")


@router.get("/status/{job_id}")
async def get_job_status(job_id: str):
    """Get the status of a processing job"""
    print(f"Checking status for job {job_id}")
    job = JobManager.get_job(job_id)
    print(f"Job status requested for job {job_id}")
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    print(f"Job status requested for job {job_id}: {job['status']}")
    return job


@router.get("/results/{job_id}")
async def get_job_results(job_id: str):
    """Get the results of a completed job"""
    print(f"Requesting results for job {job_id}")
    job = JobManager.get_job(job_id)
    print(f"Job results requested for job {job_id}")
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["status"] != "completed":
        raise HTTPException(
            status_code=400, detail=f"Job status: {job['status']}")
    print(f"Job results requested for job {job_id}")
    return job["results"]


@router.get("/download/{job_id}")
async def download_results(job_id: str, format: str = "json", data_type: str = "verified"):
    """Download extraction results (original, verified, or both)"""
    print(
        f"Download requested for job {job_id} in format {format}, type {data_type}")
    job = JobManager.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["status"] != "completed":
        raise HTTPException(
            status_code=400, detail=f"Job status: {job['status']}")

    output_dir = os.path.join(EXTRACTION_DIR, job_id)

    if format == "json":
        if data_type == "verified":
            results_file = os.path.join(
                output_dir, "extraction_summary_verified.json")
            filename = f"verified_results_{job_id}.json"
        else:
            # For original data, try the verified file first, then fall back to old format
            results_file = os.path.join(
                output_dir, "extraction_summary_verified.json")
            if not os.path.exists(results_file):
                results_file = os.path.join(
                    output_dir, "extraction_summary.json")
            filename = f"extraction_results_{job_id}.json"

        if os.path.exists(results_file):
            return FileResponse(
                results_file,
                filename=filename,
                media_type="application/json"
            )

    print(
        f"Download requested for job {job_id} in format {format}, type {data_type}")
    raise HTTPException(status_code=404, detail="Results file not found")


@router.get("/files/{job_id}")
async def list_extracted_files(job_id: str):
    """List all files generated for a job"""
    print(f"Listing files for job {job_id}")

    job = JobManager.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    output_dir = os.path.join(EXTRACTION_DIR, job_id)

    if not os.path.exists(output_dir):
        raise HTTPException(
            status_code=404, detail="Output directory not found")

    files = []
    for filename in os.listdir(output_dir):
        file_path = os.path.join(output_dir, filename)
        file_info = {
            "filename": filename,
            "size": os.path.getsize(file_path),
            "type": "csv" if filename.endswith('.csv') else "json" if filename.endswith('.json') else "other"
        }
        files.append(file_info)
    print(f"Files listed for job {job_id}: {files}")
    return {
        "job_id": job_id,
        "files": files,
        "total_files": len(files)
    }


@router.get("/file/{job_id}/{filename}")
async def download_specific_file(job_id: str, filename: str):
    """Download a specific file from extraction results"""

    job = JobManager.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    file_path = os.path.join(EXTRACTION_DIR, job_id, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    print(f"File download requested for job {job_id}, file {filename}")
    return FileResponse(file_path, filename=filename)


@router.delete("/cleanup/{job_id}")
async def cleanup_job(job_id: str):
    """Clean up job files and data"""

    job = JobManager.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Remove output directory
    output_dir = os.path.join(EXTRACTION_DIR, job_id)
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)

    # Remove temp directory
    temp_dir = os.path.join(TEMP_DIR, job_id)
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)

    # Remove job from memory
    if job_id in job_status:
        del job_status[job_id]
    print(f"Job {job_id} cleaned up successfully")
    return {"message": f"Job {job_id} cleaned up successfully"}


@router.get("/jobs")
async def list_all_jobs():
    """List all jobs"""
    print("Listing all jobs")
    return {
        "jobs": list(job_status.values()),
        "total_jobs": len(job_status)
    }


def create_enhanced_extraction_summary(results: dict) -> dict:
    """Create enhanced summary including verification results"""
    summary = {
        "total_files_processed": len(results),
        "successful_extractions": 0,
        "total_tables_extracted": 0,
        "verification_summary": {
            "files_verified": 0,
            "average_accuracy_score": 0,
            "total_issues_found": 0
        },
        "file_details": []
    }

    total_accuracy_scores = []

    for filename, file_data in results.items():
        file_info = {
            "filename": filename,
            "tables_extracted": 0,
            "status": "no_tables_found",
            "verification_available": file_data.get('verification_available', False)
        }

        # Original tables info
        original_tables = file_data.get('original_tables', [])
        table_count = file_data.get('table_count', len(original_tables))
        if table_count > 0:
            file_info["tables_extracted"] = table_count
            file_info["status"] = "success"
            summary["successful_extractions"] += 1
            summary["total_tables_extracted"] += table_count

        # Verification info
        verified_data = file_data.get('verified_data')
        if verified_data and verified_data.get('verification_summary'):
            verification_summary = verified_data['verification_summary']
            file_info["verification_results"] = {
                "accuracy_score": verification_summary.get('accuracy_score', 0),
                "confidence_level": verification_summary.get('confidence_level', 'unknown'),
                "issues_found": len(verification_summary.get('issues_found', [])),
                "corrections_made": len(verified_data.get('validation_notes', []))
            }

            summary["verification_summary"]["files_verified"] += 1
            accuracy_score = verification_summary.get('accuracy_score', 0)
            if accuracy_score:
                total_accuracy_scores.append(accuracy_score)
                summary["verification_summary"]["total_issues_found"] += len(
                    verification_summary.get('issues_found', []))

        # Error handling
        if 'error' in file_data:
            file_info["error"] = file_data['error']
            file_info["status"] = "error"

        summary["file_details"].append(file_info)

    # Calculate average accuracy
    if total_accuracy_scores:
        summary["verification_summary"]["average_accuracy_score"] = (
            sum(total_accuracy_scores) / len(total_accuracy_scores))

    summary["success_rate"] = (
        summary["successful_extractions"] / summary["total_files_processed"]) * 100 if summary["total_files_processed"] > 0 else 0

    return summary


@router.get("/verified-results/{job_id}")
async def get_verified_results(job_id: str):
    """Get verified extraction results formatted for frontend display"""

    job = JobManager.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["status"] != "completed":
        raise HTTPException(
            status_code=400, detail=f"Job status: {job['status']}")

    results = job.get("results", {})
    detailed_results = results.get("detailed_results", {})

    # Format results for frontend
    frontend_response = {
        "job_id": job_id,
        "processing_summary": {
            "total_files": results.get("summary", {}).get("total_files_processed", 0),
            "successful_extractions": results.get("summary", {}).get("successful_extractions", 0),
            "gemini_verification_enabled": results.get("gemini_verification_enabled", False),
            "completed_at": results.get("completed_at"),
            "success_rate": results.get("summary", {}).get("success_rate", 0)
        },
        "verification_overview": results.get("summary", {}).get("verification_summary", {}),
        "files": []
    }

    for filename, file_data in detailed_results.items():
        file_result = {
            "filename": filename,
            "status": "success" if file_data.get('table_count', 0) > 0 else "failed",
            "tables_count": file_data.get('table_count', len(file_data.get('original_tables', []))),
            "verification_available": file_data.get('verification_available', False),
            "tables": []
        }

        # Add verification results if available
        verified_data = file_data.get('verified_data')
        if verified_data:
            verification_summary = verified_data.get(
                'verification_summary', {})
            file_result["verification_results"] = {
                "accuracy_score": verification_summary.get('accuracy_score', 0),
                "confidence_level": verification_summary.get('confidence_level', 'unknown'),
                "issues_found": verification_summary.get('issues_found', []),
                "corrections_made": len(verified_data.get('validation_notes', []))
            }

            # Get corrected data for display
            corrected_data = verified_data.get('corrected_data', {})
            if 'tables' in corrected_data:
                for table_info in corrected_data['tables']:
                    table_display = {
                        "table_id": table_info.get('table_id', 0),
                        "title": table_info.get('title', f"Table {table_info.get('table_id', 0)}"),
                        "headers": table_info.get('headers', []),
                        "data": table_info.get('data', []),
                        "metadata": table_info.get('metadata', {}),
                        "financial_indicators": table_info.get('financial_indicators', {})
                    }
                    file_result["tables"].append(table_display)

        # Fallback to original data if no verified data
        if not file_result["tables"] and file_data.get('original_tables'):
            original_tables = file_data['original_tables']
            for i, table_data in enumerate(original_tables):
                # table_data is already a list of records (JSON serializable)
                table_display = {
                    "table_id": i + 1,
                    "title": f"Table {i + 1}",
                    "headers": list(table_data[0].keys()) if table_data and len(table_data) > 0 else [],
                    "data": table_data if isinstance(table_data, list) else [],
                    "metadata": {"source": "original_extraction"},
                    "verified": False
                }
                file_result["tables"].append(table_display)

        frontend_response["files"].append(file_result)

    logger.info(f"Verified results formatted for frontend: job {job_id}")
    return frontend_response


@router.get("/verification-details/{job_id}")
async def get_verification_details(job_id: str):
    """Get detailed verification information for a job"""

    job = JobManager.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["status"] != "completed":
        raise HTTPException(
            status_code=400, detail=f"Job status: {job['status']}")

    results = job.get("results", {})
    detailed_results = results.get("detailed_results", {})

    verification_details = {
        "job_id": job_id,
        "verification_enabled": results.get("gemini_verification_enabled", False),
        "files": {}
    }

    for filename, file_data in detailed_results.items():
        verified_data = file_data.get('verified_data')
        if verified_data:
            verification_details["files"][filename] = {
                "verification_summary": verified_data.get('verification_summary', {}),
                "validation_notes": verified_data.get('validation_notes', []),
                "quality_metrics": verified_data.get('quality_metrics', {}),
                "verification_metadata": verified_data.get('verification_metadata', {})
            }
        else:
            verification_details["files"][filename] = {
                "verification_available": False,
                "reason": "Verification not performed or failed"
            }

    return verification_details


@router.post("/reprocess-with-verification/{job_id}")
async def reprocess_with_verification(
    job_id: str,
    background_tasks: BackgroundTasks
):
    """Reprocess an existing job with Gemini verification"""

    if not GEMINI_AVAILABLE:
        raise HTTPException(
            status_code=503, detail="Gemini verification not available")

    job = JobManager.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["status"] != "completed":
        raise HTTPException(
            status_code=400, detail=f"Job status: {job['status']}. Can only reprocess completed jobs.")

    # Create new job for reprocessing
    new_job_id = str(uuid.uuid4())

    # Get original files from the extraction directory
    original_output_dir = job.get("results", {}).get("output_directory")
    if not original_output_dir or not os.path.exists(original_output_dir):
        raise HTTPException(
            status_code=404, detail="Original extraction files not found")

    # Find original PDF files (this would need to be stored in job metadata)
    # For now, we'll return an error asking for re-upload
    raise HTTPException(
        status_code=400,
        detail="Reprocessing requires original PDF files. Please upload files again for verification.")


@router.get("/debug/extraction-status")
async def get_extraction_debug_status():
    """Get debug information about extraction system"""
    try:
        debug_info = {
            "system_status": {
                "extractor_available": EXTRACTOR_AVAILABLE,
                "gemini_available": GEMINI_AVAILABLE,
                "timestamp": datetime.now().isoformat()
            },
            "directories": {
                "upload_dir": UPLOAD_DIR,
                "extraction_dir": EXTRACTION_DIR,
                "temp_dir": TEMP_DIR
            },
            "directory_status": {
                "upload_exists": os.path.exists(UPLOAD_DIR),
                "extraction_exists": os.path.exists(EXTRACTION_DIR),
                "temp_exists": os.path.exists(TEMP_DIR)
            }
        }

        # Check Gemini API key status
        if GEMINI_AVAILABLE:
            from gemini_verifier import GeminiVerifier
            verifier = GeminiVerifier()
            debug_info["gemini_status"] = {
                "api_key_available": verifier.api_key is not None,
                "api_key_length": len(verifier.api_key) if verifier.api_key else 0
            }

        # List recent extractions
        if os.path.exists(EXTRACTION_DIR):
            recent_extractions = []
            for item in os.listdir(EXTRACTION_DIR):
                item_path = os.path.join(EXTRACTION_DIR, item)
                if os.path.isdir(item_path):
                    recent_extractions.append({
                        "job_id": item,
                        "created": datetime.fromtimestamp(os.path.getctime(item_path)).isoformat(),
                        "files_count": len([f for f in os.listdir(item_path) if f.endswith('.json')])
                    })
            debug_info["recent_extractions"] = sorted(recent_extractions,
                                                      key=lambda x: x['created'], reverse=True)[:5]

        return debug_info

    except Exception as e:
        debug_log("Debug status error", trace_error(
            e, "get_extraction_debug_status"))
        raise HTTPException(status_code=500, detail=f"Debug error: {str(e)}")


@router.get("/debug/job/{job_id}")
async def get_job_debug_info(job_id: str):
    """Get detailed debug information for a specific job"""
    try:
        job_dir = os.path.join(EXTRACTION_DIR, job_id)

        if not os.path.exists(job_dir):
            raise HTTPException(
                status_code=404, detail=f"Job {job_id} not found")

        # Get job files
        files_info = []
        for filename in os.listdir(job_dir):
            file_path = os.path.join(job_dir, filename)
            file_info = {
                "name": filename,
                "size": os.path.getsize(file_path),
                "modified": datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat(),
                "type": "json" if filename.endswith('.json') else
                        "csv" if filename.endswith('.csv') else
                        "other"
            }

            # For JSON files, get basic content info
            if filename.endswith('.json'):
                try:
                    with open(file_path, 'r') as f:
                        data = json.load(f)
                        file_info["json_keys"] = list(
                            data.keys()) if isinstance(data, dict) else []
                        if isinstance(data, dict) and 'tables' in data:
                            file_info["table_count"] = len(data['tables'])
                except:
                    file_info["json_error"] = "Failed to parse JSON"

            files_info.append(file_info)

        # Get job status from JobManager
        job_status = JobManager.get_job(job_id)

        debug_info = {
            "job_id": job_id,
            "job_directory": job_dir,
            "job_status": job_status,
            "files": files_info,
            "total_files": len(files_info),
            "json_files": [f for f in files_info if f["type"] == "json"],
            "csv_files": [f for f in files_info if f["type"] == "csv"]
        }

        return debug_info

    except Exception as e:
        debug_log("Job debug error", trace_error(
            e, f"get_job_debug_info for {job_id}"))
        raise HTTPException(status_code=500, detail=f"Debug error: {str(e)}")


@router.post("/debug/test-extraction")
async def test_extraction_pipeline(file: UploadFile = File(...)):
    """Test extraction pipeline with detailed debugging"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    debug_log("Test extraction started", {"filename": file.filename})

    # Create test job
    test_job_id = f"test_{uuid.uuid4().hex[:8]}"
    temp_dir = os.path.join(TEMP_DIR, test_job_id)
    os.makedirs(temp_dir, exist_ok=True)

    try:
        # Save file
        file_path = os.path.join(temp_dir, file.filename)
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        debug_log("File saved for testing", {
            "file_path": file_path,
            "file_size": len(content)
        })

        # Test extraction
        if not EXTRACTOR_AVAILABLE:
            return {"error": "PDF extractor not available", "test_job_id": test_job_id}

        extractor = PDFTableExtractor()

        # Extract tables
        extraction_start = datetime.now()
        tables = extractor.extract_all_cleaned_tables(file_path)
        extraction_duration = (
            datetime.now() - extraction_start).total_seconds()

        debug_log("Extraction completed", {
            "duration_seconds": extraction_duration,
            "table_count": len(tables) if tables else 0
        })

        # Test Gemini verification
        gemini_result = None
        if GEMINI_AVAILABLE and tables:
            gemini_verifier = GeminiVerifier()
            if gemini_verifier.api_key:
                try:
                    extracted_data = extractor.tables_to_json(
                        tables, {'filename': file.filename})
                    gemini_start = datetime.now()
                    gemini_result = await gemini_verifier.verify_extraction(file_path, extracted_data)
                    gemini_duration = (
                        datetime.now() - gemini_start).total_seconds()

                    debug_log("Gemini verification completed", {
                        "duration_seconds": gemini_duration,
                        "accuracy_score": gemini_result.get('verification_summary', {}).get('accuracy_score', 'N/A')
                    })
                except Exception as e:
                    gemini_result = {"error": str(e)}

        # Test results
        test_result = {
            "test_job_id": test_job_id,
            "filename": file.filename,
            "file_size": len(content),
            "extraction": {
                "duration_seconds": extraction_duration,
                "table_count": len(tables) if tables else 0,
                "success": tables is not None
            },
            "gemini_verification": {
                "available": GEMINI_AVAILABLE,
                "api_key_present": gemini_verifier.api_key is not None if GEMINI_AVAILABLE else False,
                "result": gemini_result
            },
            "system_info": {
                "extractor_available": EXTRACTOR_AVAILABLE,
                "gemini_available": GEMINI_AVAILABLE
            }
        }

        debug_log("Test extraction completed", test_result)
        return test_result

    except Exception as e:
        error_details = trace_error(e, f"Test extraction for {file.filename}")
        return {"error": str(e), "error_details": error_details, "test_job_id": test_job_id}

    finally:
        # Cleanup
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
