# from fastapi import APIRouter, Depends
# from databases.database import get_db
# from sqlalchemy import text
# from databases.models import EconomyMaster
# from fastapi import HTTPException
# from pydantic import BaseModel
# from typing import Optional

# # Pydantic models for create and update


# class EconomyCreate(BaseModel):
#     ProcessedPeriodType: Optional[str] = None
#     ProcessedFYYear: Optional[str] = None
#     DataType: Optional[str] = None
#     CountryName: Optional[str] = None
#     PremiumTypeLongName: Optional[str] = None
#     CategoryLongName: Optional[str] = None
#     Description: Optional[str] = None
#     ReportedUnit: Optional[str] = None
#     ReportedValue: Optional[str] = None
#     IsActive: Optional[bool] = True  # Default active


# class EconomyUpdate(BaseModel):
#     ProcessedPeriodType: Optional[str] = None
#     ProcessedFYYear: Optional[str] = None
#     DataType: Optional[str] = None
#     CountryName: Optional[str] = None
#     PremiumTypeLongName: Optional[str] = None
#     CategoryLongName: Optional[str] = None
#     Description: Optional[str] = None
#     ReportedUnit: Optional[str] = None
#     ReportedValue: Optional[str] = None
#     IsActive: Optional[bool] = None


# router = APIRouter()

# # 1️⃣ Get Premium Types by Country (Domestic / International)


# @router.get("/premium-types")
# def get_premium_types(data_type: str, db=Depends(get_db)):
#     query = text("""
#         SELECT DISTINCT PremiumTypeLongName
#         FROM economy_master
#         WHERE DataType LIKE :data_type
#         AND PremiumTypeLongName <> ''
#         ORDER BY PremiumTypeLongName;
#     """)
#     result = db.execute(query, {"data_type": f"%{data_type}%"}).fetchall()
#     return [row[0] for row in result]

# # 2️⃣ Get Category List based on PremiumType and Country


# @router.get("/categories")
# def get_categories(data_type: str, premium: str, db=Depends(get_db)):
#     query = text("""
#         SELECT DISTINCT CategoryLongName
#         FROM economy_master
#         WHERE DataType LIKE :data_type
#         AND PremiumTypeLongName LIKE :premium
#         AND CategoryLongName <> ''
#         ORDER BY CategoryLongName;
#     """)
#     result = db.execute(query, {
#         "data_type": f"%{data_type}%",
#         "premium": f"%{premium}%"
#     }).fetchall()
#     return [row[0] for row in result]


# # 3️⃣ Get full table data for both selections
# @router.get("/data")
# def get_data(data_type: str, premium: str, category: str, db=Depends(get_db)):
#     query = text("""
#         SELECT *
#         FROM economy_master
#         WHERE DataType LIKE :data_type
#         AND PremiumTypeLongName LIKE :premium
#         AND CategoryLongName LIKE :category;
#     """)

#     result = db.execute(query, {
#         "data_type": f"%{data_type}%",
#         "premium": f"%{premium}%",
#         "category": f"%{category}%"
#     })

#     columns = result.keys()
#     return [dict(zip(columns, row)) for row in result.fetchall()]


# @router.post("/add")
# async def add_economy_row(data: EconomyCreate, db=Depends(get_db)):
#     new_record = EconomyMaster(**data.dict())
#     db.add(new_record)
#     db.commit()
#     db.refresh(new_record)

#     return {"message": "Record added successfully!", "id": new_record.id}


# @router.patch("/update/{id}")
# async def update_economy_row(id: int, data: EconomyUpdate, db=Depends(get_db)):
#     record = db.query(EconomyMaster).filter(EconomyMaster.id == id).first()

#     if not record:
#         raise HTTPException(status_code=404, detail="Record not found")

#     update_data = data.dict(exclude_unset=True)

#     for key, value in update_data.items():
#         setattr(record, key, value)

#     db.commit()
#     db.refresh(record)

#     return {"message": f"Record ID {id} updated successfully!"}


# @router.delete("/delete/{id}")
# async def delete_economy_row(id: int, db=Depends(get_db)):
#     record = db.query(EconomyMaster).filter(EconomyMaster.id == id).first()

