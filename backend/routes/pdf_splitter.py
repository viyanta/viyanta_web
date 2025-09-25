from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from fastapi.responses import FileResponse
from typing import List, Dict
import os
import json
import re
import sys
import uuid
import subprocess
import traceback
from pathlib import Path
from datetime import datetime
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

        # Determine template based on form code - IMPROVED DYNAMIC DETECTION
        # FORCE FILENAME EXTRACTION: Always extract from filename to avoid incorrect stored metadata
        # The stored form_code in metadata is often wrong (e.g., L-1 instead of L-1-A)
        # form_code = split_info.get("form_code", "").upper()
        form_code = ""  # Force filename extraction

        # Extract form code from filename (this is more reliable than stored metadata)
        if not form_code:
            # FIXED: Improved form code extraction prioritizing L-X-Y pattern over L-X-Y-Z
            # Order matters - but we prioritize L-X-Y pattern to avoid L-X-Y-Z extraction for RA cases
            patterns = [
                # L-1-A, L-2-A (captures L-X-Y, ignores -RA suffixes)
                r'(L-\d+-[A-Z]+)(?:-[A-Z]+)*',
                # L-6A, L-9A, L-14A (letter suffix without hyphen)
                r'(L-\d+[A-Z]+)',
                # L-10, L-11, L-28 (just numbers) - LAST
                r'(L-\d+)',
            ]

            print(
                f"🔍 DEBUG: Testing patterns for filename: {split_filename.upper()}")
            for i, pattern in enumerate(patterns):
                filename_match = re.search(pattern, split_filename.upper())
                print(f"🔍 Pattern {i+1}: {pattern}")
                if filename_match:
                    form_code = filename_match.group(1)
                    print(f"  ✅ MATCH: {form_code}")
                    # Normalize underscores to hyphens for consistency
                    form_code = form_code.replace('_', '-')
                    break
                else:
                    print(f"  ❌ No match")
            print(f"🔍 Final form_code: {form_code}")

        print(
            f"🎯 Form code detected: '{form_code}' from filename: '{split_filename}'")
        print(
            f"🔍 Original split info form_code: '{split_info.get('form_code', 'NOT_FOUND')}'")

        # ENHANCED DYNAMIC TEMPLATE SELECTION LOGIC (fully dynamic, no hardcoded company fallbacks)
        templates_root = Path("templates")

        def resolve_company_template_dir(raw_company: str) -> Path:
            """Resolve company dir by tolerant matching (no hardcoded specific fallback)."""
            lower_name = raw_company.lower().strip()
            # try exact
            direct = templates_root / lower_name
            if direct.exists():
                return direct
            # normalize and fuzzy match
            target_norm = re.sub(r"[^a-z0-9]", "", lower_name)
            candidates = []
            for d in templates_root.iterdir():
                if d.is_dir():
                    d_norm = re.sub(r"[^a-z0-9]", "", d.name.lower())
                    if target_norm == d_norm or target_norm.startswith(d_norm) or d_norm.startswith(target_norm):
                        candidates.append(d)
            if candidates:
                return sorted(candidates, key=lambda p: len(p.name))[0]
            return direct  # non-existing path

        def build_template_index() -> Dict[str, List[Dict[str, str]]]:
            """Scan ALL company template folders and build index by base form code.
            Returns: {
                'L-6A': [ { 'company': 'hdfc', 'file': 'L-6A SHAREHOLDERS EXPENSES SCHEDULE.json', 'path': '/abs/path' }, ... ] }
            """
            idx: Dict[str, List[Dict[str, str]]] = {}
            if not templates_root.exists():
                return idx
            for company_dir in templates_root.iterdir():
                if not company_dir.is_dir():
                    continue
                for tf in company_dir.glob("*.json"):
                    stem = tf.stem.upper().replace('_', '-')
                    # Enhanced regex to capture L-6A, L-6, L-1-A etc. correctly
                    # Priority: L-6A over L-6, L-1-A over L-1
                    patterns = [
                        # L-6A, L-9A, L-14A (letters after numbers)
                        r'(L-\d+[A-Z]+)',
                        r'(L-\d+-[A-Z]+)',  # L-1-A, L-2-A (dash then letters)
                        r'(L-\d+)',  # L-6, L-7, L-28 (just numbers)
                        r'(L-\d+" "+[A-Z]+)',  # L-1 A (space then letters)
                        # L-1 AA (space then letters)
                        r'(L-\d+" "+[A-Z][A-Z]+)',
                    ]

                    base = None
                    for pattern in patterns:
                        m = re.search(pattern, stem)
                        if m:
                            base = m.group(1)
                            break

                    if not base:
                        continue

                    # Don't trim for exact matching - keep full form code
                    entry = {"company": company_dir.name,
                             "file": tf.name, "path": str(tf)}
                    idx.setdefault(base, []).append(entry)
                    print(
                        f"Template indexed: {base} -> {tf.name} ({company_dir.name})")
            return idx

        def find_best_template(form_code: str, preferred_company: str, index_map: Dict[str, List[Dict[str, str]]]
                               ):
            if not form_code:
                return None
            form_code_u = form_code.upper().replace('_', '-')

            # Build candidates with priority: exact -> progressive shortening
            candidates_order = []

            # First try exact form code
            candidates_order.append(form_code_u)

            # Then try progressive shortening but be smarter about L-6A vs L-6
            tokens = form_code_u.split('-')

            # For forms like L-6A-SHAREHOLDERS, try L-6A before L-6
            if len(tokens) >= 2 and re.match(r'L-\d+[A-Z]', '-'.join(tokens[:2])):
                # This is like L-6A-SHAREHOLDERS -> try L-6A
                base_with_letter = '-'.join(tokens[:2])  # L-6A
                if base_with_letter not in candidates_order:
                    candidates_order.append(base_with_letter)

            # Then try just the number part L-6
            if len(tokens) >= 2:
                base_number = '-'.join(tokens[:2])  # L-6 from L-6A
                if re.match(r'L-\d+[A-Z]', base_number):
                    # Extract just the number part: L-6A -> L-6
                    # Remove trailing letters
                    number_part = re.sub(r'([A-Z]+)$', '', base_number)
                    if number_part and number_part not in candidates_order:
                        candidates_order.append(number_part)
                elif base_number not in candidates_order:
                    candidates_order.append(base_number)

            # Continue with other progressive shortening
            remaining_tokens = tokens[:]
            while len(remaining_tokens) >= 2:
                remaining_tokens = remaining_tokens[:-1]  # Remove last token
                cand = '-'.join(remaining_tokens)
                if cand not in candidates_order:
                    candidates_order.append(cand)

            # ENHANCED: Try expanded form patterns for common abbreviations
            # This helps match L-5-C with L-5-COMMISSION, L-6-OP with L-6-OPERATING, etc.
            if len(tokens) >= 3:  # Forms like L-5-C, L-6-OP
                base_part = '-'.join(tokens[:2])  # L-5
                abbrev = tokens[2]  # C, OP, etc.

                # Try common expansions
                common_expansions = {
                    'C': ['COMMISSION', 'CLAIMS', 'CURRENT', 'CASH'],
                    'OP': ['OPERATING', 'OPERATIONS'],
                    'EX': ['EXPENSES', 'EXPENDITURE'],
                    'INV': ['INVESTMENT', 'INVESTMENTS'],
                    'SH': ['SHAREHOLDERS', 'SHARE'],
                    'POL': ['POLICYHOLDERS', 'POLICY'],
                    'BEN': ['BENEFITS', 'BENEFICIARY'],
                    'RES': ['RESERVES', 'REVENUE'],
                    'SUP': ['SURPLUS', 'SUPPLEMENTARY'],
                    'LIA': ['LIABILITIES', 'LIABILITY'],
                    'ASS': ['ASSETS', 'ASSESSMENT']
                }

                if abbrev in common_expansions:
                    for expansion in common_expansions[abbrev]:
                        expanded_form = f"{base_part}-{expansion}"
                        if expanded_form not in candidates_order:
                            candidates_order.append(expanded_form)

            print(
                f"Template search candidates for '{form_code}': {candidates_order}")
            preferred_company_l = preferred_company.lower()

            # STRICT COMPANY MATCHING: Only look for templates in the preferred company
            for cand in candidates_order:
                if cand in index_map:
                    for e in index_map[cand]:
                        if e['company'].lower() == preferred_company_l:
                            print(
                                f"EXACT MATCH in preferred company {preferred_company}: {cand} -> {e['file']}")
                            return e

            # NO FALLBACK TO OTHER COMPANIES - force company-specific templates only
            print(
                f"ERROR: No template match found for '{form_code}' in {preferred_company} templates")
            return None

        company_templates_dir = resolve_company_template_dir(company_name)
        template_index = build_template_index()
        template_entry = None

        print(f"Available templates for {company_name} in index:")
        for form_code_key, entries in template_index.items():
            company_entries = [e for e in entries if e['company'].lower(
            ) == company_templates_dir.name.lower()]
            if company_entries:
                print(
                    f"  {form_code_key}: {[e['file'] for e in company_entries]}")

        if form_code:
            template_entry = find_best_template(
                form_code, company_templates_dir.name, template_index)

        if not template_entry:
            # If no template found, list what's available for debugging
            available_forms = []
            print(
                f"No template found for '{form_code}'. Available in {company_templates_dir.name}:")
            for form_code_key, entries in template_index.items():
                company_entries = [e for e in entries if e['company'].lower(
                ) == company_templates_dir.name.lower()]
                if company_entries:
                    available_forms.append(form_code_key)
                    print(f"  {form_code_key}: {company_entries[0]['file']}")

            error_message = f"No template found for form_code '{form_code}' in {company_name} templates."
            if available_forms:
                error_message += f" Available form codes for {company_name}: {', '.join(available_forms)}"
            else:
                error_message += f" No templates found for {company_name}."

            raise HTTPException(status_code=404, detail=error_message)

        template_path = Path(template_entry['path'])
        template_name = template_entry['file']

        # === ENHANCED FILE PATHS DEBUGGING ===
        print(f"\n🔍 === FILE PATHS SELECTION DEBUG ===")
        print(f"📂 Company Name Input: '{company_name}'")
        print(f"📄 PDF Name Input: '{pdf_name}'")
        print(f"📋 Split Filename Input: '{split_filename}'")
        print(f"🎯 Form Code Detected: '{form_code}'")
        print(f"📁 Templates Root Directory: {templates_root}")
        print(f"📁 Company Templates Directory: {company_templates_dir}")
        print(
            f"📁 Company Templates Dir Exists: {company_templates_dir.exists()}")
        print(f"📄 Split PDF Path: {split_path}")
        print(f"📄 Split PDF Exists: {Path(split_path).exists()}")
        print(
            f"📄 Split PDF Size: {Path(split_path).stat().st_size if Path(split_path).exists() else 'N/A'} bytes")
        print(f"📋 Template Selected: {template_name}")
        print(f"🎯 Full Template Path: {template_path}")
        print(f"📊 Template Exists: {template_path.exists()}")
        print(
            f"📊 Template Size: {template_path.stat().st_size if template_path.exists() else 'N/A'} bytes")

        # Create output directories first
        extractions_dir = Path("extractions") / \
            company_name.lower().replace(" ", "_") / pdf_name
        extractions_dir.mkdir(parents=True, exist_ok=True)

        gemini_dir = Path("gemini_verified_json") / \
            company_name.lower().replace(" ", "_") / pdf_name
        gemini_dir.mkdir(parents=True, exist_ok=True)

        extracted_json = extractions_dir / \
            f"{Path(split_filename).stem}_extracted.json"
        corrected_json = gemini_dir / \
            f"{Path(split_filename).stem}_corrected.json"

        # Output directories debugging
        print(f"📂 Extractions Output Dir: {extractions_dir}")
        print(f"📂 Extractions Dir Exists: {extractions_dir.exists()}")
        print(f"🤖 Gemini Output Dir: {gemini_dir}")
        print(f"🤖 Gemini Dir Exists: {gemini_dir.exists()}")
        print(f"📄 Extracted JSON Path: {extracted_json}")
        print(f"🤖 Corrected JSON Path: {corrected_json}")

        # Show relative paths for clarity
        try:
            cwd = Path.cwd()
            print(f"📁 Current Working Directory: {cwd}")
            print(
                f"📋 Template Relative Path: {template_path.relative_to(cwd)}")
            print(
                f"📄 Split PDF Relative Path: {Path(split_path).relative_to(cwd)}")
            print(
                f"📄 Extracted JSON Relative Path: {extracted_json.relative_to(cwd)}")
            print(
                f"🤖 Corrected JSON Relative Path: {corrected_json.relative_to(cwd)}")
        except Exception as e:
            print(f"⚠️ Could not compute relative paths: {e}")

        print(f"=== END FILE PATHS DEBUG ===\n")

        print(
            f"Selected template: {template_name} (company={template_entry['company']}) for form_code={form_code}")

        if not template_path.exists():
            raise HTTPException(
                status_code=404, detail=f"Resolved template path not found: {template_path}")

        print(f"Final template being used: {template_name}")

        # Validate critical paths before proceeding
        if not template_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Template file not found: {template_path}"
            )

        if not Path(split_path).exists():
            raise HTTPException(
                status_code=404,
                detail=f"Split PDF file not found: {split_path}"
            )

        print(f"✅ All critical files exist and are accessible")

        # Step 1: Run PDF extraction
        extraction_cmd = [
            sys.executable,
            "services/pdf_splitted_extraction.py",
            "--template", str(template_path),
            "--pdf", split_path,
            "--output", str(extracted_json)
        ]

        print(f"\n🔧 === EXTRACTION COMMAND DEBUG ===")
        print(f"Command: {' '.join(extraction_cmd)}")
        print(f"Working Directory: {Path.cwd()}")
        print(f"Python Executable: {sys.executable}")
        print(
            f"Extraction Script Exists: {Path('services/pdf_splitted_extraction.py').exists()}")
        print(f"Template Arg: --template {template_path}")
        print(f"PDF Arg: --pdf {split_path}")
        print(f"Output Arg: --output {extracted_json}")
        print(f"📁 Template path exists: {template_path.exists()}")
        print(f"📄 Split path exists: {Path(split_path).exists()}")
        print(f"📂 Extractions dir exists: {extractions_dir.exists()}")
        print(f"📂 Gemini dir exists: {gemini_dir.exists()}")
        print(f"=== END COMMAND DEBUG ===\n")

        # Add extraction timeout and better error handling
        extraction_result = subprocess.run(
            # 2 min timeout for basic extraction
            extraction_cmd, capture_output=True, text=True, timeout=120)

        print(f"💯 Extraction return code: {extraction_result.returncode}")
        print(f"📤 Extraction stdout: {extraction_result.stdout}")
        if extraction_result.stderr:
            print(f"❌ Extraction stderr: {extraction_result.stderr}")

        if extraction_result.returncode != 0:
            error_msg = extraction_result.stderr or "Unknown extraction error"
            print(
                f"❌ Extraction failed with code {extraction_result.returncode}")
            raise HTTPException(
                status_code=500,
                detail=f"Extraction failed: {error_msg}"
            )

        # Check if extracted JSON is empty or has minimal data
        extracted_is_empty = False
        extracted_row_count = 0

        if extracted_json.exists():
            try:
                with open(extracted_json, "r", encoding="utf-8") as ef:
                    extracted_data = json.load(ef)
                    if isinstance(extracted_data, list):
                        extracted_row_count = sum(
                            len(page.get("Rows", [])) for page in extracted_data)
                    else:
                        extracted_row_count = len(
                            extracted_data.get("Rows", []))

                    if extracted_row_count < 5:  # Consider less than 5 rows as "empty"
                        extracted_is_empty = True
                        print(
                            f"⚠️ Extracted JSON has minimal data ({extracted_row_count} rows) - will force Gemini correction")
                    else:
                        print(
                            f"✅ Extracted JSON has {extracted_row_count} rows")
            except Exception as e:
                extracted_is_empty = True
                print(
                    f"⚠️ Error reading extracted JSON: {e} - will force Gemini correction")
        else:
            extracted_is_empty = True
            print(f"⚠️ Extracted JSON not found - will force Gemini correction")

        # Step 2: Smart Gemini correction with quick mode option
        import os  # ensure os available for env config

        # PERFORMANCE OPTIMIZATION: Quick mode for small, well-extracted datasets
        enable_quick_mode = os.getenv("GEMINI_QUICK_MODE", "0") == "1"
        quick_mode_threshold = int(
            os.getenv("GEMINI_QUICK_MODE_THRESHOLD", "20"))

        # Skip Gemini for small, well-extracted datasets in quick mode
        skip_gemini = (enable_quick_mode and
                       not extracted_is_empty and
                       extracted_row_count > 0 and
                       extracted_row_count <= quick_mode_threshold)

        if skip_gemini:
            print(
                f"⚡ QUICK MODE: Skipping Gemini correction for small dataset ({extracted_row_count} rows)")
            gemini_corrected = False
            final_json_path = extracted_json
            correction_notes = {
                "quick_mode_used": True,
                "rows_processed": extracted_row_count,
                "reason": "skipped_for_speed"
            }
        else:
            print(
                f"🤖 Starting Gemini correction (empty extraction: {extracted_is_empty}, rows: {extracted_row_count})")

            # OPTIMIZED: Faster timeouts for quicker processing
            # Shorter timeouts since we're using smaller batches and multithreading
            primary_timeout_env = os.getenv(
                "GEMINI_CORRECTION_TIMEOUT_PRIMARY", "90")   # Reduced from 180s
            retry_timeout_env = os.getenv(
                "GEMINI_CORRECTION_TIMEOUT_RETRY", "60")  # Reduced from 120s
            no_timeout_mode = os.getenv(
                "GEMINI_CORRECTION_NO_TIMEOUT", "0") == "1"
            primary_timeout = None if no_timeout_mode else int(
                primary_timeout_env)
            retry_timeout = None if no_timeout_mode else int(retry_timeout_env)
            enable_retry = os.getenv("GEMINI_CORRECTION_RETRY", "1") != "0"
            enable_second_retry = os.getenv(
                "GEMINI_CORRECTION_SECOND_RETRY", "1") != "0"

            # OPTIMIZED: Faster batch sizes and better multithreading defaults
            dynamic_rows = extracted_row_count if not extracted_is_empty else 0

            # Smaller batches for faster parallel processing
            if dynamic_rows > 200:
                initial_batch = 8  # Reduced from 18 for better parallelization
            elif dynamic_rows > 100:
                initial_batch = 6  # Reduced from 12
            elif dynamic_rows > 50:
                initial_batch = 4  # Reduced from 6
            else:
                initial_batch = 3  # Reduced from 6 for faster small datasets

            # Allow override via env (with better defaults)
            initial_batch = int(
                os.getenv("GEMINI_CORRECTION_INITIAL_BATCH", str(initial_batch)))
            second_batch = int(
                # Faster retry
                os.getenv("GEMINI_CORRECTION_SECOND_BATCH", "2"))
            # Fastest final retry
            third_batch = int(os.getenv("GEMINI_CORRECTION_THIRD_BATCH", "1"))

            # Force enable multithreading and optimize worker count
            max_workers = min(8, max(2, dynamic_rows // 10)
                              )  # Auto-scale workers
            max_workers = int(os.getenv("GEMINI_WORKERS", str(max_workers)))

            print(f"🚀 PERFORMANCE OPTIMIZATION:")
            print(f"   Rows to process: {dynamic_rows}")
            print(f"   Initial batch size: {initial_batch}")
            print(f"   Max workers: {max_workers}")
            print(f"   Multithreading: ENABLED")

            def run_gemini(batch_size: int, timeout_seconds):
                cmd = [
                    sys.executable,
                    "services/pdf_splitted_gemini_very.py",
                    "--template", str(template_path),
                    "--extracted", str(extracted_json),
                    "--pdf", split_path,
                    "--output", str(corrected_json),
                    "--batch-size", str(batch_size),
                    "--workers", str(max_workers),  # Enable multithreading
                    "--max-pages", "3",  # Limit PDF context for speed
                    "--retries", "2"     # Reduce retries for speed
                ]
                print(f"Prompt being sent to Google Gemini : {cmd}")
                # Enhanced Gemini command debugging
                print(f"\n🤖 === GEMINI CORRECTION PATHS DEBUG ===")
                print(f"🔧 Template Path: {template_path}")
                print(f"📄 Extracted JSON: {extracted_json}")
                print(f"📄 Extracted JSON Exists: {extracted_json.exists()}")
                print(f"📄 Split PDF Path: {split_path}")
                print(f"🤖 Corrected JSON Output: {corrected_json}")
                print(f"📊 Batch Size: {batch_size}")
                print(
                    f"🔧 Gemini correction command (batch={batch_size}, timeout={'NONE' if timeout_seconds is None else str(timeout_seconds)+'s'}): {' '.join(cmd)}")
                print(f"=== END GEMINI PATHS DEBUG ===\n")
                try:
                    if timeout_seconds is None:
                        result = subprocess.run(
                            cmd, capture_output=True, text=True)
                    else:
                        result = subprocess.run(
                            cmd, capture_output=True, text=True, timeout=timeout_seconds)
                    return result, None
                except subprocess.TimeoutExpired as te:
                    print(
                        f"⏰ Gemini correction timed out after {timeout_seconds}s (batch={batch_size})")
                    return subprocess.CompletedProcess(cmd, 124, "", f"Timeout after {timeout_seconds}s"), te

            # First attempt (dynamic batch)
            correction_result, primary_timeout_exc = run_gemini(
                batch_size=initial_batch, timeout_seconds=primary_timeout)

            retry_used = False
            second_retry_used = False

            # First retry on failure / timeout
            if (correction_result.returncode != 0) and enable_retry and not corrected_json.exists():
                print(
                    f"♻️ Attempting Gemini correction retry with smaller batch size ({second_batch})")
                correction_result_retry, retry_exc = run_gemini(
                    batch_size=second_batch, timeout_seconds=retry_timeout)
                if correction_result_retry.returncode == 0 and corrected_json.exists():
                    print("✅ Retry succeeded with reduced batch size")
                    correction_result = correction_result_retry
                    retry_used = True
                else:
                    print(
                        f"❌ Retry failed (code={correction_result_retry.returncode}) - will consider second retry")

            # Second retry if still failing and enabled
            if (correction_result.returncode != 0) and enable_second_retry and not corrected_json.exists():
                print(
                    f"🔁 Second retry with ultra small batch size ({third_batch}) and extended timeout")
                extended_timeout = None if no_timeout_mode else int(
                    os.getenv("GEMINI_CORRECTION_THIRD_TIMEOUT", str(retry_timeout or 180)))
                correction_result_retry2, retry2_exc = run_gemini(
                    batch_size=third_batch, timeout_seconds=extended_timeout)
                if correction_result_retry2.returncode == 0 and corrected_json.exists():
                    print("✅ Second retry succeeded with ultra small batch")
                    correction_result = correction_result_retry2
                    second_retry_used = True
                else:
                    print(
                        f"❌ Second retry failed (code={correction_result_retry2.returncode}) - proceeding with extracted data")

            print(
                f"💯 Gemini correction final return code: {correction_result.returncode}")
            if correction_result.stdout:
                print(
                    f"📤 Gemini correction stdout (final): {correction_result.stdout[:2000]}")
            if correction_result.stderr:
                print(
                    f"❌ Gemini correction stderr (final): {correction_result.stderr[:2000]}")

            gemini_corrected = False
            correction_notes = {
                "primary_timeout_sec": primary_timeout if primary_timeout is not None else "none",
                "retry_timeout_sec": retry_timeout if retry_timeout is not None else "none",
                "retry_used": retry_used,
                "second_retry_used": second_retry_used,
                "primary_timed_out": primary_timeout_exc is not None,
                "attempt_return_code": correction_result.returncode,
                "initial_batch": initial_batch,
                "second_batch": second_batch,
                "third_batch": third_batch,
                "no_timeout_mode": no_timeout_mode
            }

            final_json_path = extracted_json  # Default fallback

            if correction_result.returncode == 0 and corrected_json.exists():
                try:
                    with open(corrected_json, "r", encoding="utf-8") as cf:
                        corrected_content = cf.read()
                        corrected_data = json.loads(corrected_content)
                    # Robust row counting

                    def count_rows(obj):
                        if isinstance(obj, list):
                            total = 0
                            for item in obj:
                                if isinstance(item, dict):
                                    rows = item.get("Rows")
                                    if isinstance(rows, list):
                                        total += len(rows)
                                elif isinstance(item, list):
                                    total += len(item)
                            return total
                        if isinstance(obj, dict):
                            rows = obj.get("Rows")
                            if isinstance(rows, list):
                                return len(rows)
                        return 0
                    corrected_row_count = count_rows(corrected_data)
                    extracted_row_count_baseline = 0
                    try:
                        if extracted_json.exists():
                            with open(extracted_json, "r", encoding="utf-8") as ef:
                                baseline = json.load(ef)
                            extracted_row_count_baseline = count_rows(baseline)
                    except Exception:
                        pass
                    if corrected_row_count > 0:
                        gemini_corrected = True
                        final_json_path = corrected_json
                        print(
                            f"✅ Gemini correction successful: {corrected_row_count} rows (baseline {extracted_row_count_baseline})")
                        if corrected_row_count <= extracted_row_count_baseline:
                            print(
                                "ℹ️ Corrected row count not higher than baseline – may still include qualitative normalization / header fixes")
                    else:
                        print(
                            "⚠️ Corrected JSON empty after parse – discarding and using extracted data")
                except Exception as e:
                    print(
                        f"⚠️ Error validating corrected JSON: {e} – using extracted data")
            else:
                print("⚠️ Gemini correction not successful – using extracted data")

            # Enhanced / enriched corrected variant preference
            enhanced_corrected_json = Path(str(corrected_json).replace(
                "_corrected.json", "_corrected_enhanced.json"))
            if enhanced_corrected_json.exists():
                try:
                    with open(enhanced_corrected_json, "r", encoding="utf-8") as enf:
                        _ = json.load(enf)  # sanity parse
                    final_json_path = enhanced_corrected_json
                    gemini_corrected = True
                    correction_notes["used_enhanced"] = True
                    print(
                        f"🎯 Using Enhanced Gemini-corrected JSON: {final_json_path}")
                except Exception as ee:
                    print(f"⚠️ Failed to parse enhanced corrected JSON: {ee}")
            else:
                correction_notes["used_enhanced"] = False

            if not gemini_corrected:
                correction_notes["reason"] = "correction_failed_or_empty"
            else:
                correction_notes["reason"] = "success"

        # Load the final JSON
        with open(final_json_path, "r", encoding="utf-8") as f:
            final_data = json.load(f)

        # Perform final validation check
        try:
            validation_file = gemini_dir / \
                f"{Path(split_filename).stem}_validation.json"
            if validation_file.exists():
                with open(validation_file, "r", encoding="utf-8") as vf:
                    validation_report = json.load(vf)
                    if not validation_report.get("is_valid", True):
                        print(
                            f"⚠️ Validation issues detected: {validation_report.get('issues', [])}")
                    else:
                        print(
                            f"✅ Data validation passed with {validation_report['stats']['total_rows']} rows")
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
            "split_pdf_path": split_path,  # Add the actual split PDF path used
            "form_code": form_code,
            "template_used": str(template_path),
            "extracted_at": datetime.now().isoformat(),
            "extraction_status": "completed",
            # Use the actual flag from correction process
            "gemini_corrected": gemini_corrected,
            # Use the actual final file path
            "output_path": str(final_json_path),
            "correction_meta": correction_notes
        }

        # Save metadata
        metadata_path = extractions_dir / \
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
        error_msg = str(e)
        print(f"Form extraction error: {error_msg}")
        import traceback
        traceback_str = traceback.format_exc()
        print(f"Full traceback: {traceback_str}")

        # Enhanced error reporting
        if not error_msg:
            error_msg = "Unknown extraction error occurred"

        # Include more context in the error
        context_info = f"Company: {company_name}, PDF: {pdf_name}, Split: {split_filename}"
        detailed_error = f"{error_msg} | Context: {context_info}"

        raise HTTPException(status_code=500, detail=detailed_error)


