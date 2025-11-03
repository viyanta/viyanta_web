from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from databases.database import Base  # Import Base from the config file


class Company(Base):
    __tablename__ = "companies"  # Maps to Companies table

    CompanyID = Column(Integer, primary_key=True, index=True)
    CompanyName = Column(String(255), unique=True, nullable=False)

    # Relationship: A Company has many Reports
    reports = relationship("Report", back_populates="company")


class Report(Base):
    __tablename__ = "reports"  # Maps to Reports table

    ReportID = Column(Integer, primary_key=True, index=True)

    # Foreign Key linking to the Companies table
    CompanyID = Column(Integer, ForeignKey(
        "companies.CompanyID"), nullable=False)

    FormNo = Column(String(50), nullable=False)
    SourceFileName = Column(String(512), nullable=False)

    # Date type is best for storing YYYY-MM-DD
    ReportPeriod = Column(Date, nullable=False)
    Currency = Column(String(50), nullable=True)

    # Timestamp is set by the database by default
    ImportTimestamp = Column(
        DateTime,
        server_default=func.current_timestamp(),
        nullable=False
    )

    # Relationships:
    # 1. Links back to the Company object
    company = relationship("Company", back_populates="reports")
    # 2. Links to the individual data rows
    data_rows = relationship("ReportData", back_populates="report")


class ReportData(Base):
    __tablename__ = "reportdata"  # Maps to ReportData table

    DataID = Column(Integer, primary_key=True, index=True)

    # Foreign Key linking to the Reports table
    ReportID = Column(Integer, ForeignKey("reports.ReportID"), nullable=False)

    # Denormalized fields for quick filtering/searching:
    FormNo = Column(String(50), nullable=True)
    Title = Column(String(255), nullable=True)

    # JSON field for the flexible row data (e.g., {"Particulars": "...", "As_at_Sep_2024": "..."})
    DataRow = Column(JSON, nullable=False)

    # Relationship: Links back to the Report object
    report = relationship("Report", back_populates="data_rows")
