#!/usr/bin/env python3
"""
Debug a specific failing extraction case
"""

import requests
import json
import time


def test_single_case():
    """Test one specific failing case"""

    # Test Aditya Birla Sun Life L-1-A-RA (which is failing)
    company_name = "Aditya Birla Sun Life"
    pdf_name = "Aditya Birla Life S FY2023 9M"
    split_filename = "L-1-A-RA_1_5.pdf"

    print("🧪 SINGLE CASE DEBUG TEST")
    print("=" * 50)
    print(f"Company: {company_name}")
    print(f"PDF: {pdf_name}")
    print(f"Split: {split_filename}")

    # Check if files exist
    from pathlib import Path

    # Check split file
    split_path = Path("pdf_splits") / "aditya_birla_sun_life" / \
        pdf_name / split_filename
    print(f"\n📄 Split file: {split_path}")
    print(f"   Exists: {split_path.exists()}")
    if split_path.exists():
        print(f"   Size: {split_path.stat().st_size} bytes")

    # Check template
    template_path = Path("templates") / \
        "aditya birla sun life" / "L-1-A-RA.json"
    print(f"\n📋 Template file: {template_path}")
    print(f"   Exists: {template_path.exists()}")

    if template_path.exists():
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                template = json.load(f)
            print(f"   ✅ Template loads successfully")
            print(f"   Form No: {template.get('Form No', 'MISSING')}")
            print(f"   Has Headers: {'Headers' in template}")
            print(f"   Has FlatHeaders: {'FlatHeaders' in template}")

            if 'FlatHeaders' in template:
                flat_headers = template['FlatHeaders']
                print(f"   FlatHeaders count: {len(flat_headers)}")
                print(f"   First few headers: {flat_headers[:5]}")
        except Exception as e:
            print(f"   ❌ Template error: {e}")

    # Try direct extraction (bypass API)
    print(f"\n🔧 Testing direct extraction...")
    try:
        import subprocess
        import sys

        output_file = "debug_aditya_extraction.json"

        extraction_cmd = [
            sys.executable,
            "services/pdf_splitted_extraction.py",
            "--template", str(template_path),
            "--pdf", str(split_path),
            "--output", output_file
        ]

        print(f"Command: {' '.join(extraction_cmd)}")

        result = subprocess.run(
            extraction_cmd,
            capture_output=True,
            text=True,
            timeout=60
        )

        print(f"Return code: {result.returncode}")
        print(f"STDOUT: {result.stdout[:500]}...")
        if result.stderr:
            print(f"STDERR: {result.stderr[:500]}...")

        if result.returncode == 0:
            output_path = Path(output_file)
            if output_path.exists():
                with open(output_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                if isinstance(data, list):
                    total_rows = sum(len(page.get('Rows', []))
                                     for page in data)
                    print(f"✅ Direct extraction succeeded: {total_rows} rows")
                else:
                    rows = data.get('Rows', [])
                    print(f"✅ Direct extraction succeeded: {len(rows)} rows")
            else:
                print(f"❌ Output file not created")
        else:
            print(f"❌ Direct extraction failed")

    except Exception as e:
        print(f"❌ Direct extraction error: {e}")

    # Try API
    print(f"\n🌐 Testing API...")
    endpoint = "http://localhost:8000/api/pdf-splitter/extract-form"

    payload = {
        "company_name": company_name,
        "pdf_name": pdf_name,
        "split_filename": split_filename,
        "user_id": "debug_test"
    }

    try:
        response = requests.post(
            endpoint,
            data=payload,
            timeout=30
        )

        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            print(f"✅ API succeeded")
        else:
            print(f"❌ API failed")
            try:
                error = response.json()
                print(f"Error: {error.get('detail', 'Unknown error')}")
            except:
                print(f"Raw response: {response.text[:300]}")

    except Exception as e:
        print(f"❌ API error: {e}")


if __name__ == "__main__":
    test_single_case()
