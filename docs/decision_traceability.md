# WaterFlow OS — Decision Traceability & Audit Protocol (Phase 29)
**Document Version:** 3.0.0-research  
**Classification:** `ALGORITHMIC_AUDITABILITY`  
**Last Updated:** 2026-09-18  

---

## 1. Traceability Principle & Architecture

In public resource governance, every administrative and algorithmic decision must be defensible under retrospective inquiry. If an engineer, municipal commissioner, or citizen oversight committee queries why Ward M/E received 24,000 Liters while Ward A received 0 Liters on a specific date, the system must not provide a hand-waving explanation.

Every allocation batch is stamped with an immutable, cryptographically unique **`decision_id`** (e.g. `dec-7f3b89a012c4`).

---

## 2. Decision Record Schema

When an allocation is finalized by the backend engine, a complete trace bundle is persisted:

```json
{
  "decision_id": "dec-7f3b89a012c4",
  "timestamp": "2026-09-18T12:00:00Z",
  "system_state": {
    "policy_version": "3.0.0-research",
    "policy_path": "config/allocation_policy.yaml",
    "supply_model_version": "2.0.0-research",
    "demand_model_version": "2.0.0-research",
    "routing_solver": "Constrained VRP (2-opt heuristic fallback)",
    "active_scenario": "NORMAL_OPERATIONS"
  },
  "water_balance": {
    "usable_potable_relief_budget_liters": 240000.0,
    "total_unmet_demand_liters": 288000.0,
    "total_allocated_liters": 240000.0,
    "unserved_demand_liters": 48000.0
  },
  "constraints_applied": [
    "allocation_non_negative",
    "allocation_not_above_unmet_demand",
    "zero_unmet_demand_prevents_allocation",
    "total_allocation_not_above_available_water"
  ],
  "ward_decisions": {
    "M/E": {
      "priority_score": 88.5,
      "tier": 1,
      "is_emergency": false,
      "unmet_demand_liters": 12000.0,
      "allocated_liters": 12000.0,
      "fulfillment_ratio": 1.0,
      "breakdown": [
        {"factor": "Vulnerability", "weight": 0.25, "raw": 0.82, "contribution": 20.5},
        {"factor": "Unmet Demand", "weight": 0.25, "raw": 12000, "contribution": 12.0},
        {"factor": "Historical Deficit", "weight": 0.20, "raw": 0.80, "contribution": 16.0},
        {"factor": "Reliability Deficit", "weight": 0.10, "raw": 0.60, "contribution": 6.0},
        {"factor": "Complaint Evidence", "weight": 0.10, "raw": 4.5, "contribution": 4.5},
        {"factor": "Critical Facility", "weight": 0.10, "raw": 0.0, "contribution": 0.0}
      ]
    }
  }
}
```

---

## 3. Retrospective Verification API

Municipal audits query the authoritative decision trace via:
`GET /api/decision/{decision_id}`

The backend reconstitutes the exact inputs, weights, constraints, and intermediate score products. Any attempt by frontend code to calculate allocation volumes client-side is strictly prohibited.
