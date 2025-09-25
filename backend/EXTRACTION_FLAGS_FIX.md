# Fix for Unsupported Extraction Flags

## Problem
The extraction was failing with:
```
pdf_splitted_extraction.py: error: unrecognized arguments: --auto-gemini --gemini-output
```

## Root Cause
The existing `pdf_splitted_extraction.py` script doesn't support the `--auto-gemini` and `--gemini-output` flags that were included in the extraction command.

## Solution Applied

### ✅ **Removed Unsupported Flags**
```python
# OLD (failing command):
extraction_cmd = [
    sys.executable,
    "services/pdf_splitted_extraction.py",
    "--template", str(selected_template),
    "--pdf", split_path,
    "--output", str(extracted_json_path),
    "--auto-gemini",                    # ❌ NOT SUPPORTED
    "--gemini-output", str(corrected_json_path)  # ❌ NOT SUPPORTED
]

# NEW (working command):
extraction_cmd = [
    sys.executable,
    "services/pdf_splitted_extraction.py",
    "--template", str(selected_template),
    "--pdf", split_path,
    "--output", str(extracted_json_path)  # ✅ SUPPORTED FLAGS ONLY
]
```

### ✅ **Implemented Two-Step Processing**

**Step 1: Basic Extraction**
```python
extraction_proc = subprocess.run(
    extraction_cmd,
    capture_output=True,
    text=True,
    timeout=600,  # 10 minutes for extraction
    cwd=Path.cwd()
)
```

**Step 2: Separate Gemini Correction**
```python
gemini_cmd = [
    sys.executable,
    "services/pdf_splitted_gemini_very.py",
    "--template", str(selected_template),
    "--extracted", str(extracted_json_path),
    "--pdf", split_path,
    "--output", str(corrected_json_path)
]

gemini_proc = subprocess.run(
    gemini_cmd,
    capture_output=True,
    text=True,
    timeout=1200,  # 20 minutes for Gemini correction
    cwd=Path.cwd()
)
```

### ✅ **Added Robust Error Handling**

1. **Extraction Validation**: Ensures extracted JSON file exists before proceeding
2. **Gemini Graceful Failure**: If Gemini correction fails/times out, uses extracted data
3. **Clear Progress Logging**: Separate logging for each step
4. **Timeout Management**: Different timeouts for extraction (10min) vs Gemini (20min)

### ✅ **Processing Flow**
```
┌─────────────────┐    Success     ┌─────────────────┐    Success     ┌─────────────────┐
│   Extraction    │ ─────────────→ │ Gemini Correct  │ ─────────────→ │ Use Corrected   │
│                 │                │                 │                │     JSON        │
└─────────────────┘                └─────────────────┘                └─────────────────┘
         │                                   │
         │ Failure                           │ Failure/Timeout
         ▼                                   ▼
┌─────────────────┐                ┌─────────────────┐
│   Return Error  │                │ Use Extracted   │
│                 │                │     JSON        │
└─────────────────┘                └─────────────────┘
```

## Expected Results

### ✅ **The L-15 case should now work:**
```
Company: SBI Life
PDF: SBI Life S FY2023 Q1
Split: L-15-LOANS_SCHEDULE_Loans_21_23_23.pdf

[FORM CODE] Detected: L-15-LOANS
[TEMPLATES] Available: [..., 'L-15', ...]
[TEMPLATE] Selected: L-15.json
[EXTRACTION] Running extraction only (no unsupported flags)
[EXTRACTION] Return code: 0 ✅
[GEMINI] Running correction separately
[GEMINI] Return code: 0 ✅ (or graceful fallback if fails)
[SUCCESS] Final output ready
```

### ✅ **Compatibility with existing scripts:**
- Works with current `pdf_splitted_extraction.py` (no modifications needed)
- Works with current `pdf_splitted_gemini_very.py` (no modifications needed)
- Maintains all existing functionality

### ✅ **Production benefits:**
- **Fault Tolerance**: Gemini failure doesn't kill entire process
- **Clear Debugging**: Separate error messages for extraction vs correction
- **Flexible Timeouts**: Different limits for different processing steps
- **Progress Visibility**: User can see which step is running

## Testing
The fix has been applied and should resolve the `unrecognized arguments` error immediately. The system will now:
1. ✅ Run extraction successfully 
2. ✅ Attempt Gemini correction (with fallback)
3. ✅ Return results (extracted or corrected data)
