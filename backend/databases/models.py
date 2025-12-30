from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Text, DateTime, func
from sqlalchemy import (
    Column, Integer, BigInteger, Float, String, DateTime, DECIMAL, JSON, ForeignKey, Text, Boolean, Date
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
# Dynamic L-Form Based Tables: reports_l1 to reports_l45 and extras
# =================================================================

# Base set: L1 to L45
lform_tables = [f"l{i}" for i in range(1, 46)]

# Additional complex L-Form IDs
extra_forms = [
    "L6A",
    "L9A",
    "L14A",
    "L25(i)",
    "L25(ii)"
]

# Normalize extra form names for SQL table compatibility


def normalize_lform(lform):
    return lform.lower().replace("(", "_").replace(")", "").replace("-", "").replace("/", "")


normalized_extra_tables = [normalize_lform(form) for form in extra_forms]

# Complete table list
lform_tables += normalized_extra_tables

# Register Report models dynamically
for table in lform_tables:
    class_name = f"Reports{table.upper()}"  # e.g., ReportsL6A, ReportsL25_I
    ReportModels[table] = type(
        class_name,
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
    IsActive = Column(Boolean, default=True, nullable=False)


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
    IsActive = Column(Boolean, default=True, nullable=False)


class PeriodMaster(Base):
    __tablename__ = "period_master"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Financial year info
    ProcessedFYYear = Column(String(10), nullable=True)              # FY2024
    ProcessedFinancialYearPeriod = Column(
        String(20), nullable=True)  # 2023-2024

    # Q1/Q2/Q3/Q4/H1/H2/9M/FY
    PeriodType = Column(String(20), nullable=False)

    # Optional IRDAI marking
    LFormsMarking = Column(String(10), nullable=True)

    # Unique human-readable period
    ProcessedFinancialYearPeriodWithMonth = Column(
        String(255), nullable=False, unique=True
    )

    # Original extracted text
    raw_text = Column(String(255), nullable=True)

    # Actual date range
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)

    is_active = Column(Boolean, default=True)

    # Relationship: One Quarter → Many Months
    monthly_mappings = relationship(
        "MonthlyPeriodMaster",
        back_populates="period_master_ref",
        cascade="all, delete-orphan"
    )


class MonthlyPeriodMaster(Base):
    __tablename__ = "monthly_period_master"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Month boundaries
    ProcessedPeriodShortDate = Column(Date, nullable=False)  # 1st day
    ProcessedPeriodEndDate = Column(Date, nullable=False)    # Last day
    ProcessedPreviousPeriod = Column(Date, nullable=True)

    # FY info (denormalized for faster filters)
    ProcessedFYYear = Column(String(10), nullable=True)
    ProcessedFinancialYearPeriod = Column(String(20), nullable=True)
    ProcessedFinancialYearPeriodWithMonth = Column(String(50), nullable=True)

    is_active = Column(Boolean, default=True)

    # FK → Quarter (period_master.id where PeriodType = Q1–Q4)
    period_id = Column(
        Integer,
        ForeignKey("period_master.id", ondelete="SET NULL"),
        nullable=True
    )

    period_master_ref = relationship(
        "PeriodMaster",
        back_populates="monthly_mappings"
    )


class IRDAIData(Base):
    __tablename__ = "irdai_monthly_data"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Reporting month (usually month end date)
    report_month = Column(Date, nullable=False)
    month_year = Column(String(10), nullable=True)

    insurer_name = Column(String(255), nullable=False)
    category = Column(String(255), nullable=False)

    # --------------------
    # First Year Premium
    # --------------------
    fyp_prev = Column(DECIMAL(18, 2))
    fyp_current = Column(DECIMAL(18, 2))
    fyp_growth = Column(DECIMAL(18, 2))
    fyp_ytd_prev = Column(DECIMAL(18, 2))
    fyp_ytd_current = Column(DECIMAL(18, 2))
    fyp_growth_ytd = Column(DECIMAL(18, 2))
    fyp_market_share = Column(DECIMAL(18, 2))

    # --------------------
    # No. of Policies
    # --------------------
    pol_prev = Column(DECIMAL(18, 2))
    pol_current = Column(DECIMAL(18, 2))
    pol_growth = Column(DECIMAL(18, 2))
    pol_ytd_prev = Column(DECIMAL(18, 2))
    pol_ytd_current = Column(DECIMAL(18, 2))
    pol_growth_ytd = Column(DECIMAL(18, 2))
    pol_market_share = Column(DECIMAL(18, 2))

    # --------------------
    # Lives Covered
    # --------------------
    lives_prev = Column(DECIMAL(18, 2))
    lives_current = Column(DECIMAL(18, 2))
    lives_growth = Column(DECIMAL(18, 2))
    lives_ytd_prev = Column(DECIMAL(18, 2))
    lives_ytd_current = Column(DECIMAL(18, 2))
    lives_growth_ytd = Column(DECIMAL(18, 2))
    lives_market_share = Column(DECIMAL(18, 2))

    # --------------------
    # Sum Assured
    # --------------------
    sa_prev = Column(DECIMAL(18, 2))
    sa_current = Column(DECIMAL(18, 2))
    sa_growth = Column(DECIMAL(18, 2))
    sa_ytd_prev = Column(DECIMAL(18, 2))
    sa_ytd_current = Column(DECIMAL(18, 2))
    sa_growth_ytd = Column(DECIMAL(18, 2))
    sa_market_share = Column(DECIMAL(18, 2))

    # --------------------
    # Period Links
    # --------------------
    monthly_period_id = Column(
        Integer,
        ForeignKey("monthly_period_master.id", ondelete="SET NULL"),
        nullable=True
    )

    quarter_period_id = Column(
        Integer,
        ForeignKey("period_master.id", ondelete="SET NULL"),
        nullable=True
    )

    monthly_period_ref = relationship("MonthlyPeriodMaster")
    quarter_period_ref = relationship("PeriodMaster")


class Companies(Base):
    __tablename__ = "companies"

    companyid = Column(Integer, primary_key=True, autoincrement=True)
    companyname = Column(String(255), unique=True, nullable=False)


Base = declarative_base()


class CompanyMetrics(Base):
    __tablename__ = "company_metrics"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    CompanyInsurerShortName = Column(String(100), nullable=True)
    ProcessedPeriodType = Column(String(50), nullable=True)
    ProcessedFYYear = Column(String(20), nullable=True)
    DataType = Column(String(50), nullable=True)
    CountryName = Column(String(50), nullable=True)
    PremiumTypeLongName = Column(String(200), nullable=True)
    CategoryLongName = Column(String(200), nullable=True)
    Description = Column(Text, nullable=True)
    ReportedUnit = Column(String(50), nullable=True)
    ReportedValue = Column(String(100), nullable=True)
    Datachheck = Column(String(100), nullable=True)
    IsActive = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(),
                        onupdate=func.now())


