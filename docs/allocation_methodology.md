# WaterFlow OS — Allocation Methodology & Mathematical Policy Specification

**Model Type:** Explainable Multi-Criteria Allocation Model (Deterministic Decision Framework).  
**Notice:** This model is **not** a Machine Learning algorithm; it is an auditable, multi-attribute utility policy explicitly engineered to eliminate discretionary human bias and prevent affluent areas from monopolizing emergency water rations.

---

## 1. Policy Formula & Factor Normalization

The priority score $P_i \in [0, 100]$ for ward $i$ is calculated as the linear combination of five normalized policy attributes:

$$P_i = 100 \times \left( w_V \cdot \hat{V}_i + w_U \cdot \hat{U}_i + w_{\text{Pop}} \cdot \hat{P}_i + w_H \cdot \hat{H}_i + w_D \cdot \hat{D}_i \right)$$

Where weights satisfy the unit-sum constraint:
$$\sum_{k} w_k = w_V + w_U + w_{\text{Pop}} + w_H + w_D = 0.30 + 0.25 + 0.20 + 0.15 + 0.10 = 1.00$$

### Normalized Factors $\hat{X}_i \in [0, 1]$

1. **Normalized Vulnerability ($\hat{V}_i$):**
   $$\hat{V}_i = \min\left(\max(V_i, 0.0), 1.0\right)$$
   *Weight:* $w_V = 0.30$. Measures structural vulnerability (informal settlement ratio, lack of piped infrastructure).

2. **Normalized Unmet Demand ($\hat{U}_i$):**
   $$\hat{U}_i = \min\left(\frac{\text{DryPipeHours}_i}{72.0}, 1.0\right)$$
   *Weight:* $w_U = 0.25$. Capped at 72 hours (3 days complete dry main).

3. **Normalized Population Need ($\hat{P}_i$):**
   $$\hat{P}_i = \min\left(\frac{\text{Population}_i}{1,000,000}, 1.0\right)$$
   *Weight:* $w_{\text{Pop}} = 0.20$. Normalized against Mumbai's largest ward cap ($1,000,000$ residents).

4. **Normalized Historical Deficit ($\hat{H}_i$):**
   $$\hat{H}_i = \min\left(\max(H_i, 0.0), 1.0\right)$$
   *Weight:* $w_H = 0.15$. Unmet quota ratio over the prior 7-day municipal cycle.

5. **Normalized Depot Distance ($\hat{D}_i$):**
   $$\hat{D}_i = \min\left(\frac{\text{DepotDistanceKm}_i}{20.0}, 1.0\right)$$
   *Weight:* $w_D = 0.10$. Compensates peripheral wards that face systematic neglect due to transit friction.

---

## 2. Hard Allocation Constraints

Let $A_i$ be the allocated volume in liters to ward $i$, $D_i$ be the ward's unmet demand in liters, and $S_{\text{total}}$ be the total available emergency supply at municipal depots.

1. **Non-negativity:**
   $$A_i \ge 0 \quad \forall i$$
2. **Demand Ceiling (No Over-Allocation):**
   $$A_i \le D_i \quad \forall i$$
3. **Supply Budget Conservation:**
   $$\sum_{i=1}^{N} A_i \le S_{\text{total}}$$
4. **Tanker Capacity Feasibility:**
   For each dispatch $m$ assigned to tanker $k$ with nominal capacity $C_k$:
   $$\text{DispatchedLoad}_m \le C_k$$

---

## 3. Separation of Concerns: Need vs Logistics

* **Stage 1 (Equity Engine):** Evaluates *Who needs water first?*  
  Ranks all wards purely on multi-criteria need $P_i$ and computes baseline target allocations $A_i$. Distance enters this stage only as an equity parity factor ($10\%$) to prevent edge wards from suffering permanent logistical penalties.
* **Stage 2 (Fleet Logistics & Routing Engine):** Evaluates *How is the allocation physically transported?*  
  Takes target allocations $A_i$ as demands and solves a Capacitated Vehicle Routing Problem (CVRP) via Google OR-Tools to minimize total transit distance and turnaround time without violating vehicle capacities or driver hours.

---

## 4. Equity Metric Audit & Limitations

### 4.1 Existing Metric: Service Equity Index (SEI)
$$\text{SEI} = \max\left(0, 100 \times \left(1 - \frac{\sigma(r)}{0.5}\right)\right)$$
Where $r_i = \frac{A_i}{D_i}$ is the fulfillment ratio of ward $i$, and $\sigma(r)$ is the standard deviation across all $N$ wards.

* **Rationale:** A uniform distribution of water has $\sigma(r) = 0 \implies \text{SEI} = 100\%$. The maximum possible standard deviation for ratios in $[0, 1]$ is $0.5$ (when half receive $0$ and half receive $100\%$), which yields $\text{SEI} = 0\%$.
* **Limitations:**
  * Sensitive to outliers in small datasets.
  * Treats all wards equally in fulfillment ratio variance, rather than weighting variance by population.

### 4.2 Complementary Auditing Metrics
To avoid over-reliance on SEI alone, WaterFlow OS also tracks:
1. **Vulnerable Area Coverage ($V_{\text{cov}}$):**
   $$V_{\text{cov}} = \frac{\sum_{i: V_i \ge 0.70} A_i}{\sum_{i=1}^{N} A_i} \times 100\%$$
2. **Gini Coefficient of Distributed Water per Capita ($G$):**
   $$G = \frac{\sum_{i=1}^{N}\sum_{j=1}^{N} \left|\frac{A_i}{\text{Pop}_i} - \frac{A_j}{\text{Pop}_j}\right|}{2 N \sum_{i=1}^{N} \frac{A_i}{\text{Pop}_i}}$$
   $G = 0$ denotes perfect per-capita equity.
