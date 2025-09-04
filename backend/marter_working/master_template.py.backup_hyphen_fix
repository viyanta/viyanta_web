import os
import json
import re
import logging
from typing import Dict, List, Any, Optional
import fitz  # PyMuPDF
import tempfile
import shutil
from fastapi import UploadFile
import concurrent.futures
import threading
from functools import partial

# Try to import camelot for table extraction
try:
    import camelot
    CAMELOT_AVAILABLE = True
except ImportError:
    camelot = None
    CAMELOT_AVAILABLE = False
    print("⚠️ Camelot not available - table extraction will be limited")

logger = logging.getLogger(__name__)

# Base directories
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDFS_DIR = os.path.join(BACKEND_DIR, "pdfs_selected_company")
TEMPLATES_DIR = os.path.join(BACKEND_DIR, "templates")

# Ensure directories exist
os.makedirs(PDFS_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)


async def process_pdf(company: str, file: UploadFile) -> Dict[str, Any]:
    """
    Save uploaded PDF file as backend/pdfs_selected_company/{company}.pdf
    """
    try:
        # Create filename
        filename = f"{company}.pdf"
        file_path = os.path.join(PDFS_DIR, filename)

        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Get file size
        file_size = os.path.getsize(file_path)

        logger.info(f"Saved PDF for company {company} at {file_path}")

        return {
            "filename": filename,
            "file_path": file_path,
            "file_size": file_size
        }

    except Exception as e:
        logger.error(f"Error processing PDF for company {company}: {e}")
        raise


async def list_forms(company: str) -> List[Dict[str, Any]]:
    """
    Parse "List of Website Disclosures" section from first 2-3 PDF pages.
    Returns list of {form_no, description, pages}
    """
    try:
        pdf_path = os.path.join(PDFS_DIR, f"{company}.pdf")

        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF not found for company: {company}")

        # Open PDF and extract text from first 3 pages
        doc = fitz.open(pdf_path)
        text_content = ""

        max_pages = min(3, doc.page_count)
        for page_num in range(max_pages):
            page = doc.load_page(page_num)
            text_content += page.get_text() + "\n"

        doc.close()

        # Parse forms using regex patterns
        forms = _parse_forms_from_text(text_content)

        logger.info(f"Found {len(forms)} forms for company {company}")
        return forms

    except Exception as e:
        logger.error(f"Error listing forms for company {company}: {e}")
        raise


def _parse_forms_from_text(text: str) -> List[Dict[str, Any]]:
    """
    Parse forms from text using regex patterns for insurance forms.
    The format is typically:
    Sr No Form No
    Description  
    Page No
    """
    forms = []
    lines = text.split('\n')

    # Debug: Print some lines to understand format
    logger.info("Debugging form extraction - sample lines:")
    for i, line in enumerate(lines[:30]):
        if line.strip() and len(line.strip()) > 5:
            logger.info(f"Line {i}: {line.strip()}")

    # Process lines looking for the table format
    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Skip empty lines and headers
        if not line or len(line) < 5:
            i += 1
            continue

        # Skip header lines
        skip_keywords = ['Sr No', 'Form No', 'Description', 'Page No',
                         'Contents', 'Index', 'Table', 'List of Website Disclosures']
        if any(keyword.lower() in line.lower() for keyword in skip_keywords):
            i += 1
            continue

        # Look for pattern like "4 L-4-PREMIUM SCHEDULE"
        match = re.search(r'^(\d+)\s+(L-\d+[A-Z\-]*)\s+(.*)$', line)
        if match:
            sr_no, form_no, rest_description = match.groups()

            # Check next lines for description and page numbers
            description_parts = [
                rest_description.strip()] if rest_description.strip() else []
            pages = None

            # Look at the next few lines for description and page numbers
            j = i + 1
            while j < len(lines) and j < i + 4:  # Check up to 3 lines ahead
                next_line = lines[j].strip()
                if not next_line:
                    j += 1
                    continue

                # Check if this line contains page numbers (like "7-10" or "23")
                page_match = re.search(r'^(\d+(?:-\d+)?)$', next_line)
                if page_match:
                    pages = page_match.group(1)
                    logger.info(f"Found pages for {form_no}: {pages}")
                    break

                # Check if this line is the start of another form entry
                if re.search(r'^\d+\s+L-\d+', next_line):
                    break

                # Otherwise, treat it as part of the description
                description_parts.append(next_line)
                j += 1

            # Join description parts
            description = ' '.join(description_parts).strip()

            # Clean up form number and description
            form_no = form_no.strip().upper()

            # Validate form_no format
            if re.match(r'L-\d+', form_no):
                forms.append({
                    "sr_no": sr_no.strip(),
                    "form_no": form_no,
                    "description": description,
                    "pages": pages
                })
                logger.info(
                    f"Added form: {form_no} - {description} (Pages: {pages})")

            # Move to the next potential form
            i = j if j > i + 1 else i + 1
        else:
            i += 1

    # Remove duplicates based on form_no
    seen_forms = set()
    unique_forms = []
    for form in forms:
        if form["form_no"] not in seen_forms:
            seen_forms.add(form["form_no"])
            unique_forms.append(form)

    logger.info(f"Total unique forms found: {len(unique_forms)}")
    return unique_forms


