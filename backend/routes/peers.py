from fastapi import APIRouter, HTTPException
import os
import re
import json
from pathlib import Path

router = APIRouter()

# PDF splits directory path - make it absolute
BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
PDF_SPLITS_DIR = os.path.join(BASE_DIR, "pdf_splits")
# Extractions directory path - make it absolute  
EXTRACTIONS_DIR = os.path.join(BASE_DIR, "extractions")

print(f"🔧 PDF_SPLITS_DIR: {PDF_SPLITS_DIR}")
print(f"🔧 EXTRACTIONS_DIR: {EXTRACTIONS_DIR}")
print(f"🔧 PDF_SPLITS_DIR exists: {os.path.exists(PDF_SPLITS_DIR)}")
print(f"🔧 EXTRACTIONS_DIR exists: {os.path.exists(EXTRACTIONS_DIR)}")


def _matches_lform(field_value: str, lform_number: str) -> bool:
    """
    Check if a field value matches the exact L-form number.
    Ensures "L-1" doesn't match "L-11" or "L-10", but does match "L-1-A" if searching for "L-1".
    Ensures "L-3" doesn't match "L-32", but does match "L-3-A" if searching for "L-3".
    Ensures "L-9A" ONLY matches "L-9A" exactly, NOT "L-9".
    
    Args:
        field_value: The field to check (form_name, form_code, etc.)
        lform_number: The L-form to match (e.g., "L-1", "L-11", "L-1-A", "L-9A")
    
    Returns:
        True if exact match is found
    """
    if not field_value:
        return False
    
    # Normalize both to uppercase
    field_upper = field_value.upper().strip()
    lform_upper = lform_number.upper().strip()
    
    # First check for exact equality
    if field_upper == lform_upper:
        return True
    
    # Check if the L-form has a letter suffix directly after the number (e.g., "L-9A", "L-14A")
    # If so, only allow exact matches - don't match base forms like "L-9" or "L-14"
    lform_with_letter_pattern = re.match(r'^(L-\d+)([A-Z]+)', lform_upper)
    if lform_with_letter_pattern:
        # This is a form like "L-9A" - only match exactly, no base form matching
        # Since we already checked for exact equality above, return False here
        return False
    
    # For forms without letter suffix (e.g., "L-1", "L-3"), allow base form and sub-forms
    # Extract the base L-form number (e.g., "L-1" from "L-1-A" or just "L-1" from "L-1")
    # For "L-1" or "L-1-A" or "L-1-BENEFITS", we want to match any L-form that starts with "L-1" 
    # but NOT "L-10", "L-11", etc.
    
    # Get the number part after "L-"
    lform_match = re.match(r'^(L-\d+)', lform_upper)
    if not lform_match:
        return False
    
    base_lform = lform_match.group(1)  # e.g., "L-1", "L-3"
    
    # Now find all L-form patterns in the field
    # This will find "L-1", "L-10", "L-1-A", etc. as separate patterns
    lform_patterns = re.findall(r'L-\d+[A-Z]?', field_upper)
    
    # Check if any pattern in the field matches our target
    for pattern in lform_patterns:
        # Check for exact match
        if pattern == lform_upper:
            return True
        
        # Check if the pattern starts with our base followed by a hyphen or letter
        # This prevents "L-10" from matching when searching for "L-1"
        # because "L-10" doesn't start with "L-1" followed by hyphen or end
        if pattern == base_lform:
            return True
        
        # Check for sub-forms like "L-1-A" when searching for "L-1"
        # pattern.startswith(base_lform + "-") ensures "L-1-A" matches but "L-10" doesn't
        if pattern.startswith(base_lform + "-"):
            return True
    
    return False


def find_companies_with_lform(lform_label: str) -> list:
    """
    Find all companies that have uploaded PDF splits with the given L-Form.
    Searches in both pdf_splits and extractions directories.
    
    Args:
        lform_label: The L-Form label from the frontend (e.g., "L-3 Balance Sheet", "L-7 Benefits Paid")
    
    Returns:
        List of company names that have this L-Form in their uploaded splits
    """
    companies = []
    companies_found = set()  # To avoid duplicates
    
    print(f"🔍 Searching for companies with L-Form: {lform_label}")
    
    # Extract the L-form number from the label (e.g., "L-7 Benefits Paid" -> "L-7")
    # Handle various formats: "L-1", "L-1-A", "L-9A", etc.
    lform_match = re.search(r'L[-_]?\d+[A-Z]*', lform_label.upper())
    if not lform_match:
        print(f"⚠️ Could not extract L-form number from: {lform_label}")
        return companies
    
    # Normalize the match to standard format (L-X or L-X-A)
    lform_number = lform_match.group(0).replace('_', '-').upper()
    print(f"🎯 Extracted L-form number: {lform_number}")
    
    # Search in pdf_splits directory
    if os.path.exists(PDF_SPLITS_DIR):
        companies.extend(_search_pdf_splits(PDF_SPLITS_DIR, lform_number, companies_found))
    
    # Search in extractions directory
    if os.path.exists(EXTRACTIONS_DIR):
        companies.extend(_search_extractions(EXTRACTIONS_DIR, lform_number, companies_found))
    
    print(f"📊 Total companies found: {len(companies)}")
    return companies


