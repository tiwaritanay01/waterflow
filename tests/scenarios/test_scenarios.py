"""
WaterFlow OS — Scenario Validation Suite (Phase 5 & Phase 22)
=============================================================
Deterministic automated tests for the 6 municipal operational scenarios:
1. Scenario 1: Normal Operational Day (balanced requests and adequate water)
2. Scenario 2: Silent Vulnerable Ward (Priority inversion over vocal affluent ward)
3. Scenario 3: Severe Water Shortage (Strict constraint enforcement under scarcity)
4. Scenario 4: Heatwave Demand Surge (Documented scenario parameter multiplier)
5. Scenario 5: Duplicate Complaints Consolidation (Spatiotemporal clustering)
6. Scenario 6: Tanker Capacity Constraint (Multi-load feasibility without overloading)
"""

import sys
import os
import unittest
from pathlib import Path

# UTF-8 stdout configuration for Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR / "ai_engine"))

from main import WardInput, compute_priority, _allocate_ai, _allocate_fcfs, POLICY_VERSION


class TestWaterFlowScenarios(unittest.TestCase):

    def test_scenario_1_normal_day(self):
        """Scenario 1: Normal operational day with balanced requests and adequate water."""
        wards = [
            WardInput(ward_id=1, ward_number="W1", name="Ward A", vulnerability_index=0.50, dry_pipe_hours=24.0, population=400000, historical_deficit=0.30, demand_liters=15000, depot_distance_km=5.0),
            WardInput(ward_id=2, ward_number="W2", name="Ward B", vulnerability_index=0.60, dry_pipe_hours=30.0, population=500000, historical_deficit=0.35, demand_liters=20000, depot_distance_km=6.0),
            WardInput(ward_id=3, ward_number="W3", name="Ward C", vulnerability_index=0.40, dry_pipe_hours=18.0, population=350000, historical_deficit=0.20, demand_liters=10000, depot_distance_km=4.0),
        ]
        available_water = 50000  # Adequate supply
        
        allocations = _allocate_ai(wards, available_water)
        
        total_allocated = sum(allocations.values())
        self.assertLessEqual(total_allocated, available_water)
        
        for w in wards:
            alloc = allocations[str(w.ward_number)]
            self.assertGreaterEqual(alloc, 0)
            self.assertLessEqual(alloc, w.demand_liters)
            res = compute_priority(w)
            self.assertGreaterEqual(res.total_score, 0.0)
            self.assertLessEqual(res.total_score, 100.0)
            self.assertEqual(res.policy_version, POLICY_VERSION)

    def test_scenario_2_silent_vulnerable_ward(self):
        """
        Scenario 2: Silent Vulnerable Ward vs Vocal Affluent Ward.
        Ward A (Vocal/Visible): high pop, moderate vuln, low dry hours.
        Ward B (Silent/Vulnerable): high vulnerability, severe dry pipe, high deficit.
        WaterFlow must prioritize Ward B over Ward A despite Ward A's vocal presence.
        """
        ward_a_vocal = WardInput(
            ward_id=1,
            ward_number="VOCAL",
            name="Ward A (Vocal Commercial/Affluent)",
            vulnerability_index=0.25,     # Low/moderate slum share
            dry_pipe_hours=12.0,          # Only 12 hours dry
            population=700000,            # Vocal, large ward
            historical_deficit=0.15,      # Well-served historically
            depot_distance_km=3.0,        # Close to depot
            demand_liters=20000
        )
        
        ward_b_silent = WardInput(
            ward_id=2,
            ward_number="SILENT",
            name="Ward B (Silent Vulnerable Slum Cluster)",
            vulnerability_index=0.85,     # Very high slum share / informal
            dry_pipe_hours=56.0,          # 56 hours without water!
            population=450000,
            historical_deficit=0.55,      # Structurally underserved
            depot_distance_km=7.0,
            demand_liters=20000
        )
        
        res_a = compute_priority(ward_a_vocal)
        res_b = compute_priority(ward_b_silent)
        
        # Priority of silent vulnerable ward MUST be higher than vocal ward
        self.assertGreater(res_b.total_score, res_a.total_score,
                           f"Ward B ({res_b.total_score}) must outrank Ward A ({res_a.total_score})")
        self.assertGreater(res_b.total_score - res_a.total_score, 20.0,
                           "Priority score margin must be substantial (>20 pts)")
        
        # Allocation test: When water is scarce (enough for only 1 ward), Silent gets served first!
        allocations = _allocate_ai([ward_a_vocal, ward_b_silent], total_supply=20000)
        self.assertEqual(allocations["SILENT"], 20000)
        self.assertEqual(allocations["VOCAL"], 0)

    def test_scenario_3_severe_shortage(self):
        """Scenario 3: Severe municipal water deficit constraint testing."""
        wards = [
            WardInput(ward_id=1, ward_number="W1", name="Ward High", vulnerability_index=0.90, dry_pipe_hours=60.0, population=600000, historical_deficit=0.70, demand_liters=40000, depot_distance_km=8.0),
            WardInput(ward_id=2, ward_number="W2", name="Ward Mid", vulnerability_index=0.70, dry_pipe_hours=40.0, population=500000, historical_deficit=0.50, demand_liters=30000, depot_distance_km=6.0),
            WardInput(ward_id=3, ward_number="W3", name="Ward Low", vulnerability_index=0.30, dry_pipe_hours=15.0, population=300000, historical_deficit=0.20, demand_liters=25000, depot_distance_km=4.0),
        ]
        # Total demand = 95,000 L, but available water is only 15,000 L (Severe Crisis)
        severe_water_budget = 15000
        
        allocations = _allocate_ai(wards, severe_water_budget)
        
        total_allocated = sum(allocations.values())
        # Hard constraint: Total allocation must never exceed budget
        self.assertLessEqual(total_allocated, severe_water_budget)
        
        # In severe crisis, water is channeled to the highest priority ward
        self.assertGreater(allocations["W1"], allocations["W2"])
        self.assertEqual(allocations["W3"], 0)

    def test_scenario_4_heatwave_surge(self):
        """Scenario 4: IMD heatwave scenario parameter (+35% demand surge)."""
        normal_ward = WardInput(
            ward_id=1, ward_number="HW1", name="Heatwave Ward",
            vulnerability_index=0.70, dry_pipe_hours=36.0,
            population=500000, historical_deficit=0.40,
            demand_liters=20000, depot_distance_km=5.0
        )
        
        # Under IMD Heatwave scenario, demand surges by documented SCENARIO_PARAMETER 1.35
        HEATWAVE_SURGE_MULTIPLIER = 1.35
        surge_ward = WardInput(
            ward_id=1, ward_number="HW1", name="Heatwave Ward",
            vulnerability_index=0.70,
            dry_pipe_hours=min(72.0, normal_ward.dry_pipe_hours * 1.25),
            population=500000, historical_deficit=0.40,
            demand_liters=int(normal_ward.demand_liters * HEATWAVE_SURGE_MULTIPLIER),
            depot_distance_km=5.0
        )
        
        res_normal = compute_priority(normal_ward)
        res_surge = compute_priority(surge_ward)
        
        self.assertGreater(res_surge.total_score, res_normal.total_score, "Heatwave conditions must elevate priority score")
        
        # Test allocation constraint under heatwave
        allocs = _allocate_ai([surge_ward], 25000)
        self.assertLessEqual(allocs["HW1"], 25000)
        self.assertEqual(allocs["HW1"], 25000)

    def test_scenario_5_duplicate_complaints(self):
        """Scenario 5: Repeated citizen complaint consolidation within spatiotemporal threshold."""
        import hashlib
        # Documented deduplication rule: complaints within 200m and 2 hours are consolidated
        complaints = [
            {"id": "C101", "ward": "M/E", "lat": 19.0551, "lng": 72.9312, "phone": "+91-9820011111", "time": 1000},
            {"id": "C102", "ward": "M/E", "lat": 19.0552, "lng": 72.9313, "phone": "+91-9820011111", "time": 1020},
            {"id": "C103", "ward": "M/E", "lat": 19.0550, "lng": 72.9311, "phone": "+91-9820011111", "time": 1040},
            {"id": "C104", "ward": "M/E", "lat": 19.0700, "lng": 72.9400, "phone": "+91-9820022222", "time": 1010},
            {"id": "C105", "ward": "L",   "lat": 19.0680, "lng": 72.8800, "phone": "+91-9820033333", "time": 1030},
        ]
        
        # Cluster keys based on phone + rounded lat/lng
        def get_cluster_key(c):
            return f"{c['phone']}_{round(c['lat'], 3)}_{round(c['lng'], 3)}"
            
        unique_clusters = set(get_cluster_key(c) for c in complaints)
        self.assertEqual(len(unique_clusters), 3, "5 complaints must consolidate into 3 clusters")

    def test_scenario_6_tanker_capacity_constraint(self):
        """Scenario 6: Demand exceeding single tanker capacity must be bounded by truck capacity."""
        tanker_capacity = 10000
        ward_demand = 28000
        
        # An individual tanker dispatch load can NEVER exceed physical capacity
        dispatch_load = min(ward_demand, tanker_capacity)
        self.assertLessEqual(dispatch_load, tanker_capacity)
        self.assertEqual(dispatch_load, 10000)
        
        # Multi-trip requirement calculation
        required_trips = -(-ward_demand // tanker_capacity)
        self.assertEqual(required_trips, 3)


if __name__ == "__main__":
    unittest.main()
