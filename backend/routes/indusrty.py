from fastapi import APIRouter, Depends
from databases.database import get_db
from sqlalchemy import text
from databases.models import IndustryMaster
from fastapi import HTTPException
from pydantic import BaseModel
from typing import Optional, List

# Pydantic models for create and update


class IndustryCreate(BaseModel):
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


class IndustryUpdate(BaseModel):
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

# 1️⃣ Get Premium Types by Country (Domestic / International)


@router.get("/premium-types")
def get_premium_types(data_type: str, db=Depends(get_db)):
    query = text("""
        SELECT DISTINCT PremiumTypeLongName
        FROM industry_master
        WHERE DataType LIKE :data_type
        AND PremiumTypeLongName <> ''
        ORDER BY PremiumTypeLongName;
    """)
    result = db.execute(query, {"data_type": f"%{data_type}%"}).fetchall()
    return [row[0] for row in result]

# 2️⃣ Get Category List based on PremiumType and Country


@router.get("/categories")
def get_categories(data_type: str, premium: str, db=Depends(get_db)):
    query = text("""
        SELECT DISTINCT CategoryLongName
        FROM industry_master
        WHERE DataType LIKE :data_type
        AND PremiumTypeLongName LIKE :premium
        AND CategoryLongName <> ''
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
        FROM industry_master
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
async def add_industry_row(data: IndustryCreate, db=Depends(get_db)):
    new_record = IndustryMaster(**data.dict())
    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    return {"message": "Record added successfully!", "id": new_record.id}


@router.patch("/update/{id}")
async def update_industry_row(id: int, data: IndustryUpdate, db=Depends(get_db)):
    record = db.query(IndustryMaster).filter(IndustryMaster.id == id).first()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    update_data = data.dict(exclude_unset=True)

    for key, value in update_data.items():
        setattr(record, key, value)

    db.commit()
    db.refresh(record)

    return {"message": f"Record ID {id} updated successfully!"}


@router.delete("/delete/{id}")
async def delete_industry_row(id: int, db=Depends(get_db)):
    record = db.query(IndustryMaster).filter(IndustryMaster.id == id).first()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    db.delete(record)
    db.commit()

    return {"message": f"Record ID {id} deleted successfully!"}


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
        FROM industry_master
        WHERE Description IN ({placeholders})
        AND IsActive = 1
        ORDER BY DataType, PremiumTypeLongName, CategoryLongName, ProcessedFYYear;
    """)
    
    result = db.execute(query, params)
    columns = result.keys()
    return [dict(zip(columns, row)) for row in result.fetchall()]
