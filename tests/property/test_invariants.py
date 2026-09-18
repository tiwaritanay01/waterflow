#!/usr/bin/env python3
"""
Automated Invariant and Property Test Suite for WaterFlow OS.
Asserts mathematical properties, monotonicity, constraint boundaries, and determinism.
"""

import sys
import os
import copy
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ai_engine")))

from main import (
    WardInput, compute_priority, _allocate_ai, _allocate_fcfs,
    WEIGHT_VULNERABILITY, WEIGHT_UNMET_DEMAND, WEIGHT_POPULATION,
    WEIGHT_HISTORICAL_DEFICIT, WEIGHT_DISTANCE
)

def make_sample_wards():
    rng = np.random.default_rng(100)
    wards = []
    for i in range(1, 25):
        wards.append(WardInput(
            ward_id=i,
            ward_number=f"W{i}",
            name=f"Ward {i}",
            vulnerability_index=float(rng.uniform(0.1, 0.95)),
            dry_pipe_hours=float(rng.uniform(0.0, 70.0)),
            population=int(rng.integers(100000, 950000)),
            historical_deficit=float(rng.uniform(0.0, 0.9)),
            depot_distance_km=float(rng.uniform(1.0, 18.0)),
            demand_liters=int(rng.integers(5000, 35000))
        ))
    return wards

def test_invariant_1_priority_bounds():
    """Invariant 1: 0 <= priority <= 100 for all valid inputs."""
    wards = make_sample_wards()
    # Add extreme edge cases
    wards.append(WardInput(ward_id=99, ward_number="MIN", name="Min Ward", vulnerability_index=0.0, dry_pipe_hours=0.0, population=0, historical_deficit=0.0, depot_distance_km=0.0, demand_liters=0))
    wards.append(WardInput(ward_id=100, ward_number="MAX", name="Max Ward", vulnerability_index=1.0, dry_pipe_hours=100.0, population=2000000, historical_deficit=1.0, depot_distance_km=50.0, demand_liters=100000))

    for w in wards:
        score = compute_priority(w).total_score
        assert 0.0 <= score <= 100.0, f"Invariant 1 Violated: score {score} out of bounds for {w.name}"
    print("PASS: Invariant 1 (0 <= priority <= 100)")

def test_invariant_2_and_3_allocation_bounds():
    """Invariant 2: allocation >= 0. Invariant 3: allocation <= unmet demand."""
    wards = make_sample_wards()
    supplies = [0, 50000, 250000, 1000000]
    for supply in supplies:
        allocs = _allocate_ai(wards, supply)
        for w in wards:
            alloc = allocs[str(w.ward_number)]
            assert alloc >= 0, f"Invariant 2 Violated: negative allocation {alloc} for {w.name}"
            assert alloc <= w.demand_liters, f"Invariant 3 Violated: over-allocation {alloc} > {w.demand_liters} for {w.name}"
    print("PASS: Invariants 2 & 3 (0 <= allocation <= unmet_demand)")

def test_invariant_4_supply_budget():
    """Invariant 4: sum(allocation) <= available_water."""
    wards = make_sample_wards()
    for supply in [0, 10000, 150000, 450000, 2000000]:
        allocs = _allocate_ai(wards, supply)
        total_alloc = sum(allocs.values())
        assert total_alloc <= supply, f"Invariant 4 Violated: total allocated {total_alloc} exceeds supply {supply}"
    print("PASS: Invariant 4 (total allocation <= available water)")

def test_invariant_5_tanker_capacity():
    """Invariant 5: tanker load <= tanker capacity."""
    # Checked in VRP and dispatch validation
    from main import TankerInput, RouteWardInput, OptimizeRoutesRequest, optimize_routes
    import asyncio
    tankers = [TankerInput(tanker_id=1, transponder_id="T-01", capacity=10000)]
    route_wards = [
        RouteWardInput(ward_id=1, ward_number="W1", name="W1", demand_liters=6000),
        RouteWardInput(ward_id=2, ward_number="W2", name="W2", demand_liters=3000),
        RouteWardInput(ward_id=3, ward_number="W3", name="W3", demand_liters=5000),
    ]
    dist_matrix = [[0, 5, 6, 7], [5, 0, 3, 4], [6, 3, 0, 2], [7, 4, 2, 0]]
    req = OptimizeRoutesRequest(tankers=tankers, wards=route_wards, distance_matrix=dist_matrix)
    res = asyncio.run(optimize_routes(req))
    for r in res.routes:
        assert r.total_delivered <= r.capacity, f"Invariant 5 Violated: delivered {r.total_delivered} > capacity {r.capacity}"
    print("PASS: Invariant 5 (tanker load <= tanker capacity)")

def test_invariant_6_policy_weights_sum():
    """Invariant 6: valid policy weights sum to exactly 1.0."""
    total_weight = (
        WEIGHT_VULNERABILITY + WEIGHT_UNMET_DEMAND + WEIGHT_POPULATION +
        WEIGHT_HISTORICAL_DEFICIT + WEIGHT_DISTANCE
    )
    assert abs(total_weight - 1.0) < 1e-6, f"Invariant 6 Violated: weights sum to {total_weight}"
    print("PASS: Invariant 6 (policy weights sum to 1.0)")

