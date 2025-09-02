#!/usr/bin/env python3
"""
Debug the file detection logic
"""
import os

def debug_detection():
    """Debug the file detection logic"""
    print("🔍 DEBUGGING FILE DETECTION LOGIC")
    print("=" * 50)
    
    uploads_dir = "uploads"
    if os.path.exists(uploads_dir):
        print("📁 Files in uploads directory:")
        for filename in os.listdir(uploads_dir):
            if filename.upper().endswith('.PDF') and 'SBI' in filename.upper():
                print(f"  • {filename}")
                print(f"    - Contains 'Q1': {'Q1' in filename.upper()}")
                print(f"    - Contains 'FY': {'FY' in filename.upper()}")
                print(f"    - Detection result: {'Q1' if 'Q1' in filename.upper() else 'FY' if 'FY' in filename.upper() else 'Default'}")
                print()
    
    # Test the logic
    test_files = [
        "SBI Life S FY2023 9M.pdf",
        "SBI Life S FY2025 Q1.pdf",
        "SBI Life Q1 2025.pdf"
    ]
    
    print("🧪 Testing detection logic:")
    for filename in test_files:
        print(f"  • {filename}")
        if 'Q1' in filename.upper():
            result = "Q1 (pages 3-4)"
        elif 'FY' in filename.upper():
            result = "FY (pages 3-6)"
        else:
            result = "Default (pages 3-4)"
        print(f"    → {result}")
        print()

if __name__ == "__main__":
    debug_detection()
