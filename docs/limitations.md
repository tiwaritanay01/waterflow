# WaterFlow OS — Technical System Limitations & Data Boundaries (Phase 26)

**Policy Version:** `2.4.0-hardened`  
**Classification:** Scientific & Operational Transparency Disclosure  
**Audience:** Municipal Engineers, Reviewers, Policy Analysts, Auditors

---

## Executive Principle

WaterFlow OS is designed as a mathematically auditable, data-provenance-aware municipal water allocation engine. In accordance with municipal engineering integrity principles, **no synthetic data, derived proxy, or engineering assumption is ever represented as a real municipal field measurement**.

Reviewers and municipal stakeholders must evaluate the system with full awareness of the following nine explicit boundaries:

---

## 1. Citizen Complaint Records are Synthetic Seeded
- **Status Classification:** `SYNTHETIC_SEEDED`
- **Limitation:** While the BMC 1916 civic grievance hierarchy and category taxonomies are official (`REAL_REFERENCE`), public machine-readable historical grievance logs with granular lat/lng coordinates and timestamps are not published by BMC due to privacy and municipal security regulations.
- **System Behavior:** The 993 historical complaint events under `data/synthetic/complaints.csv` are deterministically generated with `numpy.random.default_rng(42)`. They model realistic Poisson arrival patterns, spatiotemporal clustering, and duplicate tickets, but must **never be cited as actual citizen complaints filed with MCGM**.

---

## 2. Tanker Fleet Status & GPS Positions are Synthetic Seeded
- **Status Classification:** `SYNTHETIC_SEEDED`
- **Limitation:** The registered tanker fleet specifications (capacities of 6,000 L, 9,000 L, and 10,000 L) are based on official BMC water tanker tender procurement documents (`REAL_REFERENCE`). However, live SCADA GPS transponder telemetry and driver assignment rosters are simulated.
- **System Behavior:** Live tanker coordinates, turnaround latencies, and route tracking on the GIS dispatch map are generated from deterministic simulation models.

---

## 3. Daily Emergency Water Budget is a Scenario Parameter
- **Status Classification:** `SCENARIO_PARAMETER`
- **Limitation:** The daily emergency water volume (e.g., 420,000 L baseline, or 15,000 L in severe shortage) is an operator-configurable policy parameter, not a live SCADA meter reading from the Bhandup Treatment Plant or municipal master balancing reservoirs.
- **System Behavior:** The allocation engine strictly enforces the water budget as an immutable upper bound ($\sum \text{alloc}_i \le \text{supply}$), but the total volume itself is specified per simulation scenario.

---

## 4. Historical Service Fulfillment Records are Synthetic Seeded
- **Status Classification:** `SYNTHETIC_SEEDED`
- **Limitation:** Historical tanker delivery logs (`data/synthetic/service_history.csv`) and daily ward water balances (`daily_water_balance.csv`) are synthetic benchmarks.
- **System Behavior:** These tables establish a reproducible 35-day operational history to test priority recalculations, deficit scoring, and audit pipelines under controlled conditions.

---

## 5. Ward Vulnerability Score is a Derived Policy Construct
- **Status Classification:** `REAL_DERIVED`
- **Limitation:** The vulnerability metric ($V_i$) is an engineered policy construct derived from Census 2011 slum population ratios, informal settlement density, and historical rationing deficits. It is **not an official BMC published index**.
- **System Behavior:** Vulnerability is normalized to the unit interval $[0.0, 1.0]$. While based on official Census ward statistics, the weighting and capping functions represent policy choices designed to safeguard informal communities.

---

## 6. Allocation Weights are Configurable Policy Choices
- **Status Classification:** `POLICY_PARAMETER`
- **Limitation:** The canonical allocation weights ($w_{\text{vuln}} = 0.30$, $w_{\text{unmet}} = 0.25$, $w_{\text{pop}} = 0.20$, $w_{\text{deficit}} = 0.15$, $w_{\text{distance}} = 0.10$) are not natural physical constants or universally optimal values.
- **System Behavior:** They are explicitly defined in `config/allocation_policy.yaml` and sum to 1.0. Any modification to these weights produces different priority queues, as documented in `docs/sensitivity_analysis.md`. The weights reflect a humanitarian policy priority favoring underserved settlements over speed-of-submission.

---

## 7. Predictive ML Models Trained on Synthetic Data Cannot Represent Real Municipal Accuracy
- **Status Classification:** `SYNTHETIC-BENCHMARKED`
- **Limitation:** The autoregressive demand prediction model in `ai_engine/vision_and_predictive.py` was validated against naive baselines on a held-out chronological split of synthetic benchmark data (achieving MAE of 3,099 L vs Naive MAE of 4,224 L).
- **System Behavior:** This proves the **algorithm's mathematical validity and comparative advantage over naive heuristics**, but **cannot be claimed to represent true forecasting accuracy on real-world Mumbai SCADA telemetry** until retrained on genuine municipal meter feeds.

---

## 8. OpenStreetMap Road Network Geometry Does Not Reflect Temporary Closures
- **Status Classification:** `REAL`
- **Limitation:** Road network geometries, depot coordinates, and route distances are extracted from OpenStreetMap (ODbL). However, static OSM data does not reflect real-time Mumbai traffic bottlenecks, waterlogged roads during heavy monsoon downpours, or temporary infrastructure closures (e.g., Metro rail construction diversions).
- **System Behavior:** Fleet routing optimization in OR-Tools uses distance matrix approximations that must be augmented with live Mumbai Traffic Police feeds in production deployment.

---

## 9. Historical Census 2011 Data Should Not Be Treated as Current Population
- **Status Classification:** `REAL` (Historical) vs `REAL_DERIVED` (Current Projection)
- **Limitation:** India's last official decennial census was conducted in 2011. While Census 2011 PCA data is real, using 2011 figures directly for current water allocation would undercount rapidly growing peripheral wards (e.g., K/East, P/North, M/East).
- **System Behavior:** WaterFlow OS utilizes the **BMC Civic Diary 2026 projected population** (total 13,858,000 across 24 wards) for current per-capita allocation baselines, while retaining Census 2011 slum ratios as structural vulnerability proxies.

---

## Summary of Governance Rules

| Category | Permitted Usage | Strictly Prohibited |
| :--- | :--- | :--- |
| **Synthetic Data** | Algorithmic benchmarking, stress testing, scenario simulation, code validation | Representing as real municipal observations or citizen complaints |
| **Policy Weights** | Configurable via `config/allocation_policy.yaml`, versioned in API responses | Hardcoding divergent weights in frontend components |
| **ML Models** | Documented via Model Card, compared against naive baselines | Claiming real-world predictive superiority without real training data |
| **Reference Data** | Sourced with official URLs, publication dates, and ODbL attribution | Silent alteration of official Census or BMC population numbers |
