import sqlite3

def list_tables():
    conn = sqlite3.connect('viyanta_web.db')
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables:", tables)

if __name__ == "__main__":
    list_tables()
