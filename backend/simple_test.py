#!/usr/bin/env python3

import os
import sys
sys.path.append('.')

try:
    import fitz
    print("✅ PyMuPDF imported successfully")

    # Test file access
    shriram_path = "pdfs_selected_company/shriram life/Shriram Life S FY2023 9M.pdf"
    aditya_path = "pdfs_selected_company/aditya birla sun life/Aditya Birla Life S FY2023 9M.pdf"

    print(f"Shriram file exists: {os.path.exists(shriram_path)}")
    print(f"Aditya file exists: {os.path.exists(aditya_path)}")

    if os.path.exists(shriram_path):
        doc = fitz.open(shriram_path)
        print(f"Shriram PDF pages: {doc.page_count}")

        # Get page 2 (index 1) content
        page = doc.load_page(1)
        text = page.get_text()
        lines = [line.strip() for line in text.split('\n') if line.strip()]

        print("📄 First 20 lines of Shriram index:")
        for i, line in enumerate(lines[:20]):
            print(f"{i:2}: {line}")

        doc.close()

    if os.path.exists(aditya_path):
        doc = fitz.open(aditya_path)
        print(f"\nAditya PDF pages: {doc.page_count}")

        # Get page 1 (index 0) content
        page = doc.load_page(0)
        text = page.get_text()
        lines = [line.strip() for line in text.split('\n') if line.strip()]

        print("📄 First 20 lines of Aditya index:")
        for i, line in enumerate(lines[:20]):
            print(f"{i:2}: {line}")

        doc.close()

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