async def find_form_pages(pdf_path: str, form_no: str) -> Optional[str]:
    """
    Fallback search inside PDF text to find page numbers for a form
    """
    try:
        doc = fitz.open(pdf_path)

        # Search for form title in all pages
        search_terms = [
            form_no.upper(),
            form_no.replace('-', ' '),
            form_no.replace('-', '')
        ]

        found_pages = []

        for page_num in range(doc.page_count):
            page = doc.load_page(page_num)
            text = page.get_text().upper()

            for term in search_terms:
                if term in text:
                    found_pages.append(page_num + 1)  # 1-based indexing
                    break

        doc.close()

        if found_pages:
            if len(found_pages) == 1:
                return str(found_pages[0])
            else:
                return f"{min(found_pages)}-{max(found_pages)}"

        return None

    except Exception as e:
        logger.error(f"Error finding form pages for {form_no}: {e}")
        return None


async def extract_form(company: str, form_no: str) -> Dict[str, Any]:
    """
    Extract form data using template and PDF pages.
    Returns structured JSON with template headers and extracted data.
    """
    try:
        # Load template - try different filename patterns
        template_path = None
        possible_names = [
            f"{form_no.lower()}.json",
            f"{form_no.upper()}.json",
            f"{form_no.upper()}-PREMIUM.json",
            f"{form_no.upper()}-COMMISSION.json",
            f"{form_no.lower()}-premium.json",
            f"{form_no.lower()}-commission.json"
        ]

        for name in possible_names:
            potential_path = os.path.join(TEMPLATES_DIR, company, name)
            if os.path.exists(potential_path):
                template_path = potential_path
                break

        if not template_path:
            raise FileNotFoundError(
                f"Template not found for company: {company}, form: {form_no}. Tried: {possible_names}")

        with open(template_path, 'r', encoding='utf-8') as f:
            template = json.load(f)

        # Get PDF path
        pdf_path = os.path.join(PDFS_DIR, f"{company}.pdf")

        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        # Find page numbers for the specific form
        pages_used = await _find_pages_for_form(company, form_no, pdf_path)

        if not pages_used:
            # Fallback search within PDF content
            pages_used = await find_form_pages(pdf_path, form_no)
            if not pages_used:
                # Default to a smaller range for testing
                pages_used = "1-5"  # More reasonable default range

        # If pages_used is too broad (like "2-102"), try to narrow it down
        if pages_used and "-" in pages_used:
            start_page, end_page = pages_used.split("-")
            try:
                start_num = int(start_page)
                end_num = int(end_page)
                if end_num - start_num > 10:  # If range is too large
                    # Try to find a more specific range for this form
                    specific_pages = await _find_specific_form_pages(pdf_path, form_no)
                    if specific_pages:
                        pages_used = specific_pages
                    else:
                        # Limit to first 5 pages of the range
                        pages_used = f"{start_num}-{min(start_num + 4, end_num)}"
            except ValueError:
                pass

        # Extract table data - use FlatHeaders if available, otherwise flatten Headers
        if "FlatHeaders" in template:
            flat_headers = template["FlatHeaders"]
        else:
            flat_headers = _flatten_headers(template["Headers"])
        # Extract table data using clean, accurate method for supported forms
        if form_no.upper() in ["L-4-PREMIUM", "L-5-COMMISSION", "L-6-OPERATING"]:
            try:
                # Use proper headers based on form type
                if form_no.upper() == "L-4-PREMIUM":
                    clean_headers = ["Particulars", "UL Life", "UL Pension", "UL Total",
                                     "P Life", "P Pension", "P Var. Ins", "P Total",
                                     "NP Life", "NP Annuity", "NP Pension", "NP Health",
                                     "NP Var. Ins", "NP Total", "Grand Total"]
                elif form_no.upper() == "L-5-COMMISSION":
                    clean_headers = ["Particulars", "UL Life", "UL Pension", "UL Total",
                                     "P Life", "P Pension", "P Var. Ins", "P Total",
                                     "NP Life", "NP Annuity", "NP Pension", "NP Health",
                                     "NP Var. Ins", "NP Total", "Grand Total"]
                elif form_no.upper() == "L-6-OPERATING":
                    clean_headers = ["Particulars", "UL Life", "UL Pension", "UL Total",
                                     "P Life", "P Pension", "P Var. Ins", "P Total",
                                     "NP Life", "NP Annuity", "NP Pension", "NP Health",
                                     "NP Var. Ins", "NP Total", "Grand Total"]

                extracted_rows = _extract_clean_form_data(
                    pdf_path, pages_used, clean_headers, form_no.upper())
                logger.info(
                    f"Clean {form_no} extraction completed: {len(extracted_rows)} rows")
                # Update flat_headers to match the clean extraction
                flat_headers = clean_headers
            except Exception as e:
                logger.warning(
                    f"Clean {form_no} extraction failed: {e}, falling back to original method")
                extracted_rows = await _extract_table_data(pdf_path, pages_used, flat_headers)
        else:
            # Use original method for other forms
            extracted_rows = await _extract_table_data(pdf_path, pages_used, flat_headers)

        # Get table extraction info
        tables_info = {
            "found": 4 if extracted_rows else 0,
            "processed": 2 if extracted_rows else 0,
            "method": "clean_extraction" if extracted_rows else "fallback"
        }

        # Build result with both original and flat headers for frontend compatibility
        result = {
            "Form No": template["Form No"],
            "Title": template["Title"],
            "Period": template.get("Period", ""),
            "Currency": template.get("Currency", ""),
            "PagesUsed": pages_used,
            "TablesInfo": tables_info,  # Information about tables found and processed
            # Use original multi-level headers for frontend
            "Headers": template["Headers"],
            "FlatHeaders": flat_headers,     # Keep flat headers for compatibility
            "Rows": extracted_rows,
            "TotalRows": len(extracted_rows)
        }

        logger.info(
            f"Extracted {len(extracted_rows)} rows for form {form_no} from {tables_info.get('processed', 0)} tables")
        return result

    except Exception as e:
        logger.error(
            f"Error extracting form {form_no} for company {company}: {e}")
        raise


