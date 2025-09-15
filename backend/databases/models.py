from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from databases.database import Base


class Company(Base):
    __tablename__ = "company"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)


class ExtractedRawData(Base):
    """
    Table for storing normal extracted data (before Gemini verification)
    This matches your existing MySQL table structure
    """
    __tablename__ = "extracted_raw_data"

    id = Column(Integer, primary_key=True, index=True)
    company = Column(String(255), nullable=True)
    form_no = Column(String(50), nullable=True)
    filename = Column(String(255), nullable=True)
    # Map to 'metadata' column
    form_metadata = Column("metadata", JSON, nullable=True)
    # JSON field for extracted table data
    table_rows = Column(JSON, nullable=True)
    uploaded_at = Column(
        DateTime, server_default=func.current_timestamp(), nullable=False)


class ExtractedRefinedData(Base):
    """
    Table for storing Gemini-verified/corrected data (after Gemini verification)
    This matches your existing MySQL table structure
    """
    __tablename__ = "extracted_refined_data"

    id = Column(Integer, primary_key=True, index=True)
    company = Column(String(255), nullable=True)
    form_no = Column(String(50), nullable=True)
    filename = Column(String(255), nullable=True)
    # Map to 'metadata' column
    form_metadata = Column("metadata", JSON, nullable=True)
    # JSON field for Gemini-verified table data
    table_rows = Column(JSON, nullable=True)
    uploaded_at = Column(
        DateTime, server_default=func.current_timestamp(), nullable=False)
