import os
import sys
# Add parent directory to path to allow importing modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from databases.database import engine

def add_indices():
    print(f"Connecting to database using engine: {engine.url}")
    
    with engine.connect() as conn:
        try:
            print("Adding indices to menu_master...")
            # MySQL syntax for index creation
            # Check if index exists is a bit tricker in generic SQL, but we can try CREATE INDEX IF NOT EXISTS (MySQL 8.0+)
            # Or catch duplicate key error.
            
            # Note: MySQL < 8.0 doesn't support IF NOT EXISTS for indexes. 
            # We'll wrap in try-except block for safety.
            
            try:
                conn.execute(text("CREATE INDEX idx_menu_master_main_menu ON menu_master(MainMenuID, IsMainMenuActive)"))
                print("Created idx_menu_master_main_menu")
            except Exception as e:
                # 1061: Duplicate key name
                if "1061" in str(e): 
                    print("Index idx_menu_master_main_menu already exists.")
                else: 
                    print(f"Warning creating idx_menu_master_main_menu: {e}")

            try:
                conn.execute(text("CREATE INDEX idx_menu_master_sub_menu ON menu_master(MainMenuID, IsSubMenuActive)"))
                print("Created idx_menu_master_sub_menu")
            except Exception as e:
                if "1061" in str(e):
                    print("Index idx_menu_master_sub_menu already exists.")
                else:
                    print(f"Warning creating idx_menu_master_sub_menu: {e}")

            print("Adding indices to user_master...")
            try:
                conn.execute(text("CREATE INDEX idx_user_master_access ON user_master(UserID, IsUserActive)"))
                print("Created idx_user_master_access")
            except Exception as e:
                if "1061" in str(e):
                    print("Index idx_user_master_access already exists.")
                else:
                    print(f"Warning creating idx_user_master_access: {e}")
            
            conn.commit()
            print("Indices check/creation completed!")
            
            # Verify
            try:
                print("\nVerifying indices on menu_master:")
                result = conn.execute(text("SHOW INDEX FROM menu_master"))
                for row in result:
                    print(f"Key_name: {row[2]}, Column_name: {row[4]}")
            except Exception as e:
                print(f"Verification failed: {e}")
                
        except Exception as e:
            print(f"General error: {e}")

if __name__ == "__main__":
    add_indices()
