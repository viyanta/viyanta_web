"""
Database service for handling extracted data stora        # Create new record
        refined_data_record = ExtractedRefinedData(
            company=company,
            form_no=form_no,
            filename=filename,
            form_metadata=metadata,  # Store as JSON directly
            table_rows=table_rows  # Store as JSON directly
        )tions
"""
import json
import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from databases.database import get_db
from databases.models import ExtractedRawData, ExtractedRefinedData

logger = logging.getLogger(__name__)


def store_raw_extracted_data(
    company: str,
    form_no: str,
    filename: str,
    extracted_data: Dict[str, Any],
    db: Optional[Session] = None
) -> Optional[int]:
    """
    Store raw extracted data in the extracted_raw_data table.

    Args:
        company: Company name
        form_no: Form number/type
        filename: PDF filename
        extracted_data: The raw extracted data from template-based extraction
        db: Database session (optional, will create new if not provided)

    Returns:
        The ID of the inserted record, or None if insertion failed
    """
    should_close_db = False
    if db is None:
        db = next(get_db())
        should_close_db = True

    try:
        # Separate metadata and table rows from the extracted data
        instances = extracted_data.get("instances", [])
        if instances:
            first_instance = instances[0]
            metadata = {
                "Form": first_instance.get("Form"),
                "Title": first_instance.get("Title"),
                "Period": first_instance.get("Period"),
                "PagesUsed": first_instance.get("PagesUsed"),
                "Headers": first_instance.get("Headers", [])
            }
            table_rows = first_instance.get("Rows", [])
        else:
            metadata = {}
            table_rows = []

        # Create new record
        raw_data_record = ExtractedRawData(
            company=company,
            form_no=form_no,
            filename=filename,
            form_metadata=metadata,  # Store as JSON directly
            table_rows=table_rows  # Store as JSON directly
        )

        db.add(raw_data_record)
        db.commit()
        db.refresh(raw_data_record)

        logger.info(
            f"Stored raw extracted data for {company}/{form_no}/{filename} with ID: {raw_data_record.id}")
        return raw_data_record.id

    except Exception as e:
        logger.error(f"Error storing raw extracted data: {e}")
        db.rollback()
        return None
    finally:
        if should_close_db:
            db.close()


def store_refined_extracted_data(
    company: str,
    form_no: str,
    filename: str,
    verified_data: Dict[str, Any],
    db: Optional[Session] = None
) -> Optional[int]:
    """
    Store refined/verified extracted data in the extracted_refined_data table.

    Args:
        company: Company name
        form_no: Form number/type
        filename: PDF filename
        verified_data: The Gemini-verified and refined data
        db: Database session (optional, will create new if not provided)

    Returns:
        The ID of the inserted record, or None if insertion failed
    """
    should_close_db = False
    if db is None:
        db = next(get_db())
        should_close_db = True

    try:
        # Separate metadata and table rows from the verified data
        instances = verified_data.get("instances", [])
        if instances:
            first_instance = instances[0]
            metadata = {
                "Form": first_instance.get("Form"),
                "Title": first_instance.get("Title"),
                "Period": first_instance.get("Period"),
                "PagesUsed": first_instance.get("PagesUsed"),
                "Headers": first_instance.get("Headers", []),
                "verification_metadata": verified_data.get("verification_metadata", {})
            }
            table_rows = first_instance.get("Rows", [])
        else:
            metadata = verified_data.get("verification_metadata", {})
            table_rows = []

        # Create new record
        refined_data_record = ExtractedRefinedData(
            company=company,
            form_no=form_no,
            filename=filename,
            form_metadata=metadata,  # Store as JSON directly
            table_rows=table_rows  # Store as JSON directly
        )

        db.add(refined_data_record)
        db.commit()
        db.refresh(refined_data_record)

        logger.info(
            f"Stored refined extracted data for {company}/{form_no}/{filename} with ID: {refined_data_record.id}")
        return refined_data_record.id

    except Exception as e:
        logger.error(f"Error storing refined extracted data: {e}")
        db.rollback()
        return None
    finally:
        if should_close_db:
            db.close()


def check_gemini_api_health() -> Dict[str, Any]:
    """
    Check if Gemini API is available and working.

    Returns:
        Dictionary with health status information
    """
    import os
    import requests
    from dotenv import load_dotenv

    load_dotenv()

    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return {
            "status": "unavailable",
            "reason": "API key not configured",
            "available": False
        }

    try:
        # Simple test request to check API availability
        api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent"
        headers = {'Content-Type': 'application/json'}

        payload = {
            "contents": [{
                "parts": [{
                    "text": "Test"
                }]
            }],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 10,
            }
        }

        response = requests.post(
            f"{api_url}?key={api_key}",
            headers=headers,
            json=payload,
            timeout=10
        )

        if response.status_code == 200:
            return {
                "status": "available",
                "reason": "API responded successfully",
                "available": True,
                "response_code": response.status_code
            }
        else:
            return {
                "status": "error",
                "reason": f"API returned status {response.status_code}",
                "available": False,
                "response_code": response.status_code,
                "error_text": response.text[:200]  # First 200 chars of error
            }

    except requests.exceptions.Timeout:
        return {
            "status": "timeout",
            "reason": "API request timed out",
            "available": False
        }
    except requests.exceptions.RequestException as e:
        return {
            "status": "connection_error",
            "reason": f"Connection error: {str(e)[:100]}",
            "available": False
        }
    except Exception as e:
        return {
            "status": "unknown_error",
            "reason": f"Unknown error: {str(e)[:100]}",
            "available": False
        }
