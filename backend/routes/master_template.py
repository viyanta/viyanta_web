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
    ai_extract_form  # New AI extractor
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
    Automatically extract forms list after upload
    """
    try:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400, detail="Only PDF files are allowed")

        if not company.strip():
            raise HTTPException(
                status_code=400, detail="Company name is required")

        company_clean = company.lower().strip()

        # Process and save the PDF
        result = await process_pdf(company_clean, file)

        # Automatically extract forms list after upload
        try:
            forms = await list_forms(company_clean)
            forms_count = len(forms)
        except Exception as forms_error:
            logger.warning(f"Could not extract forms list: {forms_error}")
            forms = []
            forms_count = 0

        return {
            "status": "success",
            "message": f"PDF uploaded successfully for company: {company_clean.upper()}",
            "company": company_clean,
            "file_info": {
                "filename": result["filename"],
                "file_size": result["file_size"]
            },
            "forms_extracted": {
                "total_forms": forms_count,
                "forms": forms,
                "message": f"Found {forms_count} forms in {company_clean.upper()} PDF"
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading PDF for company {company}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to upload PDF: {str(e)}")


@router.get("/list-forms")
async def get_forms_list(
    company: str = Query(..., description="Company name (e.g., 'sbi', 'hdfc')")
):
    """
    Extract "List of Website Disclosures" from first 2-3 PDF pages.
    Returns list of {Form No, Description, Pages}
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

        # Extract forms list
        forms = await list_forms(company_clean)

        return {
            "status": "success",
            "company": company_clean,
            "total_forms": len(forms),
            "forms": forms,
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
    company: str = Query(..., description="Company name (e.g., 'sbi', 'hdfc')")
):
    """
    Extract form data using template and PDF pages.
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
        form_no_clean = form_no.strip().upper()

        # Check if PDF exists
        pdf_path = os.path.join(PDFS_DIR, f"{company_clean}.pdf")
        if not os.path.exists(pdf_path):
            raise HTTPException(
                status_code=404,
                detail=f"PDF not found for company: {company_clean}. Please upload PDF first."
            )

        # Extract form data
        result = await extract_form(company_clean, form_no_clean)

        return {
            "status": "success",
            "company": company_clean,
            "form_no": form_no_clean,
            "data": result,
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


@router.get("/forms-with-templates/{company}")
async def get_forms_with_templates(company: str):
    """
    Get forms list with information about available templates
    """
    try:
        company_clean = company.lower().strip()

        # Get forms from PDF
        try:
            forms = await list_forms(company_clean)
        except Exception as e:
            raise HTTPException(
                status_code=404,
                detail=f"Could not extract forms from PDF for {company_clean}. Please upload PDF first."
            )

        # Get available templates
        templates_path = os.path.join(TEMPLATES_DIR, company_clean)
        available_templates = set()

        if os.path.exists(templates_path):
            for file in os.listdir(templates_path):
                if file.lower().endswith('.json'):
                    template_name = os.path.splitext(file)[0]
                    available_templates.add(template_name.upper())

        # Enhance forms with template information
        enhanced_forms = []
        for form in forms:
            form_no = form["form_no"]

            # Check if template exists (try different name variations)
            has_template = False
            template_file = ""

            # Try exact match first
            if form_no in available_templates:
                has_template = True
                template_file = f"{form_no.lower()}.json"
            else:
                # Try partial matches
                for template in available_templates:
                    if form_no in template or template in form_no:
                        has_template = True
                        template_file = f"{template.lower()}.json"
                        break

            enhanced_forms.append({
                **form,
                "has_template": has_template,
                "template_file": template_file,
                "extractable": has_template
            })

        return {
            "status": "success",
            "company": company_clean,
            "total_forms": len(enhanced_forms),
            "forms": enhanced_forms,
            "available_templates": len(available_templates),
            "extractable_forms": len([f for f in enhanced_forms if f["extractable"]]),
            "message": f"Found {len(enhanced_forms)} forms for {company_clean.upper()}, {len([f for f in enhanced_forms if f['extractable']])} are extractable"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error getting forms with templates for company {company}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get forms with templates: {str(e)}")


@router.post("/create-template")
async def create_template(
    company: str = Query(...),
    form_no: str = Query(...),
    title: str = Query(...),
    headers: str = Query(..., description="JSON string of headers structure")
):
    """
    Create a new template for a company and form
    """
    try:
        company_clean = company.lower().strip()
        form_no_clean = form_no.strip().upper()

        # Parse headers JSON
        try:
            headers_data = json.loads(headers)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400, detail="Invalid JSON format for headers")

        # Create template structure
        template = {
            "Form No": form_no_clean,
            "Title": title.strip(),
            "Period": "",
            "Currency": "Rs. in Lakhs",
            "Headers": headers_data,
            "Rows": []
        }

        # Create company template directory if it doesn't exist
        templates_dir = os.path.join(TEMPLATES_DIR, company_clean)
        os.makedirs(templates_dir, exist_ok=True)

        # Save template
        template_file = f"{form_no_clean.lower()}.json"
        template_path = os.path.join(templates_dir, template_file)

        with open(template_path, 'w', encoding='utf-8') as f:
            json.dump(template, f, indent=2, ensure_ascii=False)

        return {
            "status": "success",
            "message": f"Template created successfully for {form_no_clean}",
            "company": company_clean,
            "form_no": form_no_clean,
            "template_file": template_file,
            "template_path": template_path
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating template: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to create template: {str(e)}")


@router.get("/debug-pdf-text")
async def debug_pdf_text(
    company: str = Query(...),
    page: int = Query(1, description="Page number to extract text from")
):
    """
    Debug endpoint to see raw text extraction from PDF
    """
    try:
        company_clean = company.lower().strip()
        pdf_path = os.path.join(PDFS_DIR, f"{company_clean}.pdf")

        if not os.path.exists(pdf_path):
            raise HTTPException(
                status_code=404, detail=f"PDF not found for company: {company_clean}")

        doc = fitz.open(pdf_path)

        if page < 1 or page > doc.page_count:
            raise HTTPException(
                status_code=400, detail=f"Page {page} out of range. PDF has {doc.page_count} pages")

        page_obj = doc.load_page(page - 1)  # 0-indexed
        text = page_obj.get_text()
        doc.close()

        return {
            "status": "success",
            "company": company_clean,
            "page": page,
            "total_pages": doc.page_count,
            "text": text,
            "text_length": len(text)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error debugging PDF text: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to extract text: {str(e)}")


@router.get("/ai-extract-form/{form_no}")
async def ai_extract_form_data(
    form_no: str,
    company: str = Query(..., description="Company name (e.g., 'sbi', 'hdfc')")
):
    """
    🤖 AI PDF Form Extractor - Complete Implementation
    
    Extract ALL periods/instances of a form from PDF using AI workflow:
    1. Load template JSON from templates/{company}/{form_no}.json
    2. Find all instances of the form (different periods/years)
    3. Extract data using Camelot for tables + text for fields
    4. Return structured JSON for ALL periods found
    
    Returns List of extracted form data, one per period/year found.
    Example: L-4 Premium Schedule for Dec 2023, Dec 2022, Dec 2021, etc.
    """
    try:
        if not company.strip():
            raise HTTPException(
                status_code=400, detail="Company name is required")

        if not form_no.strip():
            raise HTTPException(
                status_code=400, detail="Form number is required")

        company_clean = company.lower().strip()
        form_no_clean = form_no.strip().upper()

        # Check if PDF exists
        pdf_path = os.path.join(PDFS_DIR, f"{company_clean}.pdf")
        if not os.path.exists(pdf_path):
            raise HTTPException(
                status_code=404,
                detail=f"PDF not found for company: {company_clean}. Please upload PDF first."
            )

        # AI Extract ALL periods of the form
        periods_data = await ai_extract_form(company_clean, form_no_clean)

        return {
            "status": "success",
            "company": company_clean.upper(),
            "form_no": form_no_clean,
            "total_periods": len(periods_data),
            "extraction_method": "AI_Complete_Workflow",
            "data": periods_data,  # List of periods, each with complete structure
            "message": f"🤖 AI extracted {len(periods_data)} periods of {form_no_clean} for {company_clean.upper()}",
            "example_usage": {
                "description": "Each period contains: Form, Title, Period, Currency, Headers, Rows",
                "structure": "data[0] = first period, data[1] = second period, etc."
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"🤖 AI extraction failed for {form_no} ({company}): {e}")
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

        # Extract tables from pages 3-6
        tables = camelot.read_pdf(pdf_path, pages='3-6', flavor='stream')
        
        if not tables:
            raise HTTPException(
                status_code=404,
                detail="No tables found in pages 3-6"
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
                'financial_data': financial_data[:15]  # Limit to first 15 items
            })

        return {
            "status": "success",
            "company": company_clean.upper(),
            "total_tables": len(extracted_tables),
            "pages_extracted": "3-6",
            "tables": extracted_tables,
            "message": f"Successfully extracted Revenue Account data from {len(extracted_tables)} tables"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting Revenue Account data for {company}: {e}")
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
                        r'(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})',  # 30-06-2024 or 30/06/2024
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
                      not any(char.isdigit() for char in line[:10]) and  # No numbers at start
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
        logger.error(f"Error extracting Revenue Account headings for {company}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to extract Revenue Account headings: {str(e)}")
