"""
Simple Master Mapping Runner
=============================
"""

from services.master_row_mapping_service import run_targeted_master_mapping
from databases.database import engine
from sqlalchemy import text

print("\n" + "="*100)
print("🗺️  CREATING MASTER MAPPINGS FOR EXISTING DATA")
print("="*100)

# Get unmapped reports
with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT DISTINCT r.id, r.company_id, r.form_no, r.pdf_name
        FROM reports_l2 r
        JOIN reports_l2_extracted re ON r.id = re.report_id
        WHERE re.master_row_id IS NULL
        ORDER BY r.id
    """))
    reports = result.fetchall()

print(f"\nFound {len(reports)} reports with unmapped data")

for report_id, company_id, form_no, pdf_name in reports:
    print(f"\n📍 Processing: {pdf_name}")
    print(
        f"   Company ID: {company_id}, Report ID: {report_id}, Form: {form_no}")

    try:
        result = run_targeted_master_mapping(
            company_id=company_id,
            report_ids=[report_id],
            form_code=form_no
        )

        if result['success']:
            print(f"   ✅ Success! Mapped {result['rows_mapped']} rows")
        else:
            print(f"   ❌ Failed: {result.get('error', 'Unknown error')}")

    except Exception as e:
        print(f"   ❌ Error: {e}")

# Check final state
print("\n" + "="*100)
print("📊 FINAL STATE")
print("="*100)

with engine.connect() as conn:
    result = conn.execute(text(
        "SELECT COUNT(*) FROM reports_l2_extracted WHERE master_row_id IS NOT NULL"))
    mapped = result.scalar()

    result = conn.execute(text("SELECT COUNT(*) FROM reports_l2_extracted"))
    total = result.scalar()

    result = conn.execute(text("SELECT COUNT(*) FROM master_rows"))
    masters = result.scalar()

    print(f"\nMapped rows:     {mapped}/{total} ({mapped*100.0/total:.1f}%)")
    print(f"Master rows:     {masters}")

    if mapped == total:
        print("\n✅ All data successfully mapped!")
    else:
        print(f"\n⚠️  Still have {total-mapped} unmapped rows")
