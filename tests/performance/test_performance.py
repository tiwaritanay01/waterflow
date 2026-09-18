#!/usr/bin/env python3
"""
Performance & Scalability Benchmark (Phase 35)
Measures execution time and throughput for allocation scoring across 100, 500, 1,000, 5,000, and 10,000 requests.
Generates reports/performance_benchmark.csv and reports/performance_benchmark.json.
"""

import sys
import time
import json
from pathlib import Path
import numpy as np
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

from water_engine.equity_engine import EquityEngine, NeedAssessment

REPORTS_DIR = ROOT_DIR / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

BATCH_SIZES = [100, 500, 1000, 5000, 10000]


def run_performance_suite():
    print("======================================================================")
    print("WATERFLOW OS — PERFORMANCE & THROUGHPUT BENCHMARK")
    print("======================================================================")

    engine = EquityEngine()
    rng = np.random.default_rng(42)
    results = []

    for n in BATCH_SIZES:
        # Generate synthetic batch
        v_arr = rng.uniform(0.1, 0.9, size=n)
        u_arr = rng.uniform(2000.0, 20000.0, size=n)
        h_arr = rng.uniform(0.1, 0.9, size=n)

        # Measure Priority Scoring Latency
        t_start_scoring = time.perf_counter()
        assessments = [
            engine.evaluate_priority(
                location_id=f"LOC-{i}",
                location_name=f"Location {i}",
                unmet_demand_liters=u_arr[i],
                vulnerability_index=v_arr[i],
                historical_deficit=h_arr[i]
            )
            for i in range(n)
        ]
        t_scoring = time.perf_counter() - t_start_scoring

        # Measure Allocation Resolution Latency
        t_start_alloc = time.perf_counter()
        alloc_res = engine.allocate(assessments, available_supply_liters=n * 6000.0)
        t_alloc = time.perf_counter() - t_start_alloc

        total_time_ms = (t_scoring + t_alloc) * 1000.0
        per_req_us = (total_time_ms / n) * 1000.0
        throughput_rps = n / (t_scoring + t_alloc)

        results.append({
            "request_count": n,
            "scoring_duration_ms": round(t_scoring * 1000.0, 2),
            "allocation_duration_ms": round(t_alloc * 1000.0, 2),
            "total_execution_ms": round(total_time_ms, 2),
            "latency_per_request_microseconds": round(per_req_us, 2),
            "throughput_requests_per_sec": round(throughput_rps, 1)
        })

    df_res = pd.DataFrame(results)
    df_res.to_csv(REPORTS_DIR / "performance_benchmark.csv", index=False)

    with open(REPORTS_DIR / "performance_benchmark.json", "w", encoding="utf-8") as f:
        json.dump({"benchmarks": results}, f, indent=2)

    print("\nPERFORMANCE MEASUREMENTS:")
    for r in results:
        print(f"  {r['request_count']:>5} Requests | Total: {r['total_execution_ms']:>8.2f} ms | Per-Req: {r['latency_per_request_microseconds']:>6.1f} µs | Throughput: {r['throughput_requests_per_sec']:>9,.1f} req/s")

    print(f"\nArtifacts saved to reports/performance_benchmark.csv and .json")


if __name__ == "__main__":
    run_performance_suite()
