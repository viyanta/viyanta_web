from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Date, ForeignKey, Boolean
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
    SerialNumber = Column(Integer, primary_key=True, autoincrement=True, index=True)
    
    # User Status
    IsUserActive = Column(Integer, nullable=False, default=1, comment="1-active, 0-inactive")
    
    # User Type and Details
    UserType = Column(String(50), nullable=True, comment="Inhouse or Client")
    UserDetail = Column(String(50), nullable=True, comment="Trial or Subscription or Internal")
    
    # User Identification (Unique)
    UserID = Column(String(50), unique=True, nullable=False, index=True, comment="Format: YYYYMMDDXXX")
    UserLoginEmailName = Column(String(255), unique=True, nullable=False, index=True, comment="User's login email address")
    UserPassword = Column(String(255), nullable=False, comment="Hashed password value")
    
    # Personal Information
    FirstName = Column(String(100), nullable=True)
    LastName = Column(String(100), nullable=True)
    UserShortName = Column(String(50), nullable=True)
    UserOrgansiation = Column(String(255), nullable=True, comment="User's Organisation name")
    UserDepartment = Column(String(255), nullable=True, comment="User's Department")
    UserMobileNumber = Column(String(20), nullable=True)
    
    # Address Information
    UserAddress = Column(Text, nullable=True)
    UserCity = Column(String(100), nullable=True)
    UserState = Column(String(100), nullable=True)
    UserPincode = Column(String(20), nullable=True)
    UserCountry = Column(String(100), nullable=True, default="India")
    
    # Additional Information
    UserRemarks = Column(Text, nullable=True)
    UserRole = Column(String(50), nullable=True, comment="Super Admin, Admin, Regular User, etc.")
    
    # Password and Security
    UserLastPWdReset = Column(DateTime, nullable=True, comment="Last password reset date and time")
    UserPinCaptcha = Column(Integer, nullable=True, comment="4 digit PIN/Captcha number")
    
    # Subscription Information
    SubscriptionType = Column(String(50), nullable=True, comment="1-DigitsLife, 2-DigitsNonlife, 3-DigitsPlus, 4-AssureLife, 5-AssureNonlife, 6-DataFeed")
    UserStartDate = Column(DateTime, nullable=True, comment="Subscription start date")
    UserEndDate = Column(DateTime, nullable=True, comment="Subscription end date")
    UserConsentReceived = Column(Boolean, nullable=True, default=False, comment="User consent received status")
    UserRenewalMonthDate = Column(DateTime, nullable=True, comment="User renewal month and date")
    
    # Timestamps
    UserCreatedDateTime = Column(DateTime, server_default=func.now(), nullable=False, comment="Date and time the user account was created")
    LastLoginDate = Column(DateTime, nullable=True, comment="Date and time of the user's last login")
    
    # Login History (Pipe-delimited: Logindate|LoginTime|IPAddress|StaticIP|SystemID|...)
    IsLoginHistory = Column(Text, nullable=True, comment="Pipe-delimited login history details")
    
    # CMS (Content Management System) User Status
    IsCMSUserStatus = Column(Integer, nullable=True, default=0, comment="1-active, 0-inactive")
    IsCMSMenuIDs = Column(String(255), nullable=True, comment="Pipe-delimited menu IDs: 101|102|103|104")
    
    # DMMS (Data Management System) User Status
    IsDMMSUserStatus = Column(Integer, nullable=True, default=0, comment="1-active, 0-inactive")
    IsDMMSMenuIDs = Column(String(255), nullable=True, comment="Pipe-delimited menu IDs: 101|102|103|104")
    
    # IP Access Control
    IsIPUser = Column(Integer, nullable=True, default=0, comment="1-active, 0-inactive")
    LoginIPAddress = Column(String(50), nullable=True, comment="IP address of the user's last login")
    UserIPAllowed = Column(Text, nullable=True, comment="Pipe-delimited allowed IP addresses: 192.168.1.100|192.168.1.102")
    
    # Concurrent User Management
    ConcurrentUsersAllowed = Column(Integer, nullable=True, default=0, comment="1-active, 0-inactive")
    NoofConcurrentUsers = Column(String(10), nullable=True, comment="Number of concurrent users allowed")
    UserIPdetails = Column(Text, nullable=True, comment="IP access details captured incrementally")
    
    # User Preferences and Settings (Pipe-delimited values)
    UserPreferencesSettings = Column(Text, nullable=True, comment="Pipe-delimited: pref1|value1|pref2|value2")
    UserActivitiesTracking = Column(Text, nullable=True, comment="Pipe-delimited: menu|page|action|timestamp")
    UserAccessDetails = Column(Text, nullable=True, comment="Pipe-delimited hardware and access details")
    
    # Usage Statistics (Pipe-delimited: LoginDate|LoginTime|LogoutTime|TotalUsageInHH:MM:SS)
    UserUsageStat = Column(Text, nullable=True, comment="Pipe-delimited usage statistics captured incrementally")
    
    # Download Status (Pipe-delimited: filename|size|timestamp|...)
    UserDownloadStatus = Column(Text, nullable=True, comment="Pipe-delimited download details with size")
