#!/usr/bin/env python3
"""
Test script to verify S3 data fetching
"""

import os
import sys
import json

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))


def test_s3_data_fetching():
    """Test if S3 service can fetch user data correctly"""
    try:
        from services.s3_service import s3_service
        print("✅ S3 service imported successfully")

        # Test the list_all_users_data function
        result = s3_service.list_all_users_data()

        print(f"📊 Total users found: {result.get('total_users', 0)}")
        print(f"🔍 S3 Debug Info:")
        s3_debug = result.get('s3_debug', {})
        for key, value in s3_debug.items():
            print(f"   {key}: {value}")

        users_data = result.get('users_data', {})
        if users_data:
            print(f"\n👥 Users found:")
            for user_id, user_info in users_data.items():
                folders_count = len(user_info.get('folders', []))
                print(f"   User: {user_id} - {folders_count} folders")

                # Show folder details for first user
                if user_info.get('folders'):
                    print(f"      Folders:")
                    for folder in user_info['folders'][:3]:  # Show first 3 folders
                        print(
                            f"        - {folder.get('folder_name')}: {folder.get('pdf_count')} PDFs, {folder.get('json_count')} JSONs")
        else:
            print("❌ No users data found")

        return result.get('success', False)

    except Exception as e:
        print(f"❌ Error testing S3 data fetching: {e}")
        return False


if __name__ == "__main__":
    print("🧪 Testing S3 Data Fetching")
    print("=" * 50)
    success = test_s3_data_fetching()
    print(f"\n📋 Test Result: {'✅ SUCCESS' if success else '❌ FAILED'}")
