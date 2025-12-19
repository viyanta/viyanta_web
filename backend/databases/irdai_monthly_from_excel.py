import pandas as pd
import mysql.connector
import math

# ---- CONFIG ----
excel_path = "FYP Sep 2025.xlsx"
sheet_name = "as at 30th Sep 2025"  # The sheet with full data
report_month = "2023-09-30"  # September 2023 data

db_config = {
    "host": "localhost",
    "user": "root",
    "password": "StrongPassw0rd@123!",
    "database": "viyanta_web"
}

# ---- CONNECT TO DB ----
conn = mysql.connector.connect(**db_config)
cursor = conn.cursor()

# ---- READ EXCEL ----
df = pd.read_excel(excel_path, sheet_name=sheet_name, header=None)
df = df.where(pd.notnull(df), None)  # Replace pandas NaN with None

# Column mapping for "as at 30th Sep 2024" sheet:
# This sheet has 47 columns with structure:
# Col 0: Sl No
# Col 1: Insurer Name / Category
# Cols 2-8: FYP (prev_month, current_month, growth%, ytd_prev, ytd_current, ytd_growth%, market_share)
# Cols 9-15: Policies (same 7 sub-fields)
# Cols 16-22: Lives (same 7 sub-fields)
# Cols 23-29: Sum Assured (same 7 sub-fields)

# Each insurer has 6 rows: 1 total + 5 categories
# Categories: Individual Single Premium, Individual Non-Single Premium,
#             Group Single Premium, Group Non-Single Premium, Group Yearly Renewable Premium

sql = """
INSERT INTO irdai_monthly_data (
  report_month, insurer_name, category,
  fyp_prev, fyp_current, fyp_growth, fyp_ytd_prev, fyp_ytd_current, fyp_growth_ytd, fyp_market_share,
  pol_prev, pol_current, pol_growth, pol_ytd_prev, pol_ytd_current, pol_growth_ytd, pol_market_share,
  lives_prev, lives_current, lives_growth, lives_ytd_prev, lives_ytd_current, lives_growth_ytd, lives_market_share,
  sa_prev, sa_current, sa_growth, sa_ytd_prev, sa_ytd_current, sa_growth_ytd, sa_market_share
) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
          %s,%s,%s,%s,%s,%s,%s,
          %s,%s,%s,%s,%s,%s,%s,
          %s,%s,%s,%s,%s,%s,%s)
"""


def clean(v):
    """Clean and convert values to proper format"""
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip()
        if v in ["", "-", "nan", "NA"]:
            return None
        try:
            return float(v.replace(",", ""))
        except:
            return None
    try:
        if math.isnan(v):
            return None
    except:
        pass
    return float(v)


# ---- PROCESS DATA ----
total_inserted = 0
data_start_row = 3  # Data starts at row 4 (index 3, after 3 header rows)

print(f"Starting import from sheet: '{sheet_name}'")
print(f"Report month: {report_month}")
print(f"Total rows in sheet: {len(df)}")
print(f"Total columns in sheet: {df.shape[1]}")
print("=" * 80)

# Ordered list of metric columns (start column for each metric)
# FYP: cols 2-8, POL: cols 9-15, LIVES: cols 16-22, SA: cols 23-29
metric_columns = [
    ("fyp", 2),
    ("pol", 9),
    ("lives", 16),
    ("sa", 23)
]

row = data_start_row

while row < len(df):
    sl = df.iloc[row, 0]  # SlNo column
    insurer = df.iloc[row, 1]  # Insurer/Category name

    # New insurer row if SlNo is a NUMBER
    if isinstance(sl, (int, float)) and not math.isnan(sl) and isinstance(insurer, str):

        insurer_name = insurer.strip()
        print(f"\n➡ Processing Insurer: {insurer_name} (SlNo: {int(sl)})")

        # Collect all 6 rows for this insurer (1 total + 5 categories)
        categories = [(insurer_name, row)]  # First row: insurer total

        # Next 5 category rows
        for k in range(1, 6):
            if row + k < len(df):
                cat = df.iloc[row + k, 1]
                if isinstance(cat, str) and cat.strip():
                    categories.append((cat.strip(), row + k))

        # Ensure exactly 6 rows
        categories = categories[:6]

        # Extract and insert each category row
        for category, r in categories:

            # Extract all 28 metric values in correct order
            data_block = []

            # Use ordered list to ensure correct column mapping
            for metric_key, start_col in metric_columns:
                for i in range(7):  # 7 sub-fields per metric
                    col = start_col + i
                    val = clean(df.iloc[r, col] if col < df.shape[1] else None)
                    data_block.append(val)

            # Validate we have exactly 28 values
            if len(data_block) != 28:
                print(
                    f"  ⚠️  WARNING: Expected 28 values, got {len(data_block)} for {category}")
                print(f"      Data: {data_block}")

            try:
                cursor.execute(
                    sql, (report_month, insurer_name, category, *data_block))
                total_inserted += 1
                print(f"  ✔ Inserted: {category}")
            except Exception as e:
                print(f"  ❌ ERROR inserting row:")
                print(f"     Insurer: {insurer_name}")
                print(f"     Category: {category}")
                print(f"     Data length: {len(data_block)}")
                print(f"     Data: {data_block}")
                print(f"     Error: {e}")
                raise e

        row += 6  # Move to next insurer block (skip 6 rows)

    # Handle aggregate rows like "Private Total", "Industry Total"
    elif (sl is None or (isinstance(sl, float) and math.isnan(sl))) and isinstance(insurer, str):
        insurer_name = insurer.strip()

        # Check if this is an aggregate row we want to capture
        if insurer_name in ["Private Total", "Industry Total"]:
            category = "Total"

            data_block = []
            for metric_key, start_col in metric_columns:
                for i in range(7):
                    col = start_col + i
                    val = clean(df.iloc[row, col] if col <
                                df.shape[1] else None)
                    data_block.append(val)

            try:
                cursor.execute(
                    sql, (report_month, insurer_name, category, *data_block))
                total_inserted += 1
                print(f"\n✔ Inserted aggregate: {insurer_name}")
            except Exception as e:
                print(f"\n❌ ERROR inserting aggregate row:")
                print(f"   Name: {insurer_name}")
                print(f"   Data: {data_block}")
                print(f"   Error: {e}")
                raise e

        row += 1
    else:
        row += 1

conn.commit()
cursor.close()
conn.close()

print("\n" + "=" * 80)
print(f"🎯 Import completed successfully!")
print(f"Total rows inserted: {total_inserted}")
print(f"Report month: {report_month}")
