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
