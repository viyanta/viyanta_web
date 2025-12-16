"""
Extraction Orchestrator Service
Coordinates PDF extraction and Gemini verification workflows
"""
import os
import sys
import json
import subprocess
import traceback
from pathlib import Path
from typing import Dict, Optional, Tuple
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()


class ExtractionOrchestrator:
    """Orchestrates PDF extraction and Gemini verification pipeline"""

    def __init__(self):
        self.extraction_script = "services/pdf_splitted_extraction.py"
        self.gemini_script = "services/pdf_splitted_gemini_very.py"

    def run_extraction(
        self,
        template_path: Path,
        split_pdf_path: str,
        output_json_path: Path
    ) -> Dict[str, any]:
        """
        Run PDF extraction using the template

        Returns:
            {
                'success': bool,
                'output_path': Path,
                'row_count': int,
                'error': str (if failed)
            }
        """
        try:
            # Build extraction command
            cmd = [
                sys.executable,
                self.extraction_script,
                "--template", str(template_path),
                "--pdf", split_pdf_path,
                "--output", str(output_json_path)
            ]

            print(f"🔧 Running extraction: {' '.join(cmd)}")

            # Run extraction with timeout
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120  # 2 min timeout
            )

            print(f"💯 Extraction return code: {result.returncode}")

            if result.stdout:
                print(f"📤 Extraction stdout: {result.stdout[:500]}")

            if result.stderr:
                print(f"⚠️ Extraction stderr: {result.stderr[:500]}")

            if result.returncode != 0:
                return {
                    'success': False,
                    'error': result.stderr or "Unknown extraction error"
                }

            # Check if output exists and count rows
            if not output_json_path.exists():
                return {
                    'success': False,
                    'error': "Extraction completed but output file not found"
                }

            # Count rows in extracted data
            row_count = 0
            try:
                with open(output_json_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        row_count = len(data)
                    elif isinstance(data, dict) and 'data' in data:
                        row_count = len(data['data'])
            except Exception as e:
                print(f"⚠️ Could not count rows: {e}")

            return {
                'success': True,
                'output_path': output_json_path,
                'row_count': row_count
            }

        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'error': "Extraction timeout (exceeded 2 minutes)"
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"Extraction failed: {str(e)}\n{traceback.format_exc()}"
            }

    def run_gemini_verification(
        self,
        template_path: Path,
        extracted_json_path: Path,
        split_pdf_path: str,
        corrected_json_path: Path,
        row_count: int = 0
    ) -> Dict[str, any]:
        """
        Run Gemini verification on extracted data

        Returns:
            {
                'success': bool,
                'output_path': Path,
                'gemini_corrected': bool,
                'correction_notes': dict,
                'error': str (if failed)
            }
        """
        try:
            # Check if we should skip Gemini (quick mode)
            should_skip, skip_reason = self._should_skip_gemini(row_count)

            if should_skip:
                print(f"⚡ Skipping Gemini: {skip_reason}")
                return {
                    'success': True,
                    'output_path': extracted_json_path,
                    'gemini_corrected': False,
                    'correction_notes': {
                        'skipped': True,
                        'reason': skip_reason,
                        'row_count': row_count
                    }
                }

            # Build Gemini command
            cmd = [
                sys.executable,
                self.gemini_script,
                "--template", str(template_path),
                "--extracted", str(extracted_json_path),
                "--pdf", split_pdf_path,
                "--output", str(corrected_json_path)
            ]

            print(f"🤖 Running Gemini verification: {' '.join(cmd)}")

            # Get timeout settings
            timeout = self._get_gemini_timeout()

            # Run Gemini with timeout
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout
            )

            print(f"💯 Gemini return code: {result.returncode}")

            if result.stdout:
                print(f"📤 Gemini stdout: {result.stdout[:500]}")

            if result.stderr:
                print(f"⚠️ Gemini stderr: {result.stderr[:500]}")

            # Check for enhanced version first
            enhanced_path = Path(str(corrected_json_path).replace(
                "_corrected.json", "_corrected_enhanced.json"
            ))

            final_path = corrected_json_path
            if enhanced_path.exists():
                try:
                    with open(enhanced_path, 'r', encoding='utf-8') as f:
                        json.load(f)  # Validate JSON
                    final_path = enhanced_path
                    print(f"✅ Using enhanced Gemini output")
                except Exception as e:
                    print(f"⚠️ Enhanced file invalid: {e}")

            # Check if Gemini succeeded
            if result.returncode == 0 and final_path.exists():
                try:
                    with open(final_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)

                    if data:
                        print(f"✅ Gemini verification successful")
                        return {
                            'success': True,
                            'output_path': final_path,
                            'gemini_corrected': True,
                            'correction_notes': {
                                'completed': True,
                                'timeout_used': timeout,
                                'enhanced': final_path == enhanced_path
                            }
                        }
                except Exception as e:
                    print(f"⚠️ Gemini output invalid: {e}")

            # Gemini failed, use extracted data
            print(f"⚠️ Gemini verification failed, using extracted data")
            return {
                'success': True,
                'output_path': extracted_json_path,
                'gemini_corrected': False,
                'correction_notes': {
                    'failed': True,
                    'return_code': result.returncode,
                    'error': result.stderr[:200] if result.stderr else None
                }
            }

        except subprocess.TimeoutExpired:
            print(f"⚠️ Gemini timeout, using extracted data")
            return {
                'success': True,
                'output_path': extracted_json_path,
                'gemini_corrected': False,
                'correction_notes': {
                    'timeout': True,
                    'timeout_seconds': timeout
                }
            }
        except Exception as e:
            print(f"❌ Gemini error: {e}")
            return {
                'success': True,
                'output_path': extracted_json_path,
                'gemini_corrected': False,
                'correction_notes': {
                    'error': str(e)
                }
            }

    def _should_skip_gemini(self, row_count: int) -> Tuple[bool, str]:
        """Determine if Gemini should be skipped based on quick mode settings"""
        enable_quick_mode = os.getenv("GEMINI_QUICK_MODE", "0") == "1"
        quick_mode_threshold = int(
            os.getenv("GEMINI_QUICK_MODE_THRESHOLD", "20"))

        if not enable_quick_mode:
            return False, ""

        if row_count == 0:
            return False, ""

        if row_count <= quick_mode_threshold:
            return True, f"Quick mode enabled for {row_count} rows (threshold: {quick_mode_threshold})"

        return False, ""

    def _get_gemini_timeout(self) -> Optional[int]:
        """Get Gemini timeout from environment"""
        no_timeout = os.getenv("GEMINI_CORRECTION_NO_TIMEOUT", "0") == "1"
        if no_timeout:
            return None

        timeout = int(os.getenv("GEMINI_CORRECTION_TIMEOUT_PRIMARY", "300"))
        return timeout

    def normalize_extracted_data(self, data: any) -> any:
        """
        Normalize extracted data to consistent format
        Handles both old format {metadata, data} and new format {Rows, _metadata}
        """
        if not isinstance(data, dict):
            return data

        # New Gemini format: {Rows: [...], _metadata: {...}}
        if "Rows" in data:
            return data["Rows"]

        # Old Gemini format: {metadata: {...}, data: [...]}
        if "data" in data:
            return data["data"]

        # Unknown format, return as-is
        return data

    def create_output_directories(
        self,
        company_name: str,
        pdf_name: str
    ) -> Tuple[Path, Path]:
        """
        Create output directories for extractions and Gemini outputs

        Returns:
            (extractions_dir, gemini_dir)
        """
        company_slug = company_name.lower().replace(" ", "_")

        extractions_dir = Path("extractions") / company_slug / pdf_name
        extractions_dir.mkdir(parents=True, exist_ok=True)

        gemini_dir = Path("gemini_verified_json") / company_slug / pdf_name
        gemini_dir.mkdir(parents=True, exist_ok=True)

        return extractions_dir, gemini_dir
