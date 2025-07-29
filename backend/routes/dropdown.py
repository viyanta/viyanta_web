from fastapi import APIRouter, HTTPException
from .database import get_all_files
from datetime import datetime
import os
import pandas as pd

router = APIRouter()
CONVERTED_DIR = "converted"


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

    pass
