"""
Force fix for SBI - populate period columns even though flat_headers exists
"""
import sys
sys.path.append('.')

from sqlalchemy import text
from databases.database import get_db
from services.period_column_detector import PeriodColumnDetector
import json

db = next(get_db())

try:
    # Get SBI report
    query = text("""
        SELECT 
            r.id,
            r.data_rows,
            r.flat_headers
        FROM reports_l2 r
        JOIN company c ON c.id = r.company_id
        WHERE c.name LIKE '%SBI%'
    """)
    
    result = db.execute(query)
    report = result.fetchone()
    
    if not report:
        print("No SBI report found")
        exit(1)
    
    report_id = report[0]
    data_rows = json.loads(report[1]) if isinstance(report[1], str) else report[1]
    flat_headers_stored = json.loads(report[2]) if isinstance(report[2], str) else report[2]
    
    # Use actual keys from data_rows instead of stored headers (they might have underscores)
    if data_rows and len(data_rows) > 0:
        flat_headers = list(data_rows[0].keys())
    else:
        flat_headers = flat_headers_stored
    
    print(f"Report ID: {report_id}")
    print(f"Stored Headers: {flat_headers_stored}")
    print(f"Actual Data Keys: {flat_headers}")
    print(f"Data rows: {len(data_rows)}")
    
    # Detect period columns using ACTUAL keys
    period_mapping = PeriodColumnDetector.detect_period_columns(flat_headers, verbose=True)
    
    print(f"\nPeriod mapping:")
    print(f"  for_current_period: {period_mapping['for_current_period']}")
    print(f"  for_previous_period: {period_mapping['for_previous_period']}")
    print(f"  upto_current_period: {period_mapping['upto_current_period']}")
    print(f"  upto_previous_period: {period_mapping['upto_previous_period']}")
    
    # Get extracted rows
    query2 = text("""
        SELECT id, row_index
        FROM reports_l2_extracted
        WHERE report_id = :report_id
    """)
    
    extracted_rows = db.execute(query2, {'report_id': report_id}).fetchall()
    print(f"\nUpdating {len(extracted_rows)} extracted rows...")
    
    updated = 0
    for i, ext_row in enumerate(extracted_rows):
        ext_id = ext_row[0]
        row_idx = ext_row[1]
        
        if row_idx >= len(data_rows):
            continue
        
        row_data = data_rows[row_idx]
        
        # Extract values
        for_current = row_data.get(period_mapping['for_current_period'], "") if period_mapping['for_current_period'] else ""
        for_previous = row_data.get(period_mapping['for_previous_period'], "") if period_mapping['for_previous_period'] else ""
        upto_current = row_data.get(period_mapping['upto_current_period'], "") if period_mapping['upto_current_period'] else ""
        upto_previous = row_data.get(period_mapping['upto_previous_period'], "") if period_mapping['upto_previous_period'] else ""
        
        if i == 0:  # Debug first row
            print(f"\nFirst row data sample:")
            print(f"  Row data keys: {list(row_data.keys())}")
            print(f"  upto_current value: '{upto_current}'")
            print(f"  upto_previous value: '{upto_previous}'")
        
        # Update
        update_query = text("""
            UPDATE reports_l2_extracted
            SET for_current_period = :for_current,
                for_previous_period = :for_previous,
                upto_current_period = :upto_current,
                upto_previous_period = :upto_previous
            WHERE id = :ext_id
        """)
        
        db.execute(update_query, {
            'for_current': str(for_current).strip() if for_current and str(for_current).strip() else None,
            'for_previous': str(for_previous).strip() if for_previous and str(for_previous).strip() else None,
            'upto_current': str(upto_current).strip() if upto_current and str(upto_current).strip() else None,
            'upto_previous': str(upto_previous).strip() if upto_previous and str(upto_previous).strip() else None,
            'ext_id': ext_id
        })
        
        # Count if ANY value was set
        has_value = False
        if for_current and str(for_current).strip():
            has_value = True
        if for_previous and str(for_previous).strip():
            has_value = True
        if upto_current and str(upto_current).strip():
            has_value = True
        if upto_previous and str(upto_previous).strip():
            has_value = True
        
        if has_value:
            updated += 1
    
    db.commit()
    print(f"✅ Updated {updated} rows with values")
    
finally:
    db.close()
