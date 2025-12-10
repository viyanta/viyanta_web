-- SQL script to manually create dashboard_selected_row_ids table
-- This table stores which specific row IDs are selected for dashboard display
-- for each description and data type combination

-- For MySQL
CREATE TABLE IF NOT EXISTS dashboard_selected_row_ids (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data_type VARCHAR(50) NOT NULL COMMENT 'Either "Domestic" or "International"',
    description VARCHAR(500) NOT NULL COMMENT 'The description text',
    row_ids JSON NOT NULL COMMENT 'Array of selected row IDs as JSON',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_data_desc (data_type, description),
    INDEX idx_data_type (data_type),
    INDEX idx_description (description(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores selected row IDs for dashboard display per description and data type';

-- For SQLite (if needed)
-- CREATE TABLE IF NOT EXISTS dashboard_selected_row_ids (
--     id INTEGER PRIMARY KEY AUTOINCREMENT,
--     data_type TEXT NOT NULL,
--     description TEXT NOT NULL,
--     row_ids TEXT NOT NULL,
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--     UNIQUE(data_type, description)
-- );


