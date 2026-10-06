# WaterFlow OS — Presentation Guide

## Opening story

> Imagine it is a hot day in Mumbai. A trunk line fails, water supply drops, complaints start arriving through phone calls, WhatsApp, and the citizen portal, and hospitals still need uninterrupted water. The municipality has limited tankers and limited safe water. The real question is not just: **Where should we send a tanker first?** It is: **How do we make that decision fairly, physically safely, quickly, and in a way we can explain later?**

That is the problem WaterFlow OS solves.

WaterFlow OS is a municipal water decision-support system for Mumbai's 24 BMC wards. It brings together water availability, demand, citizen complaints, vulnerability, critical facilities, tanker routing, delivery verification, and human approval into one operational flow. It does not replace the municipal officer; it gives the officer a transparent, evidence-based recommendation and keeps critical decisions under human control.

---

## 1. The problem with current systems

Today, water-crisis response can be fragmented. Complaints arrive through helplines, WhatsApp, local offices, or calls to elected representatives. Supply information, tanker status, and complaint records can sit in different systems. In a shortage, dispatch can become first-come-first-served, politically influenced, or based only on which area is nearest to a tanker.

This creates three problems:

1. **Need is confused with convenience.** A nearby area may receive water before a more vulnerable area.
2. **There is little transparency.** Citizens and officers cannot easily answer: “Why did this ward get water first?”
3. **The last mile is weak.** Even if a tanker is assigned, there may be no strong proof that water reached the correct place, quantity, and beneficiary.

WaterFlow OS turns this fragmented response into one accountable decision loop.

---

## 2. The core idea: separate fairness from logistics

> Our biggest design decision was to separate fairness from logistics. Distance decides the best route, not whose thirst matters more.

```text
Data and reports
      ↓
1. Physical water available?
      ↓
2. How much water is required?
      ↓
3. Which communities have the highest need?
      ↓
4. How should scarce safe water be allocated?
      ↓
5. How should tankers deliver it fastest?
      ↓
Verification, audit, and human governance
```

### Layer 1 — Supply: how much safe water is truly available?

We do not assume that lake water automatically becomes deliverable water. Water must pass through treatment, transmission, pumping, storage, and distribution. At every stage, capacity or loss can reduce what is actually available.

\[
\text{Raw Source} =
\min(\text{daily draw rate}, \frac{\text{lake storage}}{10})
+ \max(0,\text{catchment inflow} - \text{environmental release})
\]

\[
\text{Treated Water} =
\min(\text{raw source}, \text{treatment capacity})
\times (1-\text{backwash loss})
\]

\[
\text{Net Potable Water} =
\text{distribution water} \times (1-\text{NRW loss})
\]

\[
\text{Usable Water} =
\text{Net Potable Water} \times (1-\text{emergency reserve})
\]

Even if a reservoir has water, treatment capacity, a burst transmission main, pumping capacity, or leakage can be the actual bottleneck. This prevents the system from promising water that the city cannot physically deliver.

Research basis:

- Mumbai reservoir and treatment context: MCGM/BMC reference material.
- Bhandup treatment capacity: 2,810 MLD; Panjrapur: 1,365 MLD.
- Non-Revenue Water assumption: 28%, within the documented 25–35% Mumbai-related range.
- A reserve is retained for emergency, firefighting, and healthcare situations.

### Layer 2 — Demand: how much water is required?

We estimate baseline need by population and the urban service benchmark.

\[
\text{Baseline Demand (MLD)} =
\frac{\text{Population} \times 135\text{ LPCD}}{1,000,000}
\]

135 LPCD means 135 litres per capita per day, based on the Ministry of Housing and Urban Affairs service benchmark. The model can then increase demand during heatwaves, festivals, outages, or emergencies.

\[
\text{Adjusted Demand} =
\text{Base Demand}
\times \text{Heat Multiplier}
\times \text{Monsoon Multiplier}
\]

In a heatwave, demand rises. During severe rain, tanker demand can rise too because pipe damage, contamination risk, and flooded roads affect service.

