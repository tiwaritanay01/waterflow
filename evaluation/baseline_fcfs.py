#!/usr/bin/env python3
"""
First-Come-First-Served (FCFS) Baseline Simulator for WaterFlow OS.
Allocates water strictly in submission order of arrival requests, without considering vulnerability.
"""

import sys
import os
import csv
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ai_engine")))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from main import WardInput
from metrics import calculate_benchmark_metrics

def run_fcfs_simulation(requests_csv: str, balance_csv: str, wards_meta: list) -> dict:
    """Executes pure FCFS baseline simulation."""
    # Load daily emergency supply budget
    daily_budget = 380000
    if os.path.exists(balance_csv):
        with open(balance_csv, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            first_row = next(reader, None)
            if first_row:
                daily_budget = int(first_row.get("total_emergency_supply_liters", daily_budget))

    # Read requests sorted chronologically by arrival timestamp
    requests = []
    if os.path.exists(requests_csv):
        with open(requests_csv, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                requests.append({
                    "id": int(r["request_id"]),
                    "timestamp": r["timestamp"],
                    "ward_code": r["ward_code"],
                    "volume": int(r["requested_volume_liters"]),
                })
    requests.sort(key=lambda x: x["timestamp"])

    # Allocate strictly in order of arrival until daily supply is exhausted
    allocations = {str(w.ward_number): 0 for w in wards_meta}
    remaining_supply = daily_budget
    travel_distances = []

    for req in requests:
        w_code = req["ward_code"]
        ward_obj = next((w for w in wards_meta if str(w.ward_number) == w_code), None)
        if not ward_obj:
            continue

        alloc_amount = min(req["volume"], remaining_supply)
        allocations[w_code] = allocations.get(w_code, 0) + alloc_amount
        remaining_supply -= alloc_amount

        # FCFS naive dispatch: travel distance from depot with no clustering
        travel_distances.append(ward_obj.depot_distance_km * 2.0) # Round trip per arrival

        if remaining_supply <= 0:
            break

    # Enforce ward demand ceilings
    for w in wards_meta:
        allocations[str(w.ward_number)] = min(allocations[str(w.ward_number)], w.demand_liters)

    metrics = calculate_benchmark_metrics(wards_meta, allocations, travel_distances)
    metrics["method"] = "First-Come-First-Served (Legacy FCFS)"
    return metrics

if __name__ == "__main__":
    from main import WardInput
    # Quick sanity test
    test_wards = [
        WardInput(ward_id=1, ward_number="M/E", name="Govandi", demand_liters=32000, vulnerability_index=0.96, depot_distance_km=4.8),
        WardInput(ward_id=2, ward_number="K/W", name="Andheri West", demand_liters=6000, vulnerability_index=0.44, depot_distance_km=6.6)
    ]
    res = run_fcfs_simulation("data/synthetic/requests.csv", "data/synthetic/daily_water_balance.csv", test_wards)
    print("FCFS Result:", res)