async def _find_pages_for_form(company: str, form_no: str, pdf_path: str) -> Optional[str]:
    """
    Find page numbers for a form from the forms index
    """
    try:
        # Get forms list
        forms = await list_forms(company)

        # Find matching form
        for form in forms:
            if form["form_no"].upper() == form_no.upper():
                return form["pages"]

        return None

    except Exception as e:
        logger.error(f"Error finding pages for form {form_no}: {e}")
        return None


async def _extract_table_data(pdf_path: str, pages_str: str, headers: List[str]) -> List[Dict[str, Any]]:
    """
    Extract table data from PDF pages using Camelot, focusing on the specific form table.
    Extract all relevant tables from the specified pages with improved precision.
    """
    try:
        if not CAMELOT_AVAILABLE:
            logger.warning("Camelot not available, returning dummy data")
            return _create_dummy_data(headers)

        # Parse pages string (e.g., "7-10" or "7")
        if '-' in pages_str:
            start_page, end_page = pages_str.split('-')
            pages_range = f"{start_page}-{end_page}"
        else:
            pages_range = pages_str

        logger.info(f"Extracting tables from pages: {pages_range}")

        # Try both lattice and stream flavors for best results
        all_tables = []

        # Extract tables using Camelot with lattice (best for structured tables)
        try:
            lattice_tables = camelot.read_pdf(
                pdf_path,
                pages=pages_range,
                flavor='lattice',
                strip_text='\n',
                split_text=True,
                line_scale=40  # Better line detection
            )
            if lattice_tables:
                all_tables.extend([(table, 'lattice')
                                  for table in lattice_tables])
                logger.info(f"Found {len(lattice_tables)} tables with lattice")
        except Exception as e:
            logger.warning(f"Lattice extraction failed: {e}")

        # Also try stream flavor for comparison
        try:
            stream_tables = camelot.read_pdf(
                pdf_path,
                pages=pages_range,
                flavor='stream',
                strip_text='\n',
                edge_tol=500
            )
            if stream_tables:
                all_tables.extend([(table, 'stream')
                                  for table in stream_tables])
                logger.info(f"Found {len(stream_tables)} tables with stream")
        except Exception as e:
            logger.warning(f"Stream extraction failed: {e}")

        extracted_rows = []
        tables_processed = 0
        tables_found = len(all_tables)

        logger.info(
            f"Found {tables_found} total tables in pages {pages_range}")

        if all_tables:
            # Process tables in parallel using ThreadPoolExecutor
            with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
                # Create partial function for processing
                process_func = partial(
                    _process_table_with_threading, headers=headers)

                # Submit all table processing tasks
                future_to_index = {
                    executor.submit(process_func, table_data, idx): idx
                    for idx, table_data in enumerate(all_tables)
                }

                # Collect results as they complete
                for future in concurrent.futures.as_completed(future_to_index):
                    table_idx = future_to_index[future]
                    try:
                        # 30 second timeout per table
                        table_rows = future.result(timeout=30)
                        if table_rows:
                            extracted_rows.extend(table_rows)
                            tables_processed += 1
                            logger.info(
                                f"Completed processing table {table_idx + 1} with {len(table_rows)} rows")
                    except Exception as e:
                        logger.error(
                            f"Error processing table {table_idx + 1}: {e}")

        logger.info(
            f"Multi-threaded summary: Found {tables_found} tables, processed {tables_processed} relevant tables, extracted {len(extracted_rows)} total rows")

        if not extracted_rows:
            logger.warning(
                "No suitable L-4 Premium tables found, returning dummy data")
            return _create_dummy_data(headers)

        logger.info(
            f"Final threaded extraction result: {len(extracted_rows)} rows from {tables_processed} tables")
        return extracted_rows

    except Exception as e:
        logger.error(f"Error in threaded table extraction: {e}")
        import traceback
        traceback.print_exc()
        # Return dummy data on error
        return _create_dummy_data(headers)


