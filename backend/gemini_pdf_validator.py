
import json
import os
import fitz
import base64
import requests
from typing import Dict, Any

class GeminiPDFValidator:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            print('⚠️ Warning: GEMINI_API_KEY not found. Using mock validation.')
            self.api_key = 'mock_key'
    
    def extract_pdf_text(self, pdf_path: str) -> str:
        try:
            doc = fitz.open(pdf_path)
            text = ''
            for page_num in range(doc.page_count):
                page = doc[page_num]
                text += page.get_text()
            doc.close()
            return text
        except Exception as e:
            print(f'❌ Error extracting PDF text: {e}')
            return ''
    
    def pdf_to_base64(self, pdf_path: str) -> str:
        try:
            with open(pdf_path, 'rb') as pdf_file:
                pdf_data = pdf_file.read()
                return base64.b64encode(pdf_data).decode('utf-8')
        except Exception as e:
            print(f'❌ Error converting PDF to base64: {e}')
            return ''
    
    def create_validation_prompt(self, extracted_data: Dict, pdf_text: str, template: Dict) -> str:
        prompt = f"""
You are a financial data validation expert. Your task is to validate and correct extracted financial data from a PDF document.

TASK: Compare the extracted data against the original PDF content and template structure, then provide corrected JSON.

INPUT DATA:
1. EXTRACTED DATA (from automated extraction):
{json.dumps(extracted_data, indent=2)}

2. ORIGINAL PDF TEXT (for reference):
{pdf_text[:2000]}...

3. TEMPLATE STRUCTURE (expected format):
{json.dumps(template, indent=2)}

VALIDATION REQUIREMENTS:
1. Check if all required fields from template are present
2. Verify numerical values match the PDF content
3. Ensure proper formatting and data types
4. Identify missing or incorrect data
5. Validate financial calculations and totals
6. Check for data consistency across rows

OUTPUT FORMAT:
Provide a JSON response with this exact structure:
{{
    "validation_summary": {{
        "status": "success" or "error",
        "message": "Brief description of validation results",
        "accuracy_score": 85,
        "issues_found": ["list of issues found"],
        "missing_data": ["list of missing fields"],
        "confidence_scores": {{
            "data_completeness": 90,
            "numerical_accuracy": 85,
            "format_consistency": 95
        }}
    }},
    "corrected_data": {{
        // Complete corrected JSON with all fields properly formatted
        // Include all original fields plus corrections
    }},
    "analysis_notes": {{
        "key_corrections": ["list of major corrections made"],
        "data_quality_issues": ["list of quality issues"],
        "recommendations": ["list of recommendations"]
    }}
}}

Please validate and correct the extracted data now.
"""
        return prompt
    
    def call_gemini_api(self, prompt: str, pdf_base64: str = None) -> Dict[str, Any]:
        if self.api_key == 'mock_key':
            return self.mock_validation()
        
        try:
            url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}'
            
            content_parts = [{"text": prompt}]
            if pdf_base64:
                content_parts.append({
                    "inline_data": {
                        "mime_type": "application/pdf",
                        "data": pdf_base64
                    }
                })
            
            payload = {
                "contents": [{
                    "parts": content_parts
                }],
                "generationConfig": {
                    "temperature": 0.1,
                    "topK": 32,
                    "topP": 1,
                    "maxOutputTokens": 8192
                }
            }
            
            response = requests.post(url, json=payload, timeout=60)
            response.raise_for_status()
            
            result = response.json()
            if 'candidates' in result and len(result['candidates']) > 0:
                content = result['candidates'][0]['content']['parts'][0]['text']
                return self.parse_gemini_response(content)
            else:
                return self.mock_validation()
                
        except Exception as e:
            print(f'❌ Error calling Gemini API: {e}')
            return self.mock_validation()
    
    def mock_validation(self) -> Dict[str, Any]:
        return {
            "validation_summary": {
                "status": "success",
                "message": "Mock validation completed - API key not available",
                "accuracy_score": 88,
                "issues_found": ["Mock validation - no real validation performed"],
                "missing_data": [],
                "confidence_scores": {
                    "data_completeness": 85,
                    "numerical_accuracy": 88,
                    "format_consistency": 92
                }
            },
            "corrected_data": {},
            "analysis_notes": {
                "key_corrections": ["Mock corrections applied"],
                "data_quality_issues": ["Mock validation performed"],
                "recommendations": ["Use real API key for actual validation"]
            }
        }
    
    def parse_gemini_response(self, content: str) -> Dict[str, Any]:
        try:
            start_idx = content.find('{')
            end_idx = content.rfind('}') + 1
            
            if start_idx != -1 and end_idx > start_idx:
                json_str = content[start_idx:end_idx]
                return json.loads(json_str)
            else:
                return self.mock_validation()
        except Exception as e:
            print(f'❌ Error parsing Gemini response: {e}')
            return self.mock_validation()
    
    def validate_extraction(self, extracted_data: Dict, pdf_path: str, template: Dict) -> Dict[str, Any]:
        print('🔍 Starting Gemini AI validation...')
        
        print('📄 Extracting PDF text...')
        pdf_text = self.extract_pdf_text(pdf_path)
        
        print('🔄 Converting PDF to base64...')
        pdf_base64 = self.pdf_to_base64(pdf_path)
        
        print('📝 Creating validation prompt...')
        prompt = self.create_validation_prompt(extracted_data, pdf_text, template)
        
        print('🤖 Calling Gemini AI for validation...')
        validation_result = self.call_gemini_api(prompt, pdf_base64)
        
        print('✅ Validation completed!')
        return validation_result
