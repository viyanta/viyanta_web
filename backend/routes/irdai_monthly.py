from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from databases.database import get_db
from typing import Optional

router = APIRouter()

# 1️⃣ Get Available Report Months (Dropdown 1)


@router.get("/months")
def get_months(db=Depends(get_db)):
    query = text("""
        SELECT DISTINCT report_month
        FROM irdai_monthly_data
        ORDER BY report_month DESC;
    """)
    result = db.execute(query).fetchall()
    return [str(row[0]) for row in result]


# 2️⃣ Get Insurers by Selected Month (Dropdown 2)
@router.get("/insurers")
def get_insurers(report_month: str, db=Depends(get_db)):
    query = text("""
        SELECT DISTINCT insurer_name
        FROM irdai_monthly_data
        WHERE report_month = :report_month
        ORDER BY insurer_name;
    """)

    result = db.execute(query, {"report_month": report_month}).fetchall()
    return {"report_month": report_month,
            "insurers": [row[0] for row in result]}


# 3️⃣ Get Full Data Rows for Selected Insurer & Month
@router.get("/details")
def get_insurer_details(report_month: str, insurer_name: str, db=Depends(get_db)):
    query = text("""
        SELECT *
        FROM irdai_monthly_data
        WHERE report_month = :report_month
        AND insurer_name = :insurer_name
        ORDER BY CASE 
            WHEN category = insurer_name THEN 0  -- total row first
            ELSE 1 
        END, category;
    """)

    result = db.execute(query, {
        "report_month": report_month,
        "insurer_name": insurer_name
    })

    rows = result.fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail="No data found")

    columns = result.keys()
    return {
        "report_month": report_month,
        "insurer_name": insurer_name,
        "count": len(rows),
        "data": [dict(zip(columns, row)) for row in rows]
    }
