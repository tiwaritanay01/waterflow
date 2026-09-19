# WaterFlow OS — Production Deployment & Operations Runbook

**Document:** `docs/deployment.md`  
**System Architecture:** Multi-Container Distributed Microservices  
**Components:** React Frontend, Express API Gateway, FastAPI AI Optimization Engine, PostGIS Database  

---

## 1. Quick Start: Local Deployment (Docker Compose)

The fastest method to stand up the complete stack from a clean machine:

```bash
# 1. Clone repository
git clone https://github.com/tiwaritanay01/waterflow.git
cd waterflow

# 2. Configure environment
cp .env.example .env

# 3. Launch container stack
docker compose up --build -d

# 4. Verify service health
docker compose ps
curl http://localhost:3001/health
curl http://localhost:8000/health
```

Access services:
- **Command Center Dashboard:** `http://localhost` (Port 80)
- **Express Municipal Gateway:** `http://localhost:3001`
- **FastAPI AI / Optimization Engine:** `http://localhost:8000`
- **Interactive OpenAPI Documentation:** `http://localhost:8000/docs`

---

## 2. Manual Bare-Metal / Dev Setup

### A. Python AI Engine Setup
```bash
# Python 3.10+ required
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python ai_engine/main.py
```

### B. Express Gateway Setup
```bash
cd backend
npm install
node server.js
```

### C. React Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 3. Container Health & Readiness Probes

All microservices implement standard three-tier health probes for Kubernetes and container schedulers:

| Service | Liveness Probe | Readiness Probe | Detailed Diagnostic |
| :--- | :--- | :--- | :--- |
| **Express Gateway** | `GET /liveness` (200 OK) | `GET /ready` (Ward count check) | `GET /health` (DB & AI status) |
| **FastAPI Engine** | `GET /liveness` (200 OK) | `GET /ready` (Solver availability) | `GET /health` (Policy version) |
| **PostgreSQL** | `pg_isready` check | Table count assertion | `SELECT 1;` |

---

## 4. Database Migrations & Reference Data Loading

The PostgreSQL container automatically runs initialization scripts placed in `/docker-entrypoint-initdb.d/`:
1. `backend/schema.sql`: Initializes tables for `wards`, `demands`, `tankers`, `complaints`, and PostGIS geometry columns.
2. If running on a pre-existing Postgres cluster:
   ```bash
   psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f backend/schema.sql
   ```