@router.get("/companies/{company_name}/pdfs/{pdf_name}/splits/{split_filename}/extraction")
async def get_extracted_data(company_name: str, pdf_name: str, split_filename: str):
    """
    Get previously extracted data for a split - checks both extractions and gemini_verified_json directories
    """
    try:
        # Helper function to find company directory with flexible naming
        def find_company_dir(base_path: Path, company_name: str):
            # Create both underscore and spaced versions
            company_slug = company_name.lower().replace(" ", "_")
            company_spaced = company_name.lower().replace("_", " ")

            # Try underscore version first
            underscore_path = base_path / company_slug
            if underscore_path.exists():
                return underscore_path

            # Try spaced version
            spaced_path = base_path / company_spaced
            if spaced_path.exists():
                return spaced_path

            # Try original input as-is
            original_path = base_path / company_name.lower()
            if original_path.exists():
                return original_path

            # If none exist, return the underscore version for consistency
            return underscore_path

        # Find company directories with flexible naming
        gemini_company_dir = find_company_dir(
            Path("gemini_verified_json"), company_name)
        extractions_company_dir = find_company_dir(
            Path("extractions"), company_name)

        # Check Gemini-verified directory first (highest priority)
        gemini_dir = gemini_company_dir / pdf_name
        gemini_corrected_json = gemini_dir / \
            f"{Path(split_filename).stem}_corrected.json"
        gemini_metadata_path = gemini_dir / \
            f"{Path(split_filename).stem}_metadata.json"

        # Check original extractions directory
        extractions_dir = extractions_company_dir / pdf_name
        corrected_json = extractions_dir / \
            f"{Path(split_filename).stem}_corrected.json"
        extracted_json = extractions_dir / \
            f"{Path(split_filename).stem}_extracted.json"
        metadata_path = extractions_dir / \
            f"{Path(split_filename).stem}_metadata.json"

        # Priority order: Gemini-verified > corrected > extracted
        json_path = None
        metadata_source = None
        source_type = None

        if gemini_corrected_json.exists():
            json_path = gemini_corrected_json
            metadata_source = gemini_metadata_path if gemini_metadata_path.exists() else metadata_path
            source_type = "gemini_verified"
            print(f"📋 Using Gemini-verified JSON: {json_path}")
        elif corrected_json.exists():
            json_path = corrected_json
            metadata_source = metadata_path
            source_type = "corrected"
            print(f"📋 Using corrected JSON: {json_path}")
        elif extracted_json.exists():
            json_path = extracted_json
            metadata_source = metadata_path
            source_type = "extracted"
            print(f"📋 Using extracted JSON: {json_path}")

        if not json_path:
            return {"success": False, "message": "No extraction data found"}

        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        metadata = {}
        if metadata_source and metadata_source.exists():
            with open(metadata_source, "r", encoding="utf-8") as f:
                metadata = json.load(f)

        # CRITICAL FIX: Force gemini_corrected = True when source is gemini_verified
        if source_type == "gemini_verified":
            metadata["gemini_corrected"] = True
            print(f"🤖 Forced gemini_corrected=True for gemini_verified source")
        elif source_type == "corrected":
            # Also treat corrected JSONs as gemini corrected
            metadata["gemini_corrected"] = True
            print(f"🤖 Forced gemini_corrected=True for corrected source")

        # HEADER CONSISTENCY FIX: Ensure FlatHeaders match actual row keys
        if isinstance(data, list) and len(data) > 0:
            for record_idx, record in enumerate(data):
                if isinstance(record, dict) and "Rows" in record and len(record["Rows"]) > 0:
                    # Get actual keys from first row
                    first_row = record["Rows"][0]
                    if isinstance(first_row, dict):
                        actual_keys = list(first_row.keys())

                        # Update FlatHeaders to match actual data
                        record["FlatHeaders"] = actual_keys
                        record["FlatHeadersNormalized"] = actual_keys

                        print(
                            f"📊 Fixed headers for record {record_idx}: {actual_keys}")

        return {
            "success": True,
            "data": data,
            "metadata": metadata,
            "source": source_type,
            "file_path": str(json_path)
        }

    except Exception as e:
        print(f"Get extraction error: {e}")
        return {"success": False, "error": str(e)}


