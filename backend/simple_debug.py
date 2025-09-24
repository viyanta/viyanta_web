#!/usr/bin/env python3
"""
Simple debug script to test one failing case
"""

import requests
import json
import traceback


def main():
    # Test one failing case - Aditya Birla
    payload = {
        "company_name": "Aditya Birla Sun Life",
        "pdf_name": "Aditya Birla Life S FY2023 9M",
        "split_filename": "L-1-A-RA_1_5.pdf",
        "user_id": "debug_test"
    }

    endpoint = "http://localhost:8000/api/pdf-splitter/extract-form"

    try:
        print("🧪 Testing failing case:")
        print(f"Company: {payload['company_name']}")
        print(f"PDF: {payload['pdf_name']}")
        print(f"Split: {payload['split_filename']}")
        print()

        response = requests.post(endpoint, data=payload, timeout=30)

        print(f"Status Code: {response.status_code}")

        try:
            result = response.json()
            print(f"Response: {json.dumps(result, indent=2)}")
        except:
            print(f"Raw response: {response.text}")

    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()


if __name__ == "__main__":
    main()
