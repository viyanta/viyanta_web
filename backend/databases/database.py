from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import create_engine
from dotenv import load_dotenv
import os
import pymysql
from urllib.parse import quote_plus
pymysql.install_as_MySQLdb()


load_dotenv()

# Database configuration - support both MySQL and SQLite
DB_TYPE = os.getenv("DB_TYPE", "sqlite")

if DB_TYPE == "mysql":
    # MySQL configuration
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    # URL-encode password to handle special characters like @, !, etc.
    DB_PASSWORD_ENCODED = quote_plus(DB_PASSWORD)
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_NAME = os.getenv("DB_NAME", "viyanta_web")
    DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD_ENCODED}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
else:
    # SQLite configuration (default)
    DATABASE_URL = "sqlite:///./viyanta_web.db"

# Set echo=False to reduce logs
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency for DB session


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
