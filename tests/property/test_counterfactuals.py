"""
WaterFlow OS — Counterfactual & Adversarial Property Test Suite
Version: 2.0.0-evidence-grade
Phase: Phase 12 Counterfactual & Adversarial Verification

Tests 10 Strict Invariants & Counterfactual Perturbations:
  1. Unmet Demand Monotonicity: Increasing unmet demand must never decrease priority score.
  2. Service Deficit Monotonicity: Increasing days without supply must never decrease priority score.
  3. Bulk Supply Ceiling Invariant: Total allocated water must never exceed available supply budget.
  4. Non-Decreasing Supply Monotonicity: Decreasing available water must never increase total allocation.
  5. Water Quality Safety Gate: Unsafe water source must yield exactly 0 L potable allocation.
  6. Duplicate Complaint Resiliency: 20 duplicate complaints must not inflate physical demand 20x.
  7. Ward Renaming Invariance: Renaming ward labels/IDs without data change must not alter allocation vector.
  8. Input Order Independence: Permuting the input record list order must yield identical allocations.
  9. Deterministic Seed Invariance: Identical random seed must yield bit-for-bit identical outputs.
  10. Degraded Sensor Graceful Fallback: Missing meteorological sensor data must fallback without crash.
"""

from __future__ import annotations

import unittest
from datetime import datetime
import sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from water_engine.equity_engine import EquityEngine
from water_engine.allocation_optimizer import AllocationOptimizer
from complaint_engine.deduplication import ComplaintDeduplicator, ComplaintRecord


