# WaterFlow OS — Production Deployment & Hardening Guide (Phase 23)

**Authoritative Policy Version:** `2.4.0-hardened`  
**Target Environment:** Municipal Operations Center (Bhandup Control Room & BMC Head Office)  
**Classification:** Infrastructure, Deployment & Operational Resiliency

---

## Production Validation Checklist

| Item | Area | Specification / Expected State | Verification Command / Result |
| :--- | :--- | :--- | :--- |
| **1. Health Probes** | Backend & AI | `GET /health` returns HTTP 200 with service name and policy version | `curl http://localhost:8000/health` -> HTTP 200 |
| **2. Readiness Probes** | Backend & AI | `GET /ready` verifies solver readiness, memory, and database connectivity | `curl http://localhost:8000/ready` -> HTTP 200 (`ready: true`) |
| **3. Secrets Protection** | Security | Zero API keys, JWT secrets, or DB credentials committed in git repository | Audited git index; all credentials read from `.env` |
| **4. CORS Policy** | Gateway | Explicit whitelist for municipal origins; wildcard mode strictly disabled in production | Configured in `backend/server.js` and `ai_engine/main.py` |
| **5. Deterministic Seeding** | Data | Deterministic random seed 42 enforced across synthetic pipelines (`numpy.random.default_rng(42)`) | Tested via `tools/validate_waterflow.py` (Double-run bit-identical) |
| **6. Safe AI Degradation** | Resiliency | If AI service is down/unreachable, Express gateway gracefully degrades to cached priority queue | Handled in `backend/server.js` fallback handler |
| **7. Solver Fallback** | Routing | If Google OR-Tools is unavailable, system falls back safely to greedy nearest-neighbor route heuristic | Implemented in `_greedy_route_fallback()` |
| **8. Database Migrations** | Persistence | SQLite/PostgreSQL schema migrations idempotent and versioned | Checked via `backend/server.js` table initializations |
| **9. PostGIS Spatial Indexes** | Performance | R-tree / GIST spatial indexing on ward centroid coordinates and depot locations | Applied on `(lat, lng)` columns |
| **10. Frontend Build** | Client | Static assets build cleanly with zero unminified syntax or bundle errors | Verified with `npm --prefix frontend run build` (Vite exit 0) |

---

## Architecture & Failure Mode Handling

```
             ┌──────────────────────────────────────────────┐
             │       Citizen & Worker Clients (React PWA)   │
             │       - Offline IndexedDB caching            │
             │       - Web Speech API voice reporting       │
             └──────────────────────┬───────────────────────┘
                                    │ HTTP / REST / JSON
                                    ▼
             ┌──────────────────────────────────────────────┐
             │    Express Gateway / SCADA API (Port 3001)   │
             │    - GET /health, GET /ready                 │
             │    - GET /api/policy (Canonical Policy)      │
             │    - GET /api/analytics/* (Time-series)      │
             └──────────────┬───────────────────────────────┘
                            │
              ┌─────────────┴───────────────────────────────┐
              │ Safe Failover Timeout (2,500ms)             │
              ▼                                             ▼
┌───────────────────────────────┐            ┌───────────────────────────────┐
│ FastAPI AI Engine (Port 8000) │            │ Gateway Cache Fallback Engine │
│ - Explainable Priority Engine │            │ - Last verified SCADA queue   │
│ - Constraint Allocation       │            │ - Invariant bounds guaranteed │
│ - OR-Tools Fleet Routing      │            │ - Graceful offline banner     │
└───────────────────────────────┘            └───────────────────────────────┘
```

---

## Service Endpoints & Telemetry API

### 1. Health & Liveness
- **FastAPI:** `GET http://localhost:8000/health`
  ```json
  {
    "status": "ok",
    "service": "WaterFlow OS AI Engine",
    "policy_version": "2.4.0-hardened",
    "mode": "deterministic_explainable"
  }
  ```
- **Express:** `GET http://localhost:3001/health`
  ```json
  {
    "status": "healthy",
    "service": "WaterFlow Gateway",
    "version": "2.4.0-hardened",
    "ai_engine": "connected"
  }
  ```

### 2. Readiness Probe
- **FastAPI:** `GET http://localhost:8000/ready`
  ```json
  {
    "status": "ready",
    "ready": true,
    "policy_version": "2.4.0-hardened",
    "solver": "ortools_or_greedy_fallback",
    "constraints_enforced": true
  }
  ```
- **Express:** `GET http://localhost:3001/ready`
  ```json
  {
    "status": "ready",
    "ready": true,
    "wards_seeded": 24,
    "db_connected": true
  }
  ```

### 3. Policy Specification (Single Source of Truth)
- **Endpoint:** `GET /api/policy`
  Exposes the authoritative weights, normalization boundaries, and mathematical constraints. Frontend portals query this endpoint to ensure that UI calculations never diverge from the engine.

---

## Production Startup Procedure

1. **Start Express Municipal Gateway:**
   ```bash
   cd backend
   npm install
   node server.js
   ```

2. **Start FastAPI Optimization Engine:**
   ```bash
   cd ai_engine
   python -m uvicorn main:app --host 0.0.0.0 --port 8000
   ```

3. **Verify Production Frontend Build:**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

4. **Execute Master System Validator:**
   ```bash
   python tools/validate_waterflow.py
   ```
   Assert that console output terminates with `FINAL RESULT: PASS (8/8 passed)`.
