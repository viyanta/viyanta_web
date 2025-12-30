import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from databases.database import engine

def add_composite_index():
    print(f"Connecting to database...")
    
    with engine.connect() as conn:
        try:
            print("Adding composite index idx_irdai_monthly_composite...")
            # (insurer_name, category, report_month)
            # insurer_name = equality (usually, or IN)
            # category = equality (usually)
            # report_month = range
            # Optimal order: Equality columns first, then Range.
            
            try:
                conn.execute(text("CREATE INDEX idx_irdai_monthly_composite ON irdai_monthly_data(insurer_name, category, report_month)"))
                print("Created idx_irdai_monthly_composite")
            except Exception as e:
                if "1061" in str(e): # Duplicate key name
                    print("Index idx_irdai_monthly_composite already exists.")
                else: 
                    print(f"Warning creating index: {e}")
            
            conn.commit()
            print("Composite index creation completed!")
                
        except Exception as e:
            print(f"General error: {e}")

if __name__ == "__main__":
    add_composite_index()
