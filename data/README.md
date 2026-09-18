# WaterFlow OS — Data Catalog & Directory Structure

This directory houses all reference, synthetic, and raw data assets utilized by the WaterFlow OS platform.

---

## Directory Organization

```
data/
├── raw/             # Unprocessed extraction metadata and statutory logs
├── reference/       # Official real reference data (BMC, Census, IMD, OSM)
│   ├── bmc/         # Real 24 BMC administrative ward population and boundaries
│   ├── imd/         # Official coastal heatwave criteria and warnings
│   └── osm/         # OpenStreetMap transit network nodes and attribution
├── synthetic/       # Deterministically generated benchmark scenarios (seed=42)
├── processed/       # Cached operational aggregates
├── source_manifest.yaml  # Field-level metadata and provenance classifications
├── README.md        # This catalog documentation
└── VERSIONS.md      # Checksums, generation versions, and lineage manifests
```

---

## Data Classifications

Every dataset in this system carries one of five immutable classifications:
1. `REAL`: Direct unedited statutory publication (e.g. Census India 2011, BMC Civic Diary).
2. `REAL_DERIVED`: Direct mathematical calculations from REAL indicators (e.g. Slum share = Slum pop / Total pop).
3. `REAL_REFERENCE`: Technical engineering standards (e.g. IMD coastal heatwave threshold $\ge 37^\circ\text{C}$).
4. `ENGINEERING_ASSUMPTION`: Configured operational constants (e.g. 5-factor unit-sum weights).
5. `SYNTHETIC_SEEDED`: Generated pseudo-randomly with fixed `seed=42`.

---

## Deterministic Reproduction

To re-create all synthetic benchmark datasets with exact byte-for-byte reproducibility:

```bash
py scripts/generate_benchmark_data.py --seed 42 --days 35
```
