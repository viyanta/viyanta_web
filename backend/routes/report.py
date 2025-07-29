from fastapi import APIRouter, HTTPException
from .database import get_all_files
import os
import pandas as pd

router = APIRouter()
CONVERTED_DIR = "converted"


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

    pass


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

    pass
