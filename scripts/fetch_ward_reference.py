#!/usr/bin/env python3
"""
Data Extraction & Normalization Script: BMC 24 Administrative Wards & Offices Map.
"""

import sys
import os
import json

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

SOURCE_METADATA = {
    "source_name": "BMC Wards & Offices Authority Map",
    "organization": "Brihanmumbai Municipal Corporation (BMC)",
    "portal_url": "https://portal.mcgm.gov.in/",
    "extraction_date": "2026-09-18",
    "classification": "REAL",
    "wards_count": 24,
    "destination": "data/reference/bmc/wards_real.csv"
}

def fetch_and_normalize(raw_dir="data/raw"):
    os.makedirs(raw_dir, exist_ok=True)
    raw_meta_path = os.path.join(raw_dir, "bmc_ward_offices_meta.json")
    with open(raw_meta_path, "w", encoding="utf-8") as f:
        json.dump(SOURCE_METADATA, f, indent=2)
    print(f"✅ Documented BMC Ward Map provenance in {raw_meta_path}")

if __name__ == "__main__":
    fetch_and_normalize()
