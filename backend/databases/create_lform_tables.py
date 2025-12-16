"""
Create all L-form tables (reports_l1 to reports_l45, plus extras)
This script creates the physical database tables for all L-forms
"""
from databases.models import ReportModels
from databases.database import engine, Base
import sys
import os
# Add parent directory to path to allow imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def create_all_lform_tables():
    """Create all L-form report tables in the database"""

    print("=" * 80)
    print("Creating L-Form Tables")
    print("=" * 80)

    # Get all L-form table keys
    lform_keys = [key for key in ReportModels.keys() if key.startswith(
        'l') and not key.startswith('lic_')]

    print(f"\nFound {len(lform_keys)} L-form tables to create:")
    for key in sorted(lform_keys):
        model = ReportModels[key]
        table_name = model.__tablename__
        print(f"  - {key} → {table_name}")

    print("\n" + "=" * 80)
    print("Creating tables in database...")
    print("=" * 80 + "\n")

    try:
        # Create all tables defined in Base
        Base.metadata.create_all(bind=engine)

        print("✅ All L-form tables created successfully!")
        print("\nYou can now verify with:")
        print("  SHOW TABLES LIKE 'reports_l%';")

        return True

    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = create_all_lform_tables()
    sys.exit(0 if success else 1)
