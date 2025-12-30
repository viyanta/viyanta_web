from datetime import datetime
import pandas as pd
import mysql.connector
import math
import os

# ======================================================
# HELPERS
# ======================================================


def clean(v):
    """
    Normalize numeric values:
    - Empty / NA / '-' → None
    - Comma numbers → float
    """
    if v is None:
        return None

    if isinstance(v, str):
        v = v.strip()
        if v in ("", "-", "NA", "nan", "NaN"):
            return None
        try:
            return float(v.replace(",", ""))
        except Exception:
            return None

    try:
        if isinstance(v, float) and math.isnan(v):
            return None
    except Exception:
        pass

    try:
        return float(v)
    except Exception:
        return None


def is_footer_row(text):
    """
    Detect footer / notes rows to stop parsing
    """
    if not isinstance(text, str):
        return False

    text = text.lower().strip()
    return (
        text.startswith("note")
        or text.startswith("compiled")
        or text.startswith("the first year premium")
        or text.startswith("*consequent")
        or text.startswith("consequent")
    )


# ======================================================
# MAIN IMPORT FUNCTION (UNCHANGED LOGIC)
# ======================================================

def import_irdai_excel(
    excel_path: str,
    sheet_name: str,
    report_month: str,
    db_config: dict
):
    """
    Imports IRDAI Monthly Excel into irdai_monthly_data table
    """

    # Month label (ex: Aug 24)
    month_year = datetime.strptime(report_month, "%Y-%m-%d").strftime("%b %y")

    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()

    # Read Excel
    df = pd.read_excel(excel_path, sheet_name=sheet_name, header=None)
    df = df.where(pd.notnull(df), None)

    insert_sql = """
    INSERT INTO irdai_monthly_data (
      report_month, month_year, insurer_name, category,

      fyp_prev, fyp_current, fyp_growth,
      fyp_ytd_prev, fyp_ytd_current, fyp_growth_ytd, fyp_market_share,

      pol_prev, pol_current, pol_growth,
      pol_ytd_prev, pol_ytd_current, pol_growth_ytd, pol_market_share,

      lives_prev, lives_current, lives_growth,
      lives_ytd_prev, lives_ytd_current, lives_growth_ytd, lives_market_share,

      sa_prev, sa_current, sa_growth,
      sa_ytd_prev, sa_ytd_current, sa_growth_ytd, sa_market_share
    ) VALUES (
      %s,%s,%s,%s,
      %s,%s,%s,%s,%s,%s,%s,
      %s,%s,%s,%s,%s,%s,%s,
      %s,%s,%s,%s,%s,%s,%s,
      %s,%s,%s,%s,%s,%s,%s
    )
    """

    # Metric start columns (as per IRDAI format)
    metric_columns = [
        ("fyp", 2),
        ("pol", 9),
        ("lives", 16),
        ("sa", 23),
    ]

    row = 3  # Data starts here
    total_inserted = 0

    try:
        while row < len(df):
            sl = df.iloc[row, 0]
            insurer = df.iloc[row, 1]

            # Stop if footer reached
            if is_footer_row(insurer):
                break

            is_block = (
                isinstance(insurer, str)
                and insurer.strip()
                and (
                    (isinstance(sl, (int, float)) and not math.isnan(sl))
                    or insurer.strip() in ("Private Total", "Grand Total")
                )
            )

            if is_block:
                insurer_name = insurer.strip()

                # First row = TOTAL
                categories = [(insurer_name, row)]

                # Next 5 premium categories
                for k in range(1, 6):
                    if row + k < len(df):
                        cat = df.iloc[row + k, 1]
                        if isinstance(cat, str) and cat.strip():
                            categories.append((cat.strip(), row + k))

                categories = categories[:6]

                for category, r in categories:
                    data_block = []

                    for _, start_col in metric_columns:
                        for i in range(7):
                            col = start_col + i
                            val = clean(df.iloc[r, col]
                                        if col < df.shape[1] else None)
                            data_block.append(val)

                    cursor.execute(
                        insert_sql,
                        (
                            report_month,
                            month_year,
                            insurer_name,
                            category,
                            *data_block,
                        ),
                    )

                    total_inserted += 1

                row += 6
            else:
                row += 1

        conn.commit()

    except Exception as e:
        conn.rollback()
        raise e

    finally:
        cursor.close()
        conn.close()

    return {
        "status": "success",
        "rows_inserted": total_inserted,
        "report_month": report_month,
    }
