-- Make a User MasterAdmin with All Product Access
-- Replace 'your-email@example.com' with the actual email address

-- Option 1: Make specific user MasterAdmin
UPDATE user_master 
SET 
    IsMasterAdmin = 1,
    IsDMSUser = 1,
    IsSubscribedDigitsLife = 1,
    IssubscribedDigitsNonLife = 1,
    IsSubscribedDigitsPlus = 1,
    IsSubscribedAssureLife = 1,
    IssubscribedAssureNonLife = 1,
    IsSubscribedAssurePlus = 1,
    UserDetail = 'Internal',
    IsUserActive = 1
WHERE UserLoginEmailName = 'your-email@example.com';

-- Option 2: View current user status to verify
SELECT 
    UserID,
    UserLoginEmailName,
    UserLongName,
    IsMasterAdmin,
    IsDMSUser,
    IsSubscribedDigitsLife,
    IssubscribedDigitsNonLife,
    IsSubscribedDigitsPlus,
    IsSubscribedAssureLife,
    IssubscribedAssureNonLife,
    IsSubscribedAssurePlus,
    UserType,
    UserDetail,
    IsUserActive
FROM user_master
WHERE UserLoginEmailName = 'your-email@example.com';

-- Option 3: View all MasterAdmins
SELECT 
    UserID,
    UserLoginEmailName,
    UserLongName,
    IsMasterAdmin,
    IsDMSUser,
    UserDetail,
    IsUserActive
FROM user_master
WHERE IsMasterAdmin = 1;

-- Option 4: View all users and their product access
SELECT 
    UserID,
    UserLoginEmailName,
    UserLongName,
    IsMasterAdmin,
    CONCAT(
        IF(IsSubscribedDigitsLife = 1, 'DIGITS_LIFE ', ''),
        IF(IssubscribedDigitsNonLife = 1, 'DIGITS_NON_LIFE ', ''),
        IF(IsSubscribedDigitsPlus = 1, 'DIGITS_PLUS ', ''),
        IF(IsSubscribedAssureLife = 1, 'ASSURE_LIFE ', ''),
        IF(IssubscribedAssureNonLife = 1, 'ASSURE_NON_LIFE ', ''),
        IF(IsSubscribedAssurePlus = 1, 'ASSURE_PLUS', '')
    ) AS ProductAccess,
    UserDetail,
    IsUserActive
FROM user_master
ORDER BY IsMasterAdmin DESC, UserDetail, UserLoginEmailName;