#     if not record:
#         raise HTTPException(status_code=404, detail="Record not found")

#     db.delete(record)
#     db.commit()

#     return {"message": f"Record ID {id} deleted successfully!"}


from fastapi import APIRouter, Depends
from databases.database import get_db
from sqlalchemy import text, delete
from databases.models import EconomyMaster, DashboardSelectedDescriptions, DashboardChartConfig
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


# 3️⃣ Get Descriptions (for Category and Sub Category)
@router.get("/descriptions")
def get_descriptions(data_type: str, premium: str, category: str, db=Depends(get_db)):
    """Get unique descriptions for a specific Category and Sub Category"""
    query = text("""
        SELECT DISTINCT Description
        FROM economy_master
        WHERE DataType LIKE :data_type
        AND PremiumTypeLongName LIKE :premium
        AND CategoryLongName LIKE :category
        AND Description <> ''
        AND Description IS NOT NULL
        AND IsActive = 1
        ORDER BY Description;
    """)
    result = db.execute(query, {
        "data_type": f"%{data_type}%",
        "premium": f"%{premium}%",
        "category": f"%{category}%"
    }).fetchall()
    return [row[0] for row in result]


# 3.5️⃣ Get unique values for form fields
@router.get("/unique-values")
def get_unique_values(data_type: str, field: str, db=Depends(get_db)):
    """Get unique values for a specific field, ordered appropriately"""
    DB_TYPE = os.getenv("DB_TYPE", "sqlite")
    
    # Map field names to database columns
    field_map = {
        'ProcessedPeriodType': 'ProcessedPeriodType',
        'ProcessedFYYear': 'ProcessedFYYear',
        'CountryName': 'CountryName',
        'Description': 'Description',
        'ReportedUnit': 'ReportedUnit',
        'ReportedValue': 'ReportedValue'
    }
    
    if field not in field_map:
        return []
    
    column = field_map[field]
    
    # Simple query - we'll do sorting in Python for better compatibility
    query = text(f"""
        SELECT DISTINCT {column}
        FROM economy_master
        WHERE DataType LIKE :data_type
        AND {column} <> ''
        AND {column} IS NOT NULL
        AND IsActive = 1
    """)
    
    try:
        result = db.execute(query, {"data_type": f"%{data_type}%"}).fetchall()
        values = [str(row[0]) for row in result if row[0] is not None]
        
        # Sort values appropriately
        if field in ['ProcessedFYYear', 'ReportedValue']:
            # For numeric fields, sort descending (newest/highest first)
            try:
                if field == 'ProcessedFYYear':
                    # Extract year number for sorting
                    def extract_year(val):
                        val_str = str(val).upper().strip()
                        if val_str.startswith('FY'):
                            try:
                                return int(val_str[2:])
                            except:
                                return 0
                        try:
                            return int(val_str)
                        except:
                            return 0
                    values.sort(key=extract_year, reverse=True)
                else:  # ReportedValue
                    # Try to sort by numeric value descending
                    def extract_numeric(val):
                        val_str = str(val).strip()
                        try:
                            # Try to parse as float
                            return float(val_str)
                        except:
                            # If not numeric, put at end
                            return float('-inf')
                    values.sort(key=extract_numeric, reverse=True)
            except Exception as sort_err:
                print(f"Error sorting {field}: {sort_err}")
                # Fallback to simple reverse sort
                values.sort(reverse=True)
        else:
            # For text fields, sort ascending (A-Z)
            values.sort()
        
        return values
    except Exception as e:
        # Fallback to simple query if complex ordering fails
        print(f"Error in query for {field}, using simple query: {e}")
        import traceback
        traceback.print_exc()
        query = text(f"""
            SELECT DISTINCT {column}
            FROM economy_master
            WHERE DataType LIKE :data_type
            AND {column} <> ''
            AND {column} IS NOT NULL
            AND IsActive = 1
            ORDER BY {column} {'DESC' if field in ['ProcessedFYYear', 'ReportedValue'] else 'ASC'}
        """)
        result = db.execute(query, {"data_type": f"%{data_type}%"}).fetchall()
        return [str(row[0]) for row in result if row[0] is not None]


