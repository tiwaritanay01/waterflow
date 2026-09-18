#!/usr/bin/env python3
"""
Operational Benchmark Metrics Calculator for WaterFlow OS.
Calculates all 11 required operational and equity metrics from actual simulation outputs.
"""

import numpy as np

def calculate_benchmark_metrics(wards: list, allocations: dict, travel_distances: list = None, complaints: list = None) -> dict:
    """
    Computes exact operational benchmark metrics:
    1. total_unmet_demand_liters
    2. average_fulfillment_ratio
    3. vulnerable_area_coverage_pct (volume to vuln >= 0.70 / total allocated)
    4. high_vulnerability_fulfillment_ratio (avg fulfillment for vuln >= 0.70)
    5. service_distribution_variance (variance of fulfillment ratios)
    6. equity_index_sei (1 - stddev / 0.5) * 100
    7. gini_coefficient_per_capita
    8. total_travel_distance_km
    9. average_route_distance_km
    10. duplicate_complaints_detected
    11. duplicate_complaints_consolidated
    """
    total_demand = sum(w.demand_liters for w in wards)
    total_allocated = sum(allocations.get(str(w.ward_number), 0) for w in wards)
    total_unmet = max(0, total_demand - total_allocated)

    ratios = []
    high_vuln_ratios = []
    vuln_allocated = 0
    per_capita_deliveries = []

    for w in wards:
        alloc = allocations.get(str(w.ward_number), 0)
        ratio = alloc / w.demand_liters if w.demand_liters > 0 else 1.0
        ratios.append(ratio)

        if w.vulnerability_index >= 0.70:
            high_vuln_ratios.append(ratio)
            vuln_allocated += alloc

        if w.population > 0:
            per_capita_deliveries.append(alloc / w.population)

    arr_ratios = np.array(ratios) if ratios else np.array([0.0])
    variance = float(np.var(arr_ratios))
    stddev = float(np.std(arr_ratios))

    avg_fulfillment = float(np.mean(arr_ratios)) * 100.0
    high_vuln_fulfillment = (float(np.mean(high_vuln_ratios)) * 100.0) if high_vuln_ratios else 0.0

    vuln_coverage = (vuln_allocated / total_allocated * 100.0) if total_allocated > 0 else 0.0
    equity_index = max(0.0, (1.0 - stddev / 0.5)) * 100.0

    # Gini coefficient of per capita water allocation
    gini = 0.0
    if per_capita_deliveries and sum(per_capita_deliveries) > 0:
        arr_pc = np.array(sorted(per_capita_deliveries))
        n = len(arr_pc)
        idx = np.arange(1, n + 1)
        gini = float((2 * np.sum(idx * arr_pc) - (n + 1) * np.sum(arr_pc)) / (n * np.sum(arr_pc)))

    # Routing distances
    total_dist = sum(travel_distances) if travel_distances else 0.0
    avg_route_dist = (total_dist / len(travel_distances)) if travel_distances else 0.0

    # Duplicate complaints
    dup_detected = sum(1 for c in complaints if str(c.get("is_duplicate", "")).lower() == "true") if complaints else 0
    dup_consolidated = dup_detected

    return {
        "total_demand_liters": int(total_demand),
        "total_allocated_liters": int(total_allocated),
        "total_unmet_demand_liters": int(total_unmet),
        "average_fulfillment_ratio_pct": round(avg_fulfillment, 2),
        "vulnerable_area_coverage_pct": round(vuln_coverage, 2),
        "high_vulnerability_fulfillment_ratio_pct": round(high_vuln_fulfillment, 2),
        "service_distribution_variance": round(variance, 4),
        "service_distribution_stddev": round(stddev, 4),
        "equity_index_sei": round(equity_index, 2),
        "gini_coefficient": round(gini, 4),
        "total_travel_distance_km": round(total_dist, 2),
        "average_route_distance_km": round(avg_route_dist, 2),
        "duplicate_complaints_detected": dup_detected,
        "duplicate_complaints_consolidated": dup_consolidated,
    }
