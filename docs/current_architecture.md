# WaterFlow OS — Current Architecture (As Implemented)

**Document Version:** 1.0.0 (As of checkpoint `waterflow-pre-hardening`)  
**Scope:** Architecture as currently implemented in the repository, representing active code paths and existing fallbacks.

---

## 1. System Overview

WaterFlow OS is a multi-tier municipal water allocation and crisis-response management prototype configured for the 24 administrative wards of the Brihanmumbai Municipal Corporation (BMC), Mumbai, India.

```
+-------------------------------------------------------------------------+
|                           CLIENT LAYER                                  |
|   +-------------------+  +--------------------+  +------------------+   |
|   |  Command Center   |  |   Citizen Portal   |  |  Worker Terminal |   |
|   | (Desktop SCADA)   |  | (Responsive PWA)   |  | (Field PWA/Sync) |   |
|   +---------+---------+  +---------+----------+  +--------+---------+   |
+-------------|----------------------|----------------------|-------------+
              |                      |                      |
              v                      v                      v
+-------------------------------------------------------------------------+
|                     EXPRESS MUNICIPAL GATEWAY (:3001)                   |
|  - REST Endpoints (/api/dashboard, /api/wards, /api/tankers, etc.)      |
|  - Mobile Router (/api/citizen/*, /api/worker/*)                        |
|  - WhatsApp Multi-Lingual NLP Webhook (/api/whatsapp/webhook)           |
|  - Fallback In-Memory 24-Ward State & Rule Engine                      |
+------------------------------------+------------------------------------+
                                     | Proxies scoring & routing
                                     v
+-------------------------------------------------------------------------+
|                     FASTAPI OPTIMIZATION ENGINE (:8000)                 |
|  - Priority Allocation Algorithm (/api/prioritize)                      |
|  - Equity Simulation Benchmark (/api/simulate-equity)                   |
|  - Fleet Vehicle Routing Problem solver (/api/optimize-routes)          |
|    (Google OR-Tools with Greedy capacity fallback)                      |
|  - Phase 2 Vision & Weather Router (:8001 / vision_and_predictive.py)   |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                         DATA & PERSISTENCE LAYER                        |
|  - PostgreSQL 14+ with PostGIS Extension (Optional runtime target)      |
|  - 24 BMC Wards Mock Ledger (Graceful in-memory fallback)               |
|  - Client-side IndexedDB & ServiceWorker v4.12 Cache (Offline mobile)   |
+-------------------------------------------------------------------------+
```

---

## 2. Component Inventory

### 2.1 Frontend (`frontend/`)
* **Technology Stack:** React 19.2, Vite 8.3, Tailwind CSS v4, React-Leaflet 5.0, Leaflet 1.9, Lucide React icons.
* **Portals / Views:**
  * **Landing Page (`LandingPage.jsx`):** Public overview of municipal water equity metrics and quick portal selector.
  * **Unified Login (`LoginPage.jsx`):** Simulated authentication router managing `admin`, `citizen`, and `worker` credentials.
  * **Command Center (`App.jsx`):** High-density municipal SCADA dashboard with 6 operational tabs:
    * *Live Overview:* Split-view with `MapPanel.jsx`, `PriorityQueue.jsx`, `ResourcePanel.jsx`, and `AlertTicker.jsx`.
    * *GIS Spatial Dispatch:* Expanded Leaflet vector GIS tracking 24 BMC wards, 4 depots, and 25 tankers (`MumbaiLeafletMap.jsx`).
    * *Allocation Queue:* Table displaying priority scores, ranks, and primary scoring drivers.
    * *Complaint & Forecast:* 7-day projection comparing actual complaints against projected demand.
    * *Fleet & Logistics:* Real-time status cards of active tanker transponders (en route, dispensing, loading).
    * *Equity & Impact:* Comparative KPI matrix displaying WaterFlow AI vs FCFS.
    * *Alerts View:* Severe deficit notifications and triage triggers.
  * **Citizen Portal (`CitizenApp.jsx`):** PWA-optimized reporting interface with GPS geolocation, Marathi/English bilingual support, and live mission tracking.
  * **Worker Terminal (`WorkerApp.jsx` & `DeliveryVerification.jsx`):** Mission dispatcher terminal supporting turn-by-turn waypoint navigation, 4-digit citizen OTP verification, water quality logging (TDS/pH), camera capture, and offline synchronization.
