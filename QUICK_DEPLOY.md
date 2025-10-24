# 🚀 Quick Deploy Guide - SkyBuild Pro

**Time to deploy:** ~30 minutes
**Difficulty:** Easy (automated script handles everything)

---

## Prerequisites

✅ Ubuntu 22.04 LTS server
✅ Root/sudo access
✅ Domain names pointing to server IP:
  - `app.yourdomain.com`
  - `admin.yourdomain.com`
✅ SendGrid API key (for emails)

---

## Step 1: Prepare Credentials

Have these ready before starting:

1. **SendGrid API Key**
   - Sign up at https://sendgrid.com
   - Create API key with "Mail Send" permissions
   - Verify sender email address

2. **Database Password**
   - Generate strong password for PostgreSQL

3. **Admin User**
   - Email address for admin account
   - Strong password (will be prompted during setup)

---

## Step 2: Run Deployment Script

```bash
# SSH into your server
ssh root@your-server-ip

# Download and run deployment script
curl -L https://github.com/yourrepo/skybuild/raw/main/deployment/deploy.sh -o deploy.sh
chmod +x deploy.sh
sudo bash deploy.sh
```

The script will interactively prompt you for:
- Repository URL
- Database choice (PostgreSQL recommended)
- Database credentials
- Admin user details
- Domain names
- SSL setup (yes/no)

---

## Step 3: Verify Deployment

### Check Services
```bash
# Backend health
curl https://app.yourdomain.com/api/v1/healthz

# Service status
systemctl status skybuild-api

# View logs
journalctl -u skybuild-api -f
```

### Test Application
1. Visit `https://app.yourdomain.com`
2. Click "Sign Up"
3. Register with your email
4. Check inbox for verification email
5. Click verification link
6. Login to dashboard

### Test Admin Panel
1. Visit `https://admin.yourdomain.com`
2. Login with admin credentials created during deployment
3. Verify admin dashboard loads

---

## Step 4: Configuration (Post-Deploy)

### Update Environment (if needed)
```bash
# Edit environment file
nano /opt/skybuild/backend/.env

# Restart backend after changes
systemctl restart skybuild-api
```

### Monitor Logs
```bash
# Real-time backend logs
journalctl -u skybuild-api -f

# Real-time Nginx logs
tail -f /var/log/nginx/skybuild-user-access.log
```

### Check Backups
```bash
# View backups (runs daily at 2 AM)
ls -lh /opt/skybuild/backups/

# Manual backup
sudo -u skybuild /opt/skybuild/backup.sh
```

---

## Troubleshooting

### Backend won't start
```bash
# Check logs for errors
journalctl -u skybuild-api -n 50

# Common issues:
# - SECRET_KEY not set in .env
# - Database connection failed
# - SMTP credentials invalid

# Verify .env file exists and is readable
ls -la /opt/skybuild/backend/.env
```

### Emails not sending
```bash
# Check SMTP settings in .env
grep SMTP /opt/skybuild/backend/.env

# Test backend can reach SendGrid
curl -I https://smtp.sendgrid.net:587

# View email-related logs
journalctl -u skybuild-api | grep -i email
```

### SSL certificate issues
```bash
# Renew certificates manually
certbot renew

# Check certificate status
certbot certificates

# Fix permissions if needed
chmod 644 /etc/letsencrypt/live/*/fullchain.pem
chmod 600 /etc/letsencrypt/live/*/privkey.pem
```

### Database connection errors
```bash
# Check PostgreSQL is running
systemctl status postgresql

# Test database connection
psql -U skybuild_user -d skybuild_prod -h localhost

# Check .env DB_URL is correct
grep DB_URL /opt/skybuild/backend/.env
```

---

## Common Operations

### Restart Services
```bash
# Restart backend
systemctl restart skybuild-api

# Restart Nginx
systemctl restart nginx

# Reload Nginx config (no downtime)
nginx -t && systemctl reload nginx
```

### Update Application
```bash
cd /opt/skybuild
git pull
systemctl restart skybuild-api
```

### View Service Status
```bash
# All services
systemctl status skybuild-api nginx postgresql

# Resource usage
systemctl status skybuild-api
```

### Manual Backup
```bash
# Run backup script
sudo -u skybuild /opt/skybuild/backup.sh

# Verify backup created
ls -lh /opt/skybuild/backups/
```

---

## Security Checklist

After deployment, verify:

- [ ] Firewall configured (only 80, 443, 22 open)
- [ ] SSH key-based authentication (disable password auth)
- [ ] SSL certificates installed and auto-renewing
- [ ] `.env` file has 600 permissions
- [ ] Database has strong password
- [ ] Admin panel accessible only by admin
- [ ] Rate limiting working (test with rapid requests)
- [ ] Backups running daily (check cron: `crontab -u skybuild -l`)

---

## Performance Tuning

### Adjust Workers (based on CPU cores)
```bash
# Edit service file
nano /etc/systemd/system/skybuild-api.service

# Change --workers value (recommended: 2-4 x CPU cores)
# Reload and restart
systemctl daemon-reload
systemctl restart skybuild-api
```

### Monitor Resource Usage
```bash
# CPU and memory
htop

# Service-specific
systemctl status skybuild-api

# Database connections
psql -U skybuild_user -d skybuild_prod -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## Production URLs

After successful deployment:

- **User App:** https://app.yourdomain.com
- **Admin Panel:** https://admin.yourdomain.com
- **API Docs:** https://app.yourdomain.com/api/v1/docs
- **Health Check:** https://app.yourdomain.com/api/v1/healthz

---

## Support

**Logs location:**
- Backend: `journalctl -u skybuild-api`
- Nginx: `/var/log/nginx/skybuild-*.log`
- Backups: `/var/log/skybuild/backup.log`

**For detailed information:**
- Full docs: `PRODUCTION_READINESS_REPORT.md`
- Architecture: `CLAUDE.md`
- Backend setup: `backend/README.md`

**Need help?** support@skybuild.pro

---

**Ready to deploy?** Run the deployment script now! 🚀
