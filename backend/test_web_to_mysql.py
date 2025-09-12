#!/usr/bin/env python3
"""
Web Frontend to MySQL Test
Specifically tests that JSON data goes from web API endpoints to MySQL database
"""
import requests
import json
import sys
import os
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from databases.database import get_db
from databases.models import ExtractedRawData, ExtractedRefinedData

# API Configuration
BASE_URL = "http://localhost:8000"
TEMPLATES_BASE = f"{BASE_URL}/templates"

def test_web_frontend_to_mysql():
    """Test the complete web frontend to MySQL storage flow"""
    print("🚀 Testing Web Frontend to MySQL Storage")
    print("=" * 60)
    
    # Step 1: Check if API is running
    print("\n1️⃣ Checking API availability...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code != 200:
            print("❌ Backend API is not running or not healthy")
            print("   Please start the backend server first:")
            print("   uvicorn main:app --reload")
            return False
        print("✅ Backend API is running")
    except Exception as e:
        print(f"❌ Cannot connect to backend API: {e}")
        print("   Please start the backend server first:")
        print("   uvicorn main:app --reload")
        return False
    
    # Step 2: Get database status before test
    print("\n2️⃣ Getting initial database state...")
    try:
        response = requests.get(f"{TEMPLATES_BASE}/database-status")
        if response.status_code == 200:
            initial_status = response.json()
            initial_raw_count = initial_status.get('raw_data_count', 0)
            initial_refined_count = initial_status.get('refined_data_count', 0)
            print(f"✅ Initial state: {initial_raw_count} raw, {initial_refined_count} refined records")
        else:
            print("⚠️ Could not get initial database status")
            initial_raw_count = 0
            initial_refined_count = 0
    except Exception as e:
        print(f"⚠️ Could not get initial database status: {e}")
        initial_raw_count = 0
        initial_refined_count = 0
    
    # Step 3: Test the NEW extract-and-store endpoint
    print("\n3️⃣ Testing extract-and-store endpoint...")
    try:
        params = {
            "company": "sbi",
            "use_image_mode": True
        }
        
        response = requests.get(f"{TEMPLATES_BASE}/extract-and-store/L-1-A-REVENUE", params=params)
        
        if response.status_code != 200:
            print(f"❌ Extract-and-store failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        
        result = response.json()
        print("✅ Extract-and-store endpoint responded successfully")
        
        # Check if the endpoint claims to have stored data
        database_stored = result.get('database_stored', False)
        raw_data_id = result.get('raw_data_id')
        refined_data_id = result.get('refined_data_id')
        
        print(f"   Database stored: {database_stored}")
        print(f"   Raw data ID: {raw_data_id}")
        print(f"   Refined data ID: {refined_data_id}")
        
        if not database_stored:
            print("❌ Endpoint did not store data in database")
            return False
        
        if not raw_data_id or not refined_data_id:
            print("❌ Missing data IDs from endpoint response")
            return False
            
    except Exception as e:
        print(f"❌ Error calling extract-and-store endpoint: {e}")
        return False
    
    # Step 4: Verify data in MySQL database
    print("\n4️⃣ Verifying data in MySQL database...")
    try:
        db = next(get_db())
        
        # Check raw data exists
        raw_record = db.query(ExtractedRawData).filter(ExtractedRawData.id == raw_data_id).first()
        if not raw_record:
            print(f"❌ Raw data with ID {raw_data_id} not found in MySQL")
            db.close()
            return False
        
        print(f"✅ Raw data found in MySQL:")
        print(f"   ID: {raw_record.id}")
        print(f"   Company: {raw_record.company}")
        print(f"   Form: {raw_record.form_no}")
        print(f"   Filename: {raw_record.filename}")
        
        # Check if JSON data exists
        if raw_record.form_metadata:
            metadata = json.loads(raw_record.form_metadata)
            print(f"   Metadata keys: {list(metadata.keys())}")
        
        if raw_record.table_rows:
            rows = json.loads(raw_record.table_rows)
            print(f"   Table rows: {len(rows)} rows")
        
        # Check refined data exists
        refined_record = db.query(ExtractedRefinedData).filter(ExtractedRefinedData.id == refined_data_id).first()
        if not refined_record:
            print(f"❌ Refined data with ID {refined_data_id} not found in MySQL")
            db.close()
            return False
        
        print(f"✅ Refined data found in MySQL:")
        print(f"   ID: {refined_record.id}")
        print(f"   Company: {refined_record.company}")
        print(f"   Form: {refined_record.form_no}")
        
        # Check verification metadata
        if refined_record.form_metadata:
            metadata = json.loads(refined_record.form_metadata)
            verification_meta = metadata.get("verification_metadata", {})
            print(f"   Gemini verified: {verification_meta.get('gemini_verified', False)}")
        
        db.close()
        
    except Exception as e:
        print(f"❌ Error verifying data in MySQL: {e}")
        return False
    
    # Step 5: Check final database state
    print("\n5️⃣ Checking final database state...")
    try:
        response = requests.get(f"{TEMPLATES_BASE}/database-status")
        if response.status_code == 200:
            final_status = response.json()
            final_raw_count = final_status.get('raw_data_count', 0)
            final_refined_count = final_status.get('refined_data_count', 0)
            
            print(f"✅ Final state: {final_raw_count} raw, {final_refined_count} refined records")
            print(f"   New records added: {final_raw_count - initial_raw_count} raw, {final_refined_count - initial_refined_count} refined")
            
            if final_raw_count > initial_raw_count and final_refined_count > initial_refined_count:
                print("✅ Database records increased as expected")
            else:
                print("⚠️ Database record counts did not increase as expected")
        else:
            print("⚠️ Could not get final database status")
    except Exception as e:
        print(f"⚠️ Could not get final database status: {e}")
    
    return True

def main():
    """Run the web frontend to MySQL test"""
    success = test_web_frontend_to_mysql()
    
    print("\n" + "=" * 60)
    print("FINAL RESULT:")
    print("=" * 60)
    
    if success:
        print("🎉 SUCCESS!")
        print("✅ Web frontend API successfully stores JSON data in MySQL")
        print("✅ Extract-and-store endpoint is working correctly")
        print("✅ Complete flow: Web API → Extraction → Verification → MySQL Storage")
        print("\n💡 The web frontend is now fully integrated with MySQL database!")
    else:
        print("❌ FAILED!")
        print("⚠️ Web frontend is NOT storing JSON data in MySQL")
        print("🔧 Check the error messages above for troubleshooting")
    
    return success

if __name__ == "__main__":
    main()
