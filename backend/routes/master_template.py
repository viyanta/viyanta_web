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
        # Automatically save extraction response to file
        try:
            from services.master_template import save_extraction_response
            save_extraction_response(
                company_clean, form_no_clean, filename, result)
        except Exception as e:
            logger.error(f"Error auto-saving extraction response: {e}")

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


@router.get("/extract-revenue-account/{company}")
async def extract_revenue_account_data(
    company: str
):
    """
    Extract Revenue Account data from pages 3-6 for the specified company.
    Returns all 4 tables with their financial data.
    """
    try:
        if not company.strip():
            raise HTTPException(
                status_code=400, detail="Company name is required")

        company_clean = company.lower().strip()

        # Check if PDF exists
        pdf_path = os.path.join(PDFS_DIR, f"{company_clean}.pdf")
        if not os.path.exists(pdf_path):
            raise HTTPException(
                status_code=404,
                detail=f"PDF not found for company: {company_clean}. Please upload PDF first."
            )

        # Import camelot for table extraction
        try:
            import camelot
        except ImportError:
            raise HTTPException(
                status_code=503,
                detail="Camelot not available for table extraction"
            )

        # Get dynamic page range based on file type (Q1/HY/FY)
        pages_range = await find_pages_for_revenue_form(company_clean, "L-1-A-REVENUE", pdf_path)
        if not pages_range:
            pages_range = "3-6"  # fallback

        # Extract tables from dynamic pages
        tables = camelot.read_pdf(pdf_path, pages=pages_range, flavor='stream')

        if not tables:
            raise HTTPException(
                status_code=404,
                detail=f"No tables found in pages {pages_range}"
            )

        # Process each table
        extracted_tables = []
        for i, table in enumerate(tables):
            df = table.df

            # Determine period from the data
            period = 'Unknown'
            for row_idx in range(min(10, len(df))):
                for col_idx in range(min(3, len(df.columns))):
                    cell_text = str(df.iloc[row_idx, col_idx])
                    if '2023' in cell_text and 'SEPTEMBER' in cell_text.upper():
                        period = 'September 30, 2023 (FY2024 Q2)'
                        break
                    elif '2022' in cell_text and 'SEPTEMBER' in cell_text.upper():
                        period = 'September 30, 2022 (FY2023 Q2)'
                        break
                if period != 'Unknown':
                    break

            # Extract financial data
            financial_data = []
            for row_idx in range(len(df)):
                row = df.iloc[row_idx]
                first_col = str(row.iloc[0]) if len(row) > 0 else ''

                # Look for important financial terms
                if any(term in first_col.upper() for term in ['PREMIUM', 'INCOME', 'EXPENSE', 'BENEFIT', 'TOTAL', 'SURPLUS', 'DEFICIT']):
                    # Get values from this row
                    values = []
                    for col_idx in range(1, min(8, len(row))):
                        val = str(row.iloc[col_idx]).strip()
                        if val and val != 'nan' and len(val) > 0:
                            values.append(val)

                    if values:
                        financial_data.append({
                            'item': first_col[:100],
                            'values': values
                        })

            extracted_tables.append({
                'table_id': i + 1,
                'period': period,
                'dimensions': f"{df.shape[0]} rows × {df.shape[1]} columns",
                # Limit to first 15 items
                'financial_data': financial_data[:15]
            })

        return {
            "status": "success",
            "company": company_clean.upper(),
            "total_tables": len(extracted_tables),
            "pages_extracted": pages_range,
            "tables": extracted_tables,
            "message": f"Successfully extracted Revenue Account data from {len(extracted_tables)} tables"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error extracting Revenue Account data for {company}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to extract Revenue Account data: {str(e)}")


@router.get("/extract-revenue-account-headings/{company}")
async def extract_revenue_account_headings(
    company: str
):
    """
    Extract all headings and sections from ALL pages for the specified company.
    Enhanced to capture main headings like 'REVENUE ACCOUNT FOR THE PERIOD ENDED JUNE 30, 2024'
    Returns structured headings data including main titles, sections, and subsections.
    """
    try:
        if not company.strip():
            raise HTTPException(
                status_code=400, detail="Company name is required")

        company_clean = company.lower().strip()

        # Check if PDF exists
        pdf_path = os.path.join(PDFS_DIR, f"{company_clean}.pdf")
        if not os.path.exists(pdf_path):
            raise HTTPException(
                status_code=404,
                detail=f"PDF not found for company: {company_clean}. Please upload PDF first."
            )

        # Extract text from ALL pages (not just 3-6)
        doc = fitz.open(pdf_path)

        headings_data = {
            "main_titles": [],  # Changed to array to capture multiple main titles
            "periods": [],      # Changed to array to capture multiple periods
            "page_headings": [],
            "section_headings": [],
            "table_headers": [],
            "all_headings": []
        }

        # Extract from ALL pages
        for page_num in range(doc.page_count):
            page = doc.load_page(page_num)
            text = page.get_text()

            lines = text.split('\n')
            page_headings = []

            for i, line in enumerate(lines):
                line = line.strip()
                if not line:
                    continue

                # Enhanced main title detection - more flexible patterns
                line_upper = line.upper()

                # Detect main titles with various patterns
                if any(pattern in line_upper for pattern in [
                    'REVENUE ACCOUNT FOR THE PERIOD ENDED',
                    'REVENUE ACCOUNT FOR THE QUARTER ENDED',
                    'REVENUE ACCOUNT FOR THE YEAR ENDED',
                    'REVENUE ACCOUNT FOR THE HALF YEAR ENDED'
                ]):
                    # Extract period information
                    period_match = None
                    import re

                    # Try to extract date patterns
                    date_patterns = [
                        r'(\w+ \d{1,2}, \d{4})',  # June 30, 2024
                        # 30-06-2024 or 30/06/2024
                        r'(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})',
                        r'(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})'   # 2024-06-30
                    ]

                    for pattern in date_patterns:
                        match = re.search(pattern, line)
                        if match:
                            period_match = match.group(1)
                            break

                    main_title_info = {
                        "text": line,
                        "page": page_num + 1,
                        "type": "main_title",
                        "level": 0,
                        "period": period_match or "Unknown",
                        "full_text": line
                    }

                    headings_data["main_titles"].append(main_title_info)
                    page_headings.append(main_title_info)

                    # Also extract period separately
                    if period_match:
                        headings_data["periods"].append({
                            "text": period_match,
                            "page": page_num + 1,
                            "type": "period",
                            "level": 0
                        })

                # Detect other main headings (not just Revenue Account)
                elif (line_upper.startswith(('L-1-A', 'L-1-B', 'L-1-C', 'L-2', 'L-3', 'L-4', 'L-5')) and
                      len(line) > 10 and len(line) < 200):

                    main_heading_info = {
                        "text": line,
                        "page": page_num + 1,
                        "type": "form_heading",
                        "level": 0
                    }

                    headings_data["main_titles"].append(main_heading_info)
                    page_headings.append(main_heading_info)

                # Detect section headings (all caps, standalone lines)
                elif (line.isupper() and
                      len(line) > 5 and
                      len(line) < 100 and
                      # No numbers at start
                      not any(char.isdigit() for char in line[:10]) and
                      not line.startswith('(') and
                      not any(pattern in line_upper for pattern in [
                          'REVENUE ACCOUNT', 'L-1-A', 'L-1-B', 'L-1-C', 'L-2', 'L-3', 'L-4', 'L-5'
                      ])):

                    heading_type = "section"
                    if any(word in line for word in ['INCOME', 'EXPENSES', 'BENEFITS', 'PREMIUM']):
                        heading_type = "financial_section"
                    elif any(word in line for word in ['UNIT', 'PARTICIPATING', 'NON-PARTICIPATING']):
                        heading_type = "category_section"

                    heading_info = {
                        "text": line,
                        "page": page_num + 1,
                        "type": heading_type,
                        "level": 1
                    }

                    headings_data["section_headings"].append(heading_info)
                    page_headings.append(heading_info)

                # Detect table headers (contain keywords like Particulars, Schedule, etc.)
                elif any(keyword in line for keyword in ['Particulars', 'Schedule', 'Unit Linked', 'Participating', 'Non-Participating']):
                    if len(line) > 10 and not line.isupper():
                        heading_info = {
                            "text": line,
                            "page": page_num + 1,
                            "type": "table_header",
                            "level": 2
                        }
                        headings_data["table_headers"].append(heading_info)
                        page_headings.append(heading_info)

                # Detect subsection headings (capitalized words, not all caps)
                elif (line.istitle() and
                      len(line) > 10 and
                      len(line) < 80 and
                      not any(char.isdigit() for char in line[:5])):

                    heading_info = {
                        "text": line,
                        "page": page_num + 1,
                        "type": "subsection",
                        "level": 3
                    }
                    page_headings.append(heading_info)

            if page_headings:
                headings_data["page_headings"].append({
                    "page": page_num + 1,
                    "headings": page_headings
                })

        doc.close()

        # Compile all headings in order
        all_headings = []

        # Add main titles first
        for main_title in headings_data["main_titles"]:
            all_headings.append(main_title)

        # Add periods
        for period in headings_data["periods"]:
            all_headings.append(period)

        # Add all other headings sorted by page and position
        for page_data in headings_data["page_headings"]:
            for heading in page_data["headings"]:
                # Avoid duplicates (main titles already added)
                if heading["type"] not in ["main_title", "period"]:
                    all_headings.append(heading)

        headings_data["all_headings"] = all_headings

        return {
            "status": "success",
            "company": company_clean.upper(),
            "total_headings": len(all_headings),
            "total_pages_analyzed": doc.page_count,
            "main_titles_found": len(headings_data["main_titles"]),
            "periods_found": len(headings_data["periods"]),
            "headings": headings_data,
            "message": f"Successfully extracted {len(all_headings)} headings from all {doc.page_count} pages"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error extracting Revenue Account headings for {company}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to extract Revenue Account headings: {str(e)}")
