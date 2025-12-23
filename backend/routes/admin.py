from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from databases.database import get_db
from databases.models import UserMaster
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, timedelta

router = APIRouter()


class ApproveUserRequest(BaseModel):
    """Request model for approving user and assigning products"""
    user_id: str
    products: List[str]  # ["DIGITS_LIFE", "ASSURE_PLUS", etc.]
    make_master_admin: bool = False
    user_detail: str = "Subscription"  # "Trial", "Subscription", "Internal"
    subscription_days: Optional[int] = 365  # Default 1 year subscription


class UpdateProductAccessRequest(BaseModel):
    """Request model for updating user's product access"""
    user_id: str
    product_updates: dict  # {"DIGITS_LIFE": True, "ASSURE_PLUS": False}


# Product mapping for easy access
PRODUCT_MAP = {
    "DIGITS_LIFE": "IsSubscribedDigitsLife",
    "DIGITS_NON_LIFE": "IssubscribedDigitsNonLife",
    "DIGITS_PLUS": "IsSubscribedDigitsPlus",
    "ASSURE_LIFE": "IsSubscribedAssureLife",
    "ASSURE_NON_LIFE": "IssubscribedAssureNonLife",
    "ASSURE_PLUS": "IsSubscribedAssurePlus",
}


def verify_master_admin(user_id: str, db: Session):
    """Helper function to verify if user is MasterAdmin"""
    admin = db.query(UserMaster).filter(UserMaster.UserID == user_id).first()
    
    if not admin:
        raise HTTPException(status_code=404, detail="Admin user not found")
    
    if not admin.IsMasterAdmin:
        raise HTTPException(
            status_code=403, 
            detail="Only MasterAdmin can perform this action"
        )
    
    return admin