# 4️⃣ Get full table data for both selections
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
    """Get all data for selected descriptions, filtered by selected row IDs"""
    descriptions = request.descriptions
    if not descriptions or len(descriptions) == 0:
        return []
    
    DB_TYPE = os.getenv("DB_TYPE", "sqlite")
    
    # Get selected row IDs for each description
    selected_row_ids_map = {}
    for desc in descriptions:
        try:
            # Fetch selected row IDs for this description (try both Domestic and International)
            for data_type in ['Domestic', 'International']:
                query = text("""
                    SELECT row_ids FROM dashboard_selected_row_ids 
                    WHERE data_type = :data_type AND description = :description
                """)
                result = db.execute(query, {"data_type": data_type, "description": desc})
                row = result.fetchone()
                if row:
                    if DB_TYPE == "mysql":
                        row_ids = row[0] if isinstance(row[0], list) else json.loads(row[0])
                    else:
                        row_ids = json.loads(row[0])
                    if desc not in selected_row_ids_map:
                        selected_row_ids_map[desc] = []
                    # Ensure row IDs are integers
                    row_ids_int = [int(rid) for rid in row_ids if rid is not None]
                    selected_row_ids_map[desc].extend(row_ids_int)
                    print(f"✅ Loaded {len(row_ids_int)} selected row IDs for '{desc}' ({data_type}): {row_ids_int}")
        except Exception as e:
            print(f"Error fetching selected row IDs for {desc}: {e}")
            # If no selected row IDs found, we'll show all data for that description
    
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
    all_data = [dict(zip(columns, row)) for row in result.fetchall()]
    
    # Filter by selected row IDs - ONLY show data if row IDs are selected
    # If a description is selected but has no selected row IDs, don't show any data for it
    filtered_data = []
    for item in all_data:
        desc = item.get('Description', '')
        item_id = item.get('id')
        
        # Only include data if this description has selected row IDs AND this row ID is in the selection
        if desc in selected_row_ids_map and selected_row_ids_map[desc]:
            # Convert both to int for comparison (row IDs might be stored as strings in JSON)
            item_id_int = int(item_id) if item_id is not None else None
            selected_ids = [int(rid) for rid in selected_row_ids_map[desc] if rid is not None]
            if item_id_int is not None and item_id_int in selected_ids:
                filtered_data.append(item)
        # If description has no selected row IDs, don't include any data (don't show all data)
    
    print(f"📊 Dashboard filtering: {len(all_data)} total rows, {len(filtered_data)} after row ID filtering")
    print(f"📋 Selected row IDs map: {selected_row_ids_map}")
    print(f"📝 Descriptions requested: {descriptions}")
    print(f"✅ Returning {len(filtered_data)} rows (only rows with selected IDs)")
    
    return filtered_data


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

# 7️⃣ Get Selected Row IDs for Dashboard
@router.get("/selected-row-ids")
def get_selected_row_ids(data_type: str, description: str, db=Depends(get_db)):
    """Get selected row IDs for a specific description and data type"""
    try:
        DB_TYPE = os.getenv("DB_TYPE", "sqlite")
        
        if DB_TYPE == "mysql":
            create_table_query = text("""
                CREATE TABLE IF NOT EXISTS dashboard_selected_row_ids (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    data_type VARCHAR(50) NOT NULL,
                    description VARCHAR(500) NOT NULL,
                    row_ids JSON NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_data_desc (data_type, description)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """)
        else:
            create_table_query = text("""
                CREATE TABLE IF NOT EXISTS dashboard_selected_row_ids (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    data_type TEXT NOT NULL,
                    description TEXT NOT NULL,
                    row_ids TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(data_type, description)
                )
            """)
        
        db.execute(create_table_query)
        db.commit()
        
        # Fetch row IDs for this data_type and description
        query = text("""
            SELECT row_ids FROM dashboard_selected_row_ids 
            WHERE data_type = :data_type AND description = :description
        """)
        result = db.execute(query, {"data_type": data_type, "description": description})
        row = result.fetchone()
        
        if row:
            if DB_TYPE == "mysql":
                # MySQL returns JSON directly
                row_ids = row[0] if isinstance(row[0], list) else json.loads(row[0])
            else:
                # SQLite stores as TEXT, need to parse
                row_ids = json.loads(row[0])
            return {"row_ids": row_ids}
        else:
            return {"row_ids": []}
    except Exception as e:
        print(f"Error fetching selected row IDs: {e}")
        import traceback
        traceback.print_exc()
        return {"row_ids": []}

