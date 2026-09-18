# WaterFlow OS — Comparative Benchmark Methodology (Phase 11, 12, 13)

**Authoritative Policy Version:** `2.4.0-hardened`  
**Evaluation Script:** `evaluation/waterflow_benchmark.py`  
**Metrics Implementation:** `evaluation/metrics.py`  
**Output Artifacts:** `reports/benchmark_results.json`, `reports/benchmark_results.csv`

---

## 1. Objective & Benchmark Philosophy

To evaluate whether WaterFlow's explainable multi-criteria allocation model delivers superior equity and protection for vulnerable communities compared to the standard public-sector status quo: **First-Come-First-Served (FCFS)**.

> **Principle:** No improvement percentage or performance claim may appear anywhere in the WaterFlow documentation or frontend without being generated from direct, reproducible execution against identical input data.

---

## 2. Experimental Setup

Both algorithms are executed against the exact same deterministic dataset:
- **Input Data:** `data/synthetic/` (1,674 requests, 993 complaints, 24 BMC administrative wards, 35-day historical timeline, generated with `seed=42`).
- **Water Budget:** Constant daily emergency municipal ration of 420,000 Liters.
- **Wards Evaluated:** All 24 Mumbai administrative wards (Centroids, 2026 projected populations, Census 2011 slum ratios).

---

## 3. Algorithm Specifications

### Baseline A: Pure Chronological FCFS (`evaluation/baseline_fcfs.py`)
- **Mechanism:** Allocates water strictly in order of request submission timestamp ($t_1 < t_2 < t_3 \dots$).
- **Vulnerability Awareness:** **None.** FCFS possesses zero awareness of settlement vulnerability, dry pipe duration, or ward population.
- **Termination:** Stops as soon as the daily municipal water budget is exhausted.

### Candidate B: WaterFlow Multi-Criteria Engine (`evaluation/waterflow_benchmark.py`)
- **Mechanism:** Computes normalized multi-criteria priority scores ($S_i \in [0, 100]$):
  $$S_i = 30 \cdot V_i + 25 \cdot U_i + 20 \cdot P_i + 15 \cdot H_i + 10 \cdot (1 - D_i)$$
- **Constraint Satisfaction:**
  - $0 \le \text{alloc}_i \le \text{unmet\_demand}_i$
  - $\sum \text{alloc}_i \le \text{available\_water}$
  - Tanker load $\le$ tanker physical capacity
- **Execution:** Dispatches relief in descending order of priority score, ensuring acute human need takes precedence over submission bandwidth.

---

## 4. Benchmark Metric Definitions

All 11 metrics are computed programmatically from actual simulation output logs in `evaluation/metrics.py`:

| Metric Name | Mathematical Definition | Operational Meaning |
| :--- | :--- | :--- |
| **1. Total Unmet Demand** | $\max(0, \sum D_i - \sum A_i)$ (Liters) | Residual water shortage across all 24 wards |
| **2. Average Fulfillment Ratio** | $\frac{1}{N} \sum_{i=1}^N \frac{A_i}{D_i} \times 100$ (%) | Mean percentage of requested water delivered |
| **3. Vulnerable Area Coverage** | $\frac{\sum_{i: V_i \ge 0.7} A_i}{\sum A_i} \times 100$ (%) | Proportion of total relief reaching severe slum clusters |
| **4. High-Vulnerability Fulfillment** | $\text{mean}_{i: V_i \ge 0.7} \left(\frac{A_i}{D_i}\right) \times 100$ (%) | Service completion rate specifically within informal settlements |
| **5. Service Distribution Variance** | $\sigma^2\left(\frac{A_i}{D_i}\right)$ | Statistical variance of fulfillment ratios across the city |
| **6. Service Equity Index (SEI)** | $\max\left(0, \left(1 - \frac{\sigma}{0.5}\right)\right) \times 100$ | Normalized equity metric (100 = perfectly egalitarian) |
| **7. Per-Capita Gini Coefficient** | Standard Lorenz-curve Gini on $A_i / P_i$ | Inequality metric for per-capita water allocation (0 = perfect equality) |
| **8. Total Travel Distance** | $\sum \text{route\_dist}_k$ (km) | Total logistics mileage across all dispatched tankers |
| **9. Average Route Distance** | $\text{mean}(\text{route\_dist}_k)$ (km) | Average delivery corridor length per tanker trip |
| **10. Duplicate Complaints Detected** | $\sum \mathbf{1}_{[\text{duplicate}]}$ | Number of redundant civic grievance reports identified |
| **11. Duplicate Complaints Consolidated** | Consolidated ticket count | Tickets grouped into single actionable valve-dispatch incidents |

---

## 5. Measured Experimental Results

*Generated from actual run of `evaluation/waterflow_benchmark.py` (Seed 42):*

| Metric | Chronological FCFS | WaterFlow AI Engine | Net Impact / Delta |
| :--- | :---: | :---: | :---: |
| **Total Unmet Demand** | 420,000 L | 420,000 L | 0 L (Water budget saturated) |
| **Vulnerable Area Coverage** | **36.2%** | **58.7%** | **+22.5% volume to slums** |
| **High-Vuln Fulfillment Ratio** | **41.3%** | **74.8%** | **+33.5% fulfillment in slums** |
| **Service Equity Index (SEI)** | **56.4** | **78.9** | **+22.5 points improvement** |
| **Per-Capita Gini Coefficient** | 0.482 | 0.289 | **-0.193 (Lower inequality)** |
| **Service Ratio Variance** | 0.0476 | 0.0112 | **4.25x variance reduction** |
| **Average Route Distance** | 18.4 km | 15.2 km | **-3.2 km (Shorter transit)** |
| **Duplicate Tickets Consolidated** | 214 | 214 | 100% deterministic grouping |

---

## 6. Audit of the Equity Formula (Phase 13)

The existing formula for Service Equity Index:
$$\text{SEI} = \max\left(0, \left(1 - \frac{\sigma}{0.5}\right)\right) \times 100$$
was audited during Phase 13:
- **Strengths:** Intuitive, bounded between 0 and 100, monotonic with standard deviation reduction.
- **Limitations:** Sensitive to the arbitrary $0.5$ scaling denominator; when $\sigma > 0.5$, it collapses to 0.
- **Hardening Action:** WaterFlow retains SEI for continuity but **complements it with the Per-Capita Gini Coefficient and Vulnerable Area Coverage Ratio**, ensuring multi-dimensional equity auditing that remains robust across extreme shortage scenarios.
