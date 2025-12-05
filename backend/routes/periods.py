from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from databases.database import get_db
from databases.models import PeriodMaster, MonthlyPeriodMaster

router = APIRouter()


def safe_output(result):
    return [row[0] if row[0] is not None else "" for row in result]


@router.get("/years")
def get_years(db: Session = Depends(get_db)):
    result = db.execute(text("""
        SELECT DISTINCT ProcessedFYYear 
        FROM period_master
        WHERE is_active = 1
        ORDER BY ProcessedFYYear;
    """)).fetchall()
    return safe_output(result)


@router.get("/types")
def get_period_types(
    year: str, db: Session = Depends(get_db)
):
    result = db.execute(text("""
        SELECT DISTINCT PeriodType
        FROM period_master
        WHERE ProcessedFYYear = :year
        AND is_active = 1
        ORDER BY FIELD(PeriodType,'Q1','Q2','Q3','Q4','HY','9M','FY','H1','H2','Full Year');
    """), {"year": year}).fetchall()
    return safe_output(result)


@router.get("/ranges")
def get_period_ranges(
    year: str, period_type: str,
    db: Session = Depends(get_db)
):
    result = db.execute(text("""
        SELECT ProcessedFinancialYearPeriodWithMonth
        FROM period_master
        WHERE ProcessedFYYear = :year
        AND PeriodType = :ptype
        AND is_active = 1
        ORDER BY start_date;
    """), {"year": year, "ptype": period_type}).fetchall()
    return safe_output(result)

# ============================================================
# 4️⃣ Convert Dates to dd-mm-yyyy
# ============================================================


@router.get("/months")
def get_monthly_periods(
    range_value: str,
    db: Session = Depends(get_db)
):

    # Fetch correct start & end date from period_master
    period = db.execute(text("""
        SELECT start_date, end_date
        FROM period_master
        WHERE TRIM(LOWER(ProcessedFinancialYearPeriodWithMonth)) =
              TRIM(LOWER(:rng))
        LIMIT 1;
    """), {"rng": range_value}).fetchone()

    if not period:
        return []  # No match found

    start_date, end_date = period

    # Fetch distinct monthly rows using date range
    result = db.execute(text("""
        SELECT DISTINCT
            DATE_FORMAT(ProcessedPeriodShortDate, '%d-%m-%Y') AS start_d,
            DATE_FORMAT(ProcessedPeriodEndDate, '%d-%m-%Y') AS end_d
        FROM monthly_period_master
        WHERE ProcessedPeriodShortDate >= :start
          AND ProcessedPeriodEndDate <= :end
          AND is_active = 1
        ORDER BY ProcessedPeriodShortDate ASC;
    """), {"start": start_date, "end": end_date}).fetchall()

    # Output conversion
    return [
        {"start_date": r.start_d, "end_date": r.end_d}
        for r in result
    ]
