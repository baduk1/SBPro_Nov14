# SkyBuild Pro - Setup Instructions
## Quick Start Guide - October 16, 2025

---

## 🚀 Step 1: Run Database Migration

The registration system requires database schema changes. Run this once:

```bash
cd /Users/commander/Code_Projects/skybuild_o1/backend

# If you have a virtual environment named 'env':
source env/bin/activate

# Or if it's named 'venv':
source venv/bin/activate

# Or if using system Python:
python3 migrate_add_registration.py
```

**Expected Output:**
```
=== Starting Migration: Add Registration Support ===
Adding email_verified column...
✅ email_verified added
Adding credits_balance column...
✅ credits_balance added
Adding full_name column...
✅ full_name added
Creating email_verification_tokens table...
✅ email_verification_tokens table created!
=== Migration Completed Successfully! ===
```

---

## 📧 Step 2: Configure Email (Optional for Development)

### For Development (Console Logging)
No configuration needed! Emails will be logged to the console when the backend runs.

### For Production (Real Emails)

Create or update `backend/.env`:

```bash
# SendGrid (Recommended - 40,000 free emails/month)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.your_api_key_here
SMTP_FROM_EMAIL=noreply@skybuild.io
SMTP_FROM_NAME=SkyBuild Pro
FRONTEND_URL=https://app.skybuild.io

# Or Gmail (Development)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your.email@gmail.com
# SMTP_PASSWORD=your_app_password
# SMTP_FROM_EMAIL=your.email@gmail.com
# FRONTEND_URL=http://localhost:5173
```

**SendGrid Setup:**
1. Sign up at https://sendgrid.com (free tier available)
2. Go to Settings → API Keys → Create API Key
3. Copy the key (starts with `SG.`)
4. Go to Settings → Sender Authentication → Verify single sender
5. Verify your email address
6. Add credentials to `.env`

---

## 🏃 Step 3: Start Backend

```bash
cd /Users/commander/Code_Projects/skybuild_o1/backend

# Activate virtual environment
source env/bin/activate  # or source venv/bin/activate

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

Backend now available at: http://localhost:8000

API Docs: http://localhost:8000/docs

---

## 🎨 Step 4: Start Frontend

Open a **new terminal**:

```bash
cd /Users/commander/Code_Projects/skybuild_o1/apps/user-frontend

# Install dependencies (if first time)
npm install

# Start development server
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

Frontend now available at: http://localhost:5173

---

## ✅ Step 5: Test Registration Flow

### 1. Visit Landing Page
Open browser: http://localhost:5173

### 2. Click "Start Free Trial"
Should navigate to: http://localhost:5173/app/signup

### 3. Fill Sign Up Form
- Email: test@example.com
- Full Name: Test User
- Password: password123
- Confirm Password: password123

### 4. Click "Create Account"
Should see: "Check Your Email" success screen

### 5. Check Email
**Development Mode:** Check backend console for email output
**Production Mode:** Check your inbox

### 6. Click Verification Link
URL format: `http://localhost:5173/verify-email?token=xxx`

Should see: "Email Verified!" success screen

### 7. Auto-Redirect to Sign In
After 3 seconds, redirects to sign in page

### 8. Sign In
- Email: test@example.com
- Password: password123

### 9. Check Dashboard
Should see:
- "Welcome back, Test User!"
- Green chip: "2,000 Credits"

---

## 🧪 API Testing (Optional)

### Test Registration Endpoint

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api-test@example.com",
    "password": "password123",
    "full_name": "API Test User"
  }'
```

**Expected Response:**
```json
{
  "id": "...",
  "email": "api-test@example.com",
  "role": "user",
  "email_verified": false,
  "credits_balance": 2000,
  "full_name": "API Test User"
}
```

### Get Verification Token (Development)

```bash
# SQLite
sqlite3 backend/boq.db "SELECT token FROM email_verification_tokens ORDER BY created_at DESC LIMIT 1;"

