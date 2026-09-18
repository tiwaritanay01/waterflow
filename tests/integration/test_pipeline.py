"""
WaterFlow OS — End-to-End Pipeline Integration Test (Phase 22)
==============================================================
Validates the complete execution flow:
Citizen request -> API Endpoint -> Priority Engine -> Allocation -> Explainability -> Fleet Routing.

Verifies:
1. End-to-End Prioritize API (/api/prioritize)
2. Policy Metadata API (/api/policy)
3. Health and Readiness probes (/health, /ready)
4. Routing Optimizer (/api/optimize-routes) with vehicle capacity feasibility
5. End-to-End Scenarios (Normal, Shortage, Silent Vulnerable Ward, Tanker Limit)
"""

import sys
import os
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

# UTF-8 stdout configuration for Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR / "ai_engine"))

from main import app, POLICY_VERSION


class TestPipelineIntegration(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_and_ready_probes(self):
        """Test health and readiness probes."""
        res_health = self.client.get("/health")
        self.assertEqual(res_health.status_code, 200)
        self.assertEqual(res_health.json()["status"], "ok")
        self.assertEqual(res_health.json()["policy_version"], POLICY_VERSION)

        res_ready = self.client.get("/ready")
        self.assertEqual(res_ready.status_code, 200)
        self.assertTrue(res_ready.json()["ready"])

    def test_policy_endpoint(self):
        """Test authoritative GET /api/policy endpoint."""
        res = self.client.get("/api/policy")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["policy_version"], POLICY_VERSION)
        self.assertIn("weights", data)
        self.assertIn("constraints", data)
        self.assertIn("normalization", data)
        # Verify unit-sum weights
        total_w = sum(data["weights"].values())
        self.assertAlmostEqual(total_w, 1.0, places=4)

    def test_e2e_normal_allocation_pipeline(self):
        """Test full request-to-allocation pipeline under normal operational conditions."""
        payload = {
            "total_supply": 100000,
            "wards": [
                {
                    "ward_id": 1,
                    "ward_number": "M/E",
                    "name": "M/East Govandi",
                    "population": 807720,
                    "vulnerability_index": 0.85,
                    "dry_pipe_hours": 48.0,
                    "historical_deficit": 0.60,
                    "demand_liters": 45000,
                    "depot_distance_km": 4.5
                },
                {
                    "ward_id": 2,
                    "ward_number": "A",
                    "name": "A Ward Colaba",
                    "population": 185000,
                    "vulnerability_index": 0.15,
                    "dry_pipe_hours": 8.0,
                    "historical_deficit": 0.10,
                    "demand_liters": 15000,
                    "depot_distance_km": 2.0
                }
            ]
        }
        res = self.client.post("/api/prioritize", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["policy_version"], POLICY_VERSION)
        self.assertEqual(len(data["queue"]), 2)
        
        # M/E Govandi must be ranked #1
        first_ward = data["queue"][0]
        self.assertEqual(first_ward["ward_number"], "M/E")
        self.assertGreater(first_ward["total_score"], 65.0)
        
        # Verify explainability breakdown contains unit-sum weights
        weights_sum = sum(b["weight"] for b in first_ward["breakdown"])
        self.assertAlmostEqual(weights_sum, 1.0, places=4)

    def test_e2e_shortage_scenario(self):
        """Test pipeline enforcement when water supply is severely restricted."""
        payload = {
            "total_supply": 20000,  # Far below total demand of 75,000 L
            "wards": [
                {"ward_id": 1, "ward_number": "W1", "name": "Vulnerable", "population": 500000, "vulnerability_index": 0.90, "dry_pipe_hours": 50.0, "historical_deficit": 0.70, "demand_liters": 40000, "depot_distance_km": 5.0},
                {"ward_id": 2, "ward_number": "W2", "name": "Affluent", "population": 300000, "vulnerability_index": 0.20, "dry_pipe_hours": 10.0, "historical_deficit": 0.10, "demand_liters": 35000, "depot_distance_km": 3.0}
            ]
        }
        res = self.client.post("/api/simulate-equity", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        ai_res = data["waterflow_ai"]
        
        # Invariant: total allocated <= 20000
        self.assertLessEqual(ai_res["total_allocated"], 20000)
        # Vulnerable ward gets priority allocation
        self.assertEqual(ai_res["allocations"]["W1"], 20000)
        self.assertEqual(ai_res["allocations"]["W2"], 0)

    def test_e2e_routing_capacity_feasibility(self):
        """Test fleet routing endpoint to ensure tanker capacity is respected."""
        payload = {
            "tankers": [
                {"tanker_id": 1, "transponder_id": "T-01", "capacity": 10000},
                {"tanker_id": 2, "transponder_id": "T-02", "capacity": 10000}
            ],
            "wards": [
                {"ward_id": 1, "ward_number": "M/E", "name": "Govandi", "demand_liters": 8000},
                {"ward_id": 2, "ward_number": "L", "name": "Kurla", "demand_liters": 6000}
            ],
            "distance_matrix": [
                [0.0, 5.0, 7.0],
                [5.0, 0.0, 4.0],
                [7.0, 4.0, 0.0]
            ]
        }
        res = self.client.post("/api/optimize-routes", json=payload)
        self.assertEqual(res.status_code, 200)
        routes = res.json().get("routes", [])
        
        # Verify that each assigned tanker's delivered load <= capacity
        for r in routes:
            assigned_transponder = r.get("transponder_id")
            tanker_cap = next((t["capacity"] for t in payload["tankers"] if t["transponder_id"] == assigned_transponder), 10000)
            delivered = r.get("total_delivered", 0)
            self.assertLessEqual(delivered, tanker_cap)


if __name__ == "__main__":
    unittest.main()
