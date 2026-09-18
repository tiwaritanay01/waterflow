#!/usr/bin/env python3
"""
WaterFlow OS — Deterministic Synthetic Benchmark Data Generator
Generates reproducible synthetic historical datasets modeling the 6 core scenarios
for the 24 BMC administrative wards.

Usage:
    py scripts/generate_benchmark_data.py [--seed 42] [--days 35]
"""

import os
import sys
import argparse
import csv
from datetime import datetime, timedelta
import numpy as np

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

GENERATOR_VERSION = "2.0.0"
DEFAULT_SEED = 42

# 24 BMC Administrative Wards reference summary
BMC_WARDS = [
    {"ward_id": 1,  "ward_code": "M/E", "name": "Govandi / Mankhurd / Shivaji Nagar", "vulnerability": 0.96, "pop": 807720, "slum_pct": 0.82, "base_demand": 32000, "lat": 19.0550, "lng": 72.9180, "depot_dist": 4.8},
    {"ward_id": 2,  "ward_code": "G/N", "name": "Dharavi / Mahim / Dadar West",       "vulnerability": 0.93, "pop": 599039, "slum_pct": 0.74, "base_demand": 28000, "lat": 19.0430, "lng": 72.8460, "depot_dist": 3.6},
    {"ward_id": 3,  "ward_code": "L",   "name": "Kurla / Asalpha / Sakinaka",         "vulnerability": 0.88, "pop": 902226, "slum_pct": 0.68, "base_demand": 24000, "lat": 19.0720, "lng": 72.8820, "depot_dist": 6.2},
    {"ward_id": 4,  "ward_code": "P/N", "name": "Malad / Marve / Malvani",             "vulnerability": 0.79, "pop": 946457, "slum_pct": 0.58, "base_demand": 20000, "lat": 19.1860, "lng": 72.8480, "depot_dist": 11.4},
    {"ward_id": 5,  "ward_code": "F/N", "name": "Matunga / Sion / Wadala",             "vulnerability": 0.74, "pop": 529003, "slum_pct": 0.52, "base_demand": 16000, "lat": 19.0270, "lng": 72.8570, "depot_dist": 3.2},
    {"ward_id": 6,  "ward_code": "H/E", "name": "Bandra East / Santacruz East",       "vulnerability": 0.71, "pop": 557239, "slum_pct": 0.49, "base_demand": 14000, "lat": 19.0620, "lng": 72.8510, "depot_dist": 5.4},
    {"ward_id": 7,  "ward_code": "S",   "name": "Bhandup / Kanjurmarg / Powai",       "vulnerability": 0.69, "pop": 743783, "slum_pct": 0.55, "base_demand": 15000, "lat": 19.1410, "lng": 72.9280, "depot_dist": 1.2},
    {"ward_id": 8,  "ward_code": "K/E", "name": "Andheri East / Marol",               "vulnerability": 0.65, "pop": 823885, "slum_pct": 0.45, "base_demand": 13000, "lat": 19.1136, "lng": 72.8697, "depot_dist": 2.8},
    {"ward_id": 9,  "ward_code": "N",   "name": "Ghatkopar / Pant Nagar",             "vulnerability": 0.61, "pop": 622853, "slum_pct": 0.42, "base_demand": 11000, "lat": 19.0830, "lng": 72.9080, "depot_dist": 4.5},
    {"ward_id": 10, "ward_code": "P/S", "name": "Goregaon West & East",               "vulnerability": 0.58, "pop": 463507, "slum_pct": 0.40, "base_demand": 10000, "lat": 19.1620, "lng": 72.8440, "depot_dist": 9.2},
    {"ward_id": 11, "ward_code": "M/W", "name": "Chembur West / Tilak Nagar",         "vulnerability": 0.55, "pop": 411893, "slum_pct": 0.44, "base_demand": 9000,  "lat": 19.0610, "lng": 72.8980, "depot_dist": 3.8},
    {"ward_id": 12, "ward_code": "R/S", "name": "Kandivali West & East",             "vulnerability": 0.52, "pop": 691229, "slum_pct": 0.38, "base_demand": 8500,  "lat": 19.2060, "lng": 72.8510, "depot_dist": 13.5},
    {"ward_id": 13, "ward_code": "T",   "name": "Mulund / Nahur",                     "vulnerability": 0.48, "pop": 341463, "slum_pct": 0.28, "base_demand": 7500,  "lat": 19.1720, "lng": 72.9560, "depot_dist": 3.4},
    {"ward_id": 14, "ward_code": "R/C", "name": "Borivali / Gorai",                   "vulnerability": 0.46, "pop": 562162, "slum_pct": 0.31, "base_demand": 7000,  "lat": 19.2290, "lng": 72.8570, "depot_dist": 15.2},
    {"ward_id": 15, "ward_code": "K/W", "name": "Andheri West / Versova",             "vulnerability": 0.44, "pop": 749336, "slum_pct": 0.34, "base_demand": 6000,  "lat": 19.1280, "lng": 72.8300, "depot_dist": 6.6},
    {"ward_id": 16, "ward_code": "R/N", "name": "Dahisar / Mandapeshwar",             "vulnerability": 0.42, "pop": 431368, "slum_pct": 0.42, "base_demand": 6000,  "lat": 19.2540, "lng": 72.8590, "depot_dist": 17.5},
    {"ward_id": 17, "ward_code": "E",   "name": "Byculla / Mazgaon / Nagpada",        "vulnerability": 0.48, "pop": 393286, "slum_pct": 0.48, "base_demand": 5500,  "lat": 18.9720, "lng": 72.8320, "depot_dist": 4.6},
    {"ward_id": 18, "ward_code": "F/S", "name": "Parel / Sewri / Lalbaug",            "vulnerability": 0.42, "pop": 360972, "slum_pct": 0.42, "base_demand": 5000,  "lat": 18.9980, "lng": 72.8440, "depot_dist": 3.6},
    {"ward_id": 19, "ward_code": "G/S", "name": "Worli / Lower Parel",                "vulnerability": 0.36, "pop": 379927, "slum_pct": 0.36, "base_demand": 4500,  "lat": 19.0060, "lng": 72.8210, "depot_dist": 5.0},
    {"ward_id": 20, "ward_code": "B",   "name": "Sandhurst Road / Dongri",            "vulnerability": 0.40, "pop": 127290, "slum_pct": 0.40, "base_demand": 3500,  "lat": 18.9515, "lng": 72.8380, "depot_dist": 5.6},
    {"ward_id": 21, "ward_code": "H/W", "name": "Bandra West / Khar",                 "vulnerability": 0.28, "pop": 307581, "slum_pct": 0.29, "base_demand": 3000,  "lat": 19.0580, "lng": 72.8320, "depot_dist": 6.8},
    {"ward_id": 22, "ward_code": "C",   "name": "Marine Lines / Chandanwadi",         "vulnerability": 0.32, "pop": 166161, "slum_pct": 0.32, "base_demand": 2500,  "lat": 18.9480, "lng": 72.8250, "depot_dist": 6.0},
    {"ward_id": 23, "ward_code": "A",   "name": "Colaba / Fort / Nariman Point",       "vulnerability": 0.22, "pop": 185014, "slum_pct": 0.22, "base_demand": 2000,  "lat": 18.9220, "lng": 72.8340, "depot_dist": 7.9},
    {"ward_id": 24, "ward_code": "D",   "name": "Malabar Hill / Walkeshwar",          "vulnerability": 0.16, "pop": 346866, "slum_pct": 0.16, "base_demand": 1500,  "lat": 18.9610, "lng": 72.8120, "depot_dist": 6.8}
]

