"""
Identify Logical Mismatches in Aviva Life Mappings
===================================================

Find cases where the particulars doesn't logically match the assigned master_name
"""
from databases.database import engine
from sqlalchemy import text
from difflib import SequenceMatcher


def similarity(a, b):
    """Calculate similarity ratio between two strings"""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


with engine.connect() as conn:
    print("\n" + "="*120)
    print("🔍 LOGICAL MISMATCH DETECTION - Aviva Life")
    print("="*120)

    result = conn.execute(text("""
        SELECT 
            e.id,
            e.particulars,
            e.master_row_id,
            mr.cluster_label,
            mr.master_name
        FROM reports_l2_extracted e
        JOIN reports_l2 r ON e.report_id = r.id
        JOIN master_rows mr ON e.master_row_id = mr.master_row_id
        WHERE r.company = 'aviva_life'
        ORDER BY e.id
    """))

    aviva_data = result.fetchall()

    print(
        f"\n📋 Checking {len(aviva_data)} Aviva Life mappings for logical correctness...")
    print(f"\nLooking for cases where particulars and master_name are very different...\n")

    mismatches = []
    good_matches = []

    for row in aviva_data:
        ext_id, particulars, master_id, cluster, master_name = row

        if particulars and master_name:
            sim = similarity(particulars, master_name)

            # Consider it a mismatch if similarity is less than 30%
            if sim < 0.3:
                mismatches.append(
                    (ext_id, particulars, master_id, cluster, master_name, sim))
            else:
                good_matches.append(
                    (ext_id, particulars, master_id, cluster, master_name, sim))

    if mismatches:
        print(f"⚠️  FOUND {len(mismatches)} POTENTIAL MISMATCHES:")
        print(f"\n{'ID':<6} {'master_row':<12} {'Cluster':<10} {'Similarity':<12} {'Particulars':<50} {'Master Name':<50}")
        print(f"{'-'*6} {'-'*12} {'-'*10} {'-'*12} {'-'*50} {'-'*50}")

        for ext_id, particulars, master_id, cluster, master_name, sim in sorted(mismatches, key=lambda x: x[5]):
            particulars_str = (particulars or "")[:48]
            master_name_str = (master_name or "")[:48]
            print(
                f"{ext_id:<6} {master_id:<12} {cluster:<10} {sim*100:>10.1f}%  {particulars_str:<50} {master_name_str:<50}")

        print(f"\n" + "="*120)
        print("🔍 DETAILED MISMATCH ANALYSIS")
        print("="*120)

        print("\nThese mappings appear INCORRECT based on semantic similarity:")
        print("The 'Particulars' text doesn't match the 'Master Name' it's mapped to.\n")

        for i, (ext_id, particulars, master_id, cluster, master_name, sim) in enumerate(mismatches[:15], 1):
            print(f"\n{i}. Row ID {ext_id}:")
            print(f"   Particulars:  '{particulars}'")
            print(
                f"   → Mapped to master_row_id {master_id} (cluster {cluster})")
            print(f"   → Master Name: '{master_name}'")
            print(f"   → Similarity: {sim*100:.1f}% ❌ TOO LOW!")

    else:
        print(f"✅ No obvious mismatches found!")

    print(f"\n" + "="*120)
    print(f"✅ GOOD MATCHES: {len(good_matches)} (similarity >= 30%)")
    print(f"❌ MISMATCHES: {len(mismatches)} (similarity < 30%)")
    print("="*120)

    if mismatches:
        print(f"\n⚠️  ACTION REQUIRED:")
        print(
            f"   The {len(mismatches)} mismatched rows need to be re-mapped to the correct master_row_id.")
        print(f"   This suggests the clustering or mapping logic may have an offset or ordering issue.")
    else:
        print(f"\n✅ All mappings appear logically correct!")

    print()
