import os
import sys
# Add parent directory to path to allow importing modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from databases.database import engine

def check_indices():
    print(f"Connecting to database using engine: {engine.url}")
    
    with engine.connect() as conn:
        try:
            print("\nChecking indices on irdai_monthly_data:")
            # MySQL syntax to show indices
            result = conn.execute(text("SHOW INDEX FROM irdai_monthly_data"))
            
            indices = []
            for row in result:
                # row is a tuple, index 2 is Key_name, index 4 is Column_name
                indices.append(f"Key: {row[2]}, Column: {row[4]}")
            
            if not indices:
                print("No indices found on irdai_monthly_data (except potentially primary key if not listed here).")
            else:
                for idx in indices:
                    print(idx)
                
        except Exception as e:
            print(f"Error checking indices: {e}")

if __name__ == "__main__":
    check_indices()
