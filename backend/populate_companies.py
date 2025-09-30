#!/usr/bin/env python3
"""
Script to populate the company table with initial data
"""

from databases.models import Base, Company
from databases.database import engine, SessionLocal
from sqlalchemy.orm import Session
import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))


# List of companies to insert
COMPANIES = [
    'SBI Life',
    'HDFC Life',
    'ICICI Prudential',
    'Bajaj Allianz',
    'Aditya Birla Sun Life',
    'Canara HSBC Life',
    'GO Digit Life',
    'Shriram Life'
]


def create_tables():
    """Create all tables if they don't exist"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created successfully")


def populate_companies():
    """Insert companies into the database"""
    db = SessionLocal()
    try:
        print("Populating companies...")

        # Check if companies already exist
        existing_companies = db.query(Company).all()
        existing_names = [comp.name for comp in existing_companies]

        companies_added = 0
        companies_skipped = 0

        for company_name in COMPANIES:
            if company_name not in existing_names:
                company = Company(name=company_name)
                db.add(company)
                companies_added += 1
                print(f"  ✅ Added: {company_name}")
            else:
                companies_skipped += 1
                print(f"  ⏭️  Skipped (already exists): {company_name}")

        # Commit all changes
        db.commit()

        print(f"\n📊 Summary:")
        print(f"  Companies added: {companies_added}")
        print(f"  Companies skipped: {companies_skipped}")
        print(
            f"  Total companies in database: {len(existing_companies) + companies_added}")

        # Display all companies
        all_companies = db.query(Company).all()
        print(f"\n📋 All companies in database:")
        for i, company in enumerate(all_companies, 1):
            print(f"  {i}. {company.name} (ID: {company.id})")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def main():
    """Main function"""
    print("🚀 Starting Company Database Population")
    print("=" * 50)

    try:
        # Create tables
        create_tables()

        # Populate companies
        populate_companies()

        print("\n✅ Company population completed successfully!")

    except Exception as e:
        print(f"\n❌ Failed to populate companies: {e}")
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
