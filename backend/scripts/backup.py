#!/usr/bin/env python3
"""
Naive backups for Month-2 'Production Infrastructure Foundation':
 - Copies DB file (if SQLite) and artifacts/uploads to BACKUP_DIR/YYYYmmdd_HHMMSS/
 - Intended to be run via cron/systemd timer.
"""
import os, shutil, time
from pathlib import Path

BACKUP_DIR = Path(os.getenv("BACKUP_DIR", "./backups"))
DB_URL = os.getenv("DB_URL", "sqlite:///./boq.db")
STORAGE_DIR = Path(os.getenv("STORAGE_DIR", "./storage"))

def main():
    ts = time.strftime("%Y%m%d_%H%M%S")
    out = BACKUP_DIR / ts
    out.mkdir(parents=True, exist_ok=True)
    # DB
    if DB_URL.startswith("sqlite:///"):
        db_path = Path(DB_URL.replace("sqlite:///", ""))
        if db_path.exists():
            shutil.copy2(db_path, out / db_path.name)
            print("DB backup:", out / db_path.name)
    # Storage (uploads + artifacts + config)
    for name in ["uploads", "artifacts", "config"]:
        src = STORAGE_DIR / name
        if src.exists():
            dst = out / name
            shutil.copytree(src, dst)
            print("Storage backup:", dst)
    print("Backup completed:", out.resolve())

if __name__ == "__main__":
    main()