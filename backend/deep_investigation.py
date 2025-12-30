"""
Deep Investigation: Why are particulars mapped to wrong masters?
=================================================================
"""
from databases.database import engine
from sqlalchemy import text

print("\n" + "="*120)
print("🔍 INVESTIGATING THE MISMATCH: Aviva Life Example")
print("="*120)

with engine.connect() as conn:
    # Get a few mismatched rows and trace back to master_mapping
    result = conn.execute(text("""
        SELECT 
            e.id as ext_id,
            e.particulars,
            e.normalized_text as ext_normalized,
            e.master_row_id,
            mr.cluster_label,
            mr.master_name,
            e.row_index
        FROM reports_l2_extracted e
        JOIN reports_l2 r ON e.report_id = r.id
        JOIN master_rows mr ON e.master_row_id = mr.master_row_id
        WHERE r.company = 'aviva_life'
        ORDER BY e.row_index
        LIMIT 20
    """))

    aviva_rows = result.fetchall()

    print(f"\n📋 First 20 Aviva Life rows (ordered by row_index):\n")
    print(f"{'row_idx':<10} {'ext_id':<8} {'master_row_id':<15} {'cluster':<10} {'Particulars':<50} {'Master Name':<50}")
    print(f"{'-'*10} {'-'*8} {'-'*15} {'-'*10} {'-'*50} {'-'*50}")

    for row in aviva_rows:
        ext_id, particulars, norm, master_id, cluster, master_name, row_idx = row
        part_str = (particulars or "")[:48]
        master_str = (master_name or "")[:48]
        match = "✅" if particulars[:20].lower() in master_name.lower(
        ) or master_name[:20].lower() in particulars.lower() else "❌"
        print(f"{match} {row_idx:<8} {ext_id:<8} {master_id:<15} {cluster:<10} {part_str:<50} {master_str:<50}")

    # Now check: Does the master_row_id match what it SHOULD be?
    # Theory: row_index 0 should map to cluster_label 0 (master_row_id 1)
    #         row_index 1 should map to cluster_label 1 (master_row_id 2)
    #         etc.

    print(f"\n" + "="*120)
    print("🔍 THEORY CHECK: Is there an offset pattern?")
    print("="*120)

    print(f"\nExpected mapping (if sequential):")
    print(f"   row_index 0 → cluster 0 → master_row_id 1 → 'Amounts transferred...'")
    print(f"   row_index 1 → cluster 1 → master_row_id 2 → 'Income From Investments'")
    print(f"   row_index 2 → cluster 2 → master_row_id 3 → '(a) Interest...'")
    print(f"   etc.")

    print(f"\nActual mapping (from data above):")
    for i, row in enumerate(aviva_rows[:5]):
        ext_id, particulars, norm, master_id, cluster, master_name, row_idx = row
        print(
            f"   row_index {row_idx} → cluster {cluster} → master_row_id {master_id} → '{master_name[:50]}'")
        print(f"      BUT particulars = '{particulars[:50]}'")

    # Check master_mapping to see what cluster_label Aviva's texts were assigned
    print(f"\n" + "="*120)
    print("🔍 CHECKING master_mapping: What cluster did Aviva texts get?")
    print("="*120)

    result = conn.execute(text("""
        SELECT 
            mm.id,
            mm.variant_text,
            mm.cluster_label,
            mm.master_name,
            mm.company_id
        FROM master_mapping mm
        WHERE mm.company_id = (SELECT id FROM companies WHERE normalized_name = 'aviva_life')
          AND mm.form_no = 'L-2'
        ORDER BY mm.id
        LIMIT 20
    """))

    mappings = result.fetchall()

    if mappings:
        print(f"\n📋 First 20 master_mapping entries for Aviva Life:\n")
        print(f"{'ID':<8} {'cluster':<10} {'Variant Text':<50} {'Master Name':<50}")
        print(f"{'-'*8} {'-'*10} {'-'*50} {'-'*50}")

        for row in mappings:
            mm_id, variant, cluster, master, company = row
            variant_str = (variant or "")[:48]
            master_str = (master or "")[:48]
            print(f"{mm_id:<8} {cluster:<10} {variant_str:<50} {master_str:<50}")
    else:
        print(f"\n⚠️  No master_mapping entries found for Aviva Life!")

    # Final check: What does cluster_label 0 map to in master_rows?
    print(f"\n" + "="*120)
    print("🔍 REFERENCE: master_rows cluster→master mapping")
    print("="*120)

    result = conn.execute(text("""
        SELECT 
            master_row_id,
            cluster_label,
            master_name
        FROM master_rows
        WHERE cluster_label <= 10
        ORDER BY cluster_label
    """))

    masters = result.fetchall()
    print(f"\n{'master_row_id':<15} {'cluster':<10} {'Master Name':<70}")
    print(f"{'-'*15} {'-'*10} {'-'*70}")
    for row in masters:
        print(f"{row[0]:<15} {row[1]:<10} {row[2][:68]}")

print("\n" + "="*120 + "\n")
