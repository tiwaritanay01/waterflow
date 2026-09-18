# WaterFlow OS — Data Sources & Official Reference Registry

**Governance Directive:** Under no circumstances shall synthetic or simulated data be presented as official municipal observations. Every indicator used by the system must have a documented origin, explicit classification, and noted limitations.

---

## 1. Classification Definitions

| Classification | Meaning | Examples in WaterFlow OS |
| :--- | :--- | :--- |
| **REAL** | Verifiable data published directly by an official statutory body. | Ward boundaries, Census populations, Ward office addresses. |
| **REAL_DERIVED** | Strict mathematical derivations computed from REAL data. | Slum share (`slum_pop / total_pop`), population density. |
| **REAL_REFERENCE** | Documented standards, guidelines, or engineering manuals. | IMD coastal heatwave threshold, BMC tanker tender capacities. |
| **ENGINEERING_ASSUMPTION** | Explicit policy constants or engineering parameters. | Weight distribution (30% Vulnerability, 25% Unmet Demand, etc.). |
| **SCENARIO_PARAMETER** | Injected experimental variables used to stress-test policies. | Ambient temperature surge (+18%), flood bottleneck flags. |
| **SYNTHETIC_SEEDED** | Pseudo-random data generated with a fixed seed (`seed=42`). | Citizen complaint events, active tanker GPS transponder telemetry. |

---

## 2. Official Primary Sources

### Source A: BMC Civic Diary 2026 / MCGM Administrative Portal
* **Publishing Agency:** Brihanmumbai Municipal Corporation (BMC / MCGM), Maharashtra, India.
* **Access URL:** `https://portal.mcgm.gov.in/`
* **Coverage:** All 24 Administrative Wards (Colaba to Dahisar / Mulund).
* **Extracted Data:**
  * Ward Codes: A, B, C, D, E, F/N, F/S, G/N, G/S, H/E, H/W, K/E, K/W, L, M/E, M/W, N, P/N, P/S, R/C, R/N, R/S, S, T.
  * 2026 projected municipal populations and ward office coordinates.
* **Storage Location:** `data/reference/bmc/ward_population_real.csv` and `data/reference/bmc/wards_real.csv`.

### Source B: Census of India 2011 (PCA & Slum Census)
* **Publishing Agency:** Office of the Registrar General & Census Commissioner, Ministry of Home Affairs, Government of India.
* **Access URL:** `https://censusindia.gov.in/`
* **Coverage:** Greater Mumbai District (District Code 519).
* **Extracted Data:**
  * 2011 Total Population per Ward (12,442,373 total).
  * 2011 Slum Population per Ward (6,531,026 total).
  * 2011 Non-Slum Population per Ward (5,911,347 total).
* **Derived Indicator:**
  $$\text{Slum Share} = \frac{\text{Slum Population}_{2011}}{\text{Total Population}_{2011}}$$
  *Note:* Slum share is categorized as **REAL_DERIVED** because it is mathematically computed from official figures and not an independently published indicator.

### Source C: India Meteorological Department (IMD)
* **Publishing Agency:** India Meteorological Department, Ministry of Earth Sciences, Government of India.
* **Access URL:** `https://mausam.imd.gov.in/`
* **Applied Guidelines:**
  * For coastal stations like Mumbai (Colaba / Santacruz), a heatwave is declared when maximum temperature departure is $\ge 4.5^\circ\text{C}$ from normal and maximum temperature reaches $\ge 37.0^\circ\text{C}$.
* **Storage Location:** `data/reference/imd/heatwave_criteria.json`.

### Source D: OpenStreetMap (OSM)
* **Attribution:** © OpenStreetMap contributors (Open Database License 1.0).
* **Access URL:** `https://www.openstreetmap.org/copyright`
* **Extracted Data:**
  * Coordinates of municipal water mega-hubs (Bhandup, Veravali, Dadar, Trombay).
  * Key monsoon transit bottlenecks (Hindmata Junction, Milan Subway, Kurla lowlands).
* **Storage Location:** `data/reference/osm/mumbai_transit_nodes.json`.

---

## 3. Operational & Synthetic Boundaries

1. **No Live SCADA Feed:** WaterFlow OS connects to simulated SCADA telemetry representing dry pipe hours. In production, this requires integration with BMC Hydraulic Engineering Dept pressure sensors.
2. **Citizen Grievance Logs:** Due to privacy regulations under the Digital Personal Data Protection Act (DPDP), real citizen complaint phone numbers and home addresses are never harvested. All complaint tickets in this prototype are **SYNTHETIC_SEEDED** (`seed=42`).
3. **Tanker GPS Telemetry:** Active transponder coordinates are synthetically generated to demonstrate fleet tracking on Leaflet maps.
