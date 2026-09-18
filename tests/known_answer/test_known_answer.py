#!/usr/bin/env python3
"""
Known-Answer Tests (KAT) for WaterFlow OS Priority Scoring and Allocation Engine.
Compares production engine implementation against independently hand-calculated expected values.
"""

import sys
import os

# Add ai_engine to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ai_engine")))

from main import WardInput, compute_priority, _allocate_ai, _allocate_fcfs

# Hand-calculated reference ward models
KNOWN_WARDS = [
    WardInput(
        ward_id=1,
        ward_number="W1",
        name="Ward W1 (Acute Slum Need)",
        vulnerability_index=1.0,
        dry_pipe_hours=72.0,
        population=500000,
        historical_deficit=0.80,
        depot_distance_km=10.0,
        demand_liters=30000
    ),
    WardInput(
        ward_id=2,
        ward_number="W2",
        name="Ward W2 (Dense Residential Moderate)",
        vulnerability_index=0.50,
        dry_pipe_hours=36.0,
        population=1000000,
        historical_deficit=0.40,
        depot_distance_km=4.0,
        demand_liters=25000
    ),
    WardInput(
        ward_id=3,
        ward_number="W3",
        name="Ward W3 (Suburban Peripheral)",
        vulnerability_index=0.30,
        dry_pipe_hours=18.0,
        population=200000,
        historical_deficit=0.20,
        depot_distance_km=16.0,
        demand_liters=15000
    ),
    WardInput(
        ward_id=4,
        ward_number="W4",
        name="Ward W4 (Affluent Low Outage)",
        vulnerability_index=0.10,
        dry_pipe_hours=0.0,
        population=100000,
        historical_deficit=0.0,
        depot_distance_km=2.0,
        demand_liters=5000
    )
]

# Independently hand-calculated scores:
# W1: 100 * (0.30*1.0 + 0.25*1.0 + 0.20*0.5 + 0.15*0.80 + 0.10*0.50) = 30 + 25 + 10 + 12 + 5 = 82.0
# W2: 100 * (0.30*0.5 + 0.25*0.5 + 0.20*1.0 + 0.15*0.40 + 0.10*0.20) = 15 + 12.5 + 20 + 6 + 2 = 55.5
# W3: 100 * (0.30*0.3 + 0.25*0.25 + 0.20*0.2 + 0.15*0.20 + 0.10*0.80) = 9 + 6.25 + 4 + 3 + 8 = 30.25 -> 30.2 (banker's rounding)
# W4: 100 * (0.30*0.1 + 0.25*0.0 + 0.20*0.1 + 0.15*0.0 + 0.10*0.10) = 3 + 0 + 2 + 0 + 1 = 6.0
EXPECTED_SCORES = {
    "W1": 82.0,
    "W2": 55.5,
    "W3": 30.2,
    "W4": 6.0
}

# Constrained supply of 45,000L against total demand 75,000L
# WaterFlow AI allocates by score: W1 (30k), W2 (15k remaining), W3 (0), W4 (0)
EXPECTED_ALLOCATIONS_AI = {
    "W1": 30000,
    "W2": 15000,
    "W3": 0,
    "W4": 0
}

def test_known_answer_priority_scores():
    for ward in KNOWN_WARDS:
        res = compute_priority(ward)
        expected = EXPECTED_SCORES[ward.ward_number]
        assert abs(res.total_score - expected) <= 0.1, (
            f"KAT Failed for {ward.name}: expected {expected}, got {res.total_score}"
        )
    print("PASS: Known-Answer Priority Scores match hand-calculated ground truth.")

def test_known_answer_allocations():
    total_supply = 45000
    ai_allocs = _allocate_ai(KNOWN_WARDS, total_supply)
    for w_code, expected_vol in EXPECTED_ALLOCATIONS_AI.items():
        actual_vol = ai_allocs[w_code]
        assert actual_vol == expected_vol, (
            f"KAT Allocation Failed for {w_code}: expected {expected_vol}, got {actual_vol}"
        )
    assert sum(ai_allocs.values()) == total_supply, "Total allocation must exactly equal supply budget"
    print("PASS: Known-Answer Allocations match constrained ground truth.")

def test_known_answer_anti_fcfs_inversion():
    """Verify that FCFS in arrival order (where affluent W4 submits first) starves the most vulnerable ward, proving WaterFlow's equity guarantee."""
    total_supply = 45000
    # In FCFS arrival sequence: W4 requests first (id=1), followed by W3 (id=2), W2 (id=3), and vulnerable W1 requests last (id=4)
    fcfs_submission_sequence = [
        WardInput(ward_id=1, ward_number="W4", name="Ward W4 (Affluent Early Applicant)", demand_liters=5000, vulnerability_index=0.10, dry_pipe_hours=0.0, population=100000, depot_distance_km=2.0),
        WardInput(ward_id=2, ward_number="W3", name="Ward W3 (Suburban Second Applicant)", demand_liters=15000, vulnerability_index=0.30, dry_pipe_hours=18.0, population=200000, depot_distance_km=16.0),
        WardInput(ward_id=3, ward_number="W2", name="Ward W2 (Dense Third Applicant)", demand_liters=25000, vulnerability_index=0.50, dry_pipe_hours=36.0, population=1000000, depot_distance_km=4.0),
        WardInput(ward_id=4, ward_number="W1", name="Ward W1 (Vulnerable Late Applicant)", demand_liters=30000, vulnerability_index=1.0, dry_pipe_hours=72.0, population=500000, depot_distance_km=10.0),
    ]

    # FCFS allocates by arrival order (ward_id 1..4)
    fcfs_allocs = _allocate_fcfs(fcfs_submission_sequence, total_supply)
    # Under FCFS, W4 gets 5k, W3 gets 15k, W2 gets 25k, W1 (highest need) gets 0!
    assert fcfs_allocs["W1"] == 0, f"FCFS was expected to starve W1, but gave: {fcfs_allocs['W1']}"
    assert fcfs_allocs["W4"] == 5000, f"FCFS was expected to fully serve W4, got {fcfs_allocs['W4']}"

    # WaterFlow AI overrides submission order and allocates by multi-criteria need
    ai_allocs = _allocate_ai(fcfs_submission_sequence, total_supply)
    assert ai_allocs["W1"] == 30000, f"WaterFlow AI must protect W1, got {ai_allocs['W1']}"
    assert ai_allocs["W4"] == 0, f"WaterFlow AI must defer affluent W4 during severe shortage, got {ai_allocs['W4']}"

    print("PASS: Anti-FCFS inversion test confirms vulnerable protection under WaterFlow.")

if __name__ == "__main__":
    test_known_answer_priority_scores()
    test_known_answer_allocations()
    test_known_answer_anti_fcfs_inversion()
    print("ALL KNOWN-ANSWER TESTS PASSED.")
