import mysql.connector
from mysql.connector import Error

host = "0.0.0.0"       # Or your EC2 Public IP
user = "ec2user"
password = "Viyanta123"
database = "viyanta_web"

try:
    # Connect to MySQL
    connection = mysql.connector.connect(
        host=host,
        user=user,
        password=password,
        database=database,
        port=3306
    )

    if connection.is_connected():
        print("✅ Connected to database:", database)
        cursor = connection.cursor()

        # Fetch company names
        cursor.execute("SELECT name FROM company;")
        records = cursor.fetchall()

        if records:
            print("\n📌 Company Names:")
            for row in records:
                print("-", row[0])
        else:
            print("⚠️ No records found in 'company' table.")

except Error as e:
    print("❌ Error while connecting to MySQL:", e)

finally:
    if 'connection' in locals() and connection.is_connected():
        cursor.close()
        connection.close()
        print("\n🔌 MySQL connection closed.")




