# WaterFlow OS — Social Equity, Demographics & Fairness Audit
**Document Version:** 3.0.0-research  
**Classification:** `ETHICAL_GOVERNANCE_AND_AUDIT`  
**Last Updated:** 2026-09-18  

---

## 1. Foundational Equity Principles

Municipal water distribution is a fundamental human right recognized under Article 21 of the Constitution of India. Allocation algorithms operating in urban spaces must navigate stark socioeconomic divides without introducing unconstitutional discrimination or crude identity profiling.

### The Non-Discrimination Invariant
> [!IMPORTANT]
> WaterFlow OS **strictly prohibits** the ingestion or utilization of protected demographic identity markers (such as religion, caste, language, ethnicity, or political affiliation) in its allocation scoring formulas, priority weights, or dispatch constraints.
> No individual or community receives an allocation bonus or penalty based on identity.

---

## 2. Piped Service Deficits vs Identity Proxies

Historically, disadvantaged populations in Greater Mumbai reside disproportionately in non-notified informal settlements, elevated hill slopes, or peripheral network tail-ends where physical piped infrastructure is deficient or absent.

Rather than using identity as a proxy for deservingness, WaterFlow OS anchors vulnerability strictly to **measurable physical service deficits**:

| Parameter | Domain Classification | Measurement Instrument | Usage in WaterFlow OS |
| :--- | :--- | :--- | :--- |
| **Piped Connection Ratio** | Physical Infrastructure | BMC GIS Asset Database | Used to determine baseline piped capacity and deficit |
| **Slum Population Proportion** | Census/Socio-Spatial | 2011 Census / BMC 2034 Master Plan | Used in aggregate spatial vulnerability $V_i$ as a proxy for shared tap dependency |
| **Dry-Pipe Hours ($H_i$)** | Operational SCADA | Distribution Valve Logs | Direct measure of physical service absence |
| **Collection Walking Distance** | Spatial Topography | OpenStreetMap Road Network | Used in logistics planning and infrastructure gap monitoring |
| **Religion / Caste / Identity** | Protected Demographic | **STRICTLY EXCLUDED** | **NOT INGESTED. ZERO ALLOCATION WEIGHT.** |

---

## 3. Disparity Evaluation Framework

Rather than collapsing systemic fairness into an opaque, single "fairness index", WaterFlow OS mandates multi-dimensional disparity tracking across three vulnerability strata:
1. **High Vulnerability** ($V_i \ge 0.70$, predominantly informal settlements with high standpost dependency)
2. **Moderate Vulnerability** ($0.40 \le V_i < 0.70$, mixed formal/informal or tail-end network wards)
3. **Low Vulnerability** ($V_i < 0.40$, fully piped planned urban neighborhoods)

### Audited Outcome Metrics:
1. **Fulfillment Ratio by Strata:** $\frac{\text{Water Delivered}}{\text{Water Needed}}$
2. **Unmet Deficit by Strata:** Unserved liters remaining after daily municipal dispatch
3. **Emergency Relief Dispatch Latency:** Average minutes between crisis ticket submission and tanker gate-out
4. **Repeat Outage Rate:** Proportion of wards suffering consecutive unserved days

Through this multi-metric lens, municipal supervisors can verify that resource-constrained optimization does not systematically disadvantage peripheral or informal communities.
