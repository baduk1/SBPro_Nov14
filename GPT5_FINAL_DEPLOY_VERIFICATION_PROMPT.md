# GPT-5 Pro - Final Deploy Verification Prompt

Copy and paste this prompt into GPT-5 Pro after uploading your **updated** codebase:

---

<task_specification>
You are conducting a **final pre-deployment verification** of the SkyBuild Pro codebase after critical security fixes have been implemented.

Your objective: Verify that all security vulnerabilities have been properly fixed, validate the quality of implementations, identify any remaining issues, and provide a **clear GO/NO-GO decision** for production deployment.
</task_specification>

<context>
**Project Status:**
- **Platform**: Full-stack SaaS for construction cost estimation
- **Stack**: React 18 + TypeScript (frontend), FastAPI + Python 3.13 (backend)
- **Deployment Target**: Ubuntu production server with Nginx + PostgreSQL
- **Timeline**: Deploy today

**Previous Review Findings (Already Fixed):**
The following P0/P1 security issues were identified and have been **claimed as fixed**:

1. ✅ **Admin backdoor removed**: `/auth/seed-admin` endpoint deleted
2. ✅ **Email service hardened**: Fails in production if SMTP not configured
3. ✅ **Email verification enforced**: Login blocks unverified users (403)
4. ✅ **Multi-tenant data leakage fixed**: All projects/jobs/files filtered by user_id/owner_id
5. ✅ **Credits deduction implemented**: Jobs require sufficient balance (402 on insufficient credits)
6. ✅ **Auto schema creation disabled**: Only runs in development mode
7. ✅ **Production configs created**: .env template, Nginx, systemd, deploy script

**Your Mission:**
Verify these fixes are correctly implemented, check for regressions, identify any missed issues, and determine if the system is truly production-ready.
</context>

<verification_methodology>
## Step 1: Validate Security Fixes

For each claimed fix, verify:

### 1.1 Admin Backdoor Removal
- [ ] Confirm `/auth/seed-admin` endpoint is completely removed from `auth.py`
- [ ] Check no other backdoor endpoints exist (grep for "seed", "admin123", hardcoded passwords)
- [ ] Verify `create_admin_user.py` script exists and uses secure password input (getpass)
- [ ] Ensure admin creation is NOT exposed via any API endpoint

### 1.2 Email Service Production Safety
- [ ] Check `EmailService.send_email()` raises `RuntimeError` when SMTP not configured in production
- [ ] Verify `settings.ENV == "production"` check is correct
- [ ] Confirm development mode still allows logging (not breaking dev workflow)
- [ ] Check error message is clear and actionable

### 1.3 Email Verification Enforcement
- [ ] Verify `/auth/login` checks `user.email_verified` before issuing token
- [ ] Confirm HTTP 403 status code with clear error message
- [ ] Check admin users (role='admin') are exempt from verification check
- [ ] Ensure no other login paths bypass verification (check for OAuth, SSO, etc.)

### 1.4 Multi-Tenant Data Isolation
**Projects endpoint** (`backend/app/api/v1/endpoints/projects.py`):
- [ ] `list_projects()`: Filters by `owner_id == user.id`
- [ ] `get_project()`: Filters by both `id` AND `owner_id`
- [ ] `update_project()`: Filters by both `id` AND `owner_id`
- [ ] `delete_project()`: Filters by both `id` AND `owner_id`

**Jobs endpoint** (`backend/app/api/v1/endpoints/jobs.py`):
- [ ] `list_jobs()`: Filters by `user_id == user.id`
- [ ] `get_job()`: Filters by both `id` AND `user_id`
- [ ] `get_events()`: Verifies job ownership before returning events
- [ ] `stream()`: Verifies job ownership before SSE stream
- [ ] `create_job()`: Verifies file ownership (`file.user_id == user.id`)

**Files endpoint** (`backend/app/api/v1/endpoints/files.py`):
- [ ] `get_file()`: Filters by both `id` AND `user_id`
- [ ] `upload_content()`: Check if ownership verified (presigned URL should be scoped)

**Artifacts/Exports** (`backend/app/api/v1/endpoints/artifacts.py`, `export.py`):
- [ ] Verify artifact ownership before presigned download
- [ ] Check export endpoints verify job/project ownership