TANKER_FLEET = [
    {"tanker_id": 1,  "transponder_id": "T-01", "capacity": 10000, "depot": "Bhandup Hub", "driver": "Anil Deshmukh"},
    {"tanker_id": 2,  "transponder_id": "T-02", "capacity": 12000, "depot": "Dadar Station", "driver": "Suresh Sawant"},
    {"tanker_id": 3,  "transponder_id": "T-03", "capacity": 8000,  "depot": "Veravali Booster", "driver": "Ramesh Gaikwad"},
    {"tanker_id": 4,  "transponder_id": "T-04", "capacity": 10000, "depot": "Dadar Station", "driver": "Santosh More"},
    {"tanker_id": 5,  "transponder_id": "T-05", "capacity": 8000,  "depot": "Trombay Reservoir", "driver": "Vinod Jadhav"},
    {"tanker_id": 6,  "transponder_id": "T-06", "capacity": 12000, "depot": "Bhandup Hub", "driver": "Manoj Shinde"},
    {"tanker_id": 7,  "transponder_id": "T-07", "capacity": 10000, "depot": "Veravali Booster", "driver": "Kailash Chavan"},
    {"tanker_id": 8,  "transponder_id": "T-08", "capacity": 10000, "depot": "Trombay Reservoir", "driver": "Rajesh Patil"},
    {"tanker_id": 9,  "transponder_id": "T-09", "capacity": 8000,  "depot": "Trombay Reservoir", "driver": "Dinesh Pawar"},
    {"tanker_id": 10, "transponder_id": "T-10", "capacity": 10000, "depot": "Bhandup Hub", "driver": "Vikram Solanki"}
]