# -------------------------------------------------
# 1️⃣ APPROVE USER AND ASSIGN PRODUCTS
# -------------------------------------------------
@router.post("/approve-user")
def approve_user(
    request: ApproveUserRequest,
    admin_user_id: str = Header(..., alias="X-Admin-User-Id"),
    db: Session = Depends(get_db)
):
    """
    Approve a user and assign product subscriptions.
    Only MasterAdmin can use this endpoint.
    """
    # 1. Verify requesting user is MasterAdmin
    verify_master_admin(admin_user_id, db)
    
    # 2. Find user to approve
    user = db.query(UserMaster).filter(
        UserMaster.UserID == request.user_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 3. Set product permissions
    approved_products = []
    for product in request.products:
        if product in PRODUCT_MAP:
            setattr(user, PRODUCT_MAP[product], True)
            approved_products.append(product)
    
    # 4. Set MasterAdmin if requested
    if request.make_master_admin:
        user.IsMasterAdmin = True
        # MasterAdmins get all products
        for product_flag in PRODUCT_MAP.values():
            setattr(user, product_flag, True)
        approved_products = list(PRODUCT_MAP.keys())
    
    # 5. Update user details and subscription dates
    user.UserDetail = request.user_detail
    user.UserStartDate = date.today()
    
    if request.subscription_days:
        user.UserEndDate = date.today() + timedelta(days=request.subscription_days)
    
    # 6. Ensure user is active
    user.IsUserActive = True
    
    db.commit()
    db.refresh(user)
    
    return {
        "success": True,
        "user_id": user.UserID,
        "email": user.UserLoginEmailName,
        "name": user.UserLongName,
        "user_detail": user.UserDetail,
        "approved_products": approved_products,
        "is_master_admin": bool(user.IsMasterAdmin),
        "subscription_start": str(user.UserStartDate) if user.UserStartDate else None,
        "subscription_end": str(user.UserEndDate) if user.UserEndDate else None
    }


# -------------------------------------------------
# 2️⃣ UPDATE PRODUCT ACCESS
# -------------------------------------------------
@router.patch("/update-product-access")
def update_product_access(
    request: UpdateProductAccessRequest,
    admin_user_id: str = Header(..., alias="X-Admin-User-Id"),
    db: Session = Depends(get_db)
):
    """
    Update specific product access for a user.
    Only MasterAdmin can use this endpoint.
    """
    # 1. Verify requesting user is MasterAdmin
    verify_master_admin(admin_user_id, db)
    
    # 2. Find user to update
    user = db.query(UserMaster).filter(
        UserMaster.UserID == request.user_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 3. Update product permissions
    updated_products = {}
    for product, access_value in request.product_updates.items():
        if product in PRODUCT_MAP:
            setattr(user, PRODUCT_MAP[product], access_value)
            updated_products[product] = access_value
    
    db.commit()
    db.refresh(user)
    
    return {
        "success": True,
        "user_id": user.UserID,
        "updated_products": updated_products
    }


# -------------------------------------------------
# 3️⃣ TOGGLE MASTER ADMIN STATUS
# -------------------------------------------------
@router.patch("/toggle-master-admin/{user_id}")
def toggle_master_admin(
    user_id: str,
    make_admin: bool,
    admin_user_id: str = Header(..., alias="X-Admin-User-Id"),
    db: Session = Depends(get_db)
):
    """
    Toggle MasterAdmin status for a user.
    Only existing MasterAdmin can use this endpoint.
    """
    # 1. Verify requesting user is MasterAdmin
    verify_master_admin(admin_user_id, db)
    
    # 2. Find user to update
    user = db.query(UserMaster).filter(UserMaster.UserID == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 3. Update MasterAdmin status
    user.IsMasterAdmin = make_admin
    
    # 4. If making them admin, give them all products
    if make_admin:
        for product_flag in PRODUCT_MAP.values():
            setattr(user, product_flag, True)
    
    db.commit()
    db.refresh(user)
    
    return {
        "success": True,
        "user_id": user.UserID,
        "email": user.UserLoginEmailName,
        "is_master_admin": bool(user.IsMasterAdmin)
    }


# -------------------------------------------------
# 4️⃣ GET PENDING APPROVAL USERS
# -------------------------------------------------
@router.get("/pending-approval")
def get_pending_approval_users(
    admin_user_id: str = Header(..., alias="X-Admin-User-Id"),
    db: Session = Depends(get_db)
):
    """
    Get all users who need approval (Trial users with no product access).
    Only MasterAdmin can use this endpoint.
    """
    # 1. Verify requesting user is MasterAdmin
    verify_master_admin(admin_user_id, db)
    
    # 2. Find users who are Trial and have no product access
    users = db.query(UserMaster).filter(
        UserMaster.UserDetail == "Trial",
        UserMaster.IsUserActive == True
    ).all()
    
    pending_users = []
    for user in users:
        # Check if user has any product access
        has_any_product = any(
            getattr(user, flag, False) for flag in PRODUCT_MAP.values()
        )
        
        # Only include users with no products OR users explicitly marked as needing approval
        pending_users.append({
            "user_id": user.UserID,
            "email": user.UserLoginEmailName,
            "name": user.UserLongName,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "has_any_product": has_any_product,
            "current_products": {
                product: getattr(user, flag, False)
                for product, flag in PRODUCT_MAP.items()
            }
        })
    
    return {
        "total_pending": len(pending_users),
        "users": pending_users
    }


# -------------------------------------------------
# 5️⃣ GET ALL USERS WITH ACCESS DETAILS
# -------------------------------------------------
@router.get("/all-users")
def get_all_users_with_access(
    admin_user_id: str = Header(..., alias="X-Admin-User-Id"),
    db: Session = Depends(get_db)
):
    """
    Get all users with their product access details.
    Only MasterAdmin can use this endpoint.
    """
    # 1. Verify requesting user is MasterAdmin
    verify_master_admin(admin_user_id, db)
    
    # 2. Get all users
    users = db.query(UserMaster).all()
    
    user_list = []
    for user in users:
        user_list.append({
            "user_id": user.UserID,
            "email": user.UserLoginEmailName,
            "name": user.UserLongName,
            "user_type": user.UserType,
            "user_detail": user.UserDetail,
            "is_active": bool(user.IsUserActive),
            "is_master_admin": bool(user.IsMasterAdmin),
            "is_dms_user": bool(user.IsDMSUser),
            "subscription_start": str(user.UserStartDate) if user.UserStartDate else None,
            "subscription_end": str(user.UserEndDate) if user.UserEndDate else None,
            "products": {
                product: getattr(user, flag, False)
                for product, flag in PRODUCT_MAP.items()
            },
            "created_at": user.created_at.isoformat() if user.created_at else None
        })
    
    return {
        "total_users": len(user_list),
        "users": user_list
    }


# -------------------------------------------------
# 6️⃣ DEACTIVATE USER
# -------------------------------------------------
@router.patch("/deactivate-user/{user_id}")
def deactivate_user(
    user_id: str,
    admin_user_id: str = Header(..., alias="X-Admin-User-Id"),
    db: Session = Depends(get_db)
):
    """
    Deactivate a user (set IsUserActive to False).
    Only MasterAdmin can use this endpoint.
    """
    # 1. Verify requesting user is MasterAdmin
    verify_master_admin(admin_user_id, db)
    
    # 2. Find user to deactivate
    user = db.query(UserMaster).filter(UserMaster.UserID == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 3. Deactivate user
    user.IsUserActive = False
    
    db.commit()
    
    return {
        "success": True,
        "user_id": user.UserID,
        "email": user.UserLoginEmailName,
        "is_active": False
    }


# -------------------------------------------------
# 7️⃣ REACTIVATE USER
# -------------------------------------------------
@router.patch("/reactivate-user/{user_id}")
def reactivate_user(
    user_id: str,
    admin_user_id: str = Header(..., alias="X-Admin-User-Id"),
    db: Session = Depends(get_db)
):
    """
    Reactivate a user (set IsUserActive to True).
    Only MasterAdmin can use this endpoint.
    """
    # 1. Verify requesting user is MasterAdmin
    verify_master_admin(admin_user_id, db)
    
    # 2. Find user to reactivate
    user = db.query(UserMaster).filter(UserMaster.UserID == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 3. Reactivate user
    user.IsUserActive = True
    
    db.commit()
    
    return {
        "success": True,
        "user_id": user.UserID,
        "email": user.UserLoginEmailName,
        "is_active": True
    }