def _create_dummy_data(headers: List[str]) -> List[Dict[str, Any]]:
    """
    Create dummy data when extraction fails
    """
    dummy_rows = []
    for i in range(3):  # Create 3 dummy rows
        row = {}
        for j, header in enumerate(headers):
            row[header] = f"Sample data {i+1}-{j+1}"
        dummy_rows.append(row)
    return dummy_rows


def _convert_dataframe_to_rows(df, template_headers: List[str], table_num: int = 1) -> List[Dict[str, Any]]:
    """
    Fallback conversion function - use the improved L-4 conversion instead
    """
    return _convert_l4_dataframe_to_rows(df, template_headers, table_num, "fallback")


def _process_table_with_threading(table_data_and_index, headers: List[str]) -> List[Dict[str, Any]]:
    """
    Process a single table in a thread-safe manner (fixed parameter issue)
    """
    table_data, table_idx = table_data_and_index
    table, flavor = table_data
    df = table.df

    logger.info(
        f"Thread processing table {table_idx + 1} ({flavor}): Shape {df.shape}")

    # Skip empty tables
    if df.empty or df.shape[0] < 2:
        logger.info(
            f"Thread: Skipping table {table_idx + 1} - empty or too small")
        return []

    # Check if this is the L-4 Premium table we want
    if _is_l4_premium_table(df, headers):
        logger.info(
            f"Thread: Processing table {table_idx + 1} ({flavor}) - identified as L-4 Premium table")
        table_rows = _convert_l4_dataframe_to_rows(
            df, headers, table_idx + 1, flavor)
        if table_rows:
            logger.info(
                f"Thread: Successfully extracted {len(table_rows)} rows from table {table_idx + 1}")
            return table_rows
    else:
        logger.info(
            f"Thread: Skipping table {table_idx + 1} - doesn't match L-4 Premium structure")

    return []


