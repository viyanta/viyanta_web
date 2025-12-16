import os
import pandas as pd
import mysql.connector
from datetime import datetime
import json
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MENU_FILE = os.path.join(BASE_DIR, "MENU MASTER.xlsx")
USER_FILE = os.path.join(BASE_DIR, "USERMASTER.xlsx")


# =========================
# MYSQL CONNECTION
# =========================
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="",
    database="viyanta_web"
)

cursor = db.cursor()

# =========================
# UTILITY FUNCTIONS
# =========================


def clean_value(val):
    """Convert NaN to None and trim strings"""
    if pd.isna(val):
        return None
    if isinstance(val, str):
        return val.strip()
    return val


def clean_date(val):
    if pd.isna(val):
        return None
    if isinstance(val, datetime):
        return val.date()
    return val


# =========================
# IMPORT MENU MASTER
# =========================
menu_df = pd.read_excel(MENU_FILE)

menu_columns = [
    "MenuSequenceID", "MainMenuID", "MainMenuName", "IsMainMenuActive",
    "SubMenuID", "SubMenuName", "IsSubMenuActive",
    "ISsequenceID", "IsSelectCompany",
    "IsExcelDownload", "IsPDFDownload", "IsPrint",
    "IsDarkTheme", "IsLightTheme",
    "IsSettings", "IsSupportEmail", "IsTalkToUs", "IsLogout"
]

menu_insert_sql = """
INSERT INTO menu_master (
    MenuSequenceID, MainMenuID, MainMenuName, IsMainMenuActive,
    SubMenuID, SubMenuName, IsSubMenuActive,
    ISsequenceID, IsSelectCompany,
    IsExcelDownload, IsPDFDownload, IsPrint,
    IsDarkTheme, IsLightTheme,
    IsSettings, IsSupportEmail, IsTalkToUs, IsLogout
) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
"""

menu_data = []
for _, row in menu_df.iterrows():
    menu_data.append(tuple(clean_value(row[col]) for col in menu_columns))

cursor.executemany(menu_insert_sql, menu_data)
db.commit()
print(f"✅ Inserted {cursor.rowcount} rows into menu_master")

# =========================
# IMPORT USER MASTER
# =========================
user_df = pd.read_excel(USER_FILE)

user_columns = [
    "SerialNumber", "UserStartDate", "UserEndDate", "IsUserActive",
    "UserType", "UserDetail", "UserID", "UserLoginEmailName",
    "UserPassword", "UserLastPwdReset", "UserPINCaptcha",
    "UserLongName", "UserShortName", "UserOrganisation",
    "UserMobile", "UserTelephone", "UserDepartment",
    "UserAddress", "UserCity", "UserState", "UserCountry",
    "IsSubscribedDigitsLife", "IssubscribedDigitsNonLife", "IsSubscribedDigitsPlus",
    "IsSubscribedAssureLife", "IssubscribedAssureNonLife", "IsSubscribedAssurePlus",
    "IsMasterAdmin", "IsDMSUser", "IsDMSMenuTemplateID",
    "UserLoginHistory", "UserPreferenceSetting", "UserActivitiestracking",
    "UserAccessDetails", "UserIPAllowed",
    "ConcurrentUsersAllowedforIPAccess",
    "UserUsageStat", "UserConsentUpdate", "UpcomingRenewalDate"
]


def clean_json(val):
    """
    MySQL JSON columns accept ONLY valid JSON or NULL
    """
    if pd.isna(val) or val == "" or val is None:
        return None
    if isinstance(val, (dict, list)):
        return json.dumps(val)
    try:
        json.loads(str(val))  # validate JSON string
        return str(val)
    except Exception:
        return None


user_insert_sql = """
INSERT INTO user_master (
    SerialNumber, UserStartDate, UserEndDate, IsUserActive,
    UserType, UserDetail, UserID, UserLoginEmailName,
    UserPassword, UserLastPwdReset, UserPINCaptcha,
    UserLongName, UserShortName, UserOrganisation,
    UserMobile, UserTelephone, UserDepartment,
    UserAddress, UserCity, UserState, UserCountry,
    IsSubscribedDigitsLife, IssubscribedDigitsNonLife, IsSubscribedDigitsPlus,
    IsSubscribedAssureLife, IssubscribedAssureNonLife, IsSubscribedAssurePlus,
    IsMasterAdmin, IsDMSUser, IsDMSMenuTemplateID,
    UserLoginHistory, UserPreferenceSetting, UserActivitiestracking,
    UserAccessDetails, UserIPAllowed,
    ConcurrentUsersAllowedforIPAccess,
    UserUsageStat, UserConsentUpdate, UpcomingRenewalDate
) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
          %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
"""

user_data = []
for _, row in user_df.iterrows():
    user_data.append((
        clean_value(row["SerialNumber"]),
        clean_date(row["UserStartDate"]),
        clean_date(row["UserEndDate"]),
        clean_value(row["IsUserActive"]),
        clean_value(row["UserType"]),
        clean_value(row["UserDetail"]),
        clean_value(row["UserID"]),
        clean_value(row["UserLoginEmailName"]),
        clean_value(row["UserPassword"]),
        clean_value(row["UserLastPwdReset"]),
        clean_value(row["UserPINCaptcha"]),
        clean_value(row["UserLongName"]),
        clean_value(row["UserShortName"]),
        clean_value(row["UserOrganisation"]),
        clean_value(row["UserMobile"]),
        clean_value(row["UserTelephone"]),
        clean_value(row["UserDepartment"]),
        clean_value(row["UserAddress"]),
        clean_value(row["UserCity"]),
        clean_value(row["UserState"]),
        clean_value(row["UserCountry"]),
        clean_value(row["IsSubscribedDigitsLife"]),
        clean_value(row["IssubscribedDigitsNonLife"]),
        clean_value(row["IsSubscribedDigitsPlus"]),
        clean_value(row["IsSubscribedAssureLife"]),
        clean_value(row["IssubscribedAssureNonLife"]),
        clean_value(row["IsSubscribedAssurePlus"]),
        clean_value(row["IsMasterAdmin"]),
        clean_value(row["IsDMSUser"]),
        clean_value(row["IsDMSMenuTemplateID"]),
        clean_json(row["UserLoginHistory"]),
        clean_json(row["UserPreferenceSetting"]),
        clean_json(row["UserActivitiestracking"]),
        clean_json(row["UserAccessDetails"]),
        clean_json(row["UserIPAllowed"]),
        clean_value(row["ConcurrentUsersAllowedforIPAccess"]),
        clean_json(row["UserUsageStat"]),
        clean_json(row["UserConsentUpdate"]),
        clean_date(row["UpcomingRenewalDate"])

    ))

cursor.executemany(user_insert_sql, user_data)
db.commit()
print(f"✅ Inserted {cursor.rowcount} rows into user_master")

# =========================
# CLOSE CONNECTION
# =========================
cursor.close()
db.close()

print("🎉 Excel import completed successfully")
