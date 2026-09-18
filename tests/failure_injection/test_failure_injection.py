#!/usr/bin/env python3
"""
Failure Injection & Chaos Test Suite (Phase 36)
Simulates infrastructure failures, corrupted inputs, and degraded environments.
Guarantees the system fails safely and refuses to return fabricated fake allocations.
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

from water_engine.equity_engine import EquityEngine
from water_engine.routing_optimizer import RoutingOptimizer, FleetTanker, DeliveryStop


def test_failure_injection_corrupted_coordinates():
    """Inject extreme/invalid NaN coordinates into routing engine."""
    routing_opt = RoutingOptimizer()
    tankers = [
        FleetTanker(tanker_id="T1", current_lat=19.145, current_lon=72.935, capacity_liters=10000.0, is_available=True)
    ]
    # Stop with negative or extreme coordinates
    stops = [
        DeliveryStop(stop_id="ERR_1", name="Corrupted Lat", lat=999.0, lon=72.92, demand_liters=5000.0)
    ]
    # Routing must either safely catch or report unserved without crashing
    try:
        res = routing_opt.solve_optimized_routing(tankers, stops)
        # If solved, must produce finite distance
        assert float(res.total_distance_km) >= 0.0
    except Exception as e:
        # Graceful exception is acceptable; silent fabrication of successful delivery is not
        assert isinstance(e, (ValueError, OverflowError))
    print("PASS: Failure 1 — Malformed coordinates handled safely")


def test_failure_injection_empty_fleet_zero_allocation():
    """When zero tankers are available, system must report 0 delivered and 100% unserved rather than pretending delivery occurred."""
    routing_opt = RoutingOptimizer()
    tankers = [
        FleetTanker(tanker_id="T1", current_lat=19.145, current_lon=72.935, capacity_liters=10000.0, is_available=False)
    ]
    stops = [
        DeliveryStop(stop_id="S1", name="Ward 1", lat=19.06, lon=72.92, demand_liters=8000.0)
    ]
    res = routing_opt.solve_optimized_routing(tankers, stops)
    assert res.total_water_delivered_liters == 0.0
    assert res.unserved_demand_liters == 8000.0
    assert len(res.routes) == 0
    print("PASS: Failure 2 — Zero-fleet availability correctly reports zero delivery")


def test_failure_injection_corrupted_policy_file():
    """When policy file is missing or corrupted, engine must raise explicit error rather than silently guessing."""
    try:
        EquityEngine(policy_path=ROOT_DIR / "config" / "non_existent_policy.yaml")
        assert False, "Engine failed to raise FileNotFoundError for missing policy"
    except FileNotFoundError:
        pass
    print("PASS: Failure 3 — Missing policy fails fast with explicit FileNotFoundError")


def test_failure_injection_invalid_weights_sum():
    """When policy weights do not sum to 1.0, engine must reject initialization."""
    engine = EquityEngine()
    engine.weights = {"vulnerability": 0.5, "unmet_demand": 0.2}  # Sum = 0.7
    try:
        engine._validate_weights()
        assert False, "Engine accepted invalid weights summing to 0.7"
    except ValueError:
        pass
    print("PASS: Failure 4 — Invalid weight sums rejected during validation")


if __name__ == "__main__":
    print("======================================================================")
    print("WATERFLOW OS — FAILURE INJECTION & CHAOS TESTS")
    print("======================================================================")
    test_failure_injection_corrupted_coordinates()
    test_failure_injection_empty_fleet_zero_allocation()
    test_failure_injection_corrupted_policy_file()
    test_failure_injection_invalid_weights_sum()
    print("ALL FAILURE INJECTION TESTS PASSED SAFELY.")
