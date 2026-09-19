# WaterFlow OS — Evidence-Grade Municipal Water Allocation & Decision Architecture

[![Validation](https://img.shields.io/badge/Validation-100%25%20PASS%20(17%2F17)-brightgreen)](file:///c:/Users/tiwar/Downloads/stitch_waterflow_os_municipal_operations_dashboard/reports/final_validation_summary.md)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Policy Version](https://img.shields.io/badge/Policy-2.4.0--hardened%20%7C%203.0.0--experimental-orange)](docs/decision_architecture.md)
[![Provenance](https://img.shields.io/badge/Data%20Provenance-Audited%20A%2FB%2FC%2FD-teal)](data/reference/factor_catalog.csv)

WaterFlow OS is an evidence-grade, scientifically defensible, and stress-tested municipal water resource allocation and emergency dispatch decision-support platform calibrated for the **24 administrative wards of Greater Mumbai (Brihanmumbai Municipal Corporation / MCGM)**.

---

## Key Capabilities

1. **Decoupled Decision Architecture:**
   - **Layer A (Supply Balance):** Lake storage content, WTP filtration bottlenecks (Bhandup & Panjrapur), and Non-Revenue Water (NRW) transmission loss modeling.
   - **Layer B (Demand Forecaster):** Census 2011 population baseline, 135 LPCD lifeline standard, and IMD temperature/heatwave surge adjustments.
   - **Layer C (Human Need Priority):** Multi-criteria social equity prior (slum ratio, days elapsed without reliable pressure, deduplicated citizen complaints). **Zero transport distance coupling** in need scoring.
   - **Layer D (Constrained Resource Optimization):** SciPy HiGHS Linear Programming optimizer maximizing societal satisfaction subject to physical water budget, non-negativity, capacity limits, and BIS IS 10500 water quality safety lockout.
   - **Layer E (Fleet Logistics & Routing):** Capacitated Vehicle Routing with Time Windows (CVRPTW) on OpenStreetMap road graphs, reducing emergency response delay by 27.05%.
2. **Strict Provenance Boundary:**
   - Visual and technical separation of `REAL` (Census 2011, MCGM lakes, IMD weather, BIS standards) from `SYNTHETIC_SEEDED` (`seed=42`) and `ENGINEERING_ASSUMPTION`.
3. **Data Quality Gatekeeper:**
   - Automated screening for negative volumes, out-of-bounds geographic coordinates, stale requests, and duplicate complaint floods.

---

## Quick Start & Reproducibility

### Option 1: Run Master Validation Suite (Deterministic Seed 42)

Execute all 17 authoritative validation stages with one single command:

```bash
python tools/run_full_validation.py
```

Produces:
- `reports/final_validation_summary.json`
- `reports/final_validation_summary.md`
- `reports/reproducibility_manifest.json`

### Option 2: Containerized Deployment (Docker Compose)

Launch the complete multi-container stack (Postgres/PostGIS + FastAPI AI Engine + Express Gateway + React Frontend):

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Build and launch containers
docker compose up --build -d

# 3. Verify health
docker compose ps
curl http://localhost:3001/health
curl http://localhost:8000/health
```

Access Services:
- **Command Center Dashboard:** [http://localhost](http://localhost) (Port 80)
- **Express Municipal Gateway:** [http://localhost:3001](http://localhost:3001)
- **FastAPI AI Engine:** [http://localhost:8000](http://localhost:8000)
- **Interactive OpenAPI Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)

### Option 3: Manual Bare-Metal Development Setup

#### 1. AI & Optimization Engine (FastAPI)
```bash
python -m venv venv
# Windows: .\venv\Scripts\activate | Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
python ai_engine/main.py
```

#### 2. Express API Gateway
```bash
cd backend
npm install
node server.js
```

#### 3. React / Vite Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Core Documentation & Audit Trails

- **[Master Factor Catalog](docs/factor_catalog.md)**: 25-column registry across 25 factors with evidence levels (A/B/C/D).
- **[Decision Architecture](docs/decision_architecture.md)**: Layer boundary mapping preventing factor double-counting.
- **[Research Evidence](docs/research_evidence.md)**: Authoritative citations (MCGM, IMD, MoHUA 135 LPCD, High Court Article 21 rulings).
- **[Model Cards Dossier](docs/model_cards/)**: Quantitative cards for all 8 computational decision components.
- **[Baseline Hardening Audit](reports/phase2_baseline_audit.md)**: Independent reproduction audit of previous claims.
- **[Claims vs. Evidence Registry](docs/claims_evidence_registry.md)**: Empirical proof and limitations for all statements.
- **[Multi-Baseline Benchmark Matrix](reports/benchmark_matrix.md)**: Comparison of 8 independent allocation policies.
- **[Security Audit](docs/security_audit.md)**: Static code analysis, CORS, input validation, and credential scan.
- **[Technical Limitations](docs/final_limitations.md)**: Real vs. synthetic data boundaries and deployment caveats.
