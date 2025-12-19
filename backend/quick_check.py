
import os
import pymysql
from dotenv import load_dotenv

load_dotenv()

DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_NAME = os.getenv("DB_NAME", "viyanta_web")

try:
    connection = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        port=DB_PORT,
        cursorclass=pymysql.cursors.DictCursor
    )
    
    with connection.cursor() as cursor:
        sql = "SELECT MainMenuID, MainMenuName FROM MenuMaster WHERE ParentMenuID IS NULL OR ParentMenuID = ''"
        cursor.execute(sql)
        results = cursor.fetchall()
        print("--- Main Menus ---")
        for row in results:
            print(f"ID: {row['MainMenuID']}, Name: '{row['MainMenuName']}'")
            
except Exception as e:
    print(f"Error: {e}")
finally:
    if 'connection' in locals() and connection.open:
        connection.close()
