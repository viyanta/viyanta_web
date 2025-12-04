# Deployment Checklist - Fix 404 Errors for Selected Descriptions

## Problem
Both `/api/economy/selected-descriptions` and `/api/economy/update-selected-descriptions` are returning 404 errors.

## Root Cause
The server is running old code that doesn't have these routes. The code has been fixed, but the server needs to be restarted.

## What Was Fixed

### 1. Routes Added
- ✅ `GET /api/economy/selected-descriptions` - Get selected descriptions
- ✅ `POST /api/economy/update-selected-descriptions` - Update selected descriptions
- ✅ `GET /api/economy/health` - Health check endpoint

### 2. Model Import Fixed
- ✅ Added `DashboardSelectedDescriptions` model import in `main.py`
- ✅ Table will be created automatically on server restart

### 3. Files Modified
- `backend/main.py` - Added model imports and route logging
- `backend/routes/economy.py` - Routes already exist (lines 184, 231)
- `backend/databases/create_dashboard_table.py` - Migration script (optional)

## Required Actions on Server

### Step 1: Deploy Updated Code
Make sure the latest code is on the server:
```bash
cd /path/to/viyanta_web
git pull  # or however you deploy
```

### Step 2: Restart Backend Server
**This is the critical step!** The server MUST be restarted for the routes to be available.

```bash
# Option A: If using systemd
sudo systemctl restart your-backend-service
sudo systemctl status your-backend-service  # Verify it's running

# Option B: If using PM2
pm2 restart your-backend-app
pm2 status  # Verify it's running

# Option C: If running manually
# Stop the current process (Ctrl+C) and restart:
cd /path/to/viyanta_web/backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
# OR
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 3: Verify Routes Are Working

After restart, test the endpoints:

```bash
# Test health endpoint
curl https://app.viyantainsights.com/api/economy/health

# Should return:
# {"status":"ok","message":"Economy routes are working",...}

# Test GET selected descriptions
curl https://app.viyantainsights.com/api/economy/selected-descriptions

# Should return:
# {"descriptions": []}  (empty if no selections yet)

# Test POST update (example)
curl -X POST https://app.viyantainsights.com/api/economy/update-selected-descriptions \
  -H "Content-Type: application/json" \
  -d '{"descriptions": ["Test Description"]}'

# Should return:
# {"message":"Selected descriptions updated successfully",...}
```

### Step 4: Check Server Logs

After restart, check the logs to see if routes are registered:

```bash
# Look for this message in logs:
# ✅ Economy router registered with prefix: /api/economy
#    Available endpoints:
#    - GET  /api/economy/health
#    - GET  /api/economy/selected-descriptions
#    - POST /api/economy/update-selected-descriptions
```

### Step 5: Verify Table Creation

The table should be created automatically. Verify:

```sql
-- Connect to MySQL
mysql -u your_user -p your_database

-- Check if table exists
SHOW TABLES LIKE 'dashboard_selected_descriptions';

-- If it doesn't exist, run:
source /path/to/viyanta_web/backend/databases/create_dashboard_selected_descriptions_table.sql
```

## Troubleshooting

### If routes still return 404 after restart:

1. **Check if routes are loaded:**
   ```bash
   # Visit FastAPI docs
   https://app.viyantainsights.com/docs
   # Look for "Economy" section and check if endpoints are listed
   ```

2. **Check server logs for errors:**
   ```bash
   # Look for import errors or syntax errors
   journalctl -u your-backend-service -n 100
   # OR
   pm2 logs your-backend-app
   ```

3. **Verify code is deployed:**
   ```bash
   # Check if routes exist in the file
   grep -n "selected-descriptions" /path/to/viyanta_web/backend/routes/economy.py
   # Should show lines 184 and 231
   ```

4. **Check if router is registered:**
   ```bash
   grep -n "economy_router" /path/to/viyanta_web/backend/main.py
   # Should show line 93
   ```

## Expected Behavior After Fix

1. ✅ `GET /api/economy/selected-descriptions` returns `{"descriptions": []}` (or list of descriptions)
2. ✅ `POST /api/economy/update-selected-descriptions` successfully saves descriptions
3. ✅ Frontend can fetch and update selected descriptions without 404 errors
4. ✅ Table `dashboard_selected_descriptions` exists in MySQL

## Quick Test Script

```bash
#!/bin/bash
# Test script to verify endpoints are working

BASE_URL="https://app.viyantainsights.com"

echo "Testing Economy Endpoints..."
echo ""

echo "1. Health Check:"
curl -s "$BASE_URL/api/economy/health" | jq .
echo ""

echo "2. Get Selected Descriptions:"
curl -s "$BASE_URL/api/economy/selected-descriptions" | jq .
echo ""

echo "3. Update Selected Descriptions:"
curl -s -X POST "$BASE_URL/api/economy/update-selected-descriptions" \
  -H "Content-Type: application/json" \
  -d '{"descriptions": ["Test 1", "Test 2"]}' | jq .
echo ""

echo "4. Verify Update:"
curl -s "$BASE_URL/api/economy/selected-descriptions" | jq .
```

Save as `test_endpoints.sh`, make executable (`chmod +x test_endpoints.sh`), and run it.

