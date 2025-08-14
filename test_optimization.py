#!/usr/bin/env python3
"""
OPTIMIZATION TEST: Benchmark the optimized table extraction for 4-minute target
"""
import requests
import os
import time

def test_optimized_folder_upload_with_tables():
    """Test the optimized folder uploader with table extraction for speed"""
    
    # API endpoint for optimized table extraction
    url = "http://localhost:8000/api/folder_uploader/with_tables"
    
    # Test with multiple PDFs to simulate real workload
    test_files = [
        "data/HDFC Life  S FY2023 9M - 3.pdf",
        "data/SBI-L1-form.pdf"
    ]
    
    # Filter existing files
    existing_files = []
    for pdf_path in test_files:
        if os.path.exists(pdf_path):
            existing_files.append(pdf_path)
            print(f"✅ Found: {pdf_path} ({os.path.getsize(pdf_path) / (1024*1024):.2f} MB)")
        else:
            print(f"❌ Missing: {pdf_path}")
    
    if not existing_files:
        print("❌ No test files found!")
        return
    
    # Prepare files for upload
    files = []
    for pdf_path in existing_files:
        files.append(('files', (os.path.basename(pdf_path), open(pdf_path, 'rb'), 'application/pdf')))
    
    try:
        print(f"\n🚀 OPTIMIZATION TEST: {len(existing_files)} PDFs with FAST table extraction")
        print(f"   Target: Complete in <4 minutes")
        print(f"   Total size: {sum(os.path.getsize(f) for f in existing_files) / (1024*1024):.2f} MB")
        
        start_time = time.time()
        response = requests.post(url, files=files)
        end_time = time.time()
        
        # Close all files
        for file_tuple in files:
            file_tuple[1][1].close()
        
        processing_time = end_time - start_time
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ OPTIMIZATION SUCCESS!")
            print(f"   Status: {result.get('status')}")
            print(f"   Processed: {result.get('processed_count')} PDFs")
            print(f"   Total time: {processing_time:.2f}s ({processing_time/60:.2f} minutes)")
            print(f"   Server time: {result.get('total_time_ms', 0)/1000:.2f}s")
            print(f"   Extraction mode: {result.get('extraction_mode')}")
            print(f"   Workers used: {result.get('workers')}")
            print(f"   Pages/second: {result.get('pages_per_second', 0)}")
            print(f"   Total pages: {result.get('total_pages', 0)}")
            
            # Check 4-minute target
            target_met = processing_time < 240  # 4 minutes = 240 seconds
            print(f"\n🎯 4-MINUTE TARGET: {'✅ MET' if target_met else '❌ MISSED'}")
            if not target_met:
                print(f"   Exceeded by: {(processing_time - 240)/60:.2f} minutes")
            
            # Analyze individual outputs
            outputs = result.get('outputs', [])
            if outputs:
                print(f"\n📊 Individual PDF Results:")
                for i, output in enumerate(outputs, 1):
                    pdf_name = output.get('pdf_name', f'PDF {i}')
                    pages = output.get('pages', 0)
                    proc_time = output.get('processing_time_ms', 0) / 1000
                    table_workers = output.get('table_workers', 0)
                    
                    print(f"   {i}. {pdf_name}")
                    print(f"      Pages: {pages} | Time: {proc_time:.2f}s | Table workers: {table_workers}")
                    
                    # Check if tables were extracted
                    json_path = output.get('output_json')
                    if json_path:
                        full_json_path = os.path.join('backend', json_path)
                        if os.path.exists(full_json_path):
                            import json
                            try:
                                with open(full_json_path, 'r', encoding='utf-8') as f:
                                    json_data = json.load(f)
                                
                                pages_data = json_data.get('pages', [])
                                table_count = sum(len(page.get('tables', [])) for page in pages_data)
                                print(f"      Tables extracted: {table_count} ✅")
                                
                            except Exception as e:
                                print(f"      Error reading JSON: {e}")
                        else:
                            print(f"      JSON file not found")
            
            # Performance analysis
            if result.get('total_pages', 0) > 0:
                pages_per_minute = result.get('total_pages', 0) / (processing_time / 60)
                print(f"\n📈 Performance Metrics:")
                print(f"   Pages per minute: {pages_per_minute:.1f}")
                print(f"   Seconds per page: {processing_time / result.get('total_pages', 1):.2f}")
                
                # Estimate scalability
                estimated_100_pages = (100 / pages_per_minute) * 60  # seconds for 100 pages
                print(f"   Estimated time for 100 pages: {estimated_100_pages/60:.2f} minutes")
            
        else:
            print(f"❌ OPTIMIZATION FAILED: HTTP {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error during optimization test: {e}")

if __name__ == "__main__":
    test_optimized_folder_upload_with_tables()
