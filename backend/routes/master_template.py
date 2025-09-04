from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional, List, Dict, Any
import os
import json
import logging
from services.master_template import (
    process_pdf,
    list_forms,
    extract_form,
    find_form_pages,
    ai_extract_form
)
import fitz  # PyMuPDF

router = APIRouter()
logger = logging.getLogger(__name__)

# Base directories
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDFS_DIR = os.path.join(BACKEND_DIR, "pdfs_selected_company")
TEMPLATES_DIR = os.path.join(BACKEND_DIR, "templates")

# Ensure directories exist
os.makedirs(PDFS_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)


@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    company: str = Query(..., description="Company name (e.g., 'sbi', 'hdfc')")
):
    """
    Upload PDF and save as backend/pdfs_selected_company/{company}.pdf
    """
    try:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400, detail="Only PDF files are allowed")

        if not company.strip():
            raise HTTPException(
                status_code=400, detail="Company name is required")

        # Process and save the PDF
        result = await process_pdf(company.lower().strip(), file)

        return {
            "status": "success",
            "message": f"PDF uploaded successfully for company: {company}",
            "company": company.lower().strip(),
            "filename": result["filename"],
            "file_path": result["file_path"],
            "file_size": result["file_size"]
        }

    except Exception as e:
        logger.error(f"Error uploading PDF for company {company}: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/list-forms")
