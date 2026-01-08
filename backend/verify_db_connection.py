import sys
import os

# Add backend directory to path so we can import databases.database
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from databases.database import engine
    from sqlalchemy import text

    print(f"Attempting to connect with URL: {engine.url}")
    
    # Hide password in output
    safe_url = str(engine.url).replace(engine.url.password, "******") if engine.url.password else str(engine.url)
    print(f"Safe URL representation: {safe_url}")

    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        print("Successfully connected to the database!")
        print(f"Result: {result.scalar()}")

except Exception as e:
    print(f"Connection failed: {e}")
    sys.exit(1)
