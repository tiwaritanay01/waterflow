# WaterFlow OS — Logistics & Routing Optimization Methodology
**Document Version:** 3.0.0-research  
**Classification:** `LOGISTICS_AND_OPERATIONS_RESEARCH`  
**Last Updated:** 2026-09-18  

---

## 1. Architectural Decoupling: Need vs Distance

A critical methodological advance in WaterFlow OS v3.0 is the **complete separation of human need assessment from vehicular routing distance**.

In naive municipal dispatch prototypes, transit distance is frequently folded directly into the priority formula (e.g. subtracting priority for far-flung wards, or adding priority to nearby wards). This introduces severe systemic distortions:
- If peripheral wards are penalized for distance, the most geographically marginalized informal settlements are systematically starved.
- If peripheral wards receive a distance bonus, distance becomes an illegitimate proxy for human need.

### The Two-Stage Principle
1. **Stage 3 (Equity Allocation Engine):** Evaluates who needs water based solely on physical deficit, vulnerability, and facility criticality. Determines the exact volume $A_i$ assigned to each ward.
2. **Stage 5 (Routing & Dispatch Optimizer):** Ingests the finalized allocation volumes $\{A_i\}$ and solves the physical Vehicle Routing Problem (VRP) to transport the allocated water with minimal delay, fuel consumption, and emergency response latency.

---

## 2. Mathematical Formulation

Given a fleet of $M$ tankers located at municipal hubs $\mathcal{T} = \{1, \dots, M\}$ and $N$ delivery stops $\mathcal{S} = \{1, \dots, N\}$:
- Tanker capacity: $Q_k$ (Liters)
- Stop demand: $d_i = A_i$ (Liters)
- Transit time matrix: $\tau_{ij} = \frac{\text{Haversine}(i, j)}{v_{\text{urban}}}$ (minutes, where $v_{\text{urban}} = 25\text{ km/h}$)
- Service/unloading duration: $s_i = 15\text{ minutes}$
- Emergency penalty multiplier: $\lambda_{\text{emergency}} = 5.0$

### Objective Function:
$$\min \sum_{k=1}^M \sum_{i} \sum_{j} x_{ijk} \cdot \tau_{ij} + \lambda_{\text{emergency}} \sum_{i \in \mathcal{E}} t_i + \text{Penalty} \cdot \sum_{i} u_i$$
Subject to:
1. **Capacity Limit:** $\sum_{i \in \text{Route}_k} d_i \le Q_k \quad \forall k \in \mathcal{T}$
2. **Emergency Priority:** Emergency stops $i \in \mathcal{E}$ are inserted at the earliest feasible position in the dispatch sequence.
3. **Flow Conservation & 2-Opt Tour Simplicity:** No self-loops, and subtours are uncrossed using 2-opt edge exchange heuristics.

---

## 3. Experimental Benchmarks

Controlled experiments benchmarked across Greater Mumbai's 24 wards using real municipal depot coordinates (Bhandup, Dadar, Veravali) demonstrate:

| Performance Metric | Baseline: Nearest Tanker | Optimized Routing (WaterFlow) | Measured Improvement |
| :--- | :---: | :---: | :---: |
| **Total Travel Distance** | 65.52 km | **60.26 km** | **+8.03% distance saved** |
| **Total Travel Duration** | 262.1 mins | **249.5 mins** | **+4.81% travel time saved** |
| **Mean Response Time** | 22.5 mins | **20.7 mins** | **+8.00% faster delivery** |
| **95th Percentile Response Time** | 56.5 mins | **52.7 mins** | **+6.73% tail latency reduction** |
| **Emergency Mean Delay** | 29.2 mins | **21.3 mins** | **+27.05% faster emergency response** |
| **Water Use Efficiency** | 90.17% | **90.96%** | **+0.79% transit loss reduction** |

All experimental metrics are reproducible via `evaluation/routing_experiments.py` and output to `reports/routing_experiments.csv`.