# 8️⃣ Update Selected Row IDs for Dashboard
class UpdateSelectedRowIdsRequest(BaseModel):
    data_type: str
    description: str
    row_ids: List[int]

@router.post("/update-selected-row-ids")
def update_selected_row_ids(request: UpdateSelectedRowIdsRequest, db=Depends(get_db)):
    """Update selected row IDs for a specific description and data type"""
    try:
        DB_TYPE = os.getenv("DB_TYPE", "sqlite")
        
        # Ensure table exists
        if DB_TYPE == "mysql":
            create_table_query = text("""
                CREATE TABLE IF NOT EXISTS dashboard_selected_row_ids (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    data_type VARCHAR(50) NOT NULL,
                    description VARCHAR(500) NOT NULL,
                    row_ids JSON NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_data_desc (data_type, description)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """)
        else:
            create_table_query = text("""
                CREATE TABLE IF NOT EXISTS dashboard_selected_row_ids (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    data_type TEXT NOT NULL,
                    description TEXT NOT NULL,
                    row_ids TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(data_type, description)
                )
            """)
        
        db.execute(create_table_query)
        db.commit()
        
        # Convert row_ids to JSON string
        if DB_TYPE == "mysql":
            row_ids_json = json.dumps(request.row_ids)
        else:
            row_ids_json = json.dumps(request.row_ids)
        
        # Check if record exists
        check_query = text("""
            SELECT id FROM dashboard_selected_row_ids 
            WHERE data_type = :data_type AND description = :description
        """)
        result = db.execute(check_query, {
            "data_type": request.data_type,
            "description": request.description
        })
        existing = result.fetchone()
        
        # If row_ids is empty, delete the record instead of updating
        if not request.row_ids or len(request.row_ids) == 0:
            if existing:
                delete_query = text("""
                    DELETE FROM dashboard_selected_row_ids 
                    WHERE data_type = :data_type AND description = :description
                """)
                db.execute(delete_query, {
                    "data_type": request.data_type,
                    "description": request.description
                })
                db.commit()
                print(f"✅ Deleted row IDs record for {request.data_type} - {request.description}")
                return {"message": "Selected row IDs cleared successfully", "row_ids": []}
        
        if existing:
            # Update existing record
            if DB_TYPE == "mysql":
                update_query = text("""
                    UPDATE dashboard_selected_row_ids 
                    SET row_ids = :row_ids, updated_at = CURRENT_TIMESTAMP
                    WHERE data_type = :data_type AND description = :description
                """)
                db.execute(update_query, {
                    "row_ids": row_ids_json,
                    "data_type": request.data_type,
                    "description": request.description
                })
            else:
                update_query = text("""
                    UPDATE dashboard_selected_row_ids 
                    SET row_ids = :row_ids, updated_at = CURRENT_TIMESTAMP
                    WHERE data_type = :data_type AND description = :description
                """)
                db.execute(update_query, {
                    "row_ids": row_ids_json,
                    "data_type": request.data_type,
                    "description": request.description
                })
        else:
            # Insert new record
            insert_query = text("""
                INSERT INTO dashboard_selected_row_ids (data_type, description, row_ids)
                VALUES (:data_type, :description, :row_ids)
            """)
            db.execute(insert_query, {
                "data_type": request.data_type,
                "description": request.description,
                "row_ids": row_ids_json
            })
        
        db.commit()
        return {
            "message": "Selected row IDs updated successfully",
            "data_type": request.data_type,
            "description": request.description,
            "row_ids": request.row_ids
        }
    except Exception as e:
        db.rollback()
        print(f"Error updating selected row IDs: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to update selected row IDs: {str(e)}")


