# Deployment Guide (Ubuntu, no Docker)

This guide explains how to deploy the **Blueprint Estimator Hub** MVP to a single Ubuntu server (e.g., Ubuntu 22.04), using **FastAPI** (Gunicorn + Uvicorn worker) and **Nginx** serving the React bundle and reverse‑proxying the API.

## 1) Provision server

- Ubuntu 22.04 LTS VM (2 vCPU / 2 GB RAM is fine for MVP).
- DNS pointing your domain (optional).
- Open ports: 80/443.

## 2) Install system dependencies

```bash
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip build-essential \
  nginx nodejs npm
# If Node is old, install Node 20.x from nodesource (optional)
# curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs
