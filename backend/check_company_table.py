#!/usr/bin/env python3
"""
Check the structure of the company table
"""

from sqlalchemy import text
from databases.database import SessionLocal, engine
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


def check_table_structure():
    db = SessionLocal()

    try:
        # Check if table exists and its structure
        result = db.execute(text("DESCRIBE company"))
        columns = result.fetchall()

        print("📋 Company table structure:")
        for col in columns:
            print(f"  - {col}")

    except Exception as e:
        print(f"❌ Error checking table: {e}")

        # Try to check if table exists
        try:
            result = db.execute(text("SHOW TABLES LIKE 'company'"))
            tables = result.fetchall()
            if tables:
                print("✅ Company table exists")
            else:
                print("❌ Company table does not exist")
        except Exception as e2:
            print(f"❌ Error checking table existence: {e2}")
    finally:
        db.close()


def recreate_table():
    """Drop and recreate the table"""
    print("\n🔄 Recreating company table...")

    try:
        from databases.database import Base
        from databases.models import Company

        # Drop existing table
        Company.__table__.drop(engine, checkfirst=True)
        print("✅ Dropped existing table")

        # Create new table
        Base.metadata.create_all(bind=engine, tables=[Company.__table__])
        print("✅ Created new table")

        # Check structure again
        check_table_structure()

    except Exception as e:
        print(f"❌ Error recreating table: {e}")


if __name__ == "__main__":
    print("🔍 Checking company table structure...")
    check_table_structure()

    recreate = input(
        "\n❓ Do you want to recreate the table? (y/N): ").strip().lower()
    if recreate == 'y':
        recreate_table()