@router.get("/debug-gemini-config")
async def debug_gemini_config():
    """
    Debug endpoint to show current Gemini performance configuration
    """
    import os

    config = {
        "quick_mode": {
            "enabled": os.getenv("GEMINI_QUICK_MODE", "0") == "1",
            "threshold": int(os.getenv("GEMINI_QUICK_MODE_THRESHOLD", "20"))
        },
        "multithreading": {
            "enabled": True,  # Always enabled now
            "workers": int(os.getenv("GEMINI_WORKERS", "4"))
        },
        "timeouts": {
            "primary": int(os.getenv("GEMINI_CORRECTION_TIMEOUT_PRIMARY", "90")),
            "retry": int(os.getenv("GEMINI_CORRECTION_TIMEOUT_RETRY", "60")),
            "third": int(os.getenv("GEMINI_CORRECTION_THIRD_TIMEOUT", "45")),
            "no_timeout_mode": os.getenv("GEMINI_CORRECTION_NO_TIMEOUT", "0") == "1"
        },
        "batch_sizes": {
            "initial": int(os.getenv("GEMINI_CORRECTION_INITIAL_BATCH", "4")),
            "second": int(os.getenv("GEMINI_CORRECTION_SECOND_BATCH", "2")),
            "third": int(os.getenv("GEMINI_CORRECTION_THIRD_BATCH", "1"))
        },
        "retry_settings": {
            "enable_retry": os.getenv("GEMINI_CORRECTION_RETRY", "1") != "0",
            "enable_second_retry": os.getenv("GEMINI_CORRECTION_SECOND_RETRY", "1") != "0"
        },
        "pdf_optimization": {
            "max_pages": "3",  # Fixed for performance
            "retries": "2"     # Fixed for performance
        }
    }

    return {
        "success": True,
        "message": "Current Gemini performance configuration",
        "config": config,
        "recommendations": {
            "for_speed": "Enable GEMINI_QUICK_MODE=1 for small datasets",
            "for_accuracy": "Disable quick mode and increase batch sizes",
            "for_production": "Use 6-8 workers and quick mode enabled"
        }
    }


