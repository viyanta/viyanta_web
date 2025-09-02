#!/usr/bin/env python3
"""
Fix Q1 detection logic to properly distinguish between FY and Q1 files
"""
import re

# Read the current file
with open('services/master_template.py', 'r') as f:
    content = f.read()

# Find the _find_pages_for_form function and replace the detection logic
old_detection = '''            if 'FY' in pdf_filename:
                logger.info(f"FY file detected: {pdf_filename}. Using pages 3-6 for L-1-A-REVENUE")
                return "3-6"
            else:
                logger.info(f"Q1 file detected: {pdf_filename}. Using pages 3-4 for L-1-A-REVENUE")
                return "3-4"'''

new_detection = '''            # Check for Q1 first (more specific), then FY
            if 'Q1' in pdf_filename:
                logger.info(f"Q1 file detected: {pdf_filename}. Using pages 3-4 for L-1-A-REVENUE")
                return "3-4"
            elif 'FY' in pdf_filename:
                logger.info(f"FY file detected: {pdf_filename}. Using pages 3-6 for L-1-A-REVENUE")
                return "3-6"
            else:
                # Default to Q1 behavior if neither Q1 nor FY is clearly detected
                logger.info(f"Default file detected: {pdf_filename}. Using pages 3-4 for L-1-A-REVENUE")
                return "3-4"'''

# Replace the detection logic
content = content.replace(old_detection, new_detection)

# Write the updated file
with open('services/master_template.py', 'w') as f:
    f.write(content)

print("✅ Fixed Q1 detection logic")
print("📊 Now properly detects Q1 files and uses pages 3-4")
print("📊 FY files still use pages 3-6")
