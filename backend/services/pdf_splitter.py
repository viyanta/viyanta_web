import os
import json
import shutil
from pathlib import Path
from typing import List, Dict, Optional
from test_extraction.index_extraction import split_pdf, extract_index_entries
import uuid
import re


class PDFSplitterService:
    def __init__(self, base_upload_dir="uploads", base_splits_dir="pdf_splits"):
        self.base_upload_dir = Path(base_upload_dir)
        self.base_splits_dir = Path(base_splits_dir)
        self.base_upload_dir.mkdir(exist_ok=True)
        self.base_splits_dir.mkdir(exist_ok=True)

    def upload_and_split_pdf(self, company_name: str, pdf_file,) -> Dict:
        """
        Upload PDF and split it according to index extraction
        """
        try:
            # Create company folder
            company_folder = self.base_upload_dir / company_name.lower().replace(" ", "_")
            company_folder.mkdir(exist_ok=True)

            # Save uploaded PDF
            pdf_filename = pdf_file.filename
            pdf_path = company_folder / pdf_filename

            # Save the file
            with open(pdf_path, "wb") as buffer:
                shutil.copyfileobj(pdf_file.file, buffer)

            # Create splits folder for this PDF
            pdf_name_clean = Path(pdf_filename).stem
            splits_folder = self.base_splits_dir / company_name.lower().replace(" ", "_") / \
                pdf_name_clean
            splits_folder.mkdir(parents=True, exist_ok=True)

            # Split the PDF using index extraction
            split_files, ranges = split_pdf(str(pdf_path), str(splits_folder))

            # Clean and process the ranges (apply deduplication logic)
            processed_ranges = self._process_ranges(ranges)

            # Additional validation: Check if the page ranges make sense
            validated_ranges = self._validate_final_ranges(
                processed_ranges, str(pdf_path))

            # Create metadata
            metadata = {
                # "upload_id": str(uuid.uuid4()),
                # "user_id": user_id,
                "company_name": company_name,
                "original_filename": pdf_filename,
                "original_path": str(pdf_path),
                "splits_folder": str(splits_folder),
                "total_splits": len(split_files),
                "split_files": [
                    {
                        "filename": Path(f).name,
                        "path": f,
                        "form_name": self._extract_clean_form_name(r.get("form_no", "Unknown")),
                        "form_code": self._extract_form_code(r.get("form_no", "")),
                        "serial_no": r.get("serial_no", ""),
                        "start_page": r.get("start_page"),
                        "end_page": r.get("end_page"),
                        "original_form_no": r.get("form_no", "Unknown")
                    }
                    for f, r in zip(split_files, validated_ranges)
                ],
                "ranges": validated_ranges,
                "method": "index" if ranges else "content_scan"
            }

            # Save metadata
            metadata_path = splits_folder / "metadata.json"
            with open(metadata_path, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)

            return {
                "success": True,
                # "upload_id": metadata["upload_id"],
                "company_name": company_name,
                "pdf_name": pdf_name_clean,
                "total_splits": len(split_files),
                "metadata": metadata
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def _process_ranges(self, ranges: List[Dict]) -> List[Dict]:
        """
        Process and clean up the ranges from index extraction
        """
        if not ranges:
            return ranges

        # Sort by serial number (convert to int for proper sorting)
        try:
            ranges.sort(key=lambda x: int(x.get("serial_no", "999")))
        except (ValueError, TypeError):
            # Fallback to start_page sorting if serial_no is not numeric
            ranges.sort(key=lambda x: x.get("start_page", 0))

        # Remove overlapping ranges and resolve conflicts
        processed = []
        used_pages = set()

        for r in ranges:
            start_page = r.get("start_page")
            end_page = r.get("end_page")

            if start_page is None or end_page is None:
                continue

            # Check for page conflicts
            range_pages = set(range(start_page, end_page + 1))

            # If there's overlap, adjust the range
            if range_pages & used_pages:
                # Find available pages around this range
                available_start = start_page
                while available_start in used_pages and available_start <= end_page:
                    available_start += 1

                if available_start <= end_page:
                    # Adjust the range to available pages
                    r["start_page"] = available_start
                    range_pages = set(range(available_start, end_page + 1))
                else:
                    # Skip this range if no pages are available
                    continue

            used_pages.update(range_pages)
            processed.append(r)

        return processed

    def _extract_form_code(self, form_no: str) -> str:
        """
        Extract clean form code (L-XX format) from the full form string
        """
        match = re.search(r'(L[-_]?\d+[A-Z]*)', form_no.upper())
        return match.group(1) if match else form_no[:20]

    def _extract_clean_form_name(self, form_no: str) -> str:
        """
        Extract a clean, readable form name from the full form string
        """
        # Try to extract just the form code and main description
        # Pattern: "L-XX-DESCRIPTION other text" -> "L-XX DESCRIPTION"
        match = re.search(
            r'(L[-_]?\d+[A-Z]*)[^A-Za-z]*([A-Z][A-Z\s&\-]+)', form_no.upper())

        if match:
            form_code = match.group(1)
            description = match.group(2).strip()

            # Clean up the description - take first meaningful part
            desc_parts = description.split()
            clean_desc = []

            for part in desc_parts:
                if len(part) > 1 and part.isalpha():
                    clean_desc.append(part)
                elif part in ['&', 'AND', 'OF', 'TO']:
                    clean_desc.append(part)

                # Stop if we have enough words or hit a delimiter
                if len(clean_desc) >= 4:
                    break

            clean_name = f"{form_code} {' '.join(clean_desc)}"
            return clean_name[:60]  # Limit length

        # Fallback: just clean up the original
        return re.sub(r'[^A-Za-z0-9\-\s&]', ' ', form_no)[:60].strip()

    def get_company_pdfs(self, company_name: str) -> List[Dict]:
        """
        Get all PDFs for a company
        """
        try:
            company_folder = self.base_splits_dir / company_name.lower().replace(" ", "_")
            if not company_folder.exists():
                return []

            pdfs = []
            for pdf_folder in company_folder.iterdir():
                if pdf_folder.is_dir():
                    metadata_path = pdf_folder / "metadata.json"
                    if metadata_path.exists():
                        with open(metadata_path, "r", encoding="utf-8") as f:
                            metadata = json.load(f)

                        pdfs.append({
                            "pdf_name": pdf_folder.name,
                            "total_splits": metadata.get("total_splits", 0),
                            # "upload_id": metadata.get("upload_id"),
                            "original_filename": metadata.get("original_filename"),
                            "method": metadata.get("method", "unknown")
                        })

            return pdfs

        except Exception as e:
            print(f"Error getting company PDFs: {e}")
            return []

    def get_pdf_splits(self, company_name: str, pdf_name: str) -> List[Dict]:
        """
        Get all split files for a specific PDF
        """
        try:
            splits_folder = self.base_splits_dir / \
                company_name.lower().replace(" ", "_") / pdf_name
            metadata_path = splits_folder / "metadata.json"

            if not metadata_path.exists():
                return []

            with open(metadata_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)

            return metadata.get("split_files", [])

        except Exception as e:
            print(f"Error getting PDF splits: {e}")
            return []

    def get_split_file_path(self, company_name: str, pdf_name: str, split_filename: str) -> Optional[str]:
        """
        Get the full path to a specific split file
        """
        try:
            splits_folder = self.base_splits_dir / \
                company_name.lower().replace(" ", "_") / pdf_name
            split_path = splits_folder / split_filename

            if split_path.exists():
                return str(split_path)
            return None

        except Exception as e:
            print(f"Error getting split file path: {e}")
            return None

    def _validate_final_ranges(self, ranges: List[Dict], pdf_path: str) -> List[Dict]:
        """
        Final validation to ensure page ranges are reasonable and don't overlap
        """
        if not ranges:
            return ranges

        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(pdf_path)
            total_pages = len(reader.pages)
        except Exception:
            # If we can't read the PDF, return ranges as-is
            return ranges

        validated = []
        used_pages = set()

        # Sort ranges by start page
        sorted_ranges = sorted(ranges, key=lambda x: x.get("start_page", 0))

        for r in sorted_ranges:
            start_page = r.get("start_page")
            end_page = r.get("end_page")

            if start_page is None or end_page is None:
                continue

            # Check if pages are within PDF bounds
            if start_page < 1 or end_page > total_pages or start_page > end_page:
                print(
                    f"⚠️  Skipping invalid range for {r.get('form_no', 'Unknown')}: {start_page}-{end_page}")
                continue

            # Check for overlaps with already used pages
            range_pages = set(range(start_page, end_page + 1))
            if range_pages & used_pages:
                print(
                    f"⚠️  Skipping overlapping range for {r.get('form_no', 'Unknown')}: {start_page}-{end_page}")
                continue

            # This range is valid
            used_pages.update(range_pages)
            validated.append(r)

        print(
            f"📋 Final validation: {len(validated)}/{len(ranges)} ranges are valid")
        return validated
