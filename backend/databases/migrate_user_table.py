"""
Migration script to create only the User table in the database.
This script will:
1. Create the users table if it doesn't exist
2. Set the SerialNumber auto-increment to start from 100001 (for MySQL)
3. Work with both MySQL and SQLite databases
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path so we can import databases module
backend_dir = Path(__file__).parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import inspect, text
from databases.database import engine, Base
from databases.models import User


def table_exists(table_name: str) -> bool:
    """Check if a table exists in the database"""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()


def migrate_user_table():
    """Create the User table if it doesn't exist"""
    try:
        # Check if table already exists
        if table_exists("users"):
            print("✅ Users table already exists. Skipping migration.")
            return
        
        print("🔄 Creating users table...")
        
        # Create only the User table
        User.metadata.create_all(bind=engine, tables=[User.__table__])
        
        print("✅ Users table created successfully!")
        
        # Set auto-increment starting value for MySQL
        db_type = os.getenv("DB_TYPE", "sqlite")
        if db_type == "mysql":
            try:
                with engine.connect() as conn:
                    # Set AUTO_INCREMENT to start from 100001
                    conn.execute(text("ALTER TABLE users AUTO_INCREMENT = 100001"))
                    conn.commit()
                print("✅ Set SerialNumber auto-increment to start from 100001")
            except Exception as e:
                print(f"⚠️  Could not set auto-increment start value: {e}")
                print("   You may need to set it manually: ALTER TABLE users AUTO_INCREMENT = 100001")
        else:
            # For SQLite, we'll handle the starting value in application logic
            print("ℹ️  SQLite detected. SerialNumber starting value will be handled in application logic.")
            print("   Note: SQLite doesn't support setting AUTO_INCREMENT start value directly.")
        
        print("✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        raise


if __name__ == "__main__":
    print("=" * 60)
    print("User Table Migration Script")
    print("=" * 60)
    migrate_user_table()
    print("=" * 60)

