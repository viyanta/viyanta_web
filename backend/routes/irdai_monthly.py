from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from databases.database import get_db

router = APIRouter()

# ======================================================
# 1️⃣ PERIOD TYPES
# ======================================================


@router.get("/period/types")
def get_period_types():
    return [
        {"label": "Monthly", "value": "MONTH"},
        {"label": "Quarterly", "value": "Q"},
        {"label": "Halfyearly", "value": "H"},
        {"label": "Annual", "value": "FY"},
    ]


# ======================================================
# 2️⃣ PERIOD OPTIONS
# ======================================================
@router.get("/period/options")
def get_period_options(
    type: str = Query(..., description="MONTH | Q | H | FY"),
    db: Session = Depends(get_db)
):
    if type == "MONTH":
        sql = text("""
            SELECT
              month_year AS label,
              MIN(report_month) AS start_date,
              MAX(report_month) AS end_date
            FROM irdai_monthly_data
            GROUP BY month_year
            ORDER BY MAX(report_month) DESC
        """)

    elif type == "Q":
        sql = text("""
            SELECT
              CONCAT(
                DATE_FORMAT(MIN(report_month), '%b %y'),
                ' - ',
                DATE_FORMAT(MAX(report_month), '%b %y')
              ) AS label,
              MIN(report_month) AS start_date,
              MAX(report_month) AS end_date
            FROM irdai_monthly_data
            GROUP BY YEAR(report_month), QUARTER(report_month)
            ORDER BY MAX(report_month) DESC
        """)

    elif type == "H":
        sql = text("""
            SELECT
              CASE
                WHEN MONTH(report_month) BETWEEN 4 AND 9
                  THEN CONCAT('Apr ', YEAR(report_month), ' - Sep ', YEAR(report_month))
                ELSE
                  CONCAT('Oct ', YEAR(report_month)-1, ' - Mar ', YEAR(report_month))
              END AS label,
              MIN(report_month) AS start_date,
              MAX(report_month) AS end_date
            FROM irdai_monthly_data
            GROUP BY
              CASE
                WHEN MONTH(report_month) BETWEEN 4 AND 9
                  THEN CONCAT('H1-', YEAR(report_month))
                ELSE
                  CONCAT('H2-', YEAR(report_month))
              END
            ORDER BY MAX(report_month) DESC
        """)

    elif type == "FY":
        sql = text("""
            SELECT
              CONCAT(
                'Apr ', YEAR(report_month)-1,
                ' - Mar ', YEAR(report_month)
              ) AS label,
              MIN(report_month) AS start_date,
              MAX(report_month) AS end_date
            FROM irdai_monthly_data
            GROUP BY YEAR(report_month)
            ORDER BY MAX(report_month) DESC
        """)

    else:
        raise HTTPException(status_code=400, detail="Invalid period type")

    return db.execute(sql).mappings().all()


# ======================================================
# 3️⃣ DASHBOARD TOTALS (PUBLIC / PRIVATE / GRAND)
# ======================================================
@router.get("/dashboard/totals")
def get_dashboard_totals(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db)
):
    sql = text("""
        SELECT
          -- FYP
          SUM(CASE WHEN insurer_name = 'LIC of India' THEN fyp_current ELSE 0 END)     AS fyp_public,
          SUM(CASE WHEN insurer_name = 'Private Total' THEN fyp_current ELSE 0 END)   AS fyp_private,
          SUM(CASE WHEN insurer_name = 'Grand Total' THEN fyp_current ELSE 0 END)     AS fyp_grand,

          -- SA
          SUM(CASE WHEN insurer_name = 'LIC of India' THEN sa_current ELSE 0 END)     AS sa_public,
          SUM(CASE WHEN insurer_name = 'Private Total' THEN sa_current ELSE 0 END)   AS sa_private,
          SUM(CASE WHEN insurer_name = 'Grand Total' THEN sa_current ELSE 0 END)     AS sa_grand,

          -- POLICIES
          SUM(CASE WHEN insurer_name = 'LIC of India' THEN pol_current ELSE 0 END)    AS nop_public,
          SUM(CASE WHEN insurer_name = 'Private Total' THEN pol_current ELSE 0 END)  AS nop_private,
          SUM(CASE WHEN insurer_name = 'Grand Total' THEN pol_current ELSE 0 END)    AS nop_grand,

          -- LIVES
          SUM(CASE WHEN insurer_name = 'LIC of India' THEN lives_current ELSE 0 END)  AS nol_public,
          SUM(CASE WHEN insurer_name = 'Private Total' THEN lives_current ELSE 0 END)AS nol_private,
          SUM(CASE WHEN insurer_name = 'Grand Total' THEN lives_current ELSE 0 END)  AS nol_grand

        FROM irdai_monthly_data
        WHERE report_month BETWEEN :start_date AND :end_date
          AND category = insurer_name
    """)

    r = db.execute(sql, {
        "start_date": start_date,
        "end_date": end_date
    }).mappings().first()

    return {
        "FYP": {
            "public": r["fyp_public"] or 0,
            "private": r["fyp_private"] or 0,
            "grand": r["fyp_grand"] or 0,
        },
        "SA": {
            "public": r["sa_public"] or 0,
            "private": r["sa_private"] or 0,
            "grand": r["sa_grand"] or 0,
        },
        "NOP": {
            "public": r["nop_public"] or 0,
            "private": r["nop_private"] or 0,
            "grand": r["nop_grand"] or 0,
        },
        "NOL": {
            "public": r["nol_public"] or 0,
            "private": r["nol_private"] or 0,
            "grand": r["nol_grand"] or 0,
        }
    }


