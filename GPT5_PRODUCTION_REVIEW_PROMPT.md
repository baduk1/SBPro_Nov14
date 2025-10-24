# GPT-5 Pro Production Review Prompt

Copy and paste this prompt into GPT-5 Pro after uploading your codebase:

---

<task_specification>
You are conducting a **critical production readiness review** of the SkyBuild Pro codebase. This is a full-stack SaaS platform for construction cost estimation that will be deployed to an Ubuntu production server **today**.

Your objective: Generate a comprehensive, prioritized todo list of **all tasks required** to make this system production-ready with zero mocks, placeholders, or incomplete features.
</task_specification>

<context>
**System Overview:**
- **Frontend**: React 18 + TypeScript + Vite + Material-UI (User app on :5173, Admin app on :5174)
- **Backend**: FastAPI + Python 3.13 + SQLAlchemy + SQLite/PostgreSQL
- **Features**: User authentication with email verification, file processing (IFC/DWG/PDF), BOQ generation, templates, estimates, supplier management, billing system
- **Infrastructure**: Will be deployed on Ubuntu server with Nginx reverse proxy

**Current State:**
The codebase has been uploaded to you as a complete repository dump. Review **every aspect** of the codebase to identify gaps, mocks, incomplete implementations, security issues, and production requirements.

**Deployment Context:**
- Production environment: Ubuntu server
- Today's deployment timeline
- Zero tolerance for mocks or placeholders
- All features must be fully functional including:
  - Email verification (SendGrid integration)
  - Admin login and role-based access
  - File uploads and processing
  - Export functionality (CSV/XLSX/PDF)
  - Billing and credits system
  - All API endpoints
</context>

<requirements>
**Critical Production Requirements:**

1. **Security & Authentication**
   - JWT implementation complete and secure
   - Password hashing properly implemented
   - Admin role verification on all admin endpoints
   - CORS configuration for production domains
   - Rate limiting properly configured
   - No hardcoded secrets or credentials
   - Secret key management strategy

2. **Database & Migrations**
   - All required tables created
   - Migration scripts tested and idempotent
   - Database indexes for performance
   - Foreign key constraints properly set
   - No orphaned data or integrity issues

3. **Email System**
   - SendGrid integration fully configured
   - Email verification flow complete (no mocks)
   - Email templates professional and functional
   - Error handling for email failures
   - Email verification token expiry

4. **File Processing**
   - IFC/DWG/PDF processing fully implemented
   - File storage and retrieval working
   - Upload size limits configured
   - File validation and security checks
   - Error handling for corrupt files

5. **API Completeness**
   - All endpoints fully implemented (no TODO comments)
   - Request validation on all inputs
   - Proper error responses
   - API documentation accurate
   - No mock responses or placeholder data

6. **Frontend Completeness**
   - All pages functional (no placeholder screens)
   - API integration complete
   - Error handling and user feedback
   - Loading states implemented
   - Form validations working

7. **Deployment Requirements**
   - Environment variable documentation
   - Production configuration files
   - Nginx configuration
   - SSL/TLS setup
   - Process management (systemd/supervisor)
   - Backup strategy
   - Logging configuration
   - Health check endpoints

8. **Testing & Quality**
   - Critical paths tested
   - Integration tests for main flows
   - Test coverage for security features
   - No failing tests

9. **Admin Panel**
   - Admin user creation process
   - All admin features functional
   - Access request management working
   - Price list management complete
   - Mapping configuration functional

10. **Billing System**
    - Credits system fully implemented
    - Upgrade flows working
    - Balance tracking accurate
    - No mock payment processing (or clearly documented as future work)
</requirements>

<review_methodology>
**Step 1: Systematic Code Review**
- Scan for TODO, FIXME, HACK, MOCK, PLACEHOLDER comments
- Identify incomplete functions (pass statements, NotImplementedError, mock returns)
- Check for hardcoded credentials or configuration
- Verify all imports are available and not commented out
- Look for dead code or unused endpoints

**Step 2: Integration Analysis**
- Trace critical user flows end-to-end:
  - User registration → Email verification → Login → Project creation → File upload → BOQ generation → Export
  - Admin login → Access request review → Price list management
- Verify database relationships and foreign keys
- Check API endpoint connectivity between frontend and backend