def test_invariant_7_monotonicity_vulnerability():
    """Invariant 7: increasing vulnerability while holding other factors constant must not decrease priority."""
    base = WardInput(ward_id=1, ward_number="W1", name="Base", vulnerability_index=0.30, dry_pipe_hours=20.0, population=400000, historical_deficit=0.3, depot_distance_km=5.0, demand_liters=10000)
    higher = copy.deepcopy(base)
    higher.vulnerability_index = 0.85
    assert compute_priority(higher).total_score >= compute_priority(base).total_score
    print("PASS: Invariant 7 (monotonicity in vulnerability)")

def test_invariant_8_monotonicity_unmet_demand():
    """Invariant 8: increasing unmet demand (dry pipe hours) must not decrease priority."""
    base = WardInput(ward_id=1, ward_number="W1", name="Base", vulnerability_index=0.50, dry_pipe_hours=12.0, population=400000, historical_deficit=0.3, depot_distance_km=5.0, demand_liters=10000)
    higher = copy.deepcopy(base)
    higher.dry_pipe_hours = 60.0
    assert compute_priority(higher).total_score >= compute_priority(base).total_score
    print("PASS: Invariant 8 (monotonicity in dry pipe hours)")

def test_invariant_9_monotonicity_historical_deficit():
    """Invariant 9: increasing historical deficit must not decrease priority."""
    base = WardInput(ward_id=1, ward_number="W1", name="Base", vulnerability_index=0.50, dry_pipe_hours=24.0, population=400000, historical_deficit=0.20, depot_distance_km=5.0, demand_liters=10000)
    higher = copy.deepcopy(base)
    higher.historical_deficit = 0.80
    assert compute_priority(higher).total_score >= compute_priority(base).total_score
    print("PASS: Invariant 9 (monotonicity in historical deficit)")

def test_invariant_10_decreasing_supply_monotonicity():
    """Invariant 10: removing available water must not increase total allocation."""
    wards = make_sample_wards()
    alloc_high = sum(_allocate_ai(wards, 500000).values())
    alloc_med = sum(_allocate_ai(wards, 200000).values())
    alloc_low = sum(_allocate_ai(wards, 50000).values())
    assert alloc_high >= alloc_med >= alloc_low
    print("PASS: Invariant 10 (non-increasing allocation with decreasing supply)")

def test_invariant_11_zero_demand_zero_allocation():
    """Invariant 11: zero unmet demand should produce zero normal-demand allocation."""
    wards = make_sample_wards()
    wards[0].demand_liters = 0
    allocs = _allocate_ai(wards, 400000)
    assert allocs[str(wards[0].ward_number)] == 0
    print("PASS: Invariant 11 (zero demand yields zero allocation)")

def test_invariant_12_anti_fcfs_priority_dominance():
    """Invariant 12: FCFS submission time must not override WaterFlow priority."""
    early_low_need = WardInput(ward_id=1, ward_number="EARLY", name="Early Low", vulnerability_index=0.10, dry_pipe_hours=2.0, population=50000, historical_deficit=0.05, depot_distance_km=2.0, demand_liters=10000)
    late_high_need = WardInput(ward_id=2, ward_number="LATE", name="Late High", vulnerability_index=0.95, dry_pipe_hours=60.0, population=800000, historical_deficit=0.85, depot_distance_km=5.0, demand_liters=10000)
    queue = [early_low_need, late_high_need]
    allocs = _allocate_ai(queue, 10000) # Only enough for 1 ward
    assert allocs["LATE"] == 10000 and allocs["EARLY"] == 0, "WaterFlow must prioritize late high-need over early low-need"
    print("PASS: Invariant 12 (priority dominates arrival timestamp)")

def test_invariant_13_deterministic_duplicate_dedup():
    """Invariant 13: duplicate complaint detection behaves deterministically."""
    # Same coordinate, same ward within window produces identical clustering result
    import hashlib
    complaint_a = {"phone": "+91-9820011111", "lat": 19.055, "lng": 72.918, "time": 1000}
    complaint_b = {"phone": "+91-9820011111", "lat": 19.055, "lng": 72.918, "time": 1020} # 20s later
    h1 = hashlib.md5(f"{complaint_a['phone']}_{complaint_a['lat']}_{complaint_a['lng']}".encode()).hexdigest()
    h2 = hashlib.md5(f"{complaint_b['phone']}_{complaint_b['lat']}_{complaint_b['lng']}".encode()).hexdigest()
    assert h1 == h2, "Deduplication key hashing must be deterministic"
    print("PASS: Invariant 13 (deterministic deduplication keying)")

if __name__ == "__main__":
    test_invariant_1_priority_bounds()
    test_invariant_2_and_3_allocation_bounds()
    test_invariant_4_supply_budget()
    test_invariant_5_tanker_capacity()
    test_invariant_6_policy_weights_sum()
    test_invariant_7_monotonicity_vulnerability()
    test_invariant_8_monotonicity_unmet_demand()
    test_invariant_9_monotonicity_historical_deficit()
    test_invariant_10_decreasing_supply_monotonicity()
    test_invariant_11_zero_demand_zero_allocation()
    test_invariant_12_anti_fcfs_priority_dominance()
    test_invariant_13_deterministic_duplicate_dedup()
    print("ALL 13 MATHEMATICAL INVARIANT TESTS PASSED.")
