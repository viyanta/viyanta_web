import sqlite3

conn = sqlite3.connect('viyanta_web.db')
cursor = conn.cursor()

# List all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

print("Tables in viyanta_web.db:")
for table in tables:
    print(f"  - {table[0]}")
    
    # Get row count for each table
    cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
    count = cursor.fetchone()[0]
    print(f"    Rows: {count}")

conn.close()
