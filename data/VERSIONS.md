# WaterFlow OS — Dataset Versions & Cryptographic Checksums

**Generation Policy:** Seed = `42`  
**Generator Engine:** `scripts/generate_benchmark_data.py` (v2.0.0)  
**Verification Date:** 2026-09-18  

---

## 1. Official Reference Datasets

| File Path | Classification | Source | Version | MD5 Checksum |
| :--- | :---: | :--- | :---: | :--- |
| `data/reference/bmc/ward_population_real.csv` | `REAL` / `REAL_DERIVED` | BMC Civic Diary 2026 / Census 2011 | 2026.1 | `d40cc0a62d78d757f98f627786a1dbdc` |
| `data/reference/bmc/wards_real.csv` | `REAL` | BMC Wards & Offices Map | 2026.1 | `14349a829af83bcc8f21b317bce09ee8` |
| `data/reference/imd/heatwave_criteria.json` | `REAL_REFERENCE` | IMD Coastal Guidelines | 2024.1 | `f44346731ab243e8c718156597f23747` |
| `data/reference/osm/mumbai_transit_nodes.json` | `REAL_REFERENCE` | OpenStreetMap ODbL | 2026.1 | `d859aa2f3543e998106c1d727f0e8f80` |

---

## 2. Deterministic Synthetic Benchmark Datasets

*All datasets below were generated using `numpy.random.default_rng(42)` on 2026-09-18.*

| File Path | Classification | Scale | Seed | MD5 Checksum |
| :--- | :---: | :---: | :---: | :--- |
| `data/synthetic/requests.csv` | `SYNTHETIC_SEEDED` | 1,674 rows | 42 | `38e94178dc5295f8a806ec87b30a9de4` |
| `data/synthetic/complaints.csv` | `SYNTHETIC_SEEDED` | 993 rows | 42 | `70d25365c93ca392dadc79b58800d18f` |
| `data/synthetic/service_history.csv` | `SYNTHETIC_SEEDED` | 567 rows | 42 | `5099355faf780d103b61f8f380357fe9` |
| `data/synthetic/tankers.csv` | `SYNTHETIC_SEEDED` | 10 tankers | 42 | `265b2aba80265a8f1184211a613a0ef9` |
| `data/synthetic/daily_water_balance.csv` | `SYNTHETIC_SEEDED` | 35 days | 42 | `6553c29248af681e0bee5713462793b0` |
| `data/synthetic/demand_history.csv` | `SYNTHETIC_SEEDED` | 840 ward-days | 42 | `a3b0faa93a9f4341493ac5a91cfec4fd` |
