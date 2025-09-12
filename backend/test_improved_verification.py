#!/usr/bin/env python3
"""
Test script to demonstrate the improved Gemini verification system
"""

import sys
import json
import asyncio
sys.path.append('.')

from services.gemini_pdf_verifier_improved import verify_pdf_extraction
from services.master_template import extract_form

async def test_verification():
    """Test the improved verification system"""
    
    # PDF file to test
    pdf_path = "pdfs_selected_company/sbi/SBI Life  S 2025 Q1.pdf"
    
    # Template used for extraction (this would come from your template system)
    template = {
        "form_type": "L-1-A-REVENUE",
        "company": "sbi",
        "headers": [
            "Particulars", "Schedule", "Unit_Linked_Life", "Unit_Linked_Pension", 
            "Unit_Linked_Total", "Participating_Life", "Participating_Pension",
            "Participating_Var_Ins", "Participating_Total", "Non_Participating_Life",
            "Non_Participating_Annuity", "Non_Participating_Pension", 
            "Non_Participating_Health", "Non_Participating_Var_Ins", 
            "Non_Participating_Total", "Grand_Total"
        ],
        "expected_structure": "revenue_account"
    }
    
    print("🔍 STEP 1: Extracting data from PDF...")
    try:
        # First, extract data using master template
        extracted_data = await extract_form('sbi', 'L-1-A-REVENUE', 'SBI Life  S 2025 Q1.pdf')
        print(f"✅ Extraction completed. Total rows: {extracted_data.get('TotalRows', 'N/A')}")
        
        # Remove Gemini verification from extracted data to get raw extraction
        raw_extracted = extracted_data.copy()
        if 'gemini_verification' in raw_extracted:
            del raw_extracted['gemini_verification']
        if 'gemini_processing_status' in raw_extracted:
            del raw_extracted['gemini_processing_status']
        
        print("\n🔍 STEP 2: Running improved Gemini verification...")
        print("   - Input: Original PDF + Template + Extracted Data")
        print("   - Process: Compare extracted data with PDF using template")
        print("   - Output: Corrected data based on PDF analysis")
        
        # Now run the improved verification
        verification_result = verify_pdf_extraction(pdf_path, template, raw_extracted)
        
        print("\n📊 VERIFICATION RESULTS:")
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
        
        # Save results
        with open('improved_verification_result.json', 'w', encoding='utf-8') as f:
            json.dump(verification_result, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Full verification result saved to: improved_verification_result.json")
        
        # Show sample of corrected data
        if 'corrected_data' in verification_result and verification_result['corrected_data']:
            corrected = verification_result['corrected_data']
            print(f"\n📋 SAMPLE OF CORRECTED DATA:")
            print(f"Form No: {corrected.get('Form No', 'N/A')}")
            print(f"Title: {corrected.get('Title', 'N/A')}")
            print(f"Total Rows: {corrected.get('TotalRows', 'N/A')}")
            
            # Show first few rows
            if 'Rows' in corrected and corrected['Rows']:
                print(f"\nFirst 3 rows of corrected data:")
                for i, row in enumerate(corrected['Rows'][:3], 1):
                    print(f"  Row {i}: {row.get('Particulars', 'N/A')} - Grand Total: {row.get('Grand_Total', 'N/A')}")
        
    except Exception as e:
        print(f"❌ Error during verification: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_verification())
