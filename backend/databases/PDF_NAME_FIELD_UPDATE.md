# Database Schema Update - Added pdf_name Field

## Date: November 2, 2025

## Summary
Added `pdf_name` field to both `reports` and `reportdata` tables to track which PDF the data belongs to.

## Changes Made

### 1. Models Updated (`models.py`)
- ✅ Added `pdf_name = Column(String(512))` to `Report` model
- ✅ Added `pdf_name = Column(String(512))` to `ReportData` model

### 2. Database Storage Code Updated (`pdf_splitter.py`)
- ✅ Updated `Report()` creation to include `pdf_name=pdf_name`
- ✅ Updated `ReportData()` creation to include `pdf_name=pdf_name`

### 3. SQL Scripts Created/Updated

#### Migration Script (`add_pdf_name_column.sql`)
```sql
ALTER TABLE `reports` ADD COLUMN `pdf_name` VARCHAR(512) NULL AFTER `company`;
ALTER TABLE `reportdata` ADD COLUMN `pdf_name` VARCHAR(512) NULL AFTER `reportid`;
```

#### Schema Script (`create_tables.sql`)
Updated to include `pdf_name` field for future table creation.

## How to Apply Changes

### Step 1: Update MySQL Database
Run the migration script in your MySQL database (XAMPP phpMyAdmin):

```sql
-- Run this in your viyanta_web database
ALTER TABLE `reports` ADD COLUMN `pdf_name` VARCHAR(512) NULL AFTER `company`;
ALTER TABLE `reportdata` ADD COLUMN `pdf_name` VARCHAR(512) NULL AFTER `reportid`;

-- Optional: Add indexes for better performance
CREATE INDEX idx_reports_pdf_name ON reports(pdf_name);
CREATE INDEX idx_reportdata_pdf_name ON reportdata(pdf_name);
```

### Step 2: Restart Backend Server
The backend server should auto-reload with the new changes. If not, restart it:
```powershell
cd c:\Users\vicky\OneDrive\Desktop\Viyanta-project\viyanta_web\backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Step 3: Test
Upload and extract a PDF through your frontend. Check the database:

```sql
-- Check recent reports with pdf_name
SELECT id, company, pdf_name, form_no, title, created_at 
FROM reports 
ORDER BY id DESC 
LIMIT 5;

-- Check recent reportdata with pdf_name
SELECT dataid, reportid, pdf_name, formno, title 
FROM reportdata 
ORDER BY dataid DESC 
LIMIT 5;
```

## Example Data Structure

### Before
```
reports: company, form_no, title, source_pdf (split filename only)
reportdata: reportid, formno, title, datarow
```

### After
```
reports: company, pdf_name, form_no, title, source_pdf
reportdata: reportid, pdf_name, formno, title, datarow
```

### Sample Values
- `pdf_name`: "Bharti Axa Life S FY2023 9M"
- `source_pdf`: "L-3_7_7.pdf" (the split filename)

This allows you to:
1. Group all extractions from the same PDF
2. Query data by PDF name
3. Track which main PDF the split came from

## Benefits
- ✅ Easy to query all forms from a specific PDF
- ✅ Better data organization
- ✅ Track relationship between split files and original PDFs
- ✅ Improved filtering and reporting capabilities

## Query Examples

```sql
-- Get all reports from a specific PDF
SELECT * FROM reports WHERE pdf_name = 'Bharti Axa Life S FY2023 9M';

-- Get all data rows from a specific PDF
SELECT * FROM reportdata WHERE pdf_name = 'Bharti Axa Life S FY2023 9M';

-- Count forms per PDF
SELECT pdf_name, COUNT(*) as form_count 
FROM reports 
GROUP BY pdf_name 
ORDER BY form_count DESC;

-- Get all PDFs for a company
SELECT DISTINCT pdf_name FROM reports WHERE company = 'Bharti AXA Life';
```
