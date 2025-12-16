"""
Extraction Metadata Helper
Handles metadata creation and storage for extraction operations
"""
import json
import uuid
from pathlib import Path
from datetime import datetime
from typing import Dict


class ExtractionMetadataHelper:
    """Helper for managing extraction metadata"""

    @staticmethod
    def create_metadata(
        user_id: str,
        company_name: str,
        pdf_name: str,
        split_filename: str,
        split_pdf_path: str,
        form_code: str,
        template_path: Path,
        gemini_corrected: bool,
        output_path: Path,
        correction_notes: Dict = None
    ) -> Dict:
        """
        Create extraction metadata dictionary

        Returns:
            Complete metadata dictionary with all extraction details
        """
        return {
            "extraction_id": str(uuid.uuid4()),
            "user_id": user_id,
            "company_name": company_name,
            "pdf_name": pdf_name,
            "split_filename": split_filename,
            "split_pdf_path": split_pdf_path,
            "form_code": form_code,
            "template_used": str(template_path),
            "extracted_at": datetime.now().isoformat(),
            "extraction_status": "completed",
            "gemini_corrected": gemini_corrected,
            "output_path": str(output_path),
            "correction_meta": correction_notes or {}
        }

    @staticmethod
    def save_metadata(metadata: Dict, output_dir: Path, split_filename: str):
        """
        Save metadata to JSON file

        Args:
            metadata: Metadata dictionary to save
            output_dir: Directory to save metadata file
            split_filename: Name of the split file (used to generate metadata filename)
        """
        try:
            metadata_path = output_dir / \
                f"{Path(split_filename).stem}_metadata.json"

            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)

            print(f"✅ Metadata saved: {metadata_path}")

        except Exception as e:
            print(f"⚠️ Failed to save metadata: {e}")

    @staticmethod
    def load_metadata(extractions_dir: Path, split_filename: str) -> Dict:
        """
        Load existing metadata from file

        Returns:
            Metadata dictionary or empty dict if not found
        """
        try:
            metadata_path = extractions_dir / \
                f"{Path(split_filename).stem}_metadata.json"

            if metadata_path.exists():
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    return json.load(f)

        except Exception as e:
            print(f"⚠️ Failed to load metadata: {e}")

        return {}
