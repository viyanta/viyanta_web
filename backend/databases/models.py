from sqlalchemy import (
    Column, Integer, BigInteger, String, DateTime, JSON, ForeignKey
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from databases.database import Base


class Company(Base):
    __tablename__ = "company"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)


# =================================================================
# Dynamic per-company Reports Table Models
# =================================================================

class ReportsBase(Base):
    __abstract__ = True  # Do not create a table for this class

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    company = Column(String(255), nullable=False)
    company_id = Column(Integer, ForeignKey("company.id"), nullable=False)

    ReportType = Column(String(100))
    pdf_name = Column(String(512))
    registration_number = Column(String(255))
    form_no = Column(String(50), nullable=False)
    title = Column(String(255))
    period = Column(String(150), nullable=False)
    currency = Column(String(50))
    pages_used = Column(Integer)
    source_pdf = Column(String(255))
    flat_headers = Column(JSON)
    data_rows = Column(JSON, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


# Company-based report tables
company_tables = [
    "acko_life",
    "aditya_birla_sun_life",
    "ageas_federal_life",
    "aviva_life",
    "axis_max_life",
    "bajaj_allianz_life",
    "bandhan_life",
    "bharti_axa_life",
    "canara_hsbc_life",
    "creditaccess_life",
    "edelweiss_tokio_life",
    "future_generali_india_life",
    "go_digit_life",
    "hdfc_life",
    "icici_prudential_life",
    "indiafirst_life",
    "kotak_life",
    "lic_of_india_life",
    "pnb_metlife_life",
    "pramerica_life",
    "reliance_nippon_life",
    "sbi_life",
    "shriram_life",
    "starunion_daichi_life",
    "tata_aig_life"
]

ReportModels = {}

for table in company_tables:
    class_name = "".join(word.capitalize() for word in table.split("_"))
    ReportModels[table] = type(
        f"Reports{class_name}",
        (ReportsBase,),
        {"__tablename__": f"reports_{table}"}
    )


# =================================================================
# Other tables you already have
# =================================================================

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
