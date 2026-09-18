# WaterFlow OS — Dataset Documentation & Data Dictionary (Phase 18 & 19)

**Authoritative Policy Version:** `2.4.0-hardened`  
**Manifest:** `data/source_manifest.yaml`  
**Checksum Registry:** `data/VERSIONS.md`

---

## 1. Directory Structure & Partitioning

```
data/
├── raw/                 # Untouched external extractions and raw downloads
├── reference/           # Normalized authoritative municipal benchmarks
│   ├── bmc/             # 24 BMC wards, populations, and slum ratios
│   ├── imd/             # IMD coastal heatwave threshold criteria
│   └── osm/             # OpenStreetMap transit nodes, depots, bottlenecks
├── processed/           # Merged reference tables for backend ingestion
└── synthetic/           # Deterministic benchmark datasets (Seed 42)
    ├── requests.csv
    ├── complaints.csv
    ├── service_history.csv
    ├── tankers.csv
    ├── daily_water_balance.csv
    └── demand_history.csv
```

---

## 2. Reference Datasets (REAL & REAL_DERIVED)

### A. BMC Ward Population Reference (`data/reference/bmc/ward_population_real.csv`)
- **Classification:** `REAL` (Wards, Pop) & `REAL_DERIVED` (Slum Share)
- **Primary Source:** BMC Civic Diary 2026 / Census India 2011 Primary Census Abstract
- **Source URL:** https://portal.mcgm.gov.in/
- **Schema:**
  - `ward_id` (int): Internal numerical identifier (1 to 24)
  - `ward_name` (string): Official administrative alphanumeric code (e.g., "A", "M/East", "G/North")
  - `population` (int): BMC 2026 projected resident population
  - `pop_2011_census` (int): Official Census of India 2011 decennial population
  - `slum_population_2011` (int): Census 2011 enumeration within notified slum clusters
  - `slum_share` (float): Derived ratio $\frac{\text{slum\_population\_2011}}{\text{pop\_2011\_census}}$
  - `area_sq_km` (float): Geographic footprint in square kilometers
  - `density_per_sq_km` (float): Population density per square kilometer
  - `source_date` (string): "2026-01-01"
  - `source_url` (string): Official MCGM portal reference

### B. BMC Wards Centroids (`data/reference/bmc/wards_real.csv`)
- **Classification:** `REAL`
- **Primary Source:** BMC 24 Administrative Wards & Offices GIS Map
- **Schema:**
  - `ward_id` (int): 1 to 24
  - `ward_name` (string): Official ward name
  - `centroid_lat` (float): WGS84 latitude coordinate
  - `centroid_lng` (float): WGS84 longitude coordinate
  - `office_address` (string): Civic headquarter location
  - `assigned_depot` (string): Primary municipal water filling depot

### C. IMD Coastal Heatwave Criteria (`data/reference/imd/heatwave_criteria.json`)
- **Classification:** `REAL_REFERENCE`
- **Primary Source:** India Meteorological Department (IMD) Technical Guidelines
- **Rules:** Coastal station threshold $\ge 37^\circ\text{C}$ with departure $\ge +4.5^\circ\text{C}$. Used to calibrate `SCENARIO_PARAMETER` heatwave demand surges.

### D. OpenStreetMap Municipal Nodes (`data/reference/osm/mumbai_transit_nodes.json`)
- **Classification:** `REAL` (Open Database License - ODbL)
- **Primary Source:** OpenStreetMap Mumbai transit nodes & depot coordinates
- **Depots Included:** Bhandup Complex (Bhandup West), Veravali Hill Reservoir (Andheri East), Malabar Hill Reservoir (D Ward), Powai Master Reservoir.

---

## 3. Synthetic Benchmark Datasets (SYNTHETIC_SEEDED)

All synthetic datasets are generated via `scripts/generate_benchmark_data.py` using `numpy.random.default_rng(42)`.

### A. Requests (`data/synthetic/requests.csv`)
- **Scale:** 1,674 records across 35 operational days.
- **Fields:**
  - `request_id` (string): E.g., `REQ-2026-0001`
  - `ward_id` (string): Ward code
  - `settlement_type` (string): Informal / Slum, Chawl, Society, Commercial
  - `quantity_liters` (int): Requested volume (3,000 to 18,000 L)
  - `dry_pipe_hours` (float): Duration without municipal tap supply
  - `synthetic` (boolean): `true`
  - `seed` (int): `42`

### B. Complaints (`data/synthetic/complaints.csv`)
- **Scale:** 993 records.
- **Fields:**
  - `complaint_id` (string): E.g., `CMP-2026-0001`
  - `category` (string): `dry_tap`, `low_pressure`, `pipeline_burst`, `turbid_water`
  - `lat`, `lng` (float): Coordinates with intentional spatiotemporal clustering for duplicate testing
  - `is_duplicate` (boolean): Flag indicating repeated ticket from same cluster
  - `synthetic` (boolean): `true`

### C. Service History (`data/synthetic/service_history.csv`)
- **Scale:** 567 completed tanker delivery events.
- **Fields:**
  - `delivery_id`, `tanker_id`, `ward_id`, `delivered_liters`, `otp_verified`, `delivery_status`

### D. Tanker Fleet (`data/synthetic/tankers.csv`)
- **Scale:** 10 municipal relief tankers (T-01 through T-10).
- **Fields:**
  - `tanker_id`, `plate_number`, `capacity_liters`, `status`, `assigned_depot`

---

## 4. Checksum Verification Protocol

To verify dataset integrity and prevent silent mutation, run:
```bash
python tools/validate_waterflow.py
```
This automatically computes MD5 hashes of all tables and verifies that every table matches the authoritative registry in `data/VERSIONS.md`.
