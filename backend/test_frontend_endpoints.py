#!/usr/bin/env python3
"""
Test the frontend endpoints
"""

import requests
import json


def test_frontend_endpoints():
    base_url = 'http://localhost:8000/api'

    # Test 1: Get all users data
    print("1. Testing get all users data...")
    try:
        response = requests.get(f"{base_url}/all_users_data")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {data.get('total_users', 0)} users")
            users_data = data.get('users_data', {})
            if 'default_user' in users_data:
                print("✅ default_user found")
            else:
                print("❌ default_user not found")
        else:
            print(f"❌ Error: {response.text[:100]}")
    except Exception as e:
        print(f"❌ Error: {e}")

    print()

    # Test 2: Get folder files for default_user/30
    print("2. Testing get folder files...")
    try:
        response = requests.get(f"{base_url}/all_users_files/default_user/30")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            files = data.get('files', [])
            print(f"✅ Found {len(files)} files in folder 30")
            for file in files:
                base_name = file.get('base_name', 'unknown')
                has_gemini = file.get('has_gemini_verification', False)
                print(f"  - {base_name} (Gemini: {has_gemini})")
        else:
            print(f"❌ Error: {response.text[:100]}")
    except Exception as e:
        print(f"❌ Error: {e}")

    print()

    # Test 3: Get JSON data for specific file
    print("3. Testing get JSON data...")
    try:
        response = requests.get(
            f"{base_url}/all_users_json_data/default_user/30/SBI Life  S FY2025 HY")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            verification_status = data.get('verification_status', 'unknown')
            print(f"✅ Verification status: {verification_status}")

            result_data = data.get('data', {})
            if 'corrected_data' in result_data:
                corrected = result_data['corrected_data']
                pages = corrected.get('pages', [])
                total_tables = sum(len(page.get('tables', []))
                                   for page in pages)
                print(f"✅ Pages: {len(pages)}, Tables: {total_tables}")
            else:
                print("❌ No corrected_data found")
        else:
            print(f"❌ Error: {response.text[:100]}")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    test_frontend_endpoints()
