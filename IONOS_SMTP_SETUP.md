# 📧 IONOS SMTP Setup Guide

**Created:** 2025-10-29  
**Status:** ⏳ Awaiting SMTP password

---

## ✅ Что уже сделано:

### **1. Backend код обновлен**
- ✅ `email_verified=False` - требуется email verification
- ✅ Email отправка раскомментирована (строки 89-98 в auth.py)
- ✅ Try-catch добавлен (регистрация не блокируется если email не отправлен)

### **2. .env частично обновлен**
```bash
SMTP_HOST=smtp.ionos.co.uk        # ✅ Updated
SMTP_PORT=587                     # ✅ Updated  
SMTP_USER=noreply@skybuildpro.co.uk  # ✅ Updated
SMTP_PASSWORD=                    # ❌ NEEDS UPDATE
SMTP_FROM_EMAIL=noreply@skybuildpro.co.uk  # ✅ Already correct
SMTP_FROM_NAME=SkyBuild Pro       # ✅ Already correct
```

### **3. Backup создан**
- `/root/skybuild_o1_production/backend/.env.backup_sendgrid_YYYYMMDD_HHMMSS`

---

## ⚠️ ЧТО НУЖНО СДЕЛАТЬ:

### **Шаг 1: Получить пароль от IONOS email**

Где найти пароль:
1. Зайдите в IONOS Control Panel
2. Email & Office → Mail Basic
3. Email адрес: `noreply@skybuildpro.co.uk`
4. Скопируйте пароль (или создайте новый)

**Формат пароля:** Обычный пароль из букв/цифр/символов (НЕ API key)

---

### **Шаг 2: Обновить .env с паролем**

**Команда:**
```bash
cd /root/skybuild_o1_production/backend

# Замените YOUR_IONOS_PASSWORD на реальный пароль
sed -i 's|^SMTP_PASSWORD=.*|SMTP_PASSWORD=YOUR_IONOS_PASSWORD|' .env

# Проверка
cat .env | grep SMTP
```

**ИЛИ вручную:**
```bash
nano /root/skybuild_o1_production/backend/.env
```

Найдите строку `SMTP_PASSWORD=` и вставьте пароль.

---

### **Шаг 3: Перезапустить backend**

```bash
sudo systemctl restart skybuild-backend

# Проверка
sudo systemctl status skybuild-backend --no-pager | head -10
```

---

### **Шаг 4: Протестировать отправку email**

#### **Тест 1: Регистрация нового пользователя**

1. Откройте: https://skybuildpro.co.uk/app/signup
2. Зарегистрируйте новый email (например `test@yourdomain.com`)
3. Проверьте inbox - должно прийти письмо:
   - Subject: "Verify your SkyBuild Pro email address"
   - From: "SkyBuild Pro <noreply@skybuildpro.co.uk>"
   - Body: Кнопка "Verify Email Address"

#### **Тест 2: Проверка логов backend**

```bash
# Backend логи
sudo journalctl -u skybuild-backend -n 50 --no-pager | grep -i email
```

**Что искать:**
- ✅ `INFO: Email sent successfully to test@yourdomain.com`
- ❌ `ERROR: Failed to send email` (если ошибка - проверить пароль)

---

## 📋 IONOS SMTP Настройки (Reference)

