"""
WaterFlow OS — Physical Resource Scarcity & Operational Stress Testing
Version: 2.0.0-evidence-grade
Phase: Phase 9 Resource Stress Testing

Simulates 14 rigorous operational failure and stress regimes:
  1. Normal Operating Baseline (100% Supply, Full Fleet)
  2. Moderate Shortage (70% Bulk Supply)
  3. Severe Shortage (40% Bulk Supply)
  4. Single Tanker Mechanical Breakdown
  5. Multiple Tanker Fleet Halved (50% fleet down)
  6. Central Depot Gantry Outage
  7. Treatment Plant Failure (Source 50% derated)
  8. Road Closure / Peripheral Cutoff (Route length +60%)
  9. Water Quality Contamination Alert (IS 10500 Potability Lockout)
  10. Extreme Heatwave Surge (+35% hydration demand)
  11. Rainfall Anomaly / Flash Flood (Conveyance siltation)
  12. Mass Citizen Complaint Surge (3x call volume)
  13. Bot / Panic Duplicate Complaint Surge (Filtered by Deduplication Engine)
  14. Population Slum Demand Spike

Measures:
  - total_unmet_demand_liters
  - vulnerable_unmet_demand_liters
  - service_coverage_pct
  - water_delivered_liters
  - distance_travelled_km
  - tanker_utilization_pct
  - emergency_reserve_remaining_liters
  - mean_response_time_minutes
  - duplicate_complaints_filtered

Outputs:
  reports/stress_tests_results.csv
  reports/stress_tests_results.json
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List
import numpy as np
import pandas as pd

import sys
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))
REPORTS_DIR = ROOT_DIR / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

from water_engine.equity_engine import EquityEngine
from water_engine.allocation_optimizer import AllocationOptimizer
from water_engine.routing_optimizer import RoutingOptimizer, DeliveryStop, FleetTanker
from complaint_engine.deduplication import ComplaintDeduplicator, ComplaintRecord
from datetime import datetime


def run_stress_testing_suite() -> List[Dict[str, Any]]:
    engine = EquityEngine()
    optimizer = AllocationOptimizer(strategic_reserve_fraction=0.10)
    rng = np.random.default_rng(42)

    # 24 canonical ward demands (total baseline demand ~240,000 L)
    base_demands = [10000.0] * 24
    base_slum_shares = [0.80 if i in [0, 1, 2, 3, 4] else 0.35 for i in range(24)]
    base_critical = [1.0 if i == 0 else 0.0 for i in range(24)]

    # 14 Scenarios definitions
    scenarios = [
        {"name": "01_Normal_Supply", "supply": 250000.0, "demand_mult": 1.0, "fleet_size": 10, "quality_safe": True, "road_penalty": 1.0, "dup_count": 0},
        {"name": "02_Moderate_Shortage", "supply": 175000.0, "demand_mult": 1.0, "fleet_size": 10, "quality_safe": True, "road_penalty": 1.0, "dup_count": 0},
        {"name": "03_Severe_Shortage", "supply": 100000.0, "demand_mult": 1.0, "fleet_size": 10, "quality_safe": True, "road_penalty": 1.0, "dup_count": 0},
        {"name": "04_Single_Tanker_Failure", "supply": 250000.0, "demand_mult": 1.0, "fleet_size": 9, "quality_safe": True, "road_penalty": 1.0, "dup_count": 0},
        {"name": "05_Multiple_Tanker_Failure", "supply": 250000.0, "demand_mult": 1.0, "fleet_size": 5, "quality_safe": True, "road_penalty": 1.0, "dup_count": 0},
        {"name": "06_Depot_Outage", "supply": 200000.0, "demand_mult": 1.0, "fleet_size": 8, "quality_safe": True, "road_penalty": 1.25, "dup_count": 0},
        {"name": "07_Source_Outage", "supply": 125000.0, "demand_mult": 1.0, "fleet_size": 10, "quality_safe": True, "road_penalty": 1.0, "dup_count": 0},
        {"name": "08_Road_Closure", "supply": 250000.0, "demand_mult": 1.0, "fleet_size": 10, "quality_safe": True, "road_penalty": 1.60, "dup_count": 0},
        {"name": "09_Water_Quality_Failure", "supply": 250000.0, "demand_mult": 1.0, "fleet_size": 10, "quality_safe": False, "road_penalty": 1.0, "dup_count": 0},
        {"name": "10_Heatwave_Surge", "supply": 250000.0, "demand_mult": 1.35, "fleet_size": 10, "quality_safe": True, "road_penalty": 1.0, "dup_count": 0},
        {"name": "11_Rainfall_Anomaly", "supply": 180000.0, "demand_mult": 1.10, "fleet_size": 8, "quality_safe": True, "road_penalty": 1.30, "dup_count": 0},
        {"name": "12_Mass_Complaint_Event", "supply": 250000.0, "demand_mult": 1.15, "fleet_size": 10, "quality_safe": True, "road_penalty": 1.0, "dup_count": 10},
        {"name": "13_Duplicate_Complaint_Surge", "supply": 250000.0, "demand_mult": 1.0, "fleet_size": 10, "quality_safe": True, "road_penalty": 1.0, "dup_count": 50},
        {"name": "14_Slum_Population_Spike", "supply": 250000.0, "demand_mult": 1.40, "fleet_size": 10, "quality_safe": True, "road_penalty": 1.0, "dup_count": 0},
    ]

    results = []

    for sc in scenarios:
        # 1. Filter duplicate complaints
        dup_filtered = 0
        if sc["dup_count"] > 0:
            dedup = ComplaintDeduplicator()
            complaints = []
            for j in range(sc["dup_count"]):
                complaints.append(ComplaintRecord(
                    complaint_id=f"c_{j}",
                    citizen_id="citizen_dup",
                    ward_code="M/E",
                    lat=19.05,
                    lon=72.92,
                    issue_type="NO_WATER",
                    timestamp=datetime(2026, 9, 18, 10, j % 5)
                ))
            dedup_res = dedup.process(complaints)
            dup_filtered = dedup_res.duplicates_filtered

        # 2. Formulate ward assessments
        assessments = []
        for i in range(24):
            demand = base_demands[i] * sc["demand_mult"]
            a = engine.evaluate_priority(
                location_id=str(i + 1),
                location_name=f"Ward_{i+1}",
                unmet_demand_liters=demand,
                vulnerability_index=base_slum_shares[i],
                critical_facility=base_critical[i],
                is_emergency=(i == 0)
            )
            assessments.append(a)

        # 3. Solve Constrained LP Allocation
        alloc_res = optimizer.solve(
            assessments=assessments,
            available_supply_liters=sc["supply"],
            water_quality_safe=sc["quality_safe"]
        )

        # 4. Routing Simulation
        stops = []
        for a in assessments:
            al = alloc_res.allocations.get(str(a.location_id), 0.0)
            if al > 0:
                stops.append(DeliveryStop(
                    stop_id=str(a.location_id),
                    name=a.location_name,
                    lat=19.00 + int(a.location_id) * 0.01,
                    lon=72.85 + (int(a.location_id) % 5) * 0.01,
                    demand_liters=al,
                    is_emergency=a.is_emergency
                ))

        tankers = [
            FleetTanker(
                tanker_id=f"T_{k+1}",
                current_lat=19.00,
                current_lon=72.85,
                capacity_liters=10000.0,
                average_speed_kmh=25.0 / sc["road_penalty"],
                is_available=True
            ) for k in range(sc["fleet_size"])
        ]

        if stops:
            router = RoutingOptimizer()
            route_res = router.solve_optimized_routing(tankers=tankers, stops=stops)
            tot_dist = route_res.total_distance_km
            mean_resp = route_res.mean_response_time_minutes
            tanker_util = route_res.average_tanker_utilization_pct
        else:
            tot_dist = 0.0
            mean_resp = 0.0
            tanker_util = 0.0

        vulnerable_demand = sum(a.unmet_demand_liters for a in assessments if a.tier == 1 or a.priority_score >= 70)
        vulnerable_alloc = sum(alloc_res.allocations.get(str(a.location_id), 0.0) for a in assessments if a.tier == 1 or a.priority_score >= 70)
        vuln_unmet = max(0.0, vulnerable_demand - vulnerable_alloc)

        results.append({
            "scenario": sc["name"],
            "supply_liters": sc["supply"],
            "total_demand_liters": alloc_res.total_unmet_demand,
            "total_allocated_liters": alloc_res.total_allocated,
            "unserved_demand_liters": alloc_res.unserved_demand,
            "vulnerable_unmet_liters": round(vuln_unmet, 1),
            "service_coverage_pct": round(alloc_res.overall_fulfillment_ratio * 100.0, 1),
            "vulnerable_coverage_pct": round(alloc_res.high_vuln_fulfillment_ratio * 100.0, 1),
            "distance_travelled_km": round(tot_dist, 1),
            "mean_response_time_minutes": round(mean_resp, 1),
            "tanker_utilization_pct": round(tanker_util, 1),
            "emergency_reserve_remaining_liters": alloc_res.strategic_reserve_liters,
            "duplicate_complaints_filtered": dup_filtered
        })

    return results


def main():
    print("=" * 70)
    print("WATERFLOW OS — RESOURCE SCARCITY & STRESS TESTING SUITE")
    print("=" * 70)

    results = run_stress_testing_suite()
    df = pd.DataFrame(results)

    print("\nSTRESS TEST RESULTS (14 Operational Scenarios):")
    for r in results:
        print(f"{r['scenario']:<30} | Supply: {r['supply_liters']:>7,.0f} L | Cov: {r['service_coverage_pct']:>5.1f}% | VulnCov: {r['vulnerable_coverage_pct']:>5.1f}% | Dist: {r['distance_travelled_km']:>5.1f} km | ETA: {r['mean_response_time_minutes']:>4.1f}m")

    csv_path = REPORTS_DIR / "stress_tests_results.csv"
    json_path = REPORTS_DIR / "stress_tests_results.json"
    df.to_csv(csv_path, index=False)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print(f"\nArtifacts saved to {csv_path} and {json_path}")


if __name__ == "__main__":
    main()
