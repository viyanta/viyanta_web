-- Create dashboard_selected_descriptions table for storing global selected descriptions
-- This table stores the descriptions selected for the economy dashboard (max 4)

-- For MySQL
CREATE TABLE IF NOT EXISTS dashboard_selected_descriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    description VARCHAR(500) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_description (description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- For SQLite (alternative syntax - use if needed)
-- CREATE TABLE IF NOT EXISTS dashboard_selected_descriptions (
--     id INTEGER PRIMARY KEY AUTOINCREMENT,
--     description TEXT NOT NULL UNIQUE,
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
-- );



