# WaterFlow OS — Municipal Water Demand Forecasting Methodology
**Document Version:** 2.0.0-research  
**Classification:** `SYNTHETIC-BENCHMARKED`  
**Last Updated:** 2026-09-18  

---

## 1. Executive Summary & Objective

Accurate demand estimation is the foundation for municipal water budgeting and emergency allocation. If demand is underestimated, vulnerable communities suffer severe unmitigated shortages. If demand is overestimated, tankers are dispatched inefficiently, tying up scarce municipal resources.

In accordance with Phase 6 requirements, this document formalizes the demand prediction pipeline, compares baseline statistical persistence models against machine-learning estimators, prevents temporal data leakage, and provides clear mathematical formulations.

> [!IMPORTANT]
> **Data Provenance Notice:** This model evaluation was conducted on deterministic benchmark datasets seeded with real BMC ward census demographic figures (`population_projected_2026`, `slum_share_2011`) combined with synthetic historical daily requests. The model is officially classified as **`SYNTHETIC-BENCHMARKED`**. It demonstrates mathematical methodology and feature relationships, but must not be cited as empirical real-world customer meter measurements.

---

## 2. Model Formulation & Input Features

### 2.1 Feature Set
The input feature vector $\mathbf{x}_{i,t}$ for ward $i$ on day $t$ consists of:
1. **$y_{i, t-1}$ (lag_1_demand):** Previous-day demand (Liters)
2. **$y_{i, t-2}$ (lag_2_demand):** Demand two days prior (Liters)
3. **$\bar{y}_{i, t-7:t-1}$ (rolling_mean_7d):** 7-day backward rolling mean strictly excluding day $t$
4. **$H_{i,t}$ (dry_pipe_hours):** Hours of dry piped supply recorded on previous shift
5. **$S_{i,t}$ (historical_deficit):** Modeled historical service deficit ratio $[0, 1]$
6. **$P_i$ (population):** Projected ward population from BMC Master Plan
7. **$Z_i$ (slum_share):** Census slum population share $[0, 1]$
8. **$W_t$ (day_of_week):** Categorical day-of-week integer $[0, 6]$

### 2.2 Leakage Prevention
To prevent temporal data leakage:
- No forward-looking observations (e.g. $y_{i, t+1}$) are permitted in the feature space.
- Rolling statistics strictly evaluate the trailing window $[t-7, t-1]$.
- Train/test splitting is strictly **chronological**: all training occurs on $t < T_{\text{split}}$, and evaluation occurs on unseen future days $t \ge T_{\text{split}}$.

---

## 3. Evaluated Models & Baselines

We benchmarked four distinct approaches:
1. **Baseline 1: Naive Persistence ($y_{t-1}$)**
   $$\hat{y}_{i,t} = y_{i, t-1}$$
   Requires zero parameters and represents the standard operational assumption in manual dispatch.
2. **Baseline 2: 7-Day Trailing Rolling Mean**
   $$\hat{y}_{i,t} = \frac{1}{7}\sum_{k=1}^7 y_{i, t-k}$$
   Captures seasonal day-to-day stability while filtering out high-frequency noise.
3. **Model 1: Autoregressive Ridge Regressor**
   $$\min_{\mathbf{w}} \|\mathbf{X}\mathbf{w} - \mathbf{y}\|_2^2 + \alpha \|\mathbf{w}\|_2^2$$
   Linear regularized model ($\alpha=100.0$) preventing collinear instability among lag variables.
4. **Model 2: Random Forest Regressor**
   Ensemble of 50 decision trees (max depth = 6, random seed = 42) capturing non-linear interactions between demographic constraints and deficit spikes.

---

## 4. Empirical Evaluation Results

Evaluated on an out-of-sample 7-day chronological horizon across all 24 BMC administrative wards:

| Model Architecture | Model Family | MAE (Liters) | RMSE (Liters) | MAPE (%) | Improvement vs Baseline |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Baseline 1: Naive Persistence ($y_{t-1}$)** | `HEURISTIC_PERSISTENCE` | 883.79 | 1,085.02 | 16.44% | 0.00% |
| **Baseline 2: 7-Day Rolling Mean** | `STATISTICAL_ROLLING` | 824.81 | 1,118.35 | 13.97% | -6.67% (Error reduction) |
| **Model 1: Autoregressive Ridge Regressor** | `MACHINE_LEARNING_LINEAR` | 761.70 | 940.57 | 13.94% | -13.81% (Error reduction) |
| **Model 2: Random Forest Ensemble (50 trees)** | `MACHINE_LEARNING_TREE` | **730.55** | **911.41** | **13.78%** | **-17.34% (Error reduction)** |

### Key Observations
1. Both machine learning estimators outperform the simple baselines, with Random Forest achieving a **17.34% reduction in Mean Absolute Error** over the naive persistence baseline.
2. The 7-day rolling mean achieves a lower MAE than naive persistence (824.81 vs 883.79) but a slightly higher RMSE (1,118.35 vs 1,085.02), indicating that rolling averages lag behind sharp localized demand shocks.
3. The Random Forest captures sudden demand surges triggered by previous-day dry pipe hours and high slum-density constraints without suffering divergence.

---

## 5. Storage and Deployment Architecture

1. Evaluation script: `evaluation/demand_forecast.py`
2. Benchmark output artifacts:
   - `reports/demand_forecast_comparison.csv`
   - `reports/demand_forecast_comparison.json`
3. Authoritative inference runtime: Integrated into `ai_engine/main.py` serving cached daily forecasts via `GET /api/demand`.
