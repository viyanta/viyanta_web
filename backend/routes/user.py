from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from databases.database import get_db
from databases.models import UserMaster
from utils.product_access import PRODUCTS, can_user_access_product

router = APIRouter()


def build_product_access(user: UserMaster):
    return {
        "isMasterAdmin": bool(user.IsMasterAdmin),
        "products": {
            p: can_user_access_product(user, p)
            for p in PRODUCTS.keys()
        },
        "showLifeNonLifeToggle": (
            user.IsSubscribedDigitsLife == 1
            and user.IssubscribedDigitsNonLife == 1
        )
    }


@router.get("/")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(UserMaster).all()

    return [{
        "email": u.UserLoginEmailName,
        "isActive": bool(u.IsUserActive),
        "access": build_product_access(u)
    } for u in users]


@router.get("/active")
def get_active_users(db: Session = Depends(get_db)):
    users = (
        db.query(UserMaster)
        .filter(UserMaster.IsUserActive == True)
        .all()
    )

    return [{
        "email": u.UserLoginEmailName,
        "access": build_product_access(u)
    } for u in users]


@router.get("/email/{email}")
def get_user_by_email(email: str, db: Session = Depends(get_db)):
    user = (
        db.query(UserMaster)
        .filter(UserMaster.UserLoginEmailName == email)
        .first()
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "email": user.UserLoginEmailName,
        "name": user.UserLongName,
        "organisation": user.UserOrganisation,
        "access": build_product_access(user)
    }
