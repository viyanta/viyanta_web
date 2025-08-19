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
        self.api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

        if not self.api_key:
            logger.error(
                "Gemini API key not found. Please set GEMINI_API_KEY in .env file")
            raise ValueError("Gemini API key is required")

        logger.info("Gemini PDF Verifier initialized successfully")

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

    def _create_verification_prompt(self, pdf_text: str, extracted_json: Dict[str, Any]) -> str:
        """Create comprehensive verification prompt"""
        prompt = f"""
{self.verification_prompt}

ORIGINAL PDF CONTENT:
{pdf_text}

EXTRACTED JSON DATA:
{json.dumps(extracted_json, indent=2)}

VERIFICATION TASKS:
1. Compare the PDF content with the extracted JSON data
2. Identify any missing information in the JSON
3. Find any incorrect data in the JSON (wrong values, typos, etc.)
4. Check if table structures are properly extracted
5. Verify that all important text content is captured
6. Ensure numerical values and formatting are correct

RESPONSE REQUIREMENTS:
- Return ONLY valid JSON format
- Include all corrected data
- Maintain the same structure as the input JSON but with corrections
- Add any missing data found in the PDF
- Fix any formatting or structural issues
- Include a verification_summary with accuracy score and changes made

Please provide the corrected and verified JSON:
"""
        return prompt

    def _make_gemini_request(self, prompt: str) -> Optional[str]:
        """Make request to Gemini API for verification"""
        if not self.api_key:
            logger.error("Gemini API key not available")
            return None

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
                    logger.info("Gemini verification completed successfully")
                    return content
                else:
                    logger.error("No candidates in Gemini response")
                    return None
            else:
                logger.error(
                    f"Gemini API error: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            logger.error(f"Error making Gemini request: {e}")
            return None

    def _clean_json_response(self, response_text: str) -> Dict[str, Any]:
        """Clean and parse JSON from Gemini response"""
        try:
            # Remove any markdown formatting
            response_text = response_text.strip()
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]

            # Parse JSON
            verified_data = json.loads(response_text.strip())
            return verified_data
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON from Gemini response: {e}")
            # Return a fallback structure
            return {
                "verification_summary": {
                    "status": "error",
                    "message": "Failed to parse Gemini response as JSON",
                    "accuracy_score": 0
                },
                "corrected_data": {},
                "original_response": response_text
            }

    def verify_pdf_json(self, pdf_path: str, extracted_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main method to verify PDF content against extracted JSON

        Args:
            pdf_path: Path to the original PDF file
            extracted_json: The extracted JSON data to verify

        Returns:
            Dict containing verified and corrected JSON data
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

            # Create verification prompt
            prompt = self._create_verification_prompt(pdf_text, extracted_json)

            # Make Gemini request
            gemini_response = self._make_gemini_request(prompt)
            if not gemini_response:
                logger.error("Failed to get response from Gemini")
                return {
                    "verification_summary": {
                        "status": "error",
                        "message": "Failed to get response from Gemini API",
                        "accuracy_score": 0
                    },
                    "corrected_data": extracted_json
                }

            # Parse and clean the response
            verified_data = self._clean_json_response(gemini_response)

            # Add metadata
            verified_data.update({
                "verification_metadata": {
                    "pdf_file": os.path.basename(pdf_path),
                    "verification_timestamp": time.time(),
                    "gemini_model": "gemini-1.5-flash",
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

    def verify_with_pdf_image(self, pdf_path: str, extracted_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        Alternative verification method using PDF as image (for better table recognition)

        Args:
            pdf_path: Path to the original PDF file
            extracted_json: The extracted JSON data to verify

        Returns:
            Dict containing verified and corrected JSON data
        """
        try:
            logger.info(f"Starting PDF image verification for: {pdf_path}")

            # Convert PDF to base64
            pdf_base64 = self._pdf_to_base64(pdf_path)
            if not pdf_base64:
                logger.error("Failed to convert PDF to base64")
                # Fallback to text method
                return self.verify_pdf_json(pdf_path, extracted_json)

            # Create prompt for image-based verification
            prompt = f"""
{self.verification_prompt}

I'm providing you with a PDF document (as an image) and the extracted JSON data from it.
Please compare the visual content of the PDF with the extracted JSON and provide corrections.

EXTRACTED JSON DATA:
{json.dumps(extracted_json, indent=2)}

Please analyze the PDF image and return a corrected JSON with any fixes needed.
Focus especially on table structures, numerical values, and text accuracy.
Return only valid JSON format.
"""

            # Prepare payload with PDF image
            headers = {
                'Content-Type': 'application/json',
            }

            payload = {
                "contents": [{
                    "parts": [
                        {
                            "text": prompt
                        },
                        {
                            "inline_data": {
                                "mime_type": "application/pdf",
                                "data": pdf_base64
                            }
                        }
                    ]
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
                timeout=120  # Longer timeout for image processing
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
                            "gemini_model": "gemini-1.5-flash",
                            "verification_method": "pdf_image_comparison"
                        }
                    })

                    logger.info(
                        "PDF image verification completed successfully")
                    return verified_data
                else:
                    logger.error(
                        "No candidates in Gemini response for image verification")
                    # Fallback
                    return self.verify_pdf_json(pdf_path, extracted_json)
            else:
                logger.error(
                    f"Gemini API error for image verification: {response.status_code}")
                # Fallback
                return self.verify_pdf_json(pdf_path, extracted_json)

        except Exception as e:
            logger.error(f"Error in PDF image verification: {e}")
            # Fallback to text method
            return self.verify_pdf_json(pdf_path, extracted_json)


# Create a singleton instance
gemini_pdf_verifier = GeminiPDFVerifier()


def verify_extraction(pdf_path: str, extracted_json: Dict[str, Any], use_image_mode: bool = True) -> Dict[str, Any]:
    """
    Convenience function to verify PDF extraction

    Args:
        pdf_path: Path to the original PDF file
        extracted_json: The extracted JSON data to verify
        use_image_mode: Whether to use image-based verification (default: True)

    Returns:
        Dict containing verified and corrected JSON data
    """
    if use_image_mode:
        return gemini_pdf_verifier.verify_with_pdf_image(pdf_path, extracted_json)
    else:
        return gemini_pdf_verifier.verify_pdf_json(pdf_path, extracted_json)


if __name__ == "__main__":
    # Test the verifier
    test_pdf = "test.pdf"
    test_json = {
        "tables": [
            {
                "headers": ["Name", "Age", "City"],
                "data": [
                    ["John", "25", "New York"],
                    ["Jane", "30", "London"]
                ]
            }
        ]
    }

    result = verify_extraction(test_pdf, test_json)
    print(json.dumps(result, indent=2))
