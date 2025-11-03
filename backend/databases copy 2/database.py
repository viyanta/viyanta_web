import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
# Required for securely handling passwords/usernames with special characters
import urllib.parse

# Load environment variables (must be run once in the application)
load_dotenv()

# --- Database Configuration ---
# Default to mysql as that's your XAMPP environment
DB_TYPE = os.getenv("DB_TYPE", "mysql")

if DB_TYPE == "mysql":
    # MySQL configuration (for XAMPP)
    DB_USER = os.getenv("DB_USER", "root")
    # Securely quote the password in case it contains special characters
    DB_PASSWORD = urllib.parse.quote_plus(os.getenv("DB_PASSWORD", ""))
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_NAME = os.getenv("DB_NAME", "financial_reports")

    # Ensure you have 'mysqlclient' or 'pymysql' installed: pip install pymysql
    DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
else:
    # SQLite configuration (Fallback)
    DATABASE_URL = "sqlite:///./viyanta_web.db"

# Set echo=False to reduce logging, set to True for debugging SQL
engine = create_engine(DATABASE_URL, echo=False)

# SessionLocal is used to create a database session upon request
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class used by SQLAlchemy models
Base = declarative_base()

# --- Dependency for DB Session (used in FastAPI endpoints) ---


def get_db():
    """Provides a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
