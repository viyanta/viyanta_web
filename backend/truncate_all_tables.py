"""
Truncate All Mapping and Report Tables
=======================================

This script safely truncates all mapping and report tables in the correct order
to avoid foreign key constraint violations.

⚠️ WARNING: This will DELETE ALL DATA from:
- reports_l2_extracted (all extracted financial data)
- reports_l2 (all L-2 reports)
- master_mapping (all mappings)
- master_rows (all canonical masters)

Author: Senior Data Engineer
Date: December 28, 2025
"""

from databases.database import engine
from sqlalchemy import text


def truncate_tables():
    """Truncate all mapping and report tables"""
    print("\n" + "="*100)
    print("⚠️  TRUNCATE TABLES - COMPLETE DATA RESET")
    print("="*100)

    print("\nThis will DELETE ALL DATA from:")
    print("  ❌ reports_l2_extracted (all extracted financial data)")
    print("  ❌ reports_l2 (all L-2 reports)")
    print("  ❌ master_mapping (all mappings)")
    print("  ❌ master_rows (all canonical masters)")
    print()
    print("⚠️  THIS CANNOT BE UNDONE!")
    print()

    confirm = input(
        "Are you ABSOLUTELY SURE you want to proceed? (type 'YES' to confirm): ").strip()
    if confirm != 'YES':
        print("\n❌ Truncate cancelled.")
        return

    print("\n" + "="*100)
    print("🗑️  TRUNCATING TABLES")
    print("="*100)

    with engine.begin() as conn:
        # Disable foreign key checks temporarily
        print("\n  1️⃣  Disabling foreign key checks...")
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
        print("     ✅ Foreign key checks disabled")

        # Truncate in order (child tables first to avoid FK issues)
        print("\n  2️⃣  Truncating reports_l2_extracted...")
        result = conn.execute(text("TRUNCATE TABLE reports_l2_extracted"))
        print("     ✅ reports_l2_extracted truncated")

        print("\n  3️⃣  Truncating master_mapping...")
        result = conn.execute(text("TRUNCATE TABLE master_mapping"))
        print("     ✅ master_mapping truncated")

        print("\n  4️⃣  Truncating master_rows...")
        result = conn.execute(text("TRUNCATE TABLE master_rows"))
        print("     ✅ master_rows truncated")

        print("\n  5️⃣  Truncating reports_l2...")
        result = conn.execute(text("TRUNCATE TABLE reports_l2"))
        print("     ✅ reports_l2 truncated")

        # Re-enable foreign key checks
        print("\n  6️⃣  Re-enabling foreign key checks...")
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
        print("     ✅ Foreign key checks re-enabled")

    # Verify
    print("\n" + "="*100)
    print("✅ VERIFICATION")
    print("="*100)

    with engine.connect() as conn:
        tables = ['reports_l2_extracted',
                  'master_mapping', 'master_rows', 'reports_l2']
        print(f"\n{'Table':<30} {'Row Count':<15}")
        print("-" * 45)

        all_empty = True
        for table in tables:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = result.scalar()
            status = "✅ Empty" if count == 0 else f"⚠️  {count} rows"
            print(f"{table:<30} {status:<15}")
            if count > 0:
                all_empty = False

        print("\n" + "="*100)
        if all_empty:
            print("✅ ALL TABLES SUCCESSFULLY TRUNCATED!")
            print("   Database is ready for fresh extraction.")
        else:
            print("⚠️  WARNING: Some tables still have data!")
        print("="*100)


if __name__ == "__main__":
    truncate_tables()