def _search_pdf_splits(base_dir: str, lform_number: str, companies_found: set) -> list:
    """Search for companies with L-form in pdf_splits directory"""
    companies = []
    
    print(f"📂 Searching in pdf_splits directory...")
    
    # Look through all company directories
    for company_dir in os.listdir(base_dir):
        company_path = os.path.join(base_dir, company_dir)
        
        # Skip if not a directory
        if not os.path.isdir(company_path):
            continue
        
        has_lform = False
        
        # Look through all PDF folders for this company
        for pdf_folder in os.listdir(company_path):
            pdf_folder_path = os.path.join(company_path, pdf_folder)
            
            # Skip if not a directory
            if not os.path.isdir(pdf_folder_path):
                continue
            
            # Look for metadata.json - may be in the folder itself or a subdirectory
            metadata_path = os.path.join(pdf_folder_path, "metadata.json")
            
            # If metadata.json doesn't exist in current folder, check subdirectories
            if not os.path.exists(metadata_path):
                # Check for nested folder structure (e.g., "SBI Life  S FY2025 HY/SBI Life  S FY2025 HY")
                for nested_folder in os.listdir(pdf_folder_path):
                    nested_path = os.path.join(pdf_folder_path, nested_folder)
                    if os.path.isdir(nested_path):
                        nested_metadata = os.path.join(nested_path, "metadata.json")
                        if os.path.exists(nested_metadata):
                            metadata_path = nested_metadata
                            break
            
            if not os.path.exists(metadata_path):
                continue
            
            try:
                # Read the metadata.json file
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                
                # Check split_files for matching form codes
                split_files = metadata.get('split_files', [])
                for split_file in split_files:
                    # Check form_name, form_code, and original_form_no
                    form_name = split_file.get('form_name', '')
                    form_code = split_file.get('form_code', '')
                    original_form_no = split_file.get('original_form_no', '')
                    
                    # Check if the L-form number exactly matches any of these fields
                    if (_matches_lform(form_name, lform_number) or 
                        _matches_lform(form_code, lform_number) or 
                        _matches_lform(original_form_no, lform_number)):
                        has_lform = True
                        print(f"✅ Found {lform_number} in pdf_splits/{company_dir}/{pdf_folder} (form_code: {form_code})")
                        break
                
                if has_lform:
                    break
                    
            except Exception as e:
                print(f"⚠️ Error reading metadata for {company_dir}/{pdf_folder}: {e}")
                continue
        
        # Add company to results if we found the L-form with PDF information
        if has_lform:
            company_id = company_dir.lower().replace(' ', '-')
            company_name = company_dir.replace('_', ' ').title()
            
            # Collect PDF folders for this company that have the L-form
            pdf_list = []
            for pdf_folder_inner in os.listdir(company_path):
                pdf_folder_path_inner = os.path.join(company_path, pdf_folder_inner)
                if not os.path.isdir(pdf_folder_path_inner):
                    continue
                
                metadata_path_inner = os.path.join(pdf_folder_path_inner, "metadata.json")
                if not os.path.exists(metadata_path_inner):
                    for nested_folder in os.listdir(pdf_folder_path_inner):
                        nested_path = os.path.join(pdf_folder_path_inner, nested_folder)
                        if os.path.isdir(nested_path):
                            nested_metadata = os.path.join(nested_path, "metadata.json")
                            if os.path.exists(nested_metadata):
                                metadata_path_inner = nested_metadata
                                break
                
                if not os.path.exists(metadata_path_inner):
                    continue
                
                try:
                    with open(metadata_path_inner, 'r', encoding='utf-8') as f:
                        metadata = json.load(f)
                    
                    split_files = metadata.get('split_files', [])
                    splits_for_this_pdf = []
                    
                    for split_file in split_files:
                        form_name = split_file.get('form_name', '')
                        form_code = split_file.get('form_code', '')
                        original_form_no = split_file.get('original_form_no', '')
                        
                        if (_matches_lform(form_name, lform_number) or 
                            _matches_lform(form_code, lform_number) or 
                            _matches_lform(original_form_no, lform_number)):
                            splits_for_this_pdf.append({
                                'name': split_file.get('form_name', ''),
                                'code': split_file.get('form_code', ''),
                                'pages': f"{split_file.get('start_page', '')}-{split_file.get('end_page', '')}"
                            })
                    
                    if splits_for_this_pdf:
                        pdf_list.append({
                            'name': pdf_folder_inner,
                            'splits': splits_for_this_pdf
                        })
                except:
                    continue
            
            # Avoid duplicates
            if company_id not in companies_found:
                companies_found.add(company_id)
                companies.append({
                    "id": company_id,
                    "name": company_name,
                    "pdfs": pdf_list
                })
                print(f"✅ Added company: {company_name} with {len(pdf_list)} PDF(s)")
    
    return companies


