"""
Add master_row_id Column to reports_l2_extracted
=================================================

This script adds the canonical master_row_id column to reports_l2_extracted
and migrates data from the legacy columns.

Author: Senior Data Engineer
Date: December 2025
"""

from sqlalchemy import create_engine, text
from databases.database import engine


def add_master_row_id_column():
    """Add master_row_id column to reports_l2_extracted"""

    print("\n" + "=" * 80)
    print("📋 Adding master_row_id column to reports_l2_extracted")
    print("=" * 80 + "\n")

    # Check if column already exists
    check_query = text("""
        SELECT COUNT(*) as col_exists
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'reports_l2_extracted'
          AND COLUMN_NAME = 'master_row_id'
    """)

    with engine.connect() as conn:
        result = conn.execute(check_query)
        col_exists = result.scalar()

    if col_exists > 0:
        print("✅ Column 'master_row_id' already exists")
        return

    # Add the column
    print("📝 Adding column 'master_row_id' BIGINT...")

    add_column_query = text("""
        ALTER TABLE reports_l2_extracted
        ADD COLUMN master_row_id BIGINT AFTER normalized_text
    """)

    with engine.begin() as conn:
        conn.execute(add_column_query)

    print("✅ Column added successfully")

    # Optionally migrate data from master_id or legacy_master_row_id
    print("\n📋 Checking existing data...")

    check_data_query = text("""
        SELECT 
            COUNT(*) as total_rows,
            SUM(CASE WHEN master_id IS NOT NULL THEN 1 ELSE 0 END) as has_master_id,
            SUM(CASE WHEN legacy_master_row_id IS NOT NULL THEN 1 ELSE 0 END) as has_legacy
        FROM reports_l2_extracted
    """)

    with engine.connect() as conn:
        result = conn.execute(check_data_query)
        row = result.fetchone()
        print(f"   Total rows: {row[0]}")
        print(f"   Rows with master_id: {row[1]}")
        print(f"   Rows with legacy_master_row_id: {row[2]}")

    print("\n" + "=" * 80)
    print("✅ DONE - master_row_id column added")
    print("=" * 80 + "\n")
    print("⚠️  NOTE: Run migrate_to_canonical_master_rows.py to populate this column")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    add_master_row_id_column()
