"""
Comprehensive Fix for ACKO Life and All Companies Data Storage
================================================================

This script will:
1. Check the column mapping logic issue
2. Create a proper company name mapping 
3. Generate SQL queries to compare all companies
4. Fix any data storage issues
"""

from sqlalchemy import text
from databases.database import engine
import json

print("=" * 100)
print("COMPREHENSIVE DATABASE FIX FOR L-2 DATA")
print("=" * 100)

# 1. Check Current State
print("\n1. CURRENT STATE OF DATABASE")
print("-" * 100)

# Check all companies with L-2 data
query = """
SELECT 
    c.id,
    c.name,
    COUNT(DISTINCT r.id) as reports,
    COUNT(e.id) as extracted_rows,
    SUM(CASE WHEN e.for_current_period IS NOT NULL THEN 1 ELSE 0 END) as rows_with_data
FROM company c
LEFT JOIN reports_l2 r ON c.id = r.company_id
LEFT JOIN reports_l2_extracted e ON r.id = e.report_id
GROUP BY c.id, c.name
HAVING reports > 0
ORDER BY c.name
"""

with engine.connect() as conn:
    result = conn.execute(text(query))
    rows = result.fetchall()

    print(f"\n{'ID':<5} {'Company Name':<30} {'Reports':<10} {'Total Rows':<12} {'Rows w/ Data':<15}")
    print("-" * 100)

    for row in rows:
        print(f"{row[0]:<5} {row[1]:<30} {row[2]:<10} {row[3]:<12} {row[4]:<15}")

# 2. Check Reports Summary
print("\n\n2. REPORTS SUMMARY")
print("-" * 100)

query = """
SELECT 
    r.id,
    c.name as company,
    r.period,
    r.pdf_name,
    COUNT(e.id) as rows,
    SUM(CASE WHEN e.for_current_period IS NOT NULL THEN 1 ELSE 0 END) as populated
FROM reports_l2 r
JOIN company c ON r.company_id = c.id
LEFT JOIN reports_l2_extracted e ON r.id = e.report_id
GROUP BY r.id, c.name, r.period, r.pdf_name
ORDER BY r.id DESC
LIMIT 10
"""

with engine.connect() as conn:
    result = conn.execute(text(query))
    rows = result.fetchall()

    print(f"\n{'ID':<5} {'Company':<25} {'Period':<40} {'Rows':<6} {'Populated':<10}")
    print("-" * 100)

    for row in rows:
        pdf = row[3][:30] + "..." if len(row[3]) > 30 else row[3]
        print(
            f"{row[0]:<5} {row[1]:<25} {row[2][:40]:<40} {row[4]:<6} {row[5]:<10}")

# 3. Generate Comparison Query
print("\n\n3. CROSS-COMPANY COMPARISON QUERIES")
print("-" * 100)

print("""
-- Query 1: Compare TOTAL (A) across all companies
SELECT 
    c.name as company,
    r.period,
    e.particulars,
    e.upto_current_period as current_value,
    e.upto_previous_period as previous_value
FROM reports_l2_extracted e
JOIN reports_l2 r ON e.report_id = r.id
JOIN company c ON r.company_id = c.id
WHERE e.particulars LIKE '%TOTAL (A)%'
ORDER BY c.name, r.period;

-- Query 2: Compare specific row across companies (e.g., master_row_id = 7)
SELECT 
    c.name as company,
    r.period,
    e.particulars,
    e.master_row_id,
    e.upto_current_period
FROM reports_l2_extracted e
JOIN reports_l2 r ON e.report_id = r.id
JOIN company c ON r.company_id = c.id
WHERE e.master_row_id = 7  -- TOTAL (A)
ORDER BY c.name, r.period;

-- Query 3: Compare all companies latest period
SELECT 
    c.name as company,
    MAX(r.period) as latest_period,
    COUNT(e.id) as total_rows,
    SUM(CASE WHEN e.upto_current_period IS NOT NULL AND e.upto_current_period != '' THEN 1 ELSE 0 END) as filled_rows
FROM reports_l2 r
JOIN company c ON r.company_id = c.id
LEFT JOIN reports_l2_extracted e ON r.id = e.report_id
GROUP BY c.name
ORDER BY c.name;

-- Query 4: Get complete P&L for specific company and period
SELECT 
    e.row_index,
    e.particulars,
    e.for_current_period,
    e.upto_current_period,
    e.for_previous_period,
    e.upto_previous_period,
    e.master_row_id
FROM reports_l2_extracted e
JOIN reports_l2 r ON e.report_id = r.id
JOIN company c ON r.company_id = c.id
WHERE c.name = 'ACKO Life'
  AND r.period LIKE '%2023%'
ORDER BY e.row_index;
""")

