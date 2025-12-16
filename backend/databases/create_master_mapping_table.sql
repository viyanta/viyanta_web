-- ============================================================================
-- Master Mapping Table for IRDAI L-Forms Row Normalization
-- ============================================================================
-- This table stores canonical (master) row names and their variants
-- for intelligent cross-company row matching and standardization

CREATE TABLE IF NOT EXISTS `master_mapping` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `master_name` VARCHAR(512) NOT NULL COMMENT 'Canonical/representative row name',
    `company_id` INT DEFAULT NULL COMMENT 'Company ID (NULL = cross-company master)',
    `form_no` VARCHAR(50) NOT NULL COMMENT 'L-form number (e.g., L-2-A, L-6A)',
    `variant_text` VARCHAR(512) NOT NULL COMMENT 'Original extracted text',
    `normalized_text` VARCHAR(512) NOT NULL COMMENT 'NLP-normalized text',
    `cluster_label` INT NOT NULL COMMENT 'Cluster ID from ML clustering',
    `similarity_score` DECIMAL(5,4) DEFAULT NULL COMMENT 'Fuzzy match score (0-1)',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX `idx_form_cluster` (`form_no`, `cluster_label`),
    INDEX `idx_normalized` (`normalized_text`),
    INDEX `idx_company_form` (`company_id`, `form_no`),
    
    -- Ensure uniqueness
    UNIQUE KEY `unique_variant` (`form_no`, `variant_text`, `company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Master row mapping for L-form standardization';

-- ============================================================================
-- Optional: Add indexes to reports_l2_extracted for faster lookups
-- ============================================================================
-- Run these if not already present:

-- ALTER TABLE reports_l2_extracted 
-- ADD INDEX `idx_master_row_id` (`master_row_id`);

-- ALTER TABLE reports_l2_extracted 
-- ADD INDEX `idx_normalized_text` (`normalized_text`);

-- ALTER TABLE reports_l2_extracted 
-- ADD INDEX `idx_company_form` (`company_id`, `report_id`);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check master_mapping table structure
SHOW CREATE TABLE master_mapping;

-- View sample data after pipeline runs
-- SELECT master_name, COUNT(*) as variant_count, cluster_label
-- FROM master_mapping
-- WHERE form_no = 'L-2-A'
-- GROUP BY master_name, cluster_label
-- ORDER BY variant_count DESC
-- LIMIT 20;
