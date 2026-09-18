#!/usr/bin/env python3
"""
Sensitivity Analysis Runner for WaterFlow OS Policy Configurations.
Evaluates 5 distinct policy weight profiles across 24 BMC wards to demonstrate monotonic stability.
"""

import sys
import os
import csv
import json
import argparse

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ai_engine")))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from main import WardInput, compute_priority
from waterflow_benchmark import load_bmc_wards_from_reference
from metrics import calculate_benchmark_metrics

POLICY_PROFILES = [
    {
        "id": "POLICY_A_EQUAL",
        "name": "Equal Weighting Profile",
        "weights": {"vulnerability": 0.20, "unmet_demand": 0.20, "population": 0.20, "historical_deficit": 0.20, "depot_distance": 0.20},
        "rationale": "Flat baseline giving equal priority to all operational dimensions."
    },
    {
        "id": "POLICY_B_VULNERABILITY_CENTRIC",
        "name": "Pro-Poor / Slum Priority Profile",
        "weights": {"vulnerability": 0.50, "unmet_demand": 0.20, "population": 0.10, "historical_deficit": 0.10, "depot_distance": 0.10},
        "rationale": "Maximizes direct protection for informal settlements and dense slum clusters."
    },
    {
        "id": "POLICY_C_ACUTE_OUTAGE_CENTRIC",
        "name": "Dry Pipe Emergency Response Profile",
        "weights": {"vulnerability": 0.20, "unmet_demand": 0.50, "population": 0.10, "historical_deficit": 0.10, "depot_distance": 0.10},
        "rationale": "Responds primarily to immediate hydrologic pipe dry hours regardless of tenure."
    },
    {
        "id": "POLICY_D_BMC_BALANCED",
        "name": "Default BMC Balanced Municipal Policy (Canonical)",
        "weights": {"vulnerability": 0.30, "unmet_demand": 0.25, "population": 0.20, "historical_deficit": 0.15, "depot_distance": 0.10},
        "rationale": "Production balance calibrating equity against municipal logistics and population scale."
    },
    {
        "id": "POLICY_E_LOGISTICS_CONSERVATIVE",
        "name": "Transit Distance Conservative Profile",
        "weights": {"vulnerability": 0.20, "unmet_demand": 0.20, "population": 0.15, "historical_deficit": 0.10, "depot_distance": 0.35},
        "rationale": "Emphasizes transit proximity and outer ward logistical reach."
    }
]

def score_with_weights(ward: WardInput, weights: dict) -> float:
    """Computes total score under a custom weight profile."""
    v_norm = min(max(ward.vulnerability_index, 0.0), 1.0)
    u_norm = min(ward.dry_pipe_hours / 72.0, 1.0)
    p_norm = min(ward.population / 1000000.0, 1.0)
    h_norm = min(max(ward.historical_deficit, 0.0), 1.0)
    d_norm = min(ward.depot_distance_km / 20.0, 1.0)

    score = 100.0 * (
        weights["vulnerability"] * v_norm +
        weights["unmet_demand"] * u_norm +
        weights["population"] * p_norm +
        weights["historical_deficit"] * h_norm +
        weights["depot_distance"] * d_norm
    )
    return round(score, 1)

def run_sensitivity_analysis(output_dir: str = "reports") -> dict:
    os.makedirs(output_dir, exist_ok=True)
    wards = load_bmc_wards_from_reference()
    total_supply = 250000 # Severely constrained supply to reveal allocation divergence

    profile_results = []

    for prof in POLICY_PROFILES:
        weights = prof["weights"]
        # Score each ward
        scored_wards = []
        for w in wards:
            sc = score_with_weights(w, weights)
            scored_wards.append((w, sc))
        scored_wards.sort(key=lambda x: x[1], reverse=True)

        # Allocate
        allocations = {str(w.ward_number): 0 for w in wards}
        remaining = total_supply
        for w, sc in scored_wards:
            alloc = min(w.demand_liters, remaining)
            allocations[str(w.ward_number)] = alloc
            remaining -= alloc
            if remaining <= 0:
                break

        # Compute travel distances
        travel_distances = [w.depot_distance_km * 1.5 for w, _ in scored_wards if allocations[str(w.ward_number)] > 0]
        metrics = calculate_benchmark_metrics(wards, allocations, travel_distances)

        profile_results.append({
            "profile_id": prof["id"],
            "name": prof["name"],
            "rationale": prof["rationale"],
            "weights": weights,
            "top_3_wards": [f"{sw[0].ward_number} ({sw[1]} pts)" for sw in scored_wards[:3]],
            "metrics": metrics
        })

    # Save JSON and CSV
    json_path = os.path.join(output_dir, "sensitivity_analysis.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(profile_results, f, indent=2)

    csv_path = os.path.join(output_dir, "sensitivity_analysis.csv")
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["profile_id", "profile_name", "vuln_weight", "unmet_demand_weight", "vulnerable_coverage_pct", "equity_index_sei", "unmet_demand_liters", "total_travel_km", "top_ranked_ward"])
        for pr in profile_results:
            m = pr["metrics"]
            w = pr["weights"]
            writer.writerow([
                pr["profile_id"], pr["name"], w["vulnerability"], w["unmet_demand"],
                f"{m['vulnerable_area_coverage_pct']}%", m["equity_index_sei"],
                m["total_unmet_demand_liters"], m["total_travel_distance_km"],
                pr["top_3_wards"][0]
            ])

    print(f"✅ Sensitivity analysis completed across {len(POLICY_PROFILES)} policy families.")
    print(f"   Outputs: {json_path} and {csv_path}")
    return profile_results

if __name__ == "__main__":
    run_sensitivity_analysis()
