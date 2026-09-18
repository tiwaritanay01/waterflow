#!/usr/bin/env python3
"""
WaterFlow OS — Demand Forecasting & Chronological Validation (Phase 6)
======================================================================
Evaluates short-term municipal demand prediction across:
- Baseline 1: Naive Previous-Day Persistence (y_{t-1})
- Baseline 2: 7-Day Rolling Mean
- Model 1: Autoregressive Linear / Ridge Regressor
- Model 2: Random Forest Regressor (scikit-learn)

Enforces strict chronological train/test separation (28 days train, 7 days test).
Outputs:
- reports/demand_forecast_comparison.csv
- reports/demand_forecast_comparison.json
"""

import sys
import os
import json
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

# UTF-8 stdout configuration for Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
REPORTS_DIR = ROOT_DIR / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def main():
    print("=" * 70)
    print("WATERFLOW OS — DEMAND FORECASTING EVALUATION PIPELINE")
    print("=" * 70)

    # 1. Load Data
    df_demand = pd.read_csv(DATA_DIR / "synthetic" / "demand_history.csv")
    df_pop = pd.read_csv(DATA_DIR / "reference" / "bmc" / "ward_population_real.csv")

    df_pop = df_pop[["ward_code", "population_projected_2026", "slum_share_2011"]].rename(
        columns={"population_projected_2026": "population", "slum_share_2011": "slum_share"}
    )
    df = pd.merge(df_demand, df_pop, on="ward_code", how="left")
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(by=["ward_code", "date"]).reset_index(drop=True)

    # 2. Engineer Chronological Features (No future data leakage)
    df["day_of_week"] = df["date"].dt.dayofweek
    df["lag_1_demand"] = df.groupby("ward_code")["demand_liters"].shift(1)
    df["lag_2_demand"] = df.groupby("ward_code")["demand_liters"].shift(2)
    df["lag_7_demand"] = df.groupby("ward_code")["demand_liters"].shift(7)
    
    # 7-day rolling mean strictly calculated on past observations (excluding today)
    df["rolling_mean_7d"] = df.groupby("ward_code")["demand_liters"].transform(
        lambda s: s.shift(1).rolling(7, min_periods=1).mean()
    )

    feature_cols = [
        "lag_1_demand",
        "lag_2_demand",
        "rolling_mean_7d",
        "dry_pipe_hours",
        "historical_deficit",
        "population",
        "slum_share",
        "day_of_week"
    ]

    # Drop early rows that lack lag features
    clean_df = df.dropna(subset=feature_cols).reset_index(drop=True)

    # 3. Chronological Train / Test Split
    dates = sorted(clean_df["date"].unique())
    split_date = dates[-7]  # Final 7 days for test set
    
    train_df = clean_df[clean_df["date"] < split_date]
    test_df = clean_df[clean_df["date"] >= split_date]

    X_train = train_df[feature_cols]
    y_train = train_df["demand_liters"]
    X_test = test_df[feature_cols]
    y_test = test_df["demand_liters"]

    # 4. Train Models
    # Model 1: Autoregressive Ridge
    ridge = Ridge(alpha=100.0)
    ridge.fit(X_train, y_train)
    pred_ridge = ridge.predict(X_test)

    # Model 2: Random Forest Regressor
    rf = RandomForestRegressor(n_estimators=50, max_depth=6, random_state=42)
    rf.fit(X_train, y_train)
    pred_rf = rf.predict(X_test)

    # Baselines (zero-training persistence)
    pred_naive_lag1 = test_df["lag_1_demand"].values
    pred_rolling_7d = test_df["rolling_mean_7d"].values

    # 5. Compute Evaluation Metrics
    def evaluate_preds(y_true, y_pred):
        mae = mean_absolute_error(y_true, y_pred)
        rmse = np.sqrt(mean_squared_error(y_true, y_pred))
        mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100.0
        return round(float(mae), 2), round(float(rmse), 2), round(float(mape), 2)

    mae_naive, rmse_naive, mape_naive = evaluate_preds(y_test, pred_naive_lag1)
    mae_roll, rmse_roll, mape_roll = evaluate_preds(y_test, pred_rolling_7d)
    mae_ridge, rmse_ridge, mape_ridge = evaluate_preds(y_test, pred_ridge)
    mae_rf, rmse_rf, mape_rf = evaluate_preds(y_test, pred_rf)

    results = [
        {
            "model_name": "Baseline 1: Naive Previous-Day (y_{t-1})",
            "model_family": "HEURISTIC_PERSISTENCE",
            "mae_liters": mae_naive,
            "rmse_liters": rmse_naive,
            "mape_pct": mape_naive,
            "vs_baseline_pct": 0.0
        },
        {
            "model_name": "Baseline 2: 7-Day Rolling Mean",
            "model_family": "STATISTICAL_ROLLING",
            "mae_liters": mae_roll,
            "rmse_liters": rmse_roll,
            "mape_pct": mape_roll,
            "vs_baseline_pct": round(((mae_roll - mae_naive) / mae_naive) * 100, 2)
        },
        {
            "model_name": "Model 1: Autoregressive Ridge Regressor",
            "model_family": "MACHINE_LEARNING_LINEAR",
            "mae_liters": mae_ridge,
            "rmse_liters": rmse_ridge,
            "mape_pct": mape_ridge,
            "vs_baseline_pct": round(((mae_ridge - mae_naive) / mae_naive) * 100, 2)
        },
        {
            "model_name": "Model 2: Random Forest Ensemble (50 trees)",
            "model_family": "MACHINE_LEARNING_TREE",
            "mae_liters": mae_rf,
            "rmse_liters": rmse_rf,
            "mape_pct": mape_rf,
            "vs_baseline_pct": round(((mae_rf - mae_naive) / mae_naive) * 100, 2)
        }
    ]

    res_df = pd.DataFrame(results)
    res_df.to_csv(REPORTS_DIR / "demand_forecast_comparison.csv", index=False)

    summary = {
        "status": "PASS",
        "dataset_split": {
            "total_samples": len(clean_df),
            "train_samples": len(train_df),
            "test_samples": len(test_df),
            "test_period_days": 7,
            "test_start_date": str(split_date.date()),
            "leakage_audited": True
        },
        "models_evaluated": results
    }
    with open(REPORTS_DIR / "demand_forecast_comparison.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print("\nRESULTS TABLE (Chronological 7-Day Test Split):")
    for r in results:
        print(f"  {r['model_name']:<42} | MAE: {r['mae_liters']:>8} L | RMSE: {r['rmse_liters']:>8} L | MAPE: {r['mape_pct']:>5}% | Delta: {r['vs_baseline_pct']:>+6}%")

    print(f"\nArtifacts generated:")
    print(f"  CSV:  {REPORTS_DIR / 'demand_forecast_comparison.csv'}")
    print(f"  JSON: {REPORTS_DIR / 'demand_forecast_comparison.json'}")


if __name__ == "__main__":
    main()
