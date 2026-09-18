"""
WaterFlow OS — Supply Model Known-Answer Tests (KAT) (Phase 5)
==============================================================
Validates the supply model against hand-calculated reference solutions.
"""

import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

from water_engine.supply_model import SupplyParameters, compute_water_supply_balance


class TestSupplyKnownAnswers(unittest.TestCase):

    def test_known_case_1_standard_baseline(self):
        """
        Hand-calculated Case 1: Standard Baseline
        Raw Draw = 3,950 MLD
        Treatment Cap = 2,810 + 1,365 = 4,175 MLD (Capacity exceeds raw draw)
        Treatable = 3,950.0 MLD
        Backwash Loss (2.5%) = 3,950 * 0.025 = 98.75 MLD
        Treated = 3,851.25 MLD
        Transmission = 3,851.25 MLD (Cap 4,200)
        Distribution = 3,851.25 MLD (Storage 4,500, Pumping 4,300)
        NRW Losses (28%) = 3,851.25 * 0.28 = 1,078.35 MLD
        Net Potable = 2,772.90 MLD
        Reserve (5%) = 2,772.90 * 0.05 = 138.645 MLD
        Usable Potable = 2,634.255 MLD -> rounded 2,634.26 MLD
        """
        params = SupplyParameters(
            daily_draw_rate_mld=3950.0,
            catchment_inflow_mld=0.0,
            environmental_release_mld=0.0,
            bhandup_treatment_capacity_mld=2810.0,
            panjrapur_treatment_capacity_mld=1365.0,
            treatment_backwash_loss_pct=2.5,
            transmission_conduit_capacity_mld=4200.0,
            mbr_storage_capacity_mld=4500.0,
            booster_pumping_capacity_mld=4300.0,
            nrw_loss_fraction=0.28,
            emergency_reserve_fraction=0.05
        )
        res = compute_water_supply_balance(params)
        
        self.assertAlmostEqual(res.raw_source_water_mld, 3950.00, places=2)
        self.assertAlmostEqual(res.treatable_water_mld, 3950.00, places=2)
        self.assertAlmostEqual(res.treated_water_mld, 3851.25, places=2)
        self.assertAlmostEqual(res.transmission_water_mld, 3851.25, places=2)
        self.assertAlmostEqual(res.distribution_water_mld, 3851.25, places=2)
        self.assertAlmostEqual(res.losses_nrw_mld, 1078.35, places=2)
        self.assertAlmostEqual(res.net_potable_water_mld, 2772.90, places=2)
        self.assertAlmostEqual(res.emergency_reserve_mld, 138.64, places=2)
        self.assertAlmostEqual(res.usable_potable_water_mld, 2634.25, places=2)

    def test_known_case_2_treatment_bottleneck(self):
        """
        Hand-calculated Case 2: Severe Treatment Restriction (Filtration Bottleneck)
        Raw Draw = 3,500 MLD
        Total Treatment Cap = 2,000 MLD (Bhandup 1,200 + Panjrapur 800)
        Treatable = 2,000.0 MLD
        Treated (2.5% loss) = 2,000 * 0.975 = 1,950.0 MLD
        Distribution = 1,950.0 MLD
        NRW Losses (25%) = 1,950 * 0.25 = 487.50 MLD
        Net Potable = 1,462.50 MLD
        Reserve (10%) = 1,462.50 * 0.10 = 146.25 MLD
        Usable Potable = 1,316.25 MLD
        """
        params = SupplyParameters(
            daily_draw_rate_mld=3500.0,
            catchment_inflow_mld=0.0,
            environmental_release_mld=0.0,
            bhandup_treatment_capacity_mld=1200.0,
            panjrapur_treatment_capacity_mld=800.0,
            treatment_backwash_loss_pct=2.5,
            nrw_loss_fraction=0.25,
            emergency_reserve_fraction=0.10
        )
        res = compute_water_supply_balance(params)
        
        self.assertAlmostEqual(res.treatable_water_mld, 2000.00, places=2)
        self.assertAlmostEqual(res.treated_water_mld, 1950.00, places=2)
        self.assertAlmostEqual(res.losses_nrw_mld, 487.50, places=2)
        self.assertAlmostEqual(res.usable_potable_water_mld, 1316.25, places=2)
        self.assertEqual(res.bottleneck_stage, "TREATMENT")


if __name__ == "__main__":
    unittest.main()
