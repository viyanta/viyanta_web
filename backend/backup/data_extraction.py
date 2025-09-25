# import json
# import re
# from pathlib import Path
# import pdfplumber
# import camelot

# TEMPLATE_JSON = r"../templates/sbi/L-1-A-REVENUE.json"   # template for L-1-A-REVENUE
# INPUT_PDF = r"pdf_splits_auto/L-1-A-REVENUE_ACCOUNT_Revenue_Account_1-4_3_6.pdf"
# OUTPUT_JSON = r"L-1-A-REVENUE_extracted.json"


# def load_template(path):
#     with open(path, "r", encoding="utf-8") as f:
#         return json.load(f)


# def extract_period(text):
#     """Extract reporting period like 'For the quarter ended December 31, 2022'"""
#     print("Extracting period from text snippet:", text[:100])
#     match = re.search(r"For the .*?ended.*?\d{4}", text, flags=re.IGNORECASE)
#     return match.group(0).strip() if match else ""


# def extract_tables(pdf_path):
#     """Try Camelot, fallback to pdfplumber"""
#     print("Extracting tables from PDF:", pdf_path)
#     tables = []
#     try:
#         camelot_tables = camelot.read_pdf(
#             pdf_path, pages="all", flavor="stream")
#         for t in camelot_tables:
#             tables.append(t.df.values.tolist())
#     except Exception as e:
#         print("Camelot failed:", e)

#     if not tables:
#         with pdfplumber.open(pdf_path) as pdf:
#             for p in pdf.pages:
#                 tb = p.extract_table()
#                 if tb:
#                     tables.append(tb)
#     return tables


# def map_to_rows(table, flat_headers):
#     # skip header row if present
#     print("Mapping table with headers:", flat_headers)
#     data_rows = table[1:] if len(table) > 1 else table
#     mapped_rows = []

#     for row in data_rows:
#         mapped = {}
#         for i, header in enumerate(flat_headers):
#             if i < len(row):
#                 mapped[header] = row[i].strip()
#             else:
#                 mapped[header] = ""
#         mapped_rows.append(mapped)

#     return mapped_rows


# def extract_form(pdf_path, template_json, output_json):
#     print
#     template = load_template(template_json)
#     flat_headers = template["FlatHeaders"]
#     form_no = template["Form"]
#     title = template["Title"]

#     results = []

#     with pdfplumber.open(pdf_path) as pdf:
#         for page_idx, page in enumerate(pdf.pages, start=1):
#             text = page.extract_text() or ""
#             period = extract_period(text)
#             tables = extract_tables(pdf_path)

#             for table in tables:
#                 rows = map_to_rows(table, flat_headers)
#                 results.append({
#                     "Form": form_no,
#                     "Title": title,
#                     "Period": period,
#                     "PagesUsed": page_idx,
#                     "FlatHeaders": flat_headers,
#                     "Rows": rows
#                 })

#     with open(output_json, "w", encoding="utf-8") as f:
#         json.dump(results, f, indent=2, ensure_ascii=False)

#     return output_json


# if __name__ == "__main__":
#     out = extract_form(INPUT_PDF, TEMPLATE_JSON, OUTPUT_JSON)
#     print(f"✅ Extracted and saved to {out}")


# version 1 (one page one time)
import json
import re
from pathlib import Path
import pdfplumber
import camelot

TEMPLATE_JSON = r"../templates/sbi/L-2-A-PROFIT.json"   # template for L-1-A-REVENUE
INPUT_PDF = r"sbi_pdf_splits_auto/L-2-A-PROFIT_AND_LOSS_ACCOUNT_Profit_Loss_Account_5_5_5.pdf"
OUTPUT_JSON = r"L-2-A-PROFIT_extracted.json"


def load_template(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def extract_period(text):
    """Extract reporting period like 'For the quarter ended December 31, 2022'"""
    match = re.search(r"For the .*?ended.*?\d{4}", text, flags=re.IGNORECASE)
    return match.group(0).strip() if match else ""


def extract_tables_from_page(pdf_path, page_number):
    """Extract tables only from a specific page"""
    tables = []
    try:
        camelot_tables = camelot.read_pdf(
            pdf_path, pages=str(page_number), flavor="stream"
        )
        for t in camelot_tables:
            tables.append(t.df.values.tolist())
    except Exception:
        pass

    if not tables:
        with pdfplumber.open(pdf_path) as pdf:
            page = pdf.pages[page_number - 1]  # 0-based index
            tb = page.extract_table()
            if tb:
                tables.append(tb)
    return tables


def map_to_rows(table, flat_headers):
    """Map extracted table rows to template headers"""
    data_rows = table[1:] if len(table) > 1 else table
    mapped_rows = []

    for row in data_rows:
        mapped = {}
        for i, header in enumerate(flat_headers):
            if i < len(row):
                mapped[header] = row[i].strip()
            else:
                mapped[header] = ""
        mapped_rows.append(mapped)

    return mapped_rows


def extract_form(pdf_path, template_json, output_json):
    template = load_template(template_json)
    flat_headers = template["FlatHeaders"]
    form_no = template["Form"]
    title = template["Title"]

    results = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_idx, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            period = extract_period(text)

            # ✅ extract tables only from this page
            tables = extract_tables_from_page(pdf_path, page_idx)

            for table in tables:
                rows = map_to_rows(table, flat_headers)
                results.append({
                    "Form": form_no,
                    "Title": title,
                    "Period": period,
                    "PagesUsed": page_idx,
                    "FlatHeaders": flat_headers,
                    "Rows": rows
                })

    # save JSON
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    return output_json


if __name__ == "__main__":
    out = extract_form(INPUT_PDF, TEMPLATE_JSON, OUTPUT_JSON)
    print(f"✅ Extracted and saved to {out}")
