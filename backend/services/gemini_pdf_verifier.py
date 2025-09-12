"""
Enhanced Gemini AI Verification Service for PDF and JSON Comparison
Compares PDF content with extracted JSON and provides verified corrections
"""

import os
import json
import base64
import logging
import requests
from typing import Dict, List, Any, Optional, Tuple
import fitz  # PyMuPDF for PDF reading
from pathlib import Path
import asyncio
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Base directories for saving outputs and loading templates
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATES_DIR = os.path.join(BACKEND_DIR, "templates")
VERIFIED_DIR = os.path.join(BACKEND_DIR, "gemini_verified_json")
os.makedirs(VERIFIED_DIR, exist_ok=True)


class GeminiPDFVerifier:
    """Enhanced Gemini AI-powered verification for PDF vs JSON comparison"""

    def __init__(self):
        """Initialize Gemini verifier with API key and built-in verification prompt"""
        self.api_key = os.getenv('GEMINI_API_KEY')
        # Built-in comprehensive verification prompt
        self.verification_prompt = """
You are an expert data verification assistant. Your task is to compare PDF content with extracted JSON data and provide accurate corrections.

INSTRUCTIONS:
1. Carefully analyze the provided PDF content and the extracted JSON data
2. Identify any discrepancies, missing information, or errors in the JSON extraction
3. Compare tables, text, numbers, dates, and structural elements
4. Fix any mistakes you find in the extracted data
5. Ensure all important information from the PDF is captured in the JSON
6. Return only the corrected JSON data in proper JSON format
7. Maintain the original JSON structure while fixing the content
8. If the extraction is accurate, return the original JSON

FOCUS AREAS:
- Number accuracy (especially financial figures, percentages, dates)
- Table data completeness and correctness
- Text field accuracy
- Missing or incomplete information
- Structural consistency

Return only the corrected JSON data without any explanatory text.
"""
        # Expect GEMINI_API_URL in .env, e.g. https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
        self.api_url = os.getenv('GEMINI_API_URL')

        # Do not raise on missing key or URL; operate in disabled/fallback mode instead
        if not self.api_key or not self.api_url:
            logger.warning(
                "Gemini API key or URL not found. Gemini verification will run in fallback mode (no external API calls). Set GEMINI_API_KEY and GEMINI_API_URL in .env to enable full verification.")
            self.disabled = True
        else:
            self.disabled = False

        logger.info("Gemini PDF Verifier initialized successfully (disabled=%s)", getattr(
            self, 'disabled', False))

    def _extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text content from PDF file"""
        try:
            doc = fitz.open(pdf_path)
            text_content = ""

            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text_content += f"\n--- Page {page_num + 1} ---\n"
                text_content += page.get_text()

            doc.close()
            return text_content
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            return ""

    def _pdf_to_base64(self, pdf_path: str) -> str:
        """Convert PDF file to base64 for Gemini API"""
        try:
            with open(pdf_path, 'rb') as pdf_file:
                pdf_bytes = pdf_file.read()
                return base64.b64encode(pdf_bytes).decode('utf-8')
        except Exception as e:
            logger.error(f"Error converting PDF to base64: {e}")
            return ""

    def _create_verification_prompt(self, pdf_text: str, extracted_json: Dict[str, Any], template_json: Optional[Dict[str, Any]] = None) -> str:
        """Create comprehensive verification prompt that includes the selected template"""
        prompt = f"""
{self.verification_prompt}

You will receive three inputs:
1) The original PDF content (text rendering)
2) The raw extracted JSON data
3) The selection-based L-form template JSON defining the expected structure

Use the template to validate structure and field names. Correct values using the PDF.

ORIGINAL PDF CONTENT:
{pdf_text}

EXTRACTED JSON DATA:
{json.dumps(extracted_json, indent=2)}

TEMPLATE JSON:
{json.dumps(template_json or {}, indent=2)}

VERIFICATION TASKS:
1. Compare the PDF content with the extracted JSON data and the template
2. Identify any missing information in the JSON
3. Fix incorrect data in the JSON (wrong values, misaligned columns, etc.)
4. Ensure table structures and headers match the template where applicable
5. Verify that Period and Currency fields are correctly extracted per table/instance
6. Ensure numerical values and formatting are correct

