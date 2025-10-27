# 📧 SendGrid Setup Guide - SkyBuild Pro

**Problem:** Emails not being delivered  
**Reason:** SendGrid requires sender verification  
**Status:** ⚠️ ACTION REQUIRED

---

## 🔍 Current Configuration

```
SMTP_HOST: smtp.sendgrid.net
SMTP_PORT: 587
SMTP_USER: apikey
SMTP_PASSWORD: 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
SMTP_FROM_EMAIL: noreply@skybuildpro.co.uk
```

**API Key Status:** ✅ Valid (but sender not verified)

---

## ✅ Solution: Verify Sender in SendGrid

### Option 1: Domain Authentication (Recommended for Production)

**Benefits:**
- Send from any email@skybuildpro.co.uk
- Professional setup
- Better deliverability
- No SPF/DKIM issues

**Steps:**

1. **Login to SendGrid**
   - Go to: https://app.sendgrid.com
   - Login with account that has the API key

2. **Navigate to Sender Authentication**
   - Settings → Sender Authentication → Domain Authentication
   - Click "Authenticate Your Domain"

3. **Add Domain**
   - Enter: `skybuildpro.co.uk`
   - Select your DNS host
   - Click "Next"

4. **Add DNS Records**
   SendGrid will provide DNS records like:
   ```
   Type: CNAME
   Host: em1234.skybuildpro.co.uk
   Value: u1234567.wl123.sendgrid.net

   Type: CNAME  
   Host: s1._domainkey.skybuildpro.co.uk
   Value: s1.domainkey.u1234567.wl123.sendgrid.net

   Type: CNAME
   Host: s2._domainkey.skybuildpro.co.uk
   Value: s2.domainkey.u1234567.wl123.sendgrid.net
   ```

5. **Add to Your DNS Provider**
   - Go to your domain DNS settings (Cloudflare/Route53/etc)
   - Add all CNAME records provided by SendGrid
   - Wait 24-48 hours for propagation (usually faster)

6. **Verify in SendGrid**
   - Return to SendGrid
   - Click "Verify" 
   - ✅ Domain verified!

---

### Option 2: Single Sender Verification (Quick for Testing)

**Benefits:**
- Quick setup (5 minutes)
- No DNS changes needed
- Good for testing/development

**Limitations:**
- Can only send from ONE verified email
- Need to re-verify if changing sender

**Steps:**

1. **Login to SendGrid**
   - https://app.sendgrid.com

2. **Navigate to Sender Identity**
   - Settings → Sender Authentication → Single Sender Verification
   - Click "Create New Sender"

3. **Fill Form**
   ```
   From Name: SkyBuild Pro
   From Email Address: noreply@skybuildpro.co.uk
   Reply To: support@skybuildpro.co.uk (or your email)
   Company Address: [Your company address]
   ```

4. **Verify Email**
   - SendGrid will send verification email to `noreply@skybuildpro.co.uk`
   - ⚠️ **Problem:** You need access to this mailbox!
   
   **Alternative:**
   - Use your personal email temporarily: `your-email@gmail.com`
   - Verify that
   - Update `.env` to use verified email

---

### Option 3: Use Personal Verified Email (Temporary)

**For immediate testing:**

1. In SendGrid, verify your personal email (e.g., bushido.gm@gmail.com)
2. Update backend config:
   ```bash
   cd /root/skybuild_o1_production/backend
   nano .env
   
   # Change this line:
   SMTP_FROM_EMAIL=bushido.gm@gmail.com  # or your verified email
   
   # Save and exit (Ctrl+X, Y, Enter)
   ```

3. Restart backend:
   ```bash
   sudo systemctl restart skybuild-backend
   ```

4. Test registration again

---

## 🧪 How to Check SendGrid Status

### Check Activity in SendGrid Dashboard

1. Go to: https://app.sendgrid.com/activity
2. Look for recent email attempts
3. Check status:
   - ✅ **Delivered** - Email sent successfully
   - ⏸️ **Deferred** - Temporary issue
   - ❌ **Dropped** - Sender not verified!
   - ❌ **Bounced** - Email doesn't exist

### Check via API

```bash
# List verified senders
curl --request GET \
  --url https://api.sendgrid.com/v3/verified_senders \
  --header "Authorization: Bearer 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"
```

---

## 🔧 After Verification

Once sender is verified:

1. **Test Email Sending:**
   ```bash
   cd /root/skybuild_o1_production/backend
   source .venv/bin/activate
   python3 -c "
   from app.services.email import EmailService
   result = EmailService.send_verification_email(
       to_email='bushido.gm@gmail.com',
       verification_token='test-123',
       user_name='Test User'
   )
   print('Email sent!' if result else 'Failed!')
   "
   ```

2. **Check Spam Folder**
   - Sometimes first emails go to spam
   - Mark as "Not Spam" to improve deliverability

3. **Re-send Verification Email**
   - Login to: https://skybuildpro.co.uk/app/signin
   - Click "Resend Verification Email"
   - Check inbox (and spam)

---

## 📊 SendGrid Free Tier Limits

```
Daily Emails: 100 emails/day
Monthly Emails: 40,000 emails (first month)
After Month 1: 100 emails/day forever
```

**For production:**
- Upgrade to paid plan for more emails
- Current: Free tier (sufficient for testing)

---

## 🚨 Common Issues

### Issue 1: "Sender not verified"
**Solution:** Complete Option 1 or 2 above

### Issue 2: Emails go to spam
**Solution:** 
- Complete domain authentication (Option 1)
- Add SPF/DKIM records
- Warm up sender reputation (send gradually)

### Issue 3: API key expired
**Solution:**
- Create new API key in SendGrid
- Update in `.env` file
- Restart backend

---

## ✅ Verification Checklist

- [ ] SendGrid account created
- [ ] API key created (exists: SG.3-HKRVhrRj26tyZYyFJiEQ...)
- [ ] Sender verified (Domain OR Single Sender)
- [ ] DNS records added (if using domain auth)
- [ ] Test email sent successfully
- [ ] Email received in inbox
- [ ] SMTP_FROM_EMAIL updated in .env (if needed)
- [ ] Backend restarted after config changes

---

## 📞 Need Help?

- SendGrid Docs: https://docs.sendgrid.com/
- SendGrid Support: https://support.sendgrid.com/
- Check Activity Feed: https://app.sendgrid.com/activity

---

**Updated:** 2025-10-26  
**Next Step:** Verify sender in SendGrid → Test again

