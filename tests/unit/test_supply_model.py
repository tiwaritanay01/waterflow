"""
WaterFlow OS — Supply Model Unit Tests (Phase 5)
================================================
Unit tests verifying the mass-balance calculations, physical constraints,
NRW loss deductions, and bottleneck detection across all supply stages.
"""

import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

from water_engine.supply_model import SupplyParameters, compute_water_supply_balance


class TestSupplyModelUnit(unittest.TestCase):

    def test_baseline_balance(self):
        """Test standard baseline municipal supply calculations."""
        res = compute_water_supply_balance(SupplyParameters())
        
        # Invariant 1: raw_source >= treatable >= treated >= transmission >= distribution >= usable
        self.assertGreaterEqual(res.raw_source_water_mld, res.treatable_water_mld)
        self.assertGreaterEqual(res.treatable_water_mld, res.treated_water_mld)
        self.assertGreaterEqual(res.treated_water_mld, res.transmission_water_mld)
        self.assertGreaterEqual(res.transmission_water_mld, res.distribution_water_mld)
        self.assertGreater(res.usable_potable_water_mld, 0.0)
        self.assertGreater(res.daily_relief_water_budget_liters, 0)

    def test_treatment_bottleneck(self):
        """Test when treatment plant filtration capacity restricts higher raw lake inflows."""
        params = SupplyParameters(
            daily_draw_rate_mld=5000.0,
            catchment_inflow_mld=1000.0,
            bhandup_treatment_capacity_mld=1500.0,
            panjrapur_treatment_capacity_mld=1000.0
        )
        res = compute_water_supply_balance(params)
        
        # Raw source is 5850 MLD, but treatment capacity is only 2500 MLD
        self.assertEqual(res.treatable_water_mld, 2500.0)
        self.assertIn("TREATMENT_CAPACITY_LIMIT", res.active_constraints)

    def test_trunk_burst_transmission_drop(self):
        """Test transmission capacity reduction caused by a major trunk main rupture."""
        params = SupplyParameters(
            transmission_conduit_capacity_mld=4000.0,
            trunk_burst_isolation_mld=1500.0  # 1500 MLD conduit isolated
        )
        res = compute_water_supply_balance(params)
        
        self.assertLessEqual(res.transmission_water_mld, 2500.0)
        self.assertIn("TRANSMISSION_CONDUIT_LIMIT", res.active_constraints)

    def test_pumping_power_failure(self):
        """Test booster pumping station grid power failure dropping throughput to 30%."""
        params = SupplyParameters(
            booster_pumping_capacity_mld=4000.0,
            pumping_power_available=False
        )
        res = compute_water_supply_balance(params)
        
        # Throughput reduced to 30% of 4000 = 1200 MLD
        self.assertLessEqual(res.distribution_water_mld, 1200.0)
        self.assertIn("PUMPING_STATION_POWER_OUTAGE", res.active_constraints)

    def test_severe_drought_lake_shortage(self):
        """Test physical behavior when lake reservoirs drop to critical minimums."""
        params = SupplyParameters(
            total_lake_storage_ml=50000.0,  # Extreme shortage (< 5% of capacity)
            daily_draw_rate_mld=2000.0
        )
        res = compute_water_supply_balance(params)
        
        # Raw draw is severely curtailed by low reservoir head
        self.assertLess(res.usable_potable_water_mld, 2000.0)
        self.assertGreater(res.usable_potable_water_mld, 0.0)


if __name__ == "__main__":
    unittest.main()
