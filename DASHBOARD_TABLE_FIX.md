# Fix for Dashboard Selected Descriptions 404 Error

## Problem
The API endpoints `/api/economy/selected-descriptions` and `/api/economy/update-selected-descriptions` were returning 404 errors after deployment to the server.

## Root Cause
The `dashboard_selected_descriptions` table was not being created in MySQL because:
1. The `DashboardSelectedDescriptions` model was not imported in `main.py`, so SQLAlchemy's `Base.metadata.create_all()` didn't create it
2. The table creation in the route handlers might fail silently if there are permission issues

## Solution Applied

### 1. Fixed Model Import in main.py
- Added import for `DashboardSelectedDescriptions` and other models in `main.py`
- This ensures SQLAlchemy creates the table automatically when the app starts

### 2. Created SQL Migration Script
- Created `backend/databases/create_dashboard_selected_descriptions_table.sql`
- Contains CREATE TABLE statements for both MySQL and SQLite

### 3. Created Python Migration Script
- Created `backend/databases/create_dashboard_table.py`
- Can be run manually to create the table if needed
- Usage: `python backend/databases/create_dashboard_table.py`

### 4. Added Health Check Endpoint
- Added `/api/economy/health` endpoint to verify routes are accessible

## Steps to Fix on Server

### Option 1: Automatic (Recommended)
1. **Restart the backend server** - The table should be created automatically when the app starts because we now import the model in `main.py`
   ```bash
   # Restart your FastAPI/uvicorn server
   sudo systemctl restart your-backend-service
   # OR
   pm2 restart your-backend-app
   ```

### Option 2: Manual Table Creation
If the automatic creation doesn't work, run the Python script:

```bash
cd /path/to/viyanta_web/backend
python databases/create_dashboard_table.py
```

### Option 3: SQL Script
If you prefer to run SQL directly:

```bash
mysql -u your_user -p your_database < backend/databases/create_dashboard_selected_descriptions_table.sql
```

Or connect to MySQL and run:
```sql
CREATE TABLE IF NOT EXISTS dashboard_selected_descriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    description VARCHAR(500) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_description (description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Verify the Fix

1. **Check if routes are accessible:**
   ```bash
   curl https://app.viyantainsights.com/api/economy/health
   ```
   Should return: `{"status":"ok","message":"Economy routes are working",...}`

2. **Check if table exists:**
   ```sql
   SHOW TABLES LIKE 'dashboard_selected_descriptions';
   ```

3. **Test the endpoints:**
   ```bash
   # GET selected descriptions
   curl https://app.viyantainsights.com/api/economy/selected-descriptions
   
   # Should return: {"descriptions": []} (empty if no selections yet)
   ```

## Files Modified
- `backend/main.py` - Added model imports
- `backend/routes/economy.py` - Added health check endpoint
- `backend/databases/create_dashboard_selected_descriptions_table.sql` - New SQL script
- `backend/databases/create_dashboard_table.py` - New Python migration script

## Notes
- The table will be created automatically on server restart if models are properly imported
- The routes have fallback table creation logic, but it's better to ensure the table exists before use
- Maximum 4 descriptions can be stored (enforced by frontend, not database)



