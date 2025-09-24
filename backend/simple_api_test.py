#!/usr/bin/env python3
"""
Simple API test with better error reporting
"""

import requests
import json


def test_api_with_error_details():
    endpoint = "http://localhost:8000/api/pdf-splitter/extract-form"

    payload = {
        "company_name": "Aditya Birla Sun Life",
        "pdf_name": "Aditya Birla Life S FY2023 9M",
        "split_filename": "L-1-A-RA_1_5.pdf",
        "user_id": "debug_test"
    }

    print("🧪 API ERROR DEBUGGING")
    print("=" * 40)
    print(f"Payload: {json.dumps(payload, indent=2)}")

    try:
        print("\n🚀 Sending request...")
        response = requests.post(
            endpoint,
            data=payload,
            timeout=30
        )

        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")

        if response.status_code == 200:
            print("✅ SUCCESS!")
            data = response.json()
            print(f"Response keys: {list(data.keys())}")
        else:
            print("❌ FAILED!")
            print(
                f"Response content type: {response.headers.get('content-type', 'unknown')}")
            print(f"Response length: {len(response.text)}")

            try:
                error_data = response.json()
                print(f"Error JSON: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Raw response text: {response.text}")

    except Exception as e:
        print(f"❌ Request failed: {e}")


if __name__ == "__main__":
    test_api_with_error_details()
