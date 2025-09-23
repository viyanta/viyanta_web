def make_chunk_prompt(template_json, flat_headers, chunk_rows, pdf_excerpt):
    """
    ULTRA-ENHANCED prompt for perfect PDF-to-JSON matching with zero data loss tolerance.
    """
    prompt = f"""
You are an ELITE financial data extraction specialist with ZERO TOLERANCE for missing or incorrect data.

**CRITICAL DATA SOURCES:**

1. **REFERENCE TEMPLATE** (structure guide only - may be wrong):
{json.dumps(template_json, ensure_ascii=False, indent=2)}

2. **CURRENT HEADERS** (potentially incorrect - FIX if needed):
{json.dumps(flat_headers, ensure_ascii=False)}

3. **INCOMPLETE EXTRACTED DATA** (missing rows/values to be FIXED):
{json.dumps(chunk_rows, ensure_ascii=False, indent=2)}

4. **ABSOLUTE TRUTH - PDF CONTENT** (the ONLY source of truth):
{pdf_excerpt}

**🎯 SUPREME DIRECTIVE: ACHIEVE 100% PDF-TO-JSON PERFECTION**

**� STEP 1: FORENSIC PDF ANALYSIS**
- Scan EVERY character, number, word, punctuation mark in the PDF
- Identify ALL table structures: headers, rows, columns, merged cells
- Find ALL financial data: amounts, percentages, ratios, totals, subtotals
- Extract ALL text data: descriptions, particulars, notes, labels
- Map EVERY piece of information to its exact location and context
- Identify form metadata: Form Number, Company Name, Period, Currency, Registration

**🔧 STEP 2: DYNAMIC STRUCTURE ADAPTATION**
- Compare PDF table structure with template structure
- If PDF has different headers than template: OVERRIDE template, use PDF headers
- If PDF has more/fewer columns: ADJUST structure to match PDF exactly
- If PDF has different row categories: ADD all missing categories
- Ensure final structure perfectly mirrors the actual PDF table

**� STEP 3: COMPREHENSIVE DATA RECOVERY**
- Find ALL rows present in PDF but missing from extracted data
- Recover ALL financial figures hidden or misplaced in extraction
- Add ALL missing particulars, descriptions, and line items
- Capture ALL subtotals, totals, and calculated figures
- Ensure NO data point from PDF is overlooked or omitted
- Cross-verify every PDF cell against extracted JSON

**🎯 STEP 4: PRECISION DATA CORRECTION**
- Fix ALL misaligned data (move values to correct columns)
- Correct ALL wrong numbers, text, or formatting
- Preserve EXACT PDF formatting: commas, parentheses, dashes, decimals
- Match text exactly: capitalization, spacing, punctuation
- Ensure each cell contains clean, single values (no concatenated data)
- Remove any extraction artifacts or OCR errors

**🔍 STEP 5: METADATA INTELLIGENCE**
- Extract precise Form Number from PDF (L-XX format)
- Extract complete Company Title/Name
- Extract Registration Number with exact formatting
- Extract Period information (quarters, years, date ranges)
- Extract Currency denomination (in Lakhs, in Crores, etc.)

**⚡ CRITICAL SUCCESS REQUIREMENTS:**
🚫 ZERO missing rows compared to PDF
🚫 ZERO missing data values compared to PDF  
🚫 ZERO incorrect financial amounts
🚫 ZERO column misalignments
🚫 ZERO wrong headers when PDF differs from template
✅ Every PDF row MUST appear in JSON
✅ Every PDF value MUST be captured accurately
✅ Headers MUST match PDF table structure exactly
✅ Formatting MUST preserve PDF appearance
✅ Structure MUST adapt to PDF reality, not template assumptions

**📋 MANDATORY OUTPUT FORMAT:**
Return ONLY this JSON structure (no explanations or markdown):

{{
  "FormInfo": {{
    "Form No": "exact form number from PDF",
    "Title": "complete company title from PDF", 
    "RegistrationNumber": "registration details from PDF",
    "Period": "period/date information from PDF",
    "Currency": "currency unit from PDF"
  }},
  "CorrectedHeaders": ["header1", "header2", "header3", ...],
  "Rows": [
    {{"header1": "value1", "header2": "value2", ...}},
    {{"header1": "value1", "header2": "value2", ...}}
  ]
}}

**🚀 EXECUTE ZERO-LOSS PDF-TO-JSON TRANSFORMATION:**
Compare the provided extracted data with the PDF content. Find EVERY missing row, EVERY missing value, EVERY misaligned piece of data. Add ALL missing information. Correct ALL errors. Make the JSON a PERFECT mirror of the PDF table.

**⚠️ CRITICAL JSON FORMATTING REQUIREMENTS:**
- Return ONLY valid JSON - no explanations, comments, or markdown fences
- Ensure proper array/object closure - no missing brackets or braces
- No trailing commas before closing brackets/braces
- Proper spacing and formatting for clean parsing
- Test JSON validity before responding
"""
    return prompt


def make_metadata_prompt(extracted_page, pdf_excerpt):
    prompt = f"""
You are a financial data correction expert.

[INPUT DATA]
Extracted JSON metadata (may be incomplete or wrong):
{json.dumps({k: extracted_page.get(k, "") for k in ["Form No", "Title", "RegistrationNumber", "Period", "Currency"]}, ensure_ascii=False, indent=2)}

Original PDF Content (ground truth):
{pdf_excerpt}

[TASK]
- Correct metadata fields to exactly match the PDF:
  * Form No
  * Title (Company Name / Report Title)
  * Registration Number
  * Period (date or quarter)
  * Currency (Lakhs, Crores, etc.)
- Use only values visible in the PDF.
- Do not invent data.

[OUTPUT FORMAT]
Return valid JSON only:
{{
  "Form No": "...",
  "Title": "...",
  "RegistrationNumber": "...",
  "Period": "...",
  "Currency": "..."
}}
"""
    return prompt


def make_headers_prompt(flat_headers, pdf_excerpt):
    prompt = f"""
You are a table structure correction expert.

[INPUT DATA]
Extracted headers (may be wrong):
{json.dumps(flat_headers, ensure_ascii=False)}

Original PDF Content (ground truth):
{pdf_excerpt}

[TASK]
- Identify the correct table headers from the PDF.
- Fix header names so they match the PDF exactly.
- Preserve header order as in the PDF.
- Do not add headers not in the PDF.

[OUTPUT FORMAT]
Return only a JSON array of headers, e.g.:
["Header1", "Header2", "Header3", ...]
"""
    return prompt


def make_rows_prompt(chunk_rows, corrected_headers, pdf_excerpt):
    prompt = f"""
You are a financial table correction expert.

[INPUT DATA]
Extracted rows (may contain errors):
{json.dumps(chunk_rows, ensure_ascii=False, indent=2)}

Corrected headers (from the previous step):
{json.dumps(corrected_headers, ensure_ascii=False)}

Original PDF Content (ground truth):
{pdf_excerpt}

[TASK]
- Compare extracted rows with the PDF tables.
- Correct all values so they match the PDF exactly.
- Add missing rows if they exist in the PDF but not in the extracted data.
- Remove rows not present in the PDF.
- Align each value under the correct header.
- Preserve formatting (commas in numbers, parentheses for negatives, dashes).

[OUTPUT FORMAT]
Return valid JSON only:
{{
  "Rows": [
    {{"Header1": "value1", "Header2": "value2", ...}},
    {{"Header1": "value3", "Header2": "value4", ...}}
  ]
}}
"""
    return prompt
