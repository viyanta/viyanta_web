from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from databases.database import get_db
from sqlalchemy.orm import Session

router = APIRouter()


# 1️⃣ Get Available Report Months (Dropdown 1)
@router.get("/period/types")
def get_period_types():
    return [
        {"label": "Monthly", "value": "MONTH"},
        {"label": "Quarterly", "value": "Q"},
        {"label": "Halfyearly", "value": "H"},
        {"label": "Annual", "value": "FY"},
    ]

# 2️⃣ Get Period Options Based on Type (Dropdown 2)


@router.get("/period/options")
def get_period_options(
    type: str = Query(..., description="MONTH | Q | H | FY"),
    db: Session = Depends(get_db)
):
    if type == "MONTH":
        sql = text("""
            SELECT
              m.id AS value,
              DATE_FORMAT(m.ProcessedPeriodEndDate, '%b-%y') AS label,
              m.ProcessedPeriodEndDate AS sort_date
            FROM monthly_period_master m
            WHERE m.is_active = 1
            ORDER BY m.ProcessedPeriodEndDate DESC
        """)
    elif type == "Q":
        sql = text("""
            SELECT
              p.id AS value,
              p.ProcessedFinancialYearPeriodWithMonth AS label,
              p.start_date AS sort_date
            FROM period_master p
            WHERE p.PeriodType IN ('Q1','Q2','Q3','Q4')
              AND p.is_active = 1
            ORDER BY p.start_date DESC
        """)
    elif type == "H":
        sql = text("""
            SELECT
              p.id AS value,
              p.ProcessedFinancialYearPeriodWithMonth AS label,
              p.start_date AS sort_date
            FROM period_master p
            WHERE p.PeriodType IN ('H1','H2')
              AND p.is_active = 1
            ORDER BY p.start_date DESC
        """)
    elif type == "FY":
        sql = text("""
            SELECT
              p.id AS value,
              p.ProcessedFinancialYearPeriodWithMonth AS label,
              p.start_date AS sort_date
            FROM period_master p
            WHERE p.PeriodType = 'FY'
              AND p.is_active = 1
            ORDER BY p.start_date DESC
        """)
    else:
        raise HTTPException(status_code=400, detail="Invalid period type")

    result = db.execute(sql).mappings().all()
    return result


# 3️⃣ Get Dashboard Summary Data
@router.get("/dashboard/totals")
def get_public_private_grand_total(
    period_type: str,   # MONTH | Q | H | FY
    period_id: int,
    db: Session = Depends(get_db)
):
    sql = text("""
        SELECT
          SUM(CASE 
                WHEN i.insurer_name = 'LIC of India' THEN i.fyp_current 
                ELSE 0 
              END) AS public_total,

          SUM(CASE 
                WHEN i.insurer_name <> 'LIC of India' THEN i.fyp_current 
                ELSE 0 
              END) AS private_total,

          SUM(i.fyp_current) AS grand_total

        FROM irdai_monthly_data i
        JOIN monthly_period_master m ON m.id = i.monthly_period_id
        JOIN period_master q ON q.id = i.quarter_period_id
        LEFT JOIN period_master p ON p.id = :period_id

        WHERE
          i.insurer_name = i.category
          AND (
               (:ptype = 'MONTH' AND m.id = :period_id)
               OR
               (:ptype = 'Q' AND q.id = :period_id)
               OR
               (:ptype IN ('H','FY') AND q.start_date BETWEEN p.start_date AND p.end_date)
          )
    """)

    result = db.execute(sql, {
        "ptype": period_type,
        "period_id": period_id
    }).mappings().first()

    return {
        "public_total": result["public_total"] or 0,
        "private_total": result["private_total"] or 0,
        "grand_total": result["grand_total"] or 0
    }
