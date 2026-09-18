# Model Card — Municipal Water Demand Forecasting

## Model Details
- **Model Name:** WaterFlow Municipal Ward Demand Estimator
- **Model Version:** 2.0.0-research
- **Model Classification:** `SYNTHETIC-BENCHMARKED`
- **Model Type:** Supervised Regression (Random Forest Ensemble & Autoregressive Ridge)
- **Framework:** scikit-learn 1.6+ / Python 3.13
- **Primary Developer:** WaterFlow OS Research Team
- **Date:** 2026-09-18

## Intended Use
- **Primary Use Case:** Forecasting ward-level daily water demand (in Liters) for municipal tanker dispatch and bulk allocation planning across Greater Mumbai's 24 wards.
- **Target Users:** Municipal water utility engineers, emergency logistics dispatchers, and capacity planners.
- **Out of Scope Uses:** Individual customer billing, pipe network hydraulic modeling, or long-term multi-decade infrastructure sizing.

## Data & Provenance
- **Demographic Inputs:** Real BMC 2011 Census and Master Plan 2034 projected ward populations (`population_projected_2026`) and slum proportion figures (`slum_share_2011`) from `data/reference/bmc/mumbai_wards_reference.csv`.
- **Operational Historical Inputs:** Deterministic synthetic daily operational records generated with seed=42 (`data/synthetic/benchmark_dataset_seed42.csv`), capturing historical unmet deficits, dry-pipe hours, and tanker requests.
- **Classification Status:** `SYNTHETIC-BENCHMARKED`. Not derived from physical IoT smart meter measurements.

## Evaluation Summary
- **Split Strategy:** Strict chronological 7-day holdout test split (train: 136 samples, test: 168 samples).
- **Leakage Prevention:** Features strictly utilize trailing lag observations ($t-1, t-2, t-7:t-1$). Zero lookahead leakage.
- **Performance:**
  - Naive Persistence Baseline: MAE 883.79 L, RMSE 1,085.02 L, MAPE 16.44%
  - 7-Day Rolling Mean: MAE 824.81 L, RMSE 1,118.35 L, MAPE 13.97%
  - Autoregressive Ridge: MAE 761.70 L, RMSE 940.57 L, MAPE 13.94%
  - Random Forest (50 trees, max depth 6): MAE 730.55 L, RMSE 911.41 L, MAPE 13.78% (17.34% error reduction vs baseline)

## Ethical & Operational Limitations
1. **Zero Demographic Identity Weights:** The model does not ingest individual citizen identity (religion, caste, ethnicity). Spatial slum share is used purely as an infrastructure proxy for piped network coverage deficit.
2. **Synthetic Operational Bounds:** Because daily requests in training are synthetically generated under calibrated municipal parameters, deployment in production must retrain on real SCADA and citizen call center logs.
3. **Extreme Anomaly Response:** During unforeseen physical catastrophes (e.g. major aqueduct collapse), historical lags may underestimate sudden demand shifts. Human operator override must always take precedence.