### Layer 3 — Need: who should be prioritized?

This is the ethical heart of WaterFlow OS. Priority is calculated using conditions that reflect human need — not tanker distance.

\[
P_i = 100[
0.25V_i + 0.25U_i + 0.20H_i + 0.10R_i + 0.10C_i + 0.10F_i
]
\]

Where:

- **V**: socio-spatial vulnerability
- **U**: unmet demand
- **H**: historical service deficit
- **R**: service reliability deficit
- **C**: verified, deduplicated complaint evidence
- **F**: critical-facility requirement

The score is between 0 and 100. A higher score means higher priority. An emergency can receive a score of 100, but this is recorded in the audit trail.

| Score | Tier | Meaning |
|---:|---|---|
| 75–100 | Tier 1 | Critical |
| 55–74.99 | Tier 2 | Elevated |
| 35–54.99 | Tier 3 | Moderate |
| Below 35 | Tier 4 | Nominal |

**Example: Ward M/East (Govandi/Mankhurd)**

Suppose the ward has vulnerability \(0.82\), maximum unmet demand, historical deficit \(0.73\), reliability deficit \(0.60\), complaint score \(6.56/10\), and critical-facility pressure \(0.80\). The explainability panel can show every contribution:

- Vulnerability: \(0.82 \times 0.25 \times 100 = 20.5\)
- Unmet demand: \(1.00 \times 0.25 \times 100 = 25\)
- Historical deficit: \(0.73 \times 0.20 \times 100 = 14.6\)
- Reliability: \(0.60 \times 0.10 \times 100 = 6\)
- Complaints: \(0.656 \times 0.10 \times 100 = 6.56\)
- Critical facilities: \(0.80 \times 0.10 \times 100 = 8\)

The base priority is about **80.7/100**. If there is an active emergency, the documented emergency override raises it to 100, with a recorded reason.

**Key defence:** Distance is deliberately excluded from this score. A distant community may be harder to serve, but that does not make its need less important.

### Layer 4 — Allocation: how much water does each place receive?

After calculating need, the system allocates water under hard physical and safety constraints. It uses linear programming, with a deterministic priority-based fallback.

\[
\max \sum_i
\left(
\frac{P_i}{100} + \text{emergency/tier bonus}
\right)x_i
\]

Subject to:

\[
x_i \geq 0
\]

\[
x_i \leq \text{unmet demand}_i
\]

\[
\sum_i x_i \leq
\text{available supply}
\times(1-\text{reserve fraction})
\]

If the water-quality safety check fails, potable allocation is locked to zero. The system therefore cannot allocate more water than exists, more than a location needs, or unsafe water.

Storage-aware safeguard:

\[
\text{Recommended Delivery} =
\min(
\text{storage headroom},
\text{unmet demand},
\text{available budget}
)
\]

This prevents sending water to a tank that is already full while another community remains dry.

### Layer 5 — Routing: how does water reach people efficiently?

Only after allocation is decided do we optimize routes. The routing module considers tanker capacity, emergency stops, distance, traffic speed, unloading time, and road disruptions.

\[
\text{ETA} =
\frac{\text{distance}}{\text{traffic speed}} \times 60
+ \text{depot queue}
+ \text{loading time}
+ \text{unloading time}
\]

The routing approach is capacitated vehicle routing: emergency stops are protected first, normal stops are grouped geographically, and 2-opt route improvement reduces unnecessary route crossings.

---

## 3. End-to-end application flow

### A. Citizen side

A citizen reports no water, low pressure, contamination, or a pipe burst through the bilingual English/Marathi portal. The portal captures GPS, locality, issue type, phone number, optional photo, and can show queue or mission status. WhatsApp intake can also classify Marathi, Hindi, and English water complaints.

### B. Complaint intelligence

The system checks whether reports are genuine or spam. It filters duplicate IDs, repeated reports from the same person within 120 minutes, and spatially clustered reports within 300 metres. It still preserves corroboration: multiple nearby citizens reporting the same issue becomes stronger evidence, not repeated priority points.

