#!/bin/bash

# Viyanta Web Application Deployment Script
# This script automates the deployment process for production environments

set -e  # Exit on any error

# Configuration
PROJECT_DIR="$HOME/viyanta_web"
GIT_BRANCH="main"
PM2_APP_NAMES=("backend" "frontend")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${BLUE}🚀 $1${NC}"
}

# Check if we're in the right directory
check_environment() {
    log_step "Checking deployment environment..."
    
    if [[ ! -d "$PROJECT_DIR" ]]; then
        log_error "Project directory not found: $PROJECT_DIR"
        exit 1
    fi
    
    cd "$PROJECT_DIR"
    log_success "Current directory: $(pwd)"
    
    # Check if this is a git repository
    if [[ ! -d ".git" ]]; then
        log_error "Not a git repository"
        exit 1
    fi
}

# Pull latest changes from Git
pull_latest_changes() {
    log_step "Pulling latest changes from Git..."
    
    # Check for uncommitted changes
    if [[ -n "$(git status --porcelain)" ]]; then
        log_warning "You have uncommitted changes. Consider committing them first."
        git status --short
    fi
    
    # Fetch latest changes
    git fetch origin "$GIT_BRANCH"
    
    # Check if we're behind
    local behind=$(git rev-list HEAD..origin/$GIT_BRANCH --count)
    if [[ $behind -eq 0 ]]; then
        log_success "Already up to date with origin/$GIT_BRANCH"
        return 0
    fi
    
    # Pull changes
    if git pull origin "$GIT_BRANCH"; then
        log_success "Successfully pulled latest changes (${behind} commits)"
    else
        log_error "Failed to pull changes from Git"
        exit 1
    fi
}

# Check and install PM2 if needed
check_pm2() {
    log_step "Checking PM2 installation..."
    
    if ! command -v pm2 &> /dev/null; then
        log_warning "PM2 is not installed. Installing PM2..."
        if npm install -g pm2; then
            log_success "PM2 installed successfully"
        else
            log_error "Failed to install PM2"
            exit 1
        fi
    else
        log_success "PM2 is already installed"
    fi
}

# Restart PM2 processes
restart_pm2_processes() {
    log_step "Restarting PM2 processes..."
    
    for app_name in "${PM2_APP_NAMES[@]}"; do
        log_info "Restarting $app_name..."
        
        if pm2 restart "$app_name"; then
            log_success "$app_name restarted successfully"
        else
            log_warning "Failed to restart $app_name (may not exist yet)"
            
            # Try to start if it doesn't exist
            if pm2 start "$app_name"; then
                log_success "$app_name started successfully"
            else
                log_error "Failed to start $app_name"
            fi
        fi
    done
}

# Show deployment status
show_status() {
    log_step "Deployment Status:"
    echo ""
    pm2 ps
    echo ""
    
    # Show recent commits
    log_info "Recent commits:"
    git log --oneline -5
}

# Main deployment function
main() {
    echo "🚀 Starting deployment of Viyanta Web Application..."
    echo "📍 Target: $PROJECT_DIR"
    echo "🌿 Branch: $GIT_BRANCH"
    echo ""
    
    check_environment
    pull_latest_changes
    check_pm2
    restart_pm2_processes
    show_status
    
    echo ""
    log_success "🎉 Deployment completed successfully!"
    log_info "🌐 Your application should now be running with the latest changes"
    log_info "📱 Including: AssureLife v0.1 branding and all UI improvements"
}

# Run main function
main "$@" 
