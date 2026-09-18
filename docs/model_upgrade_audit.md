# WaterFlow OS — Pre-Model-Upgrade System & Variable Audit (Phase 0)

**Document Version:** 1.0.0  
**Checkpoint Tag:** `waterflow-pre-model-upgrade`  
**Execution Date:** 2026-09-18  
**Scope:** Complete inventory of all mathematical variables, constraints, predictive features, and data classifications prior to the research-grade model upgrade.

---

## 1. Existing Allocation Variables & Weights

In policy `2.4.0-hardened`, the priority score $P_i \in [0, 100]$ is calculated as:
$$P_i = 100 \times \left(0.30 \cdot \hat{V}_i + 0.25 \cdot \hat{U}_i + 0.20 \cdot \hat{P}_i + 0.15 \cdot \hat{H}_i + 0.10 \cdot \hat{D}_i\right)$$

| Variable | Symbol | Normalization Cap | Current Weight | Classification | Source |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Vulnerability Index** | $V_i$ | $\min(1.0, \text{slum\_pct} / 100)$ | 0.30 (30%) | `REAL_DERIVED` | Census 2011 Slum Population Ratio |
| **Unmet Demand / Dry Pipe**| $U_i$ | $\min(1.0, \text{dry\_hours} / 72.0)$ | 0.25 (25%) | `SYNTHETIC_SEEDED` | Simulated SCADA sensor hours |
| **Ward Population** | $P_i$ | $\min(1.0, \text{pop} / 1,000,000)$ | 0.20 (20%) | `REAL` | BMC Civic Diary 2026 Projections |
| **Historical Deficit** | $H_i$ | $\min(1.0, \text{deficit\_pct} / 100)$| 0.15 (15%) | `SYNTHETIC_SEEDED` | 7-day trailing unfulfilled quota |
| **Depot Distance** | $D_i$ | $\min(1.0, \text{dist\_km} / 20.0)$ | 0.10 (10%) | `REAL` | OpenStreetMap centroid-to-depot |

> **Critical Upgrade Requirement (Phase 7):** $D_i$ (Depot Distance) will be removed from the priority/need equation and relocated strictly to Stage 2 logistics optimization.

---

## 2. Existing Predictive & Machine Learning Variables

From `ai_engine/vision_and_predictive.py` and `evaluation/forecast_validation.py`:

| Component | Role | Inputs | Classification | Model Family |
| :--- | :--- | :--- | :--- | :--- |
| **Demand Forecaster** | Next-day total demand | Lag-1 demand ($y_{t-1}$), Ward avg dry hours ($\bar{D}_t$) | `SYNTHETIC-BENCHMARKED` | Autoregressive Ridge Regression |
| **Weather Multiplier** | Scenario demand surge | IMD Temperature, Heatwave Warning Flag, Monsoon Rainfall | `SCENARIO_PARAMETER` | Rule-Based Multiplier ($1.35\times$) |
| **Vision Triage Mock** | Delivery proof check | Image stream bounding box, NTU turbidity simulation | `RULE_BASED` | Mock Heuristic Filter |

---

## 3. Existing Fleet Routing & Logistics Variables

From `ai_engine/main.py: optimize_routes`:
- **Nodes:** Depot coordinates (Node 0) + 24 Ward Centroids (Nodes 1..24) extracted from OpenStreetMap.
- **Distance Matrix:** Euclidean / Manhattan approximation in km (`REAL`).
- **Vehicle Fleet:** 10 registered tankers (Capacities: 6,000 L, 9,000 L, 10,000 L) based on BMC tender specs (`REAL_REFERENCE`).
- **Operational Status:** Simulated live states (`loading`, `en_route`, `dispensing`, `idle`) (`SYNTHETIC_SEEDED`).

---

## 4. Existing Hard Constraints

1. **Non-negativity:** $\text{allocation}_i \ge 0 \quad \forall i \in [1, 24]$.
2. **Unmet Demand Upper Bound:** $\text{allocation}_i \le \text{demand}_i \quad \forall i$.
3. **Supply Budget Ceiling:** $\sum_{i=1}^{24} \text{allocation}_i \le \text{daily\_emergency\_supply}$.
4. **Tanker Capacity Feasibility:** $\text{delivered\_volume} \le \text{tanker\_capacity}$.
5. **Unit-Sum Weights:** $\sum w_k = 1.00$.

---

## 5. Existing Data Provenance Audit

| Dataset | Location | Rows | Status Classification | Primary Source |
| :--- | :--- | :---: | :---: | :--- |
| **Ward Population** | `data/reference/bmc/ward_population_real.csv` | 24 | `REAL` / `REAL_DERIVED` | BMC Civic Diary 2026 + Census 2011 |
| **Ward Centroids** | `data/reference/bmc/wards_real.csv` | 24 | `REAL` | BMC Administrative Ward Map |
| **Heatwave Thresholds**| `data/reference/imd/heatwave_criteria.json` | 1 | `REAL_REFERENCE` | India Meteorological Department |
| **Transit Depots** | `data/reference/osm/mumbai_transit_nodes.json` | 4 | `REAL` | OpenStreetMap (ODbL) |
| **Requests** | `data/synthetic/requests.csv` | 1,674 | `SYNTHETIC_SEEDED` | Deterministic Generator (`seed=42`) |
| **Complaints** | `data/synthetic/complaints.csv` | 993 | `SYNTHETIC_SEEDED` | Deterministic Generator (`seed=42`) |
| **Service History** | `data/synthetic/service_history.csv` | 567 | `SYNTHETIC_SEEDED` | Deterministic Generator (`seed=42`) |
| **Tankers** | `data/synthetic/tankers.csv` | 10 | `SYNTHETIC_SEEDED` | Deterministic Generator (`seed=42`) |
| **Water Balance** | `data/synthetic/daily_water_balance.csv` | 35 | `SYNTHETIC_SEEDED` | Deterministic Generator (`seed=42`) |
| **Demand History** | `data/synthetic/demand_history.csv` | 840 | `SYNTHETIC_SEEDED` | Deterministic Generator (`seed=42`) |

---

## 6. Gaps Identified for Upgrade

1. **Supply Side is Pure Scenario Scalar:** Currently, `total_supply` is an arbitrary number (e.g. 420,000 L). A physical mass-balance model distinguishing raw source, treatment, transmission, and losses is required (Phase 5).
2. **Logistics Entangled in Need Score:** Distance ($D_i$) is currently in the priority score. It must be cleanly separated into the routing optimizer (Phase 4 & 7).
3. **No Service Reliability History:** Historical deficit is currently just a 7-day average. A structured multi-timescale reliability and consecutive failure model is needed (Phase 9).
4. **No Critical Facilities Distinction:** Hospitals, dialysis centers, and schools are treated identically to generic residential households (Phase 13).
5. **No Potable vs Non-Potable Separation:** High-grade drinking water is assumed for all uses (Phase 20).
6. **Limited Baselines & Scenarios:** Only FCFS is benchmarked; nearest-tanker and simple demand baselines plus 12 stress scenarios must be added (Phases 21–22).
7. **No Factor Ablation:** No study previously verified whether removing individual factors degrades equity outcomes (Phase 24).
