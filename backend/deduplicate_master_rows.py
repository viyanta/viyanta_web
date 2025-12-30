"""
Deduplicate Master Rows
========================

This script identifies and merges duplicate master_name entries in the master_rows table.
It ensures that each unique financial line item (e.g., "Income From Investments") 
has exactly ONE canonical master_row_id, shared across all companies.

What it does:
1. Find duplicate master_names in master_rows
2. For each duplicate, keep the FIRST one (lowest master_row_id)
3. Update all references in reports_l2_extracted to use the kept master_row_id
4. Update all references in master_mapping to use the kept cluster_label
5. Delete the duplicate master_row entries

Author: Senior Data Engineer
Date: December 28, 2025
"""

from databases.database import engine
from sqlalchemy import text
from tqdm import tqdm


def analyze_duplicates():
    """Analyze duplicate master_names"""
    print("\n" + "="*100)
    print("🔍 ANALYZING DUPLICATE MASTER NAMES")
    print("="*100)

    with engine.connect() as conn:
        # Find duplicates
        result = conn.execute(text("""
            SELECT 
                master_name,
                COUNT(*) as cnt,
                GROUP_CONCAT(master_row_id ORDER BY master_row_id) as ids,
                GROUP_CONCAT(cluster_label ORDER BY cluster_label) as clusters
            FROM master_rows
            GROUP BY master_name
            HAVING COUNT(*) > 1
            ORDER BY cnt DESC, master_name
        """))

        duplicates = result.fetchall()

        if not duplicates:
            print("\n✅ No duplicates found!")
            return []

        print(f"\n❌ Found {len(duplicates)} duplicate master names:")
        print(f"\n{'Master Name':<60} {'Count':<8} {'IDs':<30}")
        print("-" * 100)

        dedup_plan = []

        for row in duplicates:
            master_name, count, ids_str, clusters_str = row
            ids = [int(x) for x in ids_str.split(',')]
            clusters = [int(x) for x in clusters_str.split(',')]

            # Keep the FIRST (lowest) master_row_id
            keep_id = ids[0]
            keep_cluster = clusters[0]
            remove_ids = ids[1:]
            remove_clusters = clusters[1:]

            print(f"{master_name[:60]:<60} {count:<8} {ids_str:<30}")

            dedup_plan.append({
                'master_name': master_name,
                'keep_id': keep_id,
                'keep_cluster': keep_cluster,
                'remove_ids': remove_ids,
                'remove_clusters': remove_clusters
            })

        print(f"\n📊 Deduplication Plan:")
        print(f"   Total duplicates to merge: {len(duplicates)}")
        print(
            f"   Total master_rows to remove: {sum(len(d['remove_ids']) for d in dedup_plan)}")

        return dedup_plan


def deduplicate_master_rows():
    """Deduplicate master_rows table"""
    print("\n" + "="*100)
    print("🔧 DEDUPLICATING MASTER ROWS")
    print("="*100)

    # Step 1: Analyze
    dedup_plan = analyze_duplicates()

    if not dedup_plan:
        print("\n✅ No deduplication needed!")
        return

    # Step 2: Confirm
    print("\n" + "="*100)
    print("⚠️  THIS WILL MODIFY THE DATABASE")
    print("="*100)
    print("\nWhat will happen:")
    print("  1. For each duplicate master_name, keep the FIRST master_row_id")
    print("  2. Update reports_l2_extracted to use the kept master_row_id")
    print("  3. Update master_mapping to use the kept cluster_label")
    print("  4. Delete duplicate master_row entries")
    print()

    confirm = input("Proceed? (yes/no): ").strip().lower()
    if confirm != 'yes':
        print("\n❌ Deduplication cancelled.")
        return

    # Step 3: Execute deduplication
    print("\n" + "="*100)
    print("🔄 EXECUTING DEDUPLICATION")
    print("="*100)

    with engine.begin() as conn:
        for plan in tqdm(dedup_plan, desc="Processing duplicates"):
            master_name = plan['master_name']
            keep_id = plan['keep_id']
            keep_cluster = plan['keep_cluster']
            remove_ids = plan['remove_ids']
            remove_clusters = plan['remove_clusters']

            print(f"\n  🔧 Merging: {master_name[:60]}")
            print(
                f"     Keep: master_row_id={keep_id}, cluster_label={keep_cluster}")
            print(
                f"     Remove: master_row_ids={remove_ids}, cluster_labels={remove_clusters}")

            # Update reports_l2_extracted: point all removed IDs to the kept ID
            if remove_ids:
                remove_ids_str = ','.join(map(str, remove_ids))
                result = conn.execute(text(f"""
                    UPDATE reports_l2_extracted
                    SET master_row_id = {keep_id}
                    WHERE master_row_id IN ({remove_ids_str})
                """))
                print(
                    f"       ✅ Updated {result.rowcount} rows in reports_l2_extracted")

            # Update master_mapping: point all removed cluster_labels to the kept cluster_label
            if remove_clusters:
                remove_clusters_str = ','.join(map(str, remove_clusters))
                result = conn.execute(text(f"""
                    UPDATE master_mapping
                    SET cluster_label = {keep_cluster},
                        master_name = :master_name
                    WHERE cluster_label IN ({remove_clusters_str})
                """), {'master_name': master_name})
                print(
                    f"       ✅ Updated {result.rowcount} mappings in master_mapping")

            # Delete duplicate master_rows
            if remove_ids:
                remove_ids_str = ','.join(map(str, remove_ids))
                result = conn.execute(text(f"""
                    DELETE FROM master_rows
                    WHERE master_row_id IN ({remove_ids_str})
                """))
                print(
                    f"       ✅ Deleted {result.rowcount} duplicate master_rows")

    # Step 4: Verify
    print("\n" + "="*100)
    print("✅ DEDUPLICATION COMPLETE - VERIFYING")
    print("="*100)

    with engine.connect() as conn:
        # Check for remaining duplicates
        result = conn.execute(text("""
            SELECT COUNT(*)
            FROM (
                SELECT master_name, COUNT(*) as cnt
                FROM master_rows
                GROUP BY master_name
                HAVING COUNT(*) > 1
            ) as dupes
        """))
        remaining_dupes = result.scalar()

        # Get statistics
        result = conn.execute(text("""
            SELECT 
                COUNT(*) as total_rows,
                COUNT(DISTINCT master_name) as unique_names,
                COUNT(DISTINCT master_row_id) as unique_ids,
                COUNT(DISTINCT cluster_label) as unique_clusters
            FROM master_rows
        """))
        row = result.fetchone()
        total, unique_names, unique_ids, unique_clusters = row

        print(f"\n📊 Post-Deduplication Statistics:")
        print(f"   Total rows:                   {total}")
        print(f"   Unique master_names:          {unique_names}")
        print(f"   Unique master_row_ids:        {unique_ids}")
        print(f"   Unique cluster_labels:        {unique_clusters}")
        print(f"   Remaining duplicates:         {remaining_dupes}")

        if remaining_dupes == 0 and total == unique_names:
            print(f"\n✅ Perfect! Each master_name is now unique!")
        else:
            print(f"\n⚠️  Still have duplicates or mismatches!")


if __name__ == "__main__":
    deduplicate_master_rows()
