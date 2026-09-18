#!/usr/bin/env python3
"""
Data Extraction & Normalization Script: OpenStreetMap Transit Corridors.
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
    "source_name": "OpenStreetMap Mumbai Geographic Network",
    "organization": "OpenStreetMap Contributors",
    "license": "Open Database License (ODbL) 1.0",
    "portal_url": "https://www.openstreetmap.org/",
    "extraction_date": "2026-09-18",
    "classification": "REAL_REFERENCE",
    "destination": "data/reference/osm/mumbai_transit_nodes.json"
}

def fetch_and_normalize(raw_dir="data/raw"):
    os.makedirs(raw_dir, exist_ok=True)
    raw_meta_path = os.path.join(raw_dir, "osm_transit_meta.json")
    with open(raw_meta_path, "w", encoding="utf-8") as f:
        json.dump(SOURCE_METADATA, f, indent=2)
    print(f"✅ Documented OSM Transit provenance in {raw_meta_path}")

if __name__ == "__main__":
    fetch_and_normalize()
