import requests
import os

# Test table extraction


def test_tables_api():
    url = "http://localhost:8000/api/upload_multi_files"

    # Test file path
    test_file_path = r"c:\Users\vicky\OneDrive\Desktop\Viyanta-project\viyanta_web\data\HDFC Life  S FY2023 9M - 3.pdf"

    if not os.path.exists(test_file_path):
        print(f"❌ Test file not found: {test_file_path}")
        return

    # Test data
    user_id = "test_user_tables"
    folder_name = "hdfc_tables_test"

    print(f"🧪 Testing table extraction with:")
    print(f"   User ID: {user_id}")
    print(f"   Folder: {folder_name}")
    print(f"   File: {os.path.basename(test_file_path)}")
    print(f"   Mode: tables")

    try:
        with open(test_file_path, 'rb') as f:
            files = {'files': (os.path.basename(
                test_file_path), f, 'application/pdf')}
            data = {
                'user_id': user_id,
                'folder_name': folder_name,
                'mode': 'tables'  # Table extraction
            }

            response = requests.post(url, files=files, data=data, timeout=120)

        if response.status_code == 200:
            result = response.json()
            print(f"✅ Upload successful!")
            print(f"   Status: {result.get('status')}")
            print(f"   Processing time: {result.get('total_time_ms')}ms")
            print(f"   Files processed: {result.get('processed_count')}")

            # Check for tables in the output
            outputs = result.get('outputs', [])
            if outputs:
                first_output = outputs[0]
                tables_found = first_output.get('tables_found', 0)
                print(f"   Tables found: {tables_found}")
                print(f"   S3 upload: {first_output.get('s3_upload', False)}")

                # Get JSON data to see table structure
                json_url = f"http://localhost:8000/api/user_json_data/{user_id}/{folder_name}/HDFC Life  S FY2023 9M - 3.json"
                json_response = requests.get(json_url)

                if json_response.status_code == 200:
                    json_data = json_response.json()
                    data = json_data.get('data', {})
                    pages = data.get('pages', [])

                    print(f"   JSON retrieved with {len(pages)} pages")

                    # Look for tables in pages
                    tables_count = 0
                    for page in pages:
                        page_tables = page.get('tables', [])
                        if page_tables:
                            print(
                                f"   Page {page['page_number']}: {len(page_tables)} tables")
                            for i, table in enumerate(page_tables):
                                if isinstance(table, dict) and 'headers' in table:
                                    print(
                                        f"     Table {i+1}: {len(table.get('headers', []))} columns, {table.get('total_rows', 0)} rows")
                                    tables_count += 1

                    print(f"   Total structured tables: {tables_count}")

        else:
            print(f"❌ Upload failed: {response.status_code}")
            print(f"   Error: {response.text}")

    except Exception as e:
        print(f"❌ Test failed: {str(e)}")


if __name__ == "__main__":
    test_tables_api()
