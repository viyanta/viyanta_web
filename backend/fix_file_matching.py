#!/usr/bin/env python3
"""
Fix the file matching logic to find the correct file
"""
import re

# Read the current file
with open('services/master_template.py', 'r') as f:
    content = f.read()

# Find the file matching logic and replace it
old_matching = '''            if os.path.exists(uploads_dir):
                for filename in os.listdir(uploads_dir):
                    if filename.upper().endswith('.PDF') and 'SBI' in filename.upper():
                        original_filename = filename.upper()
                        logger.info(f"Found original SBI file in uploads: {filename}")
                        break'''

new_matching = '''            if os.path.exists(uploads_dir):
                # Try to find a file that matches the current pdf_path name pattern
                current_basename = os.path.basename(pdf_path).upper()
                
                # First, try to find an exact match or similar pattern
                for filename in os.listdir(uploads_dir):
                    if filename.upper().endswith('.PDF') and 'SBI' in filename.upper():
                        # If we have a specific pattern in the current file, try to match it
                        if 'Q1' in current_basename and 'Q1' in filename.upper():
                            original_filename = filename.upper()
                            logger.info(f"Found matching Q1 file in uploads: {filename}")
                            break
                        elif 'FY' in current_basename and 'FY' in filename.upper() and 'Q1' not in filename.upper():
                            original_filename = filename.upper()
                            logger.info(f"Found matching FY file in uploads: {filename}")
                            break
                
                # If no specific match found, use the first SBI file as fallback
                if not original_filename:
                    for filename in os.listdir(uploads_dir):
                        if filename.upper().endswith('.PDF') and 'SBI' in filename.upper():
                            original_filename = filename.upper()
                            logger.info(f"Found fallback SBI file in uploads: {filename}")
                            break'''

# Replace the matching logic
content = content.replace(old_matching, new_matching)

# Write the updated file
with open('services/master_template.py', 'w') as f:
    f.write(content)

print("✅ Fixed file matching logic")
print("📊 Now properly matches Q1 and FY files")
