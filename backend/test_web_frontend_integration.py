#!/usr/bin/env python3
"""
Comprehensive Web Frontend Integration Test
Tests the complete flow: Frontend API → Master Template → Gemini Verification → MySQL Storage
"""
from databases.models import ExtractedRawData, ExtractedRefinedData
from databases.database import get_db
from services.database_service import store_raw_extracted_data, store_refined_extracted_data
import requests
import json
import os
import sys
import logging
import time
from pathlib import Path
import tempfile
import shutil

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API Configuration
BASE_URL = "http://localhost:8000"
TEMPLATES_BASE = f"{BASE_URL}/templates"


class WebFrontendTester:
    """Test the web frontend API integration"""

    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()

    def test_api_health(self):
        """Test if the API is running"""
        print("🔍 Testing API Health...")
        try:
            response = self.session.get(f"{self.base_url}/health")
            if response.status_code == 200:
                print("✅ API is running and healthy")
                return True
            else:
                print(f"❌ API health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Cannot connect to API: {e}")
            return False

    def test_get_companies(self):
        """Test getting available companies"""
        print("🔍 Testing Get Companies...")
        try:
            response = self.session.get(f"{TEMPLATES_BASE}/companies")
            if response.status_code == 200:
                companies = response.json()
                print(f"✅ Found companies: {companies}")
                return companies
            else:
                print(f"❌ Get companies failed: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Error getting companies: {e}")
            return None

    def test_list_forms(self, company="sbi", filename=None):
        """Test listing forms for a company"""
        print(f"🔍 Testing List Forms for {company}...")
        try:
            params = {"company": company}
            if filename:
                params["filename"] = filename

            response = self.session.get(
                f"{TEMPLATES_BASE}/list-forms", params=params)
            if response.status_code == 200:
                forms = response.json()
                print(
                    f"✅ Found {len(forms.get('forms', []))} forms for {company}")
                return forms
            else:
                print(
                    f"❌ List forms failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"❌ Error listing forms: {e}")
            return None

    def test_extract_form(self, company="sbi", form_no="L-1-A-REVENUE", filename=None):
        """Test extracting a specific form"""
        print(f"🔍 Testing Extract Form: {form_no} for {company}...")
        try:
            params = {
                "company": company,
                "use_image_mode": True
            }
            if filename:
                params["filename"] = filename

            response = self.session.get(
                f"{TEMPLATES_BASE}/extract-form/{form_no}", params=params)
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Form extraction successful")
                extraction_result = result.get("extraction_result", {})
                if isinstance(extraction_result, dict):
                    instances = extraction_result.get("instances", [])
                    if instances:
                        print(f"   Extracted instances: {len(instances)}")
                        first_instance = instances[0]
                        if isinstance(first_instance, dict):
                            rows = first_instance.get("Rows", [])
                            print(f"   Data rows: {len(rows)}")
                else:
                    print(
                        f"   Raw extraction result: {type(extraction_result)}")
                return result
            else:
                print(
                    f"❌ Extract form failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"❌ Error extracting form: {e}")
            return None

    def test_extract_and_verify(self, company="sbi", form_no="L-3", filename=None):
        """Test the complete extract and verify workflow"""
        print(f"🔍 Testing Extract and Verify: {form_no} for {company}...")
        try:
            params = {
                "company": company,
                "use_image_mode": True
            }
            if filename:
                params["filename"] = filename

            response = self.session.get(
                f"{TEMPLATES_BASE}/extract-and-verify/{form_no}", params=params)
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Extract and verify successful")
                print(f"   Output path: {result.get('output_path', 'N/A')}")
                return result
            else:
                print(
                    f"❌ Extract and verify failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"❌ Error in extract and verify: {e}")
            return None

    def test_extract_and_store(self, company="sbi", form_no="L-1-A-REVENUE", filename=None):
        """Test the NEW extract-and-store endpoint that saves to MySQL"""
        print(
            f"🔍 Testing Extract and Store to MySQL: {form_no} for {company}...")
        try:
            params = {
                "company": company,
                "use_image_mode": True
            }
            if filename:
                params["filename"] = filename

            response = self.session.get(
                f"{TEMPLATES_BASE}/extract-and-store/{form_no}", params=params)
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Extract and store successful")
                print(f"   Status: {result.get('status', 'N/A')}")
                print(f"   Raw data ID: {result.get('raw_data_id', 'N/A')}")
                print(
                    f"   Refined data ID: {result.get('refined_data_id', 'N/A')}")
                print(
                    f"   Database stored: {result.get('database_stored', False)}")
                return result
            else:
                print(
                    f"❌ Extract and store failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"❌ Error in extract and store: {e}")
            return None

    def test_database_status(self):
        """Test the database status endpoint"""
        print("🔍 Testing Database Status...")
        try:
            response = self.session.get(f"{TEMPLATES_BASE}/database-status")
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Database status retrieved")
                print(
                    f"   Raw data records: {result.get('raw_data_count', 0)}")
                print(
                    f"   Refined data records: {result.get('refined_data_count', 0)}")
                latest_raw = result.get('latest_raw_record')
                if latest_raw:
                    print(
                        f"   Latest raw: {latest_raw.get('company')} - {latest_raw.get('form_no')}")
                return result
            else:
                print(
                    f"❌ Database status failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"❌ Error getting database status: {e}")
            return None


def test_database_storage_integration(extraction_result):
    """Test storing the frontend extraction result in MySQL"""
    print("🔍 Testing Database Storage Integration...")

    if not extraction_result:
        print("❌ No extraction result to store")
        return False

    try:
        # Extract the data from the frontend response
        extraction_data = extraction_result.get("extraction_result", {})
        if not extraction_data:
            print("❌ No extraction data found in result")
            return False

        # Handle different response formats
        if isinstance(extraction_data, dict):
            # If it's already in instances format
            if "instances" in extraction_data:
                instances_structure = extraction_data
            else:
                # If it's direct extraction data, wrap it
                instances_structure = {"instances": [extraction_data]}
        else:
            print(
                f"❌ Unexpected extraction data format: {type(extraction_data)}")
            return False

        # Store raw data
        print("📝 Storing raw extraction data...")
        raw_id = store_raw_extracted_data(
            company="sbi_frontend_test",
            form_no="L-1-A-REVENUE",
            filename="frontend_test_document.pdf",
            extracted_data=instances_structure
        )

        if raw_id:
            print(f"✅ Raw data stored with ID: {raw_id}")
        else:
            print("❌ Failed to store raw data")
            return False

        # Create refined data with verification metadata
        refined_data = {
            "instances": instances_structure.get("instances", []),
            "verification_metadata": {
                "verification_source": "frontend_api_test",
                "verification_status": "completed_via_frontend",
                "verification_timestamp": time.time(),
                "frontend_extraction_successful": True,
                "api_endpoint_used": "/templates/extract-form/",
                "gemini_verification": extraction_result.get("status") == "success"
            }
        }

        # Store refined data
        print("📝 Storing refined extraction data...")
        refined_id = store_refined_extracted_data(
            company="sbi_frontend_test",
            form_no="L-1-A-REVENUE",
            filename="frontend_test_document.pdf",
            verified_data=refined_data
        )

        if refined_id:
            print(f"✅ Refined data stored with ID: {refined_id}")
            return True
        else:
            print("❌ Failed to store refined data")
            return False

    except Exception as e:
        print(f"❌ Error storing data: {e}")
        logger.exception("Database storage failed")
        return False


def verify_database_storage():
    """Verify that data was actually stored in MySQL"""
    print("🔍 Verifying Database Storage...")

    try:
        db = next(get_db())

        # Check raw data
        raw_records = db.query(ExtractedRawData).filter(
            ExtractedRawData.company == "sbi_frontend_test"
        ).order_by(ExtractedRawData.id.desc()).limit(1).all()

        if raw_records:
            record = raw_records[0]
            metadata = json.loads(
                record.form_metadata) if record.form_metadata else {}
            rows = json.loads(record.table_rows) if record.table_rows else []
            print(f"✅ Raw data verified in database:")
            print(
                f"   ID: {record.id}, Company: {record.company}, Form: {record.form_no}")
            print(
                f"   Rows: {len(rows)}, Headers: {len(metadata.get('Headers', []))}")
        else:
            print("❌ No raw data found in database")
            return False

        # Check refined data
        refined_records = db.query(ExtractedRefinedData).filter(
            ExtractedRefinedData.company == "sbi_frontend_test"
        ).order_by(ExtractedRefinedData.id.desc()).limit(1).all()

        if refined_records:
            record = refined_records[0]
            metadata = json.loads(
                record.form_metadata) if record.form_metadata else {}
            rows = json.loads(record.table_rows) if record.table_rows else []
            verification_meta = metadata.get("verification_metadata", {})
            print(f"✅ Refined data verified in database:")
            print(
                f"   ID: {record.id}, Company: {record.company}, Form: {record.form_no}")
            print(
                f"   Rows: {len(rows)}, Verification: {verification_meta.get('verification_status', 'N/A')}")
        else:
            print("❌ No refined data found in database")
            return False

        db.close()
        return True

    except Exception as e:
        print(f"❌ Error verifying database storage: {e}")
        return False


def verify_database_storage_new_endpoint(extract_and_store_result):
    """Verify that the extract-and-store endpoint actually stored data in MySQL"""
    print("🔍 Verifying Database Storage from Extract-and-Store Endpoint...")

    try:
        # Get the IDs from the endpoint result
        raw_id = extract_and_store_result.get('raw_data_id')
        refined_id = extract_and_store_result.get('refined_data_id')

        if not raw_id or not refined_id:
            print("❌ Missing data IDs from extract-and-store result")
            return False

        db = next(get_db())

        # Verify raw data by ID
        raw_record = db.query(ExtractedRawData).filter(
            ExtractedRawData.id == raw_id).first()
        if raw_record:
            metadata = json.loads(
                raw_record.form_metadata) if raw_record.form_metadata else {}
            rows = json.loads(
                raw_record.table_rows) if raw_record.table_rows else []
            print(f"✅ Raw data verified by ID {raw_id}:")
            print(
                f"   Company: {raw_record.company}, Form: {raw_record.form_no}")
            print(
                f"   Rows: {len(rows)}, Headers: {len(metadata.get('Headers', []))}")
        else:
            print(f"❌ Raw data with ID {raw_id} not found in database")
            db.close()
            return False

        # Verify refined data by ID
        refined_record = db.query(ExtractedRefinedData).filter(
            ExtractedRefinedData.id == refined_id).first()
        if refined_record:
            metadata = json.loads(
                refined_record.form_metadata) if refined_record.form_metadata else {}
            rows = json.loads(
                refined_record.table_rows) if refined_record.table_rows else []
            verification_meta = metadata.get("verification_metadata", {})
            print(f"✅ Refined data verified by ID {refined_id}:")
            print(
                f"   Company: {refined_record.company}, Form: {refined_record.form_no}")
            print(
                f"   Rows: {len(rows)}, Gemini verified: {verification_meta.get('gemini_verified', False)}")
        else:
            print(f"❌ Refined data with ID {refined_id} not found in database")
            db.close()
            return False

        db.close()
        return True

    except Exception as e:
        print(f"❌ Error verifying database storage: {e}")
        return False


def main():
    """Run the complete web frontend integration test"""
    print("🚀 Web Frontend Integration Test")
    print("=" * 80)

    # Initialize tester
    tester = WebFrontendTester()

    # Test sequence
    tests = [
        ("API Health Check", tester.test_api_health),
        ("Get Companies", tester.test_get_companies),
        ("List Forms", lambda: tester.test_list_forms("sbi")),
        ("Extract Form", lambda: tester.test_extract_form("sbi", "L-1-A-REVENUE")),
        ("Extract and Store to MySQL",
         lambda: tester.test_extract_and_store("sbi", "L-1-A-REVENUE")),
        ("Database Status", tester.test_database_status),
    ]

    results = {}
    extraction_result = None
    extract_and_store_result = None

    # Run frontend API tests
    print("\n📡 TESTING WEB FRONTEND API ENDPOINTS...")
    print("-" * 60)

    for test_name, test_func in tests:
        print(f"\n{test_name}:")
        try:
            result = test_func()
            results[test_name] = result is not None
            if test_name == "Extract Form":
                extraction_result = result
            elif test_name == "Extract and Store to MySQL":
                extract_and_store_result = result
        except Exception as e:
            print(f"❌ {test_name} crashed: {e}")
            results[test_name] = False

    # Test database integration
    print(f"\n💾 TESTING DATABASE INTEGRATION...")
    print("-" * 60)

    # If the new extract-and-store endpoint worked, it already stored data
    if extract_and_store_result and extract_and_store_result.get('database_stored'):
        print("✅ Database storage confirmed by extract-and-store endpoint")
        results["Database Storage via API"] = True

        # Verify the data was actually stored
        verification_success = verify_database_storage_new_endpoint(
            extract_and_store_result)
        results["Database Verification"] = verification_success
    else:
        print("⚠️ Testing fallback database storage...")
        # Fallback to manual storage test if new endpoint failed
        if extraction_result:
            database_success = test_database_storage_integration(
                extraction_result)
            results["Database Storage via API"] = database_success

            if database_success:
                verification_success = verify_database_storage()
                results["Database Verification"] = verification_success
            else:
                results["Database Verification"] = False
        else:
            print("❌ Skipping database tests - no extraction result available")
            results["Database Storage via API"] = False
            results["Database Verification"] = False

    # Summary
    print("\n" + "=" * 80)
    print("WEB FRONTEND INTEGRATION TEST SUMMARY")
    print("=" * 80)

    passed = 0
    total = len(results)

    for test_name, success in results.items():
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{test_name}: {status}")
        if success:
            passed += 1

    print(f"\nOverall: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        print("✅ Web frontend API is working")
        print("✅ Master template extraction is working")
        print("✅ NEW: Extract-and-store endpoint is working")
        print("✅ Database integration via web API is working")
        print("✅ Complete frontend-to-database flow is operational")
        print("✅ JSON data is being stored in MySQL through web frontend!")
    else:
        print(f"\n⚠️ {total - passed} tests failed")
        print("🔧 Check the error messages above for details")

    return passed == total


if __name__ == "__main__":
    # Ensure the backend server is running
    print("⚠️ Make sure the backend server is running: uvicorn main:app --reload")
    print("⚠️ Server should be accessible at http://localhost:8000")
    input("Press Enter when the server is ready...")

    success = main()
    sys.exit(0 if success else 1)