* **Offline Storage:** `indexedDB.js` manages local delivery queues when offline; `service-worker.js` pre-caches the application shell and handles background sync events.

### 2.2 Express Gateway (`backend/`)
* **Technology Stack:** Node.js, Express 4.18, CORS, `pg` (node-postgres connection pool).
* **Port:** `3001`
* **Entry Points:**
  * `server.js`: Gateway server managing connection pool to PostgreSQL (database `waterflow_os`). Automatically falls back to in-memory `MOCK_WARDS` (24 BMC wards) if PostgreSQL is unreachable. Implements local fallback scoring logic matching the Python engine.
  * `mobile_api.js`: Dedicated endpoints for citizen reporting (`POST /api/citizen/report`, `GET /api/citizen/track`) and worker dispatches (`GET /api/worker/mission`, `POST /api/worker/verify-delivery`, `POST /api/worker/status`).
  * `whatsapp_webhook.js`: Multi-lingual NLP webhook compatible with Meta Cloud API and Twilio WhatsApp payload formats. Parses Marathi, Hindi, and English keywords for intent (e.g. dirty water, dry standpost, pipe burst) and returns Devanagari formatted tickets.

### 2.3 AI & Optimization Engine (`ai_engine/`)
* **Technology Stack:** Python 3.10+, FastAPI 0.110+, Pydantic v2, NumPy, Uvicorn, Google OR-Tools (optional with greedy fallback).
* **Port:** `8000` (Main engine) / `8001` (Vision & Predictive standalone)
* **Modules:**
  * `main.py`:
    * `POST /api/prioritize`: Computes multi-criteria score (0–100) across 5 normalized factors: Vulnerability (30%), Unmet Demand (25%), Population (20%), Historical Deficit (15%), and Depot Distance (10%).
    * `POST /api/simulate-equity`: Simulates allocation under WaterFlow AI vs First-Come-First-Served (FCFS) and calculates equity metrics (Service Equity Index and Vulnerable Coverage).
    * `POST /api/optimize-routes`: Capacitated Vehicle Routing Problem (CVRP) solver using OR-Tools, with automated greedy fallback if `ortools` is not installed in the environment.
  * `vision_and_predictive.py`:
    * `POST /api/engine/verify-image`: Simulated Computer Vision pipeline verifying water discharge stream, tank rim, and geotag spatial compliance.
    * `POST /api/engine/predictive-demand`: Weather-aware demand model factoring ambient temperature, IMD heatwave alerts, and monsoon road waterlogging bottlenecks.

### 2.4 Database & Schemas (`database/`)
* **Technology Stack:** PostgreSQL 14+ with PostGIS spatial extension.
* **Schemas:**
  * `schema.sql`: Core tables for `depots`, `wards` (with polygon/centroid geometries), `tankers`, `dispatch_logs`, and `alerts`.
  * `schema_additions.sql`: Tables for `citizen_reports` and OTP status columns.
  * `phase2_schema.sql`: Tables for `contractor_invoices` and trigger functions for automatic contractor invoice generation upon delivery verification.

---

## 3. Data Flow

1. **Citizen Ingest:** Citizen submits report via Web Portal (`CitizenApp.jsx`) or WhatsApp Webhook (`whatsapp_webhook.js`). Payload captures GPS location, issue type, and contact phone.
2. **Prioritization:** Gateway queries Python AI Engine (`/api/prioritize`). Engine normalizes ward parameters, computes weighted scores, and returns an explainable ranked queue.
3. **Dispatch & Routing:** Route optimizer groups pending ward demands against available tanker capacities and depot distances.
4. **Delivery Handover:** Field worker arrives at standpost (`WorkerApp.jsx`), inspects water quality (TDS/pH), takes proof photograph, and inputs citizen-held 4-digit OTP.
5. **Verification & Audit:** Backend / CV engine validates OTP and geotag within geofence ($\le 2.5\text{ km}$ from centroid). Status updates to `Delivered` and triggers automated contractor disbursement ledger record.
