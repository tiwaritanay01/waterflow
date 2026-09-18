"""
WaterFlow OS — Policy Weight Sensitivity Analysis (Phase 23)
Evaluates policy trade-offs across 5 distinct weighting philosophies:
- Policy A: High Vulnerability Focus (w_V=0.50)
- Policy B: High Unmet Demand Focus (w_U=0.50)
- Policy C: Balanced Equal-Weight
- Policy D: High Historical Service Deficit (w_H=0.45)
- Policy E: Emergency / Corroborated Complaint Heavy (w_C=0.35, w_F=0.25)
Measures: vulnerable area fulfillment, unmet demand, and Gini allocation concentration.
Outputs: reports/sensitivity_analysis_v3.csv and reports/sensitivity_analysis_v3.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
import numpy as np
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from water_engine.equity_engine import EquityEngine, NeedAssessment

REPORTS_DIR = ROOT_DIR / "reports"
REPORTS_DIR.mkdir(exist_ok=True)


POLICIES = [
    {
        "name": "Policy A (High Vulnerability)",
        "weights": {"vulnerability": 0.50, "unmet_demand": 0.20, "historical_deficit": 0.10, "reliability_deficit": 0.05, "complaint_evidence": 0.05, "critical_facility": 0.10}
    },
    {
        "name": "Policy B (High Unmet Demand)",
        "weights": {"vulnerability": 0.10, "unmet_demand": 0.50, "historical_deficit": 0.15, "reliability_deficit": 0.10, "complaint_evidence": 0.05, "critical_facility": 0.10}
    },
    {
        "name": "Policy C (Balanced)",
        "weights": {"vulnerability": 0.25, "unmet_demand": 0.25, "historical_deficit": 0.20, "reliability_deficit": 0.10, "complaint_evidence": 0.10, "critical_facility": 0.10}
    },
    {
        "name": "Policy D (High Historical Deficit)",
        "weights": {"vulnerability": 0.15, "unmet_demand": 0.15, "historical_deficit": 0.45, "reliability_deficit": 0.10, "complaint_evidence": 0.05, "critical_facility": 0.10}
    },
    {
        "name": "Policy E (Emergency & Lifeline Heavy)",
        "weights": {"vulnerability": 0.15, "unmet_demand": 0.15, "historical_deficit": 0.10, "reliability_deficit": 0.05, "complaint_evidence": 0.30, "critical_facility": 0.25}
    }
]


def gini_coefficient(x: list[float]) -> float:
    """Calculates Gini coefficient of allocation concentration."""
    arr = np.array(x, dtype=float)
    if np.amin(arr) < 0:
        arr -= np.amin(arr)
    arr += 0.0000001
    arr = np.sort(arr)
    index = np.arange(1, arr.shape[0] + 1)
    n = arr.shape[0]
    return float((np.sum((2 * index - n - 1) * arr)) / (n * np.sum(arr)))


def main():
    print("======================================================================")
    print("WATERFLOW OS — POLICY WEIGHT SENSITIVITY ANALYSIS")
    print("======================================================================")

    ward_pop_path = ROOT_DIR / "data" / "reference" / "bmc" / "ward_population_real.csv"
    df_pop = pd.read_csv(ward_pop_path)

    # 45% shortage budget
    total_ward_demand = len(df_pop) * 12000.0
    supply_budget = total_ward_demand * 0.45

    results = []

    for pol in POLICIES:
        engine = EquityEngine()
        engine.weights = pol["weights"]
        engine.version = f"sensitivity-{pol['name'][:8]}"

        assessments = []
        for idx, r in df_pop.iterrows():
            a = engine.evaluate_priority(
                location_id=r["ward_code"],
                location_name=r["ward_name"],
                unmet_demand_liters=12000.0,
                vulnerability_index=float(r["slum_share_2011"]),
                historical_deficit=0.6 if idx % 3 == 0 else 0.2,
                reliability_deficit=0.5 if idx % 2 == 0 else 0.1,
                complaint_evidence=8.0 if idx in [1, 5, 12] else 1.0,
                critical_facility=0.9 if idx in [0, 8] else 0.0
            )
            assessments.append(a)

        res = engine.allocate(assessments, available_supply_liters=supply_budget)

        high_vuln_wards = [a for a in assessments if a.breakdown[0].raw_value >= 0.70]
        high_vuln_demand = sum(a.unmet_demand_liters for a in high_vuln_wards)
        high_vuln_delivered = sum(res.allocations[str(a.location_id)] for a in high_vuln_wards)
        hv_fulfillment = (high_vuln_delivered / high_vuln_demand * 100.0) if high_vuln_demand > 0 else 100.0

        alloc_values = list(res.allocations.values())
        gini = gini_coefficient(alloc_values)

        results.append({
            "policy_name": pol["name"],
            "total_allocated_liters": res.total_allocated,
            "unserved_demand_liters": res.unserved_demand,
            "overall_fulfillment_pct": round(res.total_allocated / total_ward_demand * 100.0, 1),
            "high_vuln_fulfillment_pct": round(hv_fulfillment, 1),
            "allocation_gini_concentration": round(gini, 3)
        })

    df_res = pd.DataFrame(results)
    df_res.to_csv(REPORTS_DIR / "sensitivity_analysis_v3.csv", index=False)

    with open(REPORTS_DIR / "sensitivity_analysis_v3.json", "w", encoding="utf-8") as f:
        json.dump({"policies_evaluated": results}, f, indent=2)

    print("\nSENSITIVITY ANALYSIS RESULTS (Policy Trade-Offs under 45% Shortage):")
    for r in results:
        print(f"  {r['policy_name']:<36} | High-Vuln: {r['high_vuln_fulfillment_pct']:>5}% | Gini: {r['allocation_gini_concentration']:>5} | Unserved: {r['unserved_demand_liters']:>7,.0f} L")

    print(f"\nSaved to reports/sensitivity_analysis_v3.csv and .json")


if __name__ == "__main__":
    main()
