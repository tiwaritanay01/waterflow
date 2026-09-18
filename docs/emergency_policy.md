# WaterFlow OS — Emergency Response Policy & Triage Protocol
**Document Version:** 3.0.0-research  
**Classification:** `MUNICIPAL_OPERATIONAL_POLICY`  
**Last Updated:** 2026-09-18  

---

## 1. Principles of Emergency Governance

Under standard municipal operations, water is allocated through multi-criteria equity models based on unmet demand, socio-spatial vulnerability, and historical service deficits. However, during acute life-safety emergencies, the system must trigger rapid, decisive interventions.

> [!IMPORTANT]
> **Core Transparency Invariant:** Emergency status must **never** silently distort or contaminate the standard mathematical priority formula. Instead, emergency overrides operate as explicit, fully auditable state transitions with dedicated logging, visible badges in the UI, and separate API payload fields.

---

## 2. Emergency Triage Tiers

The system categorizes operational situations into three formal emergency tiers:

| Tier | Classification | Primary Triggers | Automated System Action | Audit & Approval |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1** | **CRITICAL** | - Microbiological/chemical contamination report<br/>- Hospital / Dialysis reserve under 4 hours<br/>- Critical transmission trunk burst<br/>- Acute prolonged outage (>72h) in high-vulnerability settlement | Immediate preemptive priority assignment (Rank 1). Dedicated emergency relief tanker dispatched from strategic depot reserve. | Executive Engineer log auto-generated; public health alert flag raised. |
| **Tier 2** | **HIGH** | - Sustained complaint velocity spike (>3.0/hr)<br/>- Distribution booster pump trip<br/>- Prolonged dry pipe (>48h) | Priority elevated to Tier 1 in next standard allocation batch. Maintenance dispatch ticket created. | Assistant Engineer notification; visible warning indicator in Command Center. |
| **Tier 3** | **NORMAL** | - Standard intermittent supply requests<br/>- Routine low pressure or maintenance complaints | Processed under standard multi-criteria equity allocation formula ($P_i$). | Standard shift logging. |

---

## 3. Override Mechanism & API Contract

When a CRITICAL emergency is authenticated by an authorized municipal officer or corroborated IoT alert:
1. An `emergency_override` flag is set on the target ward or facility record.
2. The standard multi-criteria score is retained in the record as `base_priority_score` to preserve mathematical auditability.
3. The effective dispatch score is assigned as `100.0` with `tier: 1`.
4. The API response explicitly populates:
   ```json
   {
     "is_emergency": true,
     "emergency_tier": "CRITICAL",
     "emergency_reason": "hospital_reserve_under_4_hours",
     "base_priority_score": 64.2,
     "effective_priority_score": 100.0,
     "audit_log_id": "EMERG-20260918-0042"
   }
   ```
5. In the UI Command Center, the card or table row displays a pulsating red alert badge indicating the emergency reason and audit trail.
