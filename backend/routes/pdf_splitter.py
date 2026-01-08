from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form, Body
from fastapi.responses import FileResponse
from typing import List, Dict, Optional
from pydantic import BaseModel
import os
import json
import re
import sys
import uuid
import subprocess
import traceback
import shutil
import time
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from services.pdf_splitter import PDFSplitterService


# Load environment variables
load_dotenv()

router = APIRouter(tags=["PDF Splitter"])

# Initialize the PDF splitter service
pdf_splitter = PDFSplitterService()

# Form preferences storage (using JSON file for simplicity)
# Use absolute path in backend directory
BASE_DIR = Path(__file__).parent.parent
FORM_PREFERENCES_FILE = BASE_DIR / "form_preferences.json"

# Pydantic models for form preferences


class FormPreferencesRequest(BaseModel):
    enabled_forms: List[str]


def load_form_preferences() -> Dict:
    """Load form preferences from JSON file"""
    if FORM_PREFERENCES_FILE.exists():
        try:
            with open(FORM_PREFERENCES_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading form preferences: {e}")
            return {}
    return {}


def save_form_preferences(prefs: Dict):
    """Save form preferences to JSON file"""
    try:
        with open(FORM_PREFERENCES_FILE, 'w') as f:
            json.dump(prefs, f, indent=2)
    except Exception as e:
        print(f"Error saving form preferences: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to save preferences: {str(e)}")


@router.post("/upload-and-split")
async def upload_and_split_pdf(
    company_name: str = Form(...),
    user_id: str = Form(...),
    pdf_file: UploadFile = File(...)
):
    """
    Upload a PDF and split it according to index extraction
    """
    try:
        # Validate file type
        if not pdf_file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400, detail="Only PDF files are allowed")

        result = pdf_splitter.upload_and_split_pdf(
            company_name, pdf_file, user_id)

        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])

        return {
            "success": True,
            "message": f"PDF uploaded and split into {result['total_splits']} files",
            "data": {
                # "upload_id": result["upload_id"],
                "company_name": result["company_name"],
                "pdf_name": result["pdf_name"],
                "total_splits": result["total_splits"]
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/companies/{company_name}/pdfs")
async def get_company_pdfs(company_name: str):
    """
    Get all PDFs for a specific company
    """
    try:
        pdfs = pdf_splitter.get_company_pdfs(company_name)
        return {
            "success": True,
            "company_name": company_name,
            "pdfs": pdfs
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get PDFs: {str(e)}")


@router.get("/companies/{company_name}/pdfs/{pdf_name}/splits")
async def get_pdf_splits(company_name: str, pdf_name: str):
    """
    Get all split files for a specific PDF
    """
    try:
        splits = pdf_splitter.get_pdf_splits(company_name, pdf_name)
        return {
            "success": True,
            "company_name": company_name,
            "pdf_name": pdf_name,
            "splits": splits,
            "total_splits": len(splits)
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get splits: {str(e)}")


@router.get("/companies/{company_name}/pdfs/{pdf_name}/splits/{split_filename}/download")
async def download_split_file(company_name: str, pdf_name: str, split_filename: str):
    """
    Download a specific split file
    """
    try:
        file_path = pdf_splitter.get_split_file_path(
            company_name, pdf_name, split_filename)

        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Split file not found")

        return FileResponse(
            path=file_path,
            filename=split_filename,
            media_type='application/pdf'
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Download failed: {str(e)}")


@router.get("/companies")
async def get_available_companies():
    """
    Get list of all companies that have PDFs
    """
    try:
        companies = []
        splits_dir = Path("pdf_splits")

        if splits_dir.exists():
            for company_folder in splits_dir.iterdir():
                if company_folder.is_dir():
                    # Convert folder name back to display name
                    company_name = company_folder.name.replace(
                        "_", " ").title()

                    # Count PDFs in this company folder
                    pdf_count = len(
                        [f for f in company_folder.iterdir() if f.is_dir()])

                    if pdf_count > 0:
                        companies.append({
                            "name": company_name,
                            "folder_name": company_folder.name,
                            "pdf_count": pdf_count
                        })

        return {
            "success": True,
            "companies": companies
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get companies: {str(e)}")


@router.delete("/companies/{company_name}/pdfs/{pdf_name}")
async def delete_pdf_and_splits(company_name: str, pdf_name: str):
    """
    Delete a PDF and all its splits
    """
    try:
        import shutil

        # Delete splits folder
        splits_folder = Path("pdf_splits") / \
            company_name.lower().replace(" ", "_") / pdf_name
        if splits_folder.exists():
            shutil.rmtree(splits_folder)

        # Delete original PDF
        uploads_folder = Path("uploads") / \
            company_name.lower().replace(" ", "_")
        for pdf_file in uploads_folder.glob(f"{pdf_name}.*"):
            if pdf_file.is_file():
                pdf_file.unlink()

        return {
            "success": True,
            "message": f"PDF '{pdf_name}' and all splits deleted successfully"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")


@router.post("/extract-form")
async def extract_form_data(
    company_name: str = Form(...),
    pdf_name: str = Form(...),
    split_filename: str = Form(...),
    user_id: str = Form(...)
):
    """
    Extract form data from a split PDF and correct it with Gemini.

    This endpoint orchestrates the complete extraction workflow:
    1. Template resolution - finds the correct template for the form
    2. PDF extraction - extracts data from the PDF using the template
    3. Gemini verification - verifies and corrects the extracted data
    4. Database storage - stores the results in the database
    5. Metadata management - saves extraction metadata

    The actual implementation is modularized into separate services:
    - TemplateResolver (services/template_resolver.py)
    - ExtractionOrchestrator (services/extraction_orchestrator.py)
    - DatabaseStorageService (services/database_storage_service.py)
    - FormExtractionHandler (handlers/form_extraction_handler.py)
    """
    try:
        from handlers.form_extraction_handler import FormExtractionHandler

        # Initialize handler with pdf_splitter service
        handler = FormExtractionHandler(pdf_splitter)

        # Execute complete extraction workflow
        result = handler.extract_form(
            company_name=company_name,
            pdf_name=pdf_name,
            split_filename=split_filename,
            user_id=user_id
        )

        return {
            "success": True,
            "extraction_id": result['extraction_id'],
            "data": result['data'],
            "metadata": result['metadata']
        }

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        context_info = f"Company: {company_name}, PDF: {pdf_name}, Split: {split_filename}"
        detailed_error = f"{error_msg} | Context: {context_info}"

        print(f"❌ Form extraction error: {detailed_error}")
        print(f"❌ Traceback: {traceback.format_exc()}")

        raise HTTPException(status_code=500, detail=detailed_error)


@router.get("/companies/{company_name}/pdfs/{pdf_name}/form-preferences")
async def get_form_preferences(company_name: str, pdf_name: str):
    """
    Get form visibility preferences for a specific PDF (shared across all users)
    Returns empty array if preferences don't exist (first time)
    """
    try:
        prefs = load_form_preferences()
        key = f"{company_name}_{pdf_name}"

        # Check if key exists in preferences (None means no preferences saved yet)
        if key in prefs:
            enabled_forms = prefs[key]
            # Return the saved preferences (even if empty array)
            return {
                "success": True,
                "data": {
                    "enabled_forms": enabled_forms
                }
            }
        else:
            # No preferences saved yet - return None to indicate first time
            return {
                "success": True,
                "data": {
                    "enabled_forms": None
                }
            }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get preferences: {str(e)}")


@router.post("/companies/{company_name}/pdfs/{pdf_name}/form-preferences")
async def set_form_preferences(
    company_name: str,
    pdf_name: str,
    request: FormPreferencesRequest
):
    """
    Set form visibility preferences for a specific PDF (admin only, shared across all users)
    """
    try:
        prefs = load_form_preferences()
        key = f"{company_name}_{pdf_name}"
        prefs[key] = request.enabled_forms
        save_form_preferences(prefs)

        return {
            "success": True,
            "message": f"Form preferences saved for {company_name}/{pdf_name}",
            "data": {
                "enabled_forms": request.enabled_forms
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to save preferences: {str(e)}")


# Data edits storage (using JSON file for simplicity)
DATA_EDITS_FILE = BASE_DIR / "data_edits.json"

# Pydantic models for data edits


class CellEditRequest(BaseModel):
    form_name: str
    record_index: int
    row_index: int
    header: str
    value: str


class BulkEditRequest(BaseModel):
    edits: List[CellEditRequest]


def load_data_edits() -> Dict:
    """Load data edits from JSON file"""
    if DATA_EDITS_FILE.exists():
        try:
            with open(DATA_EDITS_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading data edits: {e}")
            return {}
    return {}


def save_data_edits(edits: Dict):
    """Save data edits to JSON file"""
    try:
        with open(DATA_EDITS_FILE, 'w') as f:
            json.dump(edits, f, indent=2)
    except Exception as e:
        print(f"Error saving data edits: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to save edits: {str(e)}")


@router.get("/companies/{company_name}/pdfs/{pdf_name}/data-edits")
async def get_data_edits(company_name: str, pdf_name: str):
    """
    Get all data edits for a specific PDF (shared across all users)
    """
    try:
        edits = load_data_edits()
        key = f"{company_name}_{pdf_name}"
        pdf_edits = edits.get(key, {})

        return {
            "success": True,
            "data": {
                "edits": pdf_edits
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get edits: {str(e)}")


@router.post("/companies/{company_name}/pdfs/{pdf_name}/data-edits")
async def save_data_edit(
    company_name: str,
    pdf_name: str,
    request: CellEditRequest
):
    """
    Save a single cell edit (admin only, shared across all users)
    """
    try:
        edits = load_data_edits()
        key = f"{company_name}_{pdf_name}"

        if key not in edits:
            edits[key] = {}

        # Create edit key: form_recordIndex_rowIndex_header
        edit_key = f"{request.form_name}_{request.record_index}_{request.row_index}_{request.header}"
        edits[key][edit_key] = {
            "form_name": request.form_name,
            "record_index": request.record_index,
            "row_index": request.row_index,
            "header": request.header,
            "value": request.value,
            "edited_at": datetime.now().isoformat()
        }

        save_data_edits(edits)

        return {
            "success": True,
            "message": f"Cell edit saved for {company_name}/{pdf_name}",
            "data": {
                "edit": edits[key][edit_key]
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to save edit: {str(e)}")


@router.delete("/companies/{company_name}/pdfs/{pdf_name}/data-edits")
async def delete_data_edit(
    company_name: str,
    pdf_name: str,
    form_name: str,
    record_index: int,
    row_index: int,
    header: str
):
    """
    Delete a specific cell edit (admin only)
    """
    try:
        edits = load_data_edits()
        key = f"{company_name}_{pdf_name}"

        if key in edits:
            edit_key = f"{form_name}_{record_index}_{row_index}_{header}"
            if edit_key in edits[key]:
                del edits[key][edit_key]
                save_data_edits(edits)

        return {
            "success": True,
            "message": "Edit deleted successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete edit: {str(e)}")


@router.get("/companies/{company_name}/pdfs/{pdf_name}/splits/{split_filename}/extraction")
async def get_extracted_data(company_name: str, pdf_name: str, split_filename: str):
    """
    Get previously extracted data for a split - checks both extractions and gemini_verified_json directories
    """
    try:
        # Helper function to find company directory with flexible naming
        def find_company_dir(base_path: Path, company_name: str):
            # Create both underscore and spaced versions
            company_slug = company_name.lower().replace(" ", "_")
            company_spaced = company_name.lower().replace("_", " ")

            # Try underscore version first
            underscore_path = base_path / company_slug
            if underscore_path.exists():
                return underscore_path

            # Try spaced version
            spaced_path = base_path / company_spaced
            if spaced_path.exists():
                return spaced_path

            # Try original input as-is
            original_path = base_path / company_name.lower()
            if original_path.exists():
                return original_path

            # If none exist, return the underscore version for consistency
            return underscore_path

        # Find company directories with flexible naming
        gemini_company_dir = find_company_dir(
            Path("gemini_verified_json"), company_name)
        extractions_company_dir = find_company_dir(
            Path("extractions"), company_name)

        # Check Gemini-verified directory first (highest priority)
        gemini_dir = gemini_company_dir / pdf_name
        gemini_corrected_json = gemini_dir / \
            f"{Path(split_filename).stem}_corrected.json"
        gemini_metadata_path = gemini_dir / \
            f"{Path(split_filename).stem}_metadata.json"

        # Check original extractions directory
        extractions_dir = extractions_company_dir / pdf_name
        corrected_json = extractions_dir / \
            f"{Path(split_filename).stem}_corrected.json"
        extracted_json = extractions_dir / \
            f"{Path(split_filename).stem}_extracted.json"
        metadata_path = extractions_dir / \
            f"{Path(split_filename).stem}_metadata.json"

        # Priority order: Gemini-verified > corrected > extracted
        json_path = None
        metadata_source = None
        source_type = None

        if gemini_corrected_json.exists():
            json_path = gemini_corrected_json
            metadata_source = gemini_metadata_path if gemini_metadata_path.exists() else metadata_path
            source_type = "gemini_verified"
            print(f"📋 Using Gemini-verified JSON: {json_path}")
        elif corrected_json.exists():
            json_path = corrected_json
            metadata_source = metadata_path
            source_type = "corrected"
            print(f"📋 Using corrected JSON: {json_path}")
        elif extracted_json.exists():
            json_path = extracted_json
            metadata_source = metadata_path
            source_type = "extracted"
            print(f"📋 Using extracted JSON: {json_path}")

        if not json_path:
            return {"success": False, "message": "No extraction data found"}

        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        metadata = {}
        if metadata_source and metadata_source.exists():
            with open(metadata_source, "r", encoding="utf-8") as f:
                metadata = json.load(f)

        # CRITICAL FIX: Force gemini_corrected = True when source is gemini_verified
        if source_type == "gemini_verified":
            metadata["gemini_corrected"] = True
            print(f"🤖 Forced gemini_corrected=True for gemini_verified source")
        elif source_type == "corrected":
            # Also treat corrected JSONs as gemini corrected
            metadata["gemini_corrected"] = True
            print(f"🤖 Forced gemini_corrected=True for corrected source")

        # HEADER CONSISTENCY FIX: Ensure FlatHeaders match actual row keys (BEFORE normalization for old format)
        if isinstance(data, list) and len(data) > 0:
            for record_idx, record in enumerate(data):
                if isinstance(record, dict) and "Rows" in record and len(record["Rows"]) > 0:
                    # Get actual keys from first row
                    first_row = record["Rows"][0]
                    if isinstance(first_row, dict):
                        actual_keys = list(first_row.keys())

                        # Update FlatHeaders to match actual data
                        record["FlatHeaders"] = actual_keys
                        record["FlatHeadersNormalized"] = actual_keys

                        print(
                            f"📊 Fixed headers for record {record_idx}: {actual_keys}")

        # Normalize data to ensure consistent frontend format
        # Handle both old format {metadata, data} and new format {Rows, _metadata}
        normalized_data = data
        if isinstance(data, dict):
            if "Rows" in data:
                # New Gemini format: {Rows: [...], _metadata: {...}}
                normalized_data = data["Rows"]
                print(
                    f"🔄 Normalized new Gemini format: {len(normalized_data) if isinstance(normalized_data, list) else 0} items")
            elif "data" in data:
                # Old Gemini format: {metadata: {...}, data: [...]}
                normalized_data = data["data"]
                print(
                    f"🔄 Normalized old Gemini format: {len(normalized_data) if isinstance(normalized_data, list) else 0} items")
            # If it's already a plain dict or other format, leave as-is

        # HEADER CONSISTENCY FIX: Ensure FlatHeaders match actual row keys (AFTER normalization for new format)
        if isinstance(normalized_data, list) and len(normalized_data) > 0:
            for record_idx, record in enumerate(normalized_data):
                if isinstance(record, dict) and "Rows" in record and len(record["Rows"]) > 0:
                    # Get actual keys from first row
                    first_row = record["Rows"][0]
                    if isinstance(first_row, dict):
                        actual_keys = list(first_row.keys())

                        # Update FlatHeaders to match actual data
                        record["FlatHeaders"] = actual_keys
                        record["FlatHeadersNormalized"] = actual_keys

                        print(
                            f"🔧 Fixed headers for normalized record {record_idx}: {actual_keys}")

        return {
            "success": True,
            "data": normalized_data,
            "metadata": metadata,
            "source": source_type,
            "file_path": str(json_path)
        }

    except Exception as e:
        print(f"Get extraction error: {e}")
        return {"success": False, "error": str(e)}


@router.get("/debug-gemini-config")
async def debug_gemini_config():
    """
    Debug endpoint to show current Gemini performance configuration
    """
    import os

    config = {
        "quick_mode": {
            "enabled": os.getenv("GEMINI_QUICK_MODE", "0") == "1",
            "threshold": int(os.getenv("GEMINI_QUICK_MODE_THRESHOLD", "20"))
        },
        "multithreading": {
            "enabled": True,  # Always enabled now
            "workers": int(os.getenv("GEMINI_WORKERS", "4"))
        },
        "timeouts": {
            "primary": int(os.getenv("GEMINI_CORRECTION_TIMEOUT_PRIMARY", "90")),
            "retry": int(os.getenv("GEMINI_CORRECTION_TIMEOUT_RETRY", "60")),
            "third": int(os.getenv("GEMINI_CORRECTION_THIRD_TIMEOUT", "45")),
            "no_timeout_mode": os.getenv("GEMINI_CORRECTION_NO_TIMEOUT", "0") == "1"
        },
        "batch_sizes": {
            "initial": int(os.getenv("GEMINI_CORRECTION_INITIAL_BATCH", "10")),
            "second": int(os.getenv("GEMINI_CORRECTION_SECOND_BATCH", "8")),
            "third": int(os.getenv("GEMINI_CORRECTION_THIRD_BATCH", "5"))
        },
        "retry_settings": {
            "enable_retry": os.getenv("GEMINI_CORRECTION_RETRY", "1") != "0",
            "enable_second_retry": os.getenv("GEMINI_CORRECTION_SECOND_RETRY", "1") != "0"
        },
        "pdf_optimization": {
            "max_pages": "3",  # Fixed for performance
            "retries": "2"     # Fixed for performance
        }
    }

    return {
        "success": True,
        "message": "Current Gemini performance configuration",
        "config": config,
        "recommendations": {
            "for_speed": "Enable GEMINI_QUICK_MODE=1 for small datasets",
            "for_accuracy": "Disable quick mode and increase batch sizes",
            "for_production": "Use 6-8 workers and quick mode enabled"
        }
    }


@router.post("/test-extraction-performance")
async def test_extraction_performance(
    company_name: str = "SBI Life",
    form_code: str = "L-4-PREMIUM",
    simulate_rows: int = 15
):
    """
    Test endpoint to simulate extraction performance and demonstrate quick mode
    """
    import os
    import time

    start_time = time.time()

    # Simulate the same logic as the real extraction
    enable_quick_mode = os.getenv("GEMINI_QUICK_MODE", "0") == "1"
    quick_mode_threshold = int(os.getenv("GEMINI_QUICK_MODE_THRESHOLD", "20"))

    extracted_is_empty = simulate_rows == 0
    extracted_row_count = simulate_rows

    skip_gemini = (enable_quick_mode and
                   not extracted_is_empty and
                   extracted_row_count > 0 and
                   extracted_row_count <= quick_mode_threshold)

    performance_config = {
        "dynamic_rows": extracted_row_count,
        "initial_batch": 10 if extracted_row_count > 50 else 3,
        "max_workers": min(8, max(2, extracted_row_count // 10)),
        "quick_mode_enabled": enable_quick_mode,
        "quick_mode_threshold": quick_mode_threshold,
        "would_skip_gemini": skip_gemini
    }

    # Simulate processing time
    if skip_gemini:
        simulated_time = 2.0  # Very fast without Gemini
        processing_path = "extraction_only"
    else:
        # Simulate Gemini processing time based on batch size and workers
        # 5 seconds per batch item
        batch_processing_time = performance_config["initial_batch"] * 5
        # More workers = faster
        worker_multiplier = 1.0 / performance_config["max_workers"]
        simulated_time = batch_processing_time * worker_multiplier
        processing_path = "extraction_plus_gemini"

    # Simulate some processing time (scaled down)
    time.sleep(min(simulated_time / 10, 1.0))

    end_time = time.time()
    actual_time = end_time - start_time

    return {
        "success": True,
        "test_scenario": {
            "company": company_name,
            "form_code": form_code,
            "simulated_rows": simulate_rows
        },
        "performance_analysis": {
            "processing_path": processing_path,
            "would_skip_gemini": skip_gemini,
            "estimated_time_seconds": round(simulated_time, 2),
            "actual_test_time": round(actual_time, 3),
            "time_savings": round(max(0, 30 - simulated_time), 2) if skip_gemini else 0
        },
        "configuration": performance_config,
        "recommendations": [
            "Enable GEMINI_QUICK_MODE=1 for datasets under 20 rows",
            "Use 6+ workers for large datasets",
            "Consider batch size 3-4 for optimal parallelization"
        ]
    }
