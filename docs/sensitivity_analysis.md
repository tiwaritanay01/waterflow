# WaterFlow OS — Policy Sensitivity Analysis & Monotonicity Report

**Audit Objective:** Evaluate the stability and behavior of the allocation model when varying operational weights across 5 distinct policy archetypes. Prove that small parameter changes do not trigger erratic or pathological ranking flips.

---

## 1. Evaluated Policy Archetypes

| Policy Family | Vulnerability | Unmet Demand | Population | Historical Deficit | Distance | Rationale |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Policy A (Equal)** | 20% | 20% | 20% | 20% | 20% | Unweighted baseline treating all indicators symmetrically. |
| **Policy B (Pro-Poor)** | 50% | 20% | 10% | 10% | 10% | Maximum protection for informal settlements (Dharavi, Govandi). |
| **Policy C (Outage-First)** | 20% | 50% | 10% | 10% | 10% | Responds purely to acute dry-pipe hours regardless of tenure. |
| **Policy D (BMC Balanced)** | 30% | 25% | 20% | 15% | 10% | **Production Canonical Policy** balancing equity with logistics. |
| **Policy E (Logistics-First)**| 20% | 20% | 15% | 10% | 35% | Emphasizes transit network efficiency and outer-ward reach. |

---

## 2. Experimental Findings

Under constrained emergency supply ($250,000\text{ Liters}$ against $356,800\text{ Liters}$ total demand):

1. **Top Tier Consistency:**
   * Across all five policies, **Ward M/East (Govandi)** and **Ward G/North (Dharavi)** consistently rank in the Top 2. Because both wards suffer from simultaneously high informal population, elevated dry-pipe hours, and historical rationing deficits, their priority is robust against weight shifts.
2. **Smooth Trade-off Dynamics:**
   * Shifting from *Policy A (Equal)* to *Policy B (Pro-Poor)* increases vulnerable area coverage without creating drastic disruptions in secondary tiers.
   * Shifting to *Policy E (Logistics-First)* moderately favors outer wards like Ward P/North and Ward R/South while maintaining basic equity bounds.
3. **Monotonicity & Stability:**
   * No chaotic inversions observed: wards with strictly dominated metrics never overtake higher-need wards.
   * The canonical **Policy D** delivers an optimal Pareto frontier between vulnerable community protection and transit distance reduction.
