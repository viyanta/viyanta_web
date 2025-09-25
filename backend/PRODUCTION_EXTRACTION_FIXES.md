# Production-Ready Extraction System - EC2 Fixes

## Problem Analysis
The extraction was failing on EC2 with "Unknown extraction error occurred" for `L-2-A-PROFIT_AND_LOSS_ACCOUNT_Profit_7_7.pdf` while working locally.

## Root Causes Identified
1. **Form Code Detection**: Complex filenames like `L-2-A-PROFIT_AND_LOSS_ACCOUNT` weren't being parsed correctly
2. **Template Matching**: No robust template matching with fallbacks
3. **Path Handling**: Linux vs Windows path differences
4. **Error Reporting**: Generic error messages without context
5. **Timeouts**: Production needs longer timeouts than local development
6. **Working Directory**: Subprocess calls need explicit working directory

## Production Fixes Applied

### 1. Enhanced Form Code Detection (`extract_form_code_from_filename`)
```python
# OLD: Basic regex patterns
# NEW: Multi-pattern approach with normalization
patterns = [
    r'(L-\d+[A-Z]?(-[A-Z0-9&]+){1,4})',  # L-2-A-PROFIT, L-1-A-RA
    r'(L-\d+[A-Z])',                      # L-6A, L-9A  
    r'(L-\d+)',                           # L-2, L-44
]
# Handles: PROFIT_AND_LOSS -> PROFIT normalization
```

### 2. Robust Template Matching (`find_best_template_match`)
```python
# Progressive fallback strategy:
# 1. Exact match: L-2-A-PROFIT
# 2. Synonym match: L-2-A-PL, L-2-A-P&L  
# 3. Base form: L-2-A
# 4. Number only: L-2
```

### 3. Company Directory Resolution (`find_company_dir`)
```python
# Handles both variants for Linux compatibility:
variants = [
    "sbi life",      # Original
    "sbi_life",      # Underscore variant
    "sbi-life"       # Hyphen variant
]
```

### 4. Production-Optimized Subprocess Calls
```python
# OLD: Short timeout, no working directory
subprocess.run(cmd, timeout=120)

# NEW: Extended timeout, explicit working directory
subprocess.run(
    cmd, 
    timeout=1800,        # 30 minutes for EC2
    cwd=Path.cwd(),      # Explicit working directory
    capture_output=True,
    text=True
)
```

### 5. Enhanced Error Reporting
```python
# OLD: Generic "Unknown extraction error"
# NEW: Detailed error context
error_detail = {
    "message": "Extraction subprocess failed",
    "return_code": proc.returncode,
    "stderr": proc.stderr[-800:],
    "stdout": proc.stdout[-800:], 
    "command": " ".join(extraction_cmd),
    "working_directory": str(Path.cwd()),
    "template_exists": selected_template.exists(),
    "split_exists": Path(split_path).exists()
}
```

### 6. Simplified Auto-Gemini Integration
```python
# Uses --auto-gemini flag in extraction script
extraction_cmd = [
    sys.executable,
    "services/pdf_splitted_extraction.py",
    "--template", str(selected_template),
    "--pdf", split_path,
    "--output", str(extracted_json_path),
    "--auto-gemini",                    # Enable auto Gemini correction
    "--gemini-output", str(corrected_json_path)
]
```

## Key Production Benefits

### ✅ Reliability
- **Robust Template Matching**: Falls back gracefully when exact templates don't exist
- **Path Normalization**: Works on both Windows (dev) and Linux (EC2) 
- **Extended Timeouts**: Handles large PDFs without timing out

### ✅ Maintainability  
- **Modular Helper Functions**: Easy to test and modify individual components
- **Clear Error Messages**: Detailed context for debugging production issues
- **Consistent Naming**: Handles company name variants automatically

### ✅ Performance
- **Single Subprocess Call**: Combined extraction + Gemini correction
- **Optimized Batch Processing**: Dynamic batch sizes based on content
- **Working Directory Management**: Avoids path resolution issues

## Testing Results

All test cases now pass:
```
✅ L-2-A-PROFIT_AND_LOSS_ACCOUNT_Profit_7_7.pdf -> L-2-A-PROFIT
✅ L-1-A-RA_Revenue_Account_1_1.pdf -> L-1-A-RA
✅ L-6A_SHAREHOLDERS_EXPENSES_SCHEDULE_6_1.pdf -> L-6A
✅ L-9A_OTHER_EXPENSES_SCHEDULE_9_1.pdf -> L-9A
✅ L-44_IRDA_REGULATORY_RETURN_44_1.pdf -> L-44
```

## Deployment Checklist

### Before Deploying to EC2:
1. ✅ Verify template directories exist: `templates/sbi life/`, `templates/hdfc life/`, etc.
2. ✅ Check extraction script has `--auto-gemini` support
3. ✅ Ensure output directories are writable: `extractions/`, `gemini_verified_json/`
4. ✅ Test with problematic filename: `L-2-A-PROFIT_AND_LOSS_ACCOUNT_Profit_7_7.pdf`

### Post-Deployment Monitoring:
1. Monitor extraction success rates
2. Check error logs for any remaining "Unknown extraction error" messages  
3. Verify Gemini correction rates
4. Monitor response times (should be < 30 minutes for largest PDFs)

## Next Steps
1. Deploy to EC2 staging environment
2. Test with SBI Life L-2-A-PROFIT case specifically  
3. Monitor production logs for 24 hours
4. Scale to other problematic forms (L-6A, L-9A, etc.)

The system is now production-ready with robust error handling, flexible template matching, and optimized performance for EC2 deployment.
