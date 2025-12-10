from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from databases.database import get_db

router = APIRouter()


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
            PremiumTypeLongName,
            CategoryLongName,
            Description,
            ReportedUnit,
            ReportedValue
        )
        VALUES (
            :company,
            :premium_type,
            :category,
            :description,
            :unit,
            :value
        )
    """)

    db.execute(query, {
        "company": data.get("CompanyInsurerShortName"),
        "premium_type": data.get("PremiumTypeLongName"),
        "category": data.get("CategoryLongName"),
        "description": data.get("Description"),
        "unit": data.get("ReportedUnit"),
        "value": data.get("ReportedValue")
    })

    db.commit()

    return {"message": "Record created successfully"}


# 8️⃣ Update Existing Record
@router.put("/update/{id}")
def update_record(id: int, data: dict, db=Depends(get_db)):

    query = text("""
        UPDATE company_metrics SET
            CompanyInsurerShortName = :company,
            PremiumTypeLongName = :premium_type,
            CategoryLongName = :category,
            Description = :description,
            ReportedUnit = :unit,
            ReportedValue = :value
        WHERE id = :id
    """)

    result = db.execute(query, {
        "id": id,
        "company": data.get("CompanyInsurerShortName"),
        "premium_type": data.get("PremiumTypeLongName"),
        "category": data.get("CategoryLongName"),
        "description": data.get("Description"),
        "unit": data.get("ReportedUnit"),
        "value": data.get("ReportedValue")
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
    query = text("DELETE FROM company_metrics WHERE id = :id")
    result = db.execute(query, {"id": id})
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Record not found")

    return {"message": "Record deleted successfully"}
