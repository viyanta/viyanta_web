"""
Correct L-2 Data Extraction from reports_l2 to reports_l2_extracted
====================================================================
This script properly extracts L-2 data by:
1. Reading from reports_l2 table (flat_headers and data_rows columns)
2. Matching flat_headers with data_rows keys (handling space/underscore differences)
3. Using PeriodColumnDetector to map columns correctly
4. Inserting into reports_l2_extracted with proper period mapping
"""
from services.period_column_detector import PeriodColumnDetector
from databases.models import ReportModels, ReportsL2Extracted, Company
from databases.database import SessionLocal
import sys
sys.path.insert(
    0, r'c:\Users\vicky\OneDrive\Desktop\Viyanta-project\viyanta_web\backend')


def normalize_key(text):
    """Normalize header text to match data_rows keys"""
    # Replace spaces with underscores, remove special chars
    return text.replace(' ', '_').replace('.', '').replace('(', '').replace(')', '').replace('-', '_')


def find_matching_key(header, data_row_keys):
    """Find the matching key in data_rows for a given header"""
    # Try exact match first
    if header in data_row_keys:
        return header

    # Try normalized match
    normalized = normalize_key(header)
    if normalized in data_row_keys:
        return normalized

    # Try case-insensitive match
    header_lower = header.lower()
    for key in data_row_keys:
        if key.lower() == header_lower:
            return key
        if normalize_key(key).lower() == normalized.lower():
            return key

    return None


def extract_l2_data_for_company(company_id, company_name, db):
    """Extract L-2 data for a specific company"""
    print(f"\n{'='*80}")
    print(f"Processing: {company_name} (ID: {company_id})")
    print(f"{'='*80}")

    # Get L-2 reports for this company
    l2_model = ReportModels.get('l2')
    reports = db.query(l2_model).filter(
        l2_model.company_id == company_id,
        l2_model.form_no.like('L-2%')
    ).all()

    print(f"Found {len(reports)} L-2 report(s)")

    if not reports:
        return 0

    total_rows_inserted = 0

    for report in reports:
        print(f"\n  Report ID {report.id}: {report.form_no}")

        flat_headers = report.flat_headers
        data_rows = report.data_rows

        if not flat_headers or not data_rows:
            print(f"    ⚠ No headers or data rows")
            continue

        print(f"    Headers: {flat_headers}")

        # Get a sample data row to find actual keys
        if len(data_rows) > 0:
            sample_keys = list(data_rows[0].keys())
            print(f"    Data keys: {sample_keys}")

        # Detect period columns from flat_headers
        period_mapping = PeriodColumnDetector.detect_period_columns(
            flat_headers, verbose=False)

        print(f"    Period Mapping:")
        for key, value in period_mapping.items():
            if value:
                print(f"      {key}: {value}")

        # Create a mapping from flat_headers to data_row keys
        header_to_key_map = {}
        for header in flat_headers:
            matching_key = find_matching_key(header, sample_keys)
            if matching_key:
                header_to_key_map[header] = matching_key
                if header != matching_key:
                    print(f"    Mapping: '{header}' → '{matching_key}'")

        # Extract and insert data
        rows_inserted = 0
        for row in data_rows:
            particulars = row.get('Particulars', '')

            # Try to get schedule with different possible keys
            schedule = (row.get('Schedule_Ref_Form_No') or
                        row.get('Schedule Ref. Form No.') or
                        row.get('Schedule_Ref') or
                        row.get('Schedule') or
                        row.get('Schedules') or '')

            # Skip if no particulars
            if not particulars:
                continue

            # Extract period values using the mapping
            for_current_period = None
            for_previous_period = None
            upto_current_period = None
            upto_previous_period = None

            # Map period columns to actual data keys
            if period_mapping.get('for_current_period'):
                header = period_mapping['for_current_period']
                data_key = header_to_key_map.get(header, header)
                for_current_period = row.get(data_key)

            if period_mapping.get('for_previous_period'):
                header = period_mapping['for_previous_period']
                data_key = header_to_key_map.get(header, header)
                for_previous_period = row.get(data_key)

            if period_mapping.get('upto_current_period'):
                header = period_mapping['upto_current_period']
                data_key = header_to_key_map.get(header, header)
                upto_current_period = row.get(data_key)

            if period_mapping.get('upto_previous_period'):
                header = period_mapping['upto_previous_period']
                data_key = header_to_key_map.get(header, header)
                upto_previous_period = row.get(data_key)

            # Create extracted row
            extracted_row = ReportsL2Extracted(
                report_id=report.id,
                company_id=company_id,
                particulars=particulars,
                schedule=schedule,
                for_current_period=for_current_period,
                for_previous_period=for_previous_period,
                upto_current_period=upto_current_period,
                upto_previous_period=upto_previous_period
            )
            db.add(extracted_row)
            rows_inserted += 1

        db.commit()
        print(f"    ✓ Inserted {rows_inserted} rows")
        total_rows_inserted += rows_inserted

    return total_rows_inserted


