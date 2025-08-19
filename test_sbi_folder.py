#!/usr/bin/env python3
"""
Test script to benchmark the optimized folder uploader with SBI Life PDFs
Target: 12-15 PDFs with 130-150 pages each in 2 minutes total
"""
import requests
import os
import time
import glob


def test_optimized_folder_upload():
    """Test the optimized folder uploader with SBI Life PDFs"""

    # API endpoint for table extraction
    url = "http://localhost:8000/api/folder_uploader/with_tables"

    # Find SBI Life PDFs
    sbi_folder = "data/SBI Life"
    if not os.path.exists(sbi_folder):
        print(f"❌ SBI Life folder not found: {sbi_folder}")
        print("Available folders in data/:")
        if os.path.exists("data"):
            for item in os.listdir("data"):
                if os.path.isdir(os.path.join("data", item)):
                    print(f"  📁 {item}")
        return

    # Get all PDF files in SBI Life folder
    pdf_files = glob.glob(os.path.join(sbi_folder, "*.pdf"))

    if not pdf_files:
        print(f"❌ No PDF files found in {sbi_folder}")
        return

    print(f"🚀 Found {len(pdf_files)} PDF files in SBI Life folder:")
    total_size = 0
    for pdf_file in pdf_files:
        size_mb = os.path.getsize(pdf_file) / (1024*1024)
        total_size += size_mb
        print(f"  📄 {os.path.basename(pdf_file)} - {size_mb:.2f} MB")

    print(f"📊 Total size: {total_size:.2f} MB")
    print(f"🎯 Target: Complete extraction in < 2 minutes")

    # Prepare files for upload
    files = []
    for pdf_file in pdf_files:
        files.append(('files', (os.path.basename(pdf_file),
                     open(pdf_file, 'rb'), 'application/pdf')))

    try:
        print(f"\\n🚀 Starting OPTIMIZED folder upload with table extraction...")
        start_time = time.time()

        response = requests.post(url, files=files)

        # Close all file handles
        for file_tuple in files:
            file_tuple[1][1].close()

        end_time = time.time()
        total_time = end_time - start_time

        if response.status_code == 200:
            result = response.json()
            print(f"\\n✅ Upload successful!")
            print(f"   Status: {result.get('status')}")
            print(f"   Processed count: {result.get('processed_count')}")
            print(
                f"   Total time: {total_time:.2f}s ({total_time/60:.2f} minutes)")
            print(
                f"   Server reported time: {result.get('total_time_ms', 0)/1000:.2f}s")
            print(f"   Extraction mode: {result.get('extraction_mode')}")
            print(f"   Workers: {result.get('workers')}")
            print(f"   Pages per second: {result.get('pages_per_second', 0)}")

            # Performance analysis
            if total_time <= 120:  # 2 minutes
                print(
                    f"   🎉 TARGET MET: Completed in {total_time:.1f}s (< 2 minutes) ✅")
            else:
                print(
                    f"   ⚠️ TARGET MISSED: Took {total_time:.1f}s (> 2 minutes) ❌")

            # Check outputs for table data
            outputs = result.get('outputs', [])
            if outputs:
                print(f"\\n📊 Checking table extraction results:")
                tables_found = 0
                for i, output in enumerate(outputs[:3]):  # Check first 3 files
                    pdf_name = output.get('pdf_name')
                    processing_time = output.get(
                        'processing_time_ms', 0) / 1000
                    print(f"   📄 {pdf_name}: {processing_time:.1f}s")

                    # Check if JSON file has table data
                    json_path = output.get('output_json')
                    if json_path:
                        full_json_path = os.path.join('backend', json_path)
                        if os.path.exists(full_json_path):
                            try:
                                import json
                                with open(full_json_path, 'r', encoding='utf-8') as f:
                                    json_data = json.load(f)

                                pages = json_data.get('pages', [])
                                file_tables = 0
                                for page in pages:
                                    tables = page.get('tables', [])
                                    file_tables += len(tables)

                                tables_found += file_tables
                                print(f"      📋 Tables: {file_tables}")

                                if file_tables > 0:
                                    print(f"      ✅ Table extraction working!")
                                else:
                                    print(f"      ❌ No tables found!")

                            except Exception as e:
                                print(f"      ❌ Error reading JSON: {e}")

                print(
                    f"\\n📋 Total tables found across all files: {tables_found}")
                if tables_found > 0:
                    print(f"   ✅ Table extraction is working correctly!")
                else:
                    print(f"   ❌ Table extraction may have issues!")

        else:
            print(f"❌ Upload failed with status {response.status_code}")
            print(f"   Response: {response.text}")

    except Exception as e:
        print(f"❌ Error during upload: {e}")


if __name__ == "__main__":
    test_optimized_folder_upload()
