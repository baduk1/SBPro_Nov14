# SkyBuild Pro - Production Deployment Guide

This guide covers production deployment for SkyBuild Pro using Docker, systemd, or manual setup.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Option 1: Docker Deployment (Recommended)](#option-1-docker-deployment-recommended)
- [Option 2: Manual Deployment](#option-2-manual-deployment)
- [Option 3: Systemd Services](#option-3-systemd-services)
- [Database Setup](#database-setup)
- [Nginx Configuration](#nginx-configuration)
- [SSL/TLS Setup](#ssltls-setup)
- [Environment Security](#environment-security)
- [Monitoring & Logs](#monitoring--logs)
- [Backup & Recovery](#backup--recovery)

---

## Prerequisites

### System Requirements

- **OS**: Ubuntu 22.04 LTS (recommended) or similar Linux distribution
- **RAM**: Minimum 2GB, recommended 4GB+
- **CPU**: 2+ cores
- **Disk**: 20GB+ available space
- **Domain**: Configured domain pointing to your server IP

### Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essentials
sudo apt install -y curl git nginx certbot python3-certbot-nginx

# Install Docker (Option 1)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# OR Install Node.js + Python (Option 2/3)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs python3.11 python3.11-venv python3-pip
```

---

## Option 1: Docker Deployment (Recommended)

### 1. Create Docker Files

**Backend Dockerfile** (`backend/Dockerfile`):

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create storage directory
RUN mkdir -p /app/storage

# Run migrations (will be executed on startup)
RUN chmod +x /app/migrate_add_registration.py /app/migrate_add_templates_estimates.py

# Expose port
EXPOSE 8000

# Start application
CMD ["sh", "-c", "python migrate_add_registration.py && python migrate_add_templates_estimates.py && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```

**Frontend Dockerfile** (`apps/user-frontend/Dockerfile`):

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build for production
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Production image with nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Frontend nginx.conf** (`apps/user-frontend/nginx.conf`):

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 2. Create Docker Compose

**docker-compose.yml** (root directory):

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: skybuild-postgres
    environment:
      POSTGRES_DB: skybuild
      POSTGRES_USER: skybuild
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - skybuild-network
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: skybuild-backend
    environment:
      SECRET_KEY: ${SECRET_KEY}
      DB_URL: postgresql://skybuild:${DB_PASSWORD}@postgres:5432/skybuild
      SENDGRID_API_KEY: ${SENDGRID_API_KEY}
      FROM_EMAIL: ${FROM_EMAIL}
      USER_APP_ORIGIN: https://${DOMAIN}
      STORAGE_DIR: /app/storage
    volumes:
      - backend_storage:/app/storage
    depends_on:
      - postgres
    networks:
      - skybuild-network
    restart: unless-stopped
    ports:
      - "8000:8000"

  frontend:
    build:
      context: ./apps/user-frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: https://api.${DOMAIN}/api/v1
    container_name: skybuild-frontend
    networks:
      - skybuild-network
    restart: unless-stopped
    ports:
      - "3000:80"

volumes:
  postgres_data:
  backend_storage:

networks:
  skybuild-network:
    driver: bridge
```

### 3. Environment Configuration

Create `.env` in root directory:

```bash
# Domain
DOMAIN=yourdomain.com

# Security
SECRET_KEY=your-super-secret-key-minimum-32-characters-long-random-string
DB_PASSWORD=strong-database-password-here

# Email (SendGrid)
SENDGRID_API_KEY=SG.your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
```

### 4. Deploy

```bash
# Load environment variables
source .env

# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 5. Update/Redeploy

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Clean up old images
docker system prune -a
```

---

## Option 2: Manual Deployment

### 1. Setup Backend

```bash
# Clone repository
git clone <repository-url>
cd skybuild_o1/backend

# Create production user
sudo useradd -m -s /bin/bash skybuild
sudo su - skybuild

# Setup Python environment
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run migrations
python migrate_add_registration.py
python migrate_add_templates_estimates.py

# Create production environment file
cat > /home/skybuild/.env << EOF
SECRET_KEY=your-super-secret-key-minimum-32-characters
DB_URL=postgresql://skybuild:password@localhost/skybuild
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
STORAGE_DIR=/home/skybuild/storage
USER_APP_ORIGIN=https://yourdomain.com
EOF

# Create storage directory
mkdir -p /home/skybuild/storage
```

### 2. Setup Frontend

```bash
cd apps/user-frontend

# Install dependencies
npm ci --production

# Create production environment
cat > .env << EOF
VITE_API_URL=https://api.yourdomain.com/api/v1
EOF

# Build for production
npm run build

# Deploy built files to nginx
sudo mkdir -p /var/www/skybuild
sudo cp -r dist/* /var/www/skybuild/
sudo chown -R www-data:www-data /var/www/skybuild
```

---

## Option 3: Systemd Services

### Backend Service

Create `/etc/systemd/system/skybuild-backend.service`:

```ini
[Unit]
Description=SkyBuild Pro Backend (FastAPI)
After=network.target postgresql.service

[Service]
Type=simple
User=skybuild
Group=skybuild
WorkingDirectory=/home/skybuild/skybuild_o1/backend
Environment="PATH=/home/skybuild/venv/bin"
EnvironmentFile=/home/skybuild/.env
ExecStart=/home/skybuild/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=10

# Security
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### Start Services

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable and start backend
sudo systemctl enable skybuild-backend
sudo systemctl start skybuild-backend

# Check status
sudo systemctl status skybuild-backend

# View logs
sudo journalctl -u skybuild-backend -f
```

---

## Database Setup

### PostgreSQL Installation

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE skybuild;
CREATE USER skybuild WITH PASSWORD 'your-strong-password';
GRANT ALL PRIVILEGES ON DATABASE skybuild TO skybuild;
\q
EOF
```

### Database Backups

```bash
# Create backup script
cat > /home/skybuild/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/skybuild/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -h localhost -U skybuild skybuild | gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# Backup storage
tar -czf $BACKUP_DIR/storage_$TIMESTAMP.tar.gz /home/skybuild/storage

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $TIMESTAMP"
EOF

chmod +x /home/skybuild/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/skybuild/backup.sh") | crontab -
```

---

## Nginx Configuration

### Rate Limiting Setup (CRITICAL - Do This First!)

**IMPORTANT**: Before creating the site config, add rate limiting zone to the main Nginx config:

```bash
# Edit /etc/nginx/nginx.conf
sudo nano /etc/nginx/nginx.conf

# Add this line INSIDE the http{} block (NOT in server{} block):
http {
    ...existing config...

    # Rate limiting zone (ADD THIS LINE)
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    ...rest of config...
}

# Save and test
sudo nginx -t
```

### Reverse Proxy Setup

Create `/etc/nginx/sites-available/skybuild`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com api.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# Frontend - Main domain
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com;

    # SSL certificates (will be configured by certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    root /var/www/skybuild;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}

# Backend - API subdomain
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Proxy to backend
    location / {
        # Rate limiting (zone must be defined in /etc/nginx/nginx.conf http{} block)
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for long-running requests
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
}
```

### Enable Configuration

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/skybuild /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## SSL/TLS Setup

### Let's Encrypt with Certbot

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate (interactive)
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com

# OR non-interactive
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com \
  --non-interactive --agree-tos --email admin@yourdomain.com

# Test automatic renewal
sudo certbot renew --dry-run

# Certbot will automatically setup renewal cron job
```

---

## Environment Security

### 1. Secure Environment Files

```bash
# Restrict .env file permissions
chmod 600 /home/skybuild/.env
chown skybuild:skybuild /home/skybuild/.env

# Never commit .env to git
echo ".env" >> .gitignore
```

### 2. Generate Strong Secret Key

```python
# Generate secure SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

### 3. Firewall Configuration

```bash
# Install UFW
sudo apt install -y ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 4. Fail2Ban (Optional)

```bash
# Install fail2ban
sudo apt install -y fail2ban

# Configure
sudo cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
EOF

# Restart
sudo systemctl restart fail2ban
```

---

## Monitoring & Logs

### Application Logs

```bash
# Backend logs (systemd)
sudo journalctl -u skybuild-backend -f

# Backend logs (Docker)
docker-compose logs -f backend

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Health Checks

```bash
# Backend health check
curl http://localhost:8000/healthz

# Check from outside
curl https://api.yourdomain.com/healthz
```

### Monitoring Setup (Optional)

Consider setting up:
- **Prometheus + Grafana**: Metrics and dashboards
- **Sentry**: Error tracking
- **Uptime Robot**: Uptime monitoring
- **CloudWatch/DataDog**: Log aggregation

---

## Backup & Recovery

### Backup Strategy

1. **Database**: Daily automated backups (see Database Backups section)
2. **Storage**: Daily file backups
3. **Configuration**: Version controlled in git
4. **Offsite**: Copy backups to S3/Backblaze/etc.

### Backup to S3 (Optional)

```bash
# Install AWS CLI
sudo apt install -y awscli

# Configure credentials
aws configure

# Sync backups to S3
cat > /home/skybuild/sync-to-s3.sh << 'EOF'
#!/bin/bash
aws s3 sync /home/skybuild/backups s3://your-bucket/skybuild-backups/ \
  --storage-class STANDARD_IA \
  --delete
EOF

chmod +x /home/skybuild/sync-to-s3.sh

# Add to crontab (after backup)
(crontab -l; echo "30 2 * * * /home/skybuild/sync-to-s3.sh") | crontab -
```

### Recovery Process

```bash
# 1. Restore database
gunzip -c /home/skybuild/backups/db_YYYYMMDD_HHMMSS.sql.gz | \
  psql -h localhost -U skybuild skybuild

# 2. Restore storage
tar -xzf /home/skybuild/backups/storage_YYYYMMDD_HHMMSS.tar.gz -C /

# 3. Restart services
sudo systemctl restart skybuild-backend
```

---

## Performance Optimization

### 1. Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_estimates_user_id ON estimates(user_id);
CREATE INDEX idx_jobs_project_id ON jobs(project_id);
CREATE INDEX idx_boq_items_job_id ON boq_items(job_id);
```

### 2. Gunicorn for Production

Replace uvicorn with Gunicorn + uvicorn workers:

```bash
pip install gunicorn

# Update systemd service
ExecStart=/home/skybuild/venv/bin/gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 300
```

### 3. Redis Caching (Optional)

```bash
# Install Redis
sudo apt install -y redis-server

# Configure backend to use Redis for caching
# Add to requirements.txt: redis==5.0.0
# Add to app/core/config.py: REDIS_URL = "redis://localhost:6379"
```

---

## Troubleshooting

### Service won't start

```bash
# Check logs
sudo journalctl -u skybuild-backend -n 50

# Verify environment
sudo -u skybuild env

# Test manually
sudo -u skybuild /home/skybuild/venv/bin/uvicorn app.main:app
```

### Database connection failed

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U skybuild -d skybuild

# Check database URL in .env
cat /home/skybuild/.env | grep DB_URL
```

### High memory usage

```bash
# Check processes
htop

# Reduce workers in systemd service
# --workers 2 instead of 4

# Add swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## Security Checklist

- [ ] Strong SECRET_KEY (64+ characters)
- [ ] Database password changed from default
- [ ] .env files have 600 permissions
- [ ] Firewall configured (UFW)
- [ ] SSL/TLS enabled (Let's Encrypt)
- [ ] Fail2Ban configured
- [ ] Regular backups automated
- [ ] Log monitoring in place
- [ ] Security headers configured in Nginx
- [ ] Application updates applied regularly

---

## Maintenance

### Regular Tasks

**Weekly:**
- Check application logs for errors
- Review disk space usage
- Monitor backup success

**Monthly:**
- Apply system updates: `sudo apt update && sudo apt upgrade`
- Review and rotate logs
- Test backup restoration
- Review security advisories

**Quarterly:**
- Audit user accounts
- Review and update dependencies
- Performance optimization review
- Security audit

---

## Support

For deployment issues:
1. Check logs (backend, nginx, systemd)
2. Review this guide's troubleshooting section
3. Verify all prerequisites are met
4. Contact: devops@skybuild.pro
