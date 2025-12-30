"""
Find Actual L-2 Forms in reports_l2 Table
"""
import json
from sqlalchemy import text
from databases.database import SessionLocal
import sys
sys.path.insert(
    0, r'c:\Users\vicky\OneDrive\Desktop\Viyanta-project\viyanta_web\backend')


db = SessionLocal()

print("="*80)
print("SEARCHING FOR L-2 FORMS IN reports_l2 TABLE")
print("="*80)

# Find L-2 forms (exactly L-2, not L-20, L-21, L-25, etc.)
query = text("""
    SELECT id, company, company_id, form_no, period, flat_headers, data_rows
    FROM reports_l2
    WHERE form_no IN ('L-2', 'L-2-A', 'L-2-B', 'L-2-A-PL', 'L-2-A-BS')
    ORDER BY company_id, id
""")

result = db.execute(query)
rows = result.fetchall()

print(f"\nFound {len(rows)} L-2 forms in reports_l2 table")

if rows:
    print("\n" + "="*80)
    print("L-2 FORMS DETAILS")
    print("="*80)

    for row in rows:
        id, company, company_id, form_no, period, flat_headers_json, data_rows_json = row

        print(f"\n{'='*80}")
        print(f"ID: {id}")
        print(f"Company: {company} (ID: {company_id})")
        print(f"Form: {form_no}")
        print(f"Period: {period}")

        # Parse flat_headers
        try:
            flat_headers = json.loads(
                flat_headers_json) if flat_headers_json else []
            print(f"\nFlat Headers ({len(flat_headers)} columns):")
            for i, header in enumerate(flat_headers[:10], 1):
                print(f"  {i}. {header}")
            if len(flat_headers) > 10:
                print(f"  ... and {len(flat_headers) - 10} more")
        except:
            print("  ⚠ Could not parse flat_headers")

        # Parse data_rows
        try:
            data_rows = json.loads(data_rows_json) if data_rows_json else []
            print(f"\nData Rows: {len(data_rows)} rows")

            if data_rows:
                # Show first row structure
                first_row = data_rows[0]
                print(f"\nFirst Row Keys:")
                for key in list(first_row.keys())[:10]:
                    value = first_row[key]
                    print(f"  {key}: {value}")

                # Check if keys match headers
                row_keys = set(first_row.keys())
                flat_headers_set = set(flat_headers)

                print(f"\nHeader vs Row Keys Matching:")
                print(f"  Headers count: {len(flat_headers)}")
                print(f"  Row keys count: {len(row_keys)}")
                print(f"  Matching keys: {len(row_keys & flat_headers_set)}")

                if row_keys != flat_headers_set:
                    print(f"\n  ⚠ MISMATCH DETECTED!")
                    only_in_headers = flat_headers_set - row_keys
                    only_in_rows = row_keys - flat_headers_set

                    if only_in_headers:
                        print(f"\n  Only in headers (not in rows):")
                        for h in list(only_in_headers)[:5]:
                            print(f"    - {h}")

                    if only_in_rows:
                        print(f"\n  Only in rows (not in headers):")
                        for r in list(only_in_rows)[:5]:
                            print(f"    - {r}")
        except Exception as e:
            print(f"  ⚠ Could not parse data_rows: {e}")

else:
    print("\n⚠ NO L-2 FORMS FOUND IN reports_l2 TABLE")
    print("\nChecking what forms exist:")

    query2 = text("SELECT DISTINCT form_no FROM reports_l2 ORDER BY form_no")
    result2 = db.execute(query2)
    forms = [r[0] for r in result2.fetchall()]
    print(f"\nForms in reports_l2 table: {forms}")

print("\n" + "="*80)
db.close()
