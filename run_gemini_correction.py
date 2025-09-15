#!/usr/bin/env python3
"""
Script to run Gemini AI correction on SBI Life S FY2024 FY.pdf
Using Method 3: Template-based Verification
"""

import sys
import os
import json
import asyncio
from pathlib import Path

# Add the backend directory to Python path
sys.path.append('/home/icanio-10093/viyanta/viyanta_web/backend')

from services.gemini_pdf_verifier_improved import verify_pdf_extraction

async def main():
    # File paths
    pdf_path = "/home/icanio-10093/viyanta/viyanta_web/backend/pdfs_selected_company/sbi/SBI Life  S FY2024 FY.pdf"
    template_path = "/home/icanio-10093/viyanta/viyanta_web/backend/templates/sbi/l-1-a-revenue.json"
    extracted_data_path = "/home/icanio-10093/viyanta/viyanta_web/backend/SBI_Life_S_FY2024_FY_extracted.json"
    
    # Check if files exist
    if not os.path.exists(pdf_path):
        print(f"PDF file not found: {pdf_path}")
        return
    
    if not os.path.exists(template_path):
        print(f"Template file not found: {template_path}")
        return
        
    if not os.path.exists(extracted_data_path):
        print(f"Extracted data file not found: {extracted_data_path}")
        return
    
    # Load template and extracted data
    with open(template_path, 'r') as f:
        template = json.load(f)
    
    with open(extracted_data_path, 'r') as f:
        extracted_data = json.load(f)
    
    print("=" * 60)
    print("GEMINI AI CORRECTION FOR SBI LIFE S FY2024 FY")
    print("=" * 60)
    print(f"PDF File: {os.path.basename(pdf_path)}")
    print(f"Template: {os.path.basename(template_path)}")
    print(f"Extracted Data: {os.path.basename(extracted_data_path)}")
    print("=" * 60)
    
    try:
        # Run Gemini AI correction using Method 3: Template-based Verification
        print("Starting Gemini AI correction...")
        result = verify_pdf_extraction(pdf_path, template, extracted_data)
        
        # Save the corrected result
        output_path = "/home/icanio-10093/viyanta/SBI_Life_S_FY2024_FY_Gemini_Corrected.json"
        with open(output_path, 'w') as f:
            json.dump(result, f, indent=2)
        
        print("=" * 60)
        print("GEMINI AI CORRECTION COMPLETED")
        print("=" * 60)
        
        # Display verification summary
        if 'verification_summary' in result:
            summary = result['verification_summary']
            print(f"Status: {summary.get('status', 'Unknown')}")
            print(f"Message: {summary.get('message', 'No message')}")
            print(f"Accuracy Score: {summary.get('accuracy_score', 'N/A')}")
            print(f"Total Rows Verified: {summary.get('total_rows_verified', 'N/A')}")
            
            if 'corrections_made' in summary:
                print(f"Corrections Made: {len(summary['corrections_made'])}")
                for i, correction in enumerate(summary['corrections_made'][:5], 1):
                    print(f"  {i}. {correction}")
                if len(summary['corrections_made']) > 5:
                    print(f"  ... and {len(summary['corrections_made']) - 5} more corrections")
        
        # Display analysis notes
        if 'analysis_notes' in result:
            notes = result['analysis_notes']
            print(f"Data Quality: {notes.get('data_quality', 'Unknown')}")
            print(f"Completeness Score: {notes.get('completeness_score', 'N/A')}")
        
        print(f"\nCorrected data saved to: {output_path}")
        print("=" * 60)
        
        # Display sample of corrected data
        if 'corrected_data' in result and 'Rows' in result['corrected_data']:
            rows = result['corrected_data']['Rows']
            print(f"Sample of corrected data (first 3 rows):")
            for i, row in enumerate(rows[:3], 1):
                print(f"Row {i}: {row}")
        
    except Exception as e:
        print(f"Error during Gemini AI correction: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
