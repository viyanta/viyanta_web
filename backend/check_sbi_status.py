import sqlite3

conn = sqlite3.connect('viyanta_web.db')
cursor = conn.cursor()

# Check SBI data
cursor.execute('''
    SELECT id, report_id, company_id, particulars, 
           for_current_period, upto_current_period, 
           for_previous_period, upto_previous_period
    FROM reports_l2_extracted 
    WHERE company_id = 64 
    LIMIT 20
''')

rows = cursor.fetchall()

print('SBI Data (company_id=64):')
print('ID | Report | Company | Particulars | For Current | Upto Current | For Previous | Upto Previous')
print('-' * 150)

for r in rows:
    particulars = r[3][:40] if r[3] else 'NULL'
    print(f'{r[0]} | {r[1]} | {r[2]} | {particulars:40s} | {str(r[4]):12s} | {str(r[5]):12s} | {str(r[6]):12s} | {str(r[7]):12s}')

# Count NULL period columns
cursor.execute('''
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN for_current_period IS NULL AND upto_current_period IS NULL 
                  AND for_previous_period IS NULL AND upto_previous_period IS NULL 
            THEN 1 ELSE 0 END) as all_null,
        SUM(CASE WHEN particulars NOT LIKE '%:%' THEN 1 ELSE 0 END) as data_rows
    FROM reports_l2_extracted 
    WHERE company_id = 64
''')

stats = cursor.fetchone()
print(f'\n\nSBI Statistics:')
print(f'Total rows: {stats[0]}')
print(f'Rows with all period columns NULL: {stats[1]}')
print(f'Data rows (not section headers): {stats[2]}')

conn.close()
