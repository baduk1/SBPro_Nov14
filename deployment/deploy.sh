#!/bin/bash

# ============================================================================
# SkyBuild Pro - Production Deployment Script
# ============================================================================
# This script automates the deployment of SkyBuild Pro to Ubuntu production server
#
# Usage: ./deploy.sh
#
# Requirements:
# - Ubuntu 22.04 LTS
# - Root or sudo access
# - Domain names configured (app.yourdomain.com, admin.yourdomain.com)
# ============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/opt/skybuild"
BACKEND_DIR="$PROJECT_DIR/backend"
USER_FRONTEND_DIR="$PROJECT_DIR/apps/user-frontend"
ADMIN_FRONTEND_DIR="$PROJECT_DIR/apps/admin-frontend"
SKYBUILD_USER="skybuild"
LOG_DIR="/var/log/skybuild"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Please run as root or with sudo"
        exit 1
    fi
}

# ============================================================================
# Step 1: System Preparation
# ============================================================================
setup_system() {
    log_info "Setting up system packages..."

    apt update
    apt install -y \
        python3.11 \
        python3.11-venv \
        python3-pip \
        nginx \
        postgresql \
        postgresql-contrib \
        certbot \
        python3-certbot-nginx \
        git \
        build-essential \
        curl \
        nodejs \
        npm \
        supervisor

    # Install Node.js 18 LTS
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs

    log_info "System packages installed"
}

# ============================================================================
# Step 2: Create User and Directories
# ============================================================================
setup_user_and_dirs() {
    log_info "Creating skybuild user and directories..."

    # Create user if doesn't exist
    if ! id "$SKYBUILD_USER" &>/dev/null; then
        useradd -r -s /bin/false -d $PROJECT_DIR $SKYBUILD_USER
        log_info "User $SKYBUILD_USER created"
    else
        log_warn "User $SKYBUILD_USER already exists"
    fi

    # Create directories
    mkdir -p $PROJECT_DIR
    mkdir -p $PROJECT_DIR/storage/{uploads,artifacts,config}
    mkdir -p $PROJECT_DIR/backups
    mkdir -p $LOG_DIR
    mkdir -p /run/skybuild

    # Set permissions
    chown -R $SKYBUILD_USER:$SKYBUILD_USER $PROJECT_DIR
    chown -R $SKYBUILD_USER:$SKYBUILD_USER $LOG_DIR
    chown -R $SKYBUILD_USER:$SKYBUILD_USER /run/skybuild

    chmod 750 $PROJECT_DIR/storage
    chmod 750 $PROJECT_DIR/backups

    log_info "Directories created and permissions set"
}

# ============================================================================
# Step 3: Clone Repository
# ============================================================================
clone_repository() {
    log_info "Cloning repository..."

    if [ -d "$PROJECT_DIR/.git" ]; then
        log_warn "Repository already exists, pulling latest changes..."
        cd $PROJECT_DIR
        sudo -u $SKYBUILD_USER git pull
    else
        log_info "Enter your repository URL:"
        read REPO_URL
        sudo -u $SKYBUILD_USER git clone $REPO_URL $PROJECT_DIR
    fi

    log_info "Repository cloned"
}

# ============================================================================
# Step 4: Setup Backend
# ============================================================================
setup_backend() {
    log_info "Setting up backend..."

    cd $BACKEND_DIR

    # Create virtual environment
    sudo -u $SKYBUILD_USER python3.11 -m venv venv

    # Install dependencies
    sudo -u $SKYBUILD_USER $BACKEND_DIR/venv/bin/pip install --upgrade pip
    sudo -u $SKYBUILD_USER $BACKEND_DIR/venv/bin/pip install -r requirements.txt
    sudo -u $SKYBUILD_USER $BACKEND_DIR/venv/bin/pip install gunicorn

    log_info "Backend dependencies installed"
}

