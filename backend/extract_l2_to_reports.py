"""
Script to extract L-2 data from reports_l2 table and insert into reports_l2_extracted table.
Handles header-to-data key mapping with flexible matching (spaces, underscores, case).
"""
from datetime import datetime
import json
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, text
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# Database connection
DATABASE_URL = "sqlite:///./backend/viyanta_web.db"
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)


def normalize_key(key):
    """Normalize a key for flexible matching: lowercase, replace spaces with underscores"""
    if not key:
        return ""
    return key.lower().replace(" ", "_").replace("-", "_").strip()


def find_matching_key(header, data_keys):
    """
    Find a matching key in data_keys for the given header.
    Returns the actual key from data_keys, or None if no match.
    """
    normalized_header = normalize_key(header)

    # First try exact match
    if normalized_header in data_keys:
        return normalized_header

    # Try to find by normalized matching
    for key in data_keys:
        if normalize_key(key) == normalized_header:
            return key

    return None


def extract_l2_data(company_id=None, form_name="Form L-2", dry_run=False):
    """
    Extract L-2 data from reports_l2 and insert into reports_l2_extracted.

    Args:
        company_id: If specified, only process this company. Otherwise process all.
        form_name: The form name to filter (default: "Form L-2")
        dry_run: If True, only show what would be inserted without actually inserting
    """
    session = Session()

    try:
        # Build query
        query = """
            SELECT id, company_id, filing_date, period, flat_headers, data_rows, form_name
            FROM reports_l2
            WHERE form_name = :form_name
        """
        params = {"form_name": form_name}

        if company_id:
            query += " AND company_id = :company_id"
            params["company_id"] = company_id

        query += " ORDER BY company_id, filing_date"

        result = session.execute(text(query), params)
        rows = result.fetchall()

        print(f"Found {len(rows)} {form_name} records to process")

        if len(rows) == 0:
            print("No records to process. Exiting.")
            return

        # Track statistics
        stats = {
            "total_records": len(rows),
            "successful_inserts": 0,
            "skipped_records": 0,
            "errors": 0,
            "total_rows_inserted": 0
        }

        for row in rows:
            report_id, comp_id, filing_date, period, flat_headers_json, data_rows_json, form = row

            print(
                f"\n--- Processing Report ID {report_id}, Company {comp_id}, Filing Date {filing_date}, Period {period} ---")

            try:
                # Parse JSON
                flat_headers = json.loads(
                    flat_headers_json) if flat_headers_json else []
                data_rows = json.loads(
                    data_rows_json) if data_rows_json else []

                if not flat_headers or not data_rows:
                    print(f"  Skipping: Empty headers or data rows")
                    stats["skipped_records"] += 1
                    continue

                print(f"  Headers count: {len(flat_headers)}")
                print(f"  Data rows count: {len(data_rows)}")

                # Get all possible keys from data rows (union of all row keys)
                all_data_keys = set()
                for data_row in data_rows:
                    if isinstance(data_row, dict):
                        all_data_keys.update(data_row.keys())

                print(f"  Unique data keys found: {len(all_data_keys)}")

                # Create header to data key mapping
                header_mapping = {}
                unmapped_headers = []

                for header in flat_headers:
                    matching_key = find_matching_key(header, all_data_keys)
                    if matching_key:
                        header_mapping[header] = matching_key
                    else:
                        unmapped_headers.append(header)

                print(
                    f"  Mapped headers: {len(header_mapping)}/{len(flat_headers)}")
                if unmapped_headers:
                    print(
                        f"  Unmapped headers: {unmapped_headers[:5]}{'...' if len(unmapped_headers) > 5 else ''}")

                # Process each data row
                rows_to_insert = []
                for data_row in data_rows:
                    if not isinstance(data_row, dict):
                        continue

                    # Extract values for each header
                    row_data = {
                        "report_id": report_id,
                        "company_id": comp_id,
                        "filing_date": filing_date,
                        "period": period,
                        "form_name": form
                    }

                    # Map headers to values
                    for i, header in enumerate(flat_headers, start=1):
                        col_name = f"value{i}"

                        if header in header_mapping:
                            data_key = header_mapping[header]
                            value = data_row.get(data_key, "")
                        else:
                            value = ""

                        row_data[col_name] = str(
                            value) if value is not None else ""

                    rows_to_insert.append(row_data)

                print(f"  Prepared {len(rows_to_insert)} rows for insertion")

                if dry_run:
                    print(
                        f"  [DRY RUN] Would insert {len(rows_to_insert)} rows")
                    if rows_to_insert:
                        print(f"  Sample row: {rows_to_insert[0]}")
                else:
                    # Insert rows
                    if rows_to_insert:
                        # Build dynamic insert statement
                        sample_row = rows_to_insert[0]
                        columns = list(sample_row.keys())
                        placeholders = [f":{col}" for col in columns]

                        insert_sql = f"""
                            INSERT INTO reports_l2_extracted ({', '.join(columns)})
                            VALUES ({', '.join(placeholders)})
                        """

                        for row in rows_to_insert:
                            session.execute(text(insert_sql), row)

                        session.commit()
                        print(
                            f"  ✓ Successfully inserted {len(rows_to_insert)} rows")
                        stats["successful_inserts"] += 1
                        stats["total_rows_inserted"] += len(rows_to_insert)

            except Exception as e:
                print(f"  ✗ Error processing record: {str(e)}")
                stats["errors"] += 1
                session.rollback()
                continue

        # Print summary
        print("\n" + "="*80)
        print("EXTRACTION SUMMARY")
        print("="*80)
        print(f"Total records processed: {stats['total_records']}")
        print(f"Successful insertions: {stats['successful_inserts']}")
        print(f"Skipped records: {stats['skipped_records']}")
        print(f"Errors: {stats['errors']}")
        print(f"Total rows inserted: {stats['total_rows_inserted']}")
        print("="*80)

    finally:
        session.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Extract L-2 data from reports_l2 to reports_l2_extracted")
    parser.add_argument("--company-id", type=int,
                        help="Process only this company ID")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be inserted without actually inserting")
    parser.add_argument("--form-name", type=str, default="Form L-2",
                        help="Form name to filter (default: Form L-2)")

    args = parser.parse_args()

    print(f"Starting L-2 data extraction...")
    print(
        f"Company ID filter: {args.company_id if args.company_id else 'ALL'}")
    print(f"Form name: {args.form_name}")
    print(f"Dry run: {args.dry_run}")
    print()

    extract_l2_data(
        company_id=args.company_id,
        form_name=args.form_name,
        dry_run=args.dry_run
    )
