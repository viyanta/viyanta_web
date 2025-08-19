#!/usr/bin/env python3
"""
Test script for the 4 new upload modes implementation
Tests all endpoints and S3 integration
"""

import requests
import json
import os
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:8000"
TEST_FOLDER = "test_uploads"


def test_single_instant():
    """Test single instant upload mode"""
    print("🧪 Testing Single Instant Upload...")

    # Find a test PDF
    pdf_path = Path("data/HDFC Life  S FY2023 9M - 3.pdf")
    if not pdf_path.exists():
        print("❌ Test PDF not found")
        return False

    try:
        with open(pdf_path, 'rb') as f:
            files = {'file': f}
            data = {
                'mode': 'text',
                'folder_name': f'{TEST_FOLDER}_single'
            }

            response = requests.post(
                f"{BASE_URL}/upload_single_instant",
                files=files,
                data=data,
                timeout=60
            )

        if response.status_code == 200:
            result = response.json()
            print(
                f"✅ Single upload successful: {result.get('message', 'Success')}")
            return True
        else:
            print(
                f"❌ Single upload failed: {response.status_code} - {response.text}")
            return False

    except Exception as e:
        print(f"❌ Single upload error: {e}")
        return False


def test_multi_files():
    """Test multi-file upload mode"""
    print("🧪 Testing Multi-File Upload...")

    # Find test PDFs
    pdf_files = list(Path("data").glob("*.pdf"))[:2]  # Take first 2 PDFs
    if len(pdf_files) < 2:
        print("❌ Need at least 2 test PDFs")
        return False

    try:
        files = []
        for i, pdf_path in enumerate(pdf_files):
            files.append(('files', open(pdf_path, 'rb')))

        data = {
            'mode': 'tables',
            'folder_name': f'{TEST_FOLDER}_multi'
        }

        response = requests.post(
            f"{BASE_URL}/upload_multi_files",
            files=files,
            data=data,
            timeout=120
        )

        # Close files
        for _, f in files:
            f.close()

        if response.status_code == 200:
            result = response.json()
            print(
                f"✅ Multi upload successful: {result.get('message', 'Success')}")
            return True
        else:
            print(
                f"❌ Multi upload failed: {response.status_code} - {response.text}")
            return False

    except Exception as e:
        print(f"❌ Multi upload error: {e}")
        return False


def test_folder_tables():
    """Test folder tables upload mode"""
    print("🧪 Testing Folder Tables Upload...")

    # Create a folder structure for testing
    test_folder = Path("temp_test_folder")
    test_folder.mkdir(exist_ok=True)

    # Copy test PDFs to folder
    pdf_files = list(Path("data").glob("*.pdf"))[:2]
    for pdf_path in pdf_files:
        import shutil
        shutil.copy(pdf_path, test_folder / pdf_path.name)

    try:
        files = []
        for pdf_path in test_folder.glob("*.pdf"):
            # Simulate webkitRelativePath structure
            relative_path = f"{test_folder.name}/{pdf_path.name}"
            files.append(
                ('files', (relative_path, open(pdf_path, 'rb'), 'application/pdf')))

        data = {
            'folder_name': f'{TEST_FOLDER}_folder_tables'
        }

        response = requests.post(
            f"{BASE_URL}/upload_folder_tables",
            files=files,
            data=data,
            timeout=180
        )

        # Close files
        for _, file_data in files:
            if hasattr(file_data, 'close'):
                file_data.close()
            elif hasattr(file_data[1], 'close'):
                file_data[1].close()

        # Cleanup
        import shutil
        shutil.rmtree(test_folder)

        if response.status_code == 200:
            result = response.json()
            print(
                f"✅ Folder tables upload successful: {result.get('message', 'Success')}")
            return True
        else:
            print(
                f"❌ Folder tables upload failed: {response.status_code} - {response.text}")
            return False

    except Exception as e:
        print(f"❌ Folder tables upload error: {e}")
        # Cleanup on error
        if test_folder.exists():
            import shutil
            shutil.rmtree(test_folder)
        return False


