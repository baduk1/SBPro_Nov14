# SkyBuild Pro - Environment Configuration Guide

Complete guide for configuring environment variables across all deployment scenarios.

## Table of Contents

- [Overview](#overview)
- [Backend Environment Variables](#backend-environment-variables)
- [Frontend Environment Variables](#frontend-environment-variables)
- [Development Setup](#development-setup)
- [Production Setup](#production-setup)
- [Docker Setup](#docker-setup)
- [Environment Security](#environment-security)
- [Troubleshooting](#troubleshooting)

---

## Overview

SkyBuild Pro uses environment variables for configuration across different environments:

- **Development**: `.env` files for local development
- **Production**: System environment variables or `.env` files with restricted permissions
- **Docker**: Environment variables passed via docker-compose or Kubernetes

### Environment Files Location

```
skybuild_o1/
├── backend/.env              # Backend environment (development)
├── apps/user-frontend/.env   # Frontend environment (development)
└── .env                      # Docker Compose environment (production)
```

---

## Backend Environment Variables

### Required Variables

These variables **must** be set for the backend to function:

```bash
# Security - REQUIRED
SECRET_KEY=your-super-secret-key-minimum-32-characters-use-random-string

# Email Service - REQUIRED for registration
SENDGRID_API_KEY=SG.your-sendgrid-api-key-from-dashboard
FROM_EMAIL=noreply@yourdomain.com
```

### Optional Variables with Defaults

```bash
# Database URL (default: SQLite in backend directory)
# For PostgreSQL:
DB_URL=postgresql://username:password@localhost:5432/skybuild
# For MySQL:
# DB_URL=mysql+pymysql://username:password@localhost:3306/skybuild

# Storage directory (default: ./storage)
STORAGE_DIR=/absolute/path/to/storage

# CORS Origins (defaults provided)
USER_APP_ORIGIN=http://localhost:5173
ADMIN_APP_ORIGIN=http://localhost:5174
BACKEND_CORS_ORIGINS=http://localhost:5173,http://localhost:5174

# Email verification URL (default: http://localhost:5173/verify-email)
VERIFY_EMAIL_URL=https://yourdomain.com/verify-email

# API prefix (default: /api/v1)
API_V1_PREFIX=/api/v1

# Application name (default: SkyBuild Pro API)
PROJECT_NAME=SkyBuild Pro API
```

### Advanced Configuration

```bash
# Redis (optional - for caching)
REDIS_URL=redis://localhost:6379/0

# Sentry (optional - for error tracking)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Log level (default: INFO)
LOG_LEVEL=DEBUG  # Options: DEBUG, INFO, WARNING, ERROR, CRITICAL

# Rate limiting (defaults in code)
RATE_LIMIT_CALLS=100    # Requests per period
RATE_LIMIT_PERIOD=60    # Period in seconds

# JWT Configuration (defaults provided)
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080  # 7 days
```

### Complete Backend .env Example

**Development** (`backend/.env`):

```bash
# ======================
# REQUIRED SETTINGS
# ======================
SECRET_KEY=dev-secret-key-change-in-production-min-32-chars
SENDGRID_API_KEY=SG.your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com

# ======================
# DATABASE
# ======================
# Leave commented for SQLite (default)
# DB_URL=postgresql://skybuild:password@localhost:5432/skybuild

# ======================
# STORAGE
# ======================
STORAGE_DIR=./storage

# ======================
# CORS (Development)
# ======================
USER_APP_ORIGIN=http://localhost:5173
ADMIN_APP_ORIGIN=http://localhost:5174
BACKEND_CORS_ORIGINS=http://localhost:5173,http://localhost:5174

# ======================
# EMAIL
# ======================
VERIFY_EMAIL_URL=http://localhost:5173/verify-email

# ======================
# OPTIONAL
# ======================
# LOG_LEVEL=DEBUG
# REDIS_URL=redis://localhost:6379/0
# SENTRY_DSN=
```

**Production** (`/home/skybuild/.env` or similar):

```bash
# ======================
# REQUIRED SETTINGS
# ======================
SECRET_KEY=prod-secret-key-use-64-random-characters-see-generation-below
SENDGRID_API_KEY=SG.real-production-sendgrid-key
FROM_EMAIL=noreply@yourdomain.com

# ======================
# DATABASE (Production)
# ======================
DB_URL=postgresql://skybuild:strong-db-password@localhost:5432/skybuild

# ======================
# STORAGE
# ======================
STORAGE_DIR=/home/skybuild/storage

# ======================
# CORS (Production)
# ======================
USER_APP_ORIGIN=https://yourdomain.com
ADMIN_APP_ORIGIN=https://admin.yourdomain.com
BACKEND_CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com

# ======================
# EMAIL
# ======================
VERIFY_EMAIL_URL=https://yourdomain.com/verify-email

# ======================
# MONITORING (Optional)
# ======================
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
LOG_LEVEL=INFO

# ======================
# CACHING (Optional)
# ======================
REDIS_URL=redis://localhost:6379/0
```

---

## Frontend Environment Variables

### Required Variables

```bash
# Backend API URL - REQUIRED
VITE_API_URL=http://localhost:8000/api/v1
```

### Complete Frontend .env Example

**Development** (`apps/user-frontend/.env`):

```bash
# Backend API URL (development)
VITE_API_URL=http://localhost:8000/api/v1

# Optional: Enable debug mode
# VITE_DEBUG=true
```

**Production** (Build-time - set before `npm run build`):

```bash
# Backend API URL (production)
VITE_API_URL=https://api.yourdomain.com/api/v1

# Optional: Analytics
# VITE_GA_ID=G-XXXXXXXXXX
# VITE_SENTRY_DSN=https://your-frontend-sentry-dsn
```

**Important Notes:**
- Vite environment variables must be prefixed with `VITE_`
- These variables are embedded at **build time**, not runtime
- Rebuild frontend after changing environment variables: `npm run build`

---

## Development Setup

### Step-by-Step Development Configuration

#### 1. Backend Development

```bash
cd backend

# Create .env file
cat > .env << 'EOF'
SECRET_KEY=dev-secret-key-for-local-development-min-32-chars
SENDGRID_API_KEY=SG.your-sendgrid-test-key
FROM_EMAIL=dev@localhost.local
STORAGE_DIR=./storage
USER_APP_ORIGIN=http://localhost:5173
VERIFY_EMAIL_URL=http://localhost:5173/verify-email
LOG_LEVEL=DEBUG
EOF

# Verify environment
python -c "from app.core.config import settings; print(f'Secret Key length: {len(settings.SECRET_KEY)}')"

# Start development server
source venv/bin/activate
uvicorn app.main:app --reload
```

#### 2. Frontend Development

```bash
cd apps/user-frontend

# Create .env file
echo "VITE_API_URL=http://localhost:8000/api/v1" > .env

# Verify environment
cat .env

# Start development server
npm run dev
```

#### 3. Verify Configuration

```bash
# Test backend health
curl http://localhost:8000/healthz

# Test backend API docs
open http://localhost:8000/api/v1/docs

# Test frontend
open http://localhost:5173
```

---

## Production Setup

### Option 1: Systemd with .env File

```bash
# Create production .env file
sudo cat > /home/skybuild/.env << 'EOF'
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")
SENDGRID_API_KEY=SG.production-key
FROM_EMAIL=noreply@yourdomain.com
DB_URL=postgresql://skybuild:secure-password@localhost:5432/skybuild
STORAGE_DIR=/home/skybuild/storage
USER_APP_ORIGIN=https://yourdomain.com
VERIFY_EMAIL_URL=https://yourdomain.com/verify-email
LOG_LEVEL=INFO
EOF

# Secure the file
sudo chown skybuild:skybuild /home/skybuild/.env
sudo chmod 600 /home/skybuild/.env

# Reference in systemd service
# Add to /etc/systemd/system/skybuild-backend.service:
# EnvironmentFile=/home/skybuild/.env
```

### Option 2: Export System Variables

```bash
# Add to /etc/environment or user profile
export SECRET_KEY="your-64-char-secret-key"
export SENDGRID_API_KEY="SG.your-key"
export FROM_EMAIL="noreply@yourdomain.com"
export DB_URL="postgresql://skybuild:password@localhost:5432/skybuild"
export STORAGE_DIR="/home/skybuild/storage"
export USER_APP_ORIGIN="https://yourdomain.com"

# Reload environment
source /etc/environment
```

---

## Docker Setup

### Docker Compose Environment

**Root `.env` file** (for docker-compose):

```bash
# Domain
DOMAIN=yourdomain.com

# Security
SECRET_KEY=your-super-secret-production-key-64-characters-minimum
DB_PASSWORD=strong-database-password-for-postgres

# Email
SENDGRID_API_KEY=SG.your-production-sendgrid-key
FROM_EMAIL=noreply@yourdomain.com

# Optional
# SENTRY_DSN=
# REDIS_URL=redis://redis:6379/0
```

**Usage in docker-compose.yml**:

```yaml
services:
  backend:
    environment:
      SECRET_KEY: ${SECRET_KEY}
      DB_URL: postgresql://skybuild:${DB_PASSWORD}@postgres:5432/skybuild
      SENDGRID_API_KEY: ${SENDGRID_API_KEY}
      FROM_EMAIL: ${FROM_EMAIL}
      USER_APP_ORIGIN: https://${DOMAIN}

  frontend:
    build:
      args:
        VITE_API_URL: https://api.${DOMAIN}/api/v1
```

### Kubernetes Secrets (Advanced)

```bash
# Create secret from literals
kubectl create secret generic skybuild-secrets \
  --from-literal=secret-key='your-secret-key' \
  --from-literal=db-password='your-db-password' \
  --from-literal=sendgrid-api-key='SG.your-key'

# Reference in deployment
# env:
#   - name: SECRET_KEY
#     valueFrom:
#       secretKeyRef:
#         name: skybuild-secrets
#         key: secret-key
```

---

## Environment Security

### 1. Generate Secure SECRET_KEY

```bash
# Method 1: Python
python3 -c "import secrets; print(secrets.token_urlsafe(64))"

# Method 2: OpenSSL
openssl rand -base64 64 | tr -d '\n'

# Method 3: /dev/urandom
head -c 64 /dev/urandom | base64 | tr -d '\n'
```

**Result example:**
```
7A8mNp2vQxR4sT1wY9zB3cD5eF6gH8iJ0kL2mN4oP6qR8sT0uV2wX4yZ6aB8cD0eF
```

### 2. Secure .env Files

```bash
# Set restrictive permissions (owner read/write only)
chmod 600 .env
chown $USER:$GROUP .env

# Verify permissions
ls -la .env
# Should show: -rw------- 1 user group

# Never commit to git
echo ".env" >> .gitignore
echo "*.env" >> .gitignore
echo "!.env.example" >> .gitignore
```

### 3. Environment File Templates

Create `.env.example` files (without sensitive values):

**backend/.env.example**:
```bash
# Required
SECRET_KEY=generate-using-command-in-docs
SENDGRID_API_KEY=SG.get-from-sendgrid-dashboard
FROM_EMAIL=noreply@example.com

# Optional
DB_URL=postgresql://user:pass@localhost/dbname
STORAGE_DIR=./storage
USER_APP_ORIGIN=http://localhost:5173
```

### 4. Validation on Startup

The application validates critical environment variables on startup:

```python
# In backend/app/main.py
if not settings.SECRET_KEY or settings.SECRET_KEY.strip() in ("", "CHANGE_ME_SUPER_SECRET"):
    raise RuntimeError("SECRET_KEY must be set via env")
```

---

## SendGrid Configuration

### 1. Create SendGrid Account

1. Go to [SendGrid.com](https://sendgrid.com/)
2. Sign up for free account (100 emails/day free tier)
3. Verify your email address

### 2. Create API Key

```
Settings → API Keys → Create API Key
Name: SkyBuild Pro Production
Permissions: Full Access (or Mail Send only)
```

Copy the key (starts with `SG.`):
```
SG.abcdefgh123456789.xyzABCDEF-1234567890abcdefghijklmnopqrstuvwxyz
```

### 3. Verify Sender Email

```
Settings → Sender Authentication → Verify a Single Sender
Email: noreply@yourdomain.com
```

Or for domain verification:
```
Settings → Sender Authentication → Authenticate Your Domain
Domain: yourdomain.com
```

### 4. Set Environment Variables

```bash
export SENDGRID_API_KEY="SG.your-key-from-step-2"
export FROM_EMAIL="noreply@yourdomain.com"
```

### 5. Test Email Sending

```bash
# From backend directory
python3 << 'EOF'
from app.services.email import send_verification_email
from app.core.config import settings

# Test configuration
print(f"API Key: {settings.SENDGRID_API_KEY[:10]}...")
print(f"From Email: {settings.FROM_EMAIL}")

# Uncomment to send test email:
# send_verification_email("your-test@email.com", "test-token-123")
EOF
```

---

## Troubleshooting

### Backend: SECRET_KEY Error

**Error:** `RuntimeError: SECRET_KEY must be set via env`

**Solution:**
```bash
# Check if SECRET_KEY is set
echo $SECRET_KEY

# Generate and set SECRET_KEY
export SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")

# Verify
python3 -c "from app.core.config import settings; print(f'Length: {len(settings.SECRET_KEY)}')"
```

### Backend: Database Connection Failed

**Error:** `sqlalchemy.exc.OperationalError: could not connect to server`

**Solution:**
```bash
# Check DB_URL format
echo $DB_URL

# Test PostgreSQL connection
psql "$DB_URL"

# Verify PostgreSQL is running
sudo systemctl status postgresql

# Check credentials
sudo -u postgres psql -c "\du"
```

### Frontend: API Connection Failed

**Error:** `Network Error` or `CORS Error` in browser console

**Solution:**
```bash
# 1. Check VITE_API_URL
cat apps/user-frontend/.env

# 2. Verify backend is running
curl http://localhost:8000/healthz

# 3. Check CORS settings in backend
# Ensure USER_APP_ORIGIN matches frontend URL
echo $USER_APP_ORIGIN

# 4. Rebuild frontend after .env changes
cd apps/user-frontend
npm run build
```

### Email Not Sending

**Error:** `sendgrid.exceptions.UnauthorizedError: HTTP Error 401: Unauthorized`

**Solution:**
```bash
# 1. Verify API key
echo $SENDGRID_API_KEY
# Should start with "SG."

# 2. Check sender verification in SendGrid dashboard

# 3. Test API key with curl
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{"to": [{"email": "test@example.com"}]}],
    "from": {"email": "'"$FROM_EMAIL"'"},
    "subject": "Test",
    "content": [{"type": "text/plain", "value": "Test"}]
  }'
```

### Docker: Environment Variables Not Loading

**Solution:**
```bash
# 1. Check .env file exists in root
ls -la .env

# 2. Verify docker-compose references .env
grep -A5 'environment:' docker-compose.yml

# 3. Rebuild with --build flag
docker-compose down
docker-compose up -d --build

# 4. Verify variables inside container
docker-compose exec backend env | grep SECRET_KEY
```

---

## Environment Variables Reference

### Backend Variables (Complete List)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | ✅ Yes | None | JWT signing key (min 32 chars) |
| `SENDGRID_API_KEY` | ✅ Yes | None | SendGrid API key for emails |
| `FROM_EMAIL` | ✅ Yes | None | Sender email address |
| `DB_URL` | No | SQLite | Database connection URL |
| `STORAGE_DIR` | No | `./storage` | File storage directory |
| `USER_APP_ORIGIN` | No | `http://localhost:5173` | Frontend origin for CORS |
| `ADMIN_APP_ORIGIN` | No | `http://localhost:5174` | Admin frontend origin |
| `BACKEND_CORS_ORIGINS` | No | Computed | Comma-separated CORS origins |
| `VERIFY_EMAIL_URL` | No | `http://localhost:5173/verify-email` | Email verification URL |
| `API_V1_PREFIX` | No | `/api/v1` | API route prefix |
| `PROJECT_NAME` | No | `SkyBuild Pro API` | Application name |
| `LOG_LEVEL` | No | `INFO` | Logging level |
| `REDIS_URL` | No | None | Redis connection for caching |
| `SENTRY_DSN` | No | None | Sentry error tracking DSN |
| `RATE_LIMIT_CALLS` | No | `100` | Rate limit requests |
| `RATE_LIMIT_PERIOD` | No | `60` | Rate limit period (seconds) |
| `JWT_ALGORITHM` | No | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `10080` | Token expiry (7 days) |

### Frontend Variables (Complete List)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | ✅ Yes | None | Backend API base URL |
| `VITE_DEBUG` | No | `false` | Enable debug logging |
| `VITE_GA_ID` | No | None | Google Analytics ID |
| `VITE_SENTRY_DSN` | No | None | Sentry DSN for frontend errors |

---

## Best Practices

### ✅ Do:
- Generate strong, random SECRET_KEY (64+ characters)
- Use different SECRET_KEY for dev/prod
- Store .env files outside web root
- Set restrictive permissions (600) on .env files
- Use environment-specific configurations
- Validate required variables on startup
- Document all variables in .env.example
- Use secrets management in production (Vault, AWS Secrets Manager)

### ❌ Don't:
- Commit .env files to version control
- Use simple/guessable SECRET_KEY
- Share production credentials in Slack/email
- Use production API keys in development
- Hardcode sensitive values in code
- Use same database for dev/prod
- Leave default passwords

---

## Migration Between Environments

### Development → Staging

```bash
# 1. Copy .env.example
cp backend/.env.example backend/.env.staging

# 2. Generate new SECRET_KEY for staging
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")
echo "SECRET_KEY=$SECRET_KEY" >> backend/.env.staging

# 3. Update other variables
# Edit backend/.env.staging with staging-specific values
```

### Staging → Production

```bash
# 1. Generate production secrets
PROD_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")
PROD_DB_PASS=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

# 2. Create production .env
cat > /home/skybuild/.env << EOF
SECRET_KEY=$PROD_SECRET
DB_PASSWORD=$PROD_DB_PASS
SENDGRID_API_KEY=SG.production-key
FROM_EMAIL=noreply@yourdomain.com
DB_URL=postgresql://skybuild:$PROD_DB_PASS@localhost:5432/skybuild
USER_APP_ORIGIN=https://yourdomain.com
EOF

# 3. Secure
chmod 600 /home/skybuild/.env
chown skybuild:skybuild /home/skybuild/.env
```

---

## Quick Reference

### Generate All Required Secrets

```bash
#!/bin/bash
# generate-secrets.sh

echo "=== SkyBuild Pro Secret Generation ==="
echo ""

# SECRET_KEY
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")
echo "SECRET_KEY=$SECRET_KEY"
echo ""

# DB Password
DB_PASS=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
echo "DB_PASSWORD=$DB_PASS"
echo ""

echo "=== Add these to your .env file ==="
echo "Then set SENDGRID_API_KEY and FROM_EMAIL manually"
```

### Validate Configuration

```bash
#!/bin/bash
# validate-env.sh

echo "=== Backend Environment Validation ==="
cd backend

# Check required variables
required_vars=("SECRET_KEY" "SENDGRID_API_KEY" "FROM_EMAIL")

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ $var is not set"
    else
        echo "✅ $var is set"
    fi
done

# Test backend startup
python3 -c "from app.core.config import settings; print('✅ Configuration valid')" || echo "❌ Configuration invalid"
```

---

## Support

For environment configuration issues:
1. Check this guide's troubleshooting section
2. Verify all required variables are set
3. Review application logs for specific error messages
4. Contact: support@skybuild.pro
