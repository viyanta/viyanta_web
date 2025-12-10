# Dashboard Selected Row IDs Table

## Overview
The `dashboard_selected_row_ids` table stores which specific data rows are selected for display in the Economy Dashboard. This allows users to choose which data points appear in the dashboard for each description.

## Automatic Table Creation ✅

**You do NOT need to manually create this table!** 

The table is **automatically created** when you first use the feature:
- When you check/uncheck a row in the "Select for Dashboard" column
- When the page loads and fetches selected row IDs

The backend endpoints (`/api/economy/selected-row-ids` and `/api/economy/update-selected-row-ids`) include `CREATE TABLE IF NOT EXISTS` statements that will create the table automatically.

## Manual Table Creation (Optional)

If you prefer to create the table manually, or if automatic creation fails, you have two options:

### Option 1: Run the SQL Script

For MySQL:
```bash
mysql -u your_username -p your_database_name < backend/databases/create_dashboard_selected_row_ids_table.sql
```

Or execute the SQL directly in MySQL:
```sql
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Option 2: Run the Python Script

```bash
cd viyanta_web/backend
python databases/create_dashboard_selected_row_ids_table.py
```

## Table Structure

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (Primary Key) | Auto-incrementing ID |
| `data_type` | VARCHAR(50) | Either "Domestic" or "International" |
| `description` | VARCHAR(500) | The description text |
| `row_ids` | JSON | Array of selected row IDs (e.g., `[1, 5, 12, 23]`) |
| `created_at` | DATETIME | Timestamp when record was created |
| `updated_at` | DATETIME | Timestamp when record was last updated |

**Unique Constraint:** The combination of `data_type` and `description` must be unique.

## API Endpoints

### GET `/api/economy/selected-row-ids`
- **Query Parameters:**
  - `data_type`: "Domestic" or "International"
  - `description`: The description text
- **Returns:** `{ "row_ids": [1, 5, 12, ...] }`

### POST `/api/economy/update-selected-row-ids`
- **Body:**
  ```json
  {
    "data_type": "Domestic",
    "description": "Overall Industry Growth",
    "row_ids": [1, 5, 12, 23]
  }
  ```
- **Returns:** Success message with updated data

## How It Works

1. User selects Category → Sub Category → Description in Economy Domestic/International pages
2. User checks/unchecks rows in the "Select for Dashboard" column
3. Selected row IDs are saved to `dashboard_selected_row_ids` table
4. When dashboard loads, it fetches data and filters by selected row IDs
5. Only checked rows appear in the dashboard data and visuals

## Troubleshooting

If the table is not created automatically:

1. **Check database permissions:** Ensure the database user has `CREATE TABLE` permission
2. **Check logs:** Look for error messages in the backend console
3. **Manual creation:** Use one of the manual creation methods above
4. **Verify connection:** Ensure `DB_TYPE` environment variable is set correctly

## Notes

- The table uses JSON column type in MySQL (MySQL 5.7.8+) for storing array of row IDs
- For SQLite, row IDs are stored as TEXT and parsed as JSON
- The table is automatically created on first use - no manual intervention needed!


