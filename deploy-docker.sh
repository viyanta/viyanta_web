#!/bin/bash
set -e

echo "🚀 Starting Docker deployment..."

# Detect docker compose command
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    echo "❌ Neither 'docker compose' nor 'docker-compose' found!"
    exit 1
fi

echo "Using: $DOCKER_COMPOSE"

# Stop PM2 if running
if command -v pm2 &> /dev/null; then
    echo "⚠️  Stopping PM2 processes to free up ports..."
    pm2 stop all || true
fi

# Stop and remove old containers
echo "🛑 Stopping old containers..."
$DOCKER_COMPOSE down || true

# Remove dangling images to save space
echo "🧹 Cleaning up old images..."
docker image prune -f || true

# Build new images
echo "🔨 Building new images..."
$DOCKER_COMPOSE build

# Start containers
echo "▶️  Starting containers..."
$DOCKER_COMPOSE up -d

# Wait for containers to be healthy
echo "⏳ Waiting for containers to start..."
sleep 5

# Show status
echo "📊 Container status:"
$DOCKER_COMPOSE ps

# Check if containers are running
if $DOCKER_COMPOSE ps | grep -q "Up"; then
    echo "✅ Deployment completed successfully!"
    $DOCKER_COMPOSE logs --tail=20
else
    echo "❌ Deployment may have issues. Check logs:"
    $DOCKER_COMPOSE logs --tail=50
    exit 1
fi
