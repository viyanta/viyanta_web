# Improved PDF Table Extraction Prompt

## Overview
This document describes the enhancements made to the Gemini AI prompt for correcting PDF table extraction errors in the `gemini_test_fixed.py` script.

## Key Improvements

### 1. Enhanced Main Correction Prompt
The original prompt has been significantly improved with:

- **Clear Role Definition**: "You are an expert at extracting and correcting tabular data from PDF documents"
- **Structured Context**: Better organization of input data (Template JSON, Required Columns, Extracted Rows, Source PDF)
- **Detailed Correction Rules**: 5 comprehensive rule categories covering accuracy, data integrity, structure validation, common fixes, and validation checklist
- **Specific Examples**: Concrete examples of common extraction errors and how to fix them
- **Better Formatting Instructions**: More precise guidance on preserving financial notation, currency symbols, and numeric formatting

### 2. New Validation Round
Added a second validation step that:

- **Double-checks corrected data** against the original PDF
- **Performs accuracy verification** for all numeric values
- **Ensures completeness** of all required columns
- **Validates formatting** consistency
- **Makes final corrections** if any issues are found

### 3. Improved Error Handling
- **Better JSON parsing** with multiple fallback methods
- **Robust error recovery** when validation fails
- **Detailed logging** for debugging extraction issues
- **Graceful degradation** when AI responses are malformed

## Key Features

### Accuracy Improvements
- **Cross-referencing**: Every value is verified against PDF text
- **Split/Merge Detection**: Identifies and fixes values that were incorrectly split or merged
- **Format Preservation**: Maintains exact numeric formatting (commas, parentheses, decimals)
- **Currency Handling**: Preserves currency symbols and units as they appear in PDF

### Structure Validation
- **Column Completeness**: Ensures all required columns are present
- **Order Preservation**: Maintains exact column order from template
- **Data Integrity**: Prevents data loss or duplication
- **Empty Cell Handling**: Properly represents empty cells as empty strings

### Common Fixes Addressed
- Split values: "1,234" split as "1" and "234" → "1,234"
- Merged values: "1,2345,678" → "1,234" and "5,678"
- Line breaks: "Total\nRevenue" → "Total Revenue"
- Financial notation: Preserves "(1,234)" for negative values
- Currency symbols: Maintains "Rs", "Lakhs", etc.

## Usage

### Basic Usage (with validation)
```bash
python gemini_test_fixed.py --template template.json --extracted extracted.json --pdf source.pdf
```

### Without validation (faster processing)
```bash
python gemini_test_fixed.py --template template.json --extracted extracted.json --pdf source.pdf --no-validation
```

### Custom parameters
```bash
python gemini_test_fixed.py --template template.json --extracted extracted.json --pdf source.pdf --batch-size 10 --retries 3 --model gemini-1.5-pro
```

## Expected Improvements

1. **Higher Accuracy**: Better detection and correction of extraction errors
2. **Consistent Formatting**: Preserved financial notation and currency symbols
3. **Complete Data**: Reduced missing values and improved column coverage
4. **Better Structure**: Proper handling of merged/split cells
5. **Validation**: Double-checking ensures final quality

## Technical Details

### Prompt Structure
- **Context Section**: Clear presentation of all input data
- **Rules Section**: 5 detailed rule categories with specific instructions
- **Examples Section**: Concrete examples of common fixes
- **Output Format**: Precise JSON structure requirements
- **Validation**: Separate validation prompt for final accuracy check

### Error Recovery
- Multiple JSON parsing fallbacks (json.loads, heuristic fixes, json_repair, demjson)
- Graceful handling of malformed AI responses
- Fallback to original data when correction fails
- Comprehensive logging for debugging

This improved prompt should significantly enhance the accuracy and reliability of PDF table extraction corrections.
