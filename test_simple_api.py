import requests
import os

# Test the new user-based upload API with multi-file endpoint (which allows mode selection)


def test_upload_api():
    url = "http://localhost:8000/api/upload_multi_files"

    # Test file path
    test_file_path = r"c:\Users\vicky\OneDrive\Desktop\Viyanta-project\viyanta_web\data\SBI-L1-form.pdf"

    if not os.path.exists(test_file_path):
        print(f"❌ Test file not found: {test_file_path}")
        return

    # Test data
    user_id = "test_user_456"
    folder_name = "test_folder_simple"

    print(f"🧪 Testing upload API with:")
    print(f"   User ID: {user_id}")
    print(f"   Folder: {folder_name}")
    print(f"   File: {os.path.basename(test_file_path)}")
    print(f"   Mode: text (fast)")

    try:
        with open(test_file_path, 'rb') as f:
            files = {'files': (os.path.basename(
                test_file_path), f, 'application/pdf')}
            data = {
                'user_id': user_id,
                'folder_name': folder_name,
                'mode': 'text'  # Text-only for speed
            }

            response = requests.post(url, files=files, data=data, timeout=60)

        if response.status_code == 200:
            result = response.json()
            print(f"✅ Upload successful!")
            print(f"   Status: {result.get('status')}")
            print(f"   Processing time: {result.get('total_time_ms')}ms")
            print(f"   Files processed: {result.get('processed_count')}")
            print(f"   S3 uploads: {result.get('s3_uploads_successful')}")

            # Test getting user folders
            folders_url = f"http://localhost:8000/api/user_folders/{user_id}"
            folders_response = requests.get(folders_url)

            if folders_response.status_code == 200:
                folders_data = folders_response.json()
                print(f"✅ User folders retrieved:")
                print(f"   Total folders: {folders_data.get('total_folders')}")
                for folder in folders_data.get('folders', []):
                    print(
                        f"   - {folder['folder_name']}: {folder['pdf_count']} PDFs, {folder['json_count']} JSONs")

                # Test getting folder files
                files_url = f"http://localhost:8000/api/user_folder_files/{user_id}/{folder_name}"
                files_response = requests.get(files_url)

                if files_response.status_code == 200:
                    files_data = files_response.json()
                    print(f"✅ Folder files retrieved:")
                    print(f"   Total files: {files_data.get('total_files')}")
                    for file_info in files_data.get('files', []):
                        print(
                            f"   - {file_info['filename']}: {file_info['size']} bytes, has_json: {file_info['has_json']}")

        else:
            print(f"❌ Upload failed: {response.status_code}")
            print(f"   Error: {response.text}")

    except Exception as e:
        print(f"❌ Test failed: {str(e)}")


if __name__ == "__main__":
    test_upload_api()
