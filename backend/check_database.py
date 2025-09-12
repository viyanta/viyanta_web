#!/usr/bin/env python3
"""
Check database storage verification
"""
from databases.models import ExtractedRawData, ExtractedRefinedData
from databases.database import get_db
from services.database_service import *
import os
import sys
import json
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))


def check_database():
    """Check the database for stored records"""
    print("=== CHECKING MYSQL STORAGE ===")
    print()

    # Get database session
    db = next(get_db())

    try:
        # Check raw data
        raw_records = db.query(ExtractedRawData).filter(
            ExtractedRawData.company.like('%real%')
        ).order_by(ExtractedRawData.id.desc()).limit(3).all()

        print(f"📋 Raw Data Records Found: {len(raw_records)}")
        for record in raw_records:
            metadata = json.loads(
                record.form_metadata) if record.form_metadata else {}
            rows = json.loads(record.table_rows) if record.table_rows else []
            print(
                f"  ID: {record.id} | Company: {record.company} | Form: {record.form_no}")
            print(f"  Filename: {record.filename}")
            print(
                f"  Metadata headers: {len(metadata.get('Headers', []))} columns")
            print(f"  Table rows: {len(rows)} rows")
            print(f"  Upload time: {record.uploaded_at}")

            # Show sample data
            if rows:
                print(f"  Sample row: {dict(list(rows[0].items())[:3])}")
            print()

        # Check refined data
        refined_records = db.query(ExtractedRefinedData).filter(
            ExtractedRefinedData.company.like('%real%')
        ).order_by(ExtractedRefinedData.id.desc()).limit(3).all()

        print(f"📋 Refined Data Records Found: {len(refined_records)}")
        for record in refined_records:
            metadata = json.loads(
                record.form_metadata) if record.form_metadata else {}
            rows = json.loads(record.table_rows) if record.table_rows else []
            verification_meta = metadata.get('verification_metadata', {})
            print(
                f"  ID: {record.id} | Company: {record.company} | Form: {record.form_no}")
            print(f"  Filename: {record.filename}")
            print(
                f"  Metadata headers: {len(metadata.get('Headers', []))} columns")
            print(f"  Table rows: {len(rows)} rows")
            print(
                f"  Verification status: {verification_meta.get('verification_status', 'N/A')}")
            print(
                f"  Gemini status: {verification_meta.get('gemini_status', 'N/A')}")
            print(f"  Upload time: {record.uploaded_at}")

            # Show sample data
            if rows:
                print(f"  Sample row: {dict(list(rows[0].items())[:3])}")
            print()

        # Summary
        total_raw = db.query(ExtractedRawData).count()
        total_refined = db.query(ExtractedRefinedData).count()

        print("=== SUMMARY ===")
        print(f"Total raw records in database: {total_raw}")
        print(f"Total refined records in database: {total_refined}")
        print("✅ Database storage verification complete!")

    finally:
        db.close()


if __name__ == "__main__":
    check_database()
