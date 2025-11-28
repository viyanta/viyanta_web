from sqlalchemy import (
    Column, Integer, BigInteger, String, Text, DateTime, JSON, ForeignKey, Boolean, Date
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from databases.database import Base


class Company(Base):
    __tablename__ = "company"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)

    # 1 company -> many reports
    reports = relationship("Report", back_populates="company_obj")


class Report(Base):
    __tablename__ = "reports"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    # existing text column (we are keeping it)
    company = Column(String(255), nullable=False)

    # new FK column
    company_id = Column(Integer, ForeignKey("company.id"), nullable=True)

    ReportType = Column(String(100), nullable=True)

    pdf_name = Column(String(512))
    registration_number = Column(String(255))
    form_no = Column(String(50), nullable=False)
    title = Column(String(255))
    period = Column(String(150), nullable=False)
    currency = Column(String(50))
    pages_used = Column(Integer)
    source_pdf = Column(String(255))
    flat_headers = Column(JSON)      # stored as JSON/longtext in DB
    data_rows = Column(JSON, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # relationships
    company_obj = relationship("Company", back_populates="reports")
    rows = relationship("ReportData", back_populates="report",
                        cascade="all, delete-orphan")


class ReportData(Base):
    __tablename__ = "reportdata"

    DataID = Column(Integer, primary_key=True, autoincrement=True)
    ReportID = Column(BigInteger, ForeignKey("reports.id"), nullable=False)

    ReportType = Column(String(100), nullable=True)

    pdf_name = Column(String(512))
    FormNo = Column(String(50))
    Title = Column(String(255))
    DataRow = Column(JSON, nullable=False)

    # relationship back to Report
    report = relationship("Report", back_populates="rows")


class EconomyMaster(Base):
    __tablename__ = "economy_master"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ProcessedPeriodType = Column(String(50), nullable=True)
    ProcessedFYYear = Column(String(10), nullable=True)
    DataType = Column(String(50), nullable=True)
    CountryName = Column(String(100), nullable=True)
    PremiumTypeLongName = Column(String(100), nullable=True)
    CategoryLongName = Column(String(100), nullable=True)
    Description = Column(String(255), nullable=True)
    ReportedUnit = Column(String(50), nullable=True)
    ReportedValue = Column(String(50), nullable=True)


class IndustryMaster(Base):
    __tablename__ = "industry_master"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ProcessedPeriodType = Column(String(50), nullable=True)
    ProcessedFYYear = Column(String(10), nullable=True)
    DataType = Column(String(50), nullable=True)
    CountryName = Column(String(100), nullable=True)
    PremiumTypeLongName = Column(String(100), nullable=True)
    CategoryLongName = Column(String(100), nullable=True)
    Description = Column(String(255), nullable=True)
    ReportedUnit = Column(String(50), nullable=True)
    ReportedValue = Column(String(50), nullable=True)


class Companies(Base):
    __tablename__ = "companies"

    companyid = Column(Integer, primary_key=True, autoincrement=True)
    companyname = Column(String(255), unique=True, nullable=False)
