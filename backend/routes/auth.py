from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from databases.database import get_db
from databases.models import UserMaster
from datetime import date
import uuid

router = APIRouter()


@router.post("/login")
def login_or_signup(payload: dict, db: Session = Depends(get_db)):
    email = payload.get("email")
    name = payload.get("name")

    if not email:
        raise HTTPException(status_code=400, detail="Email required")

    user = (
        db.query(UserMaster)
        .filter(UserMaster.UserLoginEmailName == email)
        .first()
    )

    # ✅ EXISTING USER
    if user:
        if not user.IsUserActive:
            raise HTTPException(status_code=403, detail="User inactive")

        return {
            "UserID": user.UserID,
            "email": user.UserLoginEmailName,
            "isNew": False
        }

    # 🆕 CREATE NEW USER WITH DEFAULT TRIAL ACCESS
    new_user = UserMaster(
        UserID=str(uuid.uuid4()),
        UserLoginEmailName=email,
        UserLongName=name,
        UserType="Client",
        UserDetail="Trial",
        UserStartDate=date.today(),
        IsUserActive=True,
        
        # ✅ Give trial users access to DIGITS_LIFE by default
        IsSubscribedDigitsLife=True,
        IssubscribedDigitsNonLife=False,
        IsSubscribedDigitsPlus=False,
        IsSubscribedAssureLife=False,
        IssubscribedAssureNonLife=False,
        IsSubscribedAssurePlus=False,
        
        # Not a MasterAdmin or DMS user by default
        IsMasterAdmin=False,
        IsDMSUser=False
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "UserID": new_user.UserID,
        "email": new_user.UserLoginEmailName,
        "isNew": True,
        "defaultProduct": "DIGITS_LIFE"  # Tell frontend which product to show
    }
