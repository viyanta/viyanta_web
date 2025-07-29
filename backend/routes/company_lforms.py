from fastapi import APIRouter, HTTPException
from .database import get_all_files
import os
import pandas as pd

router = APIRouter()
CONVERTED_DIR = "converted"


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

    pass
