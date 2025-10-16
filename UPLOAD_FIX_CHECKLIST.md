# Upload Fix Checklist - Quick Debug Guide

## Problem: File upload not working (404/Not Found errors)

### Step 1: Check API version mismatch

**Symptom:** Browser console shows `POST /api/v2/... 404 Not Found`

**Fix:**
1. Create `.env` file in frontend root:
   ```bash
   cd apps/user-frontend  # or wherever your React app is
   echo "VITE_API_URL=http://localhost:8000/api/v1" > .env
   ```

2. **IMPORTANT:** Restart frontend dev server (Vite doesn't hot-reload .env changes):
   ```bash
   # Kill old process
   lsof -ti:5173 | xargs kill -9

   # Start fresh
   npm run dev
   ```

3. Verify in browser console that requests now go to `/api/v1/...` instead of `/api/v2/...`

---

### Step 2: Check authentication

**Symptom:** 401 Unauthorized or "Not Found" when uploading

**Fix:**
1. Make sure user is logged in - check browser DevTools → Application → Local Storage → `token` key exists

2. If no token, sign in first:
   - Go to `/app/signin`
   - Use credentials: `admin@example.com` / `admin123`
   - OR use demo mode: email `test` + any password (check if SignIn page shows demo mode banner)

3. Seed admin user if needed (backend must be running):
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/seed-admin
   # Response: {"created":true,"email":"admin@example.com","password":"admin123"}
   ```

---

### Step 3: Verify backend is running correctly

**Check backend logs for these issues:**

1. **Wrong backend running?**
   - Make sure you're in the correct project directory
   - Check terminal title/path: should be `/path/to/skybuild_o1/backend`

2. **Backend health check:**
   ```bash
   curl http://localhost:8000/healthz
   # Expected: {"ok":true}

   curl http://localhost:8000/api/v1/openapi.json | grep -o '"title":"[^"]*"'
   # Expected: "title":"SkyBuild Pro API"
   ```

3. **Kill wrong backend if needed:**
   ```bash
   lsof -ti:8000 | xargs kill -9

   # Then start correct one
   cd /path/to/correct/backend
   source env/bin/activate  # or venv/bin/activate
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

---

### Step 4: Check CORS configuration

**Symptom:** CORS errors in browser console

**Fix:**
1. Check `backend/app/core/config.py` - verify `BACKEND_CORS_ORIGINS` includes:
   ```python
   BACKEND_CORS_ORIGINS: List[str] = [
       "http://localhost:5173",  # user frontend
       "http://127.0.0.1:5173",
       "http://localhost:5174",  # admin frontend
       "http://127.0.0.1:5174",
   ]
   ```

2. Add production URL if deploying to server:
   ```python
   "https://yourdomain.com",
   ```

3. Restart backend after config changes

---

### Step 5: Verify file paths in code

**Check frontend API configuration:**

1. Open `apps/user-frontend/src/services/api.ts`
2. Verify line ~3:
   ```typescript
   export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
   ```

3. Check that default matches your backend prefix in `backend/app/core/config.py`:
   ```python
   API_V1_PREFIX: str = "/api/v1"
   ```

---

## Quick Test After Fixes

1. **Login test:**
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/login \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=admin@example.com&password=admin123"
   # Should return: {"access_token":"..."}
   ```

2. **File upload test** (with token from step 1):
   ```bash
   TOKEN="your_token_here"
   curl -X POST http://localhost:8000/api/v1/files \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"project_id":"demo-project","filename":"test.ifc","file_type":"IFC","content_type":"application/octet-stream"}'
   # Should return: {"file_id":"...","upload_url":"..."}
   ```

---

## Common Gotchas

- ❌ **Vite doesn't hot-reload .env** - always restart dev server
- ❌ **Multiple backends running** - check `lsof -i:8000`
- ❌ **Old localStorage token** - clear browser localStorage if credentials changed
- ❌ **Wrong API version** - frontend v2 vs backend v1 is #1 cause
- ❌ **Not logged in** - check DevTools → Application → Local Storage for `token`

---

## Full Restart Procedure (Nuclear Option)

```bash
# 1. Kill everything
lsof -ti:8000 | xargs kill -9  # backend
lsof -ti:5173 | xargs kill -9  # user frontend
lsof -ti:5174 | xargs kill -9  # admin frontend (if running)

# 2. Set env var
cd apps/user-frontend
echo "VITE_API_URL=http://localhost:8000/api/v1" > .env

# 3. Start backend
cd ../../backend
source env/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &

# 4. Wait 2 seconds
sleep 2

# 5. Seed admin
curl -X POST http://localhost:8000/api/v1/auth/seed-admin

# 6. Start frontend
cd ../apps/user-frontend
npm run dev

# 7. Open browser, sign in with admin@example.com / admin123
```

---

**Generated:** 2025-10-07
**For:** SkyBuild Pro upload debugging
