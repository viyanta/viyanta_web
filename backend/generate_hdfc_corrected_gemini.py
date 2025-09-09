#!/usr/bin/env python3
"""
Generate CORRECTED Gemini AI Response for HDFC Company
This will get the actual corrected data from Gemini AI
"""

import sys
import json
import asyncio
import os
from datetime import datetime
sys.path.append('.')

from services.master_template import extract_form
from services.gemini_pdf_verifier_improved import ImprovedGeminiPDFVerifier

async def generate_hdfc_corrected_gemini():
    """Generate CORRECTED Gemini AI response for HDFC company"""
    
    print("�� HDFC CORRECTED GEMINI AI VERIFICATION PROCESS")
    print("=" * 60)
    
    # HDFC file paths
    pdf_path = "pdfs_selected_company/hdfc/HDFC Life  S FY2023 9M.pdf"
    template_path = "templates/hdfc/l-1-a-ra.json"
    
    # Check if files exist
    if not os.path.exists(pdf_path):
        print(f"❌ PDF file not found: {pdf_path}")
        return
    
    if not os.path.exists(template_path):
        print(f"❌ Template file not found: {template_path}")
        return
    
    print(f"📄 PDF File: {os.path.basename(pdf_path)}")
    print(f"📋 Template: {os.path.basename(template_path)}")
    print("=" * 60)
    
    try:
        # Step 1: Extract data using master template
        print("🔍 STEP 1: Extracting data from HDFC PDF...")
        extracted_data = await extract_form('hdfc', 'L-1-A-RA', 'HDFC Life  S FY2023 9M.pdf')
        
        if not extracted_data:
            print("❌ Failed to extract data from HDFC PDF")
            return
        
        print(f"✅ Extraction completed. Total rows: {extracted_data.get('TotalRows', 'N/A')}")
        
        # Step 2: Load template for verification
        print("\n🔍 STEP 2: Loading HDFC template...")
        with open(template_path, 'r', encoding='utf-8') as f:
            template = json.load(f)
        
        print(f"✅ Template loaded: {template.get('Title', 'N/A')}")
        
        # Step 3: Run Gemini AI verification with proper error handling
        print("\n🤖 STEP 3: Running Gemini AI verification for CORRECTED data...")
        print("   - Input: HDFC PDF + Template + Extracted Data")
        print("   - Process: Compare extracted data with PDF using template")
        print("   - Output: CORRECTED data based on PDF analysis")
        
        # Remove any existing Gemini verification from extracted data
        raw_extracted = extracted_data.copy()
        if 'gemini_verification' in raw_extracted:
            del raw_extracted['gemini_verification']
        if 'gemini_processing_status' in raw_extracted:
            del raw_extracted['gemini_processing_status']
        if 'gemini_analysis' in raw_extracted:
            del raw_extracted['gemini_analysis']
        
        # Initialize Gemini verifier
        gemini_verifier = ImprovedGeminiPDFVerifier()
        
        # Run Gemini verification with PDF file
        verification_result = gemini_verifier.verify_extraction_with_pdf(pdf_path, template, raw_extracted)
        
        print("\n📊 GEMINI VERIFICATION RESULTS:")
        print("=" * 50)
        
        if 'verification_summary' in verification_result:
            summary = verification_result['verification_summary']
            print(f"Status: {summary.get('status', 'unknown')}")
            print(f"Message: {summary.get('message', 'N/A')}")
            print(f"Accuracy Score: {summary.get('accuracy_score', 'N/A')}%")
            
            if 'corrections_made' in summary:
                print(f"Corrections Made: {len(summary['corrections_made'])}")
                for i, correction in enumerate(summary['corrections_made'][:5], 1):
                    print(f"  {i}. {correction}")
            
            if 'missing_data_found' in summary:
                print(f"Missing Data Found: {len(summary['missing_data_found'])}")
                for i, missing in enumerate(summary['missing_data_found'][:5], 1):
                    print(f"  {i}. {missing}")
        
        if 'analysis_notes' in verification_result:
            notes = verification_result['analysis_notes']
            print(f"\nData Quality: {notes.get('data_quality', 'unknown')}")
            print(f"Completeness Score: {notes.get('completeness_score', 'N/A')}%")
            
            if 'key_improvements' in notes:
                print(f"Key Improvements: {len(notes['key_improvements'])}")
                for i, improvement in enumerate(notes['key_improvements'][:5], 1):
                    print(f"  {i}. {improvement}")
        
        # Step 4: Generate timestamped files with CORRECTED data
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save CORRECTED extraction result
        corrected_result_file = f"hdfc_corrected_extraction_result_{timestamp}.json"
        
        if 'corrected_data' in verification_result and verification_result['corrected_data']:
            # Use the corrected data from Gemini
            corrected_data = verification_result['corrected_data']
            print(f"\n💾 CORRECTED extraction result saved to: {corrected_result_file}")
        else:
            # Fallback to original data if no corrections available
            corrected_data = raw_extracted
            print(f"\n⚠️ No corrected data available, using original data")
        
        with open(corrected_result_file, 'w', encoding='utf-8') as f:
            json.dump(corrected_data, f, indent=2, ensure_ascii=False)
        
        # Save Gemini AI response summary
        gemini_response_file = f"hdfc_gemini_ai_response_{timestamp}.json"
        
        gemini_response = {
            "verification_summary": verification_result.get('verification_summary', {}),
            "analysis_notes": verification_result.get('analysis_notes', {}),
            "processing_status": "completed",
            "metadata": {
                "extraction_timestamp": datetime.now().isoformat(),
                "company": "hdfc",
                "form_number": "l-1-a-ra",
                "pdf_file": os.path.basename(pdf_path),
                "total_rows_extracted": corrected_data.get('TotalRows', 0),
                "headers_count": len(corrected_data.get('Headers', {})),
                "form_title": corrected_data.get('Title', 'N/A'),
                "corrections_applied": 'corrected_data' in verification_result
            }
        }
        
        with open(gemini_response_file, 'w', encoding='utf-8') as f:
            json.dump(gemini_response, f, indent=2, ensure_ascii=False)
        print(f"💾 Gemini AI response saved to: {gemini_response_file}")
        
        # Show sample of corrected data
        if 'corrected_data' in verification_result and verification_result['corrected_data']:
            corrected = verification_result['corrected_data']
            print(f"\n📋 SAMPLE OF CORRECTED DATA:")
            print(f"Form No: {corrected.get('Form No', 'N/A')}")
            print(f"Title: {corrected.get('Title', 'N/A')}")
            print(f"Total Rows: {corrected.get('TotalRows', 'N/A')}")
            
            # Show first few rows
            if 'Rows' in corrected and corrected['Rows']:
                print(f"\nFirst 3 rows of CORRECTED data:")
                for i, row in enumerate(corrected['Rows'][:3], 1):
                    print(f"  Row {i}: {row.get('Particulars', 'N/A')} - Total: {row.get('Total', 'N/A')}")
        
        print("\n" + "=" * 60)
        print("✅ HDFC CORRECTED GEMINI AI VERIFICATION COMPLETED!")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Error during HDFC verification: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(generate_hdfc_corrected_gemini())