def test_folder_text():
    """Test folder text upload mode"""
    print("🧪 Testing Folder Text Upload...")

    # Create a folder structure for testing
    test_folder = Path("temp_test_folder_text")
    test_folder.mkdir(exist_ok=True)

    # Copy test PDFs to folder
    pdf_files = list(Path("data").glob("*.pdf"))[:2]
    for pdf_path in pdf_files:
        import shutil
        shutil.copy(pdf_path, test_folder / pdf_path.name)

    try:
        files = []
        for pdf_path in test_folder.glob("*.pdf"):
            # Simulate webkitRelativePath structure
            relative_path = f"{test_folder.name}/{pdf_path.name}"
            files.append(
                ('files', (relative_path, open(pdf_path, 'rb'), 'application/pdf')))

        data = {
            'folder_name': f'{TEST_FOLDER}_folder_text'
        }

        response = requests.post(
            f"{BASE_URL}/upload_folder_text",
            files=files,
            data=data,
            timeout=180
        )

        # Close files
        for _, file_data in files:
            if hasattr(file_data, 'close'):
                file_data.close()
            elif hasattr(file_data[1], 'close'):
                file_data[1].close()

        # Cleanup
        import shutil
        shutil.rmtree(test_folder)

        if response.status_code == 200:
            result = response.json()
            print(
                f"✅ Folder text upload successful: {result.get('message', 'Success')}")
            return True
        else:
            print(
                f"❌ Folder text upload failed: {response.status_code} - {response.text}")
            return False

    except Exception as e:
        print(f"❌ Folder text upload error: {e}")
        # Cleanup on error
        if test_folder.exists():
            import shutil
            shutil.rmtree(test_folder)
        return False


def test_uploaded_files():
    """Test the grouped uploaded files endpoint"""
    print("🧪 Testing Uploaded Files Endpoint...")

    try:
        response = requests.get(f"{BASE_URL}/uploaded-files")

        if response.status_code == 200:
            result = response.json()
            folders = result.get('folders', {})
            print(
                f"✅ Uploaded files endpoint successful: {len(folders)} folders found")

            # Print folder structure
            for folder_name, folder_data in folders.items():
                print(f"  📁 {folder_name}: {len(folder_data['files'])} files")
                for file in folder_data['files'][:2]:  # Show first 2 files
                    print(
                        f"    📄 {file['name']} ({file.get('mode', 'unknown')})")
                if len(folder_data['files']) > 2:
                    print(
                        f"    ... and {len(folder_data['files']) - 2} more files")

            return True
        else:
            print(
                f"❌ Uploaded files endpoint failed: {response.status_code} - {response.text}")
            return False

    except Exception as e:
        print(f"❌ Uploaded files endpoint error: {e}")
        return False


def main():
    """Run all tests"""
    print("🚀 Starting 4 Upload Modes Test Suite")
    print("=" * 50)

    # Check if backend is running
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code != 200:
            print("❌ Backend not responding correctly")
            return
    except:
        print("❌ Backend not running. Please start the backend server first.")
        print("Run: cd backend && python -m uvicorn main:app --reload")
        return

    print("✅ Backend is running")
    print()

    # Run tests
    tests = [
        test_single_instant,
        test_multi_files,
        test_folder_tables,
        test_folder_text,
        test_uploaded_files
    ]

    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
            print()
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            results.append(False)
            print()

    # Summary
    print("=" * 50)
    print("📋 Test Results Summary:")
    print(f"✅ Passed: {sum(results)}/{len(results)}")
    print(f"❌ Failed: {len(results) - sum(results)}/{len(results)}")

    if all(results):
        print("🎉 All tests passed! 4 upload modes are working correctly.")
    else:
        print("⚠️ Some tests failed. Check the output above for details.")


if __name__ == "__main__":
    main()