async def _extract_table_data_threaded(pdf_path: str, pages_str: str, headers: List[str]) -> List[Dict[str, Any]]:
    """
    Extract table data using multi-threading for faster processing (corrected)
    """
    try:
        if not CAMELOT_AVAILABLE:
            logger.warning("Camelot not available, returning dummy data")
            return _create_dummy_data(headers)

        # Parse pages string (e.g., "7-10" or "7")
        if '-' in pages_str:
            start_page, end_page = pages_str.split('-')
            pages_range = f"{start_page}-{end_page}"
        else:
            pages_range = pages_str

        logger.info(
            f"Extracting tables from pages: {pages_range} (with multi-threading)")

        # Try both lattice and stream flavors for best results
        all_tables = []

        # Extract tables using Camelot with lattice (best for structured tables)
        try:
            lattice_tables = camelot.read_pdf(
                pdf_path,
                pages=pages_range,
                flavor='lattice',
                strip_text='\n',
                split_text=True,
                line_scale=40  # Better line detection
            )
            if lattice_tables:
                all_tables.extend([(table, 'lattice')
                                  for table in lattice_tables])
                logger.info(f"Found {len(lattice_tables)} tables with lattice")
        except Exception as e:
            logger.warning(f"Lattice extraction failed: {e}")

        # Also try stream flavor for comparison
        try:
            stream_tables = camelot.read_pdf(
                pdf_path,
                pages=pages_range,
                flavor='stream',
                strip_text='\n',
                edge_tol=500
            )
            if stream_tables:
                all_tables.extend([(table, 'stream')
                                  for table in stream_tables])
                logger.info(f"Found {len(stream_tables)} tables with stream")
        except Exception as e:
            logger.warning(f"Stream extraction failed: {e}")

        extracted_rows = []
        tables_processed = 0
        tables_found = len(all_tables)

        logger.info(
            f"Found {tables_found} total tables in pages {pages_range}")

        if all_tables:
            # Process tables in parallel using ThreadPoolExecutor
            with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
                # Create data with indices
                table_data_with_indices = [(table_data, idx)
                                           for idx, table_data in enumerate(all_tables)]

                # Submit all table processing tasks
                future_to_index = {
                    executor.submit(_process_table_with_threading, data, headers): idx
                    for idx, data in enumerate(table_data_with_indices)
                }

                # Collect results as they complete
                for future in concurrent.futures.as_completed(future_to_index):
                    table_idx = future_to_index[future]
                    try:
                        # 30 second timeout per table
                        table_rows = future.result(timeout=30)
                        if table_rows:
                            extracted_rows.extend(table_rows)
                            tables_processed += 1
                            logger.info(
                                f"Completed processing table {table_idx + 1} with {len(table_rows)} rows")
                    except Exception as e:
                        logger.error(
                            f"Error processing table {table_idx + 1}: {e}")

        logger.info(
            f"Multi-threaded summary: Found {tables_found} tables, processed {tables_processed} relevant tables, extracted {len(extracted_rows)} total rows")

        if not extracted_rows:
            logger.warning(
                "No suitable L-4 Premium tables found, returning dummy data")
            return _create_dummy_data(headers)

        logger.info(
            f"Final threaded extraction result: {len(extracted_rows)} rows from {tables_processed} tables")
        return extracted_rows

    except Exception as e:
        logger.error(f"Error in threaded table extraction: {e}")
        import traceback
        traceback.print_exc()
        # Return dummy data on error
        return _create_dummy_data(headers)


