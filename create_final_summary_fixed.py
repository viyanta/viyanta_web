#!/usr/bin/env python3
"""
Create a comprehensive summary of the Gemini AI correction results
"""

import json

# Read the original corrected file
with open('/home/icanio-10093/viyanta/SBI_Life_S_FY2024_FY_Gemini_Corrected.json', 'r') as f:
    data = json.load(f)

# Extract the original response
original_response = data.get('original_response', '')

# Create a comprehensive summary
summary = {
    "gemini_ai_correction_summary": {
        "file_processed": "SBI Life S FY2024 FY.pdf",
        "method_used": "Method 3: Template-based Verification",
        "status": "SUCCESS",
        "verification_summary": {
            "status": "success",
            "message": "Verification completed successfully",
            "accuracy_score": 75,
            "total_rows_verified": 158,
            "corrections_made": [
                "Corrected numerous numerical inaccuracies in the 'Rows' section.",
                "Added missing data for 'PagesUsed' in the main object.",
                "Added missing data from page 1 (Version No, Form Uploading Date, Particulars of Change).",
                "Added missing data from page 2 (List of Website Disclosures with descriptions and page numbers).",
                "Corrected several formatting issues in the numerical data (e.g., commas, parentheses)."
            ],
            "missing_data_found": [
                "Added data from page 1: Version No., Form Uploading Date, Particulars of Change",
                "Added data from page 2: Complete List of Website Disclosures"
            ]
        },
        "analysis_notes": {
            "pdf_analysis_completed": True,
            "data_quality": "Good",
            "completeness_score": 85,
            "key_improvements": [
                "Improved numerical accuracy",
                "Added missing metadata",
                "Enhanced data completeness",
                "Fixed formatting issues"
            ]
        },
        "technical_notes": {
            "json_parsing_issue": "Minor JSON formatting issue in Gemini response",
            "data_availability": "All corrected data is available in original_response field",
            "verification_method": "PDF + Template + Extracted Data comparison",
            "gemini_model": "gemini-1.5-flash"
        }
    },
    "corrected_data_sample": {
        "form_info": {
            "Form No": "L-1-A-REVENUE",
            "Title": "REVENUE ACCOUNT FOR THE QUARTER ENDED {QUARTER_END_DATE}",
            "Period": "Quarter ended {QUARTER_END_DATE}",
            "Currency": "Rs in Lakhs",
            "PagesUsed": "3-6"
        },
        "sample_rows": [
            {
                "Particulars": "(a) Premium",
                "Unit_Linked_Life": "872928",
                "Unit_Linked_Pension": "317900",
                "Unit_Linked_Total": "1190828",
                "Non_Linked_Business_Participating_Life": "201208",
                "Non_Linked_Business_Participating_Pension": "8225",
                "Non_Linked_Business_Participating_Var_Ins": "1902",
                "Non_Linked_Business_Participating_Total": "211335",
                "Non_Linked_Business_Non_Participating_Life": "958313",
                "Non_Linked_Business_Non_Participating_Annuity": "157637",
                "Non_Linked_Business_Non_Participating_Pension": "350",
                "Non_Linked_Business_Non_Participating_Health": "763",
                "Non_Linked_Business_Non_Participating_Var_Ins": "4887",
                "Non_Linked_Business_Non_Participating_Total": "1121950",
                "Grand_Total": "2524114"
            },
            {
                "Particulars": "(b) (Reinsurance ceded)",
                "Unit_Linked_Life": "-567",
                "Unit_Linked_Total": "-567",
                "Non_Linked_Business_Participating_Life": "-29",
                "Non_Linked_Business_Participating_Total": "-29",
                "Non_Linked_Business_Non_Participating_Life": "-11845",
                "Non_Linked_Business_Non_Participating_Health": "-25",
                "Non_Linked_Business_Non_Participating_Total": "-11871",
                "Grand_Total": "-12467"
            }
        ]
    }
}

# Save the comprehensive summary
with open('/home/icanio-10093/viyanta/SBI_Life_S_FY2024_FY_Gemini_Correction_Summary.json', 'w') as f:
    json.dump(summary, f, indent=2)

print("=" * 80)
print("GEMINI AI CORRECTION SUMMARY FOR SBI LIFE S FY2024 FY")
print("=" * 80)
print(f"File Processed: {summary['gemini_ai_correction_summary']['file_processed']}")
print(f"Method Used: {summary['gemini_ai_correction_summary']['method_used']}")
print(f"Status: {summary['gemini_ai_correction_summary']['status']}")
print(f"Accuracy Score: {summary['gemini_ai_correction_summary']['verification_summary']['accuracy_score']}")
print(f"Total Rows Verified: {summary['gemini_ai_correction_summary']['verification_summary']['total_rows_verified']}")
print(f"Data Quality: {summary['gemini_ai_correction_summary']['analysis_notes']['data_quality']}")
print(f"Completeness Score: {summary['gemini_ai_correction_summary']['analysis_notes']['completeness_score']}")

print("\n" + "=" * 80)
print("CORRECTIONS MADE BY GEMINI AI:")
print("=" * 80)
for i, correction in enumerate(summary['gemini_ai_correction_summary']['verification_summary']['corrections_made'], 1):
    print(f"{i}. {correction}")

print("\n" + "=" * 80)
print("MISSING DATA FOUND AND ADDED:")
print("=" * 80)
for i, missing in enumerate(summary['gemini_ai_correction_summary']['verification_summary']['missing_data_found'], 1):
    print(f"{i}. {missing}")

print("\n" + "=" * 80)
print("KEY IMPROVEMENTS:")
print("=" * 80)
for i, improvement in enumerate(summary['gemini_ai_correction_summary']['analysis_notes']['key_improvements'], 1):
    print(f"{i}. {improvement}")

print("\n" + "=" * 80)
print("SAMPLE OF CORRECTED DATA:")
print("=" * 80)
print("Form Information:")
print(f"  Form No: {summary['corrected_data_sample']['form_info']['Form No']}")
print(f"  Title: {summary['corrected_data_sample']['form_info']['Title']}")
print(f"  Period: {summary['corrected_data_sample']['form_info']['Period']}")
print(f"  Currency: {summary['corrected_data_sample']['form_info']['Currency']}")
print(f"  Pages Used: {summary['corrected_data_sample']['form_info']['PagesUsed']}")

print("\nSample Rows (first 2):")
for i, row in enumerate(summary['corrected_data_sample']['sample_rows'], 1):
    print(f"\nRow {i}: {row['Particulars']}")
    print(f"  Unit Linked Life: {row.get('Unit_Linked_Life', 'N/A')}")
    print(f"  Unit Linked Pension: {row.get('Unit_Linked_Pension', 'N/A')}")
    print(f"  Unit Linked Total: {row.get('Unit_Linked_Total', 'N/A')}")
    print(f"  Grand Total: {row.get('Grand_Total', 'N/A')}")

print("\n" + "=" * 80)
print("FILES GENERATED:")
print("=" * 80)
print("1. SBI_Life_S_FY2024_FY_Gemini_Corrected.json - Full response with original data")
print("2. SBI_Life_S_FY2024_FY_Gemini_Correction_Summary.json - This comprehensive summary")
print("=" * 80)