# Or check backend console logs
```

### Verify Email

```bash
curl -X POST "http://localhost:8000/api/v1/auth/verify-email?token=YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "message": "Email verified successfully",
  "email": "api-test@example.com"
}
```

---

## 🐛 Troubleshooting

### Migration Fails: "ModuleNotFoundError: No module named 'sqlalchemy'"

**Solution:** Activate virtual environment first
```bash
cd backend
source env/bin/activate  # or venv/bin/activate
python migrate_add_registration.py
```

### Backend Won't Start: "ModuleNotFoundError"

**Solution:** Install dependencies
```bash
cd backend
source env/bin/activate
pip install -r requirements.txt
```

### Frontend Won't Start: "Cannot find module"

**Solution:** Install dependencies
```bash
cd apps/user-frontend
npm install
```

### Emails Not Sending

**Development:** Check backend console for logged email content
**Production:**
1. Check SMTP credentials in `.env`
2. Check SendGrid dashboard for delivery logs
3. Check spam folder
4. Verify sender email is authenticated

### "Email already registered" Error

**Solution:** User already exists. Try different email or delete user:
```bash
sqlite3 backend/boq.db "DELETE FROM users WHERE email='test@example.com';"
```

### Verification Link Says "Token Expired"

**Solution:** Tokens expire after 24 hours. Request new verification email:
- Sign in page → Click "Resend Verification" (if available)
- Or use API: `POST /api/v1/auth/resend-verification?email=test@example.com`

### Credits Don't Show on Dashboard

**Solution:** Check user data is loading:
1. Open browser DevTools (F12)
2. Network tab → Look for call to `/api/v1/auth/me`
3. Check response includes `credits_balance`
4. If missing, migration didn't run correctly

---

## 📁 Important Files

**Backend:**
- `backend/migrate_add_registration.py` - Migration script (run once)
- `backend/app/models/user.py` - User model with new fields
- `backend/app/models/email_verification.py` - Verification tokens
- `backend/app/services/email.py` - Email sending service
- `backend/app/api/v1/endpoints/auth.py` - Registration endpoints
- `backend/.env` - Configuration (create if missing)

**Frontend:**
- `apps/user-frontend/src/pages/SignUp.tsx` - Sign up page
- `apps/user-frontend/src/pages/VerifyEmail.tsx` - Verification page
- `apps/user-frontend/src/pages/Dashboard.tsx` - Dashboard with credits
- `apps/user-frontend/src/services/api.ts` - API client

**Documentation:**
- `REGISTRATION_SYSTEM_IMPLEMENTATION_2025-10-16.md` - Complete implementation details
- `IMPLEMENTATION_PROGRESS_2025-10-16_175521.md` - Phase 0 & 1.1 summary
- `COMPREHENSIVE_AUDIT_AND_ROADMAP_2025-10-16_173017.md` - Full project audit

---

## 🎯 Quick Commands Reference

```bash
# Backend
cd backend
source env/bin/activate
python migrate_add_registration.py  # Run once
uvicorn app.main:app --reload       # Start server

# Frontend
cd apps/user-frontend
npm install          # First time only
npm run dev          # Start dev server

# Database
sqlite3 backend/boq.db
> SELECT * FROM users;
> SELECT * FROM email_verification_tokens;
> .quit

# Check logs
tail -f backend/logs/app.log  # If logging configured
```

---

## 🚢 Production Deployment

### Before Deploying:

1. ✅ Run migration on production database
2. ✅ Configure SMTP with production credentials
3. ✅ Update `FRONTEND_URL` to production domain
4. ✅ Set strong `SECRET_KEY` in backend `.env`
5. ✅ Enable HTTPS (required for secure cookies)
6. ✅ Test complete registration flow on staging first

### Environment Variables for Production:

```bash
# Backend .env
SECRET_KEY=your-super-secret-key-here-at-least-32-chars
DB_URL=postgresql://user:pass@host:5432/dbname  # Or keep SQLite
FRONTEND_URL=https://app.skybuild.io
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.production_key_here
SMTP_FROM_EMAIL=noreply@skybuild.io
```

---

## 📞 Need Help?

Check the detailed implementation guide:
`REGISTRATION_SYSTEM_IMPLEMENTATION_2025-10-16.md`

Or review the complete project audit:
`COMPREHENSIVE_AUDIT_AND_ROADMAP_2025-10-16_173017.md`

---

**Last Updated:** 2025-10-16
**Status:** ✅ Ready for Testing
