from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from databases.database import get_db
from pydantic import BaseModel
from typing import List, Optional
import os
import json

router = APIRouter()


# Pydantic models for dashboard
class DashboardDataRequest(BaseModel):
    descriptions: List[str]


# 1️⃣ Get All Companies
@router.get("/companies")
def get_companies(db=Depends(get_db)):
    query = text("""
        SELECT DISTINCT CompanyInsurerShortName
        FROM company_metrics
        ORDER BY CompanyInsurerShortName;
    """)
    result = db.execute(query).fetchall()
    return {"companies": [row[0] for row in result]}


# 2️⃣ Get Premium Types for Selected Company
@router.get("/premium-types")
def get_premium_types(company: str, db=Depends(get_db)):
    query = text("""
        SELECT DISTINCT PremiumTypeLongName
        FROM company_metrics
        WHERE CompanyInsurerShortName = :company
        ORDER BY PremiumTypeLongName;
    """)
    result = db.execute(query, {"company": company}).fetchall()
    return {
        "company": company,
        "premium_types": [row[0] for row in result]
    }


# 3️⃣ Get Categories for Company + Premium Type
@router.get("/categories")
def get_categories(company: str, premium_type: str, db=Depends(get_db)):
    query = text("""
        SELECT DISTINCT CategoryLongName
        FROM company_metrics
        WHERE CompanyInsurerShortName = :company
        AND PremiumTypeLongName = :premium_type
        ORDER BY CategoryLongName;
    """)
    result = db.execute(
        query,
        {"company": company, "premium_type": premium_type}
    ).fetchall()

    return {
        "company": company,
        "premium_type": premium_type,
        "categories": [row[0] for row in result]
    }


# 4️⃣ Get Descriptions for Company + Premium Type + Category
@router.get("/descriptions")
def get_descriptions(company: str, premium_type: str, category: str, db=Depends(get_db)):
    query = text("""
        SELECT DISTINCT Description
        FROM company_metrics
        WHERE CompanyInsurerShortName = :company
        AND PremiumTypeLongName = :premium_type
        AND CategoryLongName = :category
        ORDER BY Description;
    """)
    result = db.execute(
        query,
        {"company": company, "premium_type": premium_type, "category": category}
    ).fetchall()

    return {
        "company": company,
        "premium_type": premium_type,
        "category": category,
        "descriptions": [row[0] for row in result]
    }


# 5️⃣ Get Full Details (Final API)
@router.get("/details")
def get_details(company: str, premium_type: str, category: str, description: str, db=Depends(get_db)):
    query = text("""
        SELECT *
        FROM company_metrics
        WHERE CompanyInsurerShortName = :company
        AND PremiumTypeLongName = :premium_type
        AND CategoryLongName = :category
        AND Description = :description
        ORDER BY ReportedUnit, ReportedValue;
    """)

    result = db.execute(
        query,
        {
            "company": company,
            "premium_type": premium_type,
            "category": category,
            "description": description
        }
    )

    rows = result.fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail="No data found")

    columns = result.keys()
    return {
        "company": company,
        "premium_type": premium_type,
        "category": category,
        "description": description,
        "count": len(rows),
        "data": [dict(zip(columns, row)) for row in rows]
    }


# 6️⃣ Get Record by ID

@router.get("/get/{id}")
def get_record(id: int, db=Depends(get_db)):
    query = text("SELECT * FROM company_metrics WHERE id = :id")
    result = db.execute(query, {"id": id}).fetchone()

    if not result:
        raise HTTPException(status_code=404, detail="Record not found")

    columns = result.keys()
    return dict(zip(columns, result))


# 7️⃣ Create New Record
@router.post("/create")
def create_record(data: dict, db=Depends(get_db)):

    query = text("""
        INSERT INTO company_metrics (
            CompanyInsurerShortName,
            ProcessedPeriodType,
            ProcessedFYYear,
            DataType,
            CountryName,
            PremiumTypeLongName,
            CategoryLongName,
            Description,
            ReportedUnit,
            ReportedValue,
            IsActive
        )
        VALUES (
            :company,
            :processed_period_type,
            :processed_fy_year,
            :data_type,
            :country_name,
            :premium_type,
            :category,
            :description,
            :unit,
            :value,
            :is_active
        )
    """)

    db.execute(query, {
        "company": data.get("CompanyInsurerShortName"),
        "processed_period_type": data.get("ProcessedPeriodType"),
        "processed_fy_year": data.get("ProcessedFYYear"),
        "data_type": data.get("DataType"),
        "country_name": data.get("CountryName"),
        "premium_type": data.get("PremiumTypeLongName"),
        "category": data.get("CategoryLongName"),
        "description": data.get("Description"),
        "unit": data.get("ReportedUnit"),
        "value": data.get("ReportedValue"),
        "is_active": data.get("IsActive", 1)
    })

    db.commit()

    return {"message": "Record created successfully"}


