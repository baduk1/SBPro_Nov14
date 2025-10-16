# SkyBuild Pro - Update Guide v2.0

**Дата:** 2025-10-07
**Версия:** MVP Feature Pack (6 новых фич)

---

## ⚠️ ВАЖНО: Перед началом тестирования

**Backend должен быть запущен И пользователь должен быть залогинен!**

### Шаги для начала тестирования:

1. **Запусти backend** (если не запущен):
   ```bash
   cd /Users/rudra/Code_Projects/skybuild_o1/backend
   source env/bin/activate
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Запусти user frontend**:
   ```bash
   cd /Users/rudra/Code_Projects/skybuild_o1/apps/user-frontend
   npm run dev
   ```

3. **Залогинься в приложении**:
   - Открой http://localhost:5173
   - Кликни "Sign In" (или перейди на http://localhost:5173/app/signin)
   - Используй креды:
     - **Email:** `admin@example.com`
     - **Password:** `admin123`
   - После логина токен сохранится в localStorage

4. **Теперь можешь тестировать все фичи!**

---

## 🔍 Где найти каждую фичу

### ✅ **Feature 4: Dark Mode** - ВИДНА СРАЗУ
- **Где:** Правый верхний угол navbar (иконка луны 🌙)
- **Действие:** Кликни - переключится на темную тему
- **Persistence:** Сохраняется в localStorage

---

### **Feature 1: Share Project Link**
**Проблема:** Нужны jobs чтобы увидеть кнопку!

**Как протестировать:**
1. Кликни **"Upload File"** card
2. Загрузи любой IFC/DWG файл
3. Создастся job → вернись на Dashboard
4. В "Recent Jobs" появится **иконка Share** (слева от кнопок Status/Takeoff)
5. Кликни → скопируется ссылка + snackbar внизу экрана

**Технические детали:**
- Копирует в clipboard: `${window.location.origin}/app/jobs/${jobId}`
- Snackbar показывается 3 секунды
- Fallback если clipboard API не доступен

---

### **Feature 2: AI Mapping Suggestions**
**Где:** Страница Takeoff Preview (после обработки файла)

**Как протестировать:**
1. Загрузи IFC файл → дождись завершения
2. Перейди в **Jobs → [job_id] → Takeoff**
3. Сверху появится синяя карточка **"AI Mapping Assistant"**
4. Кнопка **"Get Suggestions"** → покажет чипы с маппингом (IfcWall → BRK-001 и т.д.)
5. Кликни на чип → применится маппинг

**Mock AI Logic:**
- IfcWall → BRK-001 (92% confidence)
- IfcSlab → CEM-001 (88% confidence)
- IfcBeam → STL-001 (85% confidence)
- IfcColumn → STL-002 (87% confidence)
- IfcDoor → WOD-001 (90% confidence)
- IfcWindow → GLZ-001 (89% confidence)
- ...еще 4 маппинга

**UI/UX:**
- Зеленые чипы (≥80% confidence) - высокая уверенность
- Оранжевые (60-80%) - средняя уверенность
- Серые (<60%) - низкая уверенность, требуется проверка

---

### **Feature 3: Bid Proposal PDF Export**
**Где:** Estimates страница

**Как протестировать:**
1. На Dashboard кликни **"Estimates"** card (3 estimates)
2. Выбери любой estimate (например "Riverside Apartments - Final Estimate")
3. Справа вверху кнопка **"Export PDF"** (с иконкой PDF)
4. Кликни → скачается профессиональный PDF

**PDF содержит:**
- ✅ Брендированный header (синий, SkyBuild Pro logo area)
- ✅ Document info (Project name, Date, Status, Description)
- ✅ Items table (Code, Description, Qty, Unit, Rate, Total)
- ✅ Subtotal footer
- ✅ Cost Adjustments section (если есть)
  - Overhead (%)
  - Profit margin (%)
  - Tax (%)
  - Logistics (fixed)
- ✅ Final Total box (оранжевый, крупный шрифт)
- ✅ Footer ("Generated with SkyBuild Pro...")

**Технические детали:**
- Библиотека: jsPDF + jspdf-autotable
- Автоматический filename: `{estimate_name}_proposal.pdf`
- Поддержка multi-page (если items > 20-30)
- Currency formatting (£/€/₽)

---

### **Feature 5: Mock Admin Approvals**
**Где:** Admin Frontend (отдельный порт)

**Как протестировать:**
1. Запусти admin frontend:
   ```bash
   cd apps/admin-frontend
   npm run dev
   ```
2. Открой `http://localhost:5174` (или порт из вывода)
3. Sign in как admin
4. Перейди в **"Access Requests"**
5. Увидишь 2 mock requests:
   - Ivan Petrov (BuildCo Ltd)
   - Maria Ivanova (Elite Contractors)
