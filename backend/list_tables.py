"""
Check what tables exist in the database
"""
from sqlalchemy import create_engine, inspect
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


DATABASE_URL = "sqlite:///./viyanta_web.db"
engine = create_engine(DATABASE_URL)


def list_all_tables():
    """List all tables in the database"""
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    print(f"📊 Total tables in database: {len(tables)}\n")
    print("=" * 80)

    for i, table in enumerate(sorted(tables), 1):
        print(f"{i}. {table}")

        # Get columns for this table
        columns = inspector.get_columns(table)
        print(f"   Columns ({len(columns)}):")
        for col in columns[:5]:  # Show first 5 columns
            print(f"     - {col['name']} ({col['type']})")
        if len(columns) > 5:
            print(f"     ... and {len(columns) - 5} more columns")
        print()


if __name__ == "__main__":
    list_all_tables()
