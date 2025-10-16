# Pricing Flow Analysis - m2_stable vs Extended Version

**Дата:** 2025-10-07
**Вопрос:** Как должен работать Apply Prices в расширенной версии с Suppliers?

---

## 🔴 Текущая проблема (m2_stable)

### Симптомы:
- Пользователь загружает IFC → получает Takeoff
- Нажимает "Apply Prices"
- Ошибка: **"No active price list"**

### Причина:
```typescript
// TakeoffPreview.tsx:43-56
const handleApplyPrices = async () => {
  await jobs.applyPrices(id)  // ❌ Нет параметров, берет "активный" прайс-лист админа
}
```

### Backend:
```python
# backend/app/api/v1/endpoints/pricing.py
POST /api/v1/jobs/{id}/apply-prices
  - Ищет активный прайс-лист АДМИНА (admin price list)
  - Если админ не загрузил прайс-лист → 404 "No active price list"
```

**Архитектура m2_stable:**
- Админ управляет единым прайс-листом
- Пользователь НЕ может загружать свои цены
- Централизованный контроль цен

---

## 🟢 Правильная архитектура (Extended Version)

### Концепция:

Пользователь = **Estimator/Contractor** с собственными поставщиками и ценами.

**User flow должен быть:**

```
1. User загружает IFC
2. Получает Takeoff (quantities)
3. Выбирает ПОСТАВЩИКА из своего каталога
   ├─→ "BuildCo Supplies" (default)
   ├─→ "ABC Materials Ltd"
   └─→ "Premium Vendors Inc"
4. Применяет цены выбранного поставщика
5. Получает Estimate с ценами от конкретного поставщика
```

### Текущая реализация (skybuild_o1):

**✅ ЧТО УЖЕ ЕСТЬ:**

1. **Frontend страница Suppliers** (`/app/suppliers`)
   - UI для управления поставщиками
   - Добавление/редактирование/удаление
   - Mock данные (mockSuppliers)

2. **Types определены:**
   ```typescript
   // types/extended.ts
   interface Supplier {
     id: string
     user_id: string
     name: string
     is_default: boolean  // ← Может быть default supplier
     price_items_count: number
   }

   interface SupplierPriceItem {
     supplier_id: string
     code: string
     price: number
     unit: string
   }
   ```

3. **План API в EXTENDED_USERFLOW_PLAN.md:**
   ```
   GET    /api/v1/suppliers                        # List user's suppliers
   GET    /api/v1/suppliers/{id}/items             # List price items
   POST   /api/v1/suppliers/{id}/items/import      # Bulk import
   ```

**❌ ЧЕГО НЕТ:**

1. **Integration с Takeoff Preview:**
   - Кнопка "Apply Prices" не позволяет выбрать supplier
   - Нет dropdown/selector для выбора поставщика

2. **Backend API не реализован:**
   - `/api/v1/suppliers` - 404
   - Только mock данные в frontend

3. **API jobs.applyPrices() не принимает supplier_id:**
   ```typescript
   // api.ts:106-110
   applyPrices: async (id: string, priceListId?: string) => {
     // ❌ Принимает price_list_id (admin concept)
     // ✅ Должно быть: supplier_id (user concept)
   }
   ```

---

## 📐 Правильная реализация

### Step 1: Обновить UI (TakeoffPreview.tsx)

**Вместо простой кнопки:**

```tsx
// ❌ OLD (m2_stable):
<Button onClick={handleApplyPrices}>Apply Prices</Button>
```

**Новый UI:**

```tsx
// ✅ NEW (Extended):
<Stack spacing={2}>
  <Typography variant="h6">Apply Pricing</Typography>

  {/* Supplier selector */}
  <FormControl fullWidth>
    <InputLabel>Select Supplier</InputLabel>
    <Select
      value={selectedSupplierId}
      onChange={(e) => setSelectedSupplierId(e.target.value)}
    >
      {suppliers.map(s => (
        <MenuItem key={s.id} value={s.id}>
          {s.name} {s.is_default && '(Default)'}
          <Chip label={`${s.price_items_count} items`} size="small" />
        </MenuItem>
      ))}
    </Select>
  </FormControl>

  {/* Preview selected supplier info */}
  {selectedSupplier && (
    <Alert severity="info">
      Pricing from: <strong>{selectedSupplier.name}</strong>
      <br />
      {selectedSupplier.price_items_count} price items available
    </Alert>
  )}

  <Button
    variant="contained"
    onClick={() => handleApplyPrices(selectedSupplierId)}
    disabled={!selectedSupplierId}
  >
    Apply Prices from {selectedSupplier?.name}
  </Button>
</Stack>
```

### Step 2: Обновить API call

```typescript
// services/api.ts
export const jobs = {
  // ❌ OLD:
  applyPrices: async (id: string, priceListId?: string) => {
    const params = priceListId ? { price_list_id: priceListId } : undefined
    await api.post(`/jobs/${id}/apply-prices`, null, { params })
  }

  // ✅ NEW:
  applyPrices: async (id: string, supplierId: string) => {
    await api.post(`/jobs/${id}/apply-prices`, { supplier_id: supplierId })
  }
}
```

### Step 3: Backend endpoint изменения

