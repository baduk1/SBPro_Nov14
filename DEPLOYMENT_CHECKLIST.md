# 🚀 SkyBuild Pro - Production Deployment Checklist

**Date:** October 30, 2025  
**Version:** 1.0.0  
**Status:** ✅ Ready for Production

---

## 📋 Pre-Deployment Checklist

### ✅ Security (Phase 1 + P1)
- [x] Cross-tenant isolation (all endpoints verify ownership)
- [x] Atomic credits deduction (no race conditions)
- [x] Email verification throttle (60s server-side)
- [x] Production toggles (`create_all()` disabled, demo content guarded)
- [x] Upload validation (100MB limit + magic bytes)
- [x] Invite flow end-to-end (admin approve → user sets password)
- [x] No admin backdoors (`/seed-admin` removed/restricted)
- [x] No insecure scripts (`reset_password.py` deleted)

### ✅ Performance (P2)
- [x] FK indexes on all foreign keys (4 added)
- [x] CORS env-aware (localhost only in dev)
- [x] Landing page unified (LandingNew only)
- [x] Python cache cleaned (6157 .pyc removed)

### ✅ Code Quality
- [x] No duplicate file versions
- [x] Hardened versions verified (atomic credits, ownership checks)
- [x] All P0, P1 fixes committed
- [x] Git history clean

---

## 🔧 Environment Configuration

### Backend (.env)
```bash
# Environment
ENV=production

# Database
DB_URL=postgresql://skybuild_user:PASSWORD@localhost/skybuild_pro

# Security
SECRET_KEY=<STRONG_RANDOM_KEY>  # MUST be set
ACCESS_TOKEN_EXPIRE_MINUTES=1440  # 24 hours

# CORS
USER_APP_ORIGIN=https://skybuildpro.co.uk
ADMIN_APP_ORIGIN=https://admin.skybuildpro.co.uk

# Email (IONOS SMTP)
SMTP_HOST=smtp.ionos.co.uk
SMTP_PORT=587
SMTP_USER=<EMAIL>
SMTP_PASSWORD=<PASSWORD>
SMTP_FROM_EMAIL=noreply@skybuildpro.co.uk
SMTP_FROM_NAME=SkyBuild Pro
FRONTEND_URL=https://skybuildpro.co.uk

# Storage
STORAGE_DIR=/var/www/skybuild_storage
BACKUP_DIR=/var/www/skybuild_backups

# Credits
COST_PER_JOB=200
```

### Frontend (production build)
```bash
# User Frontend
VITE_API_URL=https://api.skybuildpro.co.uk

# Admin Frontend
VITE_API_URL=https://api.skybuildpro.co.uk
```

---

## 🗄️ Database Migrations

**Run in order:**

```bash
cd /root/skybuild_o1_production/backend
source .venv/bin/activate

# 1. Add throttle column
python migrate_add_throttle.py

# 2. Add FK indexes
python migrate_add_fk_indexes.py

# Verify
python -c "
from sqlalchemy import text
from app.db.session import engine
with engine.connect() as conn:
    # Check throttle column
    result = conn.execute(text('''
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_verification_sent_at'
    '''))
    print('✅ Throttle column:', 'EXISTS' if result.fetchone() else 'MISSING')
    
    # Check indexes
    result = conn.execute(text('''
        SELECT COUNT(*) FROM pg_indexes 
        WHERE indexname LIKE 'idx_%'
    '''))
    print(f'✅ FK indexes: {result.scalar()} created')
"
```

**Expected output:**
```
✅ Throttle column: EXISTS
✅ FK indexes: 4 created
```

---

## 🚀 Deployment Steps

### 1. Update Code
```bash
cd /root/skybuild_o1_production
git pull origin main
```

### 2. Run Migrations
```bash
cd backend
source .venv/bin/activate
python migrate_add_throttle.py
python migrate_add_fk_indexes.py
```

### 3. Build Frontend
```bash
# User Frontend
cd /root/skybuild_o1_production/apps/user-frontend
npm run build
# Output: dist/

# Admin Frontend
cd /root/skybuild_o1_production/apps/admin-frontend
npm run build
# Output: dist/
```

### 4. Deploy Frontend
```bash
# Copy to web server
sudo cp -r /root/skybuild_o1_production/apps/user-frontend/dist/* /var/www/skybuild_user/
sudo cp -r /root/skybuild_o1_production/apps/admin-frontend/dist/* /var/www/skybuild_admin/

# Verify permissions
sudo chown -R www-data:www-data /var/www/skybuild_user
sudo chown -R www-data:www-data /var/www/skybuild_admin
```

### 5. Restart Backend
```bash
sudo systemctl restart skybuild-backend.service
sudo systemctl status skybuild-backend.service
```

### 6. Verify Health
```bash
curl https://api.skybuildpro.co.uk/healthz
# Expected: {"ok": true}

curl https://api.skybuildpro.co.uk/api/v1/healthz  
# Check API health
```