6. Зеленая галочка ✓ = Approve
7. Красный крестик ✗ = Reject
8. Кликни → появится snackbar

**Функционал:**
- ✅ Approve/Reject кнопки (disabled после действия)
- ✅ Snackbar notification "Request approved (mock mode - email notification would be sent)"
- ✅ Status chips (цветные индикаторы):
  - 🟢 Green = approved
  - 🔴 Red = rejected
  - 🔵 Blue = reviewed
  - ⚪ Gray = new
- ✅ Refresh button (перезагружает из localStorage)
- ✅ Empty state если нет requests
- ✅ Fallback to localStorage если backend не доступен

**Mock data location:** `localStorage['accessRequests']`

---

### **Feature 6: Email Verification Flow**
**Где:** Landing page → Access Request Form

**Как протестировать:**
1. Открой корневую страницу: `http://localhost:5173/` (Landing)
2. Найди **"Request Access"** форму
3. Заполни обязательные поля:
   - Name (required)
   - Email (required)
   - Company (optional)
   - Message (optional)
4. Кликни **"Request Access"**
5. Появится modal **"Email Verification"**

**Flow:**
- **0-5s:** Показывается CircularProgress + "Verifying your email..."
- **5-7s:** ✅ "Email Verified!" + иконка конверта + "We've sent a verification link to {email}"
- **7s:** Auto-redirect + закрытие modal

**Дополнительно:**
- ✅ Кнопка "Didn't receive email? Resend" (появляется после verification)
- ✅ Resend cooldown: 60 секунд (таймер отображается)
- ✅ Validation: кнопка "Request Access" disabled если нет Name или Email
- ✅ Modal с `disableEscapeKeyDown` (нельзя закрыть случайно)
- ✅ Focus trap (accessibility)

**Mock behavior:**
- Сохраняет request в `localStorage['accessRequests']`
- Сохраняет verified email в `localStorage['emailVerified']`

---

## 📊 Краткая шпаргалка

| Фича | Где найти | Как активировать |
|------|-----------|------------------|
| **Dark Mode** ✅ | Navbar (везде) | Кликни иконку луны 🌙 |
| **Share Link** | Dashboard → Recent Jobs | Загрузи файл → иконка Share |
| **AI Mapping** | Takeoff Preview | Загрузи IFC → Jobs → Takeoff → кнопка "Get Suggestions" |
| **PDF Export** | Estimates Details | Dashboard → Estimates → любой estimate → "Export PDF" |
| **Admin Approvals** | Admin Frontend | `localhost:5174` → Access Requests → зеленая галочка |
| **Email Verify** | Landing → Access Request | Заполни форму → увидишь modal с verification |

---

## 🔧 Технические детали реализации

### Новые файлы:
```
apps/user-frontend/src/
├── components/
│   └── AIMappingSuggestions.tsx          (124 lines)
├── hooks/
│   └── useColorMode.tsx                  (81 lines)
└── services/
    └── pdfExport.ts                      (151 lines)
```

### Обновленные файлы:
```
apps/user-frontend/src/
├── components/
│   ├── AccessRequestForm.tsx             (+110 lines - email verification)
│   └── Navbar.tsx                        (+15 lines - dark mode toggle)
├── pages/
│   ├── Dashboard.tsx                     (+20 lines - share button)
│   ├── TakeoffPreview.tsx                (+25 lines - AI integration)
│   └── Estimates/EstimateDetails.tsx     (+10 lines - PDF export)
└── main.tsx                              (-5 lines - ColorModeProvider)

apps/admin-frontend/src/
└── pages/
    └── AdminAccessRequests.tsx           (+95 lines - approve/reject UI)
```

### Новые зависимости:
```json
{
  "jspdf": "^3.0.3",
  "jspdf-autotable": "^5.0.2"
}
```

### Build размер:
```
dist/index-UAY3Lzdj.js   1,396.82 kB │ gzip: 437.61 kB
✓ built in 5.15s
```

---

## 🎯 Next Steps (после customer development)

