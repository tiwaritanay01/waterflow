# WaterFlow OS — Factor Selection Methodology (Phase 2)

**Version:** `3.0.0-research`  
**Classification:** Variable Selection Governance & Methodological Standards  
**Scope:** Strict Criteria Governing Inclusion, Exclusion, and Classification of System Variables

---

## 1. Core Selection Philosophy: Factor Selection, Not Maximization

Adding every imaginable variable to an allocation algorithm does not increase intelligence; it introduces collinearity, instability, measurement error propagation, and uninterpretable black-box behavior.

WaterFlow OS enforces a strict **Factor Selection Protocol** governed by ten foundational principles:

### The Ten Inclusion & Exclusion Principles

1. **Physical Constraints Must Be Constraints:** Variables governing physical capacities (tanker payload, treatment throughput, lake storage, water quality limits) must function as hard boundary conditions ($\le \text{Cap}$), never as discretionary weighted linear terms.
2. **Operational Variables Feed Optimization:** Fleet locations, transit durations, and road bottlenecks belong exclusively in logistics and vehicle routing solvers, not in equity need calculations.
3. **Forecast Variables Feed Prediction:** Ambient temperatures, historical lags, and seasonal indicators belong in predictive demand and supply models.
4. **Equity Variables Must Be Independently Justified:** Every factor entering the multi-criteria need formula ($P_i$) must represent a direct, defensible metric of human physiological or infrastructural water deprivation.
5. **Measurement Uncertainty Precludes High Weighting:** Variables with high estimation uncertainty (e.g. informal private tanker spot prices, subjective complaints) must not receive significant weights without corroboration.
6. **Correlated Variables Must Not Be Double Counted:** Collinear indicators (e.g. household count and population, or catchment rainfall and lake storage) must be pruned or consolidated into derived indicators.
7. **Zero Demographic Deservingness:** Caste, religion, or ethnic identity must **never** serve as allocation weights or priority modifiers.
8. **Represent Inequity via Measurable Access Deficits:** Structural marginalization is captured objectively through physical service deficits: slum housing share, dry pipe hours, zero line pressure, and historical ration shortfalls.
9. **Empirical or Physical Mechanism Required:** A variable must possess an established physical law (mass balance, hydraulics) or proven empirical correlation before entering the production engine.
10. **Zero Fabrication of Missing Data:** Unobserved fields must trigger explicit missing-data fallback policies (conservative lower bounds, historical medians), never fabricated numbers disguised as real.

---

## 2. Decision Categories & Distribution

Every candidate variable is assigned exactly one decision status:

| Decision Class | Operational Meaning | Count in Catalogue |
| :--- | :--- | :---: |
| **INCLUDE** | Integrated into active production engine (Supply, Demand, Equity, or Routing) | 18 |
| **CONDITIONAL** | Activated only when verified real-time telemetry or health logs are present | 5 |
| **SCENARIO_ONLY** | Enforced under explicit stress scenarios (Drought, Heatwave, Power Loss) | 5 |
| **MONITOR_ONLY** | Computed and displayed for equity audits; excluded from decision scores | 4 |
| **EXCLUDE** | Strictly excluded due to redundancy, collinearity, or ethical prohibition | 2 |

---

## 3. Explicit Justifications for Excluded Variables

### A. Caste, Religious, or Ethnic Identity (`EXCLUDE`)
- **Reason:** Violates the Constitution of India (Article 15) and municipal ethics. Allocating drinking water based on identity group deservingness is illegal and discriminatory.
- **WaterFlow Alternative:** All humans have identical physiological water needs. Structural disparities are measured purely by physical infrastructure access: whether the dwelling has a municipal tap, how many hours the pipe was dry, and historical service gaps.

### B. Average Household Size (`EXCLUDE`)
- **Reason:** Highly collinear ($r > 0.85$) with total ward population and household count. Including both inflates population weight artificially without adding new variance.
- **WaterFlow Alternative:** Ward resident population serves as the single primary scale denominator.