**Step 3: Security Audit**
- Authentication implementation completeness
- Authorization checks on protected endpoints
- Input validation and sanitization
- SQL injection vulnerability checks
- File upload security
- CORS configuration review

**Step 4: Production Infrastructure Gaps**
- Identify missing configuration files
- Check environment variable requirements
- Verify production vs development toggles
- Assess logging and monitoring setup
- Review error handling for production scenarios

**Step 5: Deployment Readiness**
- Missing deployment scripts
- Database migration strategy
- Backup and recovery procedures
- Health check and monitoring endpoints
- Graceful shutdown handling
</review_methodology>

<output_format>
Provide your findings as a **prioritized, actionable todo list** structured as follows:

## 🚨 CRITICAL (Must fix before deployment)
[Issues that will cause system failure or security breaches]

**Backend:**
- [ ] **[Category]**: Specific issue found
  - **Location**: `file.py:line_number` or `directory/`
  - **Problem**: Clear description of what's wrong/missing
  - **Solution**: Specific steps to fix
  - **Risk**: What happens if not fixed

**Frontend:**
- [ ] **[Category]**: Specific issue found
  - **Location**: `Component.tsx` or `directory/`
  - **Problem**: Clear description
  - **Solution**: Specific steps to fix
  - **Risk**: Impact if not fixed

**Infrastructure:**
- [ ] **[Category]**: Missing configuration/setup
  - **Problem**: What's missing
  - **Solution**: What to create/configure
  - **Risk**: Impact if not fixed

---

## ⚠️ HIGH PRIORITY (Required for production quality)
[Issues that severely impact functionality or user experience]

[Same structured format as above]

---

## 📋 MEDIUM PRIORITY (Should be addressed)
[Issues that affect quality but system can function]

[Same structured format as above]

---

## 💡 RECOMMENDATIONS (Nice to have)
[Improvements for better production operations]

[Same structured format as above]

---

## ✅ VERIFIED WORKING
[List major components you verified are production-ready]

---

## 📝 DEPLOYMENT CHECKLIST
[Step-by-step deployment tasks in order]

1. [ ] Pre-deployment task
2. [ ] Configuration task
3. [ ] etc...

---

## 🔧 REQUIRED ENVIRONMENT VARIABLES
[Complete list with descriptions and example values]

```bash
# Backend
SECRET_KEY=...
SENDGRID_API_KEY=...
# etc...
```

---

## ⚠️ CRITICAL WARNINGS
[Any show-stoppers or architectural concerns]
</output_format>

<quality_criteria>
**Your review must be:**

1. **Exhaustive**: Cover every critical system component
2. **Specific**: Cite exact file locations and line numbers where possible
3. **Actionable**: Provide clear, implementable solutions
4. **Prioritized**: Distinguish between must-fix and nice-to-have
5. **Realistic**: Focus on what's needed for today's deployment
6. **Security-focused**: Flag all security vulnerabilities
7. **Production-minded**: Consider scaling, monitoring, error handling, recovery

**Do NOT:**
- Give generic advice without code-specific findings
- Miss incomplete implementations or mocks
- Overlook security issues
- Ignore infrastructure requirements
- Skip environment configuration needs
</quality_criteria>

<persistence>
Complete this review thoroughly without asking for clarification. If you find areas where the codebase structure is unclear, note it as a finding. Use your best judgment to infer intent from the code and flag concerns.

Work systematically through the entire codebase. This is a critical production deployment - thoroughness is more important than speed.
</persistence>

<context_understanding>
You have full access to the codebase. Review:
- All Python backend files (FastAPI, models, schemas, services, endpoints)
- All React frontend files (components, pages, services, hooks)
- Configuration files (.env examples, requirements.txt, package.json)
- Documentation (README files, any deployment docs)
- Test files (to understand what's tested vs untested)
- Database migration scripts
- Infrastructure files (Nginx configs if present, Docker files if present)

Pay special attention to:
- `backend/app/api/v1/endpoints/*.py` - All API implementations
- `backend/app/models/*.py` - Database models
- `backend/app/services/*.py` - Business logic
- `apps/user-frontend/src/services/api.ts` - Frontend API client
- `apps/user-frontend/src/pages/*.tsx` - User interface implementations
- Environment configuration and secrets management
</context_understanding>

---

**BEGIN PRODUCTION READINESS REVIEW NOW.**
