#!/bin/bash

# Viyanta Docker Deployment - Safe Parallel Deployment
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

echo "🐳 Viyanta Docker Deployment"
echo "Using ports: Backend=8001, Frontend=8082, MySQL=3307"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker not installed"
    exit 1
fi

# Stop old Docker containers (if any)
log_info "Stopping old Docker containers..."
docker compose down 2>/dev/null || true
docker stop viyanta-mysql-docker viyanta-backend-docker viyanta-frontend-docker 2>/dev/null || true
docker rm viyanta-mysql-docker viyanta-backend-docker viyanta-frontend-docker 2>/dev/null || true

# Build images
log_info "Building Docker images..."
docker compose build

# Start containers
log_info "Starting containers..."
docker compose up -d

# Wait for health
log_info "Waiting for services (30s)..."
sleep 30

# Check status
log_info "Container status:"
docker compose ps

# Test endpoints
log_info "Testing backend..."
curl -s http://localhost:8001/ | head -5 || log_error "Backend not responding"

log_info "Testing frontend..."
curl -s http://localhost:8082 | head -5 || log_error "Frontend not responding"

echo ""
log_success "🎉 Docker Deployment Complete!"
echo ""
echo "Access:"
echo "  Backend:  http://localhost:8001"
echo "  Frontend: http://localhost:8082"
echo "  MySQL:    localhost:3307"
echo ""
echo "PM2 is still running on port 8000 (not affected)"
