"""
WaterFlow OS — Factor Group Ablation Study (Phase 24)
Evaluates marginal contribution of each factor group by ablating one component at a time:
1. Full Model (Baseline v3.0.0-research)
2. Minus Vulnerability (w_V = 0.0)
3. Minus Historical Service Deficit (w_H = 0.0)
4. Minus Complaint Evidence (w_C = 0.0)
5. Minus Critical Facilities (w_F = 0.0)
6. Minus Reliability Deficit (w_R = 0.0)
Measures: vulnerable ward coverage, rank correlation shift (Spearman rho), and unserved priority gap.
Outputs: reports/ablation_results.csv and reports/ablation_results.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
import numpy as np
import pandas as pd
from scipy.stats import spearmanr

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from water_engine.equity_engine import EquityEngine, NeedAssessment

REPORTS_DIR = ROOT_DIR / "reports"
REPORTS_DIR.mkdir(exist_ok=True)


ABLATION_EXPERIMENTS = [
    {
        "name": "Full Model (v3.0.0-research)",
        "ablated_factor": "NONE",
        "weights": {"vulnerability": 0.25, "unmet_demand": 0.25, "historical_deficit": 0.20, "reliability_deficit": 0.10, "complaint_evidence": 0.10, "critical_facility": 0.10}
    },
    {
        "name": "Minus Vulnerability Group",
        "ablated_factor": "vulnerability",
        # Renormalize remaining weights to sum to 1.0
        "weights": {"vulnerability": 0.0, "unmet_demand": 0.333, "historical_deficit": 0.267, "reliability_deficit": 0.133, "complaint_evidence": 0.133, "critical_facility": 0.134}
    },
    {
        "name": "Minus Historical Service Deficit",
        "ablated_factor": "historical_deficit",
        "weights": {"vulnerability": 0.3125, "unmet_demand": 0.3125, "historical_deficit": 0.0, "reliability_deficit": 0.125, "complaint_evidence": 0.125, "critical_facility": 0.125}
    },
    {
        "name": "Minus Corroborated Complaints",
        "ablated_factor": "complaint_evidence",
        "weights": {"vulnerability": 0.278, "unmet_demand": 0.278, "historical_deficit": 0.222, "reliability_deficit": 0.111, "complaint_evidence": 0.0, "critical_facility": 0.111}
    },
    {
        "name": "Minus Critical Facility Lifeline",
        "ablated_factor": "critical_facility",
        "weights": {"vulnerability": 0.278, "unmet_demand": 0.278, "historical_deficit": 0.222, "reliability_deficit": 0.111, "complaint_evidence": 0.111, "critical_facility": 0.0}
    },
    {
        "name": "Minus Reliability Deficit",
        "ablated_factor": "reliability_deficit",
        "weights": {"vulnerability": 0.278, "unmet_demand": 0.278, "historical_deficit": 0.222, "reliability_deficit": 0.0, "complaint_evidence": 0.111, "critical_facility": 0.111}
    }
]


def main():
    print("======================================================================")
    print("WATERFLOW OS — FACTOR GROUP ABLATION STUDY")
    print("======================================================================")

    ward_pop_path = ROOT_DIR / "data" / "reference" / "bmc" / "ward_population_real.csv"
    df_pop = pd.read_csv(ward_pop_path)

    total_ward_demand = len(df_pop) * 12000.0
    supply_budget = total_ward_demand * 0.40  # 40% strict shortage

    # Baseline scores under Full Model
    full_engine = EquityEngine()
    full_engine.weights = ABLATION_EXPERIMENTS[0]["weights"]

    full_assessments = []
    for idx, r in df_pop.iterrows():
        a = full_engine.evaluate_priority(
            location_id=r["ward_code"],
            location_name=r["ward_name"],
            unmet_demand_liters=12000.0,
            vulnerability_index=float(r["slum_share_2011"]),
            historical_deficit=0.7 if idx % 3 == 0 else 0.2,
            reliability_deficit=0.6 if idx % 2 == 0 else 0.1,
            complaint_evidence=7.5 if idx in [1, 4, 11] else 0.5,
            critical_facility=0.85 if idx in [0, 8] else 0.0
        )
        full_assessments.append(a)

    full_res = full_engine.allocate(full_assessments, available_supply_liters=supply_budget)
    full_scores = [a.priority_score for a in full_assessments]

    results = []

    for exp in ABLATION_EXPERIMENTS:
        engine = EquityEngine()
        engine.weights = exp["weights"]
        engine.version = f"ablation-{exp['ablated_factor']}"

        ablated_assessments = []
        for idx, r in df_pop.iterrows():
            a = engine.evaluate_priority(
                location_id=r["ward_code"],
                location_name=r["ward_name"],
                unmet_demand_liters=12000.0,
                vulnerability_index=float(r["slum_share_2011"]),
                historical_deficit=0.7 if idx % 3 == 0 else 0.2,
                reliability_deficit=0.6 if idx % 2 == 0 else 0.1,
                complaint_evidence=7.5 if idx in [1, 4, 11] else 0.5,
                critical_facility=0.85 if idx in [0, 8] else 0.0
            )
            ablated_assessments.append(a)

        alloc_res = engine.allocate(ablated_assessments, available_supply_liters=supply_budget)
        ablated_scores = [a.priority_score for a in ablated_assessments]

        # Calculate rank correlation (Spearman rho) against Full Model
        rho, _ = spearmanr(full_scores, ablated_scores)

        # High vulnerability fulfillment under this ablated model
        high_vuln_wards = [a for a in ablated_assessments if a.breakdown[0].raw_value >= 0.70]
        high_vuln_demand = sum(a.unmet_demand_liters for a in high_vuln_wards)
        high_vuln_delivered = sum(alloc_res.allocations[str(a.location_id)] for a in high_vuln_wards)
        hv_fulfillment = (high_vuln_delivered / high_vuln_demand * 100.0) if high_vuln_demand > 0 else 100.0

        # Critical facility fulfillment
        crit_wards = [a for a in ablated_assessments if a.breakdown[5].raw_value > 0.5]
        crit_demand = sum(a.unmet_demand_liters for a in crit_wards)
        crit_delivered = sum(alloc_res.allocations[str(a.location_id)] for a in crit_wards)
        crit_fulfillment = (crit_delivered / crit_demand * 100.0) if crit_demand > 0 else 100.0

        results.append({
            "experiment_name": exp["name"],
            "ablated_factor": exp["ablated_factor"],
            "spearman_rank_correlation": round(float(rho), 3),
            "high_vuln_fulfillment_pct": round(float(hv_fulfillment), 1),
            "critical_facility_fulfillment_pct": round(float(crit_fulfillment), 1),
            "total_allocated_liters": alloc_res.total_allocated,
            "interpretation": f"Ablating {exp['ablated_factor']} causes rank correlation rho={rho:.2f}"
        })

    df_out = pd.DataFrame(results)
    df_out.to_csv(REPORTS_DIR / "ablation_results.csv", index=False)

    with open(REPORTS_DIR / "ablation_results.json", "w", encoding="utf-8") as f:
        json.dump({"ablation_experiments": results}, f, indent=2)

    print("\nABLATION STUDY RESULTS (Marginal Factor Contribution):")
    for r in results:
        print(f"  {r['experiment_name']:<35} | Rank Rho: {r['spearman_rank_correlation']:>5} | High-Vuln: {r['high_vuln_fulfillment_pct']:>5}% | Critical: {r['critical_facility_fulfillment_pct']:>5}%")

    print(f"\nSaved to reports/ablation_results.csv and .json")


if __name__ == "__main__":
    main()
