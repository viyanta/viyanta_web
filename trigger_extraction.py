#!/usr/bin/env python3
"""
Script to trigger HDFC Life PDF extraction via API
"""

import requests
import os
import json


def trigger_hdfc_extraction():
    """Trigger extraction for HDFC Life PDF"""

    # API endpoint
    url = "http://localhost:8000/api/extraction/extract/single"

    # PDF file path
    pdf_path = "data/HDFC Life  S FY2023 9M - 3.pdf"

    if not os.path.exists(pdf_path):
        print(f"PDF file not found: {pdf_path}")
        return None

    # Prepare the files and data for the request
    files = {
        'file': ('HDFC Life  S FY2023 9M - 3.pdf', open(pdf_path, 'rb'), 'application/pdf')
    }

    data = {
        'extract_mode': 'both',
        'return_format': 'json'
    }

    try:
        print("Sending extraction request...")
        response = requests.post(url, files=files, data=data, timeout=300)

        files['file'][1].close()  # Close the file

        if response.status_code == 200:
            result = response.json()
            print("Extraction successful!")
            print(f"Job ID: {result.get('job_id', 'N/A')}")
            print(f"Status: {result.get('status', 'N/A')}")
            print(f"Tables found: {len(result.get('tables', []))}")

            # Save the result to a file for inspection
            with open('hdfc_extraction_result.json', 'w') as f:
                json.dump(result, f, indent=2)
            print("Result saved to hdfc_extraction_result.json")

            return result
        else:
            print(f"Error: {response.status_code}")
            print(f"Response: {response.text}")
            return None

    except Exception as e:
        print(f"Error making request: {e}")
        return None


if __name__ == "__main__":
    result = trigger_hdfc_extraction()