---

## 🧪 Smoke Tests

### 1. Public Access
```bash
# Landing page
curl -I https://skybuildpro.co.uk
# Expected: 200 OK

# Access request form
curl https://skybuildpro.co.uk | grep "Request Access"
# Expected: Found
```

### 2. Authentication
**Test user registration:**
1. Go to https://skybuildpro.co.uk/app/signup
2. Enter email + password
3. Check inbox for verification email
4. Click link
5. Login successfully

**Expected:** ✅ Email received, login works

### 3. Invite Flow
**Admin approves access request:**
1. Admin: https://admin.skybuildpro.co.uk
2. Go to Access Requests
3. Click Approve (green checkmark)
4. User receives invite email
5. User clicks link → sets password
6. User logs in

**Expected:** ✅ Invite email sent, password set, login works

### 4. Upload & Process
**Test file upload:**
1. Login → Dashboard
2. Upload → Choose IFC file
3. Submit → Job created
4. Check job status
5. View results

**Expected:** ✅ Job completes, BOQ extracted

### 5. Resend Throttle
**Test email throttle:**
1. Fail to login (email not verified)
2. Click "Resend Verification Email"
3. Immediately click again
4. Should see: "Please wait X seconds..."

**Expected:** ✅ HTTP 429 on second request

### 6. Upload Validation
**Test magic bytes:**
1. Rename .txt file to .pdf
2. Try to upload
3. Should reject with "Invalid PDF file"

**Expected:** ✅ HTTP 400 error

---

## 📊 Monitoring

### Health Checks
```bash
# API health
watch -n 5 'curl -s https://api.skybuildpro.co.uk/healthz'

# Backend logs
sudo journalctl -u skybuild-backend.service -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Database
```bash
# Connect
psql -U skybuild_user -d skybuild_pro

# Check tables
\dt

# Check recent users
SELECT email, email_verified, credits_balance, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 10;

# Check jobs
SELECT id, status, progress, created_at 
FROM jobs 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🔒 Security Post-Deployment

### 1. Verify CORS
```bash
curl -H "Origin: http://localhost:5173" \
  -I https://api.skybuildpro.co.uk/api/v1/healthz

# Expected: No Access-Control-Allow-Origin (should block localhost in production)
```

### 2. Verify Admin Backdoor Removed
```bash
curl -X POST https://api.skybuildpro.co.uk/api/v1/auth/seed-admin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# Expected: 404 Not Found (route should not exist)
```

### 3. Test Cross-Tenant Isolation
**As User A:**
1. Login → Create project (note project_id)
2. Logout

**As User B:**
1. Login
2. Try to access User A's project: `/api/v1/projects/{user_a_project_id}`
3. Should return 404

**Expected:** ✅ No cross-tenant access

---

## 🚨 Rollback Plan

If issues arise:

```bash
# 1. Rollback code
cd /root/skybuild_o1_production
git log --oneline  # Find previous good commit
git checkout <PREVIOUS_COMMIT>

# 2. Rebuild frontend
cd apps/user-frontend && npm run build
cd ../admin-frontend && npm run build

# 3. Redeploy
sudo cp -r apps/user-frontend/dist/* /var/www/skybuild_user/
sudo cp -r apps/admin-frontend/dist/* /var/www/skybuild_admin/

# 4. Restart backend
sudo systemctl restart skybuild-backend.service

# 5. Rollback migrations (if needed)
# NOTE: Rollback migrations are risky - only if critical
# Better to fix forward
```

---

## 📞 Support Contacts

**System Owner:** [Your Name]  
**Email:** [your.email@skybuildpro.co.uk]  
**Emergency:** [Phone Number]

**Hosting:**
- Domain: Namecheap
- Email: IONOS
- Server: [VPS Provider]

---

## ✅ Final Verification

Before going live:

- [ ] All smoke tests passed
- [ ] CORS verified (no localhost in production)
- [ ] Admin backdoor confirmed removed
- [ ] Cross-tenant isolation tested
- [ ] Email sending works (verification + invite)
- [ ] Throttle prevents spam
- [ ] Upload validation blocks malicious files
- [ ] Database migrations successful
- [ ] Backup copy created (`skybuild_o1_m3_stable`)
- [ ] Monitoring dashboards configured
- [ ] Rollback plan documented

---

## 🎉 Go Live!

When all checks pass:

```bash
# Update DNS (if needed)
# A record: skybuildpro.co.uk → [SERVER_IP]
# A record: admin.skybuildpro.co.uk → [SERVER_IP]
# A record: api.skybuildpro.co.uk → [SERVER_IP]

# Verify DNS propagation
dig skybuildpro.co.uk
dig admin.skybuildpro.co.uk
dig api.skybuildpro.co.uk

# Test from external network
curl https://skybuildpro.co.uk
```

**System is LIVE!** 🚀

---

**Document Version:** 1.0  
**Last Updated:** October 30, 2025  
**Status:** ✅ Production Ready