# 4. Company Name Mapping
print("\n\n4. COMPANY NAME VARIATIONS")
print("-" * 100)

company_variations = {
    'acko': ['acko life', 'ACKO Life', 'Acko Life'],
    'aditya_birla': ['aditya birla sun life', 'Aditya Birla Sun Life', 'Aditya Birla Life'],
    'ageas': ['ageas federal life', 'Ageas Federal Life'],
    'aviva': ['aviva life', 'AVIVA Life', 'Aviva Life'],
    'axis': ['axis max life', 'AXIS Max Life', 'Axis Life'],
    'bajaj': ['bajaj allianz', 'Bajaj Allianz', 'BAJAJ Allianz', 'Bajaj Allianz Life'],
    'bandhan': ['bandhan life', 'Bandhan Life'],
    'bharti_axa': ['bharti axa life', 'Bharti Axa Life', 'Bharti AXA Life'],
    'canara_hsbc': ['canara hsbc life', 'Canara HSBC Life', 'Canara Hsbc Life'],
    'creditaccess': ['creditaccess life', 'CreditAccess Life'],
    'edelweiss': ['edelweiss life', 'Edelweiss Life'],
    'generali': ['generali central', 'Generali Central Life'],
    'go_digit': ['go digit life', 'Go Digit Life'],
    'hdfc': ['hdfc', 'HDFC Life', 'Hdfc Life'],
    'icici': ['icici', 'ICICI Prudential', 'ICICI Prudential Life'],
    'indiafirst': ['indiafirst life', 'India First Life', 'IndiaFirst Life'],
    'kotak': ['kotak life', 'Kotak Life'],
    'lic': ['lic of india', 'LIC', 'LIC of India'],
    'pnb_metlife': ['pnb metlife', 'PNB Metlife', 'PNB MetLife'],
    'pramerica': ['pramerica life', 'Pramerica Life'],
    'reliance_nippon': ['reliance nippon life', 'Reliance Nippon Life'],
    'sbi': ['sbi life', 'SBI Life', 'SBI Life Insurance'],
    'shriram': ['shriram life', 'Shriram Life'],
    'starunion_daichi': ['starunion daichi life', 'StarUnion Daichi Life', 'Star Union Daichi Life'],
    'tata_aig': ['tata aig life', 'Tata AIG Life']
}

print("\nCompany Key -> Possible Names in Database/PDFs")
print("-" * 100)
for key, names in sorted(company_variations.items()):
    print(f"{key:<20}: {', '.join(names)}")

# 5. Check Header Mapping Issue
print("\n\n5. HEADER MAPPING ANALYSIS")
print("-" * 100)

print("""
The issue is that JSON headers like:
  - For_the_Quarter_Dec_23
  - Up_to_the_Quarter_Dec_23
  - For_the_Corresponding_Quarter_of_the_Previous_Year_Dec_22
  - Up_to_the_Corresponding_Quarter_of_the_Previous_Year_Dec_22

Need to be mapped to database columns:
  - for_current_period
  - upto_current_period
  - for_previous_period
  - upto_previous_period

The mapping logic should look for keywords:
  - "Quarter" OR "Period" OR "Month" -> current/previous period
  - "Up to" OR "Upto" OR "Cumulative" -> upto columns
  - "Previous Year" OR "Corresponding" OR "Last Year" -> previous columns
""")

print("\n=" * 100)
print("END OF ANALYSIS")
print("=" * 100)
