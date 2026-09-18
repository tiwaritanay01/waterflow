# WaterFlow OS — Factor Correlation & Redundancy Audit (Phase 3)

**Evaluation Date:** 2026-09-18  
**Sample Size:** 24 BMC Administrative Wards  
**Outputs:** [`reports/factor_correlation.csv`](file:///c:/Users/tiwar/Downloads/stitch_waterflow_os_municipal_operations_dashboard/reports/factor_correlation.csv), [`reports/factor_correlation.json`](file:///c:/Users/tiwar/Downloads/stitch_waterflow_os_municipal_operations_dashboard/reports/factor_correlation.json)

---

## 1. Pearson Correlation Matrix ($r$)

| Variable | Pop | Density | Slum Share | Dry Hours | Deficit | Demand (L) | Complaints | Distance |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **population** | 1.0 | -0.146 | 0.632 | 0.651 | 0.661 | 0.725 | 0.347 | -0.692 |
| **density_per_sq_km** | -0.146 | 1.0 | 0.186 | 0.062 | 0.06 | 0.088 | -0.047 | 0.476 |
| **slum_share** | 0.632 | 0.186 | 1.0 | 0.926 | 0.924 | 0.931 | 0.161 | -0.385 |
| **dry_pipe_hours** | 0.651 | 0.062 | 0.926 | 1.0 | 0.999 | 0.946 | -0.028 | -0.519 |
| **historical_deficit** | 0.661 | 0.06 | 0.924 | 0.999 | 1.0 | 0.943 | -0.03 | -0.526 |
| **demand_liters** | 0.725 | 0.088 | 0.931 | 0.946 | 0.943 | 1.0 | 0.194 | -0.486 |
| **complaint_count** | 0.347 | -0.047 | 0.161 | -0.028 | -0.03 | 0.194 | 1.0 | -0.15 |
| **depot_distance_km** | -0.692 | 0.476 | -0.385 | -0.519 | -0.526 | -0.486 | -0.15 | 1.0 |

---

## 2. Identified High Correlations & Redundancy Mitigations

| Feature 1 | Feature 2 | Pearson $r$ | Spearman $\rho$ | Risk & Hardening Decision |
| :--- | :--- | :---: | :---: | :--- |
| `population` | `slum_share` | 0.632 | 0.657 | Observed correlation $r=0.632$. Monitored in sensitivity analysis. |
| `population` | `dry_pipe_hours` | 0.651 | 0.698 | Observed correlation $r=0.651$. Monitored in sensitivity analysis. |
| `population` | `historical_deficit` | 0.661 | 0.699 | Observed correlation $r=0.661$. Monitored in sensitivity analysis. |
| `population` | `demand_liters` | 0.725 | 0.83 | Demand naturally scales with population. **Resolution:** Population acts as scale weight; unmet demand acts as volume target. |
| `population` | `depot_distance_km` | -0.692 | -0.699 | Observed correlation $r=-0.692$. Monitored in sensitivity analysis. |
| `slum_share` | `dry_pipe_hours` | 0.926 | 0.875 | Observed correlation $r=0.926$. Monitored in sensitivity analysis. |
| `slum_share` | `historical_deficit` | 0.924 | 0.885 | Observed correlation $r=0.924$. Monitored in sensitivity analysis. |
| `slum_share` | `demand_liters` | 0.931 | 0.847 | Observed correlation $r=0.931$. Monitored in sensitivity analysis. |
| `dry_pipe_hours` | `historical_deficit` | 0.999 | 0.997 | Consecutive dry hours produce historical deficits. **Resolution:** Normalized separately over different timescales (daily vs 7-day). |
| `dry_pipe_hours` | `demand_liters` | 0.946 | 0.954 | Observed correlation $r=0.946$. Monitored in sensitivity analysis. |
| `historical_deficit` | `demand_liters` | 0.943 | 0.951 | Observed correlation $r=0.943$. Monitored in sensitivity analysis. |
| `demand_liters` | `depot_distance_km` | -0.486 | -0.683 | Observed correlation $r=-0.486$. Monitored in sensitivity analysis. |

---

## 3. Dimensionality Reduction & Variable Pruning Conclusions

1. **Slum Share vs Population Density:** Density alone is misleading because affluent island city wards (Ward C, Marine Lines) have high vertical density but reliable pressurized 24/7 piped connections. Slum share ($V_i$) correctly targets horizontal informal chawls and slum clusters with zero individual taps. Raw density is **excluded** from the allocation score.
2. **Population vs Demand:** Absolute demand ($D_i$) and population ($P_i$) correlate strongly ($r > 0.60$). In WaterFlow OS:
   - $P_i$ is normalized against a $1,000,000$ cap and enters the *relative priority score* ($20\%$ weight).
   - $D_i$ enters as the *physical volume upper bound* ($A_i \le D_i$). They serve mathematically separate roles without double-counting.
3. **Complaint Count vs Outage Duration:** Unprocessed complaint volume is skewed by smartphone ownership. WaterFlow OS uses **spatiotemporal deduplication (200m / 2h)** and uses complaint velocity exclusively to corroborate SCADA line failures.