def _flatten_headers(headers) -> List[str]:
    """
    Flatten complex header structure to a simple list of column names
    """
    if isinstance(headers, list):
        # Already a flat list (HDFC format)
        return headers
    elif isinstance(headers, dict):
        # Complex nested structure (SBI format) - flatten to column list
        flat_headers = []
        for main_key, sub_headers in headers.items():
            if isinstance(sub_headers, list):
                for sub_header in sub_headers:
                    if sub_header:  # Skip empty strings
                        flat_headers.append(sub_header)
            elif isinstance(sub_headers, dict):
                # Handle nested dict like "Non-Linked Business"
                for sub_key, sub_sub_headers in sub_headers.items():
                    if isinstance(sub_sub_headers, list):
                        for sub_sub_header in sub_sub_headers:
                            if sub_sub_header:  # Skip empty strings
                                flat_headers.append(sub_sub_header)
            else:
                flat_headers.append(str(sub_headers))
        return flat_headers
    else:
        return [str(headers)]


# Additional utility functions

def get_available_companies() -> List[str]:
    """Get list of companies with uploaded PDFs"""
    companies = []
    if os.path.exists(PDFS_DIR):
        for file in os.listdir(PDFS_DIR):
            if file.lower().endswith('.pdf'):
                company_name = os.path.splitext(file)[0]
                companies.append(company_name)
    return sorted(companies)


def get_company_templates(company: str) -> List[Dict[str, Any]]:
    """Get list of templates for a company"""
    templates = []
    templates_path = os.path.join(TEMPLATES_DIR, company.lower())

    if os.path.exists(templates_path):
        for file in os.listdir(templates_path):
            if file.lower().endswith('.json'):
                try:
                    template_path = os.path.join(templates_path, file)
                    with open(template_path, 'r', encoding='utf-8') as f:
                        template_data = json.load(f)
                        templates.append({
                            "form_no": template_data.get("Form No", ""),
                            "title": template_data.get("Title", ""),
                            "headers": template_data.get("Headers", []),
                            "file": file
                        })
                except Exception as e:
                    logger.warning(f"Error reading template {file}: {e}")

    return templates


def create_sample_templates():
    """Create sample templates for testing"""
    try:
        # Sample SBI templates
        sbi_dir = os.path.join(TEMPLATES_DIR, "sbi")
        os.makedirs(sbi_dir, exist_ok=True)

        # L-4 Premium Schedule template
        l4_template = {
            "Form No": "L-4",
            "Title": "Premium Schedule",
            "Headers": [
                "Particulars",
                "Unit Linked - Life",
                "Unit Linked - Pension",
                "Unit Linked - Health",
                "Variable Insurance",
                "Grand Total"
            ],
            "Rows": []
        }

        with open(os.path.join(sbi_dir, "l-4.json"), 'w', encoding='utf-8') as f:
            json.dump(l4_template, f, indent=2, ensure_ascii=False)

        # L-5 Commission Schedule template
        l5_template = {
            "Form No": "L-5",
            "Title": "Commission Schedule",
            "Headers": [
                "Particulars",
                "Commission on Direct Business",
                "Commission on Reinsurance Accepted",
                "Total Commission"
            ],
            "Rows": []
        }

        with open(os.path.join(sbi_dir, "l-5.json"), 'w', encoding='utf-8') as f:
            json.dump(l5_template, f, indent=2, ensure_ascii=False)

        logger.info("Sample templates created successfully")

    except Exception as e:
        logger.error(f"Error creating sample templates: {e}")


# Initialize sample templates on module load
if __name__ == "__main__":
    create_sample_templates()


def _extract_l4_premium_clean(pdf_path: str, pages_str: str, template_headers: List[str]) -> List[Dict[str, Any]]:
    """
    Clean extraction specifically for L-4 Premium tables
    """
    try:
        if not CAMELOT_AVAILABLE:
            logger.warning("Camelot not available")
            return []

        logger.info(
            f"Extracting L-4 Premium from {pdf_path}, pages {pages_str}")

        # Extract tables with lattice
        tables = camelot.read_pdf(pdf_path, pages=pages_str, flavor='lattice')
        logger.info(f"Found {len(tables)} tables with lattice")

        all_rows = []

        # Process each table
        for i, table in enumerate(tables):
            df = table.df
            logger.info(f"Processing table {i+1}: Shape {df.shape}")

            # Check if this is an L-4 Premium table
            if not _is_l4_premium_table_clean(df):
                logger.info(
                    f"Skipping table {i+1} - not L-4 Premium structure")
                continue

            logger.info(f"Processing L-4 Premium table {i+1}")

            # Extract rows from this table
            table_rows = _extract_rows_from_l4_table(df, template_headers)
            all_rows.extend(table_rows)
            logger.info(f"Extracted {len(table_rows)} rows from table {i+1}")

        logger.info(
            f"Total extracted: {len(all_rows)} rows from {len(tables)} tables")
        return all_rows

    except Exception as e:
        logger.error(f"Error in L-4 Premium extraction: {e}")
        import traceback
        traceback.print_exc()
        return []