### 1.5 Credits Deduction System
- [ ] `create_job()` checks `user.credits_balance >= settings.COST_PER_JOB`
- [ ] Credits are deducted **before** job creation (atomic transaction)
- [ ] HTTP 402 (Payment Required) returned on insufficient credits with clear message
- [ ] `COST_PER_JOB` configuration exists in `config.py`
- [ ] File ownership verified in `create_job()` before credit check

### 1.6 Production Environment Safety
- [ ] `settings.ENV` variable exists and defaults to "development"
- [ ] `Base.metadata.create_all()` is gated behind `ENV != "production"` check
- [ ] No other auto-migration or schema-altering code runs in production

## Step 2: Check for Regressions

Scan for issues introduced by the fixes:

- [ ] Check all ownership filters use `.first()` not `.get()` (avoids false 404s)
- [ ] Verify no N+1 query issues introduced (check for loops calling DB)
- [ ] Confirm error messages don't leak sensitive info (user IDs, internal paths)
- [ ] Check transaction safety (credits deduction + job creation in same transaction)
- [ ] Verify no breaking changes to API contracts (response schemas unchanged)

## Step 3: Scan for Missed Vulnerabilities

Look for issues that may have been overlooked:

### Templates & Estimates Endpoints
- [ ] Check `templates.py` endpoints filter by `user_id`
- [ ] Check `estimates.py` endpoints filter by `user_id`
- [ ] Verify template cloning doesn't leak data across tenants
- [ ] Check estimate item operations verify ownership

### Suppliers Endpoint
- [ ] Verify `suppliers.py` filters by `user_id`
- [ ] Check supplier price items are user-scoped

### Takeoff & Pricing Endpoints
- [ ] Check `takeoff.py` verifies job ownership
- [ ] Check `pricing.py` verifies job ownership before applying prices

### Export Endpoints
- [ ] Verify export endpoints check job/project ownership
- [ ] Check presigned URLs for downloads include ownership validation

### Admin Endpoints
- [ ] Confirm all `/admin/*` routes require `role='admin'` dependency
- [ ] Check admin endpoints don't accidentally expose user data without role check

## Step 4: Validate Deployment Infrastructure

### Environment Configuration
- [ ] `.env.production.template` includes all required variables
- [ ] Template has clear comments and examples
- [ ] No default/weak secrets in template
- [ ] `SECRET_KEY` generation documented (e.g., `openssl rand -hex 32`)

### Nginx Configuration
- [ ] Rate limit zone declared in correct context (http{} block)
- [ ] Upload size limits configured (`client_max_body_size`)
- [ ] SSL certificate paths are placeholders (not hardcoded real paths)
- [ ] Security headers configured (HSTS, X-Frame-Options, etc.)
- [ ] API proxy correctly forwards headers (`X-Forwarded-For`, `X-Real-IP`)

### Systemd Service
- [ ] Service runs as non-root user (`skybuild`)
- [ ] Environment file path is correct
- [ ] Worker count is reasonable (4 workers default)
- [ ] Graceful shutdown configured
- [ ] Security hardening directives present

### Deployment Script
- [ ] Script checks for root/sudo
- [ ] All required packages installed
- [ ] Database migrations run in correct order
- [ ] Admin user creation is interactive (no hardcoded passwords)
- [ ] Script is idempotent (safe to re-run)
- [ ] Error handling at each step

## Step 5: Code Quality Review

Check implementation quality:

- [ ] Ownership checks use consistent patterns (no copy-paste errors)
- [ ] Error messages are user-friendly and actionable
- [ ] Database queries use proper ORM methods (no raw SQL with user input)
- [ ] Type hints present on new/modified functions
- [ ] Docstrings added to security-critical functions
- [ ] No TODO/FIXME/HACK comments in security-critical code

## Step 6: Edge Cases & Race Conditions

Look for subtle bugs:

- [ ] Credits deduction: What if job creation fails after deduction? (rollback?)
- [ ] Email verification: Can users request unlimited verification emails? (rate limit?)
- [ ] Ownership checks: What if user_id is NULL in database? (handled?)
- [ ] File upload: What if presigned URL expires during upload? (clear error?)
- [ ] Job processing: What if background task crashes? (credit refund?)

## Step 7: Performance & Scalability

Identify potential bottlenecks:

- [ ] Ownership filters use indexed columns (user_id, owner_id)
- [ ] No missing indexes on frequently queried columns
- [ ] No SELECT * queries (only fetch needed columns)
- [ ] Pagination implemented on list endpoints (or at least limit clause)
- [ ] File uploads don't block API workers (background processing)

</verification_methodology>