def generate_datasets(output_dir: str, seed: int = DEFAULT_SEED, num_days: int = 35):
    """Generates all synthetic benchmark datasets using a deterministic generator."""
    rng = np.random.default_rng(seed)
    gen_time = "2026-09-18T12:00:00Z"
    start_date = datetime(2026, 8, 14, 0, 0, 0)

    os.makedirs(output_dir, exist_ok=True)

    # -------------------------------------------------------------
    # 1. Tankers Fleet (10 registered units)
    # -------------------------------------------------------------
    tankers_path = os.path.join(output_dir, "tankers.csv")
    with open(tankers_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["tanker_id", "transponder_id", "capacity_liters", "home_depot", "assigned_driver", "status", "synthetic", "seed", "generator_version", "generated_at"])
        for t in TANKER_FLEET:
            writer.writerow([t["tanker_id"], t["transponder_id"], t["capacity"], t["depot"], t["driver"], "available", "true", seed, GENERATOR_VERSION, gen_time])

    # -------------------------------------------------------------
    # 2. Daily Water Balance & Scenarios (35 Days)
    # -------------------------------------------------------------
    water_balance_path = os.path.join(output_dir, "daily_water_balance.csv")
    demand_history_path = os.path.join(output_dir, "demand_history.csv")

    daily_balance_rows = []
    demand_history_rows = []

    for day_idx in range(num_days):
        cur_date = start_date + timedelta(days=day_idx)
        date_str = cur_date.strftime("%Y-%m-%d")

        # Scenario injection logic
        is_shortage_day = (day_idx in [12, 13, 14])       # Scenario 3: Severe shortage
        is_heatwave_day = (day_idx in [21, 22, 23, 24])   # Scenario 4: Heatwave

        base_muni_supply = 380000 # Liters emergency relief allotment
        if is_shortage_day:
            available_water = int(base_muni_supply * 0.40) # 40% severe drought condition
            scenario_flag = "SCENARIO_3_SEVERE_SHORTAGE"
        elif is_heatwave_day:
            available_water = int(base_muni_supply * 1.15)
            scenario_flag = "SCENARIO_4_HEATWAVE_SURGE"
        else:
            available_water = base_muni_supply + int(rng.integers(-15000, 15000))
            scenario_flag = "SCENARIO_1_NORMAL"

        total_day_demand = 0
        allocated_day = 0

        # Generate ward-level demands for this day
        for ward in BMC_WARDS:
            # Baseline demand with random variance
            w_demand = ward["base_demand"] + int(rng.integers(-1200, 1500))

            # Scenario 2: Silent vulnerable ward vs visible affluent ward
            if ward["ward_code"] == "M/E": # Ward B: Silent vulnerable
                dry_hours = round(float(rng.uniform(48.0, 68.0)), 1)
                hist_deficit = round(float(rng.uniform(0.70, 0.88)), 2)
            elif ward["ward_code"] == "K/W": # Ward A: Vocal affluent
                dry_hours = round(float(rng.uniform(4.0, 12.0)), 1)
                hist_deficit = round(float(rng.uniform(0.08, 0.18)), 2)
            else:
                dry_hours = round(float(ward["vulnerability"] * 55.0 + rng.uniform(-5.0, 5.0)), 1)
                hist_deficit = round(float(ward["vulnerability"] * 0.75 + rng.uniform(-0.05, 0.05)), 2)

            dry_hours = max(0.0, min(72.0, dry_hours))
            hist_deficit = max(0.0, min(1.0, hist_deficit))

            if is_heatwave_day and ward["slum_pct"] > 0.50:
                w_demand = int(w_demand * 1.25) # Heat surge in slum pockets

            total_day_demand += w_demand

            demand_history_rows.append([
                date_str, ward["ward_id"], ward["ward_code"], ward["name"],
                w_demand, dry_hours, hist_deficit, scenario_flag,
                "true", seed, GENERATOR_VERSION, gen_time
            ])

        allocated_day = min(available_water, total_day_demand)

        daily_balance_rows.append([
            date_str, available_water, total_day_demand, allocated_day,
            max(0, total_day_demand - allocated_day), scenario_flag,
            "true", seed, GENERATOR_VERSION, gen_time
        ])

    with open(water_balance_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["date", "total_emergency_supply_liters", "total_ward_demand_liters", "total_allocated_liters", "net_deficit_liters", "active_scenario", "synthetic", "seed", "generator_version", "generated_at"])
        writer.writerows(daily_balance_rows)

    with open(demand_history_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["date", "ward_id", "ward_code", "ward_name", "demand_liters", "dry_pipe_hours", "historical_deficit", "scenario_flag", "synthetic", "seed", "generator_version", "generated_at"])
        writer.writerows(demand_history_rows)

    # -------------------------------------------------------------
    # 3. Citizen Grievance Complaints (Target: 800+ records)
    # -------------------------------------------------------------
    complaints_path = os.path.join(output_dir, "complaints.csv")
    complaints_rows = []
    complaint_id = 10001

    issue_types = [
        ("severe_dry_pipe", 0.40),
        ("contaminated_water", 0.25),
        ("low_pressure", 0.20),
        ("pipeline_burst", 0.10),
        ("tanker_delay", 0.05)
    ]
    issue_names = [it[0] for it in issue_types]
    issue_probs = [it[1] for it in issue_types]

    for day_idx in range(num_days):
        cur_date = start_date + timedelta(days=day_idx)
        # 25-35 complaints per day -> ~1000 total
        daily_complaint_count = int(rng.integers(24, 34))

        for _ in range(daily_complaint_count):
            # Select ward: Scenario 2 - Vocal Ward (K/W) logs more tickets despite low outage;
            # Ward M/E logs moderate tickets despite high outage (Silent Vulnerable).
            r_val = rng.uniform(0, 1)
            if r_val < 0.18:
                ward = next(w for w in BMC_WARDS if w["ward_code"] == "K/W") # Vocal
            elif r_val < 0.28:
                ward = next(w for w in BMC_WARDS if w["ward_code"] == "M/E") # Silent vulnerable
            else:
                ward = rng.choice(BMC_WARDS)

            hour = rng.integers(6, 22)
            minute = rng.integers(0, 60)
            c_time = cur_date.replace(hour=int(hour), minute=int(minute)).isoformat() + "Z"

            issue = rng.choice(issue_names, p=issue_probs)
            phone = f"+91-98{rng.integers(10000000, 99999999)}"

            # Scenario 5: Duplicate Complaints injection
            is_duplicate = False
            duplicate_parent_id = None
            if rng.uniform(0, 1) < 0.15 and len(complaints_rows) > 0:
                is_duplicate = True
                # Pick a recent complaint from same ward
                recent_in_ward = [c for c in complaints_rows[-20:] if c[2] == ward["ward_code"]]
                if recent_in_ward:
                    duplicate_parent_id = recent_in_ward[0][0]
                    issue = recent_in_ward[0][4]

            complaints_rows.append([
                complaint_id, c_time, ward["ward_code"], ward["name"],
                issue, phone, round(ward["lat"] + float(rng.uniform(-0.005, 0.005)), 4),
                round(ward["lng"] + float(rng.uniform(-0.005, 0.005)), 4),
                "resolved" if day_idx < num_days - 2 else "active",
                "true" if is_duplicate else "false",
                duplicate_parent_id or "",
                "true", seed, GENERATOR_VERSION, gen_time
            ])
            complaint_id += 1

    with open(complaints_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["complaint_id", "timestamp", "ward_code", "ward_name", "issue_type", "phone_number", "latitude", "longitude", "status", "is_duplicate", "duplicate_parent_id", "synthetic", "seed", "generator_version", "generated_at"])
        writer.writerows(complaints_rows)

    # -------------------------------------------------------------
    # 4. Citizen Supply Requests (Target: 1,500+ records)
    # -------------------------------------------------------------
    requests_path = os.path.join(output_dir, "requests.csv")
    requests_rows = []
    request_id = 50001

    for day_idx in range(num_days):
        cur_date = start_date + timedelta(days=day_idx)
        daily_req_count = int(rng.integers(42, 54)) # ~1,600 total

        for _ in range(daily_req_count):
            ward = rng.choice(BMC_WARDS)
            hour = rng.integers(5, 23)
            minute = rng.integers(0, 60)
            r_time = cur_date.replace(hour=int(hour), minute=int(minute)).isoformat() + "Z"

            req_vol = int(rng.choice([1000, 2000, 5000, 10000]))
            phone = f"+91-97{rng.integers(10000000, 99999999)}"

            requests_rows.append([
                request_id, r_time, ward["ward_code"], ward["name"],
                req_vol, phone, ward["vulnerability"],
                round(ward["lat"] + float(rng.uniform(-0.008, 0.008)), 4),
                round(ward["lng"] + float(rng.uniform(-0.008, 0.008)), 4),
                "fulfilled" if day_idx < num_days - 2 else "queued",
                "true", seed, GENERATOR_VERSION, gen_time
            ])
            request_id += 1

    with open(requests_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["request_id", "timestamp", "ward_code", "ward_name", "requested_volume_liters", "contact_phone", "ward_vulnerability", "latitude", "longitude", "status", "synthetic", "seed", "generator_version", "generated_at"])
        writer.writerows(requests_rows)

    # -------------------------------------------------------------
    # 5. Historical Service / Delivery Records (Target: 500+ records)
    # -------------------------------------------------------------
    service_path = os.path.join(output_dir, "service_history.csv")
    service_rows = []
    dispatch_id = 20001

    for day_idx in range(num_days - 2): # exclude last 2 days to have pending queue
        cur_date = start_date + timedelta(days=day_idx)
        daily_dispatches = int(rng.integers(15, 20)) # ~550 total

        for _ in range(daily_dispatches):
            tanker = rng.choice(TANKER_FLEET)
            # Vulnerable wards receive higher probability of dispatch in WaterFlow
            weights = np.array([w["vulnerability"] for w in BMC_WARDS])
            weights /= weights.sum()
            ward = rng.choice(BMC_WARDS, p=weights)

            hour = rng.integers(8, 20)
            d_time = cur_date.replace(hour=int(hour), minute=0).isoformat() + "Z"
            delivered_vol = tanker["capacity"]
            dist_km = round(ward["depot_dist"] + float(rng.uniform(-0.5, 1.2)), 2)

            service_rows.append([
                dispatch_id, d_time, tanker["transponder_id"], ward["ward_code"], ward["name"],
                delivered_vol, dist_km, "7419", "Delivered",
                round(float(rng.uniform(160, 240)), 1), # TDS
                round(float(rng.uniform(7.1, 7.8)), 2), # pH
                "true", seed, GENERATOR_VERSION, gen_time
            ])
            dispatch_id += 1

    with open(service_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["dispatch_id", "dispatched_at", "transponder_id", "ward_code", "ward_name", "delivered_volume_liters", "route_distance_km", "otp_code", "delivery_status", "tds_reading_ppm", "ph_reading", "synthetic", "seed", "generator_version", "generated_at"])
        writer.writerows(service_rows)

    print(f"✅ Generated {len(BMC_WARDS)} wards reference models")
    print(f"✅ Generated {len(TANKER_FLEET)} registered tankers in {tankers_path}")
    print(f"✅ Generated {len(daily_balance_rows)} daily water balance records in {water_balance_path}")
    print(f"✅ Generated {len(demand_history_rows)} ward demand records in {demand_history_path}")
    print(f"✅ Generated {len(complaints_rows)} complaints in {complaints_path}")
    print(f"✅ Generated {len(requests_rows)} supply requests in {requests_path}")
    print(f"✅ Generated {len(service_rows)} completed service dispatches in {service_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate deterministic WaterFlow synthetic datasets.")
    parser.add_argument("--output-dir", default="data/synthetic", help="Output directory for CSV files")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="Deterministic random seed")
    parser.add_argument("--days", type=int, default=35, help="Number of historical simulation days")
    args = parser.parse_args()

    generate_datasets(args.output_dir, args.seed, args.days)
