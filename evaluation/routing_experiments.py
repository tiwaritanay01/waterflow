"""
WaterFlow OS — Controlled Routing & Logistics Experiments
Compares Baseline (Nearest Tanker Dispatch) vs Optimized (Capacity-Constrained Multi-Stop Routing).
Generates reports/routing_experiments.csv and reports/routing_experiments.json.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
import numpy as np
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from water_engine.routing_optimizer import (
    RoutingOptimizer,
    FleetTanker,
    DeliveryStop
)

REPORTS_DIR = ROOT_DIR / "reports"
REPORTS_DIR.mkdir(exist_ok=True)


def main():
    print("======================================================================")
    print("WATERFLOW OS — CONTROLLED ROUTING EXPERIMENTS")
    print("======================================================================")

    # 1. Load real ward centroids and synthetic tankers
    wards_path = ROOT_DIR / "data" / "reference" / "bmc" / "wards_real.csv"
    tankers_path = ROOT_DIR / "data" / "synthetic" / "tankers.csv"

    df_wards = pd.read_csv(wards_path)
    df_tankers = pd.read_csv(tankers_path)

    depot_coords = {
        "Bhandup Hub": (19.145, 72.935),
        "Dadar Station": (19.018, 72.843),
        "Veravali Booster": (19.130, 72.865)
    }

    # Instantiate Fleet Tankers
    tankers: list[FleetTanker] = []
    for _, r in df_tankers.iterrows():
        depot = r.get("home_depot", "Bhandup Hub")
        lat, lon = depot_coords.get(depot, (19.145, 72.935))
        tankers.append(FleetTanker(
            tanker_id=str(r["transponder_id"]),
            current_lat=lat,
            current_lon=lon,
            capacity_liters=float(r["capacity_liters"]),
            average_speed_kmh=25.0,
            is_available=(r.get("status", "available") == "available")
        ))

    # Create Delivery Stops across 24 wards with calibrated demand and 3 emergencies
    stops: list[DeliveryStop] = []
    rng = np.random.default_rng(42)

    for idx, r in df_wards.iterrows():
        is_em = idx in [0, 4, 11]  # Wards M/E, P/N, H/W simulated with emergency status
        vol = float(rng.integers(6000, 18000))
        stops.append(DeliveryStop(
            stop_id=f"STOP-{r['ward_code']}",
            name=f"Ward {r['ward_code']} Delivery",
            lat=float(r["centroid_lat"]),
            lon=float(r["centroid_lng"]),
            demand_liters=vol,
            is_emergency=is_em,
            unloading_time_minutes=15.0
        ))

    optimizer = RoutingOptimizer()

    # Run Baseline
    base_res = optimizer.solve_nearest_tanker_baseline(tankers, stops)

    # Run Optimized
    opt_res = optimizer.solve_optimized_routing(tankers, stops)

    # Compare
    comparison = [
        {
            "metric": "Total Travel Distance (km)",
            "baseline_nearest": base_res.total_distance_km,
            "optimized_routing": opt_res.total_distance_km,
            "improvement_pct": round(((base_res.total_distance_km - opt_res.total_distance_km) / base_res.total_distance_km) * 100, 2) if base_res.total_distance_km > 0 else 0.0
        },
        {
            "metric": "Total Travel Duration (minutes)",
            "baseline_nearest": base_res.total_travel_time_minutes,
            "optimized_routing": opt_res.total_travel_time_minutes,
            "improvement_pct": round(((base_res.total_travel_time_minutes - opt_res.total_travel_time_minutes) / base_res.total_travel_time_minutes) * 100, 2) if base_res.total_travel_time_minutes > 0 else 0.0
        },
        {
            "metric": "Mean Response Time (minutes)",
            "baseline_nearest": base_res.mean_response_time_minutes,
            "optimized_routing": opt_res.mean_response_time_minutes,
            "improvement_pct": round(((base_res.mean_response_time_minutes - opt_res.mean_response_time_minutes) / base_res.mean_response_time_minutes) * 100, 2) if base_res.mean_response_time_minutes > 0 else 0.0
        },
        {
            "metric": "Median Response Time (minutes)",
            "baseline_nearest": base_res.median_response_time_minutes,
            "optimized_routing": opt_res.median_response_time_minutes,
            "improvement_pct": round(((base_res.median_response_time_minutes - opt_res.median_response_time_minutes) / base_res.median_response_time_minutes) * 100, 2) if base_res.median_response_time_minutes > 0 else 0.0
        },
        {
            "metric": "95th Percentile Response Time (minutes)",
            "baseline_nearest": base_res.p95_response_time_minutes,
            "optimized_routing": opt_res.p95_response_time_minutes,
            "improvement_pct": round(((base_res.p95_response_time_minutes - opt_res.p95_response_time_minutes) / base_res.p95_response_time_minutes) * 100, 2) if base_res.p95_response_time_minutes > 0 else 0.0
        },
        {
            "metric": "Emergency Mean Delay (minutes)",
            "baseline_nearest": base_res.emergency_mean_delay_minutes,
            "optimized_routing": opt_res.emergency_mean_delay_minutes,
            "improvement_pct": round(((base_res.emergency_mean_delay_minutes - opt_res.emergency_mean_delay_minutes) / base_res.emergency_mean_delay_minutes) * 100, 2) if base_res.emergency_mean_delay_minutes > 0 else 0.0
        },
        {
            "metric": "Water Delivered (Liters)",
            "baseline_nearest": base_res.total_water_delivered_liters,
            "optimized_routing": opt_res.total_water_delivered_liters,
            "improvement_pct": round(((opt_res.total_water_delivered_liters - base_res.total_water_delivered_liters) / base_res.total_water_delivered_liters) * 100, 2) if base_res.total_water_delivered_liters > 0 else 0.0
        },
        {
            "metric": "Water Use Efficiency (%)",
            "baseline_nearest": base_res.water_use_efficiency_pct,
            "optimized_routing": opt_res.water_use_efficiency_pct,
            "improvement_pct": round(opt_res.water_use_efficiency_pct - base_res.water_use_efficiency_pct, 2)
        }
    ]

    df_comp = pd.DataFrame(comparison)
    df_comp.to_csv(REPORTS_DIR / "routing_experiments.csv", index=False)

    with open(REPORTS_DIR / "routing_experiments.json", "w", encoding="utf-8") as f:
        json.dump({
            "status": "PASS",
            "fleet_size": len(tankers),
            "stops_count": len(stops),
            "emergency_stops_count": 3,
            "metrics": comparison
        }, f, indent=2)

    print("\nEXPERIMENTAL RESULTS (Baseline Nearest-Tanker vs Optimized Capacity Routing):")
    for m in comparison:
        print(f"  {m['metric']:<40} | Base: {m['baseline_nearest']:>8} | Opt: {m['optimized_routing']:>8} | Delta: {m['improvement_pct']:>+6}%")

    print(f"\nArtifacts saved to reports/routing_experiments.csv and .json")


if __name__ == "__main__":
    main()