<output_format>
Provide your findings in the following structure:

---

## 🎯 DEPLOYMENT DECISION

**Status:** [🟢 GO FOR DEPLOYMENT | 🟡 FIX REQUIRED | 🔴 CRITICAL ISSUES]

**Confidence Level:** [High | Medium | Low]

**Risk Assessment:** [Low | Medium | High]

---

## ✅ VERIFIED FIXES (Confirmed Working)

[List each fix that you verified is correctly implemented]

**Example:**
- ✅ **Admin backdoor removed**: Confirmed `/auth/seed-admin` completely removed from `auth.py:31-43`. `create_admin_user.py` uses `getpass.getpass()` for secure input. No other backdoors found.

---

## ⚠️ ISSUES FOUND

### 🔴 CRITICAL (Must fix before deploy)

[Issues that will cause security breaches or system failure]

**Format:**
- **Issue**: Clear description
- **Location**: `file.py:line` or function name
- **Impact**: What breaks/who's affected
- **Fix**: Specific code change needed
- **Verification**: How to test the fix

### 🟡 HIGH PRIORITY (Fix before or immediately after deploy)

[Issues that severely impact functionality but don't prevent deployment]

**Format:** Same as Critical

### 🟠 MEDIUM PRIORITY (Fix soon after deploy)

[Quality issues or minor bugs]

**Format:** Same as Critical

---

## 🔍 DETAILED FINDINGS

### Security Fixes Verification

**1. Admin Backdoor Removal**
- File: `backend/app/api/v1/endpoints/auth.py`
- Status: [✅ Verified | ⚠️ Issue Found | ❌ Not Fixed]
- Details: [Your findings]

**2. Email Service Production Safety**
- File: `backend/app/services/email.py`
- Status: [✅ Verified | ⚠️ Issue Found | ❌ Not Fixed]
- Details: [Your findings]

**3. Email Verification Enforcement**
- File: `backend/app/api/v1/endpoints/auth.py`
- Status: [✅ Verified | ⚠️ Issue Found | ❌ Not Fixed]
- Details: [Your findings]

**4. Multi-Tenant Data Isolation**
- Projects: [✅ Verified | ⚠️ Issue Found | ❌ Not Fixed]
- Jobs: [✅ Verified | ⚠️ Issue Found | ❌ Not Fixed]
- Files: [✅ Verified | ⚠️ Issue Found | ❌ Not Fixed]
- Templates: [✅ Verified | ⚠️ Issue Found | ❌ Not Fixed]
- Estimates: [✅ Verified | ⚠️ Issue Found | ❌ Not Fixed]
- Suppliers: [✅ Verified | ⚠️ Issue Found | ❌ Not Fixed]
- Exports: [✅ Verified | ⚠️ Issue Found | ❌ Not Fixed]
- Details: [Your findings with specific file:line references]

**5. Credits Deduction System**
- File: `backend/app/api/v1/endpoints/jobs.py`
- Status: [✅ Verified | ⚠️ Issue Found | ❌ Not Fixed]
- Details: [Your findings]

**6. Production Environment Safety**
- File: `backend/app/main.py`
- Status: [✅ Verified | ⚠️ Issue Found | ❌ Not Fixed]
- Details: [Your findings]

### Deployment Infrastructure

**1. Environment Template**
- File: `backend/.env.production.template`
- Completeness: [Complete | Missing variables]
- Issues: [List any problems]

**2. Nginx Configuration**
- File: `deployment/nginx.conf`
- Correctness: [Correct | Has errors]
- Issues: [List any problems]

**3. Systemd Service**
- File: `deployment/skybuild-api.service`
- Correctness: [Correct | Has errors]
- Issues: [List any problems]

**4. Deployment Script**
- File: `deployment/deploy.sh`
- Safety: [Safe | Has issues]
- Issues: [List any problems]

---

## 📊 CODE QUALITY ASSESSMENT

### Implementation Quality
- Consistency: [Excellent | Good | Fair | Poor]
- Error Handling: [Comprehensive | Adequate | Lacking]
- Code Clarity: [Clear | Acceptable | Confusing]

### Test Coverage
- Security Fixes: [Tested | Untested | Partially tested]
- Recommendation: [What tests should be added]

### Documentation
- Deployment Docs: [Complete | Adequate | Incomplete]
- Code Comments: [Sufficient | Lacking]

---

## 🚨 CRITICAL WARNINGS

[Showstopper issues or last-minute discoveries that must be addressed]

**Example:**
- ⚠️ **Transaction rollback missing**: Credits are deducted but not refunded if job creation fails. User loses credits permanently.

---

## ✅ PRE-DEPLOYMENT CHECKLIST

- [ ] All P0/P1 security fixes verified working
- [ ] No new vulnerabilities introduced
- [ ] Deployment configs tested (syntax check)
- [ ] Database migrations are idempotent
- [ ] Backup strategy in place
- [ ] Rollback plan documented
- [ ] Monitoring/logging configured
- [ ] Admin user creation tested

---

## 📝 DEPLOYMENT RECOMMENDATIONS

### Before Deploy
1. [Action item]
2. [Action item]

### During Deploy
1. [Action item]
2. [Action item]

### After Deploy (First 24h)
1. [Action item]
2. [Action item]

---

## 🎓 LESSONS LEARNED

[Key takeaways from this security review process]

---

## 🎯 FINAL VERDICT

**My recommendation:** [PROCEED | DELAY | ABORT]

**Reasoning:** [1-2 sentences explaining your decision]

**Confidence:** [High | Medium | Low] - [Explain why]

**Risk Level:** [Acceptable | Manageable | High]

---

**If GO:** System is secure and ready for production deployment with [no issues | minor issues that can be fixed post-deploy].

**If NO-GO:** [List 3-5 must-fix items before deployment can proceed]

</output_format>

<quality_criteria>
Your review must be:

1. **Thorough**: Check every security fix at the code level (exact line numbers)
2. **Critical**: Don't assume fixes are correct—verify by reading the actual code
3. **Specific**: Cite exact file paths and line numbers for all findings
4. **Actionable**: Provide clear fix instructions for any issues found
5. **Risk-aware**: Assess deployment risk (low/medium/high) with reasoning
6. **Evidence-based**: Quote relevant code snippets to support findings
7. **Honest**: If something is wrong, say it clearly—don't sugarcoat

**Zero Tolerance For:**
- Assuming fixes are correct without code verification
- Missing multi-tenant isolation issues
- Overlooking authentication/authorization bypasses
- Ignoring transaction safety issues (credits, payments)
- Skipping edge case analysis
- Generic advice without code-specific findings
</quality_criteria>

<persistence>
Complete this verification systematically without shortcuts. This is a **production deployment decision**—thoroughness is critical.

Work through each security fix methodically:
1. Locate the exact code in the uploaded codebase
2. Read the implementation line by line
3. Check for edge cases and bypasses
4. Verify consistency across related endpoints
5. Document findings with specific file:line references

If you find critical issues, provide detailed fix instructions. If everything is correct, confirm each fix with evidence.

Do not ask for clarification—make your best assessment based on the code you can see.
</persistence>

<context_understanding>
You have full access to the updated codebase. Focus your review on:

**High Priority Files:**
- `backend/app/api/v1/endpoints/auth.py` - Login & verification
- `backend/app/api/v1/endpoints/projects.py` - Multi-tenant isolation
- `backend/app/api/v1/endpoints/jobs.py` - Multi-tenant + credits
- `backend/app/api/v1/endpoints/files.py` - Multi-tenant + uploads
- `backend/app/api/v1/endpoints/templates.py` - Check for leakage
- `backend/app/api/v1/endpoints/estimates.py` - Check for leakage
- `backend/app/api/v1/endpoints/suppliers.py` - Check for leakage
- `backend/app/api/v1/endpoints/artifacts.py` - Check ownership
- `backend/app/api/v1/endpoints/export.py` - Check ownership
- `backend/app/services/email.py` - Production safety
- `backend/app/core/config.py` - Environment config
- `backend/app/main.py` - Schema creation gate
- `backend/create_admin_user.py` - Secure admin creation
- `backend/.env.production.template` - Config completeness
- `deployment/nginx.conf` - Nginx correctness
- `deployment/skybuild-api.service` - Service safety
- `deployment/deploy.sh` - Script safety

**Look for patterns:**
- `db.query(Model).all()` without `.filter(user_id=...)` = data leakage
- `.get(id)` without ownership check = data leakage
- Missing error handling on critical operations
- Hardcoded credentials or secrets
- SQL injection risks
- Missing rate limits on sensitive endpoints
</context_understanding>

---

**BEGIN FINAL VERIFICATION NOW.**

Provide your comprehensive findings following the output format above. Be thorough, be critical, be specific.
