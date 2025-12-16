"""
Initialize reports_l2_extracted table and ensure it exists
This script creates the table if it doesn't exist
"""
from sqlalchemy import create_engine, text
from databases.database import SQLALCHEMY_DATABASE_URL, Base
from databases.models import ReportsL2Extracted

def initialize_table():
    """Create reports_l2_extracted table if it doesn't exist"""
    try:
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        
        # Check if table exists
        with engine.connect() as conn:
            result = conn.execute(text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='reports_l2_extracted'"
            ))
            exists = result.fetchone()
            
            if exists:
                print("✅ Table 'reports_l2_extracted' already exists")
                
                # Check columns
                result = conn.execute(text("PRAGMA table_info(reports_l2_extracted)"))
                columns = {row[1] for row in result.fetchall()}
                
                required_cols = {
                    'id', 'report_id', 'company_id', 'row_index', 'particulars',
                    'normalized_text', 'master_row_id', 'schedule',
                    'for_current_period', 'upto_current_period', 
                    'for_previous_period', 'upto_previous_period', 'created_at'
                }
                
                missing = required_cols - columns
                if missing:
                    print(f"⚠️  Missing columns: {missing}")
                else:
                    print("✅ All required columns present")
                    
                # Count rows
                result = conn.execute(text("SELECT COUNT(*) FROM reports_l2_extracted"))
                count = result.fetchone()[0]
                print(f"📊 Current row count: {count}")
            else:
                print("⚠️  Table 'reports_l2_extracted' does not exist")
                print("📝 Creating table...")
                
                # Create table using SQLAlchemy
                Base.metadata.create_all(engine, tables=[ReportsL2Extracted.__table__])
                
                print("✅ Table 'reports_l2_extracted' created successfully")
        
        engine.dispose()
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🗄️  Initializing reports_l2_extracted table...")
    print("=" * 60)
    
    success = initialize_table()
    
    print("=" * 60)
    if success:
        print("✅ Initialization complete")
    else:
        print("❌ Initialization failed")
