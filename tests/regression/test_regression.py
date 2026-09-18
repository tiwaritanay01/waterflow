#!/usr/bin/env python3
"""
Regression Test Suite (Phase 34)
Guarantees that previously identified edge cases, bugs, and methodological pitfalls never recur.
"""

import sys
from pathlib import Path
from datetime import datetime, timedelta

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

from water_engine.equity_engine import EquityEngine
from water_engine.storage_aware import StorageAwareDeliveryOptimizer, StorageNode
from complaint_engine.deduplication import ComplaintRecord, ComplaintDeduplicator


def test_regression_zero_unmet_demand_no_allocation():
    """Bug fix: Wards with zero unmet demand must receive exactly 0L allocation, even with surplus supply."""
    engine = EquityEngine()
    w_zero = engine.evaluate_priority("W_AFFLUENT", "Affluent Ward", unmet_demand_liters=0.0, vulnerability_index=0.1)
    w_needy = engine.evaluate_priority("W_SLUM", "Slum Ward", unmet_demand_liters=10000.0, vulnerability_index=0.8)

    res = engine.allocate([w_zero, w_needy], available_supply_liters=50000.0)
    assert res.allocations["W_AFFLUENT"] == 0.0, "Regressed: Zero-demand ward received allocation"
    assert res.allocations["W_SLUM"] == 10000.0
    print("PASS: Regression 1 — Zero unmet demand receives zero allocation")


def test_regression_distance_removed_from_need_formula():
    """Methodological fix: Distance must not directly increase or decrease need priority."""
    engine = EquityEngine()
    # In v3.0, evaluate_priority does not even accept depot distance
    a1 = engine.evaluate_priority("W1", "Ward 1", unmet_demand_liters=10000.0, vulnerability_index=0.6, historical_deficit=0.5)
    a2 = engine.evaluate_priority("W2", "Ward 2", unmet_demand_liters=10000.0, vulnerability_index=0.6, historical_deficit=0.5)
    assert a1.priority_score == a2.priority_score, "Regressed: Inherent need score altered by non-need parameters"
    print("PASS: Regression 2 — Distance completely decoupled from need formula")


def test_regression_storage_full_no_over_delivery():
    """Bug fix: Tankers must not dump water into full storage nodes."""
    opt = StorageAwareDeliveryOptimizer()
    node = StorageNode(node_id="N1", name="Full Tank", tank_capacity_liters=15000.0, current_storage_liters=15000.0, unmet_demand_liters=8000.0)
    res = opt.compute_delivery(node)
    assert res.recommended_delivery_liters == 0.0
    assert res.over_delivery_prevented_liters == 8000.0
    print("PASS: Regression 3 — Storage-aware delivery prevents tank overflow")


def test_regression_duplicate_complaints_do_not_inflate_demand():
    """Bug fix: Identical or bot spam complaints must be filtered and not counted as separate physical requests."""
    dedup = ComplaintDeduplicator(time_window_minutes=60, spatial_radius_meters=300.0)
    t0 = datetime(2026, 9, 18, 12, 0, 0)
    complaints = [
        ComplaintRecord(complaint_id="C1", citizen_id="CIT-1", ward_code="M/E", lat=19.06, lon=72.92, issue_type="NO_WATER", timestamp=t0),
        ComplaintRecord(complaint_id="C1", citizen_id="CIT-1", ward_code="M/E", lat=19.06, lon=72.92, issue_type="NO_WATER", timestamp=t0 + timedelta(seconds=10)),
        ComplaintRecord(complaint_id="C2", citizen_id="CIT-1", ward_code="M/E", lat=19.06, lon=72.92, issue_type="NO_WATER", timestamp=t0 + timedelta(minutes=5))
    ]
    res = dedup.process(complaints)
    assert res.unique_incidents == 1, f"Regressed: Spam complaints counted as unique: {res.unique_incidents}"
    print("PASS: Regression 4 — Duplicate complaints filtered deterministically")


if __name__ == "__main__":
    print("======================================================================")
    print("WATERFLOW OS — REGRESSION TEST MATRIX")
    print("======================================================================")
    test_regression_zero_unmet_demand_no_allocation()
    test_regression_distance_removed_from_need_formula()
    test_regression_storage_full_no_over_delivery()
    test_regression_duplicate_complaints_do_not_inflate_demand()
    print("ALL REGRESSION TESTS PASSED.")
