#!/usr/bin/env python3
"""
Known-Answer Tests (KAT) for WaterFlow OS v3.0 Decoupled Equity Allocation Model
Phase 8 & 32 Validation
Compares EquityEngine output against hand-calculated ground truth.
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

from water_engine.equity_engine import EquityEngine

EXPECTED_KAT_SCORES = {
    "KAT-1": 92.0,  # 25 + 25 + 16 + 6 + 10 + 10 = 92.0
    "KAT-2": 30.5,  # 10 + 12.5 + 6 + 2 + 0 + 0 = 30.5
    "KAT-3": 7.5,   # 2.5 + 5.0 + 0 + 0 + 0 + 0 = 7.5
}


def test_v3_equity_known_answers():
    engine = EquityEngine()

    # Case 1: Acute Slum with Contamination & Hospital Emergency
    w1 = engine.evaluate_priority(
        location_id="KAT-1",
        location_name="Ward KAT-1 (Acute Slum & Lifeline)",
        unmet_demand_liters=25000.0,
        vulnerability_index=1.0,
        historical_deficit=0.80,
        reliability_deficit=0.60,
        complaint_evidence=10.0,
        critical_facility=1.0
    )
    assert abs(w1.priority_score - EXPECTED_KAT_SCORES["KAT-1"]) <= 0.05, f"KAT-1 failed: got {w1.priority_score}"

    # Case 2: Moderate Residential, Zero Complaint, Zero Facility
    w2 = engine.evaluate_priority(
        location_id="KAT-2",
        location_name="Ward KAT-2 (Moderate Mixed)",
        unmet_demand_liters=12500.0,
        vulnerability_index=0.40,
        historical_deficit=0.30,
        reliability_deficit=0.20,
        complaint_evidence=0.0,
        critical_facility=0.0
    )
    assert abs(w2.priority_score - EXPECTED_KAT_SCORES["KAT-2"]) <= 0.05, f"KAT-2 failed: got {w2.priority_score}"

    # Case 3: Affluent Planned Ward, Zero Deficit
    w3 = engine.evaluate_priority(
        location_id="KAT-3",
        location_name="Ward KAT-3 (Affluent Low Outage)",
        unmet_demand_liters=5000.0,
        vulnerability_index=0.10,
        historical_deficit=0.0,
        reliability_deficit=0.0,
        complaint_evidence=0.0,
        critical_facility=0.0
    )
    assert abs(w3.priority_score - EXPECTED_KAT_SCORES["KAT-3"]) <= 0.05, f"KAT-3 failed: got {w3.priority_score}"

    print("PASS: Hand-calculated known-answer test cases match v3.0 equity engine ground truth.")


def test_v3_constrained_allocation_known_answer():
    engine = EquityEngine()

    w1 = engine.evaluate_priority("KAT-1", "Ward 1", unmet_demand_liters=25000.0, vulnerability_index=1.0, historical_deficit=0.8, reliability_deficit=0.6, complaint_evidence=10.0, critical_facility=1.0)
    w2 = engine.evaluate_priority("KAT-2", "Ward 2", unmet_demand_liters=12500.0, vulnerability_index=0.4, historical_deficit=0.3, reliability_deficit=0.2, complaint_evidence=0.0, critical_facility=0.0)
    w3 = engine.evaluate_priority("KAT-3", "Ward 3", unmet_demand_liters=5000.0, vulnerability_index=0.1, historical_deficit=0.0, reliability_deficit=0.0, complaint_evidence=0.0, critical_facility=0.0)

    # Supply = 30,000L against 42,500L total demand
    # KAT-1 (score 92.0) receives full 25,000L.
    # Remaining 5,000L goes to KAT-2 (score 30.5).
    # KAT-3 (score 7.5) receives 0L.
    res = engine.allocate([w1, w2, w3], available_supply_liters=30000.0)
    assert res.allocations["KAT-1"] == 25000.0
    assert res.allocations["KAT-2"] == 5000.0
    assert res.allocations["KAT-3"] == 0.0
    assert res.total_allocated == 30000.0
    print("PASS: Constrained allocation known-answer match ground truth.")


if __name__ == "__main__":
    print("======================================================================")
    print("WATERFLOW OS — V3.0 EQUITY KNOWN-ANSWER TESTS")
    print("======================================================================")
    test_v3_equity_known_answers()
    test_v3_constrained_allocation_known_answer()
    print("ALL V3.0 KNOWN-ANSWER TESTS PASSED.")
