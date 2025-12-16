"""
PERMANENT FIX: Auto-populate missing fields for ALL companies
===============================================================
This script ensures ALL reports have:
1. flat_headers populated
2. pages_used set
3. source_pdf set
4. Period columns populated in reports_l2_extracted

Run this script whenever you notice NULL period columns.
It will automatically fix ALL companies, not just specific ones.
"""
import sys
sys.path.append('.')

from sqlalchemy import text
from databases.database import get_db
from services.period_column_detector import PeriodColumnDetector
import json
import traceback

def fix_all_missing_fields():
    """Permanent fix for all missing fields across all companies"""
    db = next(get_db())
    
    try:
        print("=" * 100)
        print("PERMANENT FIX: Auto-populating missing fields for ALL companies")
        print("=" * 100)
        
        # STEP 1: Find ALL reports with NULL or empty flat_headers
        query = text("""
            SELECT 
                r.id as report_id,
                r.company_id,
                c.name as company_name,
                r.data_rows,
                r.pdf_name,
                r.flat_headers
            FROM reports_l2 r
            JOIN company c ON c.id = r.company_id
            WHERE r.flat_headers IS NULL 
                OR r.flat_headers = '[]'
                OR r.flat_headers = ''
        """)
        
        result = db.execute(query)
        reports_to_fix = result.fetchall()
        
        print(f"\n📋 Found {len(reports_to_fix)} reports needing flat_headers")
        
        if len(reports_to_fix) == 0:
            print("✅ All reports already have flat_headers!")
        
        fixed_reports = 0
        fixed_extracted_rows = 0
        
        for report in reports_to_fix:
            report_id = report[0]
            company_id = report[1]
            company_name = report[2]
            data_rows_json = report[3]
            pdf_name = report[4]
            
            try:
                print(f"\n🔧 Fixing Report ID {report_id} ({company_name})...")
                
                # Parse data_rows
                if isinstance(data_rows_json, str):
                    data_rows = json.loads(data_rows_json)
                else:
                    data_rows = data_rows_json
                
                if not data_rows or len(data_rows) == 0:
                    print(f"   ⚠️  No data_rows found, skipping...")
                    continue
                
                # Extract flat_headers from first row (use ACTUAL keys, not stored headers!)
                # This is important because stored headers might have spaces while data has underscores
                if isinstance(data_rows[0], dict):
                    flat_headers = list(data_rows[0].keys())
                    flat_headers_for_storage = flat_headers  # Use actual keys for storage too
                    print(f"   📝 Extracted {len(flat_headers)} headers from data: {flat_headers[:3]}...")
                    
                    # Update reports_l2 with flat_headers, pages_used, source_pdf
                    update_report = text("""
                        UPDATE reports_l2
                        SET flat_headers = :flat_headers,
                            source_pdf = :source_pdf,
                            pages_used = COALESCE(pages_used, 1)
                        WHERE id = :report_id
                    """)
                    
                    db.execute(update_report, {
                        'flat_headers': json.dumps(flat_headers_for_storage),
                        'source_pdf': pdf_name,
                        'report_id': report_id
                    })
                    
                    fixed_reports += 1
                    print(f"   ✅ Updated reports_l2")
                    
                    # STEP 2: Detect period columns
                    period_mapping = PeriodColumnDetector.detect_period_columns(flat_headers, verbose=False)
                    print(f"   🔍 Period mapping: For={period_mapping['for_current_period']}, Previous={period_mapping['for_previous_period']}")
                    
                    # STEP 3: Update ALL extracted rows for this report
                    get_extracted = text("""
                        SELECT id, row_index
                        FROM reports_l2_extracted
                        WHERE report_id = :report_id
                    """)
                    
                    extracted_rows = db.execute(get_extracted, {'report_id': report_id}).fetchall()
                    
                    if len(extracted_rows) == 0:
                        print(f"   ⚠️  No extracted rows found")
                        continue
                    
                    print(f"   📊 Updating {len(extracted_rows)} extracted rows...")
                    
                    rows_updated = 0
                    for ext_row in extracted_rows:
                        ext_id = ext_row[0]
                        row_idx = ext_row[1]
                        
                        if row_idx >= len(data_rows):
                            continue
                        
                        row_data = data_rows[row_idx]
                        
                        # Extract values using detected column names
                        for_current = ""
                        for_previous = ""
                        upto_current = ""
                        upto_previous = ""
                        
                        if period_mapping['for_current_period']:
                            for_current = row_data.get(period_mapping['for_current_period'], "")
                        
                        if period_mapping['for_previous_period']:
                            for_previous = row_data.get(period_mapping['for_previous_period'], "")
                        
                        if period_mapping['upto_current_period']:
                            upto_current = row_data.get(period_mapping['upto_current_period'], "")
                        
                        if period_mapping['upto_previous_period']:
                            upto_previous = row_data.get(period_mapping['upto_previous_period'], "")
                        
                        # Update extracted row
                        update_extracted = text("""
                            UPDATE reports_l2_extracted
                            SET for_current_period = :for_current,
                                for_previous_period = :for_previous,
                                upto_current_period = :upto_current,
                                upto_previous_period = :upto_previous
                            WHERE id = :ext_id
                        """)
                        
                        db.execute(update_extracted, {
                            'for_current': str(for_current).strip() if for_current and str(for_current).strip() else None,
                            'for_previous': str(for_previous).strip() if for_previous and str(for_previous).strip() else None,
                            'upto_current': str(upto_current).strip() if upto_current and str(upto_current).strip() else None,
                            'upto_previous': str(upto_previous).strip() if upto_previous and str(upto_previous).strip() else None,
                            'ext_id': ext_id
                        })
                        
                        rows_updated += 1
                    
                    fixed_extracted_rows += rows_updated
                    print(f"   ✅ Updated {rows_updated} extracted rows")
                    
            except Exception as e:
                print(f"   ❌ Error processing report {report_id}: {e}")
                traceback.print_exc()
                continue
        
        # Commit all changes
        db.commit()
        
        print("\n" + "=" * 100)
        print("✅ PERMANENT FIX COMPLETE!")
        print(f"   Reports fixed: {fixed_reports}")
        print(f"   Extracted rows updated: {fixed_extracted_rows}")
        print("=" * 100)
        
        # Verify the fix
        print("\n📊 VERIFICATION:")
        verify_query = text("""
            SELECT 
                c.name as company_name,
                COUNT(DISTINCT r.id) as reports,
                COUNT(e.id) as extracted_rows,
                SUM(CASE WHEN e.for_current_period IS NOT NULL 
                    OR e.for_previous_period IS NOT NULL 
                    OR e.upto_current_period IS NOT NULL 
                    OR e.upto_previous_period IS NOT NULL THEN 1 ELSE 0 END) as rows_with_values
            FROM company c
            LEFT JOIN reports_l2 r ON r.company_id = c.id
            LEFT JOIN reports_l2_extracted e ON e.report_id = r.id
            WHERE r.form_no LIKE 'L-2%'
            GROUP BY c.id, c.name
            ORDER BY c.name
        """)
        
        result = db.execute(verify_query)
        companies = result.fetchall()
        
        for comp in companies:
            company_name = comp[0]
            reports = comp[1]
            total_rows = comp[2]
            rows_with_values = comp[3]
            percentage = (rows_with_values * 100 // total_rows) if total_rows > 0 else 0
            
            print(f"   {company_name:30s}: {reports} reports, {total_rows} rows, {rows_with_values} with values ({percentage}%)")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ ERROR: {e}")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    fix_all_missing_fields()
