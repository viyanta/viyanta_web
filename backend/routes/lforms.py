from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from databases.database import get_db
from databases.models import Company, ReportModels
import json

router = APIRouter()

# Utility: Convert company name into table key format


def get_table_name(company: str):
    key = company.lower().replace(" ", "_")
    model = ReportModels.get(key)
    if not model:
        raise HTTPException(
            status_code=404, detail=f"No table found for {company}")
    return model.__tablename__


# 1️⃣ Get all companies
@router.get("/companies")
def get_companies(db: Session = Depends(get_db)):
    result = db.query(Company).order_by(Company.name).all()
    return [c.name for c in result]


# 🔹 2️⃣ Get distinct periods for company
@router.get("/periods")
def get_periods(company: str, db: Session = Depends(get_db)):
    table = get_table_name(company)
    sql = text(f"""
        SELECT DISTINCT period
        FROM {table}
        ORDER BY period;
    """)
    return [row[0] for row in db.execute(sql).fetchall()]


# 🔹 3️⃣ Get distinct L-Forms by company + period
@router.get("/lforms")
def get_lforms(company: str, period: str, db: Session = Depends(get_db)):
    table = get_table_name(company)
    sql = text(f"""
        SELECT DISTINCT form_no
        FROM {table}
        WHERE period = :period
        ORDER BY form_no;
    """)
    return [row[0] for row in db.execute(sql, {"period": period}).fetchall()]


# 🔹 4️⃣ Get Report Types dynamically
@router.get("/reporttypes")
def get_report_types(company: str, form_no: str, period: str,
                     db: Session = Depends(get_db)):
    table = get_table_name(company)
    sql = text(f"""
        SELECT DISTINCT ReportType
        FROM {table}
        WHERE form_no = :form_no
        AND period = :period
        AND ReportType IS NOT NULL
        AND ReportType <> ''
    """)
    return [row[0] for row in db.execute(sql,
                                         {"form_no": form_no, "period": period}).fetchall()]


# 5️⃣ Extract Final JSON table rows dynamically
@router.get("/data")
def get_report_data(company: str, form_no: str, period: str,
                    report_type: str | None = None,
                    db: Session = Depends(get_db)):

    table = get_table_name(company)

    # Step 1: Fetch metadata row
    q = f"""
        SELECT id, flat_headers
        FROM {table}
        WHERE form_no = :form_no
        AND period = :period
    """
    params = {"form_no": form_no, "period": period}

    if report_type:
        q += " AND ReportType = :report_type"
        params["report_type"] = report_type

    row = db.execute(text(q), params).fetchone()
    if not row:
        raise HTTPException(404, "No matching report found")

    report_id, headers_raw = row

    # Step 2: Parse JSON headers
    try:
        headers = json.loads(headers_raw) if isinstance(
            headers_raw, str) else headers_raw
    except:
        raise HTTPException(500, "Bad flat_headers JSON")

    if not headers:
        raise HTTPException(500, "Headers empty")

    # Step 3: Create JSON_EXTRACT projection
    json_cols = ", ".join(
        f'JSON_UNQUOTE(JSON_EXTRACT(item, \'$."{h}"\')) AS `{h}`' for h in headers
    )

    # Step 4: Recursively extract JSON rows
    sql = text(f"""
        WITH RECURSIVE cte AS (
            SELECT 
                0 AS idx,
                JSON_EXTRACT(data_rows, '$[0]') AS item
            FROM {table}
            WHERE id = :id

            UNION ALL

            SELECT
                idx + 1,
                JSON_EXTRACT(t.data_rows, CONCAT('$[', idx + 1, ']'))
            FROM cte
            JOIN {table} t ON t.id = :id
            WHERE JSON_EXTRACT(t.data_rows, CONCAT('$[', idx + 1, ']')) IS NOT NULL
        )
        SELECT {json_cols}
        FROM cte;
    """)

    result = db.execute(sql, {"id": report_id}).mappings().all()
    return [dict(r) for r in result]