# ======================================================
# 4️⃣ PREMIUM TYPE SUMMARY (PUBLIC vs PRIVATE)
# ======================================================
@router.get("/dashboard/premium-type-summary")
def get_premium_type_summary(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db)
):
    sql = text("""
        SELECT
          CASE
            WHEN insurer_name = 'LIC of India' THEN 'Public'
            ELSE 'Private'
          END AS insurer_type,

          category AS premium_type,

          SUM(fyp_current)   AS fyp,
          SUM(sa_current)    AS sum_assured,
          SUM(lives_current) AS lives,
          SUM(pol_current)   AS policies

        FROM irdai_monthly_data
        WHERE report_month BETWEEN :start_date AND :end_date
          AND insurer_name NOT IN ('Private Total', 'Grand Total')
          AND category IN (
            'Individual Single Premium',
            'Individual Non-Single Premium',
            'Group Single Premium',
            'Group Non-Single Premium',
            'Group Yearly Renewable Premium'
          )

        GROUP BY insurer_type, category
        ORDER BY insurer_type, category
    """)

    return db.execute(sql, {
        "start_date": start_date,
        "end_date": end_date
    }).mappings().all()


# ======================================================
# 5️⃣ METRIC-WISE PREMIUM BREAKUP
# ======================================================

@router.get("/dashboard/metric-wise-premium")
def get_metric_wise_premium_breakup(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db)
):
    sql = text("""
        SELECT 'FYP' AS metric, category AS premium_type, SUM(fyp_current) AS value
        FROM irdai_monthly_data
        WHERE report_month BETWEEN :start_date AND :end_date
          AND insurer_name NOT IN ('Private Total', 'Grand Total')
          AND category IN (
            'Individual Single Premium',
            'Individual Non-Single Premium',
            'Group Single Premium',
            'Group Non-Single Premium',
            'Group Yearly Renewable Premium'
          )
        GROUP BY category

        UNION ALL

        SELECT 'SA', category, SUM(sa_current)
        FROM irdai_monthly_data
        WHERE report_month BETWEEN :start_date AND :end_date
          AND insurer_name NOT IN ('Private Total', 'Grand Total')
          AND category IN (
            'Individual Single Premium',
            'Individual Non-Single Premium',
            'Group Single Premium',
            'Group Non-Single Premium',
            'Group Yearly Renewable Premium'
          )
        GROUP BY category

        UNION ALL

        SELECT 'NOP', category, SUM(pol_current)
        FROM irdai_monthly_data
        WHERE report_month BETWEEN :start_date AND :end_date
          AND insurer_name NOT IN ('Private Total', 'Grand Total')
          AND category IN (
            'Individual Single Premium',
            'Individual Non-Single Premium',
            'Group Single Premium',
            'Group Non-Single Premium',
            'Group Yearly Renewable Premium'
          )
        GROUP BY category

        UNION ALL

        SELECT 'NOL', category, SUM(lives_current)
        FROM irdai_monthly_data
        WHERE report_month BETWEEN :start_date AND :end_date
          AND insurer_name NOT IN ('Private Total', 'Grand Total')
          AND category IN (
            'Individual Single Premium',
            'Individual Non-Single Premium',
            'Group Single Premium',
            'Group Non-Single Premium',
            'Group Yearly Renewable Premium'
          )
        GROUP BY category

        ORDER BY metric, premium_type
    """)

    return db.execute(sql, {
        "start_date": start_date,
        "end_date": end_date
    }).mappings().all()


# ======================================================
# COMPANYWISE Page
# 6️⃣ INSURER LIST
@router.get("/company/insurers")
def get_company_list(db: Session = Depends(get_db)):
    sql = text("""
        SELECT DISTINCT insurer_name
        FROM irdai_monthly_data
        WHERE insurer_name NOT IN ('Private Total', 'Grand Total')
        ORDER BY insurer_name
    """)
    rows = db.execute(sql).fetchall()
    return [{"label": r[0], "value": r[0]} for r in rows]


# 7️⃣ COMPANY TOTALS
@router.get("/company/totals")
def get_company_totals(
    insurer_name: str,
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db)
):
    sql = text("""
        SELECT
          SUM(fyp_current)   AS fyp,
          SUM(sa_current)    AS sa,
          SUM(pol_current)   AS nop,
          SUM(lives_current) AS nol
        FROM irdai_monthly_data
        WHERE report_month BETWEEN :start_date AND :end_date
          AND insurer_name = :insurer_name
          AND category = insurer_name
    """)

    r = db.execute(sql, {
        "insurer_name": insurer_name,
        "start_date": start_date,
        "end_date": end_date
    }).mappings().first()

    return {
        "FYP": r["fyp"] or 0,
        "SA": r["sa"] or 0,
        "NOP": r["nop"] or 0,
        "NOL": r["nol"] or 0
    }


# 8️⃣ COMPANY PREMIUM TYPE BREAKUP
@router.get("/company/premium-type")
def get_company_premium_type_breakup(
    insurer_name: str,
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db)
):
    sql = text("""
        SELECT
          category AS premium_type,
          SUM(fyp_current)   AS fyp,
          SUM(sa_current)    AS sa,
          SUM(pol_current)   AS nop,
          SUM(lives_current) AS nol
        FROM irdai_monthly_data
        WHERE report_month BETWEEN :start_date AND :end_date
          AND insurer_name = :insurer_name
          AND category <> insurer_name
        GROUP BY category
        ORDER BY category
    """)

    return db.execute(sql, {
        "insurer_name": insurer_name,
        "start_date": start_date,
        "end_date": end_date
    }).mappings().all()