@router.post("/test-extraction-performance")
async def test_extraction_performance(
    company_name: str = "SBI Life",
    form_code: str = "L-4-PREMIUM",
    simulate_rows: int = 15
):
    """
    Test endpoint to simulate extraction performance and demonstrate quick mode
    """
    import os
    import time

    start_time = time.time()

    # Simulate the same logic as the real extraction
    enable_quick_mode = os.getenv("GEMINI_QUICK_MODE", "0") == "1"
    quick_mode_threshold = int(os.getenv("GEMINI_QUICK_MODE_THRESHOLD", "20"))

    extracted_is_empty = simulate_rows == 0
    extracted_row_count = simulate_rows

    skip_gemini = (enable_quick_mode and
                   not extracted_is_empty and
                   extracted_row_count > 0 and
                   extracted_row_count <= quick_mode_threshold)

    performance_config = {
        "dynamic_rows": extracted_row_count,
        "initial_batch": 4 if extracted_row_count > 50 else 3,
        "max_workers": min(8, max(2, extracted_row_count // 10)),
        "quick_mode_enabled": enable_quick_mode,
        "quick_mode_threshold": quick_mode_threshold,
        "would_skip_gemini": skip_gemini
    }

    # Simulate processing time
    if skip_gemini:
        simulated_time = 2.0  # Very fast without Gemini
        processing_path = "extraction_only"
    else:
        # Simulate Gemini processing time based on batch size and workers
        # 5 seconds per batch item
        batch_processing_time = performance_config["initial_batch"] * 5
        # More workers = faster
        worker_multiplier = 1.0 / performance_config["max_workers"]
        simulated_time = batch_processing_time * worker_multiplier
        processing_path = "extraction_plus_gemini"

    # Simulate some processing time (scaled down)
    time.sleep(min(simulated_time / 10, 1.0))

    end_time = time.time()
    actual_time = end_time - start_time

    return {
        "success": True,
        "test_scenario": {
            "company": company_name,
            "form_code": form_code,
            "simulated_rows": simulate_rows
        },
        "performance_analysis": {
            "processing_path": processing_path,
            "would_skip_gemini": skip_gemini,
            "estimated_time_seconds": round(simulated_time, 2),
            "actual_test_time": round(actual_time, 3),
            "time_savings": round(max(0, 30 - simulated_time), 2) if skip_gemini else 0
        },
        "configuration": performance_config,
        "recommendations": [
            "Enable GEMINI_QUICK_MODE=1 for datasets under 20 rows",
            "Use 6+ workers for large datasets",
            "Consider batch size 3-4 for optimal parallelization"
        ]
    }
