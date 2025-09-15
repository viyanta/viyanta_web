#!/usr/bin/env python3
"""
Extract both original and AI JSON data for comparison
"""

import sys
import os
import json
import asyncio
sys.path.append('backend')

from backend.services.master_template import ai_extract_form, extract_form

async def extract_both():
    """Extract both original and AI data"""
    print("🔍 Extracting Original PDF JSON...")
    
    # Extract original data
    try:
        original_result = await extract_form("sbi", "L-1-A-REVENUE")
        print(f"✅ Original extraction: {original_result.get('TotalRows', 0)} rows")
        
        # Save original JSON
        with open('original_sbi_l1_revenue.json', 'w') as f:
            json.dump(original_result, f, indent=2, default=str)
        print("💾 Saved: original_sbi_l1_revenue.json")
        
    except Exception as e:
        print(f"❌ Original extraction failed: {e}")
        return
    
    print("\n🤖 Extracting AI JSON...")
    
    # Extract AI data
    try:
        ai_result = await ai_extract_form("sbi", "L-1-A-REVENUE")
        if ai_result and ai_result[0].get('Rows'):
            ai_rows = len(ai_result[0]['Rows'])
            print(f"✅ AI extraction: {ai_rows} rows")
            
            # Save AI JSON
            with open('ai_sbi_l1_revenue.json', 'w') as f:
                json.dump(ai_result, f, indent=2, default=str)
            print("💾 Saved: ai_sbi_l1_revenue.json")
            
            # Create comparison summary
            comparison = {
                "summary": {
                    "original_rows": original_result.get('TotalRows', 0),
                    "ai_rows": ai_rows,
                    "difference": abs(original_result.get('TotalRows', 0) - ai_rows),
                    "original_pages": original_result.get('PagesUsed', 'Unknown'),
                    "ai_pages": ai_result[0].get('PagesUsed', 'Unknown')
                },
                "files": {
                    "original_json": "original_sbi_l1_revenue.json",
                    "ai_json": "ai_sbi_l1_revenue.json"
                }
            }
            
            with open('extraction_comparison.json', 'w') as f:
                json.dump(comparison, f, indent=2, default=str)
            print("💾 Saved: extraction_comparison.json")
            
        else:
            print("❌ AI extraction failed")
    except Exception as e:
        print(f"❌ AI extraction failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(extract_both())