```python
# backend/app/api/v1/endpoints/pricing.py

# ❌ OLD (m2_stable):
@router.post("/jobs/{id}/apply-prices")
def apply_prices(id: str, price_list_id: Optional[str] = None):
    # Ищет активный admin price list
    price_list = db.query(PriceList).filter(PriceList.is_active == True).first()
    if not price_list:
        raise HTTPException(404, "No active price list")

# ✅ NEW (Extended):
@router.post("/jobs/{id}/apply-prices")
def apply_prices(
    id: str,
    payload: ApplyPricesRequest,  # { supplier_id: str }
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    # 1. Verify supplier belongs to user
    supplier = db.query(Supplier).filter(
        Supplier.id == payload.supplier_id,
        Supplier.user_id == user.id
    ).first()
    if not supplier:
        raise HTTPException(404, "Supplier not found")

    # 2. Get price items from this supplier
    price_items = db.query(SupplierPriceItem).filter(
        SupplierPriceItem.supplier_id == supplier.id,
        SupplierPriceItem.is_active == True
    ).all()

    # 3. Get takeoff items
    takeoff_items = db.query(BoQItem).filter(BoQItem.job_id == id).all()

    # 4. Match and apply prices
    for takeoff_item in takeoff_items:
        matching_price = next(
            (p for p in price_items if p.code == takeoff_item.element_type),
            None
        )
        if matching_price:
            takeoff_item.unit_price = matching_price.price
            takeoff_item.total_price = takeoff_item.qty * matching_price.price
            takeoff_item.supplier_id = supplier.id  # Track which supplier

    db.commit()
    return {"applied": len([i for i in takeoff_items if i.unit_price > 0])}
```

### Step 4: Добавить Supplier API endpoints

```python
# backend/app/api/v1/endpoints/suppliers.py

@router.get("/suppliers")
def list_suppliers(user: User = Depends(current_user), db: Session = Depends(get_db)):
    suppliers = db.query(Supplier).filter(Supplier.user_id == user.id).all()
    return suppliers

@router.post("/suppliers")
def create_supplier(
    payload: SupplierCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    supplier = Supplier(
        user_id=user.id,
        name=payload.name,
        contact_info=payload.contact_info,
        is_default=payload.is_default
    )
    db.add(supplier)
    db.commit()
    return supplier

@router.get("/suppliers/{id}/items")
def list_price_items(
    id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    # Verify ownership
    supplier = db.query(Supplier).filter(
        Supplier.id == id,
        Supplier.user_id == user.id
    ).first()
    if not supplier:
        raise HTTPException(404, "Supplier not found")

    items = db.query(SupplierPriceItem).filter(
        SupplierPriceItem.supplier_id == id
    ).all()
    return items

@router.post("/suppliers/{id}/items/import")
async def bulk_import_prices(
    id: str,
    file: UploadFile,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    # Parse CSV/XLSX
    # Create SupplierPriceItem records
    pass
```

---

## 🎯 Отличия от m2_stable

| Аспект | m2_stable | Extended Version |
|--------|-----------|------------------|
| **Прайс-листы** | Один админский | Множество пользовательских |
| **Управление** | Только админ | Каждый пользователь |
| **Apply Prices** | Без параметров | Выбор supplier_id |
| **UI Flow** | Кнопка → ошибка | Selector → выбор → apply |
| **Backend** | /admin/price-lists | /suppliers |
| **Модель данных** | PriceList → PriceItem | Supplier → SupplierPriceItem |
| **Ownership** | Global (admin) | Per-user (user_id) |

---

## 📋 Roadmap реализации

### Phase 1: Backend API (3-5 дней)
- [ ] Создать модели Supplier, SupplierPriceItem
- [ ] Migration: add_suppliers_tables.py
- [ ] Endpoints: /suppliers CRUD
- [ ] Endpoints: /suppliers/{id}/items CRUD
- [ ] Обновить /jobs/{id}/apply-prices с supplier_id

### Phase 2: Frontend Integration (2-3 дня)
- [ ] Обновить TakeoffPreview.tsx с Supplier selector
- [ ] Fetch suppliers: useEffect → /api/v1/suppliers
- [ ] Dropdown для выбора supplier
- [ ] Preview info о выбранном supplier
- [ ] Обновить handleApplyPrices(supplierId)

### Phase 3: Supplier Management (2 дня)
- [ ] Подключить реальный API вместо mock данных
- [ ] Страница добавления supplier
- [ ] Bulk import CSV/XLSX для price items
- [ ] Set default supplier функционал

### Phase 4: UX Improvements (1 день)
- [ ] "Use default supplier" quick button
- [ ] Price preview перед apply (modal с таблицей matched items)
- [ ] Fallback если supplier не имеет нужных codes
- [ ] History tracking: какой supplier использовался для каждого estimate

---

## 🚀 Quick Win (MVP)

**Минимальная реализация для тестирования:**

1. **Backend:** Создать `/suppliers` endpoint с mock данными
2. **Frontend:** Добавить Supplier dropdown в TakeoffPreview
3. **API:** Обновить `applyPrices(id, supplierId)`
4. **Логика:** Если supplier_id передан → использовать его, иначе → default или error

**Время:** 1 день
**Результат:** Пользователь может выбрать поставщика перед Apply Prices

---

## ✅ Conclusion

**Твоя интуиция абсолютно правильная!**

В расширенной версии:
- ❌ Не должно быть простой кнопки "Apply Prices"
- ✅ Должен быть функционал выбора Supplier
- ✅ Pricing = часть Supplier Management, не отдельная admin фича
- ✅ Каждый пользователь управляет своими ценами

**m2_stable** был централизованным (admin-controlled pricing)
**Extended** = децентрализованный (user-controlled suppliers & pricing)

Это key difference в философии продукта!
