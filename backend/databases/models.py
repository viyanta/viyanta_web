from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Date, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from databases.database import Base


class Company(Base):
    __tablename__ = "company"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)


class Companies(Base):
    __tablename__ = "companies"

    companyid = Column(Integer, primary_key=True, autoincrement=True)
    companyname = Column(String(255), unique=True, nullable=False)


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

# --- New tables for master company list, reports, and flexible L-Form data ---


class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, autoincrement=True)
    company = Column(String(255))
    pdf_name = Column(String(512))
    registration_number = Column(String(100))
    form_no = Column(String(50))
    title = Column(String(255))
    period = Column(String(100))
    currency = Column(String(50))
    pages_used = Column(String(50))
    source_pdf = Column(String(512))
    flat_headers = Column(JSON)
    data_rows = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())


class ReportData(Base):
    __tablename__ = "reportdata"
    dataid = Column(Integer, primary_key=True, autoincrement=True)
    reportid = Column(Integer, ForeignKey("reports.id"), nullable=False)
    pdf_name = Column(String(512))
    formno = Column(String(50))
    title = Column(String(255))
    datarow = Column(JSON, nullable=False)