def _search_extractions(base_dir: str, lform_number: str, companies_found: set) -> list:
    """Search for companies with L-form in extractions directory"""
    companies = []
    
    print(f"📂 Searching in extractions directory for: {lform_number}")
    
    # Look through all company directories
    for company_dir in os.listdir(base_dir):
        company_path = os.path.join(base_dir, company_dir)
        
        # Skip if not a directory
        if not os.path.isdir(company_path):
            continue
        
        has_lform = False
        
        # Look through all PDF folders for this company
        for pdf_folder in os.listdir(company_path):
            pdf_folder_path = os.path.join(company_path, pdf_folder)
            
            # Skip if not a directory
            if not os.path.isdir(pdf_folder_path):
                continue
            
            # Look for any extracted JSON files
            try:
                for filename in os.listdir(pdf_folder_path):
                    if filename.endswith('_extracted.json') or filename.endswith('_metadata.json'):
                        # Check if the L-form number is in the filename
                        # Use underscore version for matching since filenames use underscores
                        lform_underscore = lform_number.replace('-', '_')
                        filename_upper = filename.upper()
                        
                        # Check both dashed and underscored versions
                        if lform_underscore in filename_upper or lform_number in filename_upper:
                            has_lform = True
                            print(f"✅ Found {lform_number} in extractions/{company_dir}/{pdf_folder} (file: {filename})")
                            break
                
                if has_lform:
                    break
                    
            except Exception as e:
                print(f"⚠️ Error reading extractions for {company_dir}/{pdf_folder}: {e}")
                continue
        
        # Add company to results if we found the L-form with PDF information
        if has_lform:
            company_id = company_dir.lower().replace(' ', '-')
            company_name = company_dir.replace('_', ' ').title()
            
            # Collect PDF folders for this company that have the L-form
            pdf_list = []
            for pdf_folder_inner in os.listdir(company_path):
                pdf_folder_path_inner = os.path.join(company_path, pdf_folder_inner)
                if not os.path.isdir(pdf_folder_path_inner):
                    continue
                
                try:
                    for filename in os.listdir(pdf_folder_path_inner):
                        if filename.endswith('_extracted.json') or filename.endswith('_metadata.json'):
                            filename_upper = filename.upper()
                            lform_underscore = lform_number.replace('-', '_')
                            if lform_underscore in filename_upper or lform_number in filename_upper:
                                # Add split info
                                splits_for_this_pdf = [{
                                    'name': filename.replace('_extracted.json', '').replace('_metadata.json', '').replace('_', ' '),
                                    'code': lform_number,
                                    'pages': 'N/A'
                                }]
                                pdf_list.append({
                                    'name': pdf_folder_inner,
                                    'splits': splits_for_this_pdf
                                })
                                break
                except:
                    continue
            
            # Avoid duplicates but update if this company isn't in the list yet
            if company_id not in companies_found:
                companies_found.add(company_id)
                companies.append({
                    "id": company_id,
                    "name": company_name,
                    "pdfs": pdf_list
                })
                print(f"✅ Added company from extractions: {company_name} with {len(pdf_list)} PDF(s)")
    
    return companies


@router.get("/peers/companies-by-lform")
async def get_companies_by_lform(lform: str):
    """
    Get list of companies that have templates for a specific L-Form.
    
    Args:
        lform: The L-Form label (e.g., "L-4 Premium")
    
    Returns:
        List of companies with this L-Form
    """
    try:
        companies = find_companies_with_lform(lform)
        
        return {
            "success": True,
            "lform": lform,
            "companies": companies,
            "count": len(companies)
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error finding companies with L-Form {lform}: {str(e)}"
        )


@router.post("/peers/comparison")
async def get_peer_comparison(
    lform: str,
    companies: list[str]
):
    """
    Get peer comparison data for selected companies and L-Form.
    
    Args:
        lform: The L-Form to compare
        companies: List of company names to compare
    
    Returns:
        Comparison data with extracted values
    """
    try:
        # This is a placeholder - implement the actual data extraction logic
        # based on your master_template.py extraction service
        
        return {
            "success": True,
            "lform": lform,
            "companies": [
                {
                    "name": company,
                    "premiumValue": 0,  # Replace with actual extraction
                    "sumAssured": 0,
                    "policies": 0
                }
                for company in companies
            ],
            "summary": {
                "totalPremium": 0,
                "totalSumAssured": 0,
                "totalPolicies": 0
            }
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating peer comparison: {str(e)}"
        )

