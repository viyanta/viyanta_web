-- Add pdf_name column to reports table
ALTER TABLE `reports` 
ADD COLUMN `pdf_name` VARCHAR(512) NULL AFTER `company`;

-- Add pdf_name column to reportdata table
ALTER TABLE `reportdata` 
ADD COLUMN `pdf_name` VARCHAR(512) NULL AFTER `reportid`;

-- Optional: Create index on pdf_name for faster queries
CREATE INDEX idx_reports_pdf_name ON reports(pdf_name);
CREATE INDEX idx_reportdata_pdf_name ON reportdata(pdf_name);

-- Verify the changes
DESCRIBE reports;
DESCRIBE reportdata;
