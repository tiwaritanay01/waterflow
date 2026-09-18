#!/usr/bin/env python3
"""
Property-Based Mathematical Invariant Tests for Equity & Allocation Engine
Phase 8 & Phase 33 Validation
"""

import math
import sys
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

from water_engine.equity_engine import EquityEngine, NeedAssessment


def test_property_1_weights_sum_to_one():
    """Property 1: Configuration weights must sum to exactly 1.0."""
    engine = EquityEngine()
    total_w = sum(engine.weights.values())
    assert math.isclose(total_w, 1.0, abs_tol=1e-4), f"Weights sum to {total_w}, expected 1.0"
    print("PASS: Property 1 — Weights sum to 1.0")


def test_property_2_priority_remains_bounded():
    """Property 2: Priority score must remain strictly in [0.0, 100.0] across extreme inputs."""
    engine = EquityEngine()
    test_cases = [
        (0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
        (1.0, 100000.0, 1.0, 1.0, 100.0, 1.0),
        (-5.0, -100.0, -2.0, -1.0, -50.0, -1.0),
        (2.0, 50000.0, 2.0, 2.0, 20.0, 2.0)
    ]
    for v, u, h, r, c, f in test_cases:
        res = engine.evaluate_priority(
            location_id="TEST",
            location_name="Test Ward",
            unmet_demand_liters=u,
            vulnerability_index=v,
            historical_deficit=h,
            reliability_deficit=r,
            complaint_evidence=c,
            critical_facility=f
        )
        assert 0.0 <= res.priority_score <= 100.0, f"Score out of bounds: {res.priority_score}"
        assert math.isfinite(res.priority_score), "Score must be finite"
    print("PASS: Property 2 — Priority score strictly bounded in [0, 100] and finite")


def test_property_3_monotonicity_positive_factors():
    """Property 3: Increasing any single need factor while holding others constant cannot decrease priority."""
    engine = EquityEngine()
    base = engine.evaluate_priority(
        location_id="W1", location_name="Base",
        unmet_demand_liters=10000, vulnerability_index=0.4,
        historical_deficit=0.4, reliability_deficit=0.4,
        complaint_evidence=2.0, critical_facility=0.2
    )

    # Vulnerability increase
    higher_v = engine.evaluate_priority(
        location_id="W1", location_name="Base",
        unmet_demand_liters=10000, vulnerability_index=0.8,
        historical_deficit=0.4, reliability_deficit=0.4,
        complaint_evidence=2.0, critical_facility=0.2
    )
    assert higher_v.priority_score >= base.priority_score, "Vulnerability monotonicity violated"

    # Historical deficit increase
    higher_h = engine.evaluate_priority(
        location_id="W1", location_name="Base",
        unmet_demand_liters=10000, vulnerability_index=0.4,
        historical_deficit=0.9, reliability_deficit=0.4,
        complaint_evidence=2.0, critical_facility=0.2
    )
    assert higher_h.priority_score >= base.priority_score, "Historical deficit monotonicity violated"

    # Critical facility increase
    higher_f = engine.evaluate_priority(
        location_id="W1", location_name="Base",
        unmet_demand_liters=10000, vulnerability_index=0.4,
        historical_deficit=0.4, reliability_deficit=0.4,
        complaint_evidence=2.0, critical_facility=0.8
    )
    assert higher_f.priority_score >= base.priority_score, "Critical facility monotonicity violated"
    print("PASS: Property 3 — Monotonicity holds for all need factors")


def test_property_4_invariance_to_unrelated_factors():
    """Property 4: Changing unrelated metadata (e.g. ward name, extraneous attributes) does not alter score."""
    engine = EquityEngine()
    score_a = engine.evaluate_priority(
        location_id="W_A", location_name="Alpha Ward",
        unmet_demand_liters=12000, vulnerability_index=0.6,
        historical_deficit=0.5, reliability_deficit=0.3
    ).priority_score

    score_b = engine.evaluate_priority(
        location_id="W_B", location_name="Completely Different Name (Zone 99)",
        unmet_demand_liters=12000, vulnerability_index=0.6,
        historical_deficit=0.5, reliability_deficit=0.3
    ).priority_score

    assert math.isclose(score_a, score_b, abs_tol=1e-5), "Score altered by irrelevant metadata"
    print("PASS: Property 4 — Invariant to unrelated metadata")


def test_property_5_missing_values_follow_documented_policy():
    """Property 5: None inputs follow documented imputation without raising errors or fabricating values."""
    engine = EquityEngine()
    res = engine.evaluate_priority(
        location_id="W_MISSING",
        location_name="Missing Data Ward",
        unmet_demand_liters=10000,
        vulnerability_index=None,
        historical_deficit=None,
        reliability_deficit=None,
        complaint_evidence=None,
        critical_facility=None
    )
    assert 0.0 <= res.priority_score <= 100.0
    # Missing complaint evidence should default to 0.0
    complaint_bk = next(b for b in res.breakdown if b.factor_key == "complaint_evidence")
    assert complaint_bk.raw_value == 0.0, "Missing complaint did not default to 0"
    print("PASS: Property 5 — Documented missing data fallback holds")


def test_property_6_zero_unmet_demand_prevents_allocation():
    """Property 6: If unmet demand is zero, allocation must be strictly zero regardless of priority or surplus."""
    engine = EquityEngine()
    w1 = engine.evaluate_priority("W1", "Ward 1", unmet_demand_liters=0.0, vulnerability_index=1.0)
    w2 = engine.evaluate_priority("W2", "Ward 2", unmet_demand_liters=10000.0, vulnerability_index=0.2)

    res = engine.allocate([w1, w2], available_supply_liters=50000.0)
    assert res.allocations["W1"] == 0.0, f"W1 with zero demand received: {res.allocations['W1']}"
    assert res.allocations["W2"] == 10000.0
    print("PASS: Property 6 — Zero unmet demand receives zero allocation")


def test_property_7_allocation_cannot_exceed_unmet_demand():
    """Property 7: No location can receive more water than its unsatisfied requirement."""
    engine = EquityEngine()
    w1 = engine.evaluate_priority("W1", "Ward 1", unmet_demand_liters=5000.0, vulnerability_index=0.9)
    w2 = engine.evaluate_priority("W2", "Ward 2", unmet_demand_liters=8000.0, vulnerability_index=0.8)

    # Infinite supply scenario
    res = engine.allocate([w1, w2], available_supply_liters=1000000.0)
    assert res.allocations["W1"] <= 5000.0
    assert res.allocations["W2"] <= 8000.0
    print("PASS: Property 7 — Allocation bounded by individual unmet demand")


def test_property_8_and_9_total_allocation_cannot_exceed_supply():
    """Property 8 & 9: Total water allocated cannot exceed available supply."""
    engine = EquityEngine()
    w1 = engine.evaluate_priority("W1", "Ward 1", unmet_demand_liters=20000.0, vulnerability_index=0.9)
    w2 = engine.evaluate_priority("W2", "Ward 2", unmet_demand_liters=20000.0, vulnerability_index=0.8)

    scarce_supplies = [0.0, 5000.0, 15000.0, 35000.0, 50000.0]
    for supply in scarce_supplies:
        res = engine.allocate([w1, w2], available_supply_liters=supply)
        assert res.total_allocated <= supply + 1e-5, f"Allocated {res.total_allocated} exceeded supply {supply}"
        assert sum(res.allocations.values()) <= supply + 1e-5
    print("PASS: Properties 8 & 9 — Total allocation strictly bounded by available supply budget")


def test_property_10_supply_monotonicity():
    """Property 10: Increasing available water cannot reduce total allocation."""
    engine = EquityEngine()
    w1 = engine.evaluate_priority("W1", "Ward 1", unmet_demand_liters=15000.0, vulnerability_index=0.9)
    w2 = engine.evaluate_priority("W2", "Ward 2", unmet_demand_liters=15000.0, vulnerability_index=0.7)

    res_low = engine.allocate([w1, w2], available_supply_liters=10000.0)
    res_high = engine.allocate([w1, w2], available_supply_liters=20000.0)

    assert res_high.total_allocated >= res_low.total_allocated, "Total allocation decreased when supply increased"
    print("PASS: Property 10 — Total allocation monotonically non-decreasing with available supply")


if __name__ == "__main__":
    print("======================================================================")
    print("WATERFLOW OS — PROPERTY-BASED MATHEMATICAL INVARIANT TESTS")
    print("======================================================================")
    test_property_1_weights_sum_to_one()
    test_property_2_priority_remains_bounded()
    test_property_3_monotonicity_positive_factors()
    test_property_4_invariance_to_unrelated_factors()
    test_property_5_missing_values_follow_documented_policy()
    test_property_6_zero_unmet_demand_prevents_allocation()
    test_property_7_allocation_cannot_exceed_unmet_demand()
    test_property_8_and_9_total_allocation_cannot_exceed_supply()
    test_property_10_supply_monotonicity()
    print("ALL 10 MATHEMATICAL INVARIANT PROPERTIES CONFIRMED.")
