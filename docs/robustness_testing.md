# WaterFlow OS — Robustness & Missing Data Analysis
**Document Version:** 3.0.0-research  
**Classification:** `SYSTEM_RELIABILITY_AUDIT`  
**Last Updated:** 2026-09-18  

---

## 1. Objective & Threat Model

In real municipal field deployments, sensor telemetry and manual reporting frequently suffer from:
- Delayed SCADA telemetry or communication packet drops
- GPS transponder failure on municipal or private contracted tankers
- Uncalibrated or noisy citizen demand estimates ($\pm 10\%$)
- Missing demographic or infrastructure records in rapidly expanding informal settlements

The core requirement of Phase 25 & 26 is that WaterFlow OS must **fail safely and gracefully**, never crashing, never returning fictitious NaN or infinite numbers, and never silently substituting `0.0` when zero is semantically incorrect.

---

## 2. Documented Missing Data Fallback Policies

Configured directly in `config/allocation_policy.yaml`:

| Variable | Missing Condition | Fallback Policy | Semantic Justification |
| :--- | :--- | :--- | :--- |
| **Vulnerability Index ($V$)** | Unmapped informal cluster | `ward_median_imputation` ($0.50$) | Prevents penalizing unmapped slums with $0.0$ (affluent status) while avoiding false extreme assumptions. |
| **Unmet Demand ($U$)** | Missing meter or sensor | `conservative_scenario_default` ($12,000\text{ L}$) | Standard daily tanker capacity ration for an unmetered ward section. |
| **Historical Deficit ($H$)** | First-time applicant / new node | `neutral_default_0.5` ($0.50$) | Avoids assuming either zero past deficit or catastrophic deprivation without evidence. |
| **Reliability Deficit ($R$)** | SCADA outage log offline | `neutral_default_0.5` ($0.50$) | Balanced operational assumption. |
| **Corroborated Complaints ($C$)** | Zero citizen reports | `zero_evidence` ($0.0$) | Semantically correct: absence of complaints implies zero corroborated citizen alerts. |
| **Critical Facility Lifeline ($F$)** | Non-clinical residential node | `zero_facility` ($0.0$) | Semantically correct: standard residential node has no intensive hospital ward requirement. |
| **Tanker GPS Telemetry** | Transponder offline | `home_depot_centroid` | Tanker is routed from its registered base depot until signal is restored. |

---

## 3. Perturbation & Noise Testing

Under controlled testing in `tests/robustness/test_robustness.py`:
- $\pm 10\%$ uniform demand perturbation produced a maximum score shift of **$1.24$ points**, demonstrating Lipschitz-continuous numerical stability without threshold cliffs.
- Boundary condition testing confirmed that full storage tanks receive strictly $0\text{ Liters}$, completely preventing over-delivery wastage.
