#!/usr/bin/env python3
"""
Test script for the new all users data API endpoints
"""

import requests
import json

BASE_URL = "http://localhost:8000/api"


def test_all_users_data():
    """Test the all users data endpoint"""
    print("🧪 Testing all users data API...")

    try:
        # Test getting all users data
        response = requests.get(f"{BASE_URL}/all_users_data")

        if response.status_code == 200:
            data = response.json()
            print("✅ All users data retrieved successfully!")
            print(f"   Total users: {data.get('total_users', 0)}")

            users_data = data.get('users_data', {})
            for user_id, user_info in users_data.items():
                print(
                    f"   - User {user_id}: {user_info.get('total_folders', 0)} folders")
                for folder in user_info.get('folders', []):
                    print(
                        f"     └── {folder['folder_name']}: {folder['pdf_count']} PDFs, {folder['json_count']} JSONs")

            # Test getting files from first user's first folder if available
            if users_data:
                first_user = list(users_data.keys())[0]
                first_folder = users_data[first_user]['folders'][0]['folder_name'] if users_data[first_user]['folders'] else None

                if first_folder:
                    print(
                        f"\n🧪 Testing folder files for user {first_user}, folder {first_folder}...")
                    files_response = requests.get(
                        f"{BASE_URL}/all_users_files/{first_user}/{first_folder}")

                    if files_response.status_code == 200:
                        files_data = files_response.json()
                        print("✅ Folder files retrieved successfully!")
                        print(
                            f"   Total files: {files_data.get('total_files', 0)}")

                        for file_info in files_data.get('files', []):
                            print(
                                f"   - {file_info['filename']}: {file_info['size']} bytes, JSON: {file_info['has_json']}")
                    else:
                        print(
                            f"❌ Failed to get folder files: {files_response.status_code}")

        else:
            print(f"❌ Failed to get all users data: {response.status_code}")
            print(f"   Response: {response.text}")

    except Exception as e:
        print(f"❌ Error testing all users data API: {e}")


if __name__ == "__main__":
    test_all_users_data()
