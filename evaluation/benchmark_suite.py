"""
WaterFlow OS — Multi-Baseline Benchmark Suite
Version: 2.0.0-evidence-grade
Phase: Phase 10 Master Benchmark

Evaluates 8 distinct, independently reproducible allocation and dispatch baselines:
  1. FCFS (First-Come First-Served Queue)
  2. Population-Proportional Allocation
  3. Equal-Share Allocation (Uniform Dividend)
  4. Need-Only Allocation (Pure Unmet Demand Descending)
  5. Vulnerability-Focused Allocation (Pure Slum Ratio Descending)
  6. Nearest-Tanker Greedy Logistics Dispatch
  7. WaterFlow Policy 2.4.0-Hardened (Canonical Weighted Baseline)
  8. WaterFlow Policy 3.0.0-Experimental (Constrained LP Resource Optimizer)

Methodological Standards:
  - Exact same dataset (24 BMC Wards, seed=42)
  - Exact same water budget (160,000 Liters under 240,000 L demand = 33% shortage)
  - Exact same tanker fleet (8 x 10,000 L tankers)
  - Exact same time horizon and physical constraints
  - Zero "winner" bias: exposes multi-dimensional trade-offs objectively.

Outputs:
  reports/benchmark_matrix.json
  reports/benchmark_matrix.md
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List
import numpy as np
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from water_engine.equity_engine import EquityEngine
from water_engine.allocation_optimizer import AllocationOptimizer
from water_engine.routing_optimizer import RoutingOptimizer, DeliveryStop, FleetTanker

REPORTS_DIR = ROOT_DIR / "reports"
REPORTS_DIR.mkdir(exist_ok=True)


def calculate_gini(values: np.ndarray) -> float:
    """Calculates Gini coefficient of fulfillment distribution."""
    if len(values) == 0 or np.sum(values) == 0:
        return 0.0
    sorted_v = np.sort(values)
    n = len(values)
    index = np.arange(1, n + 1)
    return float((np.sum((2 * index - n - 1) * sorted_v)) / (n * np.sum(sorted_v)))


def run_multi_baseline_benchmarks() -> List[Dict[str, Any]]:
    rng = np.random.default_rng(42)
    n_wards = 24
    available_supply = 160000.0  # 33.3% citywide scarcity

    # Reference ward characteristics
    demands = np.array([10000.0] * n_wards)
    total_demand = float(np.sum(demands))
    
    # 6 high-vulnerability slum wards (indices 0, 1, 2, 3, 4, 5)
    slum_shares = np.array([0.85 if i < 6 else 0.25 for i in range(n_wards)])
    populations = np.array([650000 if i % 2 == 0 else 320000 for i in range(n_wards)])
    is_emergency = np.array([True if i == 0 else False for i in range(n_wards)])
    
    vuln_mask = (slum_shares >= 0.70) | is_emergency
    vuln_demand = float(np.sum(demands[vuln_mask]))

    tankers = [
        FleetTanker(
            tanker_id=f"T_{k+1}",
            current_lat=19.00,
            current_lon=72.85,
            capacity_liters=10000.0,
            average_speed_kmh=25.0,
            is_available=True
        ) for k in range(8)
    ]
    router = RoutingOptimizer()

    def build_stops(allocs: np.ndarray) -> List[DeliveryStop]:
        stops = []
        for i in range(n_wards):
            if allocs[i] > 0:
                stops.append(DeliveryStop(
                    stop_id=str(i + 1),
                    name=f"Ward_{i+1}",
                    lat=19.00 + (i + 1) * 0.01,
                    lon=72.85 + ((i + 1) % 5) * 0.01,
                    demand_liters=float(allocs[i]),
                    is_emergency=bool(is_emergency[i])
                ))
        return stops

    benchmarks_results = []

    # -------------------------------------------------------------
    # 1. FCFS (First-Come First-Served Queue)
    # -------------------------------------------------------------
    fcfs_allocs = np.zeros(n_wards)
    rem_supply = available_supply
    # Requests arrive in pseudo-random arrival order
    arrival_order = rng.permutation(n_wards)
    for idx in arrival_order:
        take = min(demands[idx], rem_supply)
        fcfs_allocs[idx] = take
        rem_supply -= take

    # -------------------------------------------------------------
    # 2. Population-Proportional Allocation
    # -------------------------------------------------------------
    pop_weights = populations / np.sum(populations)
    pop_allocs = np.minimum(demands, available_supply * pop_weights)
    # Reallocate any minor slack
    slack = available_supply - np.sum(pop_allocs)
    if slack > 0:
        pop_allocs += slack * (pop_allocs < demands) / max(1, np.sum(pop_allocs < demands))
    pop_allocs = np.minimum(demands, pop_allocs)

    # -------------------------------------------------------------
    # 3. Equal-Share Allocation (Uniform Dividend)
    # -------------------------------------------------------------
    equal_dividend = available_supply / n_wards
    equal_allocs = np.minimum(demands, equal_dividend)

    # -------------------------------------------------------------
    # 4. Need-Only Allocation (Pure Unmet Demand Descending)
    # -------------------------------------------------------------
    # Since all demands are 10,000L, tie-breaker breaks evenly
    need_allocs = np.zeros(n_wards)
    rem_supply = available_supply
    for i in range(n_wards):
        take = min(demands[i], rem_supply)
        need_allocs[i] = take
        rem_supply -= take

    # -------------------------------------------------------------
    # 5. Vulnerability-Focused Allocation (Pure Slum Ratio Descending)
    # -------------------------------------------------------------
    vuln_order = np.argsort(-slum_shares)
    vuln_allocs = np.zeros(n_wards)
    rem_supply = available_supply
    for idx in vuln_order:
        take = min(demands[idx], rem_supply)
        vuln_allocs[idx] = take
        rem_supply -= take

    # -------------------------------------------------------------
    # 6. Nearest-Tanker Greedy Logistics Dispatch
    # -------------------------------------------------------------
    # Serves closest stops first to minimize vehicle km
    dist_from_depot = np.array([(i + 1) * 0.01 * 111.0 for i in range(n_wards)])
    dist_order = np.argsort(dist_from_depot)
    greedy_allocs = np.zeros(n_wards)
    rem_supply = available_supply
    for idx in dist_order:
        take = min(demands[idx], rem_supply)
        greedy_allocs[idx] = take
        rem_supply -= take

    # -------------------------------------------------------------
    # 7. WaterFlow Policy 2.4.0-Hardened (Canonical Weighted Baseline)
    # -------------------------------------------------------------
    engine_24 = EquityEngine()
    assessments_24 = [
        engine_24.evaluate_priority(
            location_id=str(i + 1),
            location_name=f"Ward_{i+1}",
            unmet_demand_liters=demands[i],
            vulnerability_index=slum_shares[i],
            critical_facility=1.0 if is_emergency[i] else 0.0,
            is_emergency=is_emergency[i]
        ) for i in range(n_wards)
    ]
    res_24 = engine_24.allocate(assessments_24, available_supply)
    wf_24_allocs = np.array([res_24.allocations[str(i + 1)] for i in range(n_wards)])

    # -------------------------------------------------------------
    # 8. WaterFlow Policy 3.0.0-Experimental (Constrained LP Optimizer)
    # -------------------------------------------------------------
    optimizer_30 = AllocationOptimizer(policy_version="3.0.0-experimental", strategic_reserve_fraction=0.10)
    res_30 = optimizer_30.solve(assessments_24, available_supply, water_quality_safe=True)
    wf_30_allocs = np.array([res_30.allocations[str(i + 1)] for i in range(n_wards)])

    # Compile benchmark vectors
    methods = [
        ("1. First-Come First-Served (FCFS)", fcfs_allocs, "BASELINE"),
        ("2. Population-Proportional", pop_allocs, "BASELINE"),
        ("3. Equal-Share (Uniform)", equal_allocs, "BASELINE"),
        ("4. Need-Only (Unmet Demand)", need_allocs, "BASELINE"),
        ("5. Vulnerability-Focused (Slum Prior)", vuln_allocs, "BASELINE"),
        ("6. Nearest-Tanker Greedy Routing", greedy_allocs, "BASELINE"),
        ("7. WaterFlow Policy 2.4.0-Hardened", wf_24_allocs, "WATERFLOW_CANONICAL"),
        ("8. WaterFlow Policy 3.0.0-Experimental (LP)", wf_30_allocs, "WATERFLOW_OPTIMIZED")
    ]

    for name, allocs, category in methods:
        tot_alloc = float(np.sum(allocs))
        unserved = float(max(0.0, total_demand - tot_alloc))
        overall_cov = (tot_alloc / total_demand) * 100.0
        
        vuln_alloc = float(np.sum(allocs[vuln_mask]))
        vuln_cov = (vuln_alloc / vuln_demand) * 100.0 if vuln_demand > 0 else 100.0

        fulfillment_ratios = allocs / demands
        gini = calculate_gini(fulfillment_ratios)

        # Logistics evaluation
        stops = build_stops(allocs)
        if stops:
            r_res = router.solve_optimized_routing(tankers, stops)
            tot_dist = r_res.total_distance_km
            mean_eta = r_res.mean_response_time_minutes
            emerg_delay = r_res.emergency_mean_delay_minutes
            tanker_util = r_res.average_tanker_utilization_pct
        else:
            tot_dist, mean_eta, emerg_delay, tanker_util = 0.0, 0.0, 0.0, 0.0

        benchmarks_results.append({
            "policy_name": name,
            "category": category,
            "allocated_liters": round(tot_alloc, 1),
            "unserved_demand_liters": round(unserved, 1),
            "overall_fulfillment_pct": round(overall_cov, 1),
            "vulnerable_fulfillment_pct": round(vuln_cov, 1),
            "fulfillment_gini_index": round(gini, 3),
            "total_routing_distance_km": round(tot_dist, 1),
            "mean_response_time_minutes": round(mean_eta, 1),
            "emergency_mean_delay_minutes": round(emerg_delay, 1),
            "tanker_fleet_utilization_pct": round(tanker_util, 1)
        })

    return benchmarks_results


def main():
    print("=" * 70)
    print("WATERFLOW OS — MULTI-BASELINE BENCHMARK MATRIX")
    print("=" * 70)

    results = run_multi_baseline_benchmarks()
    df = pd.DataFrame(results)

    print("\nBENCHMARK MATRIX COMPARISON (8 Independent Policies under 33% Water Scarcity):")
    for r in results:
        print(f"{r['policy_name']:<42} | Cov: {r['overall_fulfillment_pct']:>5.1f}% | VulnCov: {r['vulnerable_fulfillment_pct']:>5.1f}% | Gini: {r['fulfillment_gini_index']:>5.3f} | Dist: {r['total_routing_distance_km']:>5.1f} km | EmergETA: {r['emergency_mean_delay_minutes']:>4.1f}m")

    # Output JSON and Markdown
    json_path = REPORTS_DIR / "benchmark_matrix.json"
    md_path = REPORTS_DIR / "benchmark_matrix.md"

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    with open(md_path, "w", encoding="utf-8") as f:
        f.write("# WaterFlow OS — Multi-Baseline Benchmark Matrix\n\n")
        f.write("**Scarcity Regime:** 160,000 Liters available against 240,000 Liters citywide demand (33.3% deficit)\n")
        f.write("**Seed:** 42 (Deterministic Reproducibility)\n\n")
        f.write("| Policy / Baseline | Overall Cov (%) | Vulnerable Cov (%) | Gini Index | Transit Dist (km) | Emergency Delay (min) | Fleet Util (%) |\n")
        f.write("| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n")
        for r in results:
            f.write(f"| {r['policy_name']} | {r['overall_fulfillment_pct']:.1f}% | {r['vulnerable_fulfillment_pct']:.1f}% | {r['fulfillment_gini_index']:.3f} | {r['total_routing_distance_km']:.1f} | {r['emergency_mean_delay_minutes']:.1f} | {r['tanker_fleet_utilization_pct']:.1f}% |\n")

    print(f"\nArtifacts saved to {json_path} and {md_path}")


if __name__ == "__main__":
    main()
