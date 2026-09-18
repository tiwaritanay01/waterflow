"""
WaterFlow OS — Multi-Dimensional Disparity & Fairness Evaluation
Evaluates outcomes across High, Moderate, and Low vulnerability strata under WaterFlow vs FCFS.
Generates reports/disparity_evaluation.csv and .json.
"""

from __future__ import annotations

import json
from pathlib import Path
import pandas as pd
import numpy as np

ROOT_DIR = Path(__file__).resolve().parent.parent
REPORTS_DIR = ROOT_DIR / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

import sys
sys.path.insert(0, str(ROOT_DIR))

from water_engine.equity_engine import EquityEngine, NeedAssessment


def run_disparity_audit():
    print("======================================================================")
    print("WATERFLOW OS — MULTI-DIMENSIONAL FAIRNESS & DISPARITY AUDIT")
    print("======================================================================")

    # Load Reference Ward Demographics and Synthetic Demand
    ward_pop_path = ROOT_DIR / "data" / "reference" / "bmc" / "ward_population_real.csv"
    demand_path = ROOT_DIR / "data" / "synthetic" / "demand_history.csv"

    if not ward_pop_path.exists() or not demand_path.exists():
        raise FileNotFoundError(f"Missing required data files: {ward_pop_path} or {demand_path}")

    df_pop = pd.read_csv(ward_pop_path)
    df_demand = pd.read_csv(demand_path)

    # Evaluate on the latest date in demand history
    latest_date = df_demand["date"].max()
    day_df = df_demand[df_demand["date"] == latest_date].copy()
    day_df = pd.merge(day_df, df_pop[["ward_code", "slum_share_2011"]], on="ward_code", how="left")
    day_df["vulnerability_index"] = day_df["slum_share_2011"].fillna(0.5)

    engine = EquityEngine()

    # Formulate assessments
    assessments = []
    for _, row in day_df.iterrows():
        a = engine.evaluate_priority(
            location_id=str(row["ward_code"]),
            location_name=f"Ward {row['ward_code']}",
            unmet_demand_liters=float(row["demand_liters"]),
            vulnerability_index=float(row["vulnerability_index"]),
            historical_deficit=float(row["historical_deficit"]),
            reliability_deficit=float(row.get("dry_pipe_hours", 24.0) / 72.0)
        )
        assessments.append(a)

    total_demand = sum(a.unmet_demand_liters for a in assessments)
    # Simulate acute supply constraint: only 45% of total demand can be fulfilled
    supply_budget = total_demand * 0.45

    # 1. WaterFlow AI Allocation
    wf_res = engine.allocate(assessments, available_supply_liters=supply_budget)

    # 2. FCFS Baseline Allocation: Evaluate over randomized citizen arrival sequences (mean of 20 runs)
    rng = np.random.default_rng(42)
    fcfs_alloc_matrix = {str(a.location_id): [] for a in assessments}

    for _ in range(20):
        shuffled_assessments = list(assessments)
        rng.shuffle(shuffled_assessments)
        fcfs_rem = supply_budget
        for a in shuffled_assessments:
            d = a.unmet_demand_liters
            alloc = min(d, fcfs_rem)
            fcfs_alloc_matrix[str(a.location_id)].append(alloc)
            fcfs_rem -= alloc

    fcfs_allocs = {loc_id: float(np.mean(vols)) for loc_id, vols in fcfs_alloc_matrix.items()}

    # Join results to day_df
    day_df["wf_allocated"] = day_df["ward_code"].apply(lambda w: wf_res.allocations.get(str(w), 0.0))
    day_df["fcfs_allocated"] = day_df["ward_code"].apply(lambda w: fcfs_allocs.get(str(w), 0.0))

    # Stratify by vulnerability
    def stratify(v):
        if v >= 0.70:
            return "HIGH_VULNERABILITY (V >= 0.70)"
        elif v >= 0.40:
            return "MODERATE_VULNERABILITY (0.40 <= V < 0.70)"
        else:
            return "LOW_VULNERABILITY (V < 0.40)"

    day_df["strata"] = day_df["vulnerability_index"].apply(stratify)

    strata_metrics = []
    for s_name, grp in day_df.groupby("strata"):
        n_wards = len(grp)
        grp_demand = grp["demand_liters"].sum()

        wf_delivered = grp["wf_allocated"].sum()
        fcfs_delivered = grp["fcfs_allocated"].sum()

        wf_fulfillment = (wf_delivered / grp_demand * 100.0) if grp_demand > 0 else 100.0
        fcfs_fulfillment = (fcfs_delivered / grp_demand * 100.0) if grp_demand > 0 else 100.0

        strata_metrics.append({
            "strata": s_name,
            "wards_count": n_wards,
            "total_demand_liters": round(float(grp_demand), 1),
            "wf_delivered_liters": round(float(wf_delivered), 1),
            "wf_fulfillment_pct": round(float(wf_fulfillment), 1),
            "wf_unmet_liters": round(float(grp_demand - wf_delivered), 1),
            "fcfs_delivered_liters": round(float(fcfs_delivered), 1),
            "fcfs_fulfillment_pct": round(float(fcfs_fulfillment), 1),
            "fcfs_unmet_liters": round(float(grp_demand - fcfs_delivered), 1),
            "fulfillment_delta_pct": round(float(wf_fulfillment - fcfs_fulfillment), 1)
        })

    res_df = pd.DataFrame(strata_metrics)
    res_df.to_csv(REPORTS_DIR / "disparity_evaluation.csv", index=False)

    with open(REPORTS_DIR / "disparity_evaluation.json", "w", encoding="utf-8") as f:
        json.dump({
            "audit_date": latest_date,
            "supply_budget_liters": supply_budget,
            "total_demand_liters": total_demand,
            "strata_breakdown": strata_metrics
        }, f, indent=2)

    print("\nSTRATA DISPARITY COMPARISON (WaterFlow vs FCFS under 45% Shortage):")
    for s in strata_metrics:
        print(f"  {s['strata']}")
        print(f"    WaterFlow Fulfillment: {s['wf_fulfillment_pct']:>5}% | Unmet: {s['wf_unmet_liters']:>8,.0f} L")
        print(f"    FCFS Fulfillment:      {s['fcfs_fulfillment_pct']:>5}% | Unmet: {s['fcfs_unmet_liters']:>8,.0f} L")
        print(f"    Disparity Delta:       {s['fulfillment_delta_pct']:>+5}%")

    print(f"\nArtifacts saved to reports/disparity_evaluation.csv and .json")


if __name__ == "__main__":
    run_disparity_audit()
