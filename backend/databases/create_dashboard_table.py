#!/usr/bin/env python3
"""
Script to create dashboard_selected_descriptions table in MySQL/SQLite
Run this script to ensure the table exists before using the economy dashboard features.
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, inspect
from urllib.parse import quote_plus
import pymysql

# Load environment variables
load_dotenv()

# Database configuration
DB_TYPE = os.getenv("DB_TYPE", "sqlite")

if DB_TYPE == "mysql":
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_PASSWORD_ENCODED = quote_plus(DB_PASSWORD)
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_NAME = os.getenv("DB_NAME", "viyanta_web")
    DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD_ENCODED}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    pymysql.install_as_MySQLdb()
else:
    DATABASE_URL = "sqlite:///./viyanta_web.db"

def table_exists(engine, table_name):
    """Check if table exists"""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()

def create_table(engine):
    """Create dashboard_selected_descriptions table"""
    try:
        with engine.connect() as conn:
            # Check if table already exists
            if table_exists(engine, "dashboard_selected_descriptions"):
                print("✅ Table 'dashboard_selected_descriptions' already exists.")
                return True
            
            print("🔄 Creating table 'dashboard_selected_descriptions'...")
            
            if DB_TYPE == "mysql":
                create_table_query = text("""
                    CREATE TABLE dashboard_selected_descriptions (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        description VARCHAR(500) NOT NULL UNIQUE,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_description (description)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """)
            else:
                create_table_query = text("""
                    CREATE TABLE dashboard_selected_descriptions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        description TEXT NOT NULL UNIQUE,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                """)
            
            conn.execute(create_table_query)
            conn.commit()
            print("✅ Table 'dashboard_selected_descriptions' created successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Error creating table: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function"""
    print("=" * 60)
    print("Creating dashboard_selected_descriptions table")
    print("=" * 60)
    print(f"Database Type: {DB_TYPE}")
    if DB_TYPE == "mysql":
        print(f"Database: {DB_NAME} @ {DB_HOST}:{DB_PORT}")
    else:
        print(f"Database: SQLite file")
    print("=" * 60)
    
    try:
        engine = create_engine(DATABASE_URL, echo=False)
        success = create_table(engine)
        
        if success:
            print("\n✅ Setup completed successfully!")
            print("You can now use the economy dashboard selected descriptions feature.")
        else:
            print("\n❌ Setup failed. Please check the error messages above.")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

