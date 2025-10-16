# SkyBuild Pro — Admin Frontend (React + Vite + TypeScript)

Админ-панель для управления доступами, прайс-листами и маппингами SkyBuild.

## Quickstart

```bash
npm install
npm run dev
```

**Note:** API URL is configured in `.env` file (defaults to `http://localhost:8000/api/v1`)

## Минимальный контракт с бэкендом

* `GET /admin/access-requests` → `AccessRequest[]`
* `PATCH /admin/access-requests/:id { status }` → `AccessRequest`
* `GET /admin/price-lists` → `PriceList[]`
* `GET /admin/price-lists/active` → `PriceList`
* `POST /admin/price-lists` — создание price list
* `POST /admin/price-lists/:id/items:bulk` — загрузка CSV с позициями
* `PATCH /admin/price-lists/:id` → `PriceList`
* `GET /admin/mappings/dwg-layers` → `DwgLayerMap[]`
* `PUT /admin/mappings/dwg-layers` — сохранение DWG слоёв
* `GET /admin/mappings/ifc-classes` → `IfcClassMap[]`
* `PUT /admin/mappings/ifc-classes` — сохранение IFC классов