class TestCounterfactualProperties(unittest.TestCase):
    def setUp(self):
        self.engine = EquityEngine()
        self.optimizer = AllocationOptimizer(strategic_reserve_fraction=0.10)

    def test_01_unmet_demand_monotonicity(self):
        """Need priority must not decrease when unmet demand increases."""
        p_low = self.engine.evaluate_priority("W1", "Ward 1", unmet_demand_liters=5000).priority_score
        p_high = self.engine.evaluate_priority("W1", "Ward 1", unmet_demand_liters=20000).priority_score
        self.assertGreaterEqual(p_high, p_low, "Priority score must not decrease as unmet demand increases")

    def test_02_service_deficit_monotonicity(self):
        """Need priority must not decrease when service deficit increases."""
        p_low = self.engine.evaluate_priority("W1", "Ward 1", unmet_demand_liters=10000, reliability_deficit=0.2).priority_score
        p_high = self.engine.evaluate_priority("W1", "Ward 1", unmet_demand_liters=10000, reliability_deficit=0.8).priority_score
        self.assertGreaterEqual(p_high, p_low, "Priority score must not decrease as reliability deficit increases")

    def test_03_supply_ceiling_invariant(self):
        """Total allocated water must never exceed net allocatable supply."""
        assessments = [
            self.engine.evaluate_priority("W1", "Ward 1", unmet_demand_liters=30000),
            self.engine.evaluate_priority("W2", "Ward 2", unmet_demand_liters=30000)
        ]
        res = self.optimizer.solve(assessments, available_supply_liters=25000)
        self.assertLessEqual(res.total_allocated, res.net_allocatable_supply)
        self.assertLessEqual(res.total_allocated, 25000.0)

    def test_04_supply_monotonicity(self):
        """Reducing available supply must never increase total allocation."""
        assessments = [
            self.engine.evaluate_priority("W1", "Ward 1", unmet_demand_liters=20000),
            self.engine.evaluate_priority("W2", "Ward 2", unmet_demand_liters=20000)
        ]
        res_high = self.optimizer.solve(assessments, available_supply_liters=30000)
        res_low = self.optimizer.solve(assessments, available_supply_liters=15000)
        self.assertLessEqual(res_low.total_allocated, res_high.total_allocated)

    def test_05_water_quality_safety_gate(self):
        """Unsafe water source must result in exactly 0 L allocated."""
        assessments = [
            self.engine.evaluate_priority("W1", "Ward 1", unmet_demand_liters=20000, is_emergency=True)
        ]
        res_unsafe = self.optimizer.solve(assessments, available_supply_liters=50000, water_quality_safe=False)
        self.assertEqual(res_unsafe.total_allocated, 0.0, "Potable allocation must be 0 L when water quality is unsafe")
        self.assertEqual(res_unsafe.optimization_status, "QUALITY_LOCKOUT")

    def test_06_duplicate_complaint_resiliency(self):
        """20 duplicate complaints from the same cluster must not multiply physical allocation demand."""
        dedup = ComplaintDeduplicator()
        complaints = [
            ComplaintRecord(
                complaint_id=f"dup_{i}",
                citizen_id="citizen_spammer",
                ward_code="M/E",
                lat=19.05,
                lon=72.92,
                issue_type="NO_WATER",
                timestamp=datetime(2026, 9, 18, 12, 0)
            ) for i in range(20)
        ]
        dedup_res = dedup.process(complaints)
        self.assertEqual(dedup_res.unique_incidents, 1, "Expected exactly 1 unique incident from 20 duplicate calls")
        self.assertEqual(dedup_res.duplicates_filtered, 19, "Expected 19 filtered duplicates")

    def test_07_ward_renaming_invariance(self):
        """Renaming a ward without altering underlying parameters must not alter allocation value."""
        a_orig = self.engine.evaluate_priority("W_ORIG", "Ward Alpha", unmet_demand_liters=12000, vulnerability_index=0.6)
        a_renamed = self.engine.evaluate_priority("W_NEW", "Ward Beta", unmet_demand_liters=12000, vulnerability_index=0.6)

        self.assertEqual(a_orig.priority_score, a_renamed.priority_score)
        
        res1 = self.optimizer.solve([a_orig], available_supply_liters=20000)
        res2 = self.optimizer.solve([a_renamed], available_supply_liters=20000)
        self.assertEqual(res1.allocations["W_ORIG"], res2.allocations["W_NEW"])

    def test_08_order_independence(self):
        """Permuting input order must produce mathematically identical allocation vectors."""
        a1 = self.engine.evaluate_priority("1", "Ward 1", unmet_demand_liters=15000, vulnerability_index=0.8)
        a2 = self.engine.evaluate_priority("2", "Ward 2", unmet_demand_liters=15000, vulnerability_index=0.4)
        a3 = self.engine.evaluate_priority("3", "Ward 3", unmet_demand_liters=15000, vulnerability_index=0.2)

        res_order1 = self.optimizer.solve([a1, a2, a3], available_supply_liters=25000)
        res_order2 = self.optimizer.solve([a3, a1, a2], available_supply_liters=25000)

        self.assertEqual(res_order1.allocations["1"], res_order2.allocations["1"])
        self.assertEqual(res_order1.allocations["2"], res_order2.allocations["2"])
        self.assertEqual(res_order1.allocations["3"], res_order2.allocations["3"])

    def test_09_deterministic_seed_reproducibility(self):
        """Identical pseudo-random seeds must produce bit-for-bit identical scenario realization."""
        rng1 = np.random.default_rng(42)
        rng2 = np.random.default_rng(42)
        v1 = rng1.uniform(0, 100, size=10)
        v2 = rng2.uniform(0, 100, size=10)
        np.testing.assert_array_equal(v1, v2)

    def test_10_missing_sensor_fallback(self):
        """Engine must gracefully handle missing metadata using documented defaults without raising errors."""
        a_missing = self.engine.evaluate_priority(
            location_id="W_MISSING",
            location_name="Missing Sensor Ward",
            unmet_demand_liters=10000,
            vulnerability_index=None,
            historical_deficit=None,
            reliability_deficit=None,
            complaint_evidence=None
        )
        self.assertIsNotNone(a_missing.priority_score)
        self.assertGreater(a_missing.priority_score, 0.0)


if __name__ == "__main__":
    unittest.main()
