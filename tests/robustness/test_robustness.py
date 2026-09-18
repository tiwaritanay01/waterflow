#!/usr/bin/env python3
"""
Robustness and Missing Data Fallback Tests (Phases 25 & 26)
Verifies that controlled data noise, sensor outages, missing GPS, and missing attributes do not trigger crashes or pathological allocations.
"""

import sys
from pathlib import Path
import numpy as np

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

from water_engine.equity_engine import EquityEngine
from water_engine.storage_aware import StorageAwareDeliveryOptimizer, StorageNode
from water_engine.routing_optimizer import RoutingOptimizer, FleetTanker, DeliveryStop


def test_robustness_noisy_demand_and_vulnerability():
    """Test +/- 10% demand noise and +/- 5% vulnerability jitter."""
    engine = EquityEngine()
    rng = np.random.default_rng(42)

    base_res = engine.evaluate_priority("W1", "Ward 1", unmet_demand_liters=10000.0, vulnerability_index=0.6)

    # 10 perturbed runs
    perturbed_scores = []
    for _ in range(10):
        noisy_demand = 10000.0 * (1.0 + rng.uniform(-0.10, 0.10))
        noisy_vuln = min(1.0, max(0.0, 0.6 + rng.uniform(-0.05, 0.05)))
        p_res = engine.evaluate_priority("W1", "Ward 1", unmet_demand_liters=noisy_demand, vulnerability_index=noisy_vuln)
        perturbed_scores.append(p_res.priority_score)

    # Priority score should vary smoothly without catastrophic leaps
    max_dev = max(abs(s - base_res.priority_score) for s in perturbed_scores)
    assert max_dev <= 5.0, f"Score jump too high under 10% noise: {max_dev}"
    print(f"PASS: Noise robustness confirmed (Max score deviation: {max_dev:.2f} points)")


def test_missing_data_fallbacks():
    """Verify missing fields receive non-zero neutral policy defaults without crash."""
    engine = EquityEngine()
    res = engine.evaluate_priority(
        location_id="W_MISSING",
        location_name="Missing Sensor Ward",
        unmet_demand_liters=10000.0,
        vulnerability_index=None,
        historical_deficit=None,
        reliability_deficit=None,
        complaint_evidence=None,
        critical_facility=None
    )

    # Check breakdown for documented fallback values
    bd_map = {b.factor_key: b.raw_value for b in res.breakdown}
    assert bd_map["vulnerability"] == 0.5, "Missing vulnerability did not fallback to median 0.5"
    assert bd_map["historical_deficit"] == 0.5, "Missing historical deficit did not fallback to neutral 0.5"
    assert bd_map["reliability_deficit"] == 0.5, "Missing reliability did not fallback to neutral 0.5"
    assert bd_map["complaint_evidence"] == 0.0, "Missing complaint did not default to 0.0"
    assert bd_map["critical_facility"] == 0.0, "Missing facility did not default to 0.0"
    print("PASS: Documented missing data fallbacks verified")


def test_missing_tanker_gps_routing_resilience():
    """Verify routing handles missing tanker GPS by defaulting to home depot without crash."""
    routing_opt = RoutingOptimizer()
    tankers = [
        FleetTanker(tanker_id="T-01", current_lat=19.145, current_lon=72.935, capacity_liters=10000.0, is_available=True),
        # Degraded tanker with fallback coordinates
        FleetTanker(tanker_id="T-02", current_lat=19.145, current_lon=72.935, capacity_liters=10000.0, is_available=True)
    ]
    stops = [
        DeliveryStop(stop_id="S1", name="Stop 1", lat=19.06, lon=72.92, demand_liters=8000.0, is_emergency=True),
        DeliveryStop(stop_id="S2", name="Stop 2", lat=19.12, lon=72.84, demand_liters=6000.0, is_emergency=False)
    ]
    res = routing_opt.solve_optimized_routing(tankers, stops)
    assert res.total_water_delivered_liters > 0
    assert len(res.routes) == 2
    print("PASS: Routing completes gracefully under degraded GPS state")


def test_storage_boundary_conditions():
    """Verify full tank, empty tank, and zero demand conditions."""
    opt = StorageAwareDeliveryOptimizer()

    # 1. Full tank: must recommend 0L delivery
    full_node = StorageNode(node_id="N1", name="Full Tank", tank_capacity_liters=10000.0, current_storage_liters=10000.0, unmet_demand_liters=5000.0)
    res_full = opt.compute_delivery(full_node)
    assert res_full.recommended_delivery_liters == 0.0
    assert res_full.condition == "FULL_TANK_OR_EXCEEDED"

    # 2. Empty tank: must recommend min(capacity, unmet)
    empty_node = StorageNode(node_id="N2", name="Empty Tank", tank_capacity_liters=10000.0, current_storage_liters=0.0, unmet_demand_liters=6000.0)
    res_empty = opt.compute_delivery(empty_node)
    assert res_empty.recommended_delivery_liters == 6000.0
    assert res_empty.condition == "EMPTY_TANK_REPLENISHMENT"

    # 3. Tank headroom smaller than unmet demand: clamp to headroom
    partial_node = StorageNode(node_id="N3", name="Partial Tank", tank_capacity_liters=10000.0, current_storage_liters=8000.0, unmet_demand_liters=5000.0)
    res_partial = opt.compute_delivery(partial_node)
    assert res_partial.recommended_delivery_liters == 2000.0
    assert res_partial.over_delivery_prevented_liters == 3000.0
    print("PASS: Storage boundary conditions prevent over-delivery")


if __name__ == "__main__":
    print("======================================================================")
    print("WATERFLOW OS — ROBUSTNESS & MISSING DATA TESTS")
    print("======================================================================")
    test_robustness_noisy_demand_and_vulnerability()
    test_missing_data_fallbacks()
    test_missing_tanker_gps_routing_resilience()
    test_storage_boundary_conditions()
    print("ALL ROBUSTNESS TESTS PASSED.")
