# WaterFlow OS — Five-System Decoupled Architecture Model (Phase 4)

**Document Version:** `3.0.0-research`  
**Classification:** Municipal Systems Decoupled Architecture  
**Guiding Principle:** Strict separation of physical availability, customer demand, humanitarian equity, operational emergencies, and transport logistics.

---

## 1. Architectural Philosophy: Why Five Separate Systems?

Prior versions and legacy municipal spreadsheets conflated physical transport distances, pipe bursts, population counts, and vehicle limits into a single ad-hoc heuristic score. 

WaterFlow OS strictly decouples the municipal operational pipeline into **five distinct mathematical stages**:

```
 ┌─────────────────────────────────────────────────────────┐
 │                   STAGE 1: WATER SOURCES                │
 │       - 7 Impoundment Lakes (Tansa, Vaitarna, etc.)     │
 │       - Inflow rates, Dam storage, Environmental flows  │
 └────────────────────────────┬────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │               STAGE 2: SUPPLY & MASS BALANCE            │
 │       - Filtration capacity (Bhandup 2,810 MLD)         │
 │       - Transmission losses & Non-Revenue Water (NRW)   │
 │       - Master Balancing Reservoir (MBR) storage        │
 │       ===> OUTPUT: USABLE POTABLE WATER BUDGET          │
 └────────────────────────────┬────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │               STAGE 3: DEMAND FORECASTING               │
 │       - Population baseline & Household density         │
 │       - Exogenous weather elasticity (IMD Max Temp)     │
 │       - Autoregressive lag demand & rolling deficits    │
 │       ===> OUTPUT: EXPECTED WARD UNMET DEMAND (D_i)     │
 └────────────────────────────┬────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │          STAGE 4: EQUITY & SERVICE DEFICIT ENGINE       │
 │       - Slum vulnerability ratio (V_i)                  │
 │       - Dry pipe outage duration (U_i)                  │
 │       - Historical service gap (H_i)                    │
 │       - Critical facility reserve pre-emption (F_i)     │
 │       - Dynamic sensor failure corroboration (C_i)      │
 │       ===> OUTPUT: ALLOCATION QUEUE & QUOTAS (A_i)      │
 └────────────────────────────┬────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │         STAGE 5: EMERGENCY & COMPLAINT PREDICTION       │
 │       - Deduplicated complaint velocity (dC/dt)         │
 │       - Hydrostatic pressure drop anomalies             │
 │       - Contamination & hospital alert overrides        │
 │       ===> OUTPUT: PRIORITY PRE-EMPTION FLAGS           │
 └────────────────────────────┬────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │            STAGE 6: FLEET LOGISTICS & ROUTING           │
 │       - Tanker payload constraints (6k, 9k, 10k L)      │
 │       - OpenStreetMap road network & flood bottlenecks  │
 │       - Multi-trip Capacitated Vehicle Routing (CVRP)   │
 │       ===> OUTPUT: OPTIMAL VEHICLE DISPATCH MANIFESTS   │
 └────────────────────────────┬────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │          STAGE 7: FIELD DELIVERY & CLOSED-LOOP AUDIT    │
 │       - Citizen 4-digit OTP handshake                   │
 │       - Water quality verification (TDS / pH / NTU)     │
 │       - Telemetry loopback & decision audit logging     │
 └─────────────────────────────────────────────────────────┘
```

---

## 2. Decoupled Subsystem Specifications

### System 1: Water Availability / Supply Engine (`water_engine/supply_model.py`)
- **Question Answered:** *How much clean drinking water is physically available to dispense today?*
- **Mathematical Form:**
  $$\text{usable\_potable\_supply} = \min(S_{\text{raw}}, C_{\text{treat}}, C_{\text{trans}}, C_{\text{storage}}, C_{\text{pump}}) - \text{Losses}_{\text{NRW}}$$
- **Outputs:** Total municipal water budget ($S_{\text{total}}$ in Liters), depot allocation ceilings.

### System 2: Demand Forecasting Engine (`evaluation/demand_forecast.py`)
- **Question Answered:** *How much water will each community consume in the next 24 hours?*
- **Mathematical Form:** Autoregressive time-series model incorporating population scale, seasonal weather, and outage lag features.
- **Outputs:** Target ward demand ($D_i$ in Liters).

### System 3: Equity & Service Deficit Engine (`config/allocation_policy.yaml`)
- **Question Answered:** *Given finite water ($S_{\text{total}} < \sum D_i$), who receives relief first and in what volume?*
- **Mathematical Form:** Multi-attribute utility ranking bounded by strict supply, demand, and non-negativity constraints.
- **Guarantees:** Zero identity-based discrimination; distance removed from need formula.

### System 4: Complaint Intelligence & Emergency Prediction (`complaint_engine/`)
- **Question Answered:** *Is there an active or imminent catastrophe (trunk burst, hospital tank dry, sewage suction)?*
- **Mathematical Form:** Spatiotemporal clustering + statistical anomaly detection on line pressure and complaint velocity.
- **Outputs:** Immediate emergency pre-emption dispatch.

### System 5: Logistics & Fleet Routing Engine (`water_engine/routing_optimizer.py`)
- **Question Answered:** *How do we transport the allocated volumes with minimal road time without exceeding truck capacities?*
- **Mathematical Form:** Capacitated Vehicle Routing Problem (CVRP) with time windows and multi-trip support.
- **Outputs:** Turn-by-turn waypoint route sheets, assigned tanker transponders, and ETA schedules.
