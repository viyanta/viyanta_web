import sqlite3
import os

DATABASE_PATH = "viyanta_web.db"

def check_tables():
    if not os.path.exists(DATABASE_PATH):
        print(f"Database file not found at {DATABASE_PATH}")
        return

    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("Tables in database:")
        for table in tables:
            print(table[0])
            
    except Exception as e:
        print(f"Error listing tables: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_tables()
