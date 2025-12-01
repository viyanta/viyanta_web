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


class User(Base):
    """
    User table for managing all types of users (Inhouse, Client, Trial, Subscription, Internal)
    SerialNumber starts from 100001 and increments
    UserID format: YYYYMMDDXXX (where XXX is incremental serial number based on current date)
    """
    __tablename__ = "users"

    # Primary key - SerialNumber starts from 100001
    # Note: To set starting value to 100001, you may need to run:
    # ALTER TABLE users AUTO_INCREMENT = 100001 (MySQL) or handle in application logic
    SerialNumber = Column(Integer, primary_key=True,
                          autoincrement=True, index=True)

    # User Status
    IsUserActive = Column(Integer, nullable=False,
                          default=1, comment="1-active, 0-inactive")

    # User Type and Details
    UserType = Column(String(50), nullable=True, comment="Inhouse or Client")
    UserDetail = Column(String(50), nullable=True,
                        comment="Trial or Subscription or Internal")

    # User Identification (Unique)
    UserID = Column(String(50), unique=True, nullable=False,
                    index=True, comment="Format: YYYYMMDDXXX")
    UserLoginEmailName = Column(String(
        255), unique=True, nullable=False, index=True, comment="User's login email address")
    UserPassword = Column(String(255), nullable=False,
                          comment="Hashed password value")

    # Personal Information
    FirstName = Column(String(100), nullable=True)
    LastName = Column(String(100), nullable=True)
    UserShortName = Column(String(50), nullable=True)
    UserOrgansiation = Column(
        String(255), nullable=True, comment="User's Organisation name")
    UserDepartment = Column(String(255), nullable=True,
                            comment="User's Department")
    UserMobileNumber = Column(String(20), nullable=True)

    # Address Information
    UserAddress = Column(Text, nullable=True)
    UserCity = Column(String(100), nullable=True)
    UserState = Column(String(100), nullable=True)
    UserPincode = Column(String(20), nullable=True)
    UserCountry = Column(String(100), nullable=True, default="India")

    # Additional Information
    UserRemarks = Column(Text, nullable=True)
    UserRole = Column(String(50), nullable=True,
                      comment="Super Admin, Admin, Regular User, etc.")

    # Password and Security
    UserLastPWdReset = Column(DateTime, nullable=True,
                              comment="Last password reset date and time")
    UserPinCaptcha = Column(Integer, nullable=True,
                            comment="4 digit PIN/Captcha number")

    # Subscription Information
    SubscriptionType = Column(String(
        50), nullable=True, comment="1-DigitsLife, 2-DigitsNonlife, 3-DigitsPlus, 4-AssureLife, 5-AssureNonlife, 6-DataFeed")
    UserStartDate = Column(DateTime, nullable=True,
                           comment="Subscription start date")
    UserEndDate = Column(DateTime, nullable=True,
                         comment="Subscription end date")
    UserConsentReceived = Column(
        Boolean, nullable=True, default=False, comment="User consent received status")
    UserRenewalMonthDate = Column(
        DateTime, nullable=True, comment="User renewal month and date")

    # Timestamps
    UserCreatedDateTime = Column(DateTime, server_default=func.now(
    ), nullable=False, comment="Date and time the user account was created")
    LastLoginDate = Column(DateTime, nullable=True,
                           comment="Date and time of the user's last login")

    # Login History (Pipe-delimited: Logindate|LoginTime|IPAddress|StaticIP|SystemID|...)
    IsLoginHistory = Column(Text, nullable=True,
                            comment="Pipe-delimited login history details")

    # CMS (Content Management System) User Status
    IsCMSUserStatus = Column(Integer, nullable=True,
                             default=0, comment="1-active, 0-inactive")
    IsCMSMenuIDs = Column(String(255), nullable=True,
                          comment="Pipe-delimited menu IDs: 101|102|103|104")

    # DMMS (Data Management System) User Status
    IsDMMSUserStatus = Column(Integer, nullable=True,
                              default=0, comment="1-active, 0-inactive")
    IsDMMSMenuIDs = Column(String(255), nullable=True,
                           comment="Pipe-delimited menu IDs: 101|102|103|104")

    # IP Access Control
    IsIPUser = Column(Integer, nullable=True, default=0,
                      comment="1-active, 0-inactive")
    LoginIPAddress = Column(String(50), nullable=True,
                            comment="IP address of the user's last login")
    UserIPAllowed = Column(
        Text, nullable=True, comment="Pipe-delimited allowed IP addresses: 192.168.1.100|192.168.1.102")

    # Concurrent User Management
    ConcurrentUsersAllowed = Column(
        Integer, nullable=True, default=0, comment="1-active, 0-inactive")
    NoofConcurrentUsers = Column(
        String(10), nullable=True, comment="Number of concurrent users allowed")
    UserIPdetails = Column(Text, nullable=True,
                           comment="IP access details captured incrementally")

    # User Preferences and Settings (Pipe-delimited values)
    UserPreferencesSettings = Column(
        Text, nullable=True, comment="Pipe-delimited: pref1|value1|pref2|value2")
    UserActivitiesTracking = Column(
        Text, nullable=True, comment="Pipe-delimited: menu|page|action|timestamp")
    UserAccessDetails = Column(
        Text, nullable=True, comment="Pipe-delimited hardware and access details")

    # Usage Statistics (Pipe-delimited: LoginDate|LoginTime|LogoutTime|TotalUsageInHH:MM:SS)
    UserUsageStat = Column(
        Text, nullable=True, comment="Pipe-delimited usage statistics captured incrementally")

    # Download Status (Pipe-delimited: filename|size|timestamp|...)
    UserDownloadStatus = Column(
        Text, nullable=True, comment="Pipe-delimited download details with size")


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