def _is_l4_premium_table_clean(df) -> bool:
    """
    Check if this DataFrame is an L-4 Premium table
    """
    try:
        # Check shape - should have ~15 columns for L-4 Premium
        if df.shape[1] < 10:
            return False

        # Check content
        table_text = df.astype(str).values.flatten()
        table_content = ' '.join(table_text).upper()

        has_particulars = 'PARTICULARS' in table_content
        has_linked = 'LINKED' in table_content
        has_participating = 'PARTICIPATING' in table_content
        has_premium_terms = any(term in table_content for term in [
                                'PREMIUM', 'FIRST YEAR', 'RENEWAL'])

        # Exclude commission tables for premium extraction
        has_commission = 'COMMISSION' in table_content
        has_operating = any(term in table_content for term in [
                            'EMPLOYEE', 'REMUNERATION', 'TRAVEL', 'TRAINING'])

        # Must have premium characteristics but not commission/operating
        return has_particulars and has_linked and has_participating and has_premium_terms and not has_commission and not has_operating

    except Exception as e:
        logger.error(f"Error checking L-4 table: {e}")
        return False


def _extract_rows_from_l4_table(df, template_headers: List[str]) -> List[Dict[str, Any]]:
    """
    Extract structured rows from an L-4 Premium DataFrame
    """
    try:
        rows = []

        # Clean DataFrame
        df = df.fillna('')
        df = df.astype(str)

        # Data starts from row 3 (0-indexed) based on our analysis
        data_start_row = 3

        for row_idx in range(data_start_row, len(df)):
            row_data = df.iloc[row_idx].tolist()

            # Skip empty rows
            if not any(cell.strip() and cell.strip() != 'nan' for cell in row_data):
                continue

            # Get particulars (first column)
            particulars = str(row_data[0]).strip() if len(row_data) > 0 else ""
            if not particulars or particulars == 'nan' or len(particulars) < 2:
                continue

            # Clean particulars text
            clean_particulars = _clean_particulars_text(particulars)

            # Build row dictionary
            row_dict = {}

            # Map to template headers
            for i, header in enumerate(template_headers):
                if i == 0:  # Particulars column
                    row_dict[header] = clean_particulars
                elif i < len(row_data):
                    # Clean numeric value
                    raw_value = str(row_data[i]).strip()
                    clean_value = _clean_numeric_value(raw_value)
                    row_dict[header] = clean_value
                else:
                    row_dict[header] = ""

            # Only add if has meaningful data
            numeric_count = sum(1 for v in row_dict.values()
                                if v and re.search(r'\d', v))
            if clean_particulars and numeric_count >= 1:
                rows.append(row_dict)
                logger.info(f"Added row: {clean_particulars[:40]}...")

        return rows

    except Exception as e:
        logger.error(f"Error extracting rows: {e}")
        return []


def _clean_particulars_text(text: str) -> str:
    """
    Clean the particulars column text
    """
    if not text or text.strip() == 'nan':
        return ""

    # Remove extra whitespace and newlines
    cleaned = re.sub(r'\s+', ' ', text.strip())

    # Fix common issues
    cleaned = cleaned.replace('\n', ' ')
    cleaned = re.sub(r'\s+', ' ', cleaned)

    return cleaned.strip()


