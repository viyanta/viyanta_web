from fastapi import APIRouter, Depends
from databases.database import get_db
from sqlalchemy import text, delete
from databases.models import EconomyMaster, DashboardSelectedDescriptions
from fastapi import HTTPException
from pydantic import BaseModel
from typing import Optional, List
import json
import os

# Pydantic models for create and update


class EconomyCreate(BaseModel):
    ProcessedPeriodType: Optional[str] = None
    ProcessedFYYear: Optional[str] = None
    DataType: Optional[str] = None
    CountryName: Optional[str] = None
    PremiumTypeLongName: Optional[str] = None
    CategoryLongName: Optional[str] = None
    Description: Optional[str] = None
    ReportedUnit: Optional[str] = None
    ReportedValue: Optional[str] = None
    IsActive: Optional[bool] = True
 


class EconomyUpdate(BaseModel):
    ProcessedPeriodType: Optional[str] = None
    ProcessedFYYear: Optional[str] = None
    DataType: Optional[str] = None
    CountryName: Optional[str] = None
    PremiumTypeLongName: Optional[str] = None
    CategoryLongName: Optional[str] = None
    Description: Optional[str] = None
    ReportedUnit: Optional[str] = None
    ReportedValue: Optional[str] = None
    IsActive: Optional[bool] = None


router = APIRouter()

# Health check endpoint for economy routes
@router.get("/health")
def economy_health_check():
    """Health check endpoint to verify economy routes are accessible"""
    return {
        "status": "ok",
        "message": "Economy routes are working",
        "endpoints": {
            "selected-descriptions": "/api/economy/selected-descriptions",
            "update-selected-descriptions": "/api/economy/update-selected-descriptions"
        }
    }

# 1️⃣ Get Premium Types by Country (Domestic / International)


@router.get("/premium-types")
def get_premium_types(data_type: str, db=Depends(get_db)):
    query = text("""
        SELECT DISTINCT PremiumTypeLongName
        FROM economy_master
        WHERE DataType LIKE :data_type
        AND PremiumTypeLongName <> ''
        AND IsActive = 1
        ORDER BY PremiumTypeLongName;
    """)
    result = db.execute(query, {"data_type": f"%{data_type}%"}).fetchall()
    return [row[0] for row in result]

# 2️⃣ Get Category List based on PremiumType and Country


@router.get("/categories")
def get_categories(data_type: str, premium: str, db=Depends(get_db)):
    query = text("""
        SELECT DISTINCT CategoryLongName
        FROM economy_master
        WHERE DataType LIKE :data_type
        AND PremiumTypeLongName LIKE :premium
        AND CategoryLongName <> ''
        AND IsActive = 1
        ORDER BY CategoryLongName;
    """)
    result = db.execute(query, {
        "data_type": f"%{data_type}%",
        "premium": f"%{premium}%"
    }).fetchall()
    return [row[0] for row in result]


# 3️⃣ Get full table data for both selections
@router.get("/data")
def get_data(data_type: str, premium: str, category: str, db=Depends(get_db)):
    query = text("""
        SELECT *
        FROM economy_master
        WHERE DataType LIKE :data_type
        AND PremiumTypeLongName LIKE :premium
        AND CategoryLongName LIKE :category;
    """)

    result = db.execute(query, {
        "data_type": f"%{data_type}%",
        "premium": f"%{premium}%",
        "category": f"%{category}%"
    })

    columns = result.keys()
    return [dict(zip(columns, row)) for row in result.fetchall()]


@router.post("/add")
async def add_economy_row(data: EconomyCreate, db=Depends(get_db)):
    new_record = EconomyMaster(**data.dict())
    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    return {"message": "Record added successfully!", "id": new_record.id}


@router.patch("/update/{id}")
async def update_economy_row(id: int, data: EconomyUpdate, db=Depends(get_db)):
    record = db.query(EconomyMaster).filter(EconomyMaster.id == id).first()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    update_data = data.dict(exclude_unset=True)

    for key, value in update_data.items():
        setattr(record, key, value)

    db.commit()
    db.refresh(record)

    return {"message": f"Record ID {id} updated successfully!"}


@router.delete("/delete/{id}")
async def delete_economy_row(id: int, db=Depends(get_db)):
    record = db.query(EconomyMaster).filter(EconomyMaster.id == id).first()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    db.delete(record)
    db.commit()

    return {"message": f"Record ID {id} deleted successfully!"}


# 4️⃣ Get dashboard data filtered by descriptions (optimized endpoint)
class DashboardDataRequest(BaseModel):
    descriptions: List[str]