# ============================================================================
# Step 5: Configure Environment
# ============================================================================
configure_environment() {
    log_info "Configuring environment..."

    if [ ! -f "$BACKEND_DIR/.env" ]; then
        log_warn ".env file not found. Creating from template..."
        cp $BACKEND_DIR/.env.production.template $BACKEND_DIR/.env

        # Generate secret key
        SECRET_KEY=$(openssl rand -hex 32)
        sed -i "s/CHANGE_ME_TO_SECURE_RANDOM_STRING_MIN_64_CHARS/$SECRET_KEY/" $BACKEND_DIR/.env

        log_warn "IMPORTANT: Edit $BACKEND_DIR/.env and configure:"
        log_warn "  - DB_URL"
        log_warn "  - SMTP_* (SendGrid credentials)"
        log_warn "  - FRONTEND_URL"
        log_warn "  - Domain names"

        read -p "Press enter after editing .env file..."
    fi

    chmod 600 $BACKEND_DIR/.env
    chown $SKYBUILD_USER:$SKYBUILD_USER $BACKEND_DIR/.env

    log_info "Environment configured"
}

# ============================================================================
# Step 6: Setup Database
# ============================================================================
setup_database() {
    log_info "Setting up database..."

    log_info "Choose database:"
    echo "1) PostgreSQL (recommended)"
    echo "2) SQLite (development only)"
    read -p "Enter choice (1 or 2): " DB_CHOICE

    if [ "$DB_CHOICE" = "1" ]; then
        log_info "Setting up PostgreSQL..."

        # Prompt for database details
        read -p "Enter database name [skybuild_prod]: " DB_NAME
        DB_NAME=${DB_NAME:-skybuild_prod}

        read -p "Enter database user [skybuild_user]: " DB_USER
        DB_USER=${DB_USER:-skybuild_user}

        read -sp "Enter database password: " DB_PASSWORD
        echo

        # Create database and user
        sudo -u postgres psql <<EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

        log_info "PostgreSQL database created"
        log_warn "Update DB_URL in .env to: postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
        read -p "Press enter after updating .env..."
    fi

    # Run migrations
    log_info "Running database migrations..."
    cd $BACKEND_DIR
    sudo -u $SKYBUILD_USER $BACKEND_DIR/venv/bin/python migrate_add_registration.py
    sudo -u $SKYBUILD_USER $BACKEND_DIR/venv/bin/python migrate_add_templates_estimates.py

    log_info "Database migrations completed"
}

# ============================================================================
# Step 7: Create Admin User
# ============================================================================
create_admin_user() {
    log_info "Creating admin user..."

    cd $BACKEND_DIR
    sudo -u $SKYBUILD_USER $BACKEND_DIR/venv/bin/python create_admin_user.py

    log_info "Admin user created"
}

# ============================================================================
# Step 8: Build Frontends
# ============================================================================
build_frontends() {
    log_info "Building frontends..."

    # Get production URLs
    read -p "Enter user app domain [app.yourdomain.com]: " USER_DOMAIN
    USER_DOMAIN=${USER_DOMAIN:-app.yourdomain.com}

    read -p "Enter admin app domain [admin.yourdomain.com]: " ADMIN_DOMAIN
    ADMIN_DOMAIN=${ADMIN_DOMAIN:-admin.yourdomain.com}

    API_URL="https://$USER_DOMAIN/api/v1"

    # Build user frontend
    log_info "Building user frontend..."
    cd $USER_FRONTEND_DIR
    sudo -u $SKYBUILD_USER bash -c "echo 'VITE_API_URL=$API_URL' > .env"
    sudo -u $SKYBUILD_USER npm ci
    sudo -u $SKYBUILD_USER npm run build

    # Build admin frontend
    log_info "Building admin frontend..."
    cd $ADMIN_FRONTEND_DIR
    sudo -u $SKYBUILD_USER bash -c "echo 'VITE_API_URL=$API_URL' > .env"
    sudo -u $SKYBUILD_USER npm ci
    sudo -u $SKYBUILD_USER npm run build

    log_info "Frontends built successfully"
}

# ============================================================================
# Step 9: Configure Nginx
# ============================================================================
configure_nginx() {
    log_info "Configuring Nginx..."

    # Add rate limit zone to nginx.conf if not already present
    if ! grep -q "limit_req_zone.*api_limit" /etc/nginx/nginx.conf; then
        log_info "Adding rate limit zone to nginx.conf..."
        sed -i '/http {/a \    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;' /etc/nginx/nginx.conf
    fi

    # Copy site configuration
    cp $PROJECT_DIR/deployment/nginx.conf /etc/nginx/sites-available/skybuild

    # Update domain names
    sed -i "s/app.yourdomain.com/$USER_DOMAIN/g" /etc/nginx/sites-available/skybuild
    sed -i "s/admin.yourdomain.com/$ADMIN_DOMAIN/g" /etc/nginx/sites-available/skybuild

    # Enable site
    ln -sf /etc/nginx/sites-available/skybuild /etc/nginx/sites-enabled/

    # Test configuration
    nginx -t

    log_info "Nginx configured"
}

