#!/usr/bin/env python3
"""
Script to extract and clean the corrected JSON from Gemini response
"""

import json
import re

# Read the corrected file
with open('/home/icanio-10093/viyanta/SBI_Life_S_FY2024_FY_Gemini_Corrected.json', 'r') as f:
    data = json.load(f)

# Get the original response
original_response = data.get('original_response', '')

# Clean up the response - remove any incomplete JSON
# Find the last complete JSON object
lines = original_response.split('\n')
cleaned_lines = []
in_json = False
brace_count = 0

for line in lines:
    if line.strip().startswith('{'):
        in_json = True
        brace_count = 0
    
    if in_json:
        cleaned_lines.append(line)
        brace_count += line.count('{') - line.count('}')
        
        # If we have balanced braces, we have a complete JSON
        if brace_count == 0 and line.strip().endswith('}'):
            break

# Join the cleaned lines
cleaned_response = '\n'.join(cleaned_lines)

try:
    # Parse the cleaned JSON
    corrected_data = json.loads(cleaned_response)
    
    # Save the cleaned corrected data
    with open('/home/icanio-10093/viyanta/SBI_Life_S_FY2024_FY_Gemini_Corrected_Clean.json', 'w') as f:
        json.dump(corrected_data, f, indent=2)
    
    print("Successfully extracted and cleaned the corrected JSON!")
    print(f"Status: {corrected_data.get('verification_summary', {}).get('status', 'Unknown')}")
    print(f"Accuracy Score: {corrected_data.get('verification_summary', {}).get('accuracy_score', 'N/A')}")
    print(f"Total Rows Verified: {corrected_data.get('verification_summary', {}).get('total_rows_verified', 'N/A')}")
    
    # Show corrections made
    corrections = corrected_data.get('verification_summary', {}).get('corrections_made', [])
    print(f"\nCorrections Made ({len(corrections)}):")
    for i, correction in enumerate(corrections, 1):
        print(f"  {i}. {correction}")
    
    # Show sample of corrected data
    if 'corrected_data' in corrected_data and 'Rows' in corrected_data['corrected_data']:
        rows = corrected_data['corrected_data']['Rows']
        print(f"\nSample of corrected data (first 3 rows):")
        for i, row in enumerate(rows[:3], 1):
            print(f"Row {i}: {row}")
    
    print(f"\nCleaned corrected data saved to: SBI_Life_S_FY2024_FY_Gemini_Corrected_Clean.json")
    
except json.JSONDecodeError as e:
    print(f"Error parsing cleaned JSON: {e}")
    print("First 1000 characters of cleaned response:")
    print(cleaned_response[:1000])