# 8️⃣ Update Existing Record
@router.put("/update/{id}")
def update_record(id: int, data: dict, db=Depends(get_db)):

    query = text("""
        UPDATE company_metrics SET
            CompanyInsurerShortName = :company,
            ProcessedPeriodType = :processed_period_type,
            ProcessedFYYear = :processed_fy_year,
            DataType = :data_type,
            CountryName = :country_name,
            PremiumTypeLongName = :premium_type,
            CategoryLongName = :category,
            Description = :description,
            ReportedUnit = :unit,
            ReportedValue = :value,
            IsActive = :is_active
        WHERE id = :id
    """)

    result = db.execute(query, {
        "id": id,
        "company": data.get("CompanyInsurerShortName"),
        "processed_period_type": data.get("ProcessedPeriodType"),
        "processed_fy_year": data.get("ProcessedFYYear"),
        "data_type": data.get("DataType"),
        "country_name": data.get("CountryName"),
        "premium_type": data.get("PremiumTypeLongName"),
        "category": data.get("CategoryLongName"),
        "description": data.get("Description"),
        "unit": data.get("ReportedUnit"),
        "value": data.get("ReportedValue"),
        "is_active": data.get("IsActive", 1)
    })

    db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Record not found")

    return {"message": "Record updated successfully"}

# 9️⃣ Patch Existing Record


@router.patch("/patch/{id}")
def patch_record(id: int, data: dict, db=Depends(get_db)):

    set_clauses = []
    params = {"id": id}

    for key, value in data.items():
        set_clauses.append(f"{key} = :{key}")
        params[key] = value

    if not set_clauses:
        raise HTTPException(status_code=400, detail="No fields to update")

    query = text(f"""
        UPDATE company_metrics
        SET {', '.join(set_clauses)}
        WHERE id = :id
    """)

    result = db.execute(query, params)
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Record not found")

    return {"message": "Record patched successfully"}


# 1️⃣0️⃣ Delete Record
@router.delete("/delete/{id}")
def delete_record(id: int, db=Depends(get_db)):
    """Delete a record from company_metrics by ID"""
    try:
        # First check if record exists
        check_query = text("SELECT id FROM company_metrics WHERE id = :id")
        check_result = db.execute(check_query, {"id": id})
        existing_record = check_result.fetchone()
        
        if not existing_record:
            raise HTTPException(status_code=404, detail=f"Record with ID {id} not found")
        
        # Delete the record
        query = text("DELETE FROM company_metrics WHERE id = :id")
        result = db.execute(query, {"id": id})
        db.commit()

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"Record with ID {id} not found or already deleted")

        return {"message": "Record deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deleting record {id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting record: {str(e)}")


# 1️⃣1️⃣ Get unique values for form fields
@router.get("/unique-values")
def get_unique_values(company: str, field: str, db=Depends(get_db)):
    """Get unique values for a specific field from company_metrics table"""
    
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
    
    # Query to get unique values for the company (get all values, not just active ones)
    # This allows users to see all possible values that exist in the database
    query = text(f"""
        SELECT DISTINCT {column}
        FROM company_metrics
        WHERE CompanyInsurerShortName = :company
        AND {column} <> ''
        AND {column} IS NOT NULL
    """)
    
    try:
        result = db.execute(query, {"company": company}).fetchall()
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
                            return float(val_str)
                        except:
                            return float('-inf')
                    values.sort(key=extract_numeric, reverse=True)
            except Exception as sort_err:
                print(f"Error sorting {field}: {sort_err}")
                values.sort(reverse=True)
        else:
            # For text fields, sort ascending (A-Z)
            values.sort()
        
        return values
    except Exception as e:
        print(f"Error in query for {field}: {e}")
        import traceback
        traceback.print_exc()
        return []


# 1️⃣2️⃣ Get Dashboard Data for Selected Descriptions (Metrics)
@router.post("/dashboard-data")
def get_dashboard_data(request: DashboardDataRequest, db=Depends(get_db)):
    """Get all data for selected descriptions from company_metrics, filtered by selected row IDs"""
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
        FROM company_metrics
        WHERE Description IN ({placeholders})
        AND (IsActive = 1 OR IsActive IS NULL)
        ORDER BY CompanyInsurerShortName, PremiumTypeLongName, CategoryLongName, ProcessedFYYear;
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
    
    print(f"📊 Metrics Dashboard filtering: {len(all_data)} total rows, {len(filtered_data)} after row ID filtering")
    print(f"📋 Selected row IDs map: {selected_row_ids_map}")
    print(f"📝 Descriptions requested: {descriptions}")
    print(f"✅ Returning {len(filtered_data)} rows (only rows with selected IDs)")
    
    return filtered_data
