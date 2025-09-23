#!/usr/bin/env python3

import requests
import json


def test_single_api_call():
    """Test a single API call with verbose debugging"""

    url = "http://localhost:8000/api/pdf-splitter/extract-form"

    # Test one of the failing cases
    data = {
        "company_name": "Aditya Birla Sun Life",
        "pdf_name": "Aditya Birla Life S FY2023 9M",
        "split_filename": "L-1-A-RA_1_5.pdf",
        "user_id": "test_user"
    }

    print(f"🚀 Making API call to: {url}")
    print(f"📊 Data: {json.dumps(data, indent=2)}")

    try:
        response = requests.post(url, data=data, timeout=30)
        print(f"📊 Status Code: {response.status_code}")
        print(f"📊 Response Headers: {dict(response.headers)}")

        if response.status_code == 200:
            print("✅ SUCCESS!")
            result = response.json()
            print(f"📈 Result: {json.dumps(result, indent=2)}")
        else:
            print("❌ FAILED!")
            try:
                error_data = response.json()
                print(f"💥 Error Response: {json.dumps(error_data, indent=2)}")
            except:
                print(f"💥 Raw Error: {response.text}")

    except Exception as e:
        print(f"💥 Exception: {str(e)}")


if __name__ == "__main__":
    test_single_api_call()
