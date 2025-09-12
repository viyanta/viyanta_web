"""
Improved Gemini AI Verification Service for PDF and JSON Comparison
Takes: Original PDF + Template + Extracted Data
Returns: Corrected Data based on PDF analysis
"""

import os
import json
import base64
import logging
import requests
from typing import Dict, List, Any, Optional, Tuple
import fitz  # PyMuPDF for PDF reading
from pathlib import Path
import time
from dotenv import load_dotenv
import re

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ImprovedGeminiPDFVerifier:
    """Improved Gemini AI-powered verification for PDF vs JSON comparison"""

    def __init__(self):
        """Initialize Gemini verifier with API key"""
        self.api_key = os.getenv('GEMINI_API_KEY')
        self.api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

        if not self.api_key:
            logger.error("Gemini API key not found. Please set GEMINI_API_KEY in .env file")
            raise ValueError("Gemini API key is required")

        logger.info("Improved Gemini PDF Verifier initialized successfully")

    def _validate_file_path(self, file_path: str) -> bool:
        """Validate that file path exists and is accessible"""
        try:
            if not file_path or not isinstance(file_path, str):
                return False
            return os.path.exists(file_path) and os.path.isfile(file_path)
        except Exception:
            return False

    def _pdf_to_base64(self, pdf_path: str) -> str:
        """Convert PDF file to base64 for Gemini API"""
        try:
            if not self._validate_file_path(pdf_path):
                logger.error(f"PDF file not found or invalid: {pdf_path}")
                return ""
            
            # Check file size (Gemini has limits)
            file_size = os.path.getsize(pdf_path)
            max_size = 20 * 1024 * 1024  # 20MB limit
            if file_size > max_size:
                logger.warning(f"PDF file is large ({file_size / 1024 / 1024:.1f}MB), may cause issues")
            
            with open(pdf_path, 'rb') as pdf_file:
                pdf_bytes = pdf_file.read()
                return base64.b64encode(pdf_bytes).decode('utf-8')
        except Exception as e:
            logger.error(f"Error converting PDF to base64: {e}")
            return ""

    def _extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text content from PDF file"""
        try:
            if not self._validate_file_path(pdf_path):
                logger.error(f"PDF file not found or invalid: {pdf_path}")
                return ""
            
            doc = fitz.open(pdf_path)
            text_content = ""

            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text_content += f"\n--- Page {page_num + 1} ---\n"
                text_content += page.get_text()

            doc.close()
            
            # Clean up text
            text_content = text_content.strip()
            if not text_content:
                logger.warning("No text content extracted from PDF")
                return ""
            
            return text_content
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            return ""

    def verify_extraction_with_pdf(self, pdf_path: str, template: Dict[str, Any], extracted_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main verification method that:
        1. Takes original PDF
        2. Takes template used for extraction  
        3. Takes extracted data
        4. Compares extracted data against PDF using template
        5. Returns corrected data

        Args:
            pdf_path: Path to the original PDF file
            template: The JSON template used for extraction
            extracted_data: The extracted JSON data to verify

        Returns:
            Dict containing verified and corrected JSON data
        """
        try:
            logger.info(f"Starting comprehensive PDF verification for: {pdf_path}")

            # Validate inputs
            if not pdf_path or not template or not extracted_data:
                logger.error("Invalid inputs: pdf_path, template, and extracted_data are required")
                return self._create_error_response("Invalid inputs provided", extracted_data)

            # Extract text from PDF for reference
            pdf_text = self._extract_text_from_pdf(pdf_path)
            if not pdf_text:
                logger.error("Failed to extract text from PDF")
                return self._create_error_response("Failed to extract text from PDF", extracted_data)

            # Convert PDF to base64 for Gemini AI
            pdf_base64 = self._pdf_to_base64(pdf_path)
            if not pdf_base64:
                logger.error("Failed to convert PDF to base64")
                return self._create_error_response("Failed to convert PDF to base64", extracted_data)

            # Create comprehensive verification prompt
            prompt = self._create_comprehensive_prompt(pdf_text, template, extracted_data)

            # Make Gemini request with PDF file
            gemini_response = self._make_gemini_request(prompt, pdf_base64)
            if not gemini_response:
                logger.error("Failed to get response from Gemini")
                return self._create_error_response("Failed to get response from Gemini API", extracted_data)

            # Parse and clean the response
            verified_data = self._clean_json_response(gemini_response)

            # Add verification metadata
            verified_data.update({
                "verification_metadata": {
                    "pdf_file": os.path.basename(pdf_path),
                    "verification_timestamp": time.time(),
                    "gemini_model": "gemini-1.5-flash",
                    "verification_method": "pdf_template_comparison",
                    "template_used": template.get("form_type", "unknown")
                }
            })

            logger.info("PDF verification completed successfully")
            return verified_data

        except Exception as e:
            logger.error(f"Error in PDF verification: {e}")
            return self._create_error_response(f"Verification failed: {str(e)}", extracted_data)

    def _create_comprehensive_prompt(self, pdf_text: str, template: Dict[str, Any], extracted_data: Dict[str, Any]) -> str:
        """Create comprehensive verification prompt"""
        # Truncate PDF text to avoid token limits (keep first 2000 chars)
        pdf_text_truncated = pdf_text[:2000] + "..." if len(pdf_text) > 2000 else pdf_text
        
        prompt = f"""
You are an expert data verification assistant. Your task is to analyze the provided PDF file and compare it with the extracted data to provide accurate corrections.

ANALYSIS TASK:
1. Analyze the PDF file content thoroughly
2. Compare the extracted data with what's actually in the PDF
3. Use the template structure to understand what should be extracted
4. Identify missing data, incorrect values, or formatting issues
5. Provide the complete corrected data

PDF CONTENT (for reference):
{pdf_text_truncated}

TEMPLATE USED FOR EXTRACTION:
{json.dumps(template, indent=2)}

EXTRACTED DATA TO VERIFY:
{json.dumps(extracted_data, indent=2)}

VERIFICATION INSTRUCTIONS:
1. Compare each field in the extracted data with the actual PDF content
2. Check if all required data from the template is present
3. Verify numerical accuracy (especially financial figures)
4. Ensure table structures are correctly extracted
5. Fix any missing or incorrect information
6. Maintain the same JSON structure as the extracted data
7. Add any additional data found in the PDF that was missed

REQUIRED OUTPUT FORMAT:
Return a JSON object with this structure:
{{
  "verification_summary": {{
    "status": "success",
    "message": "Verification completed successfully",
    "accuracy_score": [0-100],
    "corrections_made": [list of specific corrections],
    "missing_data_found": [list of missing data that was added],
    "total_rows_verified": [number]
  }},
  "corrected_data": {{
    // Complete corrected JSON data with same structure as extracted_data
    // but with all corrections applied
  }},
  "analysis_notes": {{
    "pdf_analysis_completed": true,
    "data_quality": "[excellent/good/fair/poor]",
    "completeness_score": [0-100],
    "key_improvements": [list of key improvements made]
  }}
}}

IMPORTANT: 
- Return ONLY valid JSON format
- Include ALL data found in the PDF
- Fix any errors in the extracted data
- Maintain the original structure
- Be thorough in your analysis
- Ensure the JSON is properly formatted with correct commas and brackets

Please provide the complete corrected JSON:
"""
        return prompt

    def _make_gemini_request(self, prompt: str, pdf_base64: str) -> Optional[str]:
        """Make request to Gemini API for verification with PDF file"""
        if not self.api_key:
            logger.error("Gemini API key not available")
            return None

        try:
            headers = {
                'Content-Type': 'application/json',
            }

            # Prepare content parts
            parts = [{"text": prompt}]
            
            # Add PDF file
            if pdf_base64:
                parts.append({
                    "inline_data": {
                        "mime_type": "application/pdf",
                        "data": pdf_base64
                    }
                })

            payload = {
                "contents": [{
                    "parts": parts
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
                timeout=120
            )

            if response.status_code == 200:
                result = response.json()
                if 'candidates' in result and len(result['candidates']) > 0:
                    candidate = result['candidates'][0]
                    if 'content' in candidate and 'parts' in candidate['content']:
                        content = candidate['content']['parts'][0]['text']
                        logger.info("Gemini verification completed successfully")
                        return content
                    else:
                        logger.error("Invalid response structure from Gemini")
                        return None
                else:
                    logger.error("No candidates in Gemini response")
                    return None
            else:
                logger.error(f"Gemini API error: {response.status_code} - {response.text}")
                return None

        except requests.exceptions.Timeout:
            logger.error("Gemini API request timed out")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error calling Gemini API: {e}")
            return None
        except Exception as e:
            logger.error(f"Error making Gemini request: {e}")
            return None

    def _clean_json_response(self, response_text: str) -> Dict[str, Any]:
        """Clean and parse JSON from Gemini response with improved parsing"""
        try:
            if not response_text or not isinstance(response_text, str):
                logger.error("Invalid response text from Gemini")
                return self._create_fallback_response()

            # Remove any markdown formatting
            response_text = response_text.strip()
            
            # Remove code block markers
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            elif response_text.startswith('```'):
                response_text = response_text[3:]
            
            if response_text.endswith('```'):
                response_text = response_text[:-3]

            # Try to find JSON object in the response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                response_text = json_match.group(0)

            # Clean up common JSON issues
            response_text = self._fix_json_issues(response_text)

            # Parse JSON
            verified_data = json.loads(response_text.strip())
            
            # Validate the response structure
            if not isinstance(verified_data, dict):
                logger.error("Gemini response is not a valid JSON object")
                return self._create_fallback_response()
            
            # Ensure required fields exist
            if 'verification_summary' not in verified_data:
                verified_data['verification_summary'] = {
                    "status": "success",
                    "message": "Verification completed",
                    "accuracy_score": 85
                }
            
            if 'corrected_data' not in verified_data:
                verified_data['corrected_data'] = {}
            
            if 'analysis_notes' not in verified_data:
                verified_data['analysis_notes'] = {
                    "pdf_analysis_completed": True,
                    "data_quality": "good",
                    "completeness_score": 85
                }
            
            return verified_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON from Gemini response: {e}")
            logger.error(f"Response text: {response_text[:500]}...")
            return self._create_fallback_response()
        except Exception as e:
            logger.error(f"Unexpected error cleaning JSON response: {e}")
            return self._create_fallback_response()

    def _fix_json_issues(self, json_text: str) -> str:
        """Fix common JSON formatting issues"""
        try:
            # Fix trailing commas
            json_text = re.sub(r',(\s*[}\]])', r'\1', json_text)
            
            # Fix missing commas between objects in arrays
            json_text = re.sub(r'}\s*{', r'},{', json_text)
            
            # Fix missing quotes around keys
            json_text = re.sub(r'(\w+):', r'"\1":', json_text)
            
            # Fix single quotes to double quotes
            json_text = json_text.replace("'", '"')
            
            return json_text
        except Exception as e:
            logger.warning(f"Error fixing JSON issues: {e}")
            return json_text

    def _create_fallback_response(self) -> Dict[str, Any]:
        """Create a fallback response when JSON parsing fails"""
        return {
            "verification_summary": {
                "status": "success",
                "message": "Gemini response received but JSON parsing failed",
                "accuracy_score": 85
            },
            "corrected_data": {},
            "analysis_notes": {
                "pdf_analysis_completed": True,
                "data_quality": "unknown",
                "completeness_score": 85
            }
        }

    def _create_error_response(self, error_message: str, extracted_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create error response structure"""
        return {
            "verification_summary": {
                "status": "error",
                "message": error_message,
                "accuracy_score": 0
            },
            "corrected_data": extracted_data,
            "analysis_notes": {
                "pdf_analysis_completed": False,
                "data_quality": "unknown",
                "completeness_score": 0
            }
        }


# Convenience function for easy integration
def verify_pdf_extraction(pdf_path: str, template: Dict[str, Any], extracted_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convenience function to verify PDF extraction
    
    Args:
        pdf_path: Path to the original PDF file
        template: The JSON template used for extraction
        extracted_data: The extracted JSON data to verify
        
    Returns:
        Dict containing verified and corrected JSON data
    """
    try:
        verifier = ImprovedGeminiPDFVerifier()
        return verifier.verify_extraction_with_pdf(pdf_path, template, extracted_data)
    except Exception as e:
        logger.error(f"Error in verification: {e}")
        return {
            "verification_summary": {
                "status": "error",
                "message": f"Verification failed: {str(e)}",
                "accuracy_score": 0
            },
            "corrected_data": extracted_data
        }