def main():
    db = SessionLocal()

    print("="*80)
    print("L-2 Data Extraction from reports_l2 to reports_l2_extracted")
    print("="*80)

    # Companies to process
    companies_to_process = [
        (43, 'ACKO Life'),
        # (71, 'sbi_life'),  # Already has data
        # (56, 'HDFC Life'),
        # (55, 'GO Digit Life'),
        # (65, 'Shriram Life'),
    ]

    total_inserted = 0

    for company_id, company_name in companies_to_process:
        try:
            # Delete existing data for this company
            deleted = db.query(ReportsL2Extracted).filter(
                ReportsL2Extracted.company_id == company_id
            ).delete()
            db.commit()
            print(f"\nDeleted {deleted} existing rows for {company_name}")

            # Extract and insert new data
            inserted = extract_l2_data_for_company(
                company_id, company_name, db)
            total_inserted += inserted

        except Exception as e:
            print(f"\n✗ Error processing {company_name}: {e}")
            import traceback
            traceback.print_exc()
            db.rollback()

    print(f"\n{'='*80}")
    print(f"✓ EXTRACTION COMPLETED")
    print(f"  Total rows inserted: {total_inserted}")
    print(f"{'='*80}")

    # Verify
    print(f"\n{'='*80}")
    print("VERIFICATION")
    print(f"{'='*80}")

    for company_id, company_name in companies_to_process:
        total = db.query(ReportsL2Extracted).filter(
            ReportsL2Extracted.company_id == company_id
        ).count()

        with_data = db.query(ReportsL2Extracted).filter(
            ReportsL2Extracted.company_id == company_id,
            (ReportsL2Extracted.for_current_period.isnot(None)) |
            (ReportsL2Extracted.for_previous_period.isnot(None)) |
            (ReportsL2Extracted.upto_current_period.isnot(None)) |
            (ReportsL2Extracted.upto_previous_period.isnot(None))
        ).count()

        coverage = (with_data / total * 100) if total > 0 else 0

        print(f"\n{company_name}:")
        print(f"  Total rows: {total}")
        print(f"  Rows with data: {with_data}")
        print(f"  Coverage: {coverage:.1f}%")

        # Show sample
        if with_data > 0:
            sample = db.query(ReportsL2Extracted).filter(
                ReportsL2Extracted.company_id == company_id,
                ReportsL2Extracted.for_current_period.isnot(None)
            ).first()

            if sample:
                print(f"  Sample:")
                print(f"    Particulars: {sample.particulars[:60]}...")
                print(f"    For Current: {sample.for_current_period}")
                print(f"    For Previous: {sample.for_previous_period}")
                print(f"    Upto Current: {sample.upto_current_period}")
                print(f"    Upto Previous: {sample.upto_previous_period}")

    db.close()


if __name__ == "__main__":
    main()