class ReportsL2Extracted(Base):
    __tablename__ = "reports_l2_extracted"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    # Note: Foreign keys removed to avoid SQLAlchemy metadata resolution issues
    # with dynamically created models. Relationships are maintained at application level.
    report_id = Column(BigInteger, nullable=False)
    company_id = Column(Integer, nullable=False)
    row_index = Column(Integer)

    particulars = Column(Text)
    normalized_text = Column(String(512))  # NLP-normalized text for matching

    # CRITICAL: master_row_id MUST reference master_rows.master_row_id (the canonical source)
    # NOT master_mapping.id (which is only for mapping variants to masters)
    # This ensures all financial line items use the same canonical master_row_id
    master_row_id = Column(BigInteger)  # References master_rows.master_row_id

    schedule = Column(String(100))

    for_current_period = Column(String(50))
    upto_current_period = Column(String(50))
    for_previous_period = Column(String(50))
    upto_previous_period = Column(String(50))

    created_at = Column(DateTime, server_default=func.now())


class ReportsL3Extracted(Base):
    """
    Extracted rows from L-3 forms (Balance Sheet)
    Stores individual line items for master mapping and analysis
    """
    __tablename__ = "reports_l3_extracted"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    # Note: Foreign keys removed to avoid SQLAlchemy metadata resolution issues
    # with dynamically created models. Relationships are maintained at application level.
    report_id = Column(BigInteger, nullable=False)
    company_id = Column(Integer, nullable=False)
    row_index = Column(Integer)

    particulars = Column(Text)
    normalized_text = Column(String(512))  # NLP-normalized text for matching

    # CRITICAL: master_row_id MUST reference master_rows.master_row_id (the canonical source)
    # NOT master_mapping.id (which is only for mapping variants to masters)
    # This ensures all financial line items use the same canonical master_row_id
    master_row_id = Column(BigInteger)  # References master_rows.master_row_id

    schedule = Column(String(100))

    # L-3 specific columns (Balance Sheet format: as_at current/previous period)
    as_at_current_period = Column(String(50))
    as_at_previous_period = Column(String(50))

    created_at = Column(DateTime, server_default=func.now())


