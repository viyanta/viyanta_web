"""
Debug SBI specific issue
"""
import sys
sys.path.append('.')

from sqlalchemy import text
from databases.database import get_db
import json

db = next(get_db())

# Check SBI report
query = text("""
    SELECT 
        r.id,
        r.company,
        r.flat_headers,
        JSON_LENGTH(r.data_rows) as row_count
    FROM reports_l2 r
    JOIN company c ON c.id = r.company_id
    WHERE c.name LIKE '%SBI%'
""")

result = db.execute(query)
reports = result.fetchall()

print("SBI Reports:")
for r in reports:
    print(f"  ID: {r[0]}, Company: {r[1]}")
    if r[2]:
        headers = json.loads(r[2]) if isinstance(r[2], str) else r[2]
        print(f"  Headers: {headers}")
    else:
        print(f"  Headers: NULL")
    print(f"  Rows: {r[3]}")

# Check extracted rows
query2 = text("""
    SELECT COUNT(*), 
           SUM(CASE WHEN for_current_period IS NOT NULL THEN 1 ELSE 0 END) as with_current,
           SUM(CASE WHEN for_previous_period IS NOT NULL THEN 1 ELSE 0 END) as with_previous
    FROM reports_l2_extracted e
    JOIN company c ON c.id = e.company_id
    WHERE c.name LIKE '%SBI%'
""")

result2 = db.execute(query2)
stats = result2.fetchone()
print(f"\nExtracted rows: {stats[0]}, with current: {stats[1]}, with previous: {stats[2]}")

db.close()