### C. Command center

Municipal officers see a live operational picture: supply versus demand, deficit, complaint clusters, critical facilities, tanker availability, alerts, ward map, priority queue, fleet status, and equity impact.

### D. Decision and dispatch

The system calculates a transparent ward priority, proposes allocation, then creates tanker missions. The command center shows the **why**: every factor, weight, score, constraint, and decision ID.

### E. Field-worker terminal

The tanker worker receives a mission with location, route, volume, ETA, and recipient details. At delivery, the worker records water-quality values, captures a photo, confirms recipient OTP, and sends GPS evidence.

### F. Delivery verification and audit

The system can validate OTP, geofence compliance, photo evidence, water flow/tank evidence in the demonstrator, and delivery status. This creates an auditable record for municipal review and contractor-payment workflows.

### G. Offline resilience

Field delivery cannot stop because a mobile network is weak. The worker terminal caches missions and queues actions in IndexedDB. When connectivity returns, it synchronizes them.

### H. Governance and human control

WaterFlow OS is decision support, not uncontrolled automation.

- **Tier 1:** narrow, low-risk, reversible actions may be automated.
- **Tier 2:** an officer must review.
- **Tier 3:** critical actions — such as using strategic reserves, reallocating hospital supply, or responding to infrastructure failure — need executive authorization.

There is also a kill switch. Every decision is traceable.

---

## 4. Features to show in the demo

Use this order for a strong 5–7 minute demo:

1. **Landing/login:** Separate experiences for administrator, citizen, and field worker.
2. **Live Overview:** Supply, demand, shortage, alerts, complaints, and available fleet.
3. **GIS Dispatch:** Wards, depots, tankers, and active missions on the map.
4. **Allocation Queue:** Open a high-priority ward and explain the factor-by-factor score.
5. **Fleet & Logistics:** Tankers, capacity, routes, ETA, and emergency handling.
6. **Citizen Portal:** Submit and track a grievance; show GPS and bilingual support.
7. **Worker Terminal:** Mission, offline mode, OTP, photo, quality readings, and delivery confirmation.
8. **Governance Gate:** Tier 1/2/3 decisions and approval authority.
9. **Policy Sandbox:** Simulate heatwave, supply reduction, trunk-main failure, or flood disruption.
10. **Network Resilience:** Show how a failed line affects downstream wards and critical facilities.

---

## 5. Why our solution is better

Do not say “current systems are bad.” Say: **WaterFlow OS improves on fragmented or first-come-first-served emergency response in five ways.**

| Typical fragmented response | WaterFlow OS |
|---|---|
| Complaints, tanker data, and supply data are separate | One operational decision flow |
| First-come-first-served can reward reporting speed | Need-based priority with explainable factors |
| Distance may influence who gets help | Distance is used only for routing, not human priority |
| Manual decision-making is difficult during shortages | Hard constraints and scenario recomputation |
| Delivery can be difficult to verify | GPS, OTP, photo, quality logging, and audit record |
| One-size-fits-all automation can be risky | Tiered human-in-the-loop governance |
| Field connectivity can fail | Offline mission cache and deferred sync |
| Policies are hard to test before acting | Sandbox for heatwave, outage, flood, and supply-drop scenarios |

### Benchmark statement

In the project's deterministic scarcity benchmark, all approaches faced the same **160,000-litre supply against 240,000-litre demand**. First-Come-First-Served achieved **50% vulnerable-group coverage**, while WaterFlow's need-based policy achieved **100% vulnerable-group coverage**. The benefit is not magically creating water; it is making the scarce-water decision fairer, safer, and explainable.

For the polished demo scenario, say:

> In the demo scenario, WaterFlow protects high-vulnerability coverage at 100%, versus 66% under the FCFS baseline, and shows lower emergency response delay through planned routing. These are simulation results, not a claim of live city deployment.

---

