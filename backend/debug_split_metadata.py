#!/usr/bin/env python3

import json
import os
from pathlib import Path


def check_split_metadata():
    """Check what form codes are stored in split metadata"""

    # Test case from failing API call
    company_name = "Aditya Birla Sun Life"
    pdf_name = "Aditya Birla Life S FY2023 9M"
    split_filename = "L-1-A-RA_1_5.pdf"

    # Build paths like the API does
    from services.pdf_splitter import PDFSplitterService
    pdf_splitter = PDFSplitterService()

    # Get splits metadata
    try:
        splits = pdf_splitter.get_pdf_splits(company_name, pdf_name)
        print(f"📋 Found {len(splits)} splits for {company_name}/{pdf_name}")

        for split in splits:
            print(f"📄 Split: {split['filename']}")
            print(
                f"  📋 Form code in metadata: '{split.get('form_code', 'NOT_FOUND')}'")
            print(
                f"  📋 Other metadata: {json.dumps({k: v for k, v in split.items() if k != 'filename'}, indent=2)}")
            print()

            if split["filename"] == split_filename:
                print(f"🎯 FOUND TARGET SPLIT: {split_filename}")
                print(
                    f"  📋 Stored form_code: '{split.get('form_code', 'NOT_FOUND')}'")
                print(f"  📋 Expected form_code from filename: L-1-A")

    except Exception as e:
        print(f"❌ Error getting splits: {e}")


if __name__ == "__main__":
    check_split_metadata()