class DashboardSelectedDescriptions(Base):
    """Store global selected descriptions for economy dashboard"""
    __tablename__ = "dashboard_selected_descriptions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    description = Column(String(500), nullable=False, unique=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(),
                        onupdate=func.now())


class DashboardChartConfig(Base):
    """Store chart configurations (type and dimension) for each description"""
    __tablename__ = "dashboard_chart_config"

    id = Column(Integer, primary_key=True, autoincrement=True)
    description = Column(String(500), nullable=False, unique=True)
    chart_type = Column(String(50), nullable=False,
                        default='bar')  # bar, pie, treemap
    chart_dimension = Column(String(50), nullable=False,
                             default='country')  # country, year
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(),
                        onupdate=func.now())


# =================================================================
# Register extracted/detail tables in ReportModels
# =================================================================
ReportModels['reports_l2_extracted'] = ReportsL2Extracted
ReportModels['reports_l3_extracted'] = ReportsL3Extracted


class MasterRow(Base):
    __tablename__ = "master_rows"

    master_row_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    cluster_label = Column(
        Integer,
        unique=True,
        nullable=True
    )

    master_name = Column(
        String(255),
        nullable=True
    )

    # Optional relationship (safe to keep)
    mappings = relationship(
        "MasterMapping",
        back_populates="master_row",
        primaryjoin="MasterRow.cluster_label==foreign(MasterMapping.cluster_label)",
        viewonly=True
    )


class MasterMapping(Base):
    __tablename__ = "master_mapping"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    master_name = Column(
        String(255),
        nullable=False
    )

    company_id = Column(
        Integer,
        nullable=False
    )

    form_no = Column(
        String(20),
        nullable=False
    )

    variant_text = Column(
        String(512),
        nullable=False
    )

    normalized_text = Column(
        String(512),
        nullable=False
    )

    cluster_label = Column(
        Integer,
        nullable=True
    )

    similarity_score = Column(
        Float,
        nullable=True
    )

    created_at = Column(
        DateTime,
        server_default=func.current_timestamp()
    )

    updated_at = Column(
        DateTime,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp()
    )

    # Logical (not FK-based) relationship
    master_row = relationship(
        "MasterRow",
        primaryjoin="foreign(MasterMapping.cluster_label)==MasterRow.cluster_label",
        viewonly=True
    )


# =================================================================
# L3-Specific Master Tables (Balance Sheet)
# =================================================================

class MasterRowL3(Base):
    """
    Master rows specifically for L-3 forms (Balance Sheet)
    Separate from L-2 to maintain form-specific canonical mappings
    """
    __tablename__ = "master_rows_l3"

    master_row_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    cluster_label = Column(
        Integer,
        unique=True,
        nullable=True
    )

    master_name = Column(
        String(255),
        nullable=True
    )

    # Optional relationship (safe to keep)
    mappings = relationship(
        "MasterMappingL3",
        back_populates="master_row",
        primaryjoin="MasterRowL3.cluster_label==foreign(MasterMappingL3.cluster_label)",
        viewonly=True
    )


