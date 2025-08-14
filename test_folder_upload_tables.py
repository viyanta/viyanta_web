#!/usr/bin/env python3
"""
Test script to verify folder uploader with table extraction
"""
import requests
import os


def test_folder_upload_with_tables():
    """Test the folder uploader endpoint with table extraction enabled"""

    # API endpoint
    url = "http://localhost:8000/api/folder_uploader/with_tables"

    # Path to the HDFC PDF
    pdf_path = "data/SBI Life"

    if not os.path.exists(pdf_path):
        print(f"❌ PDF file not found: {pdf_path}")
        return

    # Prepare files for upload
    files = [
        ('files', ('HDFC Life  S FY2023 9M - 3.pdf',
         open(pdf_path, 'rb'), 'application/pdf'))
    ]

    try:
        print(f"🚀 Testing folder upload with tables for: {pdf_path}")
        print(
            f"   File size: {os.path.getsize(pdf_path) / (1024*1024):.2f} MB")

        response = requests.post(url, files=files)

        # Close the file
        files[0][1][1].close()

        if response.status_code == 200:
            result = response.json()
            print(f"✅ Upload successful!")
            print(f"   Status: {result.get('status')}")
            print(f"   Processed count: {result.get('processed_count')}")
            print(f"   Total time: {result.get('total_time_ms', 0)/1000:.2f}s")
            print(f"   Extraction mode: {result.get('extraction_mode')}")
            print(f"   Workers: {result.get('workers')}")

            # Check the outputs
            outputs = result.get('outputs', [])
            if outputs:
                first_output = outputs[0]
                print(f"\n📊 First output details:")
                print(f"   PDF name: {first_output.get('pdf_name')}")
                print(f"   Pages: {first_output.get('pages')}")
                print(
                    f"   Processing time: {first_output.get('processing_time_ms', 0)}ms")
                print(f"   Output JSON: {first_output.get('output_json')}")
                print(f"   Table workers: {first_output.get('table_workers')}")

                # Check if the JSON file was created and has table data
                json_path = first_output.get('output_json')
                if json_path:
                    full_json_path = os.path.join('backend', json_path)
                    if os.path.exists(full_json_path):
                        print(f"   JSON file exists: ✅")
                        # Check file size
                        json_size = os.path.getsize(full_json_path)
                        print(f"   JSON file size: {json_size:,} bytes")

                        # Check if it contains table data
                        import json
                        try:
                            with open(full_json_path, 'r', encoding='utf-8') as f:
                                json_data = json.load(f)

                            pages = json_data.get('pages', [])
                            table_count = 0
                            for page in pages:
                                tables = page.get('tables', [])
                                table_count += len(tables)

                            print(f"   Total tables found: {table_count}")

                            if table_count > 0:
                                print(f"   ✅ Tables were successfully extracted!")
                                # Show first table info
                                for page in pages:
                                    if page.get('tables'):
                                        first_table = page['tables'][0]
                                        print(
                                            f"   First table shape: {len(first_table)} rows x {len(first_table[0]) if first_table else 0} cols")
                                        break
                            else:
                                print(f"   ❌ No tables found in JSON!")

                        except Exception as e:
                            print(f"   ❌ Error reading JSON: {e}")
                    else:
                        print(f"   ❌ JSON file not found: {full_json_path}")

        else:
            print(f"❌ Upload failed with status {response.status_code}")
            print(f"   Response: {response.text}")

    except Exception as e:
        print(f"❌ Error during upload: {e}")


if __name__ == "__main__":
    test_folder_upload_with_tables()
