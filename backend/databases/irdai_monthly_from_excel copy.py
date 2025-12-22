from datetime import datetime
import pandas as pd
import mysql.connector
import math
import os

# ======================================================
# CONFIG
# ======================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
excel_path = os.path.join(BASE_DIR, "FYP Sep 2025.xlsx")

sheet_name = "as at 30th Sep 2025"
report_month = "2025-09-30"
month_year = datetime.strptime(report_month, "%Y-%m-%d").strftime("%b %y")

db_config = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "viyanta_web"
}

# ======================================================
# INSURER NORMALIZATION MAP (CANONICAL NAMES)
# ======================================================
INSURER_MAP = {
    "LIC": "LIC of India",

    "HDFC": "HDFC Life",
    "ICICI": "ICICI Prudential Life",
    "ADITYA BIRLA": "Aditya Birla Sun Life",
    "AXIS MAX": "Axis Max Life",
    "BAJAJ": "Bajaj Allianz Life",
    "KOTAK": "Kotak Mahindra Life",
    "TATA AIA": "Tata AIA Life",
    "PNB MET": "PNB MetLife",
    "MAX LIFE": "Max Life",
    "SBI": "SBI Life",                    # ⭐ SBI handled here
    "AVIVA": "Aviva Life",
    "CANARA HSBC": "Canara HSBC Life",
    "BHARTI AXA": "Bharti Axa Life",
    "BANDHAN": "Bandhan Life",
    "AEGON": "Bandhan Life",              # merger handled
    "ACKO": "Acko Life",
    "EXIDE": "Exide Life",
    "SHRIRAM": "Shriram Life",
    "STAR UNION": "Star Union Dai-ichi Life",
    "GO DIGIT": "Go Digit Life",
    "INDIA FIRST": "India First Life",
    "PRAMERICA": "Pramerica Life",
    "RELIANCE": "Reliance Nippon Life",
    "FUTURE GENERALI": "Future Generali Life",
}

# ======================================================
# NORMALIZATION FUNCTION (ROBUST)
# ======================================================


def normalize_insurer(raw_name: str) -> str:
    if not raw_name:
        return raw_name

    name = raw_name.strip()
    name_upper = name.upper()

    # Handle totals explicitly
    if name_upper in ("PRIVATE TOTAL", "GRAND TOTAL"):
        return name

    # Match by keyword
    for key, canonical in INSURER_MAP.items():
        if key in name_upper:
            return canonical

    # Fallback
    return name


# ======================================================
# CONNECT DB
# ======================================================
conn = mysql.connector.connect(**db_config)
cursor = conn.cursor()

# ======================================================
# READ EXCEL
# ======================================================
df = pd.read_excel(excel_path, sheet_name=sheet_name, header=None)
df = df.where(pd.notnull(df), None)

# ======================================================
# INSERT SQL
# ======================================================
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

# ======================================================
# HELPERS
# ======================================================


def clean(v):
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip()
        if v in ("", "-", "NA", "nan"):
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


def is_footer_row(text):
    if not isinstance(text, str):
        return False
    t = text.lower()
    return t.startswith(("note", "compiled", "the first year", "*consequent", "consequent"))


# Metric column starts
metric_columns = [
    ("fyp", 2),
    ("pol", 9),
    ("lives", 16),
    ("sa", 23)
]

# ======================================================
# PROCESS DATA
# ======================================================
row = 3
total_inserted = 0

print(f"▶ Importing sheet: {sheet_name}")
print("=" * 80)

while row < len(df):
    sl = df.iloc[row, 0]
    insurer_raw = df.iloc[row, 1]

    if is_footer_row(insurer_raw):
        print("\n🛑 Footer reached. Stopping import.")
        break

    is_block = (
        isinstance(insurer_raw, str) and insurer_raw.strip() and
        ((isinstance(sl, (int, float)) and not math.isnan(sl))
         or insurer_raw.strip() in ("Private Total", "Grand Total"))
    )

    if not is_block:
        row += 1
        continue

    raw_insurer = insurer_raw.strip()
    insurer_name = normalize_insurer(raw_insurer)

    print(f"\n➡ Processing insurer: {raw_insurer} → {insurer_name}")

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

        # ---- DUPLICATE PROTECTION ----
        cursor.execute("""
            SELECT 1 FROM irdai_monthly_data
            WHERE report_month = %s
              AND insurer_name = %s
              AND category = %s
            LIMIT 1
        """, (report_month, insurer_name, category))

        if cursor.fetchone():
            print(f"  ⚠ Skipped duplicate: {insurer_name} - {category}")
            continue

        cursor.execute(
            sql,
            (report_month, month_year, insurer_name, category, *data_block)
        )
        total_inserted += 1
        print(f"  ✔ Inserted: {category}")

    row += 6

# ======================================================
# FINISH
# ======================================================
conn.commit()
cursor.close()
conn.close()

print("\n" + "=" * 80)
print("🎯 Import completed successfully")
print(f"Total rows inserted: {total_inserted}")
print(f"Report month: {report_month}")