# 7️⃣ Get chart configurations for all descriptions
@router.get("/chart-configs")
def get_chart_configs(db=Depends(get_db)):
    """Get chart configurations (type and dimension) for all descriptions"""
    try:
        DB_TYPE = os.getenv("DB_TYPE", "sqlite")
        
        # Ensure table exists
        if DB_TYPE == "mysql":
            create_table_query = text("""
                CREATE TABLE IF NOT EXISTS dashboard_chart_config (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    description VARCHAR(500) NOT NULL UNIQUE,
                    chart_type VARCHAR(50) NOT NULL DEFAULT 'bar',
                    chart_dimension VARCHAR(50) NOT NULL DEFAULT 'country',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_description (description)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """)
        else:
            create_table_query = text("""
                CREATE TABLE IF NOT EXISTS dashboard_chart_config (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    description TEXT NOT NULL UNIQUE,
                    chart_type TEXT NOT NULL DEFAULT 'bar',
                    chart_dimension TEXT NOT NULL DEFAULT 'country',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
        
        db.execute(create_table_query)
        db.commit()
        
        # Fetch all configurations
        query = text("SELECT description, chart_type, chart_dimension FROM dashboard_chart_config")
        result = db.execute(query)
        configs = {}
        for row in result.fetchall():
            configs[row[0]] = {
                "chart_type": row[1],
                "chart_dimension": row[2]
            }
        return configs
    except Exception as e:
        print(f"Error fetching chart configs: {e}")
        import traceback
        traceback.print_exc()
        return {}


# 8️⃣ Save chart configurations
class ChartConfigRequest(BaseModel):
    description: str
    chart_type: str  # bar, pie, treemap
    chart_dimension: str  # country, year

class ChartConfigsRequest(BaseModel):
    configs: List[ChartConfigRequest]

@router.post("/save-chart-configs")
def save_chart_configs(request: ChartConfigsRequest, db=Depends(get_db)):
    """Save chart configurations for multiple descriptions"""
    try:
        DB_TYPE = os.getenv("DB_TYPE", "sqlite")
        
        # Ensure table exists
        if DB_TYPE == "mysql":
            create_table_query = text("""
                CREATE TABLE IF NOT EXISTS dashboard_chart_config (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    description VARCHAR(500) NOT NULL UNIQUE,
                    chart_type VARCHAR(50) NOT NULL DEFAULT 'bar',
                    chart_dimension VARCHAR(50) NOT NULL DEFAULT 'country',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_description (description)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """)
        else:
            create_table_query = text("""
                CREATE TABLE IF NOT EXISTS dashboard_chart_config (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    description TEXT NOT NULL UNIQUE,
                    chart_type TEXT NOT NULL DEFAULT 'bar',
                    chart_dimension TEXT NOT NULL DEFAULT 'country',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
        
        db.execute(create_table_query)
        db.commit()
        
        # Save or update each configuration
        for config in request.configs:
            if DB_TYPE == "mysql":
                upsert_query = text("""
                    INSERT INTO dashboard_chart_config (description, chart_type, chart_dimension)
                    VALUES (:description, :chart_type, :chart_dimension)
                    ON DUPLICATE KEY UPDATE
                        chart_type = VALUES(chart_type),
                        chart_dimension = VALUES(chart_dimension),
                        updated_at = CURRENT_TIMESTAMP
                """)
            else:
                # SQLite doesn't support ON DUPLICATE KEY UPDATE, use INSERT OR REPLACE
                upsert_query = text("""
                    INSERT OR REPLACE INTO dashboard_chart_config (description, chart_type, chart_dimension)
                    VALUES (:description, :chart_type, :chart_dimension)
                """)
            
            db.execute(upsert_query, {
                "description": config.description,
                "chart_type": config.chart_type,
                "chart_dimension": config.chart_dimension
            })
        
        db.commit()
        return {"success": True, "message": f"Saved {len(request.configs)} chart configuration(s)"}
    except Exception as e:
        print(f"Error saving chart configs: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving chart configurations: {str(e)}")