**Если фичи валидируются:**
1. Реализовать backend для всех 6 фич
2. Заменить localStorage на реальные API calls
3. Добавить real AI model для маппинга (вместо static lookup)
4. Email SMTP integration для verification
5. PDF customization (upload logo, custom colors)
6. Admin dashboard metrics

**Backend endpoints (TODO):**
```
POST   /api/v1/jobs/{id}/share           # Generate shareable link
POST   /api/v1/jobs/{id}/ai-mapping      # AI suggestions
POST   /api/v1/estimates/{id}/export-pdf  # Server-side PDF
PATCH  /api/v1/admin/access-requests/{id}/approve
PATCH  /api/v1/admin/access-requests/{id}/reject
POST   /api/v1/auth/send-verification
POST   /api/v1/auth/verify-email
```

---

## 🐛 Known Issues / Limitations

1. **Share Link:** Только копирование, нет email share или permissions
2. **AI Mapping:** Статичная таблица, не учитывает context проекта
3. **PDF Export:** Нет customization (logo, colors, templates)
4. **Dark Mode:** Не синхронизируется с system preference (prefers-color-scheme)
5. **Email Verification:** Mock delay, нет real SMTP
6. **Admin Approvals:** Нет bulk operations (approve all)

---

## 🔧 Troubleshooting

### Проблема: "Not Found" при загрузке файла

**Симптомы:**
- После выбора файла и клика "Upload and start" появляется alert "Not Found"
- Или browser console показывает 401/404 ошибки

**Причины и решения:**

1. **Не залогинен** (самая частая причина)
   - ✅ **Решение:** Залогинься через Sign In страницу (`admin@example.com` / `admin123`)
   - Проверь: В Developer Tools → Application → Local Storage должен быть ключ `token`

2. **Backend не запущен**
   - ✅ **Решение:** Запусти backend в отдельном терминале:
     ```bash
     cd /Users/rudra/Code_Projects/skybuild_o1/backend
     source env/bin/activate
     uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
     ```
   - Проверь: http://localhost:8000/healthz должен вернуть `{"ok":true}`

3. **Неправильный backend запущен**
   - ✅ **Решение:** Убей все uvicorn процессы и запусти правильный:
     ```bash
     lsof -ti:8000 | xargs kill -9
     cd /Users/rudra/Code_Projects/skybuild_o1/backend
     source env/bin/activate
     uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
     ```

4. **Порты конфликтуют**
   - Проверь что frontend на порту 5173, backend на 8000
   - ✅ **Решение:** Закрой старые процессы

### Проблема: Features не видны

**Если видишь только Dark Mode toggle:**

1. **Share Link** - нужны jobs:
   - Сначала залогинься, загрузи IFC файл
   - Jobs появятся на Dashboard в секции "Recent Jobs"
   - Иконка Share появится слева от кнопок

2. **AI Mapping** - нужен completed job:
   - Загрузи IFC → дождись обработки
   - Перейди Jobs → [job_id] → Takeoff
   - Появится синяя карточка "AI Mapping Assistant"

3. **PDF Export** - нужны estimates:
   - Dashboard → Estimates card (показывает "3 estimates")
   - Выбери любой estimate
   - Кнопка "Export PDF" справа вверху

4. **Email Verification**:
   - Открой корневую страницу http://localhost:5173/ (Landing)
   - Заполни форму "Request Access"
   - Modal появится автоматически

5. **Admin Approvals**:
   - Запусти admin frontend: `cd apps/admin-frontend && npm run dev`
   - Открой http://localhost:5174
   - Sign in → Access Requests

---

## 📝 Testing Checklist

- [ ] Dark Mode переключается корректно
- [ ] Dark Mode сохраняется после refresh
- [ ] Share копирует правильный URL
- [ ] Share Snackbar отображается 3s
- [ ] AI Mapping показывает suggestions для IFC items
- [ ] AI Mapping применяет mapping при клике на chip
- [ ] PDF экспортируется с правильными данными
- [ ] PDF содержит все секции (items, adjustments, total)
- [ ] Admin Approvals обновляет status
- [ ] Admin Approvals показывает snackbar
- [ ] Email Verification modal открывается
- [ ] Email Verification проходит 5s delay
- [ ] Email Verification auto-closes
- [ ] Resend button работает с cooldown

---

*Обновлено: 2025-10-07*
*Автор: Claude Code (Anthropic)*
