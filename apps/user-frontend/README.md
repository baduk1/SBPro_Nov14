# SkyBuild Pro — Frontend (React + Vite + TypeScript)

Месяц 2: загрузка .IFC по presigned URL, постановка job, поллинг статуса, первичный take‑off (стены/перекрытия).  
Прайс‑листы/BoQ/экспорты появятся в следующих месяцах.

## Quickstart

```bash
npm install
npm run dev
```

**Note:** API URL is configured in `.env` file (defaults to `http://localhost:8000/api/v1`)

## Минимальный контракт с бэкендом

* `POST /uploads/presign { project_id, filename, content_type }`
  → `{ file_id, upload_url, headers? }`
* `PUT upload_url` (absolute) — загрузка файла с `Content-Type`.
* `POST /jobs { project_id, file_id, file_type: 'IFC' }` → `{ id, ... }`
* `GET /jobs` → `Job[]`
* `GET /jobs/:id` → `{ id, status, progress? }`
* `GET /jobs/:id/takeoff` → `TakeoffItem[]`
