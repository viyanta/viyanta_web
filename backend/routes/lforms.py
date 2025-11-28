from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from databases.database import get_db
from databases.models import Company, Report
import json

router = APIRouter()

# 1️⃣ Get distinct companies that have reports


@router.get("/companies")
def get_companies(db: Session = Depends(get_db)):
    query = text("""
        SELECT DISTINCT c.name 
        FROM company c
        JOIN reports r ON c.id = r.company_id
        ORDER BY c.name;
    """)
    result = db.execute(query).fetchall()
    return [row[0] for row in result]


# 2️⃣ Get distinct Form Numbers by company
@router.get("/forms")
def get_forms(company: str, db: Session = Depends(get_db)):
    query = text("""
        SELECT DISTINCT form_no
        FROM reports
        WHERE company = :company
        ORDER BY form_no;
    """)
    result = db.execute(query, {"company": company}).fetchall()
    return [row[0] for row in result]


# 3️⃣ Get distinct Periods by company + form
@router.get("/periods")
def get_periods(company: str, form_no: str, db: Session = Depends(get_db)):
    query = text("""
        SELECT DISTINCT period
        FROM reports
        WHERE company = :company
        AND form_no = :form_no
        ORDER BY period;
    """)
    result = db.execute(
        query, {"company": company, "form_no": form_no}).fetchall()
    return [row[0] for row in result]


# 4️⃣ Get distinct ReportTypes by company + form + period
@router.get("/reporttypes")
def get_report_types(company: str, form_no: str, period: str, db: Session = Depends(get_db)):
    query = text("""
        SELECT DISTINCT ReportType
        FROM reports
        WHERE company = :company
        AND form_no = :form_no
        AND period = :period
        AND ReportType IS NOT NULL
        AND ReportType <> '';
    """)
    result = db.execute(query, {
        "company": company,
        "form_no": form_no,
        "period": period
    }).fetchall()
    return [row[0] for row in result]


# 5️⃣ Final data: dynamic datarows using recursive CTE
@router.get("/data")
def get_report_data(
    company: str,
    form_no: str,
    period: str,
    report_type: str | None = None,
    db: Session = Depends(get_db)
):
    # Step 1: fetch the report row to get id + flat_headers
    base_sql = """
        SELECT id, flat_headers
        FROM reports
        WHERE company = :company
        AND form_no = :form_no
        AND period = :period
    """
    params = {"company": company, "form_no": form_no, "period": period}

    if report_type:
        base_sql += " AND ReportType = :report_type"
        params["report_type"] = report_type

    row = db.execute(text(base_sql), params).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="No matching report found")

    report_id = row[0]
    flat_headers_raw = row[1]

    # Step 2: ensure flat_headers is a Python list
    if isinstance(flat_headers_raw, str):
        try:
            headers = json.loads(flat_headers_raw)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=500, detail="Invalid flat_headers JSON in DB")
    else:
        # If SQLAlchemy JSON type already gave list
        headers = flat_headers_raw

    if not isinstance(headers, list) or not headers:
        raise HTTPException(
            status_code=500, detail="flat_headers must be a non-empty list")

    # Step 3: build dynamic JSON_EXTRACT columns
    select_fields = []
    for h in headers:
        # escape double quotes in header, just in case
        safe_h = str(h).replace('"', '\\"')
        select_fields.append(
            f'JSON_UNQUOTE(JSON_EXTRACT(item, \'$."{safe_h}"\')) AS `{safe_h}`'
        )

    dynamic_cols = ", ".join(select_fields)

    # Step 4: recursive CTE over data_rows JSON array
    sql = text(f"""
        WITH RECURSIVE cte AS (
            SELECT 
                0 AS idx,
                JSON_EXTRACT(data_rows, '$[0]') AS item,
                id AS report_id
            FROM reports
            WHERE id = :report_id

            UNION ALL

            SELECT 
                idx + 1,
                JSON_EXTRACT(r.data_rows, CONCAT('$[', idx + 1, ']')),
                r.id
            FROM cte
            JOIN reports r ON r.id = cte.report_id
            WHERE JSON_EXTRACT(r.data_rows, CONCAT('$[', idx + 1, ']')) IS NOT NULL
        )
        SELECT {dynamic_cols}
        FROM cte;
    """)

    result = db.execute(sql, {"report_id": report_id}).mappings().all()

    # Step 5: return only datarows (no metadata)
    return [dict(row) for row in result]
