"""
Enhanced IRDAI Excel Importer - Handles multiple formats
"""
from datetime import datetime
import pandas as pd
import mysql.connector
import math
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
        or text.startswith("source:")
    )


def detect_excel_format(df):
    """
    Detect the format of the Excel file
    Returns: 'detailed' (with sub-categories) or 'simple' (one row per insurer)
    """
    # Check if we have many columns (detailed format) or few columns (simple format)
    if df.shape[1] >= 20:
        return 'detailed'
    else:
        return 'simple'


# ======================================================
# SIMPLE FORMAT IMPORTER (New)
# ======================================================

def import_simple_format(df, report_month, month_year, cursor):
    """
    Import simple format Excel (one row per insurer, 3-5 data columns)
    
    Expected structure:
    Row 0: Title
    Row 1: Headers (Sl No., Insurer, ...)
    Row 2: Optional sub-headers (dates, etc.)
    Row 3+: Data rows (each insurer is one row)
    """
    
    insert_sql = """
    INSERT INTO irdai_monthly_data_simple (
      report_month, month_year, sl_no, insurer_name,
      col1_name, col1_value,
      col2_name, col2_value,
      col3_name, col3_value,
      col4_name, col4_value,
      col5_name, col5_value
    ) VALUES (
      %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
    )
    """
    
    # Detect header row (usually row 1 or 2)
    header_row = 1
    if df.iloc[1, 0] is None or str(df.iloc[1, 0]).strip() == "":
        header_row = 2
    
    # Get column headers
    headers = []
    for col in range(2, min(7, df.shape[1])):  # Max 5 data columns
        header = df.iloc[header_row, col]
        if header is not None and str(header).strip():
            headers.append(str(header).strip())
        else:
            headers.append(f"Column_{col}")
    
    # Get sub-headers if they exist (row after header)
    sub_headers = []
    if header_row + 1 < len(df):
        for col in range(2, min(7, df.shape[1])):
            sub_header = df.iloc[header_row + 1, col]
            if sub_header is not None and str(sub_header).strip():
                sub_headers.append(str(sub_header).strip())
            else:
                sub_headers.append("")
    
    # Combine headers and sub-headers
    final_headers = []
    for i, h in enumerate(headers):
        if i < len(sub_headers) and sub_headers[i]:
            final_headers.append(f"{h} - {sub_headers[i]}")
        else:
            final_headers.append(h)
    
    logger.info(f"Detected {len(final_headers)} data columns: {final_headers}")
    
    # Start reading data
    data_start_row = header_row + 2 if sub_headers else header_row + 1
    total_inserted = 0
    
    for row in range(data_start_row, len(df)):
        sl = df.iloc[row, 0]
        insurer = df.iloc[row, 1]
        
        # Stop if footer reached
        if is_footer_row(insurer):
            logger.info(f"Footer detected at row {row}: {insurer}")
            break
        
        # Skip empty rows
        if pd.isna(insurer) or str(insurer).strip() == "":
            continue
        
        insurer_name = str(insurer).strip()
        
        # Extract data columns (up to 5)
        data_values = []
        for col in range(2, min(7, df.shape[1])):
            val = clean(df.iloc[row, col])
            data_values.append(val)
        
        # Pad with None if fewer than 5 columns
        while len(data_values) < 5:
            data_values.append(None)
        
        # Prepare data for insertion
        row_data = [
            report_month,
            month_year,
            clean(sl),
            insurer_name
        ]
        
        # Add column name/value pairs
        for i in range(5):
            col_name = final_headers[i] if i < len(final_headers) else None
            col_value = data_values[i]
            row_data.extend([col_name, col_value])
        
        try:
            cursor.execute(insert_sql, tuple(row_data))
            total_inserted += 1
            logger.info(f"Inserted row {row}: {insurer_name}")
        except Exception as e:
            logger.error(f"Error inserting row {row} ({insurer_name}): {e}")
    
    return total_inserted


# ======================================================
# DETAILED FORMAT IMPORTER (Original)
# ======================================================

def import_detailed_format(df, report_month, month_year, cursor):
    """
    Import detailed format Excel (with sub-categories per insurer)
    Original logic from irdai_excel_importer.py
    """
    
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
    
    return total_inserted


# ======================================================
# MAIN IMPORT FUNCTION (Enhanced)
# ======================================================

def import_irdai_excel(
    excel_path: str,
    sheet_name: str,
    report_month: str,
    db_config: dict
):
    """
    Imports IRDAI Monthly Excel into appropriate table
    Automatically detects format and uses correct importer
    """

    # Month label (ex: Aug 24)
    month_year = datetime.strptime(report_month, "%Y-%m-%d").strftime("%b %y")

    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()

    # Read Excel
    df = pd.read_excel(excel_path, sheet_name=sheet_name, header=None)
    df = df.where(pd.notnull(df), None)
    
    # Detect format
    excel_format = detect_excel_format(df)
    logger.info(f"Detected Excel format: {excel_format}")
    logger.info(f"Excel shape: {df.shape[0]} rows x {df.shape[1]} columns")

    total_inserted = 0

    try:
        if excel_format == 'simple':
            total_inserted = import_simple_format(df, report_month, month_year, cursor)
        else:
            total_inserted = import_detailed_format(df, report_month, month_year, cursor)
        
        conn.commit()
        logger.info(f"Successfully inserted {total_inserted} rows")

    except Exception as e:
        conn.rollback()
        logger.error(f"Error during import: {e}")
        raise e

    finally:
        cursor.close()
        conn.close()

    return {
        "status": "success",
        "rows_inserted": total_inserted,
        "report_month": report_month,
        "format": excel_format
    }
