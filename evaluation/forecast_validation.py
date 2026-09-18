#!/usr/bin/env python3
"""
Demand Forecast Validation Suite for WaterFlow OS.
Evaluates a statistical/ML predictive model against naive baselines (Previous Day, 7-Day Rolling Mean)
on chronologically held-out test data, reporting MAE and RMSE.
"""

import sys
import os
import csv
import numpy as np

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

def run_forecast_validation(demand_csv: str = "data/synthetic/demand_history.csv") -> dict:
    if not os.path.exists(demand_csv):
        print(f"Error: {demand_csv} not found.")
        return {}

    # Read demand time series
    records = []
    with open(demand_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            records.append({
                "date": r["date"],
                "ward_code": r["ward_code"],
                "demand": float(r["demand_liters"]),
                "dry_pipe": float(r["dry_pipe_hours"]),
                "deficit": float(r["historical_deficit"]),
            })

    # Group by date for total aggregate daily demand
    dates = sorted(list(set(r["date"] for r in records)))
    daily_aggregates = []
    for d in dates:
        day_total = sum(r["demand"] for r in records if r["date"] == d)
        avg_dry = np.mean([r["dry_pipe"] for r in records if r["date"] == d])
        daily_aggregates.append({"date": d, "demand": day_total, "avg_dry": avg_dry})

    # Chronological temporal split: first 80% train, last 20% test
    n_total = len(daily_aggregates)
    split_idx = int(n_total * 0.80)
    train_data = daily_aggregates[:split_idx]
    test_data = daily_aggregates[split_idx:]

    y_train = np.array([x["demand"] for x in train_data])
    y_test = np.array([x["demand"] for x in test_data])

    # 1. Baseline 1: Naive Previous-Day Persistence (y_pred[t] = y[t-1])
    naive_pred = []
    for i in range(len(test_data)):
        if i == 0:
            prev_val = train_data[-1]["demand"]
        else:
            prev_val = test_data[i - 1]["demand"]
        naive_pred.append(prev_val)
    naive_pred = np.array(naive_pred)

    # 2. Baseline 2: 7-Day Moving Average
    all_demands = [x["demand"] for x in daily_aggregates]
    rolling_pred = []
    for i in range(len(test_data)):
        global_idx = split_idx + i
        window = all_demands[max(0, global_idx - 7):global_idx]
        rolling_pred.append(np.mean(window) if window else y_train.mean())
    rolling_pred = np.array(rolling_pred)

    # 3. Model: Ridge / Linear Model with Dry-Pipe Feature & Trend
    # Feature X = [intercept, lag-1, avg_dry_pipe]
    X_train = []
    for i in range(1, len(train_data)):
        X_train.append([1.0, train_data[i - 1]["demand"], train_data[i]["avg_dry"]])
    y_train_fit = y_train[1:]
    X_train = np.array(X_train)

    # Solve least squares w = (X^T X + lambda I)^-1 X^T y
    lam = 1e-3
    XtX = X_train.T @ X_train + lam * np.eye(X_train.shape[1])
    weights = np.linalg.inv(XtX) @ X_train.T @ y_train_fit

    ml_pred = []
    for i in range(len(test_data)):
        prev_demand = train_data[-1]["demand"] if i == 0 else test_data[i - 1]["demand"]
        x_test_row = np.array([1.0, prev_demand, test_data[i]["avg_dry"]])
        ml_pred.append(float(x_test_row @ weights))
    ml_pred = np.array(ml_pred)

    # Evaluation Metrics: MAE & RMSE
    def eval_metrics(y_true, y_p):
        mae = float(np.mean(np.abs(y_true - y_p)))
        rmse = float(np.sqrt(np.mean((y_true - y_p) ** 2)))
        mape = float(np.mean(np.abs((y_true - y_p) / y_true)) * 100.0)
        return {"mae_liters": round(mae, 1), "rmse_liters": round(rmse, 1), "mape_pct": round(mape, 2)}

    results = {
        "dataset": demand_csv,
        "classification": "SYNTHETIC-BENCHMARKED",
        "split_strategy": "Chronological (First 80% train, last 20% test)",
        "train_days": len(train_data),
        "test_days": len(test_data),
        "baselines": {
            "naive_previous_day": eval_metrics(y_test, naive_pred),
            "7_day_rolling_average": eval_metrics(y_test, rolling_pred),
        },
        "ml_predictive_model": eval_metrics(y_test, ml_pred)
    }

    print("=== Chronological Demand Forecast Validation Results ===")
    print(f"Naive Previous-Day:   MAE = {results['baselines']['naive_previous_day']['mae_liters']:,} L | RMSE = {results['baselines']['naive_previous_day']['rmse_liters']:,} L")
    print(f"7-Day Rolling Mean:   MAE = {results['baselines']['7_day_rolling_average']['mae_liters']:,} L | RMSE = {results['baselines']['7_day_rolling_average']['rmse_liters']:,} L")
    print(f"ML Predictive Model:  MAE = {results['ml_predictive_model']['mae_liters']:,} L | RMSE = {results['ml_predictive_model']['rmse_liters']:,} L")

    return results

if __name__ == "__main__":
    run_forecast_validation()
