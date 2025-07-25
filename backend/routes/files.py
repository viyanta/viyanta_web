from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import pandas as pd
import json
import os
import uuid
from datetime import datetime
from typing import List
import PyPDF2
import io
from .database import (
    add_file_record,
    get_all_files,
    update_file_status,
    get_file_stats,
    get_file_by_id
)

router = APIRouter()

UPLOAD_DIR = "uploads"
CONVERTED_DIR = "converted"

# Create directories if they don't exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(CONVERTED_DIR, exist_ok=True)


def extract_text_from_pdf(pdf_file):
    """Extract text from PDF file"""
    try:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text_data = []

        for page_num, page in enumerate(pdf_reader.pages):
            text = page.extract_text()
            if text.strip():
                text_data.append({
                    "page": page_num + 1,
                    "content": text.strip()
                })

        return text_data
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error processing PDF: {str(e)}")


def convert_to_parquet(file_path: str, file_type: str, original_filename: str):
    """Convert different file types to Parquet format"""
    try:
        if file_type == "csv":
            # Read CSV file
            df = pd.read_csv(file_path)

        elif file_type == "json":
            # Read JSON file
            with open(file_path, 'r', encoding='utf-8') as f:
                json_data = json.load(f)

            # Handle different JSON structures
            if isinstance(json_data, list):
                df = pd.DataFrame(json_data)
            elif isinstance(json_data, dict):
                # If it's a single object, wrap in list
                df = pd.DataFrame([json_data])
            else:
                raise ValueError("Unsupported JSON structure")

        elif file_type == "pdf":
            # Extract text from PDF and create DataFrame
            with open(file_path, 'rb') as f:
                text_data = extract_text_from_pdf(f)

            df = pd.DataFrame(text_data)

        else:
            raise ValueError(f"Unsupported file type: {file_type}")

        # Generate output filename
        base_name = os.path.splitext(original_filename)[0]
        output_filename = f"{base_name}_{uuid.uuid4().hex[:8]}.parquet"
        output_path = os.path.join(CONVERTED_DIR, output_filename)

        # Save as Parquet
        df.to_parquet(output_path, index=False)

        return output_path, output_filename, len(df)

    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error converting file: {str(e)}")


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload and convert file to Parquet format"""

    # Validate file type
    allowed_types = {
        "application/pdf": "pdf",
        "text/csv": "csv",
        "application/json": "json",
        "application/vnd.ms-excel": "csv",
        "text/plain": "csv"  # Sometimes CSV files are detected as text/plain
    }

    file_type = None
    if file.content_type in allowed_types:
        file_type = allowed_types[file.content_type]
    elif file.filename.lower().endswith('.csv'):
        file_type = "csv"
    elif file.filename.lower().endswith('.json'):
        file_type = "json"
    elif file.filename.lower().endswith('.pdf'):
        file_type = "pdf"

    if not file_type:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload PDF, JSON, or CSV files."
        )

    try:
        # Generate unique filename
        file_id = str(uuid.uuid4())
        original_filename = file.filename
        file_extension = os.path.splitext(original_filename)[1]
        stored_filename = f"{file_id}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, stored_filename)

        # Save uploaded file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        file_size = len(content)

        # Add file record to database
        file_record = add_file_record(
            file_id=file_id,
            original_filename=original_filename,
            stored_filename=stored_filename,
            file_type=file_type,
            file_size=file_size,
            status="processing"
        )

        # Convert to Parquet
        try:
            parquet_path, parquet_filename, row_count = convert_to_parquet(
                file_path, file_type, original_filename
            )

            parquet_size = os.path.getsize(parquet_path)

            # Update file record with conversion results
            update_file_status(
                file_id=file_id,
                status="completed",
                parquet_filename=parquet_filename,
                parquet_size=parquet_size,
                row_count=row_count
            )

            return {
                "success": True,
                "message": "File uploaded and converted successfully",
                "file_id": file_id,
                "original_file": {
                    "filename": original_filename,
                    "size": file_size,
                    "type": file_type.upper()
                },
                "parquet_file": {
                    "filename": parquet_filename,
                    "size": parquet_size,
                    "row_count": row_count
                }
            }

        except Exception as e:
            # Update status to failed
            update_file_status(
                file_id=file_id, status="failed", error_message=str(e))
            raise HTTPException(
                status_code=500, detail=f"Conversion failed: {str(e)}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/files")
async def get_files():
    """Get list of all uploaded files"""
    try:
        files = get_all_files()
        return {
            "success": True,
            "files": files
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error retrieving files: {str(e)}")


@router.get("/stats")
async def get_statistics():
    """Get file upload and processing statistics"""
    try:
        stats = get_file_stats()
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error retrieving stats: {str(e)}")


@router.get("/original/{file_id}")
async def serve_original_file(file_id: str):
    """Serve the original file exactly as it was uploaded"""
    try:
        # Get file record from database
        file_record = get_file_by_id(file_id)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")

        # Construct the original file path
        original_filename = file_record['stored_filename']
        original_path = os.path.join(UPLOAD_DIR, original_filename)

        if not os.path.exists(original_path):
            raise HTTPException(
                status_code=404, detail="Original file not found on disk")

        # Get file extension to set proper media type
        file_extension = os.path.splitext(
            file_record['original_filename'])[1].lower()

        media_type_map = {
            '.pdf': 'application/pdf',
            '.json': 'application/json',
            '.csv': 'text/csv',
            '.txt': 'text/plain'
        }

        media_type = media_type_map.get(
            file_extension, 'application/octet-stream')

        # Return the file with appropriate headers for inline viewing
        headers = {
            "Content-Disposition": "inline",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }

        return FileResponse(
            path=original_path,
            media_type=media_type,
            headers=headers
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to serve original file: {str(e)}")


@router.get("/download/original/{file_id}")
async def download_original_file(file_id: str):
    """Download original uploaded file"""
    try:
        file_record = get_file_by_id(file_id)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")

        file_path = os.path.join(UPLOAD_DIR, file_record['stored_filename'])
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=404, detail="File not found on disk")

        return FileResponse(
            path=file_path,
            filename=file_record['original_filename'],
            media_type='application/octet-stream'
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Download failed: {str(e)}")


@router.get("/download/parquet/{file_id}")
async def download_parquet_file(file_id: str):
    """Download converted Parquet file"""
    try:
        file_record = get_file_by_id(file_id)
        if not file_record or not file_record.get('parquet_filename'):
            raise HTTPException(
                status_code=404, detail="Parquet file not found")

        file_path = os.path.join(
            CONVERTED_DIR, file_record['parquet_filename'])
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=404, detail="Parquet file not found on disk")

        return FileResponse(
            path=file_path,
            filename=file_record['parquet_filename'],
            media_type='application/octet-stream'
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Download failed: {str(e)}")


@router.get("/preview/{file_id}")
async def preview_parquet_data(file_id: str, full: bool = False):
    """Preview parquet file data (first few rows or full data)"""
    try:
        file_record = get_file_by_id(file_id)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")

        if file_record['status'] != 'completed':
            raise HTTPException(
                status_code=400, detail="File not processed yet")

        parquet_path = os.path.join(
            CONVERTED_DIR, file_record['parquet_filename'])
        if not os.path.exists(parquet_path):
            raise HTTPException(
                status_code=404, detail="Processed file not found")

        # Read parquet file and return preview or full data
        df = pd.read_parquet(parquet_path)

        if full:
            preview_data = df.to_dict('records')  # All rows
        else:
            preview_data = df.head(20).to_dict('records')  # First 20 rows

        return {
            "success": True,
            "preview": preview_data,
            "total_rows": len(df),
            "columns": list(df.columns),
            "file_type": "parquet",
            "is_full_data": full
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Preview failed: {str(e)}")


@router.get("/preview/original/{file_id}")
async def preview_original_data(file_id: str, full: bool = False):
    """Preview original file data (first few rows or full data)"""
    try:
        file_record = get_file_by_id(file_id)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")

        original_path = os.path.join(
            UPLOAD_DIR, file_record['stored_filename'])
        if not os.path.exists(original_path):
            raise HTTPException(
                status_code=404, detail="Original file not found")

        file_type = file_record['file_type']

        # Read original file based on type
        if file_type == "csv":
            df = pd.read_csv(original_path)
        elif file_type == "json":
            with open(original_path, 'r', encoding='utf-8') as f:
                json_data = json.load(f)

            if isinstance(json_data, list):
                df = pd.DataFrame(json_data)
            elif isinstance(json_data, dict):
                df = pd.DataFrame([json_data])
            else:
                raise ValueError("Unsupported JSON structure")
        elif file_type == "pdf":
            with open(original_path, 'rb') as f:
                text_data = extract_text_from_pdf(f)
            df = pd.DataFrame(text_data)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

        if full:
            preview_data = df.to_dict('records')  # All rows
        else:
            preview_data = df.head(20).to_dict('records')  # First 20 rows

        return {
            "success": True,
            "preview": preview_data,
            "total_rows": len(df),
            "columns": list(df.columns),
            "file_type": file_type,
            "is_full_data": full
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Preview failed: {str(e)}")


@router.get("/dropdown-data")
async def get_dropdown_data():
    """Extract dropdown data from all processed files with comprehensive L-forms"""
    try:
        files = get_all_files()

        # Comprehensive L-forms based on insurance regulations
        lforms_master = {
            "L-1-A-RA": "Revenue Account",
            "L-2-A-PL": "Profit & Loss Account",
            "L-3-A-BS": "Balance Sheet",
            "L-4-PREMIUM": "Premium Schedule",
            "L-5-COMMISSION": "Commission Expenses Schedule",
            "L-6-OPERATING": "Operating Expenses Schedule",
            "L-6A-SHAREHOLDERS": "Shareholders' Expenses Schedule",
            "L-7-BENEFITS": "Benefits Paid Schedule",
            "L-8-SHARE": "Share Capital Schedule",
            "L-9-PATTERN": "Pattern of Shareholding Schedule",
            "L-9A-DETAILED": "Detailed Shareholding Pattern",
            "L-10-RESERVE": "Reserves and Surplus Schedule",
            "L-11-BORROWINGS": "Borrowings Schedule",
            "L-12-INVESTMENT-SH": "Investment-Shareholders Schedule",
            "L-13-INVESTMENT-PH": "Investment-Policyholders Schedule",
            "L-14-INVESTMENT-LINKED": "Investment-Assets Held to Cover Linked Liabilities",
            "L-14A-INVESTMENT-ADD": "Investments Additional Information",
            "L-15-LOANS": "Loans Schedule",
            "L-16-FIXED": "Fixed Assets Schedule",
            "L-17-CASH": "Cash and Bank Balance Schedule",
            "L-18-ADVANCES": "Advances & Other Assets Schedule",
            "L-19-CURRENT": "Current Liabilities Schedule",
            "L-20-PROVISIONS": "Provisions Schedule",
            "L-21-MISC": "Misc Expenditure Schedule",
            "L-22-ANALYTICAL": "Analytical Ratios",
            "L-23-RECEIPTS": "Receipts & Payment Account",
            "L-24-VALUATION": "Valuation of Net Liabilities",
            "L-25-GEOGRAPHICAL": "Geographical Distribution of Business",
            "L-26-INVESTMENT-ASSETS": "Investment Assets Asset Class",
            "L-27-UNIT": "Unit Linked Business ULIP Fund",
            "L-28-ULIP": "ULIP NAV",
            "L-29-DEBT": "Debt Securities",
            "L-30-RELATED": "Related Party Transactions",
            "L-31-BOD": "Board of Directors & Key Persons",
            "L-32-SOLVENCY": "Available Solvency Margin and Solvency Ratio",
            "L-33-NPAS": "NPAs",
            "L-34-YIELD": "Investment break up by class and Yield on Investment",
            "L-35-DOWNGRADING": "Downgrading of Investment",
            "L-36-BSNS": "Premium and number of lives covered by policy type",
            "L-37-BSNS-GROUP": "Detail of business procured - Distribution Channel wise (Group)",
            "L-38-BSNS-INDIVIDUALS": "Detail of business procured - Distribution Channel wise (Individuals)",
            "L-39-CLAIMS-AGEING": "Ageing of Claims",
            "L-40-CLAIMS": "Claims Data",
            "L-41-GRIEVANCES": "Grievance Disposal",
            "L-42-VALUATION-BASIS": "Main Parameters of Valuation",
            "L-43-VOTING": "Voting Activity Disclosure under Stewardship Code",
            "L-44-EMBEDDED": "Embedded Value",
            "L-45-OFFICES": "Offices and other information"
        }

        dropdown_data = {
            "companies": set(),
            "companyInfo": ["Background", "Industry metrics", "Industry Aggregates", "Economy"],
            "lforms": set(),  # Will be populated dynamically per company
            "reportTypes": ["Standalone", "Consolidation"],
            "periods": set()
        }

        for file_record in files:
            if file_record['status'] != 'completed' or not file_record.get('parquet_filename'):
                continue

            try:
                parquet_path = os.path.join(
                    CONVERTED_DIR, file_record['parquet_filename'])
                if not os.path.exists(parquet_path):
                    continue

                df = pd.read_parquet(parquet_path)
                original_name = file_record['original_filename']

                # Enhanced company name extraction
                company_patterns = {
                    'HDFC': 'HDFC Life Insurance Company Limited',
                    'SBI': 'SBI Life Insurance Company Limited',
                    'LIC': 'Life Insurance Corporation of India',
                    'ICICI': 'ICICI Prudential Life Insurance Company Limited',
                    'MAX': 'Max Life Insurance Company Limited',
                    'BAJAJ': 'Bajaj Allianz Life Insurance Company Limited',
                    'TATA': 'Tata AIA Life Insurance Company Limited',
                    'BIRLA': 'Aditya Birla Sun Life Insurance Company Limited'
                }

                company_found = False
                for pattern, full_name in company_patterns.items():
                    if pattern in original_name.upper():
                        dropdown_data["companies"].add(full_name)
                        company_found = True
                        break

                if not company_found:
                    # Clean filename to create company name
                    clean_name = original_name
                    for suffix in ['.pdf', '.csv', '.json', '.parquet']:
                        clean_name = clean_name.replace(suffix, '')
                    # Remove common patterns
                    import re
                    clean_name = re.sub(r'FY\d{4}', '', clean_name)
                    clean_name = re.sub(r'20\d{2}', '', clean_name)
                    clean_name = re.sub(r'Q[1-4]', '', clean_name)
                    clean_name = re.sub(r'[_-]+', ' ', clean_name).strip()

                    if len(clean_name) > 3:
                        dropdown_data["companies"].add(clean_name)

                # Enhanced L-form extraction - check for L-form patterns in filename and data
                for lform_key, lform_desc in lforms_master.items():
                    # Check filename for L-form patterns
                    lform_patterns = [
                        lform_key,
                        lform_key.replace('-', ''),
                        lform_key.lower(),
                        lform_desc.lower()
                    ]

                    for pattern in lform_patterns:
                        if pattern.lower() in original_name.lower():
                            dropdown_data["lforms"].add(
                                f"{lform_key}: {lform_desc}")
                            break

                # Check DataFrame columns and content for L-form references
                try:
                    for column in df.columns:
                        column_lower = str(column).lower()
                        for lform_key, lform_desc in lforms_master.items():
                            if any(word in column_lower for word in lform_key.lower().split('-')):
                                dropdown_data["lforms"].add(
                                    f"{lform_key}: {lform_desc}")

                    # Check data content for L-form references
                    for column in df.columns:
                        if df[column].dtype == 'object':  # String columns
                            unique_values = df[column].dropna().astype(
                                str).unique()
                            # Check first 20 unique values
                            for value in unique_values[:20]:
                                value_upper = str(value).upper()
                                for lform_key, lform_desc in lforms_master.items():
                                    if lform_key in value_upper or any(word in value_upper for word in lform_key.split('-')[:2]):
                                        dropdown_data["lforms"].add(
                                            f"{lform_key}: {lform_desc}")
                except:
                    pass

                # Enhanced period extraction
                import re
                year_matches = re.findall(r'20\d{2}', original_name)
                quarters = []

                if 'Q1' in original_name.upper():
                    quarters.extend(['Q1'])
                if 'Q2' in original_name.upper():
                    quarters.extend(['Q2'])
                if 'Q3' in original_name.upper():
                    quarters.extend(['Q3'])
                if 'Q4' in original_name.upper():
                    quarters.extend(['Q4'])
                if '9M' in original_name.upper():
                    quarters.extend(['Q1', 'Q2', 'Q3'])
                if '6M' in original_name.upper():
                    quarters.extend(['Q1', 'Q2'])

                for year in year_matches:
                    if quarters:
                        for quarter in quarters:
                            dropdown_data["periods"].add(f"{quarter}-{year}")
                    else:
                        dropdown_data["periods"].add(f"FY{year}")

                # Extract periods from data
                try:
                    for column in df.columns:
                        if any(word in str(column).lower() for word in ['period', 'date', 'year', 'quarter', 'month']):
                            unique_values = df[column].dropna().unique()
                            for value in unique_values[:10]:
                                if isinstance(value, str) and 4 <= len(value) <= 20:
                                    dropdown_data["periods"].add(value.strip())
                except:
                    pass

            except Exception as e:
                print(
                    f"Error processing file {file_record['original_filename']}: {str(e)}")
                continue

        # Add default values if sets are empty
        if len(dropdown_data["companies"]) < 2:
            dropdown_data["companies"].update({
                "HDFC Life Insurance Company Limited",
                "SBI Life Insurance Company Limited",
                "Life Insurance Corporation of India",
                "ICICI Prudential Life Insurance Company Limited"
            })

        # L-forms will be populated per company selection - no default L-forms
        # Companies will get their specific L-forms via /company-lforms/{company_name} endpoint

        if len(dropdown_data["periods"]) < 3:
            current_year = datetime.now().year
            dropdown_data["periods"].update({
                f"Q1-{current_year-1}",
                f"Q2-{current_year-1}",
                f"Q3-{current_year-1}",
                f"Q4-{current_year-1}",
                f"FY{current_year-1}"
            })

        # Convert sets to sorted lists for JSON serialization
        result = {
            "companies": [{"name": name, "id": idx + 1} for idx, name in enumerate(sorted(dropdown_data["companies"]))],
            "companyInfo": [{"name": name, "id": idx + 1} for idx, name in enumerate(dropdown_data["companyInfo"])],
            "lforms": [{"name": name, "id": idx + 1} for idx, name in enumerate(sorted(dropdown_data["lforms"]))],
            "reportTypes": [{"name": name, "id": idx + 1} for idx, name in enumerate(dropdown_data["reportTypes"])],
            "periods": [{"name": name, "id": idx + 1} for idx, name in enumerate(sorted(dropdown_data["periods"]))]
        }

        return {
            "success": True,
            "dropdown_data": result,
            "metadata": {
                "total_files_processed": len([f for f in files if f['status'] == 'completed']),
                "available_lforms": len(result["lforms"]),
                "data_extracted_from": [f['original_filename'] for f in files if f['status'] == 'completed']
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error extracting dropdown data: {str(e)}")

        for file_record in files:
            if file_record['status'] != 'completed' or not file_record.get('parquet_filename'):
                continue

            try:
                parquet_path = os.path.join(
                    CONVERTED_DIR, file_record['parquet_filename'])
                if not os.path.exists(parquet_path):
                    continue

                df = pd.read_parquet(parquet_path)

                # Extract company names from filename or data
                original_name = file_record['original_filename']

                # Try to extract company from filename
                if 'HDFC' in original_name.upper():
                    dropdown_data["companies"].add("HDFC Life Insurance")
                elif 'SBI' in original_name.upper():
                    dropdown_data["companies"].add("SBI Life Insurance")
                elif 'LIC' in original_name.upper():
                    dropdown_data["companies"].add("LIC")
                else:
                    # Use filename as company name
                    company_name = original_name.replace(
                        '.pdf', '').replace('.csv', '').replace('.json', '')
                    dropdown_data["companies"].add(company_name)

                # Extract L-form information from filename
                if 'L1' in original_name.upper() or 'L-1' in original_name.upper():
                    dropdown_data["lforms"].add("L-1")
                elif 'L2' in original_name.upper() or 'L-2' in original_name.upper():
                    dropdown_data["lforms"].add("L-2")
                elif 'L3' in original_name.upper() or 'L-3' in original_name.upper():
                    dropdown_data["lforms"].add("L-3")
                else:
                    dropdown_data["lforms"].add("L-1")  # Default

                # Extract periods from filename or data
                import re
                # Look for year patterns
                year_match = re.search(r'(20\d{2})', original_name)
                if year_match:
                    year = year_match.group(1)
                    # Look for quarter or month patterns
                    if 'Q1' in original_name.upper() or '9M' in original_name.upper():
                        dropdown_data["periods"].add(f"Q1-{year}")
                        dropdown_data["periods"].add(f"Q2-{year}")
                        dropdown_data["periods"].add(f"Q3-{year}")
                    elif 'Q2' in original_name.upper():
                        dropdown_data["periods"].add(f"Q2-{year}")
                    elif 'Q3' in original_name.upper():
                        dropdown_data["periods"].add(f"Q3-{year}")
                    elif 'Q4' in original_name.upper():
                        dropdown_data["periods"].add(f"Q4-{year}")
                    else:
                        dropdown_data["periods"].add(f"FY{year}")

                # Try to extract data from DataFrame columns if they contain relevant info
                for column in df.columns:
                    if 'company' in column.lower() or 'name' in column.lower():
                        unique_values = df[column].dropna().unique()
                        # Limit to first 5 unique values
                        for value in unique_values[:5]:
                            if isinstance(value, str) and len(value) > 2:
                                dropdown_data["companies"].add(value)

                    if 'period' in column.lower() or 'date' in column.lower() or 'year' in column.lower():
                        unique_values = df[column].dropna().unique()
                        # Limit to first 10 unique values
                        for value in unique_values[:10]:
                            if isinstance(value, str) and len(value) > 2:
                                dropdown_data["periods"].add(value)

            except Exception as e:
                print(
                    f"Error processing file {file_record['original_filename']}: {str(e)}")
                continue

        # Add default values if sets are empty
        if not dropdown_data["companies"]:
            dropdown_data["companies"] = {
                "HDFC Life Insurance", "SBI Life Insurance", "LIC"}

        if not dropdown_data["lforms"]:
            dropdown_data["lforms"] = {"L-1", "L-2", "L-3"}

        if not dropdown_data["periods"]:
            dropdown_data["periods"] = {
                "Q1-2023", "Q2-2023", "Q3-2023", "Q4-2023", "FY2023"}

        # Convert sets to sorted lists for JSON serialization
        result = {
            "companies": [{"name": name, "id": idx + 1} for idx, name in enumerate(sorted(dropdown_data["companies"]))],
            "companyInfo": [{"name": name, "id": idx + 1} for idx, name in enumerate(dropdown_data["companyInfo"])],
            "lforms": [{"name": name, "id": idx + 1} for idx, name in enumerate(sorted(dropdown_data["lforms"]))],
            "reportTypes": [{"name": name, "id": idx + 1} for idx, name in enumerate(dropdown_data["reportTypes"])],
            "periods": [{"name": name, "id": idx + 1} for idx, name in enumerate(sorted(dropdown_data["periods"]))]
        }

        return {
            "success": True,
            "dropdown_data": result
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error extracting dropdown data: {str(e)}")


@router.post("/generate-report")
async def generate_report(request_data: dict):
    """Generate filtered report with exact table data and dynamic headers for selected L-form"""
    try:
        company = request_data.get('company')
        lform = request_data.get('lform')
        period = request_data.get('period')
        report_type = request_data.get('reportType')
        company_info = request_data.get('companyInfo')

        if not lform:
            raise HTTPException(
                status_code=400, detail="L-form selection is required")

        files = get_all_files()
        report_data = {
            "headers": [],
            "rows": [],
            "table_title": "",
            "source_files": []
        }

        # Extract L-form code from selection
        lform_code = lform.split(':')[0].strip() if ':' in lform else lform

        for file_record in files:
            if file_record['status'] != 'completed' or not file_record.get('parquet_filename'):
                continue

            try:
                # Check if file matches company filter
                if company:
                    company_name = company.lower()
                    file_name = file_record['original_filename'].lower()
                    company_keywords = ['hdfc', 'sbi', 'lic',
                                        'icici', 'max', 'bajaj', 'tata', 'birla']

                    matched_company = False
                    for keyword in company_keywords:
                        if keyword in company_name.lower() and keyword in file_name:
                            matched_company = True
                            break

                    if not matched_company and company_name not in file_name:
                        continue

                # Check if file matches period filter
                if period:
                    period_lower = period.lower()
                    file_name_lower = file_record['original_filename'].lower()

                    # Extract year and quarter from period
                    import re
                    period_parts = re.findall(
                        r'(q[1-4]|fy|20\d{2})', period_lower)

                    matched_period = False
                    for part in period_parts:
                        if part in file_name_lower:
                            matched_period = True
                            break

                    if not matched_period and len(period_parts) > 0:
                        continue

                parquet_path = os.path.join(
                    CONVERTED_DIR, file_record['parquet_filename'])
                if not os.path.exists(parquet_path):
                    continue

                df = pd.read_parquet(parquet_path)

                # Filter rows based on L-form selection
                lform_related_rows = []

                # Method 1: Check column names for L-form references
                relevant_columns = []
                for col in df.columns:
                    col_lower = str(col).lower()
                    if any(keyword in col_lower for keyword in lform_keywords):
                        relevant_columns.append(col)

                # Method 2: Check data content for L-form references
                for index, row in df.iterrows():
                    row_matches = False

                    # Check if any cell in the row contains L-form reference
                    for col in df.columns:
                        cell_value = str(row[col]).upper()
                        if lform_code.upper() in cell_value:
                            row_matches = True
                            break

                        # Check for partial matches with L-form keywords
                        if len(lform_keywords) >= 2:
                            keyword_matches = sum(
                                1 for keyword in lform_keywords[:3] if keyword in cell_value.lower())
                            if keyword_matches >= 2:
                                row_matches = True
                                break

                    # Check relevant columns more thoroughly
                    for col in relevant_columns:
                        if pd.notna(row[col]) and str(row[col]).strip():
                            row_matches = True
                            break

                    if row_matches:
                        row_dict = row.to_dict()
                        row_dict['source_file'] = file_record['original_filename']
                        row_dict['file_id'] = file_record['file_id']
                        lform_related_rows.append(row_dict)

                # If no specific matches found, include relevant columns data
                if not lform_related_rows and relevant_columns:
                    for index, row in df.iterrows():
                        if any(pd.notna(row[col]) and str(row[col]).strip() for col in relevant_columns):
                            row_dict = {col: row[col]
                                        for col in relevant_columns}
                            row_dict['source_file'] = file_record['original_filename']
                            row_dict['file_id'] = file_record['file_id']
                            lform_related_rows.append(row_dict)

                # Limit to 50 rows per file
                filtered_data.extend(lform_related_rows[:50])

            except Exception as e:
                print(
                    f"Error processing file {file_record['original_filename']}: {str(e)}")
                continue

        # If no specific data found, provide sample data structure
        if not filtered_data:
            sample_data = {
                'message': f'No specific data found for {lform}',
                'lform_code': lform_code,
                'search_keywords': lform_keywords,
                'company': company,
                'period': period,
                'suggestion': f'Please ensure files contain data related to {lform_code} or upload relevant files.'
            }
            filtered_data = [sample_data]

        return {
            "success": True,
            "report_data": {
                "filters": {
                    "company": company,
                    "lform": lform,
                    "period": period,
                    "report_type": report_type,
                    "company_info": company_info
                },
                "data": filtered_data[:100],  # Limit to 100 rows total
                "total_rows": len(filtered_data),
                "columns": list(filtered_data[0].keys()) if filtered_data else []
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating report: {str(e)}")


@router.post("/generate-lform-report")
async def generate_lform_report(request_data: dict):
    """Generate L-form specific report with dynamic headers"""
    try:
        company = request_data.get('company')
        lform = request_data.get('lform')

        if not lform:
            raise HTTPException(
                status_code=400, detail="L-form selection is required")

        files = get_all_files()
        lform_code = lform.split(':')[0].strip() if ':' in lform else lform

        result_data = {
            "headers": [],
            "rows": [],
            "source_files": []
        }

        # Look for L-form data in company files
        for file_record in files:
            if file_record['status'] != 'completed':
                continue

            # Filter by company
            if company:
                file_name = file_record['original_filename'].lower()
                if not any(keyword in file_name for keyword in ['hdfc', 'sbi', 'lic'] if keyword in company.lower()):
                    continue

            try:
                parquet_path = os.path.join(
                    CONVERTED_DIR, file_record['parquet_filename'])
                if not os.path.exists(parquet_path):
                    continue

                df = pd.read_parquet(parquet_path)

                # Search for L-form references
                for index, row in df.iterrows():
                    # Check if row contains L-form reference
                    row_text = ' '.join(
                        [str(val) for val in row.values if pd.notna(val)]).upper()

                    if lform_code.upper() in row_text:
                        # Found L-form data - extract headers if first time
                        if not result_data["headers"]:
                            # Try to get headers from previous row or column names
                            if index > 0:
                                header_row = df.iloc[index - 1]
                                potential_headers = [
                                    str(val) for val in header_row.values if pd.notna(val) and str(val).strip()]
                                if len(potential_headers) >= 3:
                                    result_data["headers"] = potential_headers[:10]

                        if not result_data["headers"]:
                            result_data["headers"] = [
                                f"Column_{i+1}" for i in range(min(10, len(df.columns)))]

                        # Add data row
                        row_data = []
                        for i, col in enumerate(df.columns):
                            if i >= len(result_data["headers"]):
                                break
                            val = row[col]
                            row_data.append(str(val) if pd.notna(val) else "")

                        result_data["rows"].append(row_data)

                        # Add a few more rows after the L-form reference
                        for next_i in range(index + 1, min(index + 5, len(df))):
                            next_row = df.iloc[next_i]
                            next_data = []
                            has_data = False

                            for i, col in enumerate(df.columns):
                                if i >= len(result_data["headers"]):
                                    break
                                val = next_row[col]
                                str_val = str(val) if pd.notna(val) else ""
                                next_data.append(str_val)
                                if str_val.strip() and str_val not in ['-', '0']:
                                    has_data = True

                            if has_data:
                                result_data["rows"].append(next_data)

                if result_data["rows"]:
                    result_data["source_files"].append(
                        file_record['original_filename'])

            except Exception as e:
                print(
                    f"Error processing {file_record['original_filename']}: {e}")
                continue

        if not result_data["rows"]:
            return {
                "success": False,
                "message": f"No data found for {lform} in {company}'s files"
            }

        return {
            "success": True,
            "report_data": {
                "table": {
                    "title": f"{lform} - {company}",
                    "headers": result_data["headers"],
                    "rows": result_data["rows"],
                    "total_rows": len(result_data["rows"])
                },
                "filters": {
                    "company": company,
                    "lform": lform
                },
                "metadata": {
                    "source_files": result_data["source_files"],
                    "lform_code": lform_code
                }
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating L-form report: {str(e)}")


@router.get("/company-lforms/{company_name}")
async def get_company_lforms(company_name: str):
    """Get L-forms available for a specific company based on their actual files"""
    try:
        files = get_all_files()
        company_lforms = set()
        company_files = []

        # L-forms master reference for description lookup
        lforms_master = {
            "L-1": "Revenue Account", "L-1-A-RA": "Revenue Account",
            "L-2": "Profit & Loss Account", "L-2-A-PL": "Profit & Loss Account",
            "L-3": "Balance Sheet", "L-3-A-BS": "Balance Sheet",
            "L-4": "Premium Schedule", "L-5": "Commission Expenses Schedule",
            "L-6": "Operating Expenses Schedule", "L-7": "Benefits Paid Schedule",
            "L-8": "Share Capital Schedule", "L-9": "Pattern of Shareholding Schedule",
            "L-10": "Reserves and Surplus Schedule", "L-11": "Borrowings Schedule",
            "L-12": "Investment-Shareholders Schedule", "L-13": "Investment-Policyholders Schedule",
            "L-14": "Investment-Assets Held to Cover Linked Liabilities",
            "L-15": "Loans Schedule", "L-16": "Fixed Assets Schedule",
            "L-17": "Cash and Bank Balance Schedule", "L-18": "Advances & Other Assets Schedule",
            "L-19": "Current Liabilities Schedule", "L-20": "Provisions Schedule",
            "L-21": "Misc Expenditure Schedule", "L-22": "Analytical Ratios",
            "L-23": "Receipts & Payment Account", "L-24": "Valuation of Net Liabilities",
            "L-25": "Geographical Distribution of Business", "L-26": "Investment Assets Asset Class",
            "L-27": "Unit Linked Business ULIP Fund", "L-28": "ULIP NAV",
            "L-29": "Debt Securities", "L-30": "Related Party Transactions"
        }

        # Filter files for the specific company
        for file_record in files:
            if file_record['status'] != 'completed' or not file_record.get('parquet_filename'):
                continue

            original_name = file_record['original_filename'].lower()

            # Check if file belongs to the selected company
            company_lower = company_name.lower()
            company_keywords = ['hdfc', 'sbi', 'lic',
                                'icici', 'max', 'bajaj', 'tata', 'birla']

            is_company_file = False
            for keyword in company_keywords:
                if keyword in company_lower and keyword in original_name:
                    is_company_file = True
                    break

            if not is_company_file and company_lower.replace(' ', '').replace('-', '') not in original_name.replace(' ', '').replace('-', ''):
                continue

            company_files.append(file_record)

            try:
                parquet_path = os.path.join(
                    CONVERTED_DIR, file_record['parquet_filename'])
                if not os.path.exists(parquet_path):
                    continue

                df = pd.read_parquet(parquet_path)

                # Look for L-form references in the data
                # Method 1: Check filename for L-form patterns
                import re
                l_patterns = re.findall(r'L-?\d+[A-Z]*', original_name.upper())
                for pattern in l_patterns:
                    clean_pattern = pattern.replace('-', '')
                    if clean_pattern in lforms_master:
                        company_lforms.add(
                            f"{clean_pattern}: {lforms_master[clean_pattern]}")
                    elif pattern in lforms_master:
                        company_lforms.add(
                            f"{pattern}: {lforms_master[pattern]}")

                # Method 2: Check data content for L-form references
                for column in df.columns:
                    col_str = str(column).upper()
                    l_patterns = re.findall(r'L-?\d+[A-Z]*', col_str)
                    for pattern in l_patterns:
                        clean_pattern = pattern.replace('-', '')
                        if clean_pattern in lforms_master:
                            company_lforms.add(
                                f"{clean_pattern}: {lforms_master[clean_pattern]}")
                        elif pattern in lforms_master:
                            company_lforms.add(
                                f"{pattern}: {lforms_master[pattern]}")

                # Method 3: Look in data cells for L-form references
                for col in df.columns:
                    if df[col].dtype == 'object':  # String columns
                        try:
                            unique_values = df[col].dropna().astype(
                                str).str.upper().unique()
                            # Check first 50 unique values
                            for value in unique_values[:50]:
                                l_patterns = re.findall(
                                    r'L-?\d+[A-Z]*', str(value))
                                for pattern in l_patterns:
                                    clean_pattern = pattern.replace('-', '')
                                    if clean_pattern in lforms_master:
                                        company_lforms.add(
                                            f"{clean_pattern}: {lforms_master[clean_pattern]}")
                                    elif pattern in lforms_master:
                                        company_lforms.add(
                                            f"{pattern}: {lforms_master[pattern]}")
                        except:
                            continue

            except Exception as e:
                print(
                    f"Error processing file {file_record['original_filename']}: {str(e)}")
                continue

        # Convert to sorted list
        lforms_list = [{"name": name, "id": idx + 1}
                       for idx, name in enumerate(sorted(company_lforms))]

        return {
            "success": True,
            "company": company_name,
            "lforms": lforms_list,
            "total_files": len(company_files),
            "files_processed": [f['original_filename'] for f in company_files]
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error extracting company L-forms: {str(e)}")
