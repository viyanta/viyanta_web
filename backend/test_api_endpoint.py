#!/usr/bin/env python3
"""
Test script to verify the API endpoint for loading JSON data
"""

import requests
import json


def test_api_endpoint():
    url = 'http://localhost:8000/api/all_users_json_data/default_user/30/SBI Life  S FY2025 HY'

    try:
        print("Testing API endpoint...")
        response = requests.get(url, timeout=10)
        print(f"Status code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("✅ API Response Success")
            print(
                f"Verification status: {data.get('verification_status', 'unknown')}")

            result_data = data.get('data', {})
            print(f"Data keys: {list(result_data.keys())}")

            if 'corrected_data' in result_data:
                corrected = result_data['corrected_data']
                pages = corrected.get('pages', [])
                total_tables = sum(len(page.get('tables', []))
                                   for page in pages)
                print(f"📄 Pages: {len(pages)}")
                print(f"📊 Tables: {total_tables}")
                print("✨ Data structure: Gemini verified with corrected_data")

                # Show sample table data
                if total_tables > 0:
                    for page in pages:
                        if page.get('tables'):
                            table = page['tables'][0]
                            headers = table.get('headers', [])
                            print(f"Sample table headers: {headers[:3]}")
                            break
            else:
                pages = result_data.get('pages', [])
                total_tables = sum(len(page.get('tables', []))
                                   for page in pages)
                print(f"📄 Pages: {len(pages)}")
                print(f"📊 Tables: {total_tables}")
                print("✨ Data structure: Direct pages")

        else:
            print(f"❌ API Error: {response.status_code}")
            print(response.text[:200])

    except requests.exceptions.RequestException as e:
        print(f"❌ Request error: {e}")
    except Exception as e:
        print(f"❌ Other error: {e}")


if __name__ == "__main__":
    test_api_endpoint()
