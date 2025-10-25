# 📧 НАСТРОЙКА EMAIL ДЛЯ ОТПРАВКИ VERIFICATION

## Текущий статус: MOCK режим
Email только логируется в консоль, но НЕ отправляется реально.

---

## 🚀 БЫСТРАЯ НАСТРОЙКА (Gmail)

### Шаг 1: Получить App Password от Gmail

1. **Открой:** https://myaccount.google.com/security

2. **Включи 2-Step Verification** (если еще не включено):
   - Найди раздел "2-Step Verification"
   - Нажми "Get started"
   - Следуй инструкциям

3. **Создай App Password**:
   - Вернись на https://myaccount.google.com/security
   - Найди **"App passwords"** (внизу страницы)
   - Может потребоваться снова ввести пароль
   
   - Выбери:
     - **Select app:** Mail
     - **Select device:** Other (Custom name)
     - Введи: "SkyBuild Backend"
   
   - Нажми **Generate**
   
   - Google покажет **16-значный пароль**, например:
     ```
     abcd efgh ijkl mnop
     ```
   
   - **СКОПИРУЙ ЭТОт ПАРОЛЬ!** (без пробелов: `abcdefghijklmnop`)

---

### Шаг 2: Обновить backend/.env

Открой файл `backend/.env` и замени значения:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=твой-реальный-gmail@gmail.com
SMTP_PASSWORD=abcdefghijklmnop  # 16-значный App Password БЕЗ пробелов
SMTP_FROM_EMAIL=твой-реальный-gmail@gmail.com
SMTP_FROM_NAME=SkyBuild Pro
FRONTEND_URL=http://localhost:5173
```

**Пример:**
```bash
SMTP_USER=george.mikadze@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
SMTP_FROM_EMAIL=george.mikadze@gmail.com
```

---

### Шаг 3: Перезапустить Backend

```bash
# Останови текущий backend (Ctrl+C)
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

### Шаг 4: Протестировать

1. Открой http://localhost:5173/
2. Нажми "Start free trial"
3. Заполни форму с **реальным email**
4. Нажми "Sign Up"

**Теперь на почту должен прийти реальный email!** 📬

Проверь:
- Inbox
- Spam folder (первый раз может попасть в спам)

---

## 🔧 Если не работает:

### Проблема: "Authentication failed"

**Причина:** Неправильный App Password или он не был создан

**Решение:**
1. Убедись что 2-Step Verification включена
2. Создай новый App Password
3. Скопируй БЕЗ пробелов

---

### Проблема: Email не приходит

**Проверь:**
1. Папку Spam
2. Логи backend - должно быть:
   ```
   INFO: Email sent successfully to твой-email@gmail.com
   ```
   Вместо:
   ```
   WARNING: SMTP not configured. Email would be sent to: твой-email@gmail.com
   ```

---

## 🎯 АЛЬТЕРНАТИВА: DEMO режим (без настройки SMTP)

Если не хочешь настраивать email, можешь работать в DEMO режиме:

1. Оставь SMTP_HOST пустым в .env (убери эту строку)
2. После регистрации посмотри в **консоль backend**
3. Найди строку с verification link:
   ```
   INFO: Content: ...http://localhost:5173/verify-email?token=XXXXXXXXX...
   ```
4. Скопируй этот URL и открой в браузере

---

## ✅ Проверка что email настроен правильно:

После перезапуска backend, в логах при старте должно быть:
```
INFO: SMTP configured: smtp.gmail.com:587
```

Вместо:
```
WARNING: SMTP not configured
```