async def get_forms_list(
    company: str = Query(...,
                         description="Company name (e.g., 'sbi', 'hdfc')"),
    filename: Optional[str] = Query(
        None, description="Specific PDF filename to use")
):
    """
    Extract "List of Website Disclosures" from first 2-3 PDF pages.
    Returns list of {Form No, Description, Pages} and available files.
    """
    try:
        if not company.strip():
            raise HTTPException(
                status_code=400, detail="Company name is required")

        company_clean = company.lower().strip()

        # Get list of available files for this company
        company_dir = os.path.join(PDFS_DIR, company_clean)
        available_files = []
        if os.path.exists(company_dir):
            available_files = [f for f in os.listdir(
                company_dir) if f.lower().endswith('.pdf')]

        # Check if any PDF exists for the company
        if not available_files:
            raise HTTPException(
                status_code=404,
                detail=f"No PDF files found for company: {company_clean}. Please upload PDF first."
            )

        # Extract forms list
        forms = await list_forms(company_clean, filename)

        return {
            "status": "success",
            "company": company_clean,
            "total_forms": len(forms),
            "forms": forms,
            "files": available_files,
            "selected_file": filename or (available_files[0] if available_files else None),
            "message": f"Found {len(forms)} forms in {company_clean.upper()} PDF"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing forms for company {company}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to list forms: {str(e)}")


@router.get("/extract-form/{form_no}")
async def extract_form_data(
    form_no: str,
    company: str = Query(...,
                         description="Company name (e.g., 'sbi', 'hdfc')"),
    filename: Optional[str] = Query(
        None, description="Specific PDF filename to use")
):
    """
    Extract table using template and PDF pages.
    Returns structured JSON with template headers and extracted data.
    """
    try:
        if not company.strip():
            raise HTTPException(
                status_code=400, detail="Company name is required")

        if not form_no.strip():
            raise HTTPException(
                status_code=400, detail="Form number is required")

        company_clean = company.lower().strip()
        form_no_clean = form_no.upper().strip()

        # Check if template exists
        template_path = os.path.join(
            TEMPLATES_DIR, company_clean, f"{form_no_clean.lower()}.json")
        if not os.path.exists(template_path):
            raise HTTPException(
                status_code=404,
                detail=f"Template not found for company: {company_clean}, form: {form_no_clean}"
            )

        # Extract form data
        result = await extract_form(company_clean, form_no_clean, filename)

        return {
            "status": "success",
            "company": company_clean,
            "form_no": form_no_clean,
            "extraction_result": result,
            "message": f"Successfully extracted {form_no_clean} for {company_clean.upper()}"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error extracting form {form_no} for company {company}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to extract form: {str(e)}")


@router.get("/companies")
async def get_available_companies():
    """
    Get list of companies that have uploaded PDFs
    """
    try:
        companies = []
        if os.path.exists(PDFS_DIR):
            for file in os.listdir(PDFS_DIR):
                if file.lower().endswith('.pdf'):
                    company_name = os.path.splitext(file)[0]
                    companies.append(company_name)

        return {
            "status": "success",
            "total_companies": len(companies),
            "companies": sorted(companies),
            "message": f"Found {len(companies)} companies with uploaded PDFs"
        }

    except Exception as e:
        logger.error(f"Error getting companies list: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get companies: {str(e)}")


@router.get("/templates/{company}")
async def get_company_templates(company: str):
    """
    Get list of available templates for a company
    """
    try:
        company_clean = company.lower().strip()
        templates_path = os.path.join(TEMPLATES_DIR, company_clean)

        templates = []
        if os.path.exists(templates_path):
            for file in os.listdir(templates_path):
                if file.lower().endswith('.json'):
                    template_name = os.path.splitext(file)[0]
                    try:
                        with open(os.path.join(templates_path, file), 'r', encoding='utf-8') as f:
                            template_data = json.load(f)
                            templates.append({
                                "form_no": template_name.upper(),
                                "title": template_data.get("Title", ""),
                                "headers": template_data.get("Headers", []),
                                "file": file
                            })
                    except Exception as e:
                        logger.warning(f"Error reading template {file}: {e}")

        return {
            "status": "success",
            "company": company_clean,
            "total_templates": len(templates),
            "templates": templates,
            "message": f"Found {len(templates)} templates for {company_clean.upper()}"
        }

    except Exception as e:
        logger.error(f"Error getting templates for company {company}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get templates: {str(e)}")


@router.post("/create-template")
async def create_template(
    company: str = Query(...),
    form_no: str = Query(...),
    title: str = Query(...),
    headers: List[str] = Query(...)
):
    """
    Create a new template for a company and form
    """
    try:
        company_clean = company.lower().strip()
        form_no_clean = form_no.upper().strip()

        # Create company templates directory
        company_templates_dir = os.path.join(TEMPLATES_DIR, company_clean)
        os.makedirs(company_templates_dir, exist_ok=True)

        # Create template
        template = {
            "Form No": form_no_clean,
            "Title": title.strip(),
            "Headers": headers,
            "Rows": []
        }

        # Save template
        template_path = os.path.join(
            company_templates_dir, f"{form_no_clean.lower()}.json")
        with open(template_path, 'w', encoding='utf-8') as f:
            json.dump(template, f, indent=2, ensure_ascii=False)

        return {
            "status": "success",
            "company": company_clean,
            "form_no": form_no_clean,
            "template_path": template_path,
            "template": template,
            "message": f"Template created successfully for {company_clean.upper()} - {form_no_clean}"
        }

    except Exception as e:
        logger.error(f"Error creating template: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to create template: {str(e)}")


@router.get("/debug-pdf-text")
async def debug_pdf_text(
    company: str = Query(..., description="Company name (e.g., 'sbi', 'hdfc')")
):
    """
    Debug endpoint to see raw PDF text content from first 3 pages
    """
    try:
        company_clean = company.lower().strip()
        pdf_path = os.path.join(PDFS_DIR, f"{company_clean}.pdf")

        if not os.path.exists(pdf_path):
            raise HTTPException(
                status_code=404,
                detail=f"PDF not found for company: {company_clean}"
            )

        # Extract text from first 3 pages
        doc = fitz.open(pdf_path)
        pages_text = {}
        total_pages = doc.page_count

        max_pages = min(3, total_pages)
        for page_num in range(max_pages):
            page = doc.load_page(page_num)
            pages_text[f"page_{page_num + 1}"] = page.get_text()

        doc.close()

        return {
            "status": "success",
            "company": company_clean,
            "total_pages": total_pages,
            "pages_extracted": max_pages,
            "pages_text": pages_text
        }

    except Exception as e:
        logger.error(f"Error debugging PDF text for company {company}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to extract PDF text: {str(e)}"
        )


@router.get("/ai-extract-form/{form_no}")
async def ai_extract_form_data(
    form_no: str,
    company: str = Query(...,
                         description="Company name (e.g., 'sbi', 'hdfc')"),
    filename: Optional[str] = Query(
        None, description="Specific PDF filename to use")
):
    """
    AI Extract ALL periods of a form from PDF.
    Uses AI to find and extract multiple instances of the same form across different periods.
    Returns all periods with structured data.
    """
    try:
        if not company.strip():
            raise HTTPException(
                status_code=400, detail="Company name is required")

        if not form_no.strip():
            raise HTTPException(
                status_code=400, detail="Form number is required")

        company_clean = company.lower().strip()
        form_no_clean = form_no.upper().strip()

        # Check if template exists
        template_path = os.path.join(
            TEMPLATES_DIR, company_clean, f"{form_no_clean.lower()}.json")
        if not os.path.exists(template_path):
            raise HTTPException(
                status_code=404,
                detail=f"Template not found for company: {company_clean}, form: {form_no_clean}"
            )

        # AI extract all periods
        results = await ai_extract_form(company_clean, form_no_clean, filename)

        return {
            "status": "success",
            "company": company_clean,
            "form_no": form_no_clean,
            "total_periods": len(results),
            "data": results,
            "message": f"AI extracted {len(results)} periods for {form_no_clean} from {company_clean.upper()}"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error in AI extraction for company {company}, form {form_no}: {e}")
        raise HTTPException(
            status_code=500, detail=f"AI extraction failed: {str(e)}")
