# WaterFlow OS — Data Provenance & Lineage Specification

**Purpose:** This document details the exact transformations, assumptions, and lineage linking source data to the final dashboard presentation.

---

## 1. End-to-End Lineage Chain

```
[Official Municipal & Census Sources]
  │  ├── BMC Civic Diary 2026 (Wards, Areas, Offices)
  │  └── Census 2011 PCA (Total Population, Slum Population)
  ▼
[Reference Extraction Pipeline (scripts/fetch_*.py)]
  │  ├── data/reference/bmc/ward_population_real.csv
  │  └── data/reference/bmc/wards_real.csv
  ▼
[Deterministic Synthetic Generator (scripts/generate_benchmark_data.py)]
  │  │  Uses: numpy.random.default_rng(42)
  │  ├── data/synthetic/requests.csv
  │  ├── data/synthetic/complaints.csv
  │  ├── data/synthetic/service_history.csv
  │  ├── data/synthetic/daily_water_balance.csv
  │  └── data/synthetic/tankers.csv
  ▼
[Policy Engine (ai_engine/main.py & config/allocation_policy.yaml)]
  │  ├── Multi-Criteria Weighted Priority Scoring (0-100)
  │  ├── Hard Allocation Constraints (Non-negative, <= Demand, <= Supply)
  │  └── Capacitated Vehicle Routing Problem (OR-Tools VRP)
  ▼
[Express Municipal Gateway (backend/server.js)]
  │  ├── PostGIS persistence or 24-ward deterministic in-memory store
  │  └── Real-time REST endpoints (/api/dashboard, /api/analytics/*)
  ▼
[Frontend SCADA & Mobile Apps (frontend/src/)]
  │  ├── Command Center (Leaflet GIS, Priority Queue, KPIs)
  │  ├── Citizen Portal (Transparent "Why am I queued?", Web Speech)
  │  └── Worker Terminal (Offline IndexedDB, Proof-of-Delivery OTP)
```

---

## 2. Parameter Derivations & Formulas

### 2.1 Slum Share ($S_i$)
* **Source:** Census India 2011 PCA Greater Mumbai.
* **Input Fields:** `slum_population_2011`, `population_2011`.
* **Formula:**
  $$S_i = \frac{\text{Slum Population}_i}{\text{Total Population}_i}, \quad S_i \in [0.0, 1.0]$$
* **Classification:** `REAL_DERIVED`.

### 2.2 Population Density ($D_i$)
* **Source:** BMC Civic Diary 2026.
* **Input Fields:** `population_2011`, `area_sq_km`.
* **Formula:**
  $$D_i = \frac{\text{Population}_i}{\text{Area}_i} \quad (\text{persons per km}^2)$$
* **Classification:** `REAL_DERIVED`.

### 2.3 Vulnerability Index ($V_i$)
* **Definition:** A normalized composite index reflecting structural reliance on non-networked emergency water relief.
* **Weights:** $0.70 \times \text{Slum Share} + 0.30 \times \text{Informal Density Factor}$.
* **Classification:** `ENGINEERING_ASSUMPTION`.
* **Grounding:** Highest in Ward M/East (Govandi/Shivaji Nagar: 0.96) and Ward G/North (Dharavi: 0.93); lowest in Ward D (Malabar Hill: 0.16) and Ward A (Colaba: 0.22).

### 2.4 Depot Distance ($\text{Dist}_i$)
* **Definition:** Great-circle Haversine distance (in km) from ward geographic centroid to the nearest active municipal reservoir/treatment plant (Bhandup, Veravali, Dadar, Trombay).
* **Classification:** `REAL_DERIVED` (computed from official GPS coordinates).

---

## 3. Data Integrity & Auditing Rules

1. **Deterministic Regeneration:** Running `python scripts/generate_benchmark_data.py` must produce byte-for-byte identical CSV files.
2. **Immutability of Real Data:** The `data/reference/` directory contains read-only authoritative tables. Synthetic scripts are not permitted to mutate reference files.
3. **No Unlabelled Synthetic Telemetry:** Every synthetic dataset must contain standard audit columns: `synthetic=true`, `seed=42`, `generator_version`, and `generated_at`.