@router.post("/dashboard-data")
def get_dashboard_data(request: DashboardDataRequest, db=Depends(get_db)):
    """Get all data for selected descriptions in a single query"""
    descriptions = request.descriptions
    if not descriptions or len(descriptions) == 0:
        return []
    
    # Create placeholders for IN clause
    placeholders = ','.join([f':desc{i}' for i in range(len(descriptions))])
    params = {f'desc{i}': desc for i, desc in enumerate(descriptions)}
    
    query = text(f"""
        SELECT *
        FROM economy_master
        WHERE Description IN ({placeholders})
        AND IsActive = 1
        ORDER BY DataType, PremiumTypeLongName, CategoryLongName, ProcessedFYYear;
    """)
    
    result = db.execute(query, params)
    columns = result.keys()
    return [dict(zip(columns, row)) for row in result.fetchall()]


# 5️⃣ Get selected descriptions (global for all users)
@router.get("/selected-descriptions")
def get_selected_descriptions(db=Depends(get_db)):
    """Get globally selected descriptions for dashboard"""
    try:
        # Check database type
        DB_TYPE = os.getenv("DB_TYPE", "sqlite")
        
        # First, ensure the table exists
        if DB_TYPE == "mysql":
            create_table_query = text("""
                CREATE TABLE IF NOT EXISTS dashboard_selected_descriptions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    description VARCHAR(500) NOT NULL UNIQUE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            """)
        else:
            create_table_query = text("""
                CREATE TABLE IF NOT EXISTS dashboard_selected_descriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    description TEXT NOT NULL UNIQUE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
        
        db.execute(create_table_query)
        db.commit()
        
        # Now fetch descriptions
        query = text("SELECT description FROM dashboard_selected_descriptions ORDER BY id")
        result = db.execute(query)
        descriptions = [row[0] for row in result.fetchall()]
        return {"descriptions": descriptions}
    except Exception as e:
        print(f"Error fetching selected descriptions: {e}")
        import traceback
        traceback.print_exc()
        # If table doesn't exist yet or any error, return empty list
        return {"descriptions": []}

# 6️⃣ Update selected descriptions (save globally in database)
class UpdateSelectedDescriptionsRequest(BaseModel):
    descriptions: List[str]
    removed_description: Optional[str] = None

@router.post("/update-selected-descriptions")
def update_selected_descriptions(request: UpdateSelectedDescriptionsRequest, db=Depends(get_db)):
    """Update selected descriptions globally - saves to database for all users"""
    descriptions = request.descriptions
    removed_description = request.removed_description
    
    try:
        # First, ensure the table exists (create if not exists)
        # Check database type and use appropriate syntax
        DB_TYPE = os.getenv("DB_TYPE", "sqlite")
        
        if DB_TYPE == "mysql":
            create_table_query = text("""
                CREATE TABLE IF NOT EXISTS dashboard_selected_descriptions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    description VARCHAR(500) NOT NULL UNIQUE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            """)
        else:
            create_table_query = text("""
                CREATE TABLE IF NOT EXISTS dashboard_selected_descriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    description TEXT NOT NULL UNIQUE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
        
        db.execute(create_table_query)
        db.commit()
        
        # Get current descriptions from database
        get_current_query = text("SELECT description FROM dashboard_selected_descriptions")
        current_result = db.execute(get_current_query)
        current_descriptions = [row[0] for row in current_result.fetchall()]
        
        # Add new descriptions (check if exists first to avoid errors)
        for desc in descriptions:
            if desc and desc not in current_descriptions:
                if DB_TYPE == "mysql":
                    insert_query = text("""
                        INSERT INTO dashboard_selected_descriptions (description)
                        VALUES (:description)
                        ON DUPLICATE KEY UPDATE description = :description
                    """)
                else:
                    insert_query = text("""
                        INSERT OR IGNORE INTO dashboard_selected_descriptions (description)
                        VALUES (:description)
                    """)
                db.execute(insert_query, {"description": desc})
        
        # Remove descriptions that are no longer in the list
        descriptions_to_remove = [d for d in current_descriptions if d not in descriptions]
        for desc in descriptions_to_remove:
            delete_query = text("DELETE FROM dashboard_selected_descriptions WHERE description = :description")
            db.execute(delete_query, {"description": desc})
        
        # If a specific description was removed, ensure it's deleted
        if removed_description:
            delete_query = text("DELETE FROM dashboard_selected_descriptions WHERE description = :description")
            db.execute(delete_query, {"description": removed_description})
        
        db.commit()
        
        # Log the action
        if removed_description:
            print(f"Description deselected: {removed_description}")
        print(f"Updated selected descriptions: {descriptions}")
        
        return {
            "message": "Selected descriptions updated successfully",
            "current_selections": descriptions,
            "removed": removed_description
        }
    except Exception as e:
        db.rollback()
        print(f"Error updating selected descriptions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update selected descriptions: {str(e)}")
