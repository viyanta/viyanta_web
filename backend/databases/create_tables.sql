-- Drop tables if they exist
DROP TABLE IF EXISTS reportdata;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS companies;

-- Companies table
CREATE TABLE companies (
    companyid INT AUTO_INCREMENT PRIMARY KEY,
    companyname VARCHAR(255) UNIQUE NOT NULL
) ENGINE=InnoDB;

-- Reports table
CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company VARCHAR(255),
    pdf_name VARCHAR(512),
    registration_number VARCHAR(100),
    form_no VARCHAR(50),
    title VARCHAR(255),
    period VARCHAR(100),
    currency VARCHAR(50),
    pages_used VARCHAR(50),
    source_pdf VARCHAR(512),
    flat_headers JSON,
    data_rows JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ReportData table
CREATE TABLE reportdata (
    dataid INT AUTO_INCREMENT PRIMARY KEY,
    reportid INT NOT NULL,
    pdf_name VARCHAR(512),
    formno VARCHAR(50),
    title VARCHAR(255),
    datarow JSON NOT NULL,
    FOREIGN KEY (reportid) REFERENCES reports(id)
) ENGINE=InnoDB;
