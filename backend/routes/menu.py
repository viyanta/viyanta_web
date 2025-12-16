from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from databases.database import get_db
from databases.models import MenuMaster, UserMaster
from utils.product_access import can_user_access_product
from utils.dms_access import can_user_access_dms_menu

router = APIRouter()

FEATURE_FIELDS = [
    "IsSelectCompany",
    "IsExcelDownload",
    "IsPDFDownload",
    "IsPrint",
    "IsDarkTheme",
    "IsLightTheme",
    "IsSettings",
    "IsSupportEmail",
    "IsTalkToUs",
    "IsLogout"
]

# -------------------------------------------------
# 1️⃣ GET MAIN MENUS (PRODUCT + USER)
# -------------------------------------------------


@router.get("/main-menus")
def get_main_menus(
    product_key: str = Query(
        ..., description="digits_life, digits_non_life, digits_plus, assure_life, assure_non_life, assure_plus"),
    user_id: str = Query(..., description="Logged-in user ID"),
    db: Session = Depends(get_db)
):
    user = (
        db.query(UserMaster)
        .filter(UserMaster.UserID == user_id)
        .first()
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not can_user_access_product(user, product_key):
        return []

    rows = (
        db.query(MenuMaster)
        .filter(MenuMaster.IsMainMenuActive == True)
        .order_by(MenuMaster.MainMenuID)
        .all()
    )

    menu_map = {}

    for row in rows:
        if row.MainMenuID not in menu_map:
            features = {
                f: True for f in FEATURE_FIELDS if getattr(row, f) == 1
            }

            menu_map[row.MainMenuID] = {
                "MainMenuID": row.MainMenuID,
                "MainMenuName": row.MainMenuName,
                "features": features
            }

    return list(menu_map.values())


# -------------------------------------------------
# 2️⃣ GET SUB MENUS (PRODUCT + USER + DMS)
# -------------------------------------------------
@router.get("/sub-menus/{main_menu_id}")
def get_sub_menus(
    main_menu_id: int,
    product_key: str = Query(...),
    user_id: str = Query(...),
    db: Session = Depends(get_db)
):
    user = (
        db.query(UserMaster)
        .filter(UserMaster.UserID == user_id)
        .first()
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not can_user_access_product(user, product_key):
        raise HTTPException(status_code=403, detail="Access denied")

    rows = (
        db.query(MenuMaster)
        .filter(
            MenuMaster.MainMenuID == main_menu_id,
            MenuMaster.IsSubMenuActive == True
        )
        .order_by(MenuMaster.ISsequenceID)
        .all()
    )

    submenus = []

    for row in rows:
        features = {
            f: True for f in FEATURE_FIELDS if getattr(row, f) == 1
        }

        submenus.append({
            "SubMenuID": row.SubMenuID,
            "SubMenuName": row.SubMenuName,
            "ISsequenceID": row.ISsequenceID,
            "features": features
        })

    return {
        "MainMenuID": main_menu_id,
        "submenus": submenus
    }
