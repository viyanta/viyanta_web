"""
Quick Setup Script for L-3 Master Mapping Infrastructure
=========================================================

This script helps you set up the L-3 master mapping infrastructure.

Usage:
    python setup_l3_infrastructure.py

What it does:
1. Creates database tables (reports_l3_extracted, master_rows_l3, master_mapping_l3)
2. Verifies table structure
3. Runs initial checks
4. Provides next steps

Author: Senior Data Engineer
Date: December 30, 2025
"""

import sys
import os
from sqlalchemy import text, inspect
from databases.database import engine, SessionLocal
from databases.models import ReportsL3Extracted, MasterRowL3, MasterMappingL3, Base

def print_header(message):
    """Print a formatted header"""
    print(f"\n{'='*70}")
    print(f"  {message}")
    print(f"{'='*70}\n")

def print_step(step_num, message):
    """Print a step message"""
    print(f"\n🔹 Step {step_num}: {message}")
    print(f"{'-'*70}")

def create_tables():
    """Create L-3 tables in database"""
    print_step(1, "Creating L-3 Database Tables")
    
    try:
        # Create all tables defined in Base metadata
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully!")
        return True
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False

def verify_tables():
    """Verify that all L-3 tables exist"""
    print_step(2, "Verifying Table Creation")
    
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    required_tables = [
        'reports_l3_extracted',
        'master_rows_l3',
        'master_mapping_l3'
    ]
    
    all_exist = True
    for table in required_tables:
        if table in existing_tables:
            print(f"  ✅ {table} - EXISTS")
            
            # Get column count
            columns = inspector.get_columns(table)
            print(f"     └─ {len(columns)} columns")
        else:
            print(f"  ❌ {table} - MISSING")
            all_exist = False
    
    return all_exist

def check_table_structure():
    """Check and display table structure"""
    print_step(3, "Checking Table Structure")
    
    inspector = inspect(engine)
    
    tables_to_check = {
        'reports_l3_extracted': [
            'id', 'report_id', 'company_id', 'row_index',
            'particulars', 'normalized_text', 'master_row_id',
            'schedule', 'as_at_current_period', 'as_at_previous_period',
            'created_at'
        ],
        'master_rows_l3': [
            'master_row_id', 'cluster_label', 'master_name'
        ],
        'master_mapping_l3': [
            'id', 'master_name', 'company_id', 'form_no',
            'variant_text', 'normalized_text', 'cluster_label',
            'similarity_score', 'created_at', 'updated_at'
        ]
    }
    
    all_correct = True
    
    for table_name, expected_columns in tables_to_check.items():
        print(f"\n  📋 {table_name}:")
        
        try:
            columns = inspector.get_columns(table_name)
            column_names = [col['name'] for col in columns]
            
            for expected_col in expected_columns:
                if expected_col in column_names:
                    print(f"     ✅ {expected_col}")
                else:
                    print(f"     ❌ {expected_col} - MISSING")
                    all_correct = False
                    
        except Exception as e:
            print(f"     ❌ Error checking table: {e}")
            all_correct = False
    
    return all_correct

def check_existing_data():
    """Check if there's any existing data in L-3 tables"""
    print_step(4, "Checking Existing Data")
    
    db = SessionLocal()
    
    try:
        # Check reports_l3_extracted
        query = text("SELECT COUNT(*) as count FROM reports_l3_extracted")
        result = db.execute(query).fetchone()
        extracted_count = result[0] if result else 0
        print(f"  📊 reports_l3_extracted: {extracted_count} rows")
        
        # Check master_rows_l3
        query = text("SELECT COUNT(*) as count FROM master_rows_l3")
        result = db.execute(query).fetchone()
        master_count = result[0] if result else 0
        print(f"  📊 master_rows_l3: {master_count} rows")
        
        # Check master_mapping_l3
        query = text("SELECT COUNT(*) as count FROM master_mapping_l3")
        result = db.execute(query).fetchone()
        mapping_count = result[0] if result else 0
        print(f"  📊 master_mapping_l3: {mapping_count} rows")
        
        return {
            'extracted': extracted_count,
            'master': master_count,
            'mapping': mapping_count
        }
        
    except Exception as e:
        print(f"  ❌ Error checking data: {e}")
        return None
    finally:
        db.close()

def print_next_steps(data_counts):
    """Print next steps based on current state"""
    print_step(5, "Next Steps")
    
    if data_counts and data_counts['extracted'] > 0:
        print("\n  ✅ You have L-3 extracted data!")
        print("\n  📝 Recommended actions:")
        print("     1. Run the master mapping pipeline:")
        print("        → python master_row_mapping_pipeline_l3.py")
        print("\n     2. Verify master row assignments:")
        print("        → Check master_rows_l3 table")
        print("\n     3. Use the Master Rows Manager UI:")
        print("        → http://localhost:8000/master-rows-manager-v2")
        
    else:
        print("\n  ℹ️  No L-3 data found yet.")
        print("\n  📝 Recommended actions:")
        print("     1. Import L-3 form data:")
        print("        → Upload and extract L-3 PDFs")
        print("\n     2. After import, run the pipeline:")
        print("        → python master_row_mapping_pipeline_l3.py")
        print("\n     3. Monitor via Master Rows Manager UI:")
        print("        → http://localhost:8000/master-rows-manager-v2")

def print_summary(success):
    """Print final summary"""
    print_header("Setup Summary")
    
    if success:
        print("  ✅ L-3 Infrastructure Setup Complete!")
        print("\n  📦 Created:")
        print("     • reports_l3_extracted table")
        print("     • master_rows_l3 table")
        print("     • master_mapping_l3 table")
        print("\n  🚀 Ready for:")
        print("     • L-3 data extraction")
        print("     • Master row mapping")
        print("     • Cross-company analysis")
    else:
        print("  ⚠️  Setup completed with warnings.")
        print("  Please review the errors above and fix them.")
    
    print(f"\n{'='*70}\n")

def main():
    """Main setup function"""
    print_header("L-3 Master Mapping Infrastructure Setup")
    
    # Step 1: Create tables
    tables_created = create_tables()
    
    if not tables_created:
        print("\n❌ Failed to create tables. Exiting.")
        sys.exit(1)
    
    # Step 2: Verify tables
    tables_verified = verify_tables()
    
    # Step 3: Check structure
    structure_correct = check_table_structure()
    
    # Step 4: Check existing data
    data_counts = check_existing_data()
    
    # Step 5: Print next steps
    print_next_steps(data_counts)
    
    # Summary
    success = tables_created and tables_verified and structure_correct
    print_summary(success)
    
    if success:
        print("✅ All checks passed! L-3 infrastructure is ready.")
        return 0
    else:
        print("⚠️  Some checks failed. Please review the output above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
