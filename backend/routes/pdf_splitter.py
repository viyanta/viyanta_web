from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from fastapi.responses import FileResponse
from typing import List, Dict
import os
import json
import re
from pathlib import Path
from services.pdf_splitter import PDFSplitterService

router = APIRouter(tags=["PDF Splitter"])

# Initialize the PDF splitter service
pdf_splitter = PDFSplitterService()


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
                "upload_id": result["upload_id"],
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
    Extract form data from a split PDF and correct it with Gemini
    """
    print(f"🎯 EXTRACT FORM FUNCTION CALLED!")
    try:
        print(
            f"🔍 Extract form request: company={company_name}, pdf={pdf_name}, split={split_filename}, user={user_id}")

        import subprocess
        import sys
        import uuid
        from datetime import datetime

        # Get the split file path
        split_path = pdf_splitter.get_split_file_path(
            company_name, pdf_name, split_filename)
        if not split_path:
            raise HTTPException(status_code=404, detail="Split file not found")

        # Get split metadata to find form type and template
        splits = pdf_splitter.get_pdf_splits(company_name, pdf_name)
        split_info = next(
            (s for s in splits if s["filename"] == split_filename), None)
        if not split_info:
            raise HTTPException(
                status_code=404, detail="Split metadata not found")

        # Determine template based on form code
        form_code = split_info.get("form_code", "").upper()

        # Fallback: extract form code from filename if not in metadata
        if not form_code:
            # Extract comprehensive form codes from filenames
            # Handle patterns like "L-4-PREMIUM", "L-1-A-REVENUE", "L-3_A-BALANCE", etc.
            patterns = [
                r'(L-\d+(?:-[A-Z]+)*(?:_[A-Z]+)*(?:-[A-Z]+)*)',  # L-4-PREMIUM, L-1-A-REVENUE, L-3_A-BALANCE
                r'(L-\d+[A-Z]*)',  # L-9A, L-14A, L-28
                r'(L-\d+)',  # L-10, L-11, etc.
            ]
            
            for pattern in patterns:
                filename_match = re.search(pattern, split_filename.upper())
                if filename_match:
                    form_code = filename_match.group(1)
                    # Normalize underscores to hyphens for consistency
                    form_code = form_code.replace('_', '-')
                    break

        print(f"🎯 Form code detected: '{form_code}' from filename: '{split_filename}'")
        print(f"🔍 Original split info form_code: '{split_info.get('form_code', 'NOT_FOUND')}'")

        # Build path to company templates directory
        company_templates_dir = Path("templates") / company_name.lower().replace(" ", "_")
        template_path = None
        template_name = None

        if form_code:
            # Extract base form code (e.g., "L-4" from "L-4-PREMIUM-SCHEDULE")
            base_form_match = re.search(r'(L-\d+[A-Z]*)', form_code)
            base_form = base_form_match.group(1) if base_form_match else form_code
            
            print(f"🎯 Base form extracted: '{base_form}' from form code: '{form_code}'")
            
            # Define exact template mappings based on available files in templates/sbi/
            exact_template_map = {
                "L-1": "L-1-A-REVENUE.json",
                "L-2": "L-2-A-PROFIT.json",
                "L-3": "L-3.json", 
                "L-4": "L-4-PREMIUM.json",
                "L-5": "L-5-COMMISSION.json",
                "L-6": "L-6.json",
                "L-7": "L-7.json",
                "L-8": "L-8-SHARE.json",
                "L-9A": "L-9A.json",
                "L-10": "L-10.json",
                "L-11": "L-11.json",
                "L-12": "L-12.json",
                "L-13": "L-13.json",
                "L-14": "L-14.json",
                "L-15": "L-15.json",
                "L-16": "L-16.json",
                "L-17": "L-17.json",
                "L-18": "L-18.json",
                "L-20": "L-20 PROVISIONS SCHEDULE.json",
                "L-21": "L-21 MISC EXPENDITURE SCHEDULE.json",
                "L-22": "L-22.json",
                "L-25": "L-25.json",
                "L-26": "L-26.json",
                "L-27": "L-27.json",
                "L-28": "L-28.json",
                "L-30": "L-30 RELATED PARTY TRANSACTION PART B.json",
                "L-32": "L-32 SOLVENCY MARGIN.json",
                "L-33": "L-33 NPAS.json",
                "L-34": "L-34 YIELD ON INVESTMENT.json",
                "L-35": "L-35 DOWNGRADING ON INVESTMENT.json",
                "L-36": "L-36 BSNS NUMBERS.json",
                "L-37": "L-37 BSNS ACQUISITION GROUP.json",
                "L-38": "L-38 BSNS ACQUISITION INDIVIDUAL.json",
                "L-39": "L-39 CLAIMS AGEING.json",
                "L-40": "L-40 CLAIMS DATA.json",
                "L-41": "L-41 GREIVANCES.json",
                "L-42": "L-42 VALUATION BASIS.json",
                "L-43": "L-43-VOTING.json",
                "L-45": "L-45 OFFICES AND OTHER INFORMATION.json",
            }
            
            # Get exact template name for the base form
            template_name = exact_template_map.get(base_form)
            
            if template_name:
                template_path = company_templates_dir / template_name
                print(f"🎯 Template selected: '{template_name}' for base form: '{base_form}'")
                print(f"🎯 Looking for template at: '{template_path}'")
                
                # If company-specific template doesn't exist, try sbi templates
                if not template_path.exists():
                    print(f"⚠️ Company template not found, trying sbi template")
                    template_path = Path("templates") / "sbi" / template_name
                    print(f"🎯 Trying sbi template at: '{template_path}'")
            else:
                print(f"❌ No template found for base form: '{base_form}' in mapping")
                # Only use fallback if no mapping exists for this form
                print(f"❌ Available mappings: {list(exact_template_map.keys())}")

        # Only use fallback if no form code was detected at all
        if not form_code or not template_name:
            print(f"⚠️ Using fallback template due to missing form code or template mapping")
            template_name = "L-1-A-REVENUE.json"
            template_path = Path("templates") / "sbi" / template_name
        
        print(f"🎯 Final template path: '{template_path}' for form code: '{form_code}'")

        # Final verification - if the selected template doesn't exist, use fallback
        if not template_path or not template_path.exists():
            print(f"⚠️ Selected template not found, using fallback")
            template_path = Path("templates") / "sbi" / "L-1-A-REVENUE.json"
            print(f"🎯 Fallback template path: '{template_path}'")

        # Create output paths
        output_dir = Path("extractions") / \
            company_name.lower().replace(" ", "_") / pdf_name
        output_dir.mkdir(parents=True, exist_ok=True)

        extracted_json = output_dir / \
            f"{Path(split_filename).stem}_extracted.json"
        corrected_json = output_dir / \
            f"{Path(split_filename).stem}_corrected.json"

        # Step 1: Run PDF extraction
        extraction_cmd = [
            sys.executable,
            "services/pdf_splitted_extraction.py",
            "--template", str(template_path),
            "--pdf", split_path,
            "--output", str(extracted_json)
        ]

        print(f"🔧 Extraction command: {' '.join(extraction_cmd)}")
        print(f"📁 Template path exists: {template_path.exists()}")
        print(f"📄 Split path exists: {Path(split_path).exists()}")
        print(f"📂 Output dir exists: {output_dir.exists()}")

        extraction_result = subprocess.run(
            extraction_cmd, capture_output=True, text=True)

        print(f"💯 Extraction return code: {extraction_result.returncode}")
        print(f"📤 Extraction stdout: {extraction_result.stdout}")
        print(f"❌ Extraction stderr: {extraction_result.stderr}")

        if extraction_result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"Extraction failed: {extraction_result.stderr}"
            )

        # Step 2: Run Gemini correction
        correction_cmd = [
            sys.executable,
            "services/pdf_splitted_gemini_very.py",
            "--template", str(template_path),
            "--extracted", str(extracted_json),
            "--pdf", split_path,
            "--output", str(corrected_json)
        ]

        correction_result = subprocess.run(
            correction_cmd, capture_output=True, text=True)

        if correction_result.returncode != 0:
            print(f"Gemini correction failed: {correction_result.stderr}")
            # Use extracted JSON if correction fails
            corrected_json = extracted_json

        # Load the final JSON
        with open(corrected_json, "r", encoding="utf-8") as f:
            final_data = json.load(f)

        # Perform final validation check
        try:
            validation_file = output_dir / f"{Path(split_filename).stem}_validation.json"
            if validation_file.exists():
                with open(validation_file, "r", encoding="utf-8") as vf:
                    validation_report = json.load(vf)
                    if not validation_report.get("is_valid", True):
                        print(f"⚠️ Validation issues detected: {validation_report.get('issues', [])}")
                    else:
                        print(f"✅ Data validation passed with {validation_report['stats']['total_rows']} rows")
            else:
                print("⚠️ No validation report found")
        except Exception as ve:
            print(f"Validation check failed: {ve}")

        # Store metadata about the extraction
        extraction_metadata = {
            "extraction_id": str(uuid.uuid4()),
            "user_id": user_id,
            "company_name": company_name,
            "pdf_name": pdf_name,
            "split_filename": split_filename,
            "form_code": form_code,
            "template_used": str(template_path),
            "extracted_at": datetime.now().isoformat(),
            "extraction_status": "completed",
            "gemini_corrected": str(corrected_json) != str(extracted_json),
            "output_path": str(corrected_json)
        }

        # Save metadata
        metadata_path = output_dir / \
            f"{Path(split_filename).stem}_metadata.json"
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(extraction_metadata, f, indent=2, ensure_ascii=False)

        return {
            "success": True,
            "extraction_id": extraction_metadata["extraction_id"],
            "data": final_data,
            "metadata": extraction_metadata
        }

    except Exception as e:
        print(f"Form extraction error: {e}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/companies/{company_name}/pdfs/{pdf_name}/splits/{split_filename}/extraction")
async def get_extracted_data(company_name: str, pdf_name: str, split_filename: str):
    """
    Get previously extracted data for a split
    """
    try:
        output_dir = Path("extractions") / \
            company_name.lower().replace(" ", "_") / pdf_name
        corrected_json = output_dir / \
            f"{Path(split_filename).stem}_corrected.json"
        extracted_json = output_dir / \
            f"{Path(split_filename).stem}_extracted.json"
        metadata_path = output_dir / \
            f"{Path(split_filename).stem}_metadata.json"

        # Try corrected first, then extracted, then none
        json_path = None
        if corrected_json.exists():
            json_path = corrected_json
        elif extracted_json.exists():
            json_path = extracted_json

        if not json_path:
            return {"success": False, "message": "No extraction data found"}

        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        metadata = {}
        if metadata_path.exists():
            with open(metadata_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)

        return {
            "success": True,
            "data": data,
            "metadata": metadata,
            "source": "corrected" if json_path == corrected_json else "extracted"
        }

    except Exception as e:
        print(f"Get extraction error: {e}")
        return {"success": False, "error": str(e)}
