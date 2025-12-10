"""
Script to manually create the dashboard_selected_row_ids table.
This is optional - the table is automatically created when the API endpoints are first called.
Run this script only if you want to create the table manually or if automatic creation fails.
"""

from databases.database import engine, Base
from sqlalchemy import inspect, text
import os

def create_dashboard_selected_row_ids_table():
    """Create the dashboard_selected_row_ids table manually"""
    print("Attempting to create dashboard_selected_row_ids table...")
    
    DB_TYPE = os.getenv("DB_TYPE", "sqlite")
    
    try:
        # Check if table already exists
        inspector = inspect(engine)
        if inspector.has_table("dashboard_selected_row_ids"):
            print("✅ Table 'dashboard_selected_row_ids' already exists. Skipping creation.")
            return
        
        # Create the table based on database type
        with engine.connect() as conn:
            if DB_TYPE == "mysql":
                create_table_query = text("""
                    CREATE TABLE IF NOT EXISTS dashboard_selected_row_ids (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        data_type VARCHAR(50) NOT NULL COMMENT 'Either "Domestic" or "International"',
                        description VARCHAR(500) NOT NULL COMMENT 'The description text',
                        row_ids JSON NOT NULL COMMENT 'Array of selected row IDs as JSON',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY unique_data_desc (data_type, description),
                        INDEX idx_data_type (data_type),
                        INDEX idx_description (description(255))
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    COMMENT='Stores selected row IDs for dashboard display per description and data type'
                """)
            else:
                # SQLite
                create_table_query = text("""
                    CREATE TABLE IF NOT EXISTS dashboard_selected_row_ids (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        data_type TEXT NOT NULL,
                        description TEXT NOT NULL,
                        row_ids TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(data_type, description)
                    )
                """)
            
            conn.execute(create_table_query)
            conn.commit()
            print("✅ Table 'dashboard_selected_row_ids' created successfully!")
            
    except Exception as e:
        print(f"❌ Error creating table 'dashboard_selected_row_ids': {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    create_dashboard_selected_row_ids_table()