class MasterMappingL3(Base):
    """
    Master mapping specifically for L-3 forms (Balance Sheet)
    Maps variant text to canonical master rows for L-3
    """
    __tablename__ = "master_mapping_l3"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    master_name = Column(
        String(255),
        nullable=False
    )

    company_id = Column(
        Integer,
        nullable=False
    )

    form_no = Column(
        String(20),
        nullable=False
    )

    variant_text = Column(
        String(512),
        nullable=False
    )

    normalized_text = Column(
        String(512),
        nullable=False
    )

    cluster_label = Column(
        Integer,
        nullable=True
    )

    similarity_score = Column(
        Float,
        nullable=True
    )

    created_at = Column(
        DateTime,
        server_default=func.current_timestamp()
    )

    updated_at = Column(
        DateTime,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp()
    )

    # Logical (not FK-based) relationship
    master_row = relationship(
        "MasterRowL3",
        primaryjoin="foreign(MasterMappingL3.cluster_label)==MasterRowL3.cluster_label",
        viewonly=True
    )


class MenuMaster(Base):
    __tablename__ = "menu_master"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)

    MenuSequenceID = Column(Integer)
    MainMenuID = Column(Integer, nullable=False)
    MainMenuName = Column(String(255))
    IsMainMenuActive = Column(Boolean)

    SubMenuID = Column(Integer, nullable=False, unique=True)
    SubMenuName = Column(String(255))
    IsSubMenuActive = Column(Boolean)

    ISsequenceID = Column(Integer)
    IsSelectCompany = Column(Boolean)

    IsExcelDownload = Column(Boolean)
    IsPDFDownload = Column(Boolean)
    IsPrint = Column(Boolean)

    IsDarkTheme = Column(Boolean)
    IsLightTheme = Column(Boolean)

    IsSettings = Column(Boolean)
    IsSupportEmail = Column(Boolean)
    IsTalkToUs = Column(Boolean)
    IsLogout = Column(Boolean)

    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False
    )
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    def __repr__(self):
        return f"<MenuMaster(MainMenuID={self.MainMenuID}, SubMenuID={self.SubMenuID})>"


class UserMaster(Base):
    __tablename__ = "user_master"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)

    SerialNumber = Column(Integer)

    UserStartDate = Column(Date)
    UserEndDate = Column(Date)
    IsUserActive = Column(Boolean)

    UserType = Column(String(100))
    UserDetail = Column(String(255))

    UserID = Column(String(100), unique=True, index=True)
    UserLoginEmailName = Column(String(255), unique=True, index=True)
    UserPassword = Column(String(255))

    UserLastPwdReset = Column(DateTime)
    UserPINCaptcha = Column(String(20))

    UserLongName = Column(String(255))
    UserShortName = Column(String(100))

    UserOrganisation = Column(String(255))
    UserMobile = Column(String(20))
    UserTelephone = Column(String(20))

    UserDepartment = Column(String(255))
    UserAddress = Column(Text)
    UserCity = Column(String(100))
    UserState = Column(String(100))
    UserCountry = Column(String(100))

    IsSubscribedDigitsLife = Column(Boolean)
    IssubscribedDigitsNonLife = Column(Boolean)
    IsSubscribedDigitsPlus = Column(Boolean)

    IsSubscribedAssureLife = Column(Boolean)
    IssubscribedAssureNonLife = Column(Boolean)
    IsSubscribedAssurePlus = Column(Boolean)

    IsMasterAdmin = Column(Boolean)
    IsDMSUser = Column(Boolean)
    IsDMSMenuTemplateID = Column(Integer)

    UserLoginHistory = Column(JSON)
    UserPreferenceSetting = Column(JSON)
    UserActivitiestracking = Column(JSON)
    UserAccessDetails = Column(JSON)
    UserIPAllowed = Column(JSON)

    ConcurrentUsersAllowedforIPAccess = Column(Integer)

    UserUsageStat = Column(JSON)
    UserConsentUpdate = Column(JSON)

    UpcomingRenewalDate = Column(Date)

    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False
    )
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    def __repr__(self):
        return f"<UserMaster(UserID={self.UserID}, Email={self.UserLoginEmailName})>"
