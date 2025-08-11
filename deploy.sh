#!/bin/bash

echo "🚀 Starting deployment of Viyanta Web Application..."

# Navigate to project directory
cd ~/viyanta_web

echo "📁 Current directory: $(pwd)"

# Pull latest changes from GitHub
echo "⬇️  Pulling latest changes from GitHub..."
git pull origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pulled latest changes"
else
    echo "❌ Failed to pull changes. Exiting..."
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Installing PM2..."
    npm install -g pm2
fi

# Restart backend process
echo "🔄 Restarting backend process..."
pm2 restart backend

if [ $? -eq 0 ]; then
    echo "✅ Backend restarted successfully"
else
    echo "❌ Failed to restart backend"
fi

# Restart frontend process
echo "🔄 Restarting frontend process..."
pm2 restart frontend

if [ $? -eq 0 ]; then
    echo "✅ Frontend restarted successfully"
else
    echo "❌ Failed to restart frontend"
fi

# Show PM2 status
echo "📊 Current PM2 status:"
pm2 ps

echo "🎉 Deployment completed!"
echo "🌐 Your application should now be running with the latest changes"
echo "📱 Including: AssureLife v0.1 branding and all UI improvements" 