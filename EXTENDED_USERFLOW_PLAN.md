# SkyBuild Pro - Extended User Flow Implementation Plan

**Дата создания:** 2025-10-03
**Версия:** v1.0

---

## 📋 Содержание

1. [Текущее состояние проекта](#текущее-состояние-проекта)
2. [Анализ нового User Flow](#анализ-нового-user-flow)
3. [Backend: Модели данных](#backend-модели-данных)
4. [Backend: API Endpoints](#backend-api-endpoints)
5. [Frontend: Страницы и компоненты](#frontend-страницы-и-компоненты)
6. [Расширенный User Flow](#расширенный-user-flow)
7. [Roadmap реализации](#roadmap-реализации)
8. [Технические детали](#технические-детали)
9. [Объем работ](#объем-работ)

---

## Текущее состояние проекта

### Архитектура
- **Backend**: FastAPI (Python 3.11+), SQLite/PostgreSQL
- **Frontend**: Два React-приложения (User + Admin) с Material-UI
- **Функциональность**: Загрузка файлов (IFC/DWG/DXF/PDF) → валидация → take-off → применение цен → экспорт BoQ (CSV/XLSX/PDF)

### Технические особенности
- JWT-аутентификация с ролями (user/admin)
- SSE (Server-Sent Events) для real-time обновления статуса задач
- Presigned URLs для безопасной загрузки файлов
- Background processing для обработки файлов
- Система маппинга элементов на прайс-листы

### Текущий User Flow

```
ПУБЛИЧНЫЙ ДОСТУП
    │
    ▼
Landing Page (/)
    │
    ├─→ Request Access (public form) → POST /public/access-requests
    │
    └─→ Sign In (/app/signin) → POST /auth/login → JWT Token
                                                          │
                        ┌─────────────────────────────────┴──────────────────────┐
                        ▼                                                        ▼
                USER APPLICATION                                    ADMIN APPLICATION

USER FLOW:                                              ADMIN FLOW:
1. Dashboard (/app/dashboard)                           1. Admin Dashboard (/dashboard)
2. Upload File (/app/upload)                            2. Access Requests (/access-requests)
   → POST /files (presigned)                            3. Price Lists (/price-lists)
   → PUT /files/:id/content                             4. Mappings (/mappings)
   → POST /jobs
3. Job Status (/app/jobs/:id)
   → SSE: GET /jobs/:id/stream
4. Takeoff Preview (/app/jobs/:id/takeoff)
   → GET /jobs/:id/takeoff
   → PATCH /jobs/:id/mapping
   → POST /jobs/:id/apply-prices
5. Export BoQ
   → POST /jobs/:id/export?format=csv
   → GET /artifacts/:id/download
```

### Backend Job Processing Pipeline

```
POST /jobs (triggers background processing)
    │
    ▼
1. QUEUED (5%)
    ▼
2. VALIDATING (15%) - IFC validator
    ▼
3. PARSING (30%) - Load model
    ▼
4. TAKEOFF (60%) - IFC/DWG/PDF takeoff
    ▼
5. SAVE BoQ Items (85%)
    ▼
6. PRICING (90%) - Auto-apply prices
    ▼
7. COMPLETED (100%)
```

---

## Анализ нового User Flow

### Новые функции из схемы `/Users/rudra/Desktop/raushan_extended_userflow_v0.png`:

1. **Каталог поставщиков с ценами** - пользователь создает/управляет собственными прайс-листами поставщиков
2. **Библиотека темплейтов** - сохранение и переиспользование настроек/конфигураций
3. **Управление проектом** - просмотр истории, биллинга, управление данными
4. **Бухгалтерия/финансы** - финансовая отчётность
5. **Библиотека результатов** - сохранение и переиспользование готовых смет
6. **Прототип калькулятора расходов** - добавление дополнительных расходов к смете

### Расширенный сценарий использования:

```
Вход → Регистрация → Получает ссылку на кабинет → Регистрируется в кабинете
    │
    ├─→ Смотрит/читает тьюториал
    │
    ├─→ Загружает файл → Выгружает результат в нужном виде
    │       │
    │       ├─→ Есть свой каталог поставщиков и цен
    │       ├─→ Есть библиотека темплейтов
    │       ├─→ Создает каталоги поставщиков
    │       ├─→ Выбирает код исполнителя данных (кол-ти, объем)
    │       ├─→ Сохраняет в свою библиотеку (может ее использовать)
    │       ├─→ Может взять старую смету и добавить туда/изменить
    │       ├─→ Может ли в виде окна появилась смета?
    │       │
    │       └─→ Управление проектом
    │           ├─→ Бухгалтерия/финансы
    │           └─→ Какой-то прототип калькулятора расходов
    │
    └─→ Есть его данные и история, биллинг
```

---

## Backend: Модели данных

### A. Supplier Catalog (Каталог поставщиков)

```python
# models/supplier.py
class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    contact_info = Column(String, nullable=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="suppliers")
    price_items = relationship("SupplierPriceItem", back_populates="supplier", cascade="all, delete-orphan")


# models/supplier_price_item.py
class SupplierPriceItem(Base):
    __tablename__ = "supplier_price_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=False)
    code = Column(String, nullable=False, index=True)
    description = Column(String, nullable=False)
    unit = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    currency = Column(String, default="RUB")
    effective_from = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    supplier = relationship("Supplier", back_populates="price_items")
```

### B. Templates Library (Библиотека темплейтов)

```python
# models/template.py
class Template(Base):
    __tablename__ = "templates"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    template_type = Column(String, nullable=False)  # "mapping", "pricing", "export"
    config_json = Column(String, nullable=True)  # JSON with template settings
    is_public = Column(Boolean, default=False)  # can be shared
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="templates")
    mappings = relationship("TemplateMapping", back_populates="template", cascade="all, delete-orphan")


# models/template_mapping.py
class TemplateMapping(Base):
    __tablename__ = "template_mappings"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    template_id = Column(String, ForeignKey("templates.id"), nullable=False)
    source_code = Column(String, nullable=False)  # IFC type / DWG layer
    target_code = Column(String, nullable=False)  # price item code
    allowance_percent = Column(Float, default=0.0)

    # Relationships
    template = relationship("Template", back_populates="mappings")
```

### C. Estimates Library (Библиотека смет)

```python
# models/estimate.py
class Estimate(Base):
    __tablename__ = "estimates"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    base_total = Column(Float, default=0.0)
    adjustments_total = Column(Float, default=0.0)
    final_total = Column(Float, default=0.0)
    currency = Column(String, default="RUB")
    status = Column(String, default="draft")  # draft, final, archived
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="estimates")
    project = relationship("Project", back_populates="estimates")
    job = relationship("Job", back_populates="estimates")
    items = relationship("EstimateItem", back_populates="estimate", cascade="all, delete-orphan")
    adjustments = relationship("CostAdjustment", back_populates="estimate", cascade="all, delete-orphan")


# models/estimate_item.py
class EstimateItem(Base):
    __tablename__ = "estimate_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    estimate_id = Column(String, ForeignKey("estimates.id"), nullable=False)
    code = Column(String, nullable=False)
    description = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    source = Column(String, default="manual")  # "takeoff", "manual", "template"
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=True)

    # Relationships
    estimate = relationship("Estimate", back_populates="items")
    supplier = relationship("Supplier")
```

### D. Cost Calculator (Калькулятор расходов)

```python
# models/cost_adjustment.py
class CostAdjustment(Base):
    __tablename__ = "cost_adjustments"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    estimate_id = Column(String, ForeignKey("estimates.id"), nullable=False)
    category = Column(String, nullable=False)  # "overhead", "profit", "tax", "logistics", "custom"
    name = Column(String, nullable=False)
    calculation_type = Column(String, nullable=False)  # "percent", "fixed", "per_unit"
    value = Column(Float, nullable=False)
    applied_to = Column(String, default="subtotal")  # "subtotal", "total", "specific_items"
    order = Column(Integer, default=0)  # sequence for calculations
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    estimate = relationship("Estimate", back_populates="adjustments")
```

### E. Project History & Billing

```python
# models/project_snapshot.py
class ProjectSnapshot(Base):
    __tablename__ = "project_snapshots"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    snapshot_type = Column(String, nullable=False)  # "estimate", "billing", "milestone"
    data_json = Column(String, nullable=False)  # JSON snapshot of data
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    project = relationship("Project", back_populates="snapshots")


# models/billing_record.py
class BillingRecord(Base):
    __tablename__ = "billing_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="RUB")
    status = Column(String, default="draft")  # "draft", "sent", "paid", "cancelled"
    due_date = Column(Date, nullable=True)
    paid_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="billing_records")
    project = relationship("Project", back_populates="billing_records")
```

---

## Backend: API Endpoints

### Supplier Catalog API

```python
# endpoints/suppliers.py

GET    /api/v1/suppliers                        # List user's suppliers
POST   /api/v1/suppliers                        # Create supplier
GET    /api/v1/suppliers/{id}                   # Get supplier details
PATCH  /api/v1/suppliers/{id}                   # Update supplier
DELETE /api/v1/suppliers/{id}                   # Delete supplier

GET    /api/v1/suppliers/{id}/items             # List price items
POST   /api/v1/suppliers/{id}/items/import      # Bulk import (CSV/XLSX)
POST   /api/v1/suppliers/{id}/items             # Add price item
PATCH  /api/v1/suppliers/{id}/items/{item_id}   # Update price item
DELETE /api/v1/suppliers/{id}/items/{item_id}   # Delete price item
```

### Templates API

```python
# endpoints/templates.py

GET    /api/v1/templates                        # List templates (my + public)
POST   /api/v1/templates                        # Create template
GET    /api/v1/templates/{id}                   # Get template details
PATCH  /api/v1/templates/{id}                   # Update template
DELETE /api/v1/templates/{id}                   # Delete template
POST   /api/v1/templates/{id}/apply             # Apply template to job
POST   /api/v1/templates/{id}/clone             # Clone template
```

### Estimates Library API

```python
# endpoints/estimates.py

GET    /api/v1/estimates                        # List all estimates
POST   /api/v1/estimates                        # Create estimate (from job or manual)
GET    /api/v1/estimates/{id}                   # Get estimate details
PATCH  /api/v1/estimates/{id}                   # Update estimate
DELETE /api/v1/estimates/{id}                   # Delete estimate
POST   /api/v1/estimates/{id}/duplicate         # Duplicate estimate
GET    /api/v1/estimates/{id}/items             # Get estimate items
POST   /api/v1/estimates/{id}/items             # Add manual item
PATCH  /api/v1/estimates/{id}/items/{item_id}   # Update item
DELETE /api/v1/estimates/{id}/items/{item_id}   # Delete item
```

### Cost Calculator API

```python
# endpoints/cost_calculator.py

GET    /api/v1/estimates/{id}/adjustments       # List adjustments
POST   /api/v1/estimates/{id}/adjustments       # Add adjustment
PATCH  /api/v1/estimates/{id}/adjustments/{adj_id}  # Update adjustment
DELETE /api/v1/estimates/{id}/adjustments/{adj_id}  # Delete adjustment
POST   /api/v1/estimates/{id}/recalculate       # Recalculate totals
```

### Project Management API (расширение)

```python
# endpoints/projects.py (расширение существующего)

GET    /api/v1/projects/{id}/history            # View project history
GET    /api/v1/projects/{id}/billing            # View billing records
POST   /api/v1/projects/{id}/billing            # Create billing record
GET    /api/v1/projects/{id}/snapshots          # Get snapshots
POST   /api/v1/projects/{id}/snapshots          # Create snapshot
```

### Export Extensions

```python
# endpoints/export.py (расширение существующего)

POST   /api/v1/estimates/{id}/export            # Export estimate (CSV/XLSX/PDF)
GET    /api/v1/estimates/{id}/artifacts         # List estimate artifacts
```

---

## Frontend: Страницы и компоненты

### User Frontend Pages (`apps/user-frontend/src/pages/`)

```
├── Dashboard.tsx                     # ✅ EXISTS - добавить ссылки на новые разделы
│
├── Projects/                         # NEW SECTION
│   ├── ProjectsList.tsx              # NEW - список проектов с фильтрами
│   ├── ProjectDetails.tsx            # NEW - детали проекта
│   ├── ProjectHistory.tsx            # NEW - история изменений
│   └── ProjectBilling.tsx            # NEW - биллинг по проекту
│
├── Suppliers/                        # NEW SECTION
│   ├── SuppliersList.tsx             # NEW - каталог поставщиков
│   ├── SupplierCreate.tsx            # NEW - создание поставщика
│   ├── SupplierDetails.tsx           # NEW - карточка поставщика
│   └── SupplierPriceImport.tsx       # NEW - импорт прайс-листа
│
├── Templates/                        # NEW SECTION
│   ├── TemplatesList.tsx             # NEW - библиотека темплейтов
│   ├── TemplateCreate.tsx            # NEW - создание темплейта
│   ├── TemplateDetails.tsx           # NEW - просмотр/редактирование
│   └── TemplateApply.tsx             # NEW - применение к работе
│
├── Estimates/                        # NEW SECTION
│   ├── EstimatesList.tsx             # NEW - библиотека смет
│   ├── EstimateCreate.tsx            # NEW - создание сметы
│   ├── EstimateDetails.tsx           # NEW - детали сметы
│   ├── EstimateEditor.tsx            # NEW - редактор позиций
│   └── CostCalculator.tsx            # NEW - калькулятор расходов
│
├── TakeoffPreview.tsx                # ✅ EXISTS - интеграция с Estimates
├── JobStatus.tsx                     # ✅ EXISTS - добавить кнопку "Save to Library"
└── Upload.tsx                        # ✅ EXISTS - добавить выбор темплейта
```

### Новые компоненты (`apps/user-frontend/src/components/`)

```typescript
// EXISTING (reuse):
├── DataTable.tsx                  # ✅ EXISTS - переиспользуем
├── FileUpload.tsx                 # ✅ EXISTS - расширим для импорта прайсов

// NEW Components:
├── SupplierCard.tsx              # Карточка поставщика
├── SupplierPriceTable.tsx        # Таблица цен поставщика
├── TemplateCard.tsx              # Карточка темплейта
├── EstimateCard.tsx              # Карточка сметы
├── EstimateItemsTable.tsx        # Таблица позиций сметы
├── CostAdjustmentForm.tsx        # Форма добавления расхода
├── CostBreakdown.tsx             # Визуализация структуры расходов
├── ProjectTimeline.tsx           # Таймлайн истории проекта
├── BillingTable.tsx              # Таблица счетов
├── ImportDialog.tsx              # Диалог импорта (CSV/XLSX)
└── ExportMenu.tsx                # Меню экспорта с форматами
```

### Router Configuration Updates

```typescript
// apps/user-frontend/src/main.tsx (дополнить)

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  {
    path: '/app',
    element: <Shell />,
    children: [
      { path: '', element: <Navigate to="dashboard" /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'signin', element: <SignIn /> },

      // Projects
      { path: 'projects', element: <ProjectsList /> },
      { path: 'projects/:id', element: <ProjectDetails /> },
      { path: 'projects/:id/history', element: <ProjectHistory /> },
      { path: 'projects/:id/billing', element: <ProjectBilling /> },

      // Suppliers
      { path: 'suppliers', element: <SuppliersList /> },
      { path: 'suppliers/new', element: <SupplierCreate /> },
      { path: 'suppliers/:id', element: <SupplierDetails /> },

      // Templates
      { path: 'templates', element: <TemplatesList /> },
      { path: 'templates/new', element: <TemplateCreate /> },
      { path: 'templates/:id', element: <TemplateDetails /> },

      // Estimates
      { path: 'estimates', element: <EstimatesList /> },
      { path: 'estimates/new', element: <EstimateCreate /> },
      { path: 'estimates/:id', element: <EstimateDetails /> },
      { path: 'estimates/:id/calculator', element: <CostCalculator /> },

      // Existing routes
      { path: 'upload', element: <Upload /> },
      { path: 'jobs/:id', element: <JobStatus /> },
      { path: 'jobs/:id/takeoff', element: <TakeoffPreview /> },
    ],
  },
])
```

---

## Расширенный User Flow

### Детальный поток с новыми функциями

```
┌─────────────────────────────────────────────────────────────────┐
│                    ВХОД В СИСТЕМУ                                │
└─────────────────────────────────────────────────────────────────┘
  Landing (/) → Sign In → Dashboard
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│  PROJECTS    │    │   SUPPLIERS      │    │  TEMPLATES   │
└──────────────┘    └──────────────────┘    └──────────────┘
        │                     │                     │
        │                     │                     │
┌───────▼──────────────────────────────────────────▼───────┐
│                NEW UPLOAD FLOW                            │
│  1. Select/Create Project                                 │
│  2. (Optional) Select Template                            │
│  3. Upload File (IFC/DWG/PDF)                             │
│  4. (Optional) Select Supplier Catalog                    │
│  5. Create Job                                            │
└───────────────────────────┬───────────────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │   JOB PROCESSING │
                  │   (same as now)  │
                  └──────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────┐
│              TAKEOFF PREVIEW (Enhanced)                   │
│  • Review quantities                                      │
│  • Apply mapping (manual or from template)                │
│  • Select price source:                                   │
│    - Default price list (admin)                           │
│    - Supplier catalog (my)                                │
│    - Mix (item by item)                                   │
│  • Add allowances                                         │
│  • SAVE AS TEMPLATE (new button)                          │
│  • CREATE ESTIMATE (new button)                           │
└───────────────────────────┬───────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
  ┌──────────────────┐          ┌──────────────────────┐
  │ SAVE AS TEMPLATE │          │  CREATE ESTIMATE     │
  │  • Name template │          │  • Name estimate     │
  │  • Save mappings │          │  • Copy all items    │
  │  • Save settings │          │  • Set base total    │
  └──────────────────┘          └──────┬───────────────┘
                                       │
                                       ▼
                        ┌──────────────────────────────┐
                        │   COST CALCULATOR            │
                        │   • Add overhead (%)         │
                        │   • Add profit margin (%)    │
                        │   • Add tax (%)              │
                        │   • Add logistics (fixed)    │
                        │   • Custom adjustments       │
                        │   • Recalculate total        │
                        └──────┬───────────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  SAVE TO LIBRARY │
                        │  (Estimates)     │
                        └──────┬───────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  EXPORT          │
                        │  • CSV/XLSX/PDF  │
                        │  • Share link    │
                        └──────────────────┘
```

### Интеграции между модулями

**A. Project Management Integration**
- На странице Project Details показывать:
  - Все Jobs связанные с проектом
  - Все Estimates связанные с проектом
  - История изменений (snapshots)
  - Billing records

**B. Supplier Catalog Integration**
- В Takeoff Preview добавить dropdown для выбора источника цен:
  - "Use default price list" (existing)
  - "Use supplier: {name}" (new)
  - "Mix sources" (new - позволяет выбирать для каждой позиции)

**C. Template Application**
- При Upload файла можно выбрать Template
- Template автоматически применяет:
  - Mapping rules (IFC type → price code)
  - Allowance percentages
  - Preferred price source (supplier catalog)

**D. Estimates Reuse**
- Из библиотеки смет можно:
  - Duplicate estimate (создать копию)
  - Use as template (сохранить как темплейт)
  - Export to file
  - Share with team (future feature)

---

## Roadmap реализации

### Phase 1: Foundation (Week 1-2) 🟢 КРИТИЧНО

**Backend:**
- [ ] Создать модели: `Supplier`, `SupplierPriceItem`
- [ ] Создать модели: `Estimate`, `EstimateItem`
- [ ] API для Suppliers (CRUD + import)
- [ ] API для Estimates (CRUD + items)
- [ ] Alembic миграции БД

**Frontend:**
- [ ] Страницы: `SuppliersList`, `SupplierDetails`, `SupplierPriceImport`
- [ ] Страницы: `EstimatesList`, `EstimateDetails`, `EstimateEditor`
- [ ] Компоненты: `SupplierCard`, `EstimateItemsTable`
- [ ] React Query hooks: `useSuppliers`, `useEstimates`

**Integration:**
- [ ] Добавить кнопку "Create Estimate" в TakeoffPreview
- [ ] Добавить выбор Supplier в TakeoffPreview
- [ ] Обновить роутинг

**Deliverables:**
- Рабочий каталог поставщиков с импортом прайс-листов
- Создание смет из takeoff результатов
- Ручное редактирование смет

---

### Phase 2: Templates & Calculator (Week 3-4) 🟡 ВАЖНО

**Backend:**
- [ ] Модели: `Template`, `TemplateMapping`
- [ ] Модель: `CostAdjustment`
- [ ] API для Templates (CRUD + apply + clone)
- [ ] API для Cost Calculator (adjustments + recalculate)
- [ ] Сервис: `templates.py` (apply logic)
- [ ] Сервис: `cost_calculator.py` (calculation engine)

**Frontend:**
- [ ] Страницы: `TemplatesList`, `TemplateCreate`, `TemplateDetails`
- [ ] Компонент: `CostCalculator`
- [ ] Компоненты: `CostAdjustmentForm`, `CostBreakdown`
- [ ] Интеграция выбора Template при Upload
- [ ] React Query hooks: `useTemplates`, `useCostCalculator`

**Integration:**
- [ ] Кнопка "Save as Template" в TakeoffPreview
- [ ] Применение темплейта при создании Job
- [ ] Cost Calculator в EstimateDetails
- [ ] Auto-recalculate при изменении adjustments

**Deliverables:**
- Библиотека переиспользуемых темплейтов
- Калькулятор расходов с гибкими правилами
- Автоматическое применение настроек

---

### Phase 3: Project Management (Week 5-6) 🟠 СРЕДНИЙ ПРИОРИТЕТ

**Backend:**
- [ ] Модели: `ProjectSnapshot`, `BillingRecord`
- [ ] Расширить Projects API (history, billing, snapshots)
- [ ] Сервис: автоматическое создание snapshots

**Frontend:**
- [ ] Страницы: `ProjectsList`, `ProjectDetails`
- [ ] Страницы: `ProjectHistory`, `ProjectBilling`
- [ ] Компоненты: `ProjectTimeline`, `BillingTable`
- [ ] React Query hooks: `useProjectHistory`, `useBilling`

**Integration:**
- [ ] Dashboard показывает Projects overview
- [ ] Связь Projects ↔ Jobs ↔ Estimates
- [ ] Auto-snapshot при создании estimate

**Deliverables:**
- Полноценное управление проектами
- История всех изменений
- Биллинг и финансовая отчётность

---

### Phase 4: Polish & Advanced Features (Week 7-8) ⚪ NICE-TO-HAVE

**Backend:**
- [ ] Advanced search/filters для всех entities
- [ ] Bulk operations (delete, export multiple estimates)
- [ ] Permissions (share templates/estimates with team)
- [ ] API rate limiting и caching

**Frontend:**
- [ ] Advanced filters на всех list pages
- [ ] Export menu с опциями форматирования
- [ ] Sharing dialogs
- [ ] Analytics dashboard (stats, charts)
- [ ] Mobile responsive improvements

**Integration:**
- [ ] Email notifications для billing
- [ ] PDF branding/customization
- [ ] Webhook integrations (future)

**Deliverables:**
- Полированный UX/UI
- Расширенная аналитика
- Team collaboration features

---

## Технические детали

### Database Migrations Strategy

```bash
# Alembic migrations порядок:

1. add_suppliers_tables.py
   - suppliers
   - supplier_price_items

2. add_templates_tables.py
   - templates
   - template_mappings

3. add_estimates_tables.py
   - estimates
   - estimate_items

4. add_cost_adjustments_table.py
   - cost_adjustments

5. add_project_management_tables.py
   - project_snapshots
   - billing_records
```

### API Services Architecture

```python
# backend/app/services/

├── suppliers.py          # NEW - Supplier CRUD + import logic
├── templates.py          # NEW - Template apply/clone logic
├── estimates.py          # NEW - Estimate creation from job/manual
├── cost_calculator.py    # NEW - Adjustment calculations engine
├── exports.py            # ✅ EXISTS - extend for estimates
├── jobs.py               # ✅ EXISTS - integrate template application
├── pricing.py            # ✅ EXISTS - support supplier catalogs
└── storage.py            # ✅ EXISTS - no changes needed
```

### Frontend State Management

```typescript
// React Query hooks structure:

// apps/user-frontend/src/hooks/

├── useSuppliers.ts       // NEW
│   ├── useSuppliers()           → GET /suppliers
│   ├── useSupplier(id)          → GET /suppliers/:id
│   ├── useCreateSupplier()      → POST /suppliers
│   ├── useUpdateSupplier()      → PATCH /suppliers/:id
│   ├── useDeleteSupplier()      → DELETE /suppliers/:id
│   └── useImportPrices()        → POST /suppliers/:id/items/import

├── useTemplates.ts       // NEW
│   ├── useTemplates()           → GET /templates
│   ├── useTemplate(id)          → GET /templates/:id
│   ├── useCreateTemplate()      → POST /templates
│   ├── useUpdateTemplate()      → PATCH /templates/:id
│   ├── useApplyTemplate()       → POST /templates/:id/apply
│   └── useCloneTemplate()       → POST /templates/:id/clone

├── useEstimates.ts       // NEW
│   ├── useEstimates()           → GET /estimates
│   ├── useEstimate(id)          → GET /estimates/:id
│   ├── useCreateEstimate()      → POST /estimates
│   ├── useUpdateEstimate()      → PATCH /estimates/:id
│   ├── useDuplicateEstimate()   → POST /estimates/:id/duplicate
│   └── useEstimateItems(id)     → GET /estimates/:id/items

├── useCostCalculator.ts  // NEW
│   ├── useAdjustments(estimateId)  → GET /estimates/:id/adjustments
│   ├── useAddAdjustment()          → POST /estimates/:id/adjustments
│   ├── useUpdateAdjustment()       → PATCH /estimates/:id/adjustments/:adj_id
│   └── useRecalculate()            → POST /estimates/:id/recalculate

└── useProjectHistory.ts  // NEW
    ├── useProjectHistory(id)    → GET /projects/:id/history
    ├── useProjectBilling(id)    → GET /projects/:id/billing
    └── useCreateBilling()       → POST /projects/:id/billing
```

### Cost Calculator Logic

```python
# backend/app/services/cost_calculator.py

def recalculate_estimate(db: Session, estimate_id: str) -> Estimate:
    """
    Recalculates estimate total based on items and adjustments.

    Order of operations:
    1. Calculate base_total from items
    2. Apply adjustments in order:
       - Overhead (% of base)
       - Profit margin (% of base + overhead)
       - Tax (% of subtotal)
       - Logistics (fixed amount)
       - Custom adjustments
    3. Update final_total
    """
    estimate = db.query(Estimate).get(estimate_id)
    items = db.query(EstimateItem).filter(EstimateItem.estimate_id == estimate_id).all()

    # Base total
    base_total = sum(item.total_price for item in items)

    # Get adjustments ordered
    adjustments = db.query(CostAdjustment).filter(
        CostAdjustment.estimate_id == estimate_id
    ).order_by(CostAdjustment.order).all()

    subtotal = base_total
    adjustments_total = 0.0

    for adj in adjustments:
        if adj.calculation_type == "percent":
            amount = subtotal * (adj.value / 100.0)
        elif adj.calculation_type == "fixed":
            amount = adj.value
        elif adj.calculation_type == "per_unit":
            # Per unit based on total quantity
            total_qty = sum(item.quantity for item in items)
            amount = adj.value * total_qty

        adjustments_total += amount
        subtotal += amount

    estimate.base_total = base_total
    estimate.adjustments_total = adjustments_total
    estimate.final_total = subtotal

    db.commit()
    return estimate
```

### Template Application Logic

```python
# backend/app/services/templates.py

def apply_template_to_job(db: Session, template_id: str, job_id: str) -> Job:
    """
    Applies a template to a job's BoQ items.

    Steps:
    1. Load template mappings
    2. Match BoQ items by source_code
    3. Apply target_code and allowances
    4. Optionally apply price source (supplier catalog)
    """
    template = db.query(Template).get(template_id)
    job = db.query(Job).get(job_id)
    mappings = db.query(TemplateMapping).filter(
        TemplateMapping.template_id == template_id
    ).all()

    # Create mapping dict
    mapping_dict = {m.source_code: m for m in mappings}

    # Apply to BoQ items
    items = db.query(BoqItem).filter(BoqItem.job_id == job_id).all()

    for item in items:
        if item.code in mapping_dict:
            mapping = mapping_dict[item.code]
            item.code = mapping.target_code
            item.allowance_amount = item.quantity * (mapping.allowance_percent / 100.0)

    # Apply config from template (if exists)
    if template.config_json:
        config = json.loads(template.config_json)
        if "supplier_id" in config:
            job.supplier_id = config["supplier_id"]  # Custom field

    db.commit()
    return job
```

### Data Flow Diagram

```
User Action                    Backend Service              Database
───────────────────────────────────────────────────────────────────────

Upload File + Select Template
    │
    ├─→ POST /jobs
    │       └─→ jobs.py: process_job()
    │                └─→ Run takeoff
    │                       └─→ Create BoqItems
    │                              │
    │                              ├─→ templates.py: apply_template()
    │                              │        └─→ Update BoqItems with mappings
    │                              │
    │                              └─→ pricing.py: apply_prices()
    │                                       └─→ Match prices from Supplier/PriceList
    │
    └─→ GET /jobs/:id/stream (SSE)
            └─→ Real-time updates


Create Estimate from Takeoff
    │
    └─→ POST /estimates
            └─→ estimates.py: create_from_job()
                    ├─→ Copy BoqItems → EstimateItems
                    ├─→ Calculate base_total
                    └─→ Save Estimate
                            │
                            └─→ Navigate to /estimates/:id


Add Cost Adjustments
    │
    ├─→ POST /estimates/:id/adjustments
    │       └─→ Create CostAdjustment
    │
    └─→ POST /estimates/:id/recalculate
            └─→ cost_calculator.py: recalculate_estimate()
                    └─→ Update final_total


Export Estimate
    │
    └─→ POST /estimates/:id/export?format=xlsx
            └─→ exports.py: export_estimate_xlsx()
                    ├─→ Load EstimateItems + CostAdjustments
                    ├─→ Generate XLSX with totals breakdown
                    └─→ Save as Artifact
                            └─→ Return download URL
```

---

## Объем работ

### Сводная таблица

| Feature | Backend Models | Backend Endpoints | Frontend Pages | Frontend Components | Effort |
|---------|----------------|-------------------|----------------|---------------------|--------|
| **Suppliers Catalog** | 2 | 10 | 4 | 3 | 🔴 High |
| **Templates Library** | 2 | 8 | 4 | 2 | 🟡 Medium |
| **Estimates Library** | 2 | 12 | 5 | 4 | 🔴 High |
| **Cost Calculator** | 1 | 5 | 1 (integrated) | 3 | 🟡 Medium |
| **Project Management** | 2 | 6 | 4 | 2 | 🟡 Medium |
| **Integrations** | - | - | 3 (updates) | - | 🟢 Low |
| **TOTAL** | **9 models** | **41 endpoints** | **21 pages** | **14 components** | **~6-8 weeks** |

### Детальная оценка по Phase

**Phase 1 (2 weeks):**
- Backend: 4 models, 22 endpoints
- Frontend: 8 pages, 7 components
- Integration: 2 points
- **Total effort:** ~80 hours

**Phase 2 (2 weeks):**
- Backend: 3 models, 13 endpoints, 2 services
- Frontend: 4 pages, 5 components
- Integration: 3 points
- **Total effort:** ~70 hours

**Phase 3 (2 weeks):**
- Backend: 2 models, 6 endpoints, 1 service
- Frontend: 4 pages, 2 components
- Integration: 2 points
- **Total effort:** ~50 hours

**Phase 4 (2 weeks):**
- Polish, testing, documentation
- Advanced features
- **Total effort:** ~40 hours

**GRAND TOTAL: ~240 hours (~6-8 weeks for 1 developer)**

---

## Ключевые архитектурные решения

### 1. Связь данных (Entity Relationships)

```
User
 ├─ Suppliers
 │   └─ SupplierPriceItems
 │
 ├─ Templates
 │   └─ TemplateMappings
 │
 ├─ Projects
 │   ├─ Jobs
 │   │   ├─ BoqItems (takeoff results)
 │   │   └─ Estimates (optional link)
 │   │
 │   ├─ Estimates (can exist without job - manual)
 │   │   ├─ EstimateItems
 │   │   └─ CostAdjustments
 │   │
 │   ├─ ProjectSnapshots
 │   └─ BillingRecords
 │
 └─ BillingRecords (user-level)
```

### 2. Переиспользование существующего кода

**Backend:**
- ✅ `exports.py` - extend for estimates export
- ✅ `jobs.py` - integrate template application
- ✅ `pricing.py` - support supplier catalogs
- ✅ `storage.py` - reuse for price list imports

**Frontend:**
- ✅ `DataTable.tsx` - use for all list views
- ✅ `FileUpload.tsx` - extend for price import
- ✅ `ProgressLog.tsx` - reuse for job monitoring

### 3. API Design Patterns

**Consistent REST pattern:**
```
GET    /resource              # List with pagination & filters
POST   /resource              # Create
GET    /resource/{id}         # Get details
PATCH  /resource/{id}         # Update (partial)
DELETE /resource/{id}         # Delete
POST   /resource/{id}/action  # Custom actions
```

**Pagination standard:**
```python
@router.get("/suppliers")
def list_suppliers(
    skip: int = 0,
    limit: int = 50,
    search: str | None = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Supplier).filter(Supplier.user_id == user.id)
    if search:
        query = query.filter(Supplier.name.ilike(f"%{search}%"))
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return {"items": items, "total": total}
```

### 4. Error Handling Strategy

```python
# Consistent error responses
@router.post("/estimates/{id}/recalculate")
def recalculate(id: str, user=Depends(current_user), db=Depends(get_db)):
    estimate = db.query(Estimate).get(id)
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")

    if estimate.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        recalculated = recalculate_estimate(db, id)
        return recalculated
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recalculation failed: {str(e)}")
```

### 5. Security Considerations

```python
# Row-level security checks
def get_supplier_or_404(supplier_id: str, user: User, db: Session) -> Supplier:
    supplier = db.query(Supplier).get(supplier_id)
    if not supplier:
        raise HTTPException(status_code=404)
    if supplier.user_id != user.id:
        raise HTTPException(status_code=403)
    return supplier

# Use in endpoints
@router.get("/suppliers/{id}")
def get_supplier(id: str, user=Depends(current_user), db=Depends(get_db)):
    return get_supplier_or_404(id, user, db)
```

---

## Testing Strategy

### Backend Tests

```python
# tests/test_suppliers.py
def test_create_supplier(client, auth_headers):
    response = client.post(
        "/api/v1/suppliers",
        json={"name": "Test Supplier", "contact_info": "test@example.com"},
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Test Supplier"

# tests/test_cost_calculator.py
def test_recalculate_with_adjustments(client, auth_headers, test_estimate):
    # Add overhead adjustment (10%)
    client.post(
        f"/api/v1/estimates/{test_estimate.id}/adjustments",
        json={
            "category": "overhead",
            "name": "General Overhead",
            "calculation_type": "percent",
            "value": 10.0
        },
        headers=auth_headers
    )

    # Recalculate
    response = client.post(
        f"/api/v1/estimates/{test_estimate.id}/recalculate",
        headers=auth_headers
    )

    data = response.json()
    assert data["base_total"] == 1000.0
    assert data["adjustments_total"] == 100.0  # 10% of 1000
    assert data["final_total"] == 1100.0
```

### Frontend Tests

```typescript
// EstimatesList.test.tsx
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EstimatesList from './EstimatesList'

test('renders estimates list', async () => {
  const queryClient = new QueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <EstimatesList />
    </QueryClientProvider>
  )

  expect(await screen.findByText(/Estimates Library/i)).toBeInTheDocument()
})
```

---

## Deployment Considerations

### Environment Variables (расширение)

```bash
# .env (add to existing)

# Supplier features
MAX_SUPPLIER_PRICE_ITEMS=10000
ALLOW_PRICE_IMPORT=true

# Template features
MAX_TEMPLATES_PER_USER=100
ALLOW_PUBLIC_TEMPLATES=true

# Estimates features
MAX_ESTIMATES_PER_PROJECT=50
ESTIMATE_RETENTION_DAYS=365

# Billing features
ENABLE_BILLING_MODULE=true
DEFAULT_CURRENCY=RUB
```

### Database Indexes

```python
# Important indexes for performance
# (add to model definitions or migrations)

# Suppliers
Index('idx_supplier_user_id', Supplier.user_id)
Index('idx_supplier_price_items_code', SupplierPriceItem.code)
Index('idx_supplier_price_items_supplier_id', SupplierPriceItem.supplier_id)

# Templates
Index('idx_template_user_id', Template.user_id)
Index('idx_template_type', Template.template_type)

# Estimates
Index('idx_estimate_user_id', Estimate.user_id)
Index('idx_estimate_project_id', Estimate.project_id)
Index('idx_estimate_job_id', Estimate.job_id)
Index('idx_estimate_items_estimate_id', EstimateItem.estimate_id)
```

---

## Appendix: Code Snippets

### A. Supplier Price Import Service

```python
# backend/app/services/suppliers.py

import csv
from io import StringIO
from typing import List, Dict
from sqlalchemy.orm import Session
from app.models.supplier import SupplierPriceItem

def import_price_items_from_csv(
    db: Session,
    supplier_id: str,
    csv_content: str,
    delimiter: str = ","
) -> tuple[int, List[str]]:
    """
    Import price items from CSV.
    Returns: (count_imported, errors)
    """
    reader = csv.DictReader(StringIO(csv_content), delimiter=delimiter)
    required_fields = {"code", "description", "unit", "price"}

    errors = []
    count = 0

    for row_num, row in enumerate(reader, start=2):
        # Validate required fields
        if not all(field in row for field in required_fields):
            errors.append(f"Row {row_num}: Missing required fields")
            continue

        try:
            item = SupplierPriceItem(
                supplier_id=supplier_id,
                code=row["code"],
                description=row["description"],
                unit=row["unit"],
                price=float(row["price"]),
                currency=row.get("currency", "RUB"),
                is_active=row.get("is_active", "true").lower() == "true"
            )
            db.add(item)
            count += 1
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")

    db.commit()
    return count, errors
```

### B. Template Application Component

```typescript
// apps/user-frontend/src/components/TemplateSelector.tsx

import { useState } from 'react'
import { Select, MenuItem, Button, FormControl, InputLabel } from '@mui/material'
import { useTemplates, useApplyTemplate } from '../hooks/useTemplates'

interface TemplateSelectorProps {
  jobId: string
  onApplied: () => void
}

export default function TemplateSelector({ jobId, onApplied }: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const { data: templates } = useTemplates()
  const applyTemplate = useApplyTemplate()

  const handleApply = async () => {
    if (!selectedTemplate) return

    await applyTemplate.mutateAsync({
      templateId: selectedTemplate,
      jobId: jobId
    })

    onApplied()
  }

  return (
    <FormControl fullWidth>
      <InputLabel>Select Template</InputLabel>
      <Select
        value={selectedTemplate}
        onChange={(e) => setSelectedTemplate(e.target.value)}
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        {templates?.items.map((template) => (
          <MenuItem key={template.id} value={template.id}>
            {template.name}
          </MenuItem>
        ))}
      </Select>
      <Button
        onClick={handleApply}
        disabled={!selectedTemplate || applyTemplate.isLoading}
        sx={{ mt: 2 }}
      >
        Apply Template
      </Button>
    </FormControl>
  )
}
```

### C. Cost Calculator Component

```typescript
// apps/user-frontend/src/components/CostCalculator.tsx

import { useState } from 'react'
import { Box, Button, Card, TextField, Select, MenuItem, Typography } from '@mui/material'
import { useAdjustments, useAddAdjustment, useRecalculate } from '../hooks/useCostCalculator'

interface CostCalculatorProps {
  estimateId: string
}

export default function CostCalculator({ estimateId }: CostCalculatorProps) {
  const { data: adjustments } = useAdjustments(estimateId)
  const addAdjustment = useAddAdjustment()
  const recalculate = useRecalculate()

  const [form, setForm] = useState({
    category: 'overhead',
    name: '',
    calculationType: 'percent',
    value: 0
  })

  const handleAdd = async () => {
    await addAdjustment.mutateAsync({
      estimateId,
      ...form
    })

    // Recalculate totals
    await recalculate.mutateAsync(estimateId)

    // Reset form
    setForm({ category: 'overhead', name: '', calculationType: 'percent', value: 0 })
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Cost Adjustments
      </Typography>

      {/* Add adjustment form */}
      <Card sx={{ p: 2, mb: 2 }}>
        <Select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          fullWidth
          sx={{ mb: 2 }}
        >
          <MenuItem value="overhead">Overhead</MenuItem>
          <MenuItem value="profit">Profit Margin</MenuItem>
          <MenuItem value="tax">Tax</MenuItem>
          <MenuItem value="logistics">Logistics</MenuItem>
          <MenuItem value="custom">Custom</MenuItem>
        </Select>

        <TextField
          label="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          fullWidth
          sx={{ mb: 2 }}
        />

        <Select
          value={form.calculationType}
          onChange={(e) => setForm({ ...form, calculationType: e.target.value })}
          fullWidth
          sx={{ mb: 2 }}
        >
          <MenuItem value="percent">Percentage (%)</MenuItem>
          <MenuItem value="fixed">Fixed Amount</MenuItem>
          <MenuItem value="per_unit">Per Unit</MenuItem>
        </Select>

        <TextField
          label="Value"
          type="number"
          value={form.value}
          onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) })}
          fullWidth
          sx={{ mb: 2 }}
        />

        <Button onClick={handleAdd} variant="contained" fullWidth>
          Add Adjustment
        </Button>
      </Card>

      {/* List adjustments */}
      {adjustments?.map((adj) => (
        <Card key={adj.id} sx={{ p: 2, mb: 1 }}>
          <Typography variant="body1">{adj.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {adj.calculationType === 'percent' ? `${adj.value}%` : `${adj.value} ${adj.currency || 'RUB'}`}
          </Typography>
        </Card>
      ))}
    </Box>
  )
}
```

---

## Next Steps

1. **Review this plan** - обсудить приоритеты и уточнить требования
2. **Setup development environment** - создать feature branches
3. **Start Phase 1** - Suppliers & Estimates foundation
4. **Iterative development** - weekly demos and feedback
5. **Testing & deployment** - QA process and staging environment

---

## Contacts & Resources

- **Original User Flow Diagram:** `/Users/rudra/Desktop/raushan_extended_userflow_v0.png`
- **Project Directory:** `/Users/rudra/Code_Projects/skybuild_o1`
- **Backend API Docs:** `http://localhost:8000/api/v1/docs`
- **GitHub Repository:** (add link when available)

---

## UPDATE LOG

### v2.0 - Custdev-Focused MVP Plan (2025-10-07)

**Context:** После анализа SuperGrok Heavy и обсуждения стратегии customer development, план переориентирован на быструю валидацию гипотез через custdev интервью ПЕРЕД разработкой backend. Фронтенд расширяется минимальным набором фич для демо потенциальным клиентам.

**Ключевые изменения:**
- Фокус сместился с "построения всего backend" на "валидацию гипотез через custdev"
- Определены 5 целевых групп клиентов (генподрядчики, субподрядчики, сметчики, поставщики, архитекторы)
- Создан MVP frontend (6 фич) для демо в custdev интервью
- Разработана 4-фазная стратегия custdev (Prep → Discovery → Validation → Analysis)
- Timeline: 6-8 недель до decision point (GO/NO-GO на backend)

**Целевые группы для custdev:**
1. Генеральные подрядчики - крупные строительные фирмы, управление проектами
2. Субподрядчики (MEP) - электрики, сантехники, HVAC специалисты
3. Сметчики - фрилансеры/штатные quantity surveyors
4. Поставщики материалов - компании поставляющие бетон, сталь, трубы
5. Архитекторы и BIM-консультанты - проектные студии

---

## Custdev MVP Plan (v2.0)

**Дата обновления:** 2025-10-07
**Статус:** Ready for implementation
**Цель:** Валидация product-market fit через 20-30 custdev интервью

---

### 1. MVP Frontend Features (6 фич, 1.5-2 недели разработки)

#### Приоритизация

**🔴 Критично ДО custdev:**

**User Flow (4 фичи):**
1. **Share Project Link** (Low, 3h)
   - Копирование ссылки на проект для удаленного демо
   - Snackbar notification при копировании
   - Mock: localStorage для sharing settings

2. **AI Mapping Suggestions** (Medium, 1.5d)
   - Mock AI для маппинга IFC типов → price codes
   - Chip UI с confidence % и apply action
   - Ключевой differentiator продукта

3. **Bid Proposal PDF Export** (Medium, 1.5d)
   - jsPDF + jspdf-autotable для генерации
   - Branded PDF с header, items table, totals
   - Конечный deliverable для сметчиков

4. **Dark Mode Toggle** (Low, 4h)
   - Switch в Navbar
   - localStorage persistence
   - Профессиональный вид

**Admin Flow (2 фичи):**
5. **Mock Admin Approvals Dashboard** (Medium, 1d)
   - AdminAccessRequests.tsx с approve/reject кнопками
   - Snackbar notifications
   - Валидация admin persona

6. **Email Verification Flow** (Low, 4h)
   - Modal после access request
   - Mock 5s verification delay
   - Реалистичный onboarding

**🟡 Валидировать через вопросы В custdev:**
- Drag-drop assemblies
- 2D/3D viewer
- Import from Excel
- Custom formulas
- Template marketplace
- Mappings editor (admin)

**🟢 После custdev (по feedback):**
- Onboarding wizard
- Historical compare
- Analytics dashboard
- Comments/collaboration
- Batch upload

---

### 2. Детальные ТЗ для разработчика

#### Feature 5: Mock Admin Approvals Dashboard

**Файл:** `apps/admin-frontend/src/pages/AdminAccessRequests.tsx`

**Функционал:**
- DataTable со статусами (new/approved/rejected)
- Approve/Reject IconButtons с confirmation
- Snackbar notifications при действиях
- Mock localStorage для persistence

**Edge Cases:**
- Пустой список → Empty State
- Двойной клик → disable после первого
- Offline mode → cached data warning

**Tests:**
```typescript
// apps/admin-frontend/src/pages/__tests__/AdminAccessRequests.test.tsx
- it('should approve request and show snackbar')
- it('should handle empty state')
- it('should disable button after approval')
```

**Accessibility:**
- `aria-label` на всех кнопках
- `aria-live="polite"` на Snackbar
- Keyboard navigation (Tab order)
- Color не единственный индикатор (Chip с текстом)

**Время:** 1 день (включая tests)

#### Feature 6: Email Verification Flow

**Файл:** `apps/user-frontend/src/pages/SignIn.tsx`

**Функционал:**
- Dialog после submit access request
- Mock 5s verification delay с CircularProgress
- localStorage tracking verified status
- "Resend email" кнопка (после 60s)

**Edge Cases:**
- Невалидный email → validation перед submit
- User закрывает modal → сохранить state
- Resend limit → 3 max attempts

**Tests:**
```typescript
- it('should show verification modal after access request')
- it('should auto-verify after 5 seconds')
- it('should handle resend with cooldown')
```

**Accessibility:**
- `aria-labelledby` на Dialog
- Focus trap внутри модала
- `disableEscapeKeyDown` для критичного flow

**Время:** 4 часа

---

### 3. Custdev Strategy (4 фазы, 6-8 недель)

#### Personas (3 primary)

**Persona 1: "Точный Петр" (Estimator)**
- Роль: Сметчик, 5+ лет опыта
- Tools: Excel (80%), AutoCAD Viewer
- Pain: Ручной takeoff 2-3 дня, ошибки 5-10% бюджета
- Goal: Сократить время на 50%+
- JTBD: "When I receive IFC/DWG, I want to extract quantities automatically, so I can create accurate bids faster"

**Persona 2: "Управляющий Сергей" (General Contractor PM)**
- Роль: Project Manager, 10+ лет опыта
- Tools: Procore, Excel
- Pain: Координация 5-10 субподрядчиков, lack of transparency
- Goal: Централизованная платформа для смет
- JTBD: "When managing subcontractors, I want to track estimates in one place, so I can avoid disputes"

**Persona 3: "Оперативный Админ Ольга" (Admin/Ops Manager)**
- Роль: Административный менеджер, 3+ года опыта
- Tools: CRM (Salesforce), Email
- Pain: Ручное управление access requests, обновление прайсов
- Goal: Автоматизация approvals, dashboard с метриками
- JTBD: "When new users request access, I want to approve in one click, so I save time and ensure security"

#### Фаза 0: Подготовка (1 неделя)

**Действия:**
1. Deploy MVP на Vercel (user) + Netlify (admin)
2. Seed mock data (5 проектов, 10 estimates, 3 suppliers)
3. Recruiting: LinkedIn Sales Navigator (100 contacts)
4. Incentive: ₽1500 gift card за 30 мин
5. Setup tools: Calendly, Zoom, Otter.ai, Miro, Google Sheets

**Recruiting email template:**
```
Тема: Помогите улучшить инструмент для сметчиков (₽1500 за 30 мин)

Здравствуйте, {Name}!

Разрабатываем SaaS для автоматизации quantity takeoff из BIM/CAD файлов.
Ищем экспертов для короткого интервью (30 мин):
- Как сейчас делаете сметы?
- Что можно улучшить?

За участие: ₽1500 на Ozon.
Запись через Calendly: [link]

Спасибо!
```

#### Фаза 1: Discovery (1 неделя, 7-10 интервью)

**Цель:** Map workflows БЕЗ показа продукта

**Script (30 мин):**
1. Introduction (5 мин)
2. Context: Роль, компания, размер проектов (5 мин)
3. Current Workflow: Шаг-за-шагом takeoff процесс (10 мин)
   - SCREENSHARE их tools если комфортно
4. Pains & JTBD: Где тратят время, что раздражает (8 мин)
   - "Были ли ошибки? Сколько стоили?"
   - "Волшебная палочка - что автоматизировали бы?"
5. Wrap-up: Рефералы, согласие на demo через 2 недели (2 мин)

**Метрики:**
- 80%+ completion rate
- Min 5 pains per persona
- Saturation к 7-10 интервью

#### Фаза 2: Solution Validation (2 недели, 15-20 интервью)

**Цель:** Demo MVP, validate features, measure NPS

**Script (45 мин):**
1. Recap pains из Фазы 1 (3 мин)
2. Interactive Demo - дать им "пульт управления" (25 мин):

   **User Flow:**
   - Onboarding → Email verification
   - Dashboard → Quick actions
   - Upload IFC → AI suggestions
   - Estimate builder → Apply suppliers, CostCalculator
   - Bid Proposal PDF → Download
   - Share link → Copy

   **Admin Flow (для admin personas):**
   - Access Requests → Approve/Reject
   - Price Lists → Bulk import discussion

3. Feedback Loop (15 мин):
   - Value question: "Решает ли job? Rate 1-10"
   - Feature validation: 2D viewer, Excel import, formulas?
   - NPS: "Recommend коллегам? 0-10"
   - Competitors: vs Procore/STACK/Excel
   - Pricing: "Сколько готовы платить? €/$/₽ per month"

4. Close (2 мин)

**Метрики:**
- NPS: Target ≥7
- Feature validation: >60% "yes" для 🟡
- WTP: Median ≥€40/mo

#### Фаза 3: Pricing Survey (параллельно, 100+ responses)

**Van Westendorp Price Sensitivity Meter:**
1. Слишком дешево (не доверяете)?
2. Выгодная покупка?
3. Дорого, но рассмотрите?
4. Слишком дорого?

**Distribution:** LinkedIn, email, форумы

**Analysis:** Plot кривые для IPP/OPP, segment по personas

#### Фаза 4: Analysis & Pivot (1 неделя)

**Действия:**
1. Transcribe (Otter.ai) + Tag в Miro
2. Quantify: "Pain X → 18/20 interviews (90%)"
3. Decision Matrix:
   - NPS ≥7 + WTP ≥€40 → GREEN LIGHT backend
   - NPS 5-7 → PIVOT features
   - NPS <5 → STOP rethink
4. Output: Refined plan, backend priorities, pricing model

---

### 4. Timeline & Milestones (6-8 недель)

| Week | Phase | Deliverables | Owner |
|------|-------|--------------|-------|
| **1** | Dev MVP (Features 1-4) | User flow done | Frontend dev |
| **2** | Dev MVP (Features 5-6) + QA | Admin + tests, deployed | Frontend dev |
| **2** | Custdev Prep (Фаза 0) | Personas, recruiting | Product |
| **3** | Discovery (Фаза 1) | 7-10 interviews, pains | Product + Analyst |
| **4-5** | Validation (Фаза 2) | 15-20 demos, NPS/WTP | Product + Sales |
| **4-5** | Pricing Survey (Фаза 3) | 100+ responses | Marketing |
| **6** | Analysis (Фаза 4) | Final report, decision | Leadership |
| **7-8** | Buffer / Iteration | Re-test OR backend kickoff | All |

**Milestones:**
- ✅ End of Week 2: MVP deployed
- ✅ End of Week 3: Pains validated
- ✅ End of Week 5: NPS + WTP data ready
- ✅ End of Week 6: GO/NO-GO decision

---

### 5. Success Metrics & Risks

#### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Interview completion | ≥80% | Calendly shows/bookings |
| NPS (Phase 2) | ≥7 avg | Post-demo survey |
| Feature validation | ≥60% "yes" | In-interview |
| WTP | ≥€40/mo median | Van Westendorp + direct |
| Survey responses | ≥100 | Typeform analytics |

#### Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Low response (<20%) | Medium | High | ₽1500 incentive, referrals, multi-channel |
| Bias in demo | High | High | Neutral wording, user controls screenshare |
| Tech bugs | Medium | Medium | Pre-demo testing, backup recording |
| Scope creep | High | Medium | Strict 🔴🟡🟢 priorities |
| NPS <7 | Medium | High | Buffer weeks for iteration |

#### Tools & Budget

| Purpose | Tool | Cost |
|---------|------|------|
| Recruiting | LinkedIn Sales Navigator | $80/mo |
| Scheduling | Calendly | Free |
| Interviews | Zoom Pro | $15/mo |
| Transcription | Otter.ai | Free (600 min) |
| Surveys | Typeform | Free |
| Analysis | Miro | Free |
| Tracking | Google Sheets + Amplitude | Free |
| Demo hosting | Vercel + Netlify | Free |

**Total budget:** ~$100-150 для 1-month sprint

---

### 6. Next Actions

**Immediate (Week 1-2):**
1. ✅ Implement Features 5-6 (Admin approvals + Email verification)
2. ✅ Add tests + accessibility improvements
3. ✅ Deploy to Vercel/Netlify
4. ✅ Create personas documents
5. ✅ Setup custdev tools (Calendly, Miro, etc.)
6. ✅ Draft recruiting emails
7. ✅ Prepare interview scripts

**Week 3+:**
8. Start Phase 1 interviews (Discovery)
9. Iterate based on early feedback
10. Execute Phase 2-4 per timeline

**Decision Point (Week 6):**
- IF validated → Proceed with backend development (Phase 1 from original plan)
- IF not validated → Pivot features and re-test
- IF major issues → Rethink product direction

---

## Key Insights from SuperGrok Heavy Analysis

**Сильные стороны текущего подхода:**
- ✅ Модульная архитектура (clear separation user/admin)
- ✅ Специализированные инструменты (ifcopenshell, ezdxf, pymupdf)
- ✅ Real-time features (SSE)
- ✅ Security basics (JWT, admin guards)

**Слабости требующие внимания:**
- ⚠️ SQLite не для продакшна (миграция на PostgreSQL after custdev)
- ⚠️ Неполные фичи (PDF требует OCR setup)
- ⚠️ Gaps в безопасности (нет rate limiting, MFA)
- ⚠️ Ограниченное тестирование (добавить e2e после валидации)

**Рекомендации для backend (ПОСЛЕ custdev):**
1. Migrate to PostgreSQL с Alembic
2. Implement rate limiting (slowapi)
3. Add comprehensive tests (pytest coverage >80%)
4. Centralized error tracking (Sentry)
5. Add monitoring (Prometheus + Grafana)
6. Docker/Kubernetes для deployment

---

*План создан: 2025-10-03*
*Обновлен: 2025-10-07 (v2.0 - Custdev-Focused MVP)*
*Автор: George Mikadze*
*Статус: Ready for implementation*