## 6. Research behind the formulae

We did not invent arbitrary numbers. The project documents data provenance and separates real references, derived values, engineering assumptions, and synthetic demonstration data.

- **BMC/MCGM:** Mumbai reservoir, ward, and bulk water-infrastructure context.
- **Census India 2011:** Ward population and slum-population reference data.
- **MoHUA Service Level Benchmarks:** 135 LPCD baseline.
- **IMD:** Heatwave and weather context.
- **BIS IS 10500:** Drinking-water safety criteria.
- **OpenStreetMap:** Routing/network reference data.
- **MCGM 1916 and grievance workflow:** Complaint-operation context.

Real geographic and reference data are clearly separated from seeded synthetic operating data. The synthetic data is reproducible using **seed 42**, so the same benchmark produces the same result. This is important because a municipal decision system must be auditable, not just visually impressive.

---

## 7. Honest limitations

This is a deployable operational demonstrator, not a claim that it is already controlling Mumbai's live water network.

- Operational demand, tanker telemetry, some facility records, and crisis cases are seeded simulation data.
- The core allocation is primarily ward/sub-ward level; neighbourhood-level deployment needs standpost meters and finer GIS data.
- The current quality lockout is a safety boolean; a production release should validate every BIS parameter independently.
- Real rollout requires validated SCADA feeds, live GPS, current population estimates, secure role-based authentication, municipal approval, and field pilot testing.
- Narrow lanes may need mini-tankers or hose-based final delivery.
- Complaint reporting can be unequal across communities; this is why complaint count is not the only priority signal.

> Our claim is not that software can create water. Our claim is that, when water is scarce, software can help the city make a better, fairer, safer, and more accountable decision.

---

## 8. Strong closing

WaterFlow OS changes municipal water response from a reactive tanker-dispatch process into a complete accountability loop:

\[
\text{Observe} \rightarrow
\text{Validate} \rightarrow
\text{Prioritize} \rightarrow
\text{Allocate} \rightarrow
\text{Route} \rightarrow
\text{Verify} \rightarrow
\text{Audit}
\]

It protects vulnerable communities, respects engineering constraints, keeps humans in control of critical actions, and explains every decision. That is why WaterFlow OS is not just a dashboard; it is a municipal water-governance system.

---

## 9. Likely judge questions

### Why use AI if the formula is rule-based?

The core high-stakes allocation is deliberately explainable and constraint-based. AI-assisted parts support forecasting, complaint/photo triage, and scenario analysis. We chose transparency over a black-box allocation model.

### Why does vulnerability matter?

Equal allocation is not always equitable. A community with unreliable piped supply, chronic deficits, and critical health needs suffers more from the same shortage.

### Could the system be biased?

Yes, any decision system can be biased if inputs are poor. We reduce that risk by using multiple signals, deduplicating complaints, separating complaint evidence from structural need, auditing outcomes, versioning policies, and requiring human approval for critical actions.

### Why not send tankers to the nearest locations first?

Nearest-first improves operational convenience but can disadvantage communities with higher humanitarian need. Our design separates allocation fairness from routing efficiency.

### What happens if there is insufficient water for everyone?

The system does not hide scarcity. It calculates the deficit, protects critical needs according to policy, keeps a reserve where required, reports unmet demand, and lets officials simulate alternatives.

### How can you prove delivery?

Through the field workflow: assigned mission, GPS/geofence, OTP, photo evidence, water-quality log, timestamp, and audit record.

### What makes it scalable?

The architecture separates frontend portals, gateway APIs, optimization services, and PostGIS-ready persistence. We can add live SCADA, more wards, more tankers, and finer demand units without changing the decision principles.

---

## Project references

- `docs/DEMO_OPERATOR_RUNBOOK_v1.0.md`
- `docs/mathematical_model/WATERFLOW_MATHEMATICAL_SPEC_v1.0.md`
- `docs/research_evidence.md`
- `docs/final_limitations.md`
- `reports/benchmark_matrix.md`
