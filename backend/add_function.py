import re

# Read the file
with open('services/master_template.py', 'r') as f:
    content = f.read()

# Find the position after save_gemini_response function
pattern = r'(def save_gemini_response.*?return None\n)'
match = re.search(pattern, content, re.DOTALL)

if match:
    # Add the new function after save_gemini_response
    new_function = '''def save_extraction_response(company, form_no, filename, extraction_result):
    """Automatically save extraction response to file"""
    try:
        # Create extraction_responses directory
        extraction_dir = os.path.join(BACKEND_DIR, 'extraction_responses')
        os.makedirs(extraction_dir, exist_ok=True)
        
        # Create response data
        extraction_response = {
            'timestamp': datetime.now().isoformat(),
            'api_endpoint': f'/templates/extract-form/{form_no}',
            'company': company,
            'form_no': form_no,
            'filename': filename,
            'extraction_result': extraction_result
        }
        
        # Generate filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        safe_form_no = form_no.replace('-', '_').replace(' ', '_')
        response_filename = f'extraction_response_{company}_{safe_form_no}_{timestamp}.json'
        filepath = os.path.join(extraction_dir, response_filename)
        
        # Save to file
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(extraction_response, f, indent=2, ensure_ascii=False)
        
        logger.info(f"✅ Extraction response automatically saved to: {filepath}")
        return filepath
        
    except Exception as e:
        logger.error(f"❌ Error saving extraction response: {e}")
        return None

'''
    
    # Insert the new function after the match
    new_content = content[:match.end()] + '\n' + new_function + content[match.end():]
    
    # Write back to file
    with open('services/master_template.py', 'w') as f:
        f.write(new_content)
    
    print("Function added successfully!")
else:
    print("Pattern not found!")