RESPONSE REQUIREMENTS:
- Return ONLY valid JSON format
- Maintain the same high-level structure as the input extracted JSON (company, form_no, file, instances)
- Include all corrected data
- Add a verification_summary with accuracy score and changes made
"""
        return prompt

    def _make_gemini_request(self, prompt: str) -> Optional[str]:
        """Make request to Gemini API for verification with retries and backoff"""
        if getattr(self, 'disabled', False) or not self.api_key:
            logger.warning(
                "Gemini request skipped: API key missing or verifier disabled")
            return None

        attempts = 3
        for attempt in range(1, attempts + 1):
            try:
                headers = {
                    'Content-Type': 'application/json',
                }

                payload = {
                    "contents": [{
                        "parts": [{
                            "text": prompt
                        }]
                    }],
                    "generationConfig": {
                        "temperature": 0.1,
                        "topK": 1,
                        "topP": 1,
                        "maxOutputTokens": 8192,
                    }
                }

                # Make request to Gemini API
                response = requests.post(
                    f"{self.api_url}?key={self.api_key}",
                    headers=headers,
                    json=payload,
                    timeout=60
                )

                if response.status_code == 200:
                    result = response.json()
                    if 'candidates' in result and len(result['candidates']) > 0:
                        content = result['candidates'][0]['content']['parts'][0]['text']
                        logger.info(
                            "Gemini verification completed successfully")
                        return content
                    else:
                        logger.error("No candidates in Gemini response")
                        return None
                else:
                    logger.error(
                        f"Gemini API error: {response.status_code} - {response.text}")
                    # Retry on server errors
                    if 500 <= response.status_code < 600 and attempt < attempts:
                        wait = 2 ** attempt
                        logger.info(
                            f"Retrying Gemini request in {wait}s (attempt {attempt}/{attempts})")
                        time.sleep(wait)
                        continue
                    return None

            except requests.exceptions.RequestException as e:
                logger.error(
                    f"Error making Gemini request (attempt {attempt}/{attempts}): {e}")
                if attempt < attempts:
                    wait = 2 ** attempt
                    logger.info(f"Retrying Gemini request in {wait}s")
                    time.sleep(wait)
                    continue
                return None

    def _clean_json_response(self, response_text: str) -> Dict[str, Any]:
        """Clean and parse JSON from Gemini response"""
        try:
            # Remove any markdown formatting
            response_text = response_text.strip()
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]

            # Remove any trailing commas before closing braces/brackets
            import re
            response_text = re.sub(r',(\s*[}\]])', r'\1', response_text)

            # Try to find JSON block if response contains other text
            json_start = response_text.find('{')
            json_end = response_text.rfind('}')
            if json_start != -1 and json_end != -1 and json_end > json_start:
                response_text = response_text[json_start:json_end+1]

            # Parse JSON
            verified_data = json.loads(response_text.strip())
            return verified_data
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON from Gemini response: {e}")
            logger.error(f"Response text preview: {response_text[:500]}...")
            # Return a fallback structure
            return {
                "verification_summary": {
                    "status": "error",
                    "message": f"Failed to parse Gemini response as JSON: {str(e)}",
                    "accuracy_score": 0
                },
                "corrected_data": {},
                "original_response": response_text[:1000] if len(response_text) > 1000 else response_text
            }

    def _local_fallback_verification(self, extracted_bundle: Dict[str, Any], pdf_text: str = "", template_json: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Basic local verification when Gemini is unavailable.
        Performs simple checks on instances and populates verification_summary and corrected_data.
        """
        try:
            instances = extracted_bundle.get(
                'instances', []) if extracted_bundle else []
            total = len(instances)
            if total == 0:
                accuracy_score = 0
            else:
                good = 0
                checks = []
                for inst in instances:
                    inst_ok = True
                    inst_checks = {}
                    # Check Period presence
                    period = inst.get('Period') or inst.get(
                        'period') or inst.get('PeriodText')
                    if period and isinstance(period, str) and period.strip():
                        inst_checks['period_present'] = True
                    else:
                        inst_checks['period_present'] = False
                        inst_ok = False

                    # Check Rows or table data presence
                    rows = inst.get('Rows') or inst.get(
                        'rows') or inst.get('Table') or inst.get('Tables')
                    has_rows = bool(rows)
                    inst_checks['has_rows'] = has_rows
                    if not has_rows:
                        inst_ok = False

                    if inst_ok:
                        good += 1
                    checks.append(inst_checks)

                accuracy_score = int((good / total) * 100)

            verification_summary = {
                "status": "partial" if accuracy_score > 0 else "error",
                "message": "Gemini API unavailable - applied local fallback checks",
                "accuracy_score": accuracy_score,
                "details": {
                    "instances_checked": total,
                }
            }

            corrected = {
                "company": extracted_bundle.get('company'),
                "form_no": extracted_bundle.get('form_no'),
                "file": extracted_bundle.get('file'),
                "instances": extracted_bundle.get('instances', [])
            }

            return {
                "verification_summary": verification_summary,
                "corrected_data": corrected,
                "fallback_checks": checks if total > 0 else []
            }
        except Exception as e:
            logger.error(f"Error in local fallback verification: {e}")
            return {
                "verification_summary": {
                    "status": "error",
                    "message": f"Local fallback verification failed: {e}",
                    "accuracy_score": 0
                },
                "corrected_data": extracted_bundle
            }

    def verify_pdf_json(self, pdf_path: str, extracted_json: Dict[str, Any], template_json: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Verify PDF content against extracted JSON using text mode, including template JSON in the prompt.
        """
        try:
            logger.info(f"Starting PDF verification for: {pdf_path}")

            # Extract text from PDF
            pdf_text = self._extract_text_from_pdf(pdf_path)
            if not pdf_text:
                logger.error("Failed to extract text from PDF")
                return {
                    "verification_summary": {
                        "status": "error",
                        "message": "Failed to extract text from PDF",
                        "accuracy_score": 0
                    },
                    "corrected_data": extracted_json
                }

            # Create verification prompt (with template)
            prompt = self._create_verification_prompt(
                pdf_text, extracted_json, template_json)

            # Make Gemini request
            gemini_response = self._make_gemini_request(prompt)
            if not gemini_response:
                logger.error("Failed to get response from Gemini")
                # Use local fallback verification to provide useful output
                return self._local_fallback_verification(extracted_json, pdf_text, template_json)

            # Parse and clean the response
            verified_data = self._clean_json_response(gemini_response)

            # Add metadata
            verified_data.update({
                "verification_metadata": {
                    "pdf_file": os.path.basename(pdf_path),
                    "verification_timestamp": time.time(),
                    "gemini_model": "gemini-2.5-flash",
                    "verification_method": "pdf_text_comparison"
                }
            })

            logger.info("PDF verification completed successfully")
            return verified_data

        except Exception as e:
            logger.error(f"Error in PDF verification: {e}")
            return {
                "verification_summary": {
                    "status": "error",
                    "message": f"Verification failed: {str(e)}",
                    "accuracy_score": 0
                },
                "corrected_data": extracted_json,
                "error": str(e)
            }

    def verify_with_pdf_image(self, pdf_path: str, extracted_json: Dict[str, Any], template_json: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Verification using PDF as inline data (better table recognition) and including template JSON.
        """
        try:
            logger.info(f"Starting PDF image verification for: {pdf_path}")

            # Convert PDF to base64
            pdf_base64 = self._pdf_to_base64(pdf_path)
            if not pdf_base64:
                logger.error("Failed to convert PDF to base64")
                # Fallback to text method
                return self.verify_pdf_json(pdf_path, extracted_json, template_json)

            # Build parts: instructions, PDF, extracted JSON, template JSON
            instructions = f"""
{self.verification_prompt}

You are provided three inputs as separate parts:
1) The original PDF file (inline attachment)
2) The raw extracted JSON data
3) The selection-based L-form template JSON defining expected structure

Task: Correct the extracted JSON so it matches the original PDF content and adheres to the template. Return only valid JSON.
"""

            headers = {'Content-Type': 'application/json'}

            parts: List[Dict[str, Any]] = [
                {"text": instructions},
                {
                    "inline_data": {
                        "mime_type": "application/pdf",
                        "data": pdf_base64
                    }
                },
                {"text": "EXTRACTED JSON DATA:\n" +
                    json.dumps(extracted_json, indent=2)},
                {"text": "TEMPLATE JSON:\n" +
                    json.dumps(template_json or {}, indent=2)}
            ]

            payload = {
                "contents": [{"parts": parts}],
                "generationConfig": {
                    "temperature": 0.1,
                    "topK": 1,
                    "topP": 1,
                    "maxOutputTokens": 8192,
                }
            }

            response = requests.post(
                f"{self.api_url}?key={self.api_key}",
                headers=headers,
                json=payload,
                timeout=120
            )

            if response.status_code == 200:
                result = response.json()
                if 'candidates' in result and len(result['candidates']) > 0:
                    content = result['candidates'][0]['content']['parts'][0]['text']
                    verified_data = self._clean_json_response(content)

                    # Add metadata
                    verified_data.update({
                        "verification_metadata": {
                            "pdf_file": os.path.basename(pdf_path),
                            "verification_timestamp": time.time(),
                            "gemini_model": "gemini-2.5-flash",
                            "verification_method": "pdf_image_comparison"
                        }
                    })

                    logger.info(
                        "PDF image verification completed successfully")
                    return verified_data
                else:
                    logger.error(
                        "No candidates in Gemini response for image verification")
                    # fallback to local verification
                    return self._local_fallback_verification(extracted_json, self._extract_text_from_pdf(pdf_path), template_json)
            else:
                logger.error(
                    f"Gemini API error for image verification: {response.status_code}")
                # fallback
                return self._local_fallback_verification(extracted_json, self._extract_text_from_pdf(pdf_path), template_json)

        except Exception as e:
            logger.error(f"Error in PDF image verification: {e}")
            return self.verify_pdf_json(pdf_path, extracted_json, template_json)


# Create a singleton instance
gemini_pdf_verifier = GeminiPDFVerifier()


def verify_extraction(pdf_path: str, extracted_json: Dict[str, Any], use_image_mode: bool = True) -> Dict[str, Any]:
    """
    Convenience function to verify PDF extraction (kept for backward compatibility)
    """
    if use_image_mode:
        return gemini_pdf_verifier.verify_with_pdf_image(pdf_path, extracted_json)
    else:
        return gemini_pdf_verifier.verify_pdf_json(pdf_path, extracted_json)


async def extract_verify_and_save(company: str, form_no: str, filename: Optional[str] = None, use_image_mode: bool = True) -> Dict[str, Any]:
    """
    End-to-end workflow exposed at module level for other modules to import:
    - Extract the selected L-form tables/text per period (pages limited to each instance)
    - Verify and correct with Gemini using the original PDF, extracted JSON, and template
    - Save to backend/gemini_verified_json/{company}/{original_filename}_{form_no}.json
    Returns: { "output_path": str, "verified": Dict }
    """
    # Lazy import to avoid circulars
    from . import master_template as mt

    # Get PDF path and template
    pdf_path = mt.get_company_pdf_path(company, filename)
    template_json = _load_template(company, form_no)

    # Extract per-period instances (uses multithreading internally for tables)
    extracted_instances = await mt.extract_form(company, form_no, filename)

    # Build extracted bundle with file + instances
    extracted_bundle = {
        "company": company,
        "form_no": form_no,
        "file": os.path.basename(pdf_path),
        "instances": extracted_instances
    }

    # Obtain a verifier (safe if singleton is None)
    verifier = gemini_pdf_verifier if gemini_pdf_verifier is not None else GeminiPDFVerifier()

    # Verify
    if use_image_mode:
        verified = verifier.verify_with_pdf_image(
            pdf_path, extracted_bundle, template_json)
    else:
        # Use text mode prompt including template
        pdf_text = verifier._extract_text_from_pdf(pdf_path)
        prompt = verifier._create_verification_prompt(
            pdf_text, extracted_bundle, template_json)
        resp = verifier._make_gemini_request(prompt)
        verified = verifier._clean_json_response(
            resp or json.dumps(extracted_bundle))
        verified.update({
            "verification_metadata": {
                "pdf_file": os.path.basename(pdf_path),
                "verification_timestamp": time.time(),
                "gemini_model": os.getenv('GEMINI_MODEL', 'gemini-2.5-flash'),
                "verification_method": "pdf_text_comparison"
            }
        })

    # Ensure metadata reflects selection
    try:
        verified.setdefault("verification_metadata", {})
        verified["verification_metadata"].update({
            "company": company,
            "form_no": form_no
        })
    except Exception:
        pass

    # Save with form suffix
    out_path = _save_verified_json(
        company, pdf_path, verified, form_no=form_no)

    return {"output_path": out_path, "verified": verified}


def _load_template(company: str, form_no: str) -> Dict[str, Any]:
    """Load selection-based template JSON for the given company/form."""
    company_dir = os.path.join(TEMPLATES_DIR, company.lower())
    if not os.path.exists(company_dir):
        raise FileNotFoundError(
            f"Templates directory not found for company: {company}")

    # Prefer exact file startswith form_no
    candidates = [f for f in os.listdir(
        company_dir) if f.lower().endswith('.json')]
    form_uc = form_no.upper()
    selected = None
    for f in candidates:
        name_uc = f.replace('.json', '').upper()
        if name_uc == form_uc or name_uc.startswith(form_uc):
            selected = os.path.join(company_dir, f)
            break
    if not selected and candidates:
        # fallback first
        selected = os.path.join(company_dir, candidates[0])

    if not selected:
        raise FileNotFoundError(f"No template found for {company}/{form_no}")

    with open(selected, 'r', encoding='utf-8') as fh:
        return json.load(fh)


def _save_verified_json(company: str, pdf_path: str, verified: Dict[str, Any], form_no: Optional[str] = None) -> str:
    """Save verified JSON to backend/gemini_verified_json/{company}/{original_file}_{form}.json

    If form_no is provided, append it to filename.
    """
    company_dir = os.path.join(VERIFIED_DIR, company)
    os.makedirs(company_dir, exist_ok=True)

    original_name = os.path.basename(pdf_path)
    base = os.path.splitext(original_name)[0]
    suffix = f"_{form_no.upper()}" if form_no else ""
    json_name = f"{base}{suffix}.json"
    out_path = os.path.join(company_dir, json_name)

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(verified, f, indent=2, ensure_ascii=False)

    logger.info(f"Saved Gemini-verified JSON: {out_path}")
    return out_path
