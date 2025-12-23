from datetime import datetime
import pandas as pd
import mysql.connector
import math

# ---- CONFIG ----
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
excel_path = os.path.join(BASE_DIR, "FYP Sep 2025.xlsx")

sheet_name = "as at 30th Sep 2025"  # Fixed: correct sheet name
report_month = "2025-09-30"

month_year = datetime.strptime(report_month, "%Y-%m-%d").strftime("%b %y")
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
df = df.where(pd.notnull(df), None)

# ---- SQL ----
sql = """
INSERT INTO irdai_monthly_data (
  report_month, month_year, insurer_name, category,
  fyp_prev, fyp_current, fyp_growth, fyp_ytd_prev, fyp_ytd_current, fyp_growth_ytd, fyp_market_share,
  pol_prev, pol_current, pol_growth, pol_ytd_prev, pol_ytd_current, pol_growth_ytd, pol_market_share,
  lives_prev, lives_current, lives_growth, lives_ytd_prev, lives_ytd_current, lives_growth_ytd, lives_market_share,
  sa_prev, sa_current, sa_growth, sa_ytd_prev, sa_ytd_current, sa_growth_ytd, sa_market_share
) VALUES (
  %s,%s,%s,%s,
  %s,%s,%s,%s,%s,%s,%s,
  %s,%s,%s,%s,%s,%s,%s,
  %s,%s,%s,%s,%s,%s,%s,
  %s,%s,%s,%s,%s,%s,%s
)
"""

# ---- CLEAN FUNCTION ----


def clean(v):
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip()
        if v in ["", "-", "NA", "nan"]:
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

# ---- FOOTER CHECK ----


def is_footer_row(text):
    if not isinstance(text, str):
        return False
    text = text.lower()
    return (
        text.startswith("note") or
        text.startswith("compiled") or
        text.startswith("the first year premium") or
        text.startswith("*Consequent") or
        text.startswith("Consequent")

    )


# ---- METRIC COLUMN MAP ----
metric_columns = [
    ("fyp", 2),
    ("pol", 9),
    ("lives", 16),
    ("sa", 23)
]

# ---- PROCESS DATA ----
row = 3
total_inserted = 0

print(f"Starting import from sheet: {sheet_name}")
print("=" * 80)

while row < len(df):
    sl = df.iloc[row, 0]
    insurer = df.iloc[row, 1]

    # STOP at footer
    if is_footer_row(insurer):
        print("\n🛑 Footer reached. Import stopped.")
        break

    # INSURER / TOTAL BLOCK
    is_block = (
        isinstance(insurer, str) and insurer.strip() and
        (
            (isinstance(sl, (int, float)) and not math.isnan(sl)) or
            insurer.strip() in ["Private Total", "Grand Total"]
        )
    )

    if is_block:
        insurer_name = insurer.strip()
        print(f"\n➡ Processing: {insurer_name}")

        categories = [(insurer_name, row)]

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
                    val = clean(df.iloc[r, col] if col < df.shape[1] else None)
                    data_block.append(val)

            cursor.execute(
                sql, (report_month, month_year,
                      insurer_name, category, *data_block)
            )
            total_inserted += 1
            print(f"  ✔ Inserted: {category}")

        row += 6
    else:
        row += 1

conn.commit()
cursor.close()
conn.close()

print("\n" + "=" * 80)
print("🎯 Import completed successfully")
print(f"Total rows inserted: {total_inserted}")
print(f"Report month: {report_month}")
