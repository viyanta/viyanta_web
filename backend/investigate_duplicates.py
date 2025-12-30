"""
Investigate master_mapping duplicates
"""
from databases.database import engine
from sqlalchemy import text
import pandas as pd

print("=" * 80)
print("INVESTIGATING MASTER_MAPPING DUPLICATES")
print("=" * 80)

# Check one example in detail
with engine.connect() as conn:
    query = text("""
        SELECT 
            id,
            master_name,
            variant_text,
            normalized_text,
            cluster_label,
            company_id,
            form_no
        FROM master_mapping
        WHERE normalized_text = 'amount transferr policyholder account'
        ORDER BY cluster_label, id
    """)
    result = pd.read_sql(query, conn)

    print("\n📊 Example: 'amount transferr policyholder account'")
    print(result.to_string())

    # Check the master_rows for these clusters
    clusters = result['cluster_label'].unique().tolist()
    query = text("""
        SELECT master_row_id, cluster_label, master_name
        FROM master_rows
        WHERE cluster_label IN :clusters
        ORDER BY cluster_label
    """)
    masters = pd.read_sql(query, conn, params={'clusters': tuple(clusters)})

    print("\n🔑 Master rows for these clusters:")
    print(masters.to_string())

    # Check reports_l2_extracted
    query = text("""
        SELECT id, company_id, particulars, normalized_text, master_row_id
        FROM reports_l2_extracted
        WHERE normalized_text = 'amount transferr policyholder account'
        ORDER BY company_id, id
    """)
    extracted = pd.read_sql(query, conn)

    print("\n📄 Extracted rows with this normalized_text:")
    print(extracted.to_string())

print("\n" + "=" * 80)
print("CHECKING IF VARIANTS ARE TRULY DIFFERENT")
print("=" * 80)

# For each duplicated normalized_text, check if the variant_texts are actually different
with engine.connect() as conn:
    query = text("""
        SELECT 
            normalized_text,
            GROUP_CONCAT(DISTINCT variant_text ORDER BY variant_text SEPARATOR ' | ') as variants,
            GROUP_CONCAT(DISTINCT master_name ORDER BY master_name SEPARATOR ' | ') as masters,
            GROUP_CONCAT(DISTINCT cluster_label ORDER BY cluster_label) as clusters
        FROM master_mapping
        WHERE normalized_text IN (
            SELECT normalized_text
            FROM master_mapping
            WHERE normalized_text IS NOT NULL
            GROUP BY normalized_text
            HAVING COUNT(DISTINCT cluster_label) > 1
        )
        GROUP BY normalized_text
        ORDER BY normalized_text
    """)
    result = pd.read_sql(query, conn)

    print(f"\nFound {len(result)} normalized_texts with multiple clusters:")
    for _, row in result.iterrows():
        variants = row['variants'].split(' | ')
        masters = row['masters'].split(' | ')
        clusters = row['clusters']

        print(f"\n📝 {row['normalized_text']}")
        print(f"   Clusters: {clusters}")
        print(f"   Masters ({len(set(masters))} unique):")
        for m in set(masters):
            print(f"     - {m}")
        print(f"   Variants ({len(set(variants))} unique):")
        for v in set(variants):
            print(f"     - {v}")

print("\n" + "=" * 80)
