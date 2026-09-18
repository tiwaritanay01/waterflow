# WaterFlow OS — Predictive Models & AI Component Card

**Status:** SYNTHETIC-BENCHMARKED  
**Date:** 2026-09-18  
**Authoritative Note:** The training and evaluation in this prototype are performed on seeded, structured synthetic time-series (`data/synthetic/demand_history.csv`). Results represent algorithmic benchmarking under controlled scenarios and must **not** be presented as verified municipal forecasting accuracy on live BMC pipelines.

---

## 1. Algorithmic Component Classification

| Module | Source Location | True Algorithmic Classification | AI/ML Justification |
| :--- | :--- | :--- | :--- |
| **Priority Queue Allocation** | `ai_engine/main.py: compute_priority` | **RULE_BASED (MCDA)** | Deterministic 5-factor linear decision model with fixed unit-sum weights. Not ML. |
| **Fleet Routing & Dispatch** | `ai_engine/main.py: optimize_routes` | **OPTIMIZATION** | Constraint-satisfaction CVRP solver using Google OR-Tools. Not ML. |
| **Weather Multipliers** | `ai_engine/vision_and_predictive.py` | **RULE_BASED (`SCENARIO_PARAMETER`)** | Engineered sensitivity formulas translating IMD temperature and rainfall into demand surge factors. Not ML. |
| **Visual Proof of Delivery** | `ai_engine/vision_and_predictive.py` | **RULE_BASED (SYNTHETIC MOCK)** | Deterministic bounding box and confidence score generator simulating edge vision inference. Not ML. |
| **Demand Forecasting** | `evaluation/forecast_validation.py` | **STATISTICAL / MACHINE_LEARNING** | Autoregressive regression model with SCADA hydrologic lag features. |

---

## 2. Model Specification: Municipal Short-Term Demand Forecaster

### 2.1 Problem Definition
Forecast aggregate daily municipal emergency water demand (in Liters) for the next 24-hour cycle to enable proactive depot water transfers and tanker driver pre-scheduling.

### 2.2 Target Variable & Input Features
* **Target ($y_t$):** Aggregate emergency relief water demand across all 24 BMC wards on day $t$.
* **Features ($X_t$):**
  1. Intercept term ($w_0$).
  2. Prior day demand ($y_{t-1}$).
  3. Average ward dry pipe outage hours ($\bar{D}_t$).

### 2.3 Chronological Train / Test Validation
* **Dataset:** 35 days of synthetic historical records (`data/synthetic/demand_history.csv`).
* **Split Strategy:** Strict chronological split (first 28 days for fitting, final 7 days held-out test).
* **Baselines for Comparison:**
  1. *Naive Persistence:* $y_t = y_{t-1}$.
  2. *7-Day Rolling Mean:* $y_t = \frac{1}{7} \sum_{k=1}^{7} y_{t-k}$.

### 2.4 Empirical Benchmark Results
* **Naive Previous-Day Baseline:** $\text{MAE} = 4,224.0\text{ L} \quad (\text{RMSE} = 5,258.9\text{ L})$.
* **7-Day Rolling Mean Baseline:** $\text{MAE} = 7,377.8\text{ L} \quad (\text{RMSE} = 10,268.0\text{ L})$.
* **ML Predictive Model:** $\mathbf{\text{MAE} = 3,099.2\text{ L}} \quad (\mathbf{\text{RMSE} = 4,014.2\text{ L}})$.
* **Net Improvement over Naive Baseline:** $26.6\%$ reduction in mean absolute forecasting error.

### 2.5 Limitations & Known Failure Modes
1. **Unmodeled Exogenous Shocks:** Sudden catastrophic mainline breaks (e.g. Tansa trunk burst) cannot be predicted by autoregressive demand models alone and require real-time SCADA pressure telemetry.
2. **Synthetic Data Dependency:** Coefficients are calibrated against synthetic demand scenarios. Calibration against real historical billing and tanker dispatch records is required before operational deployment.
