#!/usr/bin/env python3
"""
Seed demo data by calling the running backend API (http://localhost:8000/api/v1).

This script:
- Creates a demo Project
- Creates two Files (DWG + IFC) via the presigned endpoint
- Uploads small placeholder content to each file's upload_url
- Creates Jobs for each file (which the running server will process in background)
- Polls each job until completion (or timeout) and prints progress

Run with the backend virtualenv python:
  cd backend
  .venv/bin/python scripts/seed_demo.py
"""
import time
import sys

try:
    import httpx
except Exception as e:
    print("httpx is required. Run: .venv/bin/python -m pip install httpx")
    raise

API_BASE = "http://localhost:8000/api/v1"


def create_project(name: str):
    r = httpx.post(f"{API_BASE}/projects", json={"name": name}, timeout=10)
    r.raise_for_status()
    return r.json()


def create_presigned(project_id: str, filename: str, ftype: str):
    r = httpx.post(f"{API_BASE}/files", params={"project_id": project_id, "filename": filename, "ftype": ftype}, timeout=10)
    r.raise_for_status()
    return r.json()


def upload_content(upload_url: str, content: bytes):
    # upload_url may be an absolute URL or a path (e.g. "/api/v1/files/{id}/content")
    from urllib.parse import urljoin
    if upload_url.startswith("http"):
        full = upload_url
    else:
        full = urljoin(API_BASE, upload_url)
    r = httpx.put(full, content=content, timeout=30)
    r.raise_for_status()
    return r.json()


def create_job(project_id: str, file_id: str):
    r = httpx.post(f"{API_BASE}/jobs", json={"project_id": project_id, "file_id": file_id, "price_list_id": None}, timeout=10)
    r.raise_for_status()
    return r.json()


def get_job(job_id: str):
    r = httpx.get(f"{API_BASE}/jobs/{job_id}", timeout=10)
    r.raise_for_status()
    return r.json()


def wait_for_job(job_id: str, timeout: int = 120):
    start = time.time()
    while time.time() - start < timeout:
        try:
            j = get_job(job_id)
        except Exception as e:
            print("Error fetching job", job_id, e)
            time.sleep(1)
            continue
        status = j.get("status")
        prog = j.get("progress", 0)
        print(f"[{job_id}] status={status} progress={prog}")
        if status in ("completed", "failed", "canceled"):
            return j
        time.sleep(1)
    print(f"[{job_id}] timeout after {timeout}s")
    return None


def main():
    print("Seeding demo project + files + jobs")
    try:
        project = create_project("Demo project (seed)")
    except Exception as e:
        print("Failed to create project:", e)
        sys.exit(1)

    pid = project["id"]
    print("Created project:", pid)

    # Create sample access requests so the admin UI has data
    samples = [
        ("Alice Example", "alice@example.com", "ACME Ltd", "Please give me access for testing."),
        ("Bob Tester", "bob@example.org", "TestCo", "Demo access please."),
        ("Charlie Dev", "charlie@dev.local", "DevOps", "Need access for QA."),
    ]
    for name, email, company, message in samples:
        try:
            resp = httpx.post(
                f"{API_BASE}/public/access-requests",
                json={"name": name, "email": email, "company": company, "message": message},
                timeout=10,
            )
            resp.raise_for_status()
            print("Created access request:", resp.json().get("id"))
        except Exception as e:
            print("Failed to create access request:", e)

    file_infos = []
    for filename, ftype in [("demo.dwg", "DWG"), ("demo.ifc", "IFC")]:
        print(f"Requesting presigned upload for {filename} ({ftype})...")
        pres = create_presigned(pid, filename, ftype)
        file_id = pres["file_id"]
        upload_url = pres["upload_url"]
        print(" - file_id:", file_id)
        print(" - upload_url:", upload_url)
        print("Uploading placeholder content...")
        upload_content(upload_url, b"seed-demo-content\n")
        file_infos.append((file_id, filename))

    job_ids = []
    for file_id, filename in file_infos:
        print("Creating job for file", file_id)
        job = create_job(pid, file_id)
        job_id = job["id"]
        print(" - created job", job_id)
        job_ids.append(job_id)

    print("Waiting for jobs to finish (polling)...")
    for jid in job_ids:
        wait_for_job(jid, timeout=180)

    print("Seeding finished. Created jobs:", job_ids)


if __name__ == "__main__":
    main()