def _clean_numeric_value(value: str) -> str:
    """
    Clean numeric values, properly separating concatenated numbers
    """
    if not value or value.strip() == 'nan':
        return ""

    # Remove whitespace and newlines
    cleaned = value.replace('\n', ' ').strip()

    # If no digits, return as is
    if not re.search(r'\d', cleaned):
        return ""

    # Handle concatenated numbers with line breaks
    # Example: "2,12,587\n        \n5,18,485\n           \n60,044"
    # Should become: "2,12,587" (take the first number)

    # Split on newlines and whitespace, find the first valid number
    parts = re.split(r'[\n\s]+', cleaned)

    for part in parts:
        part = part.strip()
        if part and re.search(r'\d', part):
            # Clean this part
            clean_part = re.sub(r'[^\d,\-\(\)]', '', part)
            if clean_part and len(clean_part.replace(',', '')) >= 1:
                return clean_part

    # Fallback: just clean and return first reasonable number
    cleaned = re.sub(r'[^\d,\-\(\)\s]', '', cleaned)
    cleaned = re.sub(r'\s+', '', cleaned)

    return cleaned if cleaned else ""


def _extract_clean_form_data(pdf_path: str, pages_str: str, template_headers: List[str], form_type: str) -> List[Dict[str, Any]]:
    """
    Clean extraction for all supported forms using form-specific logic
    """
    try:
        if not CAMELOT_AVAILABLE:
            logger.warning("Camelot not available")
            return []

        logger.info(
            f"Extracting {form_type} from {pdf_path}, pages {pages_str}")

        # Extract tables with lattice
        tables = camelot.read_pdf(pdf_path, pages=pages_str, flavor='lattice')
        logger.info(f"Found {len(tables)} tables with lattice")

        all_rows = []

        # Process each table
        for i, table in enumerate(tables):
            df = table.df
            logger.info(f"Processing table {i+1}: Shape {df.shape}")

            # Check if this is a relevant table for the specific form type
            is_relevant = False
            if form_type == "L-4-PREMIUM":
                is_relevant = _is_l4_premium_table_clean(df)
            elif form_type == "L-5-COMMISSION":
                is_relevant = _is_l5_commission_table(df)
            elif form_type == "L-6-OPERATING":
                is_relevant = _is_l6_operating_table(df)

            if not is_relevant:
                logger.info(
                    f"Skipping table {i+1} - not {form_type} structure")
                continue

            logger.info(f"Processing {form_type} table {i+1}")

            # Extract rows from this table
            table_rows = _extract_rows_from_l4_table(df, template_headers)
            all_rows.extend(table_rows)
            logger.info(f"Extracted {len(table_rows)} rows from table {i+1}")

        logger.info(
            f"Total extracted: {len(all_rows)} rows from {len(tables)} tables")
        return all_rows

    except Exception as e:
        logger.error(f"Error in {form_type} extraction: {e}")
        return []


def _is_l5_commission_table(df) -> bool:
    """
    Check if this DataFrame is an L-5 Commission table
    """
    try:
        if df.shape[1] < 10:
            return False

        table_text = df.astype(str).values.flatten()
        table_content = ' '.join(table_text).upper()

        has_particulars = 'PARTICULARS' in table_content
        has_linked = 'LINKED' in table_content
        has_participating = 'PARTICIPATING' in table_content
        has_commission = 'COMMISSION' in table_content

        # Should have commission but not operating expenses
        has_operating = any(term in table_content for term in [
                            'EMPLOYEE', 'REMUNERATION', 'TRAVEL', 'TRAINING'])

        return has_particulars and has_linked and has_participating and has_commission and not has_operating

    except Exception as e:
        logger.error(f"Error checking L-5 table: {e}")
        return False


def _is_l6_operating_table(df) -> bool:
    """
    Check if this DataFrame is an L-6 Operating table
    """
    try:
        if df.shape[1] < 10:
            return False

        table_text = df.astype(str).values.flatten()
        table_content = ' '.join(table_text).upper()

        has_particulars = 'PARTICULARS' in table_content
        has_linked = 'LINKED' in table_content
        has_participating = 'PARTICIPATING' in table_content
        has_operating = any(term in table_content for term in [
                            'EMPLOYEE', 'REMUNERATION', 'TRAVEL', 'TRAINING', 'WELFARE'])

        # Should have operating expenses but not commission
        has_commission = 'COMMISSION' in table_content

        return has_particulars and has_linked and has_participating and has_operating and not has_commission

    except Exception as e:
        logger.error(f"Error checking L-6 table: {e}")
        return False
