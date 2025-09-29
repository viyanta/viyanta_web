#!/usr/bin/env python3
"""
Script to update the company table with the correct company names
"""

from databases.models import Base, Company
from databases.database import get_db, engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Add the parent directory to the path so we can import from databases

load_dotenv()


# The exact companies to insert
TARGET_COMPANIES = [
    'SBI Life',
    'HDFC Life',
    'ICICI Prudential',
    'Bajaj Allianz',
    'Aditya Birla Sun Life',
    'Canara HSBC Life',
    'GO Digit Life',
    'Shriram Life'
]


def check_mysql_connection():
    """Test the MySQL connection"""
    try:
        connection = engine.connect()
        connection.close()
        print("✅ MySQL connection successful")
        return True
    except Exception as e:
        print(f"❌ MySQL connection failed: {e}")
        return False


def create_tables():
    """Create tables if they don't exist"""
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created/verified")
        return True
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False


def clean_and_populate_companies():
    """Clean existing companies and add the target companies"""
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        print("\n🔍 Checking existing companies...")
        existing_companies = db.query(Company).all()
        print(f"Found {len(existing_companies)} existing companies:")
        for company in existing_companies:
            print(f"  - {company.name} (ID: {company.id})")

        print("\n🗑️  Cleaning existing companies...")
        deleted_count = db.query(Company).delete()
        db.commit()
        print(f"  ✅ Deleted {deleted_count} companies")

        print(f"\n➕ Adding {len(TARGET_COMPANIES)} target companies...")
        for company_name in TARGET_COMPANIES:
            company = Company(name=company_name)
            db.add(company)
            db.flush()  # Flush to get the ID
            print(f"  ✅ Added: {company_name} (ID: {company.id})")

        db.commit()
        print("  ✅ All companies committed to database")

        return True

    except Exception as e:
        db.rollback()
        print(f"❌ Error during company operations: {e}")
        return False
    finally:
        db.close()


def verify_companies():
    """Verify the final state of companies"""
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        final_companies = db.query(Company).order_by(Company.name).all()
        print(
            f"\n📊 Final companies in database ({len(final_companies)} total):")
        for i, company in enumerate(final_companies, 1):
            print(f"  {i}. {company.name} (ID: {company.id})")

        # Verify all target companies are present
        existing_names = [company.name for company in final_companies]
        missing_companies = [
            name for name in TARGET_COMPANIES if name not in existing_names]

        if missing_companies:
            print(f"\n⚠️  Missing companies: {missing_companies}")
            return False
        else:
            print(
                f"\n✅ All {len(TARGET_COMPANIES)} target companies are present!")
            return True

    except Exception as e:
        print(f"❌ Error verifying companies: {e}")
        return False
    finally:
        db.close()


def main():
    print("🚀 Starting Company Database Update")
    print("=" * 50)

    # Check MySQL connection
    if not check_mysql_connection():
        return False

    # Create tables if needed
    if not create_tables():
        return False

    # Clean and populate companies
    if not clean_and_populate_companies():
        return False

    # Verify final state
    if not verify_companies():
        return False

    print("\n✅ Company database update completed successfully!")
    print("🌐 Backend API endpoint: /api/companies/")
    print("📝 Frontend can now fetch companies from the database")
    return True


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⏹️  Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)
