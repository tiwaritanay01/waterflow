# WaterFlow OS — Master Factor Catalogue (Phase 1)

**Version:** `3.0.0-research`  
**Classification:** Municipal Systems Architecture & Variable Ontology  
**Scope:** Comprehensive 32-Domain Structured Factor Dictionary (Domains A through AF)  
**Machine-Readable Source:** `data/factor_catalogue.yaml`

---

## 1. Domain Coverage Matrix (32 Domains)

| Domain Identifier | Domain Name | Classification | Primary System Role |
| :--- | :--- | :---: | :--- |
| **A. HYDROLOGY** | Catchment Inflow & Runoff | Physical | Water Availability & Mass Balance |
| **B. RAINFALL** | Lake Catchment & Urban Downpours | Physical | Supply Replenishment & Flood Blockages |
| **C. CLIMATE** | Ambient Temperature & Heatwaves | Physical | Short-Term Demand Elasticity |
| **D. SURFACE WATER** | 7 Supply Lakes Useful Storage | Physical | Municipal Bulk Budget Ceiling |
| **E. GROUNDWATER** | Borewell Potability & Salinity | Physical | Coastal Salinity Non-Potable Boundary |
| **F. RESERVOIRS/STORAGE**| Master Balancing Reservoirs (MBR) | Physical | Tanker Filling Gantry Throughput |
| **G. WATER QUALITY** | Effluent Turbidity (NTU), Pathogens | Physical | Potable Safety Gate (BIS 10500) |
| **H. TREATMENT** | Bhandup & Panjrapur Plants | Physical | Maximum Potable Treatment Ceiling |
| **I. TRANSMISSION** | Tansa & Vaitarna Trunk Mains | Physical | Structural Burst & Rupture Detection |
| **J. DISTRIBUTION** | Intermittent Rationing Timetables | Governance | Baseline Piped Water Access Window |
| **K. PRESSURE** | Hydrostatic Line Pressure (bar) | Physical | Tail-End Elevated Slum Deprivation |
| **L. LEAKAGE / NRW** | Non-Revenue Water & Pipe Losses | Physical/Gov | Physical Volume Deduction in Supply |
| **M. POPULATION** | Ward Resident Population (2026) | Social | Absolute Volume Scaling Baseline |
| **N. DEMOGRAPHICS** | Child & Elderly Dependency | Social | Physiological Dehydration Vulnerability |
| **O. HOUSEHOLDS** | Average Household Size | Social | Vessel Storage Sharing & Depletion Rate |
| **P. SOCIOECONOMIC** | Informal Daily-Wage Labor Share | Economic | Economic Inability to Buy Private Tankers |
| **Q. INFORMAL SETTLEMENTS**| Slum Population Share | Social/Infra | Structural Lack of Piped Connections |
| **R. HEALTH** | Waterborne Disease Incidence | Health | Epidemiological Outbreak Mitigation |
| **S. CRITICAL FACILITIES**| Hospitals, Dialysis Units, Schools | Infrastructure | Life-Safety Pre-Emptive Water Reserve |
| **T. WATER DEMAND** | Unfulfilled Emergency Demand (L) | Operational | Primary Target Allocation Variable |
| **U. HISTORICAL SERVICE**| Consecutive Dry Outage Days | Operational | Cumulative Deprivation & Memory |
| **V. COMPLAINTS** | Deduplicated Complaint Velocity | Operational | Crowdsourced Sensor Failure Corroboration |
| **W. EMERGENCY** | Contamination Alert & Trunk Burst | Operational | Emergency Pre-Emption Trigger |
| **X. GOVERNANCE** | Ward Sluice Valve Operations | Governance | Controlled Zoning & Throttling Status |
| **Y. TANKERS** | Active Fleet Payload Capacity | Logistical | Hard Delivery Capacity Ceiling |
| **Z. TRANSPORT** | Corridor Transit Durations & Jams | Logistical | CVRP Cost Matrix in Fleet Routing |
| **AA. ENERGY** | Booster Pumping Grid Power | Infrastructure | Pumping Throughput & Pressure Loss |
| **AB. ECONOMICS** | Commercial Tanker Mafia Spot Price | Economic | Fairness Auditing & Market Failure Flag |
| **AC. WATER REUSE** | Reclaimed STP Effluent Volume | Physical | Potable Conservation via Substitution |
| **AD. COMPETITION** | Commercial / Industrial Quota | Governance | Re-allocation Buffer During Severe Deficit |
| **AE. ENVIRONMENTAL** | Mandatory Ecological River Flows | Regulatory | Legal Boundary on Dam Diversion |
| **AF. URBANIZATION** | Impervious Surface Fraction | Environmental | Microclimate Heat Island Amplification |

---

## 2. Factor Attribute Specifications

For every candidate variable documented in `data/factor_catalogue.yaml`, 24 rigorous attributes are recorded:
1. `variable_name`: Unique programmatic identifier.
2. `definition`: Precise operational and mathematical meaning.
3. `domain`: One of the 32 designated sectors (A to AF).
4. `physical_social_economic_governance_classification`: Ontological nature.
5. `unit`: Standard SI or municipal operational measurement unit.
6. `spatial_scale`: Resolution (Citywide, Basin, Ward, Valve Chamber, Point Facility).
7. `temporal_scale`: Frequency (Real-time, Hourly, Daily, Weekly, Decennial).
8. `source`: Data-producing agency (BMC, IMD, Census India, OSM).
9. `source_url`: Verifiable provenance web link.
10. `india_relevance`: National public-sector context.
11. `mumbai_relevance`: Specific operational context in Greater Mumbai.
12. `status_classification`: `REAL`, `REAL_DERIVED`, `SYNTHETIC_SEEDED`, `ENGINEERING_ASSUMPTION`, or `SCENARIO_PARAMETER`.
13. `expected_relationship`: Directional response and mechanics.
14. `possible_use`: allocation, demand_prediction, emergency_prediction, routing, supply_forecast, monitoring, planning.
15. `hard_constraint_candidate`: True if it acts as a physical or policy bound.
16. `policy_weight_candidate`: True if it is a candidate for weighted multi-attribute ranking.
17. `ml_feature_candidate`: True if suitable for statistical or machine learning estimation.
18. `routing_feature_candidate`: True if suitable for CVRP cost or node modeling.
19. `potential_bias`: Explicit measurement or sociological bias disclosure.
20. `missing_data_risk`: Risk assessment of telemetry failure or unobserved values.
21. `double_counting_risk`: Identification of co-linear or mathematically redundant variables.
22. `data_quality`: High, Medium, or Low observational reliability.
23. `freshness`: Update latency.
24. `justification`: Defensible engineering rationale for consideration.
