/**
 * Mumbai 24 BMC Administrative Wards Spatial & Operational Database
 * Used for GPS auto-detection, point-to-ward matching, and ward-specific telemetry.
 */

export const MUMBAI_WARDS_DATABASE = [
  {
    ward_code: "M/E",
    name: "Govandi / Mankhurd / Shivaji Nagar",
    zone: "Eastern Suburbs",
    lat: 19.0550,
    lng: 72.9180,
    timetable: "06:00 - 09:30 IST (Severe Rationing)",
    line_pressure: "1.15 Bar (Low Pressure Alert)",
    pressure_status: "critical",
    water_deficit_pct: 82,
    dry_pipe_hours: 58,
    nearest_depot: "Trombay High Level Reservoir (1.8 km)",
    depot_coords: [19.015, 72.905],
    feeder_line: "Trombay Trunk Feeder #04",
    population: 807720,
    priority_score: 92.4,
    priority_tier: "Tier-1 Critical",
    default_landmark: "Shivaji Nagar Sector 4, Near Municipal Water Tank",
    standpost_name: "Community Standpost #4",
    assigned_tanker: {
      tanker_id: "T-08",
      plate: "MH-03-BW-7821",
      driver: "Rajesh Patil",
      driver_phone: "+91 98201 55432",
      eta_mins: 14,
      volume_liters: 10000,
      otp_code: "7419",
      delivery_status: "en_route",
    }
  },
  {
    ward_code: "G/N",
    name: "Dharavi / Mahim / Dadar West",
    zone: "City (Central Mumbai)",
    lat: 19.0380,
    lng: 72.8530,
    timetable: "05:30 - 08:30 IST (Restricted Grid Supply)",
    line_pressure: "1.32 Bar (Low Flow)",
    pressure_status: "warning",
    water_deficit_pct: 78,
    dry_pipe_hours: 44,
    nearest_depot: "Dadar Pumping Station (2.1 km)",
    depot_coords: [19.022, 72.842],
    feeder_line: "Tansa Main Pipeline #02",
    population: 599039,
    priority_score: 88.1,
    priority_tier: "Tier-1 Critical",
    default_landmark: "90 Feet Road, Near Dharavi Transit Camp",
    standpost_name: "Dharavi Kumbharwada Point #1",
    assigned_tanker: {
      tanker_id: "T-04",
      plate: "MH-02-AK-4412",
      driver: "Suresh Shinde",
      driver_phone: "+91 98202 88712",
      eta_mins: 22,
      volume_liters: 10000,
      otp_code: "5823",
      delivery_status: "en_route",
    }
  },
  {
    ward_code: "K/E",
    name: "Andheri East / Marol / Chakala",
    zone: "Western Suburbs",
    lat: 19.1150,
    lng: 72.8680,
    timetable: "07:00 - 11:00 IST (Scheduled Allocation)",
    line_pressure: "1.78 Bar (Nominal)",
    pressure_status: "nominal",
    water_deficit_pct: 54,
    dry_pipe_hours: 24,
    nearest_depot: "Veravali High Reservoir (3.2 km)",
    depot_coords: [19.128, 72.872],
    feeder_line: "Veravali Western Corridor Line #1",
    population: 824673,
    priority_score: 76.5,
    priority_tier: "Tier-2 Warning",
    default_landmark: "MIDC Cross Road No 7, Near SEEPZ Gate",
    standpost_name: "MIDC Standpost #12",
    assigned_tanker: {
      tanker_id: "T-12",
      plate: "MH-03-CD-9104",
      driver: "Anil More",
      driver_phone: "+91 98203 11499",
      eta_mins: 35,
      volume_liters: 10000,
      otp_code: "3914",
      delivery_status: "en_route",
    }
  },
  {
    ward_code: "L",
    name: "Kurla / Asalpha / Sakinaka",
    zone: "Eastern Suburbs",
    lat: 19.0720,
    lng: 72.8880,
    timetable: "06:30 - 10:00 IST (Variable Pressure Grid)",
    line_pressure: "1.45 Bar (Moderate Variance)",
    pressure_status: "warning",
    water_deficit_pct: 71,
    dry_pipe_hours: 38,
    nearest_depot: "Trombay High Reservoir (5.0 km)",
    depot_coords: [19.015, 72.905],
    feeder_line: "Vaitarna Feeder Conduit #3",
    population: 902235,
    priority_score: 84.9,
    priority_tier: "Tier-1 Critical",
    default_landmark: "LBS Marg, Near Kurla Railway Station West",
    standpost_name: "Asalpha Hill Supply Standpost",
    assigned_tanker: {
      tanker_id: "T-07",
      plate: "MH-04-EX-2291",
      driver: "Ganesh Jadhav",
      driver_phone: "+91 98204 99281",
      eta_mins: 18,
      volume_liters: 10000,
      otp_code: "8201",
      delivery_status: "en_route",
    }
  },
  {
    ward_code: "P/N",
    name: "Malad West / Marve / Malvani",
    zone: "Western Suburbs",
    lat: 19.1860,
    lng: 72.8480,
    timetable: "05:00 - 08:30 IST (Early Morning Surge)",
    line_pressure: "1.28 Bar (Low Flow)",
    pressure_status: "warning",
    water_deficit_pct: 68,
    dry_pipe_hours: 32,
    nearest_depot: "Veravali High Reservoir (8.2 km)",
    depot_coords: [19.128, 72.872],
    feeder_line: "Malad Western Feeder #2",
    population: 941409,
    priority_score: 81.2,
    priority_tier: "Tier-1 Critical",
    default_landmark: "Gate No 8, Malvani Block 5",
    standpost_name: "Malvani Standpost #3",
    assigned_tanker: {
      tanker_id: "T-15",
      plate: "MH-01-DR-6110",
      driver: "Vikram Rathod",
      driver_phone: "+91 98205 33410",
      eta_mins: 28,
      volume_liters: 10000,
      otp_code: "4198",
      delivery_status: "en_route",
    }
  },
  {
    ward_code: "A",
    name: "Colaba / Fort / Nariman Point",
    zone: "City (South Mumbai)",
    lat: 18.9280,
    lng: 72.8330,
    timetable: "06:00 - 12:00 IST (Stable Grid Distribution)",
    line_pressure: "2.10 Bar (Optimal)",
    pressure_status: "optimal",
    water_deficit_pct: 22,
    dry_pipe_hours: 4,
    nearest_depot: "Malabar Hill Reservoir (4.5 km)",
    depot_coords: [18.963, 72.805],
    feeder_line: "Bhandup South Trunk Line #1",
    population: 185014,
    priority_score: 34.2,
    priority_tier: "Tier-4 Stable",
    default_landmark: "Shahid Bhagat Singh Road, Near Regal Cinema",
    standpost_name: "Colaba Causeway Supply Valve",
    assigned_tanker: {
      tanker_id: "T-01",
      plate: "MH-01-AA-1001",
      driver: "Santosh Naik",
      driver_phone: "+91 98206 11200",
      eta_mins: 45,
      volume_liters: 10000,
      otp_code: "1104",
      delivery_status: "en_route",
    }
  },
  {
    ward_code: "F/N",
    name: "Matunga / Wadala / Sion East",
    zone: "City",
    lat: 19.0280,
    lng: 72.8580,
    timetable: "06:00 - 09:30 IST (Scheduled Allocation)",
    line_pressure: "1.65 Bar (Nominal)",
    pressure_status: "nominal",
    water_deficit_pct: 46,
    dry_pipe_hours: 18,
    nearest_depot: "Dadar Pumping Station (1.5 km)",
    depot_coords: [19.022, 72.842],
    feeder_line: "Tansa Conduit East",
    population: 529003,
    priority_score: 64.8,
    priority_tier: "Tier-3 Moderate",
    default_landmark: "Bhaudaji Road, Near Five Gardens",
    standpost_name: "Wadala Post #6",
    assigned_tanker: {
      tanker_id: "T-09",
      plate: "MH-02-CP-8834",
      driver: "Pradeep Sawant",
      driver_phone: "+91 98207 44109",
      eta_mins: 20,
      volume_liters: 10000,
      otp_code: "6520",
      delivery_status: "en_route",
    }
  },
  {
    ward_code: "S",
    name: "Bhandup / Powai / Kanjurmarg",
    zone: "Eastern Suburbs",
    lat: 19.1280,
    lng: 72.9280,
    timetable: "06:00 - 11:30 IST (Direct Treatment Outflow)",
    line_pressure: "2.40 Bar (High Pressure)",
    pressure_status: "optimal",
    water_deficit_pct: 28,
    dry_pipe_hours: 8,
    nearest_depot: "Bhandup Master Treatment Plant (0.8 km)",
    depot_coords: [19.145, 72.935],
    feeder_line: "Bhandup Master Outflow Main",
    population: 743783,
    priority_score: 41.5,
    priority_tier: "Tier-3 Moderate",
    default_landmark: "LBS Marg, Near Bhandup Railway Station",
    standpost_name: "Bhandup Complex Point",
    assigned_tanker: {
      tanker_id: "T-11",
      plate: "MH-03-ZZ-3301",
      driver: "Mahesh Kadam",
      driver_phone: "+91 98208 77501",
      eta_mins: 15,
      volume_liters: 10000,
      otp_code: "9041",
      delivery_status: "en_route",
    }
  }
];

/**
 * Calculate Great-Circle Distance between two coordinates (Haversine formula in KM)
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Auto-detect the nearest BMC Ward from user coordinates
 */
export function findNearestMumbaiWard(userLat, userLng) {
  if (!userLat || !userLng) return MUMBAI_WARDS_DATABASE[0];

  let closestWard = MUMBAI_WARDS_DATABASE[0];
  let minDistance = Infinity;

  for (const ward of MUMBAI_WARDS_DATABASE) {
    const dist = haversineDistanceKm(userLat, userLng, ward.lat, ward.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestWard = ward;
    }
  }

  return {
    ...closestWard,
    distance_to_centroid_km: Math.round(minDistance * 10) / 10,
  };
}