Согласно [IONOS Documentation](https://www.ionos.com/digitalguide/e-mail/technical-matters/smtp-server/):

| **Параметр**     | **Значение**                  | **Статус** |
|------------------|------------------------------|------------|
| SMTP Server      | smtp.ionos.co.uk             | ✅         |
| Port             | 587 (STARTTLS)               | ✅         |
| Encryption       | STARTTLS                     | ✅         |
| Username         | noreply@skybuildpro.co.uk    | ✅         |
| Password         | [YOUR_PASSWORD]              | ❌         |
| From Email       | noreply@skybuildpro.co.uk    | ✅         |
| From Name        | SkyBuild Pro                 | ✅         |

**Alternative Port:** 465 (SSL/TLS) - requires `secure: true` in SMTP config

---

## 🔍 Troubleshooting

### **Проблема 1: Email не приходит**

**Проверка 1 - SMTP credentials:**
```bash
cd /root/skybuild_o1_production/backend
cat .env | grep SMTP
```

**Проверка 2 - Backend логи:**
```bash
sudo journalctl -u skybuild-backend -n 100 --no-pager | grep -A 5 -B 5 "email"
```

**Проверка 3 - Тест SMTP вручную (telnet):**
```bash
telnet smtp.ionos.co.uk 587
# Должен ответить: 220 smtp.ionos.co.uk ESMTP
# Нажмите Ctrl+] затем quit
```

**Проверка 4 - Python SMTP test:**
```bash
cd /root/skybuild_o1_production/backend
source .venv/bin/activate

python3 << 'EOF'
import smtplib
from email.mime.text import MIMEText

# ЗАМЕНИТЕ на реальный пароль
smtp_host = "smtp.ionos.co.uk"
smtp_port = 587
smtp_user = "noreply@skybuildpro.co.uk"
smtp_password = "YOUR_PASSWORD_HERE"

try:
    msg = MIMEText("Test email from Python")
    msg['Subject'] = "Test IONOS SMTP"
    msg['From'] = smtp_user
    msg['To'] = "your-test-email@example.com"
    
    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
    
    print("✅ Email sent successfully!")
except Exception as e:
    print(f"❌ Error: {e}")
EOF
```

---

### **Проблема 2: Ошибка аутентификации**

**Возможные причины:**
1. ❌ Неправильный пароль
2. ❌ Username должен быть полный email: `noreply@skybuildpro.co.uk`
3. ❌ В IONOS email не активирован или заблокирован
4. ❌ SMTP порт заблокирован firewall'ом

**Проверка firewall:**
```bash
sudo ufw status | grep 587
# Если заблокирован:
sudo ufw allow out 587/tcp
```

---

### **Проблема 3: Email в SPAM**

**Решение:**
1. Настроить SPF record в DNS:
   ```
   v=spf1 include:spf.ionos.co.uk ~all
   ```

2. Настроить DKIM (в IONOS Control Panel)

3. Проверить deliverability:
   - https://www.mail-tester.com/
   - Отправьте тестовое письмо на адрес с mail-tester.com
   - Получите score и рекомендации

---

## 📊 Expected Flow

### **Регистрация с email verification:**

```
User submits signup form
         ↓
Backend creates user (email_verified=False)
         ↓
Backend generates verification token
         ↓
Backend sends email via IONOS SMTP
         ↓
User receives email in inbox
         ↓
User clicks "Verify Email Address" button
         ↓
Frontend: /verify-email?token=xxx
         ↓
Backend validates token
         ↓
Backend sets email_verified=True
         ↓
User redirected to /app/signin
         ↓
User can now login
```

---

## ✅ Преимущества IONOS SMTP vs SendGrid

✅ **Проще настроить** - нет OAuth, consent screen, tokens  
✅ **Нет проблем с локацией** - домен и сервер уже на IONOS  
✅ **Профессиональный вид** - письма с вашего домена  
✅ **Надежная доставляемость** - IONOS хорошая репутация  
✅ **Лимиты выше** - обычно 500-1000 писем/день на Mail Basic  
✅ **Встроенная защита** - SPF/DKIM настраивается в панели  

---

## 📝 Checklist

- [x] Backend код обновлен (email_verified=False)
- [x] Email отправка раскомментирована
- [x] .env частично обновлен (host, port, user)
- [ ] **SMTP_PASSWORD добавлен в .env** ⬅️ ТЕКУЩИЙ ШАГ
- [ ] Backend перезапущен
- [ ] Тестовая регистрация выполнена
- [ ] Email получен в inbox
- [ ] Email verification работает
- [ ] Комми

т изменений в git

---

## 🚀 После успешной настройки:

```bash
cd /root/skybuild_o1_production

# Закоммитить изменения
git add backend/app/api/v1/endpoints/auth.py
git commit -m "Enable email verification with IONOS SMTP

✅ Changed email_verified to False (require verification)
✅ Uncommented email sending in auth.py  
✅ Added try-catch for email errors
✅ Updated SMTP settings to IONOS

SMTP Config:
- Host: smtp.ionos.co.uk
- Port: 587 (STARTTLS)
- From: noreply@skybuildpro.co.uk

Registration now requires email verification."

git push origin main
```

---

## 📧 Email Template Preview

Пользователь получит красивое письмо:

**Subject:** Verify your SkyBuild Pro email address

**Body:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Welcome to SkyBuild Pro!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hi [User Name],

Thank you for signing up for SkyBuild Pro! 
We're excited to help you automate your 
construction takeoffs.

To get started, please verify your email 
address by clicking the button below:

┌───────────────────────────────────┐
│   [Verify Email Address]          │ (blue button)
└───────────────────────────────────┘

Or copy and paste this link:
https://skybuildpro.co.uk/verify-email?token=xxx

Your free trial includes:
• 2,000 credits (≈10 projects)
• 1 supplier with unlimited price items
• Export to CSV, Excel, and PDF
• Email support

This link will expire in 24 hours.

© 2025 SkyBuild Pro. All rights reserved.
```

---

**Status:** ⏳ **Awaiting SMTP password from IONOS**

Как только получите пароль - вставьте его в команду на **Шаге 2** выше! 🚀

