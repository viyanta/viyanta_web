-- Migration script to create only the User table
-- This script creates the users table with all required fields
-- For MySQL: Sets AUTO_INCREMENT starting value to 100001

-- Drop table if exists (use with caution in production)
-- DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    SerialNumber INT AUTO_INCREMENT PRIMARY KEY,
    IsUserActive INT NOT NULL DEFAULT 1 COMMENT '1-active, 0-inactive',
    UserType VARCHAR(50) NULL COMMENT 'Inhouse or Client',
    UserDetail VARCHAR(50) NULL COMMENT 'Trial or Subscription or Internal',
    UserID VARCHAR(50) UNIQUE NOT NULL COMMENT 'Format: YYYYMMDDXXX',
    UserLoginEmailName VARCHAR(255) UNIQUE NOT NULL COMMENT 'User''s login email address',
    UserPassword VARCHAR(255) NOT NULL COMMENT 'Hashed password value',
    FirstName VARCHAR(100) NULL,
    LastName VARCHAR(100) NULL,
    UserShortName VARCHAR(50) NULL,
    UserOrgansiation VARCHAR(255) NULL COMMENT 'User''s Organisation name',
    UserDepartment VARCHAR(255) NULL COMMENT 'User''s Department',
    UserMobileNumber VARCHAR(20) NULL,
    UserAddress TEXT NULL,
    UserCity VARCHAR(100) NULL,
    UserState VARCHAR(100) NULL,
    UserPincode VARCHAR(20) NULL,
    UserCountry VARCHAR(100) NULL DEFAULT 'India',
    UserRemarks TEXT NULL,
    UserRole VARCHAR(50) NULL COMMENT 'Super Admin, Admin, Regular User, etc.',
    UserLastPWdReset DATETIME NULL COMMENT 'Last password reset date and time',
    UserPinCaptcha INT NULL COMMENT '4 digit PIN/Captcha number',
    SubscriptionType VARCHAR(50) NULL COMMENT '1-DigitsLife, 2-DigitsNonlife, 3-DigitsPlus, 4-AssureLife, 5-AssureNonlife, 6-DataFeed',
    UserStartDate DATETIME NULL COMMENT 'Subscription start date',
    UserEndDate DATETIME NULL COMMENT 'Subscription end date',
    UserConsentReceived BOOLEAN NULL DEFAULT FALSE COMMENT 'User consent received status',
    UserRenewalMonthDate DATETIME NULL COMMENT 'User renewal month and date',
    UserCreatedDateTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date and time the user account was created',
    LastLoginDate DATETIME NULL COMMENT 'Date and time of the user''s last login',
    IsLoginHistory TEXT NULL COMMENT 'Pipe-delimited login history details',
    IsCMSUserStatus INT NULL DEFAULT 0 COMMENT '1-active, 0-inactive',
    IsCMSMenuIDs VARCHAR(255) NULL COMMENT 'Pipe-delimited menu IDs: 101|102|103|104',
    IsDMMSUserStatus INT NULL DEFAULT 0 COMMENT '1-active, 0-inactive',
    IsDMMSMenuIDs VARCHAR(255) NULL COMMENT 'Pipe-delimited menu IDs: 101|102|103|104',
    IsIPUser INT NULL DEFAULT 0 COMMENT '1-active, 0-inactive',
    LoginIPAddress VARCHAR(50) NULL COMMENT 'IP address of the user''s last login',
    UserIPAllowed TEXT NULL COMMENT 'Pipe-delimited allowed IP addresses: 192.168.1.100|192.168.1.102',
    ConcurrentUsersAllowed INT NULL DEFAULT 0 COMMENT '1-active, 0-inactive',
    NoofConcurrentUsers VARCHAR(10) NULL COMMENT 'Number of concurrent users allowed',
    UserIPdetails TEXT NULL COMMENT 'IP access details captured incrementally',
    UserPreferencesSettings TEXT NULL COMMENT 'Pipe-delimited: pref1|value1|pref2|value2',
    UserActivitiesTracking TEXT NULL COMMENT 'Pipe-delimited: menu|page|action|timestamp',
    UserAccessDetails TEXT NULL COMMENT 'Pipe-delimited hardware and access details',
    UserUsageStat TEXT NULL COMMENT 'Pipe-delimited usage statistics captured incrementally',
    UserDownloadStatus TEXT NULL COMMENT 'Pipe-delimited download details with size',
    
    -- Create indexes for better query performance
    INDEX idx_UserID (UserID),
    INDEX idx_UserLoginEmailName (UserLoginEmailName),
    INDEX idx_SerialNumber (SerialNumber)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Set AUTO_INCREMENT to start from 100001 (MySQL only)
ALTER TABLE users AUTO_INCREMENT = 100001;

-- Note: For SQLite, the AUTO_INCREMENT starting value cannot be set directly.
-- You'll need to handle the starting value in application logic.



