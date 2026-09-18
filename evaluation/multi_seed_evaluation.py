"""
WaterFlow OS — End-to-End Reproducibility & Multi-Seed Statistical Validation (Phases 37 & 38)
1. Verifies exact deterministic reproducibility on seed 42 (zero drift).
2. Evaluates stochastic variance across 5 independent seeds: 42, 43, 44, 45, 46.
3. Reports Mean, Standard Deviation, Min, and Max metrics across equity and logistics.
Outputs: reports/multi_seed_statistical_report.csv and reports/multi_seed_statistical_report.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
import numpy as np
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from water_engine.equity_engine import EquityEngine, NeedAssessment
from water_engine.routing_optimizer import RoutingOptimizer, FleetTanker, DeliveryStop

REPORTS_DIR = ROOT_DIR / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

SEEDS = [42, 43, 44, 45, 46]


def run_experiment_on_seed(seed: int, df_pop: pd.DataFrame, df_wards: pd.DataFrame) -> dict:
    rng = np.random.default_rng(seed)
    equity_engine = EquityEngine()
    routing_opt = RoutingOptimizer()

    # Formulate ward assessments with seed-based noise
    assessments = []
    for idx, r in df_pop.iterrows():
        # Jitter demand by +/- 10%
        d = 12000.0 * (1.0 + rng.uniform(-0.10, 0.10))
        # Jitter historical deficit by +/- 0.05
        h = min(1.0, max(0.0, 0.5 + rng.uniform(-0.05, 0.05)))
        a = equity_engine.evaluate_priority(
            location_id=r["ward_code"],
            location_name=r["ward_name"],
            unmet_demand_liters=d,
            vulnerability_index=float(r["slum_share_2011"]),
            historical_deficit=h
        )
        assessments.append(a)

    total_demand = sum(a.unmet_demand_liters for a in assessments)
    supply_budget = 240000.0

    alloc_res = equity_engine.allocate(assessments, available_supply_liters=supply_budget)

    high_vuln_wards = [a for a in assessments if a.breakdown[0].raw_value >= 0.70]
    high_vuln_demand = sum(a.unmet_demand_liters for a in high_vuln_wards)
    high_vuln_alloc = sum(alloc_res.allocations[str(a.location_id)] for a in high_vuln_wards)
    high_vuln_cov = (high_vuln_alloc / high_vuln_demand * 100.0) if high_vuln_demand > 0 else 100.0

    # Routing simulation
    tankers = [
        FleetTanker(tanker_id="T1", current_lat=19.145, current_lon=72.935, capacity_liters=10000.0),
        FleetTanker(tanker_id="T2", current_lat=19.018, current_lon=72.843, capacity_liters=12000.0),
        FleetTanker(tanker_id="T3", current_lat=19.130, current_lon=72.865, capacity_liters=10000.0),
        FleetTanker(tanker_id="T4", current_lat=19.145, current_lon=72.935, capacity_liters=10000.0),
        FleetTanker(tanker_id="T5", current_lat=19.018, current_lon=72.843, capacity_liters=12000.0)
    ]
    stops = [
        DeliveryStop(
            stop_id=f"S-{r['ward_code']}",
            name=f"Ward {r['ward_code']}",
            lat=float(r["centroid_lat"]),
            lon=float(r["centroid_lng"]),
            demand_liters=float(alloc_res.allocations.get(str(r["ward_code"]), 0.0)),
            is_emergency=(idx in [0, 4])
        )
        for idx, r in df_wards.iterrows()
        if alloc_res.allocations.get(str(r["ward_code"]), 0.0) > 0
    ]
    route_res = routing_opt.solve_optimized_routing(tankers, stops)

    return {
        "seed": seed,
        "total_demand_liters": round(total_demand, 1),
        "total_allocated_liters": alloc_res.total_allocated,
        "overall_fulfillment_pct": round(alloc_res.total_allocated / total_demand * 100.0, 2),
        "high_vuln_fulfillment_pct": round(high_vuln_cov, 2),
        "total_routing_distance_km": route_res.total_distance_km,
        "mean_response_time_minutes": route_res.mean_response_time_minutes
    }


def main():
    print("======================================================================")
    print("WATERFLOW OS — MULTI-SEED STATISTICAL VALIDATION (SEEDS 42-46)")
    print("======================================================================")

    ward_pop_path = ROOT_DIR / "data" / "reference" / "bmc" / "ward_population_real.csv"
    wards_geo_path = ROOT_DIR / "data" / "reference" / "bmc" / "wards_real.csv"
    df_pop = pd.read_csv(ward_pop_path)
    df_geo = pd.read_csv(wards_geo_path)

    # 1. Deterministic Repeatability Check (Seed 42 twice)
    run_1 = run_experiment_on_seed(42, df_pop, df_geo)
    run_2 = run_experiment_on_seed(42, df_pop, df_geo)
    assert run_1 == run_2, "Non-deterministic behavior detected on identical seed 42!"
    print("PASS: Exact deterministic reproducibility confirmed on Seed 42.")

    # 2. Multi-Seed Stochastic Distribution
    all_runs = [run_1]
    for s in [43, 44, 45, 46]:
        all_runs.append(run_experiment_on_seed(s, df_pop, df_geo))

    df_runs = pd.DataFrame(all_runs)

    # Compute descriptive statistics
    metrics_to_stat = [
        "overall_fulfillment_pct",
        "high_vuln_fulfillment_pct",
        "total_routing_distance_km",
        "mean_response_time_minutes"
    ]

    stat_summary = []
    for m in metrics_to_stat:
        vals = df_runs[m].values
        stat_summary.append({
            "metric": m,
            "mean": round(float(np.mean(vals)), 2),
            "std_dev": round(float(np.std(vals)), 2),
            "min": round(float(np.min(vals)), 2),
            "max": round(float(np.max(vals)), 2)
        })

    df_stats = pd.DataFrame(stat_summary)
    df_stats.to_csv(REPORTS_DIR / "multi_seed_statistical_report.csv", index=False)

    with open(REPORTS_DIR / "multi_seed_statistical_report.json", "w", encoding="utf-8") as f:
        json.dump({
            "seeds_tested": SEEDS,
            "runs": all_runs,
            "summary_statistics": stat_summary
        }, f, indent=2)

    print("\nMULTI-SEED DESCRIPTIVE STATISTICS (N=5 independent runs):")
    for s in stat_summary:
        print(f"  {s['metric']:<30} | Mean: {s['mean']:>7.2f} | StdDev: {s['std_dev']:>6.2f} | Range: [{s['min']:>6.2f}, {s['max']:>6.2f}]")

    print(f"\nSaved to reports/multi_seed_statistical_report.csv and .json")


if __name__ == "__main__":
    main()