# ============================================================================
# Step 10: Setup SSL with Certbot
# ============================================================================
setup_ssl() {
    log_info "Setting up SSL certificates..."

    read -p "Setup SSL now? (y/n): " SETUP_SSL

    if [ "$SETUP_SSL" = "y" ]; then
        read -p "Enter email for Let's Encrypt: " LE_EMAIL

        certbot --nginx -d $USER_DOMAIN -d $ADMIN_DOMAIN --email $LE_EMAIL --agree-tos --non-interactive

        # Auto-renewal
        systemctl enable certbot.timer
        systemctl start certbot.timer

        log_info "SSL certificates installed"
    else
        log_warn "Skipping SSL setup. Configure manually later with: certbot --nginx"
    fi
}

# ============================================================================
# Step 11: Setup Systemd Service
# ============================================================================
setup_systemd() {
    log_info "Setting up systemd service..."

    # Copy service file
    cp $PROJECT_DIR/deployment/skybuild-api.service /etc/systemd/system/

    # Reload systemd
    systemctl daemon-reload

    # Enable and start service
    systemctl enable skybuild-api
    systemctl start skybuild-api

    # Wait for service to start
    sleep 3

    # Check status
    if systemctl is-active --quiet skybuild-api; then
        log_info "Backend service started successfully"
    else
        log_error "Backend service failed to start"
        systemctl status skybuild-api
        exit 1
    fi
}

# ============================================================================
# Step 12: Setup Backups
# ============================================================================
setup_backups() {
    log_info "Setting up backups..."

    # Create backup script
    cat > /opt/skybuild/backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/opt/skybuild/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup database
pg_dump skybuild_prod > $BACKUP_DIR/db_$TIMESTAMP.sql

# Backup storage
tar -czf $BACKUP_DIR/storage_$TIMESTAMP.tar.gz /opt/skybuild/storage

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $TIMESTAMP"
EOF

    chmod +x /opt/skybuild/backup.sh
    chown $SKYBUILD_USER:$SKYBUILD_USER /opt/skybuild/backup.sh

    # Add cron job (daily at 2 AM)
    (crontab -u $SKYBUILD_USER -l 2>/dev/null; echo "0 2 * * * /opt/skybuild/backup.sh >> /var/log/skybuild/backup.log 2>&1") | crontab -u $SKYBUILD_USER -

    log_info "Backup cron job configured"
}

# ============================================================================
# Step 13: Final Checks
# ============================================================================
final_checks() {
    log_info "Running final checks..."

    # Check backend health
    sleep 2
    if curl -f http://localhost:8000/healthz &>/dev/null; then
        log_info "✓ Backend health check passed"
    else
        log_error "✗ Backend health check failed"
    fi

    # Check Nginx
    if systemctl is-active --quiet nginx; then
        log_info "✓ Nginx is running"
    else
        log_error "✗ Nginx is not running"
    fi

    # Check systemd service
    if systemctl is-active --quiet skybuild-api; then
        log_info "✓ Backend service is running"
    else
        log_error "✗ Backend service is not running"
    fi

    log_info ""
    log_info "=========================================="
    log_info "Deployment completed successfully!"
    log_info "=========================================="
    log_info ""
    log_info "User App: https://$USER_DOMAIN"
    log_info "Admin App: https://$ADMIN_DOMAIN"
    log_info ""
    log_info "View logs:"
    log_info "  Backend: journalctl -u skybuild-api -f"
    log_info "  Nginx: tail -f /var/log/nginx/skybuild-*"
    log_info ""
    log_info "Manage service:"
    log_info "  Status: systemctl status skybuild-api"
    log_info "  Restart: systemctl restart skybuild-api"
    log_info "  Stop: systemctl stop skybuild-api"
    log_info "=========================================="
}

# ============================================================================
# Main Execution
# ============================================================================
main() {
    log_info "Starting SkyBuild Pro deployment..."
    log_info "=========================================="

    check_root

    setup_system
    setup_user_and_dirs
    clone_repository
    setup_backend
    configure_environment
    setup_database
    create_admin_user
    build_frontends
    configure_nginx
    setup_ssl
    setup_systemd
    setup_backups
    final_checks
}

# Run main function
main "$@"
