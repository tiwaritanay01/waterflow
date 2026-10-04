/**
 * WaterFlow OS — Node.js Express Backend Gateway
 *
 * Connects to PostgreSQL for ward/tanker data, proxies AI scoring
 * to the Python FastAPI engine, and serves a merged dashboard payload.
 *
 * 24 Brihanmumbai Municipal Corporation (BMC) Administrative Wards
 * with real GIS spatial coordinates, demographic vulnerability, and logistics.
 *
 * Run: npm install && node server.js
 * Listens on: http://localhost:3001
 */

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3001;
const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://localhost:8000";


app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// PostgreSQL connection pool (optional — graceful fallback if unavailable)
// ---------------------------------------------------------------------------

const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: parseInt(process.env.PGPORT || "5432"),
  database: process.env.PGDATABASE || "waterflow_os",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "postgres",
  max: 10,
  connectionTimeoutMillis: 3000,
});

let dbAvailable = false;
app.locals.pool = pool;
app.locals.dbAvailable = false;

pool
  .query("SELECT 1")
  .then(() => {
    dbAvailable = true;
    app.locals.dbAvailable = true;
    console.log("✅ PostgreSQL connected");
  })
  .catch(() => {
    console.log("⚠️  PostgreSQL unavailable — using 24 Mumbai BMC wards fallback");
  });

// ---------------------------------------------------------------------------
// Mobile APIs for Citizen Portal & Worker Portal
// ---------------------------------------------------------------------------
const mobileApiRouter = require("./mobile_api");
app.use("/api", mobileApiRouter);

// ---------------------------------------------------------------------------
// Resilience Engine & Autonomy Engine (Phase: Resilience Sprint)
// ---------------------------------------------------------------------------
const {
  mountResilienceRoutes,
  FAILURE_SCENARIOS,
  analyzeNetworkImpact,
  generateRecoveryAlternatives,
  localizeFault,
  classifyResilienceGovernanceTier,
  ACTIVE_RESILIENCE_TRACES,
  resetResilienceState
} = require("./resilience_engine");
const { mountAutonomyRoutes, resetAutonomyState } = require("./autonomy_engine");
const {
  mountFieldSyncRoutes,
  createMission,
  verifyMissionDelivery,
  registerDeliveryVerifiedCallback,
  MISSION_VERSIONS,
  resetFieldSyncState,
} = require("./field_sync");

const { computePriority, computePriorityQueue, classifyWardGovernanceTier, classifyDecisionGovernanceTier, CANONICAL_PROVENANCE_CLASSES } = require("./core_algorithms");

// ---------------------------------------------------------------------------
// Phase 2: WhatsApp Multi-Lingual NLP Webhook (Meta & Twilio Compatible)
// ---------------------------------------------------------------------------
try {
  const whatsappRouter = require("./whatsapp_webhook");
  app.use("/api/whatsapp", whatsappRouter);
  console.log("✅ WhatsApp NLP Webhook mounted at /api/whatsapp/webhook");
} catch (e) {
  console.warn("⚠️ WhatsApp Webhook router not mounted:", e.message);
}

// ---------------------------------------------------------------------------
// 24 Mumbai BMC Administrative Wards Dataset
// ---------------------------------------------------------------------------

const MOCK_WARDS = [
  {
    ward_id: 1,
    ward_number: "M/E",
    ward_code: "M/E",
    name: "Govandi / Mankhurd / Shivaji Nagar",
    zone: "Eastern Suburbs",
    population: 807720,
    vulnerability_index: 0.96,
    dry_pipe_hours: 58,
    historical_deficit: 0.78,
    demand_liters: 32000,
    coverage_pct: 38,
    depot_distance_km: 4.8,
    lat: 19.0550,
    lng: 72.9180,
    status: "critical",
    water_deficit_pct: 82,
    description: "Highest informal population density in Mumbai; critical low pressure along Shivaji Nagar trunk lines."
  },
  {
    ward_id: 2,
    ward_number: "G/N",
    ward_code: "G/N",
    name: "Dharavi / Mahim / Dadar West",
    zone: "City",
    population: 599039,
    vulnerability_index: 0.93,
    dry_pipe_hours: 52,
    historical_deficit: 0.70,
    demand_liters: 28000,
    coverage_pct: 42,
    depot_distance_km: 3.6,
    lat: 19.0430,
    lng: 72.8460,
    status: "critical",
    water_deficit_pct: 78,
    description: "Dharavi informal industrial & leather clusters facing acute 52h supply interruption."
  },
  {
    ward_id: 3,
    ward_number: "L",
    ward_code: "L",
    name: "Kurla / Asalpha / Sakinaka",
    zone: "Eastern Suburbs",
    population: 902226,
    vulnerability_index: 0.88,
    dry_pipe_hours: 46,
    historical_deficit: 0.62,
    demand_liters: 24000,
    coverage_pct: 48,
    depot_distance_km: 6.2,
    lat: 19.0720,
    lng: 72.8820,
    status: "critical",
    water_deficit_pct: 71,
    description: "Extensive hillside informal settlements; gravity feed booster pump trip on Asalpha line."
  },
  {
    ward_id: 4,
    ward_number: "P/N",
    ward_code: "P/N",
    name: "Malad / Marve / Malvani",
    zone: "Western Suburbs",
    population: 946457,
    vulnerability_index: 0.79,
    dry_pipe_hours: 44,
    historical_deficit: 0.55,
    demand_liters: 22000,
    coverage_pct: 51,
    depot_distance_km: 11.2,
    lat: 19.1860,
    lng: 72.8480,
    status: "critical",
    water_deficit_pct: 66,
    description: "Malvani sector experiencing prolonged ration deficits; high reliance on tanker logistics."
  },
  {
    ward_id: 5,
    ward_number: "K/E",
    ward_code: "K/E",
    name: "Andheri East / Jogeshwari East",
    zone: "Western Suburbs",
    population: 824401,
    vulnerability_index: 0.72,
    dry_pipe_hours: 38,
    historical_deficit: 0.48,
    demand_liters: 18000,
    coverage_pct: 58,
    depot_distance_km: 3.2,
    lat: 19.1170,
    lng: 72.8630,
    status: "warning",
    water_deficit_pct: 59,
    description: "MIDC industrial belt and informal worker chawls; intermittent distribution schedule."
  },
  {
    ward_id: 6,
    ward_number: "H/E",
    ward_code: "H/E",
    name: "Bandra East / Khar East / Santacruz East",
    zone: "Western Suburbs",
    population: 557239,
    vulnerability_index: 0.68,
    dry_pipe_hours: 34,
    historical_deficit: 0.42,
    demand_liters: 15000,
    coverage_pct: 62,
    depot_distance_km: 6.5,
    lat: 19.0680,
    lng: 72.8520,
    status: "warning",
    water_deficit_pct: 54,
    description: "Behrampada and Golibar settlements adjacent to BKC financial hub."
  },
  {
    ward_id: 7,
    ward_number: "N",
    ward_code: "N",
    name: "Ghatkopar / Vidyavihar / Pant Nagar",
    zone: "Eastern Suburbs",
    population: 622853,
    vulnerability_index: 0.65,
    dry_pipe_hours: 32,
    historical_deficit: 0.38,
    demand_liters: 14000,
    coverage_pct: 64,
    depot_distance_km: 5.1,
    lat: 19.0880,
    lng: 72.9120,
    status: "warning",
    water_deficit_pct: 51,
    description: "Hilly elevation gradient causing drop in end-of-line feeder pressure."
  },
  {
    ward_id: 8,
    ward_number: "R/S",
    ward_code: "R/S",
    name: "Kandivali / Charkop / Akurli",
    zone: "Western Suburbs",
    population: 691229,
    vulnerability_index: 0.60,
    dry_pipe_hours: 28,
    historical_deficit: 0.34,
    demand_liters: 12000,
    coverage_pct: 67,
    depot_distance_km: 12.5,
    lat: 19.2060,
    lng: 72.8520,
    status: "warning",
    water_deficit_pct: 46,
    description: "High residential density; tail-end distribution from Veravali reservoir trunk line."
  },
  {
    ward_id: 9,
    ward_number: "M/W",
    ward_code: "M/W",
    name: "Chembur West / Tilak Nagar / Mahul",
    zone: "Eastern Suburbs",
    population: 411363,
    vulnerability_index: 0.58,
    dry_pipe_hours: 26,
    historical_deficit: 0.30,
    demand_liters: 11000,
    coverage_pct: 70,
    depot_distance_km: 3.9,
    lat: 19.0620,
    lng: 72.8980,
    status: "warning",
    water_deficit_pct: 43,
    description: "Industrial refinery corridor; Mahul transit camp pipeline repair scheduled."
  },
  {
    ward_id: 10,
    ward_number: "F/N",
    ward_code: "F/N",
    name: "Matunga / Sion / Wadala",
    zone: "City",
    population: 529003,
    vulnerability_index: 0.55,
    dry_pipe_hours: 24,
    historical_deficit: 0.28,
    demand_liters: 10000,
    coverage_pct: 72,
    depot_distance_km: 3.4,
    lat: 19.0320,
    lng: 72.8620,
    status: "warning",
    water_deficit_pct: 40,
    description: "Wadala salt pan boundary; scheduled rationing cycle in Transit Camp Sector 4."
  },
  {
    ward_id: 11,
    ward_number: "S",
    ward_code: "S",
    name: "Bhandup / Powai / Kanjurmarg",
    zone: "Eastern Suburbs",
    population: 743783,
    vulnerability_index: 0.50,
    dry_pipe_hours: 20,
    historical_deficit: 0.22,
    demand_liters: 9000,
    coverage_pct: 77,
    depot_distance_km: 1.4,
    lat: 19.1410,
    lng: 72.9300,
    status: "normal",
    water_deficit_pct: 35,
    description: "Immediate proximity to Bhandup Master Treatment Plant; reliable bulk supply."
  },
  {
    ward_id: 12,
    ward_number: "R/C",
    ward_code: "R/C",
    name: "Borivali / Gorai / Shimpoli",
    zone: "Western Suburbs",
    population: 562162,
    vulnerability_index: 0.46,
    dry_pipe_hours: 18,
    historical_deficit: 0.20,
    demand_liters: 8000,
    coverage_pct: 79,
    depot_distance_km: 14.8,
    lat: 19.2280,
    lng: 72.8560,
    status: "normal",
    water_deficit_pct: 32,
    description: "Northern suburban residential belt; regular 4-hour morning municipal cycle."
  },
  {
    ward_id: 13,
    ward_number: "P/S",
    ward_code: "P/S",
    name: "Goregaon East & West / Pahadi",
    zone: "Western Suburbs",
    population: 460175,
    vulnerability_index: 0.44,
    dry_pipe_hours: 16,
    historical_deficit: 0.18,
    demand_liters: 7500,
    coverage_pct: 81,
    depot_distance_km: 8.0,
    lat: 19.1620,
    lng: 72.8450,
    status: "normal",
    water_deficit_pct: 28,
    description: "Stable dual feeder supply with minor drops during peak morning hours."
  },
  {
    ward_id: 14,
    ward_number: "T",
    ward_code: "T",
    name: "Mulund / Nahur",
    zone: "Eastern Suburbs",
    population: 341463,
    vulnerability_index: 0.40,
    dry_pipe_hours: 14,
    historical_deficit: 0.15,
    demand_liters: 6500,
    coverage_pct: 84,
    depot_distance_km: 4.5,
    lat: 19.1720,
    lng: 72.9520,
    status: "normal",
    water_deficit_pct: 24,
    description: "Mulund residential sector near Tansa duct mains; high baseline coverage."
  },
  {
    ward_id: 15,
    ward_number: "K/W",
    ward_code: "K/W",
    name: "Andheri West / Versova / Juhu",
    zone: "Western Suburbs",
    population: 749426,
    vulnerability_index: 0.38,
    dry_pipe_hours: 12,
    historical_deficit: 0.14,
    demand_liters: 6000,
    coverage_pct: 86,
    depot_distance_km: 6.6,
    lat: 19.1280,
    lng: 72.8300,
    status: "normal",
    water_deficit_pct: 22,
    description: "Coastal residential belt; localized tanker supplementary supply in Versova Koliwada."
  },
  {
    ward_id: 16,
    ward_number: "R/N",
    ward_code: "R/N",
    name: "Dahisar / Mandapeshwar",
    zone: "Western Suburbs",
    population: 431368,
    vulnerability_index: 0.42,
    dry_pipe_hours: 15,
    historical_deficit: 0.16,
    demand_liters: 6000,
    coverage_pct: 83,
    depot_distance_km: 17.5,
    lat: 19.2540,
    lng: 72.8590,
    status: "normal",
    water_deficit_pct: 25,
    description: "Northernmost municipal ward; terminal distribution points monitored via SCADA."
  },
  {
    ward_id: 17,
    ward_number: "E",
    ward_code: "E",
    name: "Byculla / Mazgaon / Nagpada",
    zone: "City",
    population: 393286,
    vulnerability_index: 0.48,
    dry_pipe_hours: 14,
    historical_deficit: 0.16,
    demand_liters: 5500,
    coverage_pct: 82,
    depot_distance_km: 4.6,
    lat: 18.9720,
    lng: 72.8320,
    status: "normal",
    water_deficit_pct: 23,
    description: "Historic mill & chawl infrastructure; replacement of cast-iron pipes underway."
  },
  {
    ward_id: 18,
    ward_number: "F/S",
    ward_code: "F/S",
    name: "Parel / Sewri / Lalbaug",
    zone: "City",
    population: 360972,
    vulnerability_index: 0.42,
    dry_pipe_hours: 10,
    historical_deficit: 0.12,
    demand_liters: 5000,
    coverage_pct: 87,
    depot_distance_km: 3.6,
    lat: 18.9980,
    lng: 72.8440,
    status: "normal",
    water_deficit_pct: 18,
    description: "Major medical hub (KEM, Tata Memorial Hospital); continuous priority pressure maintained."
  },
  {
    ward_id: 19,
    ward_number: "G/S",
    ward_code: "G/S",
    name: "Worli / Prabhadevi / Lower Parel",
    zone: "City",
    population: 379927,
    vulnerability_index: 0.36,
    dry_pipe_hours: 8,
    historical_deficit: 0.10,
    demand_liters: 4500,
    coverage_pct: 89,
    depot_distance_km: 5.0,
    lat: 19.0060,
    lng: 72.8210,
    status: "normal",
    water_deficit_pct: 16,
    description: "Commercial high-rise sector; dedicated 24x7 pumped water connections."
  },
  {
    ward_id: 20,
    ward_number: "B",
    ward_code: "B",
    name: "Sandhurst Road / Dongri / Masjid Bunder",
    zone: "City",
    population: 127290,
    vulnerability_index: 0.40,
    dry_pipe_hours: 9,
    historical_deficit: 0.11,
    demand_liters: 3500,
    coverage_pct: 88,
    depot_distance_km: 5.6,
    lat: 18.9515,
    lng: 72.8375,
    status: "normal",
    water_deficit_pct: 15,
    description: "Port-adjacent wholesale market zone; dense historic tenements with scheduled supply."
  },
  {
    ward_id: 21,
    ward_number: "H/W",
    ward_code: "H/W",
    name: "Bandra West / Khar West",
    zone: "Western Suburbs",
    population: 307581,
    vulnerability_index: 0.28,
    dry_pipe_hours: 6,
    historical_deficit: 0.08,
    demand_liters: 3000,
    coverage_pct: 93,
    depot_distance_km: 8.2,
    lat: 19.0600,
    lng: 72.8350,
    status: "normal",
    water_deficit_pct: 11,
    description: "Affluent residential quarter; uninterrupted pressurized municipal supply."
  },
  {
    ward_id: 22,
    ward_number: "C",
    ward_code: "C",
    name: "Marine Lines / Kalbadevi / Bhuleshwar",
    zone: "City",
    population: 166161,
    vulnerability_index: 0.32,
    dry_pipe_hours: 6,
    historical_deficit: 0.07,
    demand_liters: 2500,
    coverage_pct: 92,
    depot_distance_km: 6.0,
    lat: 18.9480,
    lng: 72.8250,
    status: "normal",
    water_deficit_pct: 9,
    description: "Commercial gold & textile trade district; reliable dual main supply."
  },
  {
    ward_id: 23,
    ward_number: "A",
    ward_code: "A",
    name: "Colaba / Fort / Nariman Point",
    zone: "City",
    population: 185014,
    vulnerability_index: 0.22,
    dry_pipe_hours: 4,
    historical_deficit: 0.04,
    demand_liters: 2000,
    coverage_pct: 96,
    depot_distance_km: 7.9,
    lat: 18.9220,
    lng: 72.8340,
    status: "normal",
    water_deficit_pct: 5,
    description: "State capital administrative district, Naval command, and financial headquarters."
  },
  {
    ward_id: 24,
    ward_number: "D",
    ward_code: "D",
    name: "Malabar Hill / Walkeshwar / Breach Candy",
    zone: "City",
    population: 346866,
    vulnerability_index: 0.16,
    dry_pipe_hours: 2,
    historical_deficit: 0.02,
    demand_liters: 1500,
    coverage_pct: 98,
    depot_distance_km: 6.8,
    lat: 18.9610,
    lng: 72.8120,
    status: "normal",
    water_deficit_pct: 3,
    description: "Malabar Hill reservoir feeding directly into local gravity mains; optimal pressure."
  },
];

// ---------------------------------------------------------------------------
// Mumbai Municipal Water Depots
// ---------------------------------------------------------------------------

const MOCK_DEPOTS = [
  { id: 1, name: "Bhandup Master Treatment Plant", total_capacity: 450000, current_stock: 385000, lat: 19.1480, lng: 72.9350, is_active: true, zone: "Primary Asia Mega-Hub (2,800 MLD)" },
  { id: 2, name: "Veravali High Reservoir Depot", total_capacity: 220000, current_stock: 168000, lat: 19.1290, lng: 72.8680, is_active: true, zone: "Western Suburbs Booster" },
  { id: 3, name: "Dadar Pumping & Dispatch Station", total_capacity: 180000, current_stock: 142000, lat: 19.0180, lng: 72.8420, is_active: true, zone: "Central & City Division" },
  { id: 4, name: "Trombay High Level Reservoir", total_capacity: 150000, current_stock: 115000, lat: 19.0350, lng: 72.9150, is_active: true, zone: "Eastern Industrial Sector" },
];

// ---------------------------------------------------------------------------
// Municipal Tanker Fleet (25 Units with Real Mumbai GPS Coordinates)
// ---------------------------------------------------------------------------

const MOCK_TANKERS = [
  { tanker_id: 1,  transponder_id: "T-01", capacity: 10000, current_load: 10000, status: "available",   assigned_ward: null,  eta_minutes: null, lat: 19.1480, lng: 72.9350, speed_kmh: 0  },
  { tanker_id: 2,  transponder_id: "T-02", capacity: 12000, current_load: 4500,  status: "dispensing",  assigned_ward: "G/N", eta_minutes: null, lat: 19.0435, lng: 72.8480, speed_kmh: 0  },
  { tanker_id: 3,  transponder_id: "T-03", capacity: 8000,  current_load: 8000,  status: "available",   assigned_ward: null,  eta_minutes: null, lat: 19.1290, lng: 72.8680, speed_kmh: 0  },
  { tanker_id: 4,  transponder_id: "T-04", capacity: 10000, current_load: 10000, status: "loading",     assigned_ward: null,  eta_minutes: null, lat: 19.0180, lng: 72.8420, speed_kmh: 0  },
  { tanker_id: 5,  transponder_id: "T-05", capacity: 8000,  current_load: 8000,  status: "available",   assigned_ward: null,  eta_minutes: null, lat: 19.0350, lng: 72.9150, speed_kmh: 0  },
  { tanker_id: 6,  transponder_id: "T-06", capacity: 12000, current_load: 12000, status: "loading",     assigned_ward: null,  eta_minutes: null, lat: 19.1480, lng: 72.9350, speed_kmh: 0  },
  { tanker_id: 7,  transponder_id: "T-07", capacity: 10000, current_load: 10000, status: "available",   assigned_ward: null,  eta_minutes: null, lat: 19.1290, lng: 72.8680, speed_kmh: 0  },
  { tanker_id: 8,  transponder_id: "T-08", capacity: 10000, current_load: 10000, status: "en_route",    assigned_ward: "M/E", eta_minutes: 14,   lat: 19.0480, lng: 72.9120, speed_kmh: 34 },
  { tanker_id: 9,  transponder_id: "T-09", capacity: 8000,  current_load: 8000,  status: "available",   assigned_ward: null,  eta_minutes: null, lat: 19.0350, lng: 72.9150, speed_kmh: 0  },
  { tanker_id: 10, transponder_id: "T-10", capacity: 10000, current_load: 10000, status: "available",   assigned_ward: null,  eta_minutes: null, lat: 19.1480, lng: 72.9350, speed_kmh: 0  },
  { tanker_id: 11, transponder_id: "T-11", capacity: 12000, current_load: 12000, status: "available",   assigned_ward: null,  eta_minutes: null, lat: 19.0180, lng: 72.8420, speed_kmh: 0  },
  { tanker_id: 12, transponder_id: "T-12", capacity: 8000,  current_load: 8000,  status: "loading",     assigned_ward: null,  eta_minutes: null, lat: 19.1290, lng: 72.8680, speed_kmh: 0  },
  { tanker_id: 13, transponder_id: "T-13", capacity: 10000, current_load: 10000, status: "available",   assigned_ward: null,  eta_minutes: null, lat: 19.1480, lng: 72.9350, speed_kmh: 0  },
  { tanker_id: 14, transponder_id: "T-14", capacity: 8000,  current_load: 8000,  status: "en_route",    assigned_ward: "L",   eta_minutes: 22,   lat: 19.0700, lng: 72.8750, speed_kmh: 28 },
  { tanker_id: 15, transponder_id: "T-15", capacity: 10000, current_load: 10000, status: "available",   assigned_ward: null,  eta_minutes: null, lat: 19.0350, lng: 72.9150, speed_kmh: 0  },
  { tanker_id: 16, transponder_id: "T-16", capacity: 12000, current_load: 12000, status: "en_route",    assigned_ward: "P/N", eta_minutes: 36,   lat: 19.1550, lng: 72.8520, speed_kmh: 42 },
  { tanker_id: 17, transponder_id: "T-17", capacity: 8000,  current_load: 8000,  status: "available",   assigned_ward: null,  eta_minutes: null, lat: 19.1480, lng: 72.9350, speed_kmh: 0  },
  { tanker_id: 18, transponder_id: "T-18", capacity: 10000, current_load: 10000, status: "available",   assigned_ward: null,  eta_minutes: null, lat: 19.0180, lng: 72.8420, speed_kmh: 0  },
  { tanker_id: 19, transponder_id: "T-19", capacity: 8000,  current_load: 0,     status: "returning",   assigned_ward: null,  eta_minutes: null, lat: 19.0820, lng: 72.8950, speed_kmh: 38 },
  { tanker_id: 20, transponder_id: "T-20", capacity: 10000, current_load: 10000, status: "loading",     assigned_ward: null,  eta_minutes: null, lat: 19.1480, lng: 72.9350, speed_kmh: 0  },
  { tanker_id: 21, transponder_id: "T-21", capacity: 12000, current_load: 12000, status: "available",   assigned_ward: null,  eta_minutes: null, lat: 19.1290, lng: 72.8680, speed_kmh: 0  },
  { tanker_id: 22, transponder_id: "T-22", capacity: 8000,  current_load: 8000,  status: "available",   assigned_ward: null,  eta_minutes: null, lat: 19.0350, lng: 72.9150, speed_kmh: 0  },
  { tanker_id: 23, transponder_id: "T-23", capacity: 10000, current_load: 10000, status: "available",   assigned_ward: null,  eta_minutes: null, lat: 19.0180, lng: 72.8420, speed_kmh: 0  },
  { tanker_id: 24, transponder_id: "T-24", capacity: 8000,  current_load: 8000,  status: "maintenance", assigned_ward: null,  eta_minutes: null, lat: 19.1480, lng: 72.9350, speed_kmh: 0  },
  { tanker_id: 25, transponder_id: "T-25", capacity: 10000, current_load: 10000, status: "available",   assigned_ward: null,  eta_minutes: null, lat: 19.1480, lng: 72.9350, speed_kmh: 0  },
];

// ---------------------------------------------------------------------------
// Municipal Telemetry Alerts
// ---------------------------------------------------------------------------

const MOCK_ALERTS = [
  { id: 1, title: "Ward M/East · Severe Deficit Surge", description: "Shivaji Nagar informal cluster pipe dry for 58h; priority tanker route queued from Trombay Depot.", severity: "critical", ward_number: "M/E", badge_text: "58h Dry" },
  { id: 2, title: "Ward G/North · Dharavi Transit Bottleneck", description: "Sion-Bandra Link congestion detected; Tanker T-08 rerouted via 90-Feet Road corridor.", severity: "warning", ward_number: "G/N", badge_text: "+14m Transit" },
  { id: 3, title: "Ward L · Kurla Asalpha Gravity Trip", description: "Booster failure in hillside pressure zone; 24,000L emergency allocation scheduled.", severity: "critical", ward_number: "L", badge_text: "46h Dry" },
];

// ---------------------------------------------------------------------------
// Helper: Call Python AI Engine
// ---------------------------------------------------------------------------

async function callAIEngine(endpoint, body) {
  try {
    const response = await fetch(`${AI_ENGINE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`AI Engine ${response.status}`);
    return await response.json();
  } catch (err) {
    console.log(`⚠️  AI Engine ${endpoint} unavailable: ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Demonstration Executive Authorization Gate (Non-production mechanism)
// ---------------------------------------------------------------------------
const DEMO_EXECUTIVE_AUTH_TOKENS = (
  process.env.DEMO_EXECUTIVE_AUTH_TOKENS ||
  "DEMO_EXEC_PIN_4491,DEMO_OVERRIDE_TOKEN,4491,admin123,7419"
).split(",").map(t => t.trim());

function verifyDemoExecutiveAuth(token) {
  if (!token) {
    return {
      valid: false,
      reason: "TIER_3_PIN_REQUIRED: Critical Tier 3 dispatch requires valid demonstration authorization",
    };
  }
  const cleaned = String(token).trim();
  if (DEMO_EXECUTIVE_AUTH_TOKENS.includes(cleaned)) {
    return {
      valid: true,
      mode: "DEMO_EXECUTIVE_AUTH",
      token_masked: "****" + (cleaned.length > 2 ? cleaned.slice(-2) : cleaned),
      label: "[DEMO AUTHORIZATION GATE — NOT PRODUCTION CREDENTIAL]",
    };
  }
  return {
    valid: false,
    reason: "TIER_3_PIN_REQUIRED: Invalid executive authorization PIN or demonstration token",
  };
}

// ---------------------------------------------------------------------------
// Canonical Provenance Taxonomy (9 Canonical Classes)
// ---------------------------------------------------------------------------


// Authoritative Governance Classification Helper


// ---------------------------------------------------------------------------
// Authoritative Priority Scoring Function (Policy v2.4.0 Hardened Baseline)
// P_i = 0.30*V_i + 0.25*D_i + 0.20*Pop_i + 0.15*H_i + 0.10*Dist_i
// ---------------------------------------------------------------------------



// ---------------------------------------------------------------------------
// Canonical Operational Decision Record Store & Generator
// ---------------------------------------------------------------------------
const OPERATIONAL_DECISION_RECORDS = new Map();

function generateDecisionRecord({
  ward,
  volume_liters,
  tanker,
  governance_tier,
  officer_name,
  officer_id,
  mission,
  pin,
  notes,
  status = "DISPATCHED",
  decision_id_override,
  scenario_id = "SEED_42_BASELINE",
  recovery_option_id = null,
}) {
  const decisionId = decision_id_override || `dec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const priorityInfo = computePriority(ward);
  const now = new Date().toISOString();

  const constraintsApplied = [
    "SUPPLY_BUDGET",
    "DEMAND_CEILING",
    "STRATEGIC_RESERVE_PROTECTION",
    "WATER_QUALITY_ASSURANCE",
    "TANKER_FLEET_CAPACITY",
    "ROAD_NETWORK_ACCESSIBILITY",
  ];

  const bindingConstraints = [];
  if (volume_liters >= (ward.demand_liters || 0)) {
    bindingConstraints.push("DEMAND_CEILING_BOUND");
  } else {
    bindingConstraints.push("TANKER_CAPACITY_LIMIT");
  }

  const dataProvenance = {
    demand: {
      value: `${ward.demand_liters || 0} L (135 LPCD benchmark target)`,
      class: "REFERENCE_CONSTANT",
      source_type: "REFERENCE_CONSTANT",
      subtype: "MOHUA_CPHEEO_GUIDELINES",
      reference: "MoHUA / CPHEEO Urban Guidelines",
      freshness: "CURRENT",
      status: "operational benchmark target",
    },
    vulnerability_index: {
      value: ward.vulnerability_index !== undefined ? ward.vulnerability_index : 0,
      class: "SYNTHETIC_SEEDED",
      source_type: "SYNTHETIC_SEEDED",
      subtype: "SEED_42_DEMO_DATASET",
      reference: "Seed 42 demonstration dataset",
      freshness: "CURRENT",
    },
    population: {
      value: ward.population !== undefined ? ward.population : 0,
      class: "REFERENCE_DATA",
      source_type: "REFERENCE_DATA",
      subtype: "CENSUS_WARD_DEMOGRAPHICS",
      reference: "BMC Ward Census Demographics (2011 + Projections)",
      freshness: "CURRENT",
    },
    dry_pipe_duration: {
      value: `${ward.dry_pipe_hours !== undefined ? ward.dry_pipe_hours : 0} hours`,
      class: "SYNTHETIC_SEEDED",
      source_type: "SYNTHETIC_SEEDED",
      subtype: "SCADA_TELEMETRY",
      reference: "Seed 42 demonstration telemetry",
      freshness: "CURRENT",
    },
    depot_distance: {
      value: `${ward.depot_distance_km !== undefined ? ward.depot_distance_km : 5} km`,
      class: "DERIVED",
      source_type: "DERIVED",
      subtype: "GIS_TRANSIT_ESTIMATE",
      reference: "Centroid-to-depot spatial distance estimate",
      freshness: "CURRENT",
    },
  };

  const alternatives = tanker ? [
    {
      option_id: `opt-${tanker.transponder_id}`,
      tanker_id: tanker.transponder_id,
      capacity_liters: tanker.capacity,
      eta_minutes: tanker.eta_minutes || 15,
      unmet_demand_after: Math.max(0, (ward.demand_liters || 0) - volume_liters),
      selection_status: "SELECTED",
    }
  ] : [];

  const effectiveTier = governance_tier !== undefined ? governance_tier : classifyWardGovernanceTier(ward, volume_liters);
  const govTierName = effectiveTier === 3
    ? "TIER_3_EXECUTIVE"
    : effectiveTier === 2
    ? "TIER_2_SUPERVISORY"
    : "TIER_1_AUTOMATED";

  const decisionReason = `Priority score ${priorityInfo.total_score} driven by ${priorityInfo.why_factors[0]} and ${priorityInfo.why_factors[1]}. Dispatched ${volume_liters}L via tanker ${tanker ? tanker.transponder_id : "N/A"}. Governance: ${govTierName}.`;

  const record = {
    decision_id: decisionId,
    timestamp: now,
    scenario_id: scenario_id || "SEED_42_BASELINE",
    recovery_option_id: recovery_option_id || null,
    target_ward: ward.ward_number || ward.ward_code,
    target_facility: (ward.critical_facilities && ward.critical_facilities[0]) || null,
    decision_type: "TANKER_DISPATCH",
    recommended_action: `Dispatch ${volume_liters}L relief to Ward ${ward.ward_number} (${ward.name})`,
    priority: priorityInfo.total_score,
    priority_factors: priorityInfo.priority_factors,
    priority_breakdown: {
      total_score: priorityInfo.total_score,
      scale: 100,
      factors: priorityInfo.priority_factors,
      sum_contributions: Math.round(priorityInfo.priority_factors.reduce((s, f) => s + f.weighted_contribution, 0) * 10) / 10,
      invariant_holds: Math.abs(priorityInfo.total_score - priorityInfo.priority_factors.reduce((s, f) => s + f.weighted_contribution, 0)) < 0.01,
    },
    // Explicit Allocation Field Semantics (Clarified & Unambiguous)
    ward_unmet_demand_before_liters: ward.demand_liters || 0,
    tanker_requested_liters: volume_liters,
    tanker_allocated_liters: volume_liters,
    ward_unmet_demand_after_liters: Math.max(0, (ward.demand_liters || 0) - volume_liters),
    // Backward-Compatible Legacy Aliases
    allocation_requested: volume_liters,
    allocation_granted: volume_liters,
    unmet_demand: Math.max(0, (ward.demand_liters || 0) - volume_liters),
    constraints_applied: constraintsApplied,
    binding_constraints: bindingConstraints,
    governance_tier: govTierName,
    authorization_status: "AUTHORIZED",
    authorized_by: officer_name || (effectiveTier === 3 ? "DEMO_EXECUTIVE_AUTH" : "Operations Supervisor"),
    data_sources: [
      "BMC Ward Census Demographics",
      "Seed 42 Baseline Operational Telemetry",
      "MoHUA 135 LPCD Service Benchmark",
      "Depot Stock Telemetry",
    ],
    data_provenance: dataProvenance,
    freshness: "CURRENT",
    assumptions: [
      "MoHUA 135 LPCD is an operational benchmark target, not a statutory entitlement",
      "Tanker dispatch transit speed 15 km/h in urban traffic",
      "Seed 42 initial conditions baseline",
    ],
    alternatives_considered: alternatives,
    decision_reason: decisionReason,
    execution_status: status,
    mission_id: mission ? String(mission.id) : null,
    tanker_id: tanker ? tanker.transponder_id : null,
    verification_status: "UNVERIFIED",
    post_action_effect: null,
    limitations: "Deployable operational demonstrator (Seed 42 baseline). Not connected to live Mumbai SCADA, live GPS, or statutory municipal authority.",
  };

  OPERATIONAL_DECISION_RECORDS.set(decisionId, record);
  return record;
}

function seedInitialDecisionRecords() {
  OPERATIONAL_DECISION_RECORDS.clear();
  const wardME = MOCK_WARDS.find(w => w.ward_number === "M/E");
  const wardL = MOCK_WARDS.find(w => w.ward_number === "L");
  const tankerT08 = MOCK_TANKERS.find(t => t.transponder_id === "T-08");
  const tankerT14 = MOCK_TANKERS.find(t => t.transponder_id === "T-14");

  if (wardME) {
    const govTier = classifyWardGovernanceTier(wardME, 10000);
    const dec501 = generateDecisionRecord({
      ward: wardME,
      volume_liters: 10000,
      tanker: tankerT08,
      governance_tier: govTier,
      officer_name: "DEMO_EXECUTIVE_AUTH",
      mission: { id: "501" },
      status: "EN_ROUTE",
      decision_id_override: "dec-seed42-501",
    });
    dec501.target_facility = "Shivaji Nagar Community Supply Point";
  }

  if (wardL) {
    const govTier = classifyWardGovernanceTier(wardL, 8000);
    const dec502 = generateDecisionRecord({
      ward: wardL,
      volume_liters: 8000,
      tanker: tankerT14,
      governance_tier: govTier,
      officer_name: "Operations Supervisor",
      mission: { id: "502" },
      status: "EN_ROUTE",
      decision_id_override: "dec-seed42-502",
    });
    dec502.target_facility = "Asalpha Hillside Booster Point";
  }
}

// ---------------------------------------------------------------------------
// Mutable Operational State (Initialized from Seed 42 Baseline Dataset)
// ---------------------------------------------------------------------------

let wardsState = JSON.parse(JSON.stringify(MOCK_WARDS));
let tankersState = JSON.parse(JSON.stringify(MOCK_TANKERS));
let depotsState = JSON.parse(JSON.stringify(MOCK_DEPOTS));
let alertsState = JSON.parse(JSON.stringify(MOCK_ALERTS));

// Seed initial decisions on load
seedInitialDecisionRecords();

function resetOperationalState() {
  wardsState = JSON.parse(JSON.stringify(MOCK_WARDS));
  tankersState = JSON.parse(JSON.stringify(MOCK_TANKERS));
  depotsState = JSON.parse(JSON.stringify(MOCK_DEPOTS));
  alertsState = JSON.parse(JSON.stringify(MOCK_ALERTS));
  if (typeof resetFieldSyncState === "function") {
    resetFieldSyncState();
  }
  if (typeof resetResilienceState === "function") {
    resetResilienceState();
  }
  if (typeof resetAutonomyState === "function") {
    resetAutonomyState();
  }
  GOVERNANCE_DECISIONS.length = 0;
  GOVERNANCE_DECISIONS.push(...INITIAL_GOV_DECISIONS);
  GOVERNANCE_AUDIT_LOG.length = 0;
  seedInitialDecisionRecords();
  console.log("🔄 Operational state reset to Seed 42 baseline.");
}

async function getWards() {
  if (dbAvailable) {
    try {
      const res = await pool.query(
        `SELECT id AS ward_id, ward_number, name, population, vulnerability_index,
                dry_pipe_hours, historical_deficit, demand_liters, coverage_pct,
                depot_distance_km, status, description
         FROM wards ORDER BY id`
      );
      return res.rows;
    } catch (e) {
      console.log("⚠️  DB query failed, using state fallback:", e.message);
    }
  }
  return wardsState;
}

async function getTankers() {
  if (dbAvailable) {
    try {
      const res = await pool.query(
        `SELECT id AS tanker_id, transponder_id, capacity, current_load, status,
                assigned_ward, eta_minutes
         FROM tankers ORDER BY transponder_id`
      );
      return res.rows;
    } catch (e) {
      console.log("⚠️  DB query failed, using state fallback:", e.message);
    }
  }
  return tankersState;
}

async function getDepots() {
  if (dbAvailable) {
    try {
      const res = await pool.query(
        `SELECT id, name, total_capacity, current_stock, is_active
         FROM depots ORDER BY id`
      );
      return res.rows;
    } catch (e) {
      console.log("⚠️  DB query failed, using state fallback:", e.message);
    }
  }
  return depotsState;
}

async function getAlerts() {
  if (dbAvailable) {
    try {
      const res = await pool.query(
        `SELECT a.id, a.title, a.description, a.severity,
                w.ward_number, a.badge_text
         FROM alerts a LEFT JOIN wards w ON a.ward_id = w.id
         WHERE a.is_active = true
         ORDER BY CASE a.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END`
      );
      return res.rows;
    } catch (e) {
      console.log("⚠️  DB query failed, using state fallback:", e.message);
    }
  }
  return alertsState;
}



function computeEquityLocal(wards, totalSupply = 800000) {
  // FCFS: sorted by ward_id (arbitrary order)
  const fcfsSorted = [...wards].sort((a, b) => a.ward_id - b.ward_id);
  const fcfsAlloc = {};
  let remaining = totalSupply;
  for (const w of fcfsSorted) {
    const alloc = Math.min(w.demand_liters || 0, remaining);
    fcfsAlloc[w.ward_number] = alloc;
    remaining -= alloc;
  }
  for (const w of wards) if (!(w.ward_number in fcfsAlloc)) fcfsAlloc[w.ward_number] = 0;

  // AI: sorted strictly by priority score
  const aiSorted = computePriorityQueue(wards);
  const aiAlloc = {};
  remaining = totalSupply;
  for (const w of aiSorted) {
    const alloc = Math.min(w.demand_liters || 0, remaining);
    aiAlloc[w.ward_number] = alloc;
    remaining -= alloc;
  }
  for (const w of wards) if (!(w.ward_number in aiAlloc)) aiAlloc[w.ward_number] = 0;

  function metrics(allocs) {
    const ratios = wards.map(w => w.demand_liters > 0 ? (allocs[w.ward_number] || 0) / w.demand_liters : 1);
    const mean = ratios.reduce((s, v) => s + v, 0) / ratios.length;
    const stddev = Math.sqrt(ratios.reduce((s, v) => s + (v - mean) ** 2, 0) / ratios.length);
    const equity = Math.max(0, (1 - stddev / 0.5)) * 100;
    const totalAlloc = Object.values(allocs).reduce((s, v) => s + v, 0);
    const vulnAlloc = wards.filter(w => w.vulnerability_index > 0.7).reduce((s, w) => s + (allocs[w.ward_number] || 0), 0);
    const vulnCov = totalAlloc > 0 ? (vulnAlloc / totalAlloc) * 100 : 0;
    return { equity: Math.round(equity * 10) / 10, vulnCov: Math.round(vulnCov * 10) / 10, stddev: Math.round(stddev * 10000) / 10000, total: totalAlloc };
  }

  const fcfsM = metrics(fcfsAlloc);
  const aiM = metrics(aiAlloc);

  return {
    waterflow_ai: { method: "WaterFlow AI (Mumbai BMC)", allocations: aiAlloc, equity_index: aiM.equity, vulnerable_coverage: aiM.vulnCov, total_allocated: aiM.total, stddev: aiM.stddev },
    fcfs: { method: "First-Come-First-Served (Legacy)", allocations: fcfsAlloc, equity_index: fcfsM.equity, vulnerable_coverage: fcfsM.vulnCov, total_allocated: fcfsM.total, stddev: fcfsM.stddev },
    improvement_equity: Math.round((aiM.equity - fcfsM.equity) * 10) / 10,
    improvement_coverage: Math.round((aiM.vulnCov - fcfsM.vulnCov) * 10) / 10,
  };
}

/**
 * Deterministic Constrained Allocation Engine
 * Constraints:
 * 1. Non-negativity: x_i >= 0
 * 2. Demand ceiling: x_i <= D_i (ward.demand_liters)
 * 3. Total supply budget: sum(x_i) <= NetSupply
 *    NetSupply = GrossSupply * (1 - strategic_reserve_fraction)
 * 4. Water quality gate: if !water_quality_safe, dispatch frozen (0 allocation)
 *
 * Benchmark Note: MoHUA 135 LPCD is an operational benchmark target, not a statutory entitlement.
 */
function computeConstrainedAllocation({
  wards,
  available_supply_liters = 800000,
  strategic_reserve_fraction = 0.15,
  water_quality_safe = true,
}) {
  const grossSupply = Math.max(0, Number(available_supply_liters) || 0);
  const reserveFrac = Math.min(Math.max(Number(strategic_reserve_fraction) || 0, 0), 1);
  const reserveLiters = Math.round(grossSupply * reserveFrac);
  const netSupply = water_quality_safe ? Math.max(0, grossSupply - reserveLiters) : 0;

  const totalDemand = wards.reduce((sum, w) => sum + (Number(w.demand_liters) || 0), 0);

  // If water quality compromised, lock down dispatches
  if (!water_quality_safe) {
    const zeroAllocations = wards.map(w => ({
      ward_id: w.ward_id,
      ward_number: w.ward_number,
      name: w.name,
      priority_score: 0,
      demand_liters: w.demand_liters || 0,
      allocated_liters: 0,
      unmet_demand_liters: w.demand_liters || 0,
      satisfaction_ratio: 0,
      allocation_pct: 0,
      binding_constraints: ["WATER_QUALITY_LOCKOUT"],
    }));
    return {
      status: "WATER_QUALITY_LOCKOUT",
      code: "QUALITY_LOCKOUT",
      is_feasible: false,
      reason: "QUALITY_LOCKOUT: Contamination/turbidity threshold breached; emergency freeze on municipal dispatches",
      gross_supply_liters: grossSupply,
      strategic_reserve_held_liters: grossSupply,
      net_supply_liters: 0,
      total_demand_liters: totalDemand,
      total_allocated_liters: 0,
      total_unmet_demand_liters: totalDemand,
      binding_constraints: ["WATER_QUALITY_LOCKOUT"],
      allocations: zeroAllocations,
      explanation: {
        requested_liters: totalDemand,
        available_liters: 0,
        reserved_liters: grossSupply,
        allocated_liters: 0,
        unmet_liters: totalDemand,
        binding_constraints: ["WATER_QUALITY_LOCKOUT"],
        summary: "Water quality gate lockout: 0 L allocated due to contamination alert.",
      },
      provenance: "CONSTRAINED_ALLOCATION_ENGINE",
      policy_benchmark: "MoHUA_135_LPCD_BENCHMARK_TARGET",
    };
  }

  // Zero supply condition
  if (grossSupply === 0 && totalDemand > 0) {
    const zeroAllocations = wards.map(w => ({
      ward_id: w.ward_id,
      ward_number: w.ward_number,
      name: w.name,
      priority_score: 0,
      demand_liters: w.demand_liters || 0,
      allocated_liters: 0,
      unmet_demand_liters: w.demand_liters || 0,
      satisfaction_ratio: 0,
      allocation_pct: 0,
      binding_constraints: ["SUPPLY_BUDGET_REACHED"],
    }));
    return {
      status: "SUPPLY_EXHAUSTED",
      feasibility_status: "INFEASIBLE",
      code: "SUPPLY_LIMIT",
      is_feasible: false,
      reason: "SUPPLY_LIMIT: Reservoir supply is zero; unable to fulfill municipal demand",
      gross_supply_liters: 0,
      strategic_reserve_held_liters: 0,
      net_supply_liters: 0,
      total_demand_liters: totalDemand,
      total_allocated_liters: 0,
      total_unmet_demand_liters: totalDemand,
      binding_constraints: ["SUPPLY_BUDGET_REACHED"],
      allocations: zeroAllocations,
      explanation: {
        requested_liters: totalDemand,
        available_liters: 0,
        reserved_liters: 0,
        allocated_liters: 0,
        unmet_liters: totalDemand,
        binding_constraints: ["SUPPLY_BUDGET_REACHED"],
        summary: "Zero usable supply: All municipal allocations constrained by supply budget.",
      },
      provenance: "CONSTRAINED_ALLOCATION_ENGINE",
      policy_benchmark: "MoHUA_135_LPCD_BENCHMARK_TARGET",
    };
  }

  // 100% reserve held condition
  if (netSupply === 0 && grossSupply > 0 && totalDemand > 0) {
    const zeroAllocations = wards.map(w => ({
      ward_id: w.ward_id,
      ward_number: w.ward_number,
      name: w.name,
      priority_score: 0,
      demand_liters: w.demand_liters || 0,
      allocated_liters: 0,
      unmet_demand_liters: w.demand_liters || 0,
      satisfaction_ratio: 0,
      allocation_pct: 0,
      binding_constraints: ["STRATEGIC_RESERVE_PROTECTION"],
    }));
    return {
      status: "SUPPLY_EXHAUSTED",
      feasibility_status: "INFEASIBLE",
      code: "RESERVE_PROTECTION",
      is_feasible: false,
      reason: "RESERVE_PROTECTION: Entire reservoir supply protected under strategic emergency reserve",
      gross_supply_liters: grossSupply,
      strategic_reserve_held_liters: reserveLiters,
      net_supply_liters: 0,
      total_demand_liters: totalDemand,
      total_allocated_liters: 0,
      total_unmet_demand_liters: totalDemand,
      binding_constraints: ["STRATEGIC_RESERVE_PROTECTION"],
      allocations: zeroAllocations,
      explanation: {
        requested_liters: totalDemand,
        available_liters: 0,
        reserved_liters: reserveLiters,
        allocated_liters: 0,
        unmet_liters: totalDemand,
        binding_constraints: ["STRATEGIC_RESERVE_PROTECTION"],
        summary: "Strategic reserve protection binds 100% of water stock.",
      },
      provenance: "CONSTRAINED_ALLOCATION_ENGINE",
      policy_benchmark: "MoHUA_135_LPCD_BENCHMARK_TARGET",
    };
  }

  // Priority scoring for ranking
  const rankedWards = computePriorityQueue(wards);

  let remainingSupply = netSupply;
  const wardAllocMap = {};
  const wardBindingMap = {};

  // First pass: Allocate strictly along priority ranking up to demand ceiling and supply budget
  for (const item of rankedWards) {
    const demand = item.ward ? (item.ward.demand_liters || 0) : (item.recommended_volume || 0);
    const alloc = Math.min(demand, remainingSupply);
    wardAllocMap[item.ward_number] = alloc;
    remainingSupply -= alloc;

    const bindings = [];
    if (alloc === demand && demand > 0) {
      bindings.push("DEMAND_CEILING_BOUND");
    }
    if (alloc < demand && remainingSupply === 0) {
      bindings.push("SUPPLY_BUDGET_REACHED");
      if (reserveLiters > 0) {
        bindings.push("STRATEGIC_RESERVE_PROTECTION");
      }
    }
    wardBindingMap[item.ward_number] = bindings;
  }

  const allocations = wards.map(w => {
    const demand = Number(w.demand_liters) || 0;
    const allocated = wardAllocMap[w.ward_number] || 0;
    const unmet = Math.max(0, demand - allocated);
    const satisfaction = demand > 0 ? Math.round((allocated / demand) * 1000) / 1000 : 1.0;
    const binding = wardBindingMap[w.ward_number] || (demand === 0 ? ["DEMAND_CEILING_BOUND"] : []);
    return {
      ward_id: w.ward_id,
      ward_number: w.ward_number,
      name: w.name,
      priority_score: rankedWards.find(r => r.ward_number === w.ward_number)?.total_score || 50,
      demand_liters: demand,
      allocated_liters: allocated,
      unmet_demand_liters: unmet,
      satisfaction_ratio: satisfaction,
      allocation_pct: Math.round(satisfaction * 100),
      binding_constraints: binding,
    };
  });

  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated_liters, 0);
  const totalUnmet = allocations.reduce((sum, a) => sum + a.unmet_demand_liters, 0);

  // Active binding constraints across all wards
  const globalBinding = [];
  if (totalAllocated >= netSupply && netSupply < totalDemand) {
    globalBinding.push("SUPPLY_BUDGET_REACHED");
    if (reserveLiters > 0) {
      globalBinding.push("STRATEGIC_RESERVE_PROTECTION");
    }
  }
  if (totalUnmet === 0) {
    globalBinding.push("DEMAND_CEILING_BOUND");
  }

  const isFeasible = true;
  const status = totalUnmet === 0 ? "OPTIMAL_FULL_SATISFACTION" : (totalAllocated > 0 ? "PARTIALLY_CONSTRAINED" : "SUPPLY_EXHAUSTED");
  const feasibilityStatus = totalUnmet === 0 ? "FEASIBLE" : "PARTIALLY_FEASIBLE";
  const code = totalUnmet === 0 ? "DEMAND_CEILING" : "SUPPLY_LIMIT";

  return {
    status,
    feasibility_status: feasibilityStatus,
    code,
    is_feasible: isFeasible,
    gross_supply_liters: grossSupply,
    strategic_reserve_held_liters: reserveLiters,
    net_supply_liters: netSupply,
    total_demand_liters: totalDemand,
    total_allocated_liters: totalAllocated,
    total_unmet_demand_liters: totalUnmet,
    unmet_demand_pct: totalDemand > 0 ? Math.round((totalUnmet / totalDemand) * 100) : 0,
    binding_constraints: globalBinding,
    allocations,
    explanation: {
      requested_liters: totalDemand,
      available_liters: netSupply,
      reserved_liters: reserveLiters,
      allocated_liters: totalAllocated,
      unmet_liters: totalUnmet,
      binding_constraints: globalBinding,
      summary: `Gross supply: ${grossSupply}L | Reserved: ${reserveLiters}L | Usable: ${netSupply}L | Requested: ${totalDemand}L | Allocated: ${totalAllocated}L | Unmet: ${totalUnmet}L | Binding constraints: ${globalBinding.join(", ") || "None"}`,
    },
    provenance: "CONSTRAINED_ALLOCATION_ENGINE",
    policy_benchmark: "MoHUA_135_LPCD_BENCHMARK_TARGET",
  };
}

// ---------------------------------------------------------------------------
// GET /api/dashboard — Main dashboard endpoint
// ---------------------------------------------------------------------------

app.get("/api/dashboard", async (req, res) => {
  try {
    const [wards, tankers, depots, alerts] = await Promise.all([
      getWards(),
      getTankers(),
      getDepots(),
      getAlerts(),
    ]);

    let priorityResult = await callAIEngine("/api/prioritize", {
      wards: wards,
      total_supply: 800000,
    });
    const priorityQueue = priorityResult
      ? priorityResult.queue
      : computePriorityQueue(wards);

    let equityResult = await callAIEngine("/api/simulate-equity", {
      wards: wards,
      total_supply: 800000,
    });
    if (!equityResult) {
      equityResult = computeEquityLocal(wards);
    }

    const fleetAvailable = tankers.filter((t) => t.status === "available").length;
    const fleetTotal = tankers.length;
    const fleetLoading = tankers.filter((t) => t.status === "loading").length;
    const fleetEnRoute = tankers.filter((t) => t.status === "en_route").length;
    const waterAvailable = depots.reduce((sum, d) => sum + (d.current_stock || 0), 0);
    const totalCapacity = depots.reduce((sum, d) => sum + (d.total_capacity || 0), 0);
    const totalDemand = wards.reduce((sum, w) => sum + (w.demand_liters || 0), 0);
    const activeRequests = wards.filter((w) => w.demand_liters > 0).length;
    const criticalWards = wards.filter((w) => w.dry_pipe_hours >= 40 || w.status === "critical").length;

    const constrainedAlloc = computeConstrainedAllocation({
      wards,
      available_supply_liters: waterAvailable,
      strategic_reserve_fraction: 0.15,
      water_quality_safe: true,
    });

    const allMissions = Array.from(MISSION_VERSIONS.values());
    const activeMissions = allMissions.filter((m) => !m.cancelled);
    const pendingVerificationsCount = allMissions.filter(
      (m) =>
        m.verification_status === "PENDING_VERIFICATION" ||
        m.status === "delivered" ||
        m.verification_state === "PENDING_VERIFICATION"
    ).length;

    const kpis = {
      active_requests: activeRequests,
      fleet_available: fleetAvailable,
      fleet_total: fleetTotal,
      fleet_loading: fleetLoading,
      fleet_en_route: fleetEnRoute,
      water_available_kl: Math.round(waterAvailable / 1000),
      total_capacity_kl: Math.round(totalCapacity / 1000),
      water_pct: totalCapacity > 0 ? Math.round((waterAvailable / totalCapacity) * 100) : 0,
      unmet_demand_kl: Math.round(totalDemand / 1000),
      equity_index: equityResult ? Math.round(equityResult.waterflow_ai.equity_index) : 88,
      critical_alerts: criticalWards,
      active_missions_count: activeMissions.length,
      pending_verifications: pendingVerificationsCount,
    };

    res.json({
      city: "Mumbai (Brihanmumbai Municipal Corporation)",
      total_wards: wards.length,
      kpis,
      wards,
      tankers,
      depots,
      alerts,
      priority_queue: priorityQueue,
      equity: equityResult,
      active_missions: activeMissions,
      pending_verifications_count: pendingVerificationsCount,
      constrained_allocation: constrainedAlloc,
      provenance_metadata: {
        policy_standard: "MoHUA_135_LPCD_SERVICE_BENCHMARK",
        policy_disclaimer: "MoHUA 135 LPCD is an operational benchmark target, not a statutory entitlement",
        baseline_seed: 42,
        mode: "DEPLOYABLE_OPERATIONAL_DEMONSTRATOR",
        scada_live_connected: false,
        hydraulic_live_connected: false,
        synthetic_telemetry: true,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/wards — Direct ward data
// ---------------------------------------------------------------------------

app.get("/api/wards", async (req, res) => {
  const wards = await getWards();
  res.json(wards);
});

// ---------------------------------------------------------------------------
// GET /api/tankers — Direct tanker data
// ---------------------------------------------------------------------------

app.get("/api/tankers", async (req, res) => {
  const tankers = await getTankers();
  res.json(tankers);
});

// ---------------------------------------------------------------------------
// GET /api/depots — Direct depot data
// ---------------------------------------------------------------------------

app.get("/api/depots", async (req, res) => {
  const depots = await getDepots();
  res.json(depots);
});

// ---------------------------------------------------------------------------
// GET /api/policy — Canonical Policy Specification
// ---------------------------------------------------------------------------

app.get("/api/policy", async (req, res) => {
  try {
    const aiPolicy = await callAIEngine("/api/policy", {});
    if (aiPolicy) return res.json(aiPolicy);
  } catch (_) {}

  // Fallback to local canonical specification matching config/allocation_policy.yaml
  res.json({
    policy_version: "2.4.0-hardened",
    policy_name: "BMC Municipal Equity Allocation Policy",
    framework: "Explainable Multi-Criteria Allocation Model (Non-ML)",
    weights: {
      vulnerability: 0.30,
      unmet_demand: 0.25,
      population: 0.20,
      historical_deficit: 0.15,
      depot_distance: 0.10,
    },
    normalization: {
      max_dry_pipe_hours: 72.0,
      max_population_reference: 1000000.0,
      max_depot_distance_km: 20.0,
      vulnerability_scale: [0.0, 1.0],
      historical_deficit_scale: [0.0, 1.0],
    },
    tier_thresholds: {
      tier_1_critical: 75.0,
      tier_2_elevated: 55.0,
      tier_3_moderate: 35.0,
      tier_4_nominal: 0.0,
    },
    constraints: {
      allocation_non_negative: true,
      allocation_not_above_unmet_demand: true,
      total_allocation_not_above_available_water: true,
      tanker_load_not_above_capacity: true,
      require_valid_route: true,
    },
  });
});

// ---------------------------------------------------------------------------
// Analytics Endpoints (Phase 17 — Real Time-Series Data Pipeline)
// ---------------------------------------------------------------------------

function loadSyntheticCsv(filename) {
  try {
    const filePath = path.join(__dirname, "..", "data", "synthetic", filename);
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");
    if (lines.length <= 1) return null;
    const headers = lines[0].split(",").map(h => h.trim());
    return lines.slice(1).map(line => {
      const parts = line.split(",").map(p => p.trim());
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = parts[idx]; });
      return obj;
    });
  } catch (e) {
    return null;
  }
}

app.get("/api/analytics/demand-trend", (req, res) => {
  const balanceData = loadSyntheticCsv("daily_water_balance.csv");
  if (balanceData && balanceData.length > 0) {
    const trend = balanceData.slice(-14).map(row => ({
      date: row.date,
      demand_kl: Math.round(parseInt(row.total_ward_demand_liters || 0) / 1000),
      supply_kl: Math.round(parseInt(row.total_emergency_supply_liters || 0) / 1000),
      allocated_kl: Math.round(parseInt(row.total_allocated_liters || 0) / 1000),
      deficit_kl: Math.round(parseInt(row.net_deficit_liters || 0) / 1000),
      scenario: row.active_scenario,
    }));
    return res.json({ success: true, count: trend.length, trend });
  }

  // Graceful structured fallback
  const dates = ["Mon", "Tue", "Wed", "Thu", "Today (Fri)", "Sat", "Sun"];
  const fallback = dates.map((day, i) => ({
    date: day,
    demand_kl: 210 + i * 12,
    supply_kl: 280,
    allocated_kl: 210 + i * 10,
    deficit_kl: Math.max(0, (210 + i * 12) - 280),
    scenario: "SCENARIO_1_NORMAL",
  }));
  res.json({ success: true, count: fallback.length, trend: fallback });
});

app.get("/api/analytics/complaints-trend", (req, res) => {
  const complaints = loadSyntheticCsv("complaints.csv");
  if (complaints && complaints.length > 0) {
    const dateCounts = {};
    complaints.forEach(c => {
      const d = (c.timestamp || "").slice(0, 10);
      if (d) dateCounts[d] = (dateCounts[d] || 0) + 1;
    });
    const result = Object.entries(dateCounts).slice(-14).map(([date, count]) => ({ date, complaint_count: count }));
    return res.json({ success: true, count: result.length, trend: result });
  }
  res.json({ success: true, count: 7, trend: [
    { date: "Mon", complaint_count: 28 },
    { date: "Tue", complaint_count: 32 },
    { date: "Wed", complaint_count: 29 },
    { date: "Thu", complaint_count: 35 },
    { date: "Fri", complaint_count: 42 },
    { date: "Sat", complaint_count: 38 },
    { date: "Sun", complaint_count: 31 },
  ] });
});

app.get("/api/analytics/service-balance", (req, res) => {
  const balance = loadSyntheticCsv("daily_water_balance.csv");
  if (balance && balance.length > 0) {
    const summary = balance.slice(-7);
    return res.json({ success: true, count: summary.length, history: summary });
  }
  res.json({ success: true, history: [] });
});

app.get("/api/analytics/unmet-demand", async (req, res) => {
  const wards = await getWards();
  const sorted = [...wards].sort((a, b) => (b.vulnerability_index || 0) - (a.vulnerability_index || 0));
  res.json({
    success: true,
    total_unmet_liters: sorted.reduce((sum, w) => sum + (w.demand_liters || 0), 0),
    wards: sorted.map(w => ({
      ward_code: w.ward_code || w.ward_number,
      name: w.name,
      vulnerability: w.vulnerability_index,
      demand_liters: w.demand_liters,
      dry_pipe_hours: w.dry_pipe_hours,
    })),
  });
});

// ---------------------------------------------------------------------------
// Health & Version & Readiness checks
// ---------------------------------------------------------------------------

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "WaterFlow OS Gateway (Mumbai BMC)",
    application_version: "1.0.0-RC1",
    policy_version: "3.0.0-research",
    parameter_version: "1.0.0",
    audit_baseline_version: "1.0.0",
    operating_mode: "DEMO / OPERATIONAL SIMULATION",
    is_live: false,
    db_connected: dbAvailable,
    ai_engine_url: AI_ENGINE_URL,
    total_wards: MOCK_WARDS.length,
  });
});

app.get(["/version", "/api/version"], (req, res) => {
  res.json({
    application: "WaterFlow OS",
    application_version: "1.0.0-RC1",
    policy_version: "3.0.0-research",
    parameter_version: "1.0.0",
    audit_baseline_version: "1.0.0",
    operating_mode: "DEMO / OPERATIONAL SIMULATION",
    is_live: false,
    data_provenance: "REFERENCE_DATA + SYNTHETIC_SEEDED",
    db_connected: dbAvailable,
  });
});

app.get("/ready", (req, res) => {
  res.json({
    status: "ready",
    service: "WaterFlow OS Gateway (Mumbai BMC)",
    application_version: "1.0.0-RC1",
    policy_version: "3.0.0-research",
    operating_mode: "DEMO / OPERATIONAL SIMULATION",
    db_connected: dbAvailable,
    wards_loaded: MOCK_WARDS.length === 24,
    depots_loaded: MOCK_DEPOTS.length === 4,
    tankers_loaded: MOCK_TANKERS.length === 25,
  });
});

app.get("/liveness", (req, res) => {
  res.status(200).send("OK");
});


// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Phase 34: Policy & Crisis Sandbox Proxy + Governance Integration
// ---------------------------------------------------------------------------

// In-memory store for sandbox simulation results
const SANDBOX_SIMULATIONS = {};

// POST /api/sandbox/simulate — Proxy to FastAPI sandbox engine + governance integration
app.post("/api/sandbox/simulate", async (req, res) => {
  const { policyPreset, crisisScenario, parameters } = req.body;

  if (!policyPreset || !crisisScenario) {
    return res.status(400).json({
      success: false,
      error: "policyPreset and crisisScenario are required",
    });
  }

  try {
    // Forward to FastAPI sandbox engine
    const aiRes = await fetch(`${AI_ENGINE_URL}/api/sandbox/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policyPreset, crisisScenario, parameters: parameters || {} }),
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.json().catch(() => ({}));
      return res.status(aiRes.status).json({
        success: false,
        error: errBody.detail || `AI Engine returned ${aiRes.status}`,
      });
    }

    const result = await aiRes.json();

    // Store simulation for traceability
    SANDBOX_SIMULATIONS[result.simulation_id] = result;

    // ── Governance Integration ──────────────────────────────
    // If the simulation result triggers Tier 2 or 3, create a governance decision
    const govTier = result.governance?.tier || 1;
    let governanceDecisionId = null;

    if (govTier >= 2) {
      // Check for duplicate pending decisions from same simulation
      const existingPending = GOVERNANCE_DECISIONS.find(
        d => d.simulation_id === result.simulation_id
          && (d.status === "pending" || d.status === "pending_review")
      );

      if (!existingPending) {
        // Create new governance decision
        governanceDecisionId = `gov-sandbox-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

        const govDecision = {
          decision_id: governanceDecisionId,
          decision_type: govTier === 3 ? "emergency_rationing" : "quota_variance",
          governance_tier: govTier,
          status: govTier === 3 ? "pending" : "pending_review",
          ward_code: "SYSTEM",
          volume_liters: Math.round(result.scenario?.unmet_demand || 0),
          tanker_id: null,
          description: `🧪 POLICY SANDBOX: ${policyPreset} + ${crisisScenario} — ${result.scenario_description || "Simulation scenario"}. ` +
            `Impact: Fulfillment ${((result.baseline?.fulfillment_ratio || 0) * 100).toFixed(1)}% → ${((result.scenario?.fulfillment_ratio || 0) * 100).toFixed(1)}%. ` +
            `Unmet demand: ${(result.baseline?.unmet_demand || 0).toLocaleString()} L → ${(result.scenario?.unmet_demand || 0).toLocaleString()} L.`,
          ai_recommendation: result.governance?.proposed_actions?.join(". ") || "Review simulation results.",
          risk_level: result.governance?.risk_level || "medium",
          timestamp: new Date().toISOString(),
          authorized_by: null,
          justification: null,
          // Sandbox traceability fields
          simulation_id: result.simulation_id,
          policy_preset: policyPreset,
          crisis_scenario: crisisScenario,
          sandbox_source: true,
        };

        GOVERNANCE_DECISIONS.push(govDecision);
        console.log(`🧪 Sandbox → Governance Decision created: ${governanceDecisionId} (Tier ${govTier})`);
      } else {
        governanceDecisionId = existingPending.decision_id;
        console.log(`🧪 Sandbox → Duplicate prevented: ${existingPending.decision_id} already pending`);
      }
    }

    // ── HARD BACKEND RULE: Tier 3 MUST NOT execute ──────────
    // A Tier 3 simulation result creates GOVERNANCE_PENDING
    // The action remains blocked until GovernanceCenter authorization
    result.governance_decision_id = governanceDecisionId;

    if (govTier === 3) {
      result.execution_blocked = true;
      result.block_reason = "🔐 AUTHORIZATION REQUIRED — Tier 3 decision hard-blocked until executive PIN sign-off via Governance Center.";
    } else {
      result.execution_blocked = false;
      result.block_reason = null;
    }

    return res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("Sandbox proxy error:", err.message);
    return res.status(502).json({
      success: false,
      error: `Cannot reach AI Engine at ${AI_ENGINE_URL}: ${err.message}`,
    });
  }
});

// GET /api/sandbox/simulation/:id — Retrieve stored simulation
app.get("/api/sandbox/simulation/:id", (req, res) => {
  const sim = SANDBOX_SIMULATIONS[req.params.id];
  if (!sim) {
    return res.status(404).json({ success: false, error: `Simulation '${req.params.id}' not found` });
  }
  res.json(sim);
});

// GET /api/sandbox/presets — Available presets (proxy to AI engine)
app.get("/api/sandbox/presets", async (req, res) => {
  try {
    const aiRes = await fetch(`${AI_ENGINE_URL}/api/sandbox/presets`);
    const data = await aiRes.json();
    res.json(data);
  } catch (err) {
    // Fallback with hardcoded presets
    res.json({
      mode: "DEMO / OPERATIONAL SIMULATION",
      policy_presets: {
        EQUAL_SERVICE: { description: "Equal weight across all 5 factors" },
        PRO_POOR: { description: "50% vulnerability weighting — protect informal settlements" },
        OUTAGE_FIRST: { description: "50% unmet demand weighting — respond to acute outages" },
        FACILITY_PROTECTION: { description: "35% population/facility weighting — protect critical infrastructure" },
        LOGISTICS_FIRST: { description: "35% distance weighting — minimize logistics burden" },
      },
      crisis_scenarios: {
        NORMAL: { description: "Normal operations" },
        HEATWAVE: { description: "Demand +25% heatwave advisory" },
        MAJOR_SUPPLY_REDUCTION: { description: "Supply -35% capacity reduction" },
        TRUNK_MAIN_FAILURE: { description: "Trunk main burst — transmission reduced" },
        FLOOD_DISRUPTION: { description: "Monsoon flooding — losses + routing penalty" },
      },
    });
  }
});

// POST /api/sandbox/check-execution — Check if an authorized sandbox decision can proceed
app.post("/api/sandbox/check-execution", (req, res) => {
  const { decision_id } = req.body;
  if (!decision_id) {
    return res.status(400).json({ success: false, error: "decision_id required" });
  }

  const decision = GOVERNANCE_DECISIONS.find(d => d.decision_id === decision_id);
  if (!decision) {
    return res.status(404).json({ success: false, error: `Decision ${decision_id} not found` });
  }

  // HARD BACKEND RULE: Only authorized decisions can proceed
  if (decision.status !== "authorized") {
    return res.status(403).json({
      success: false,
      error: `Decision ${decision_id} is '${decision.status}' — only 'authorized' decisions can execute.`,
      current_status: decision.status,
      governance_tier: decision.governance_tier,
      requires_authorization: decision.governance_tier === 3,
    });
  }

  // Authorized — but do NOT automatically execute. Just confirm eligibility.
  res.json({
    success: true,
    decision_id,
    status: "AUTHORIZED — READY FOR DISPATCH",
    message: "Decision authorized. Eligible for operational dispatch when dispatch pipeline is active.",
    governance_tier: decision.governance_tier,
    authorized_by: decision.authorized_by,
    note: "DEMO / OPERATIONAL SIMULATION — does not control real infrastructure.",
  });
});

// ---------------------------------------------------------------------------
// 3-Tier HITL Governance Engine — Decision Gate & Authorization
// ---------------------------------------------------------------------------
// Tier 1: AUTONOMOUS   — AI auto-executes (routine <15kL, standard routes, PoD invoices)
// Tier 2: SUPERVISED   — Operator 1-click confirm (quota variance, GPS deviation, quality escrow)
// Tier 3: CRITICAL     — Executive PIN authorization (hospital pre-emption, reserve breach, anti-mafia)
// ---------------------------------------------------------------------------

const INITIAL_GOV_DECISIONS = [
  // ── Tier 1: Autonomous (AI already executed) ──
  {
    decision_id: "gov-t1-001",
    decision_type: "routine_dispatch",
    governance_tier: 1,
    status: "executed",
    ward_code: "P/N",
    volume_liters: 12000,
    tanker_id: "T-03",
    description: "Routine standpost refill dispatched to Ward P/North Malad — 12,000 L via Bhandup Depot. Standard demand within normal 135 LPCD baseline.",
    ai_recommendation: null,
    risk_level: "low",
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    authorized_by: "AI Engine (Auto)",
    justification: "Tier 1 auto-execution. Priority score 71.8, volume ≤15,000L, standard route.",
  },
  {
    decision_id: "gov-t1-002",
    decision_type: "route_optimization",
    governance_tier: 1,
    status: "executed",
    ward_code: "N",
    volume_liters: 8000,
    tanker_id: "T-11",
    description: "2-opt route re-optimization for T-11 serving Ghatkopar. Reduced transit 7.2→5.8 km avoiding Kurla railway crossing congestion.",
    ai_recommendation: null,
    risk_level: "low",
    timestamp: new Date(Date.now() - 18 * 60000).toISOString(),
    authorized_by: "AI Engine (Auto)",
    justification: "Autonomous route optimization within ±500m corridor.",
  },
  {
    decision_id: "gov-t1-003",
    decision_type: "complaint_clustering",
    governance_tier: 1,
    status: "executed",
    ward_code: "G/N",
    volume_liters: 0,
    tanker_id: null,
    description: "7 duplicate grievances from Dharavi Sector 4 collapsed into 1 spatial incident (300m radius, 120-min window). Noise-normalized priority preserved.",
    ai_recommendation: null,
    risk_level: "low",
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    authorized_by: "AI Engine (Auto)",
    justification: "Spatial-temporal deduplication. No allocation change.",
  },
  {
    decision_id: "gov-t1-004",
    decision_type: "invoice_auto_approve",
    governance_tier: 1,
    status: "executed",
    ward_code: "L",
    volume_liters: 10000,
    tanker_id: "T-08",
    description: "Contractor invoice INV-BMC-20260928-00501 auto-approved. ₹4,500 at ₹450/kL. Water quality Grade-A (pH 7.2, TDS 185 mg/L). Triple-lock verified.",
    ai_recommendation: null,
    risk_level: "low",
    timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
    authorized_by: "AI Engine (Auto)",
    justification: "All quality gates passed. CV confidence 0.94, OTP matched, geofence valid.",
  },

  // ── Tier 2: Operator Review (pending confirmation) ──
  {
    decision_id: "gov-t2-001",
    decision_type: "quota_variance",
    governance_tier: 2,
    status: "pending_review",
    ward_code: "H/E",
    volume_liters: 18000,
    tanker_id: "T-05",
    description: "Ward H/East Bandra requesting 18,000 L — 14% above normal baseline. IMD heatwave advisory (+3.2°C) detected. AI proposes granting variance.",
    ai_recommendation: "Grant +14% quota variance. Heatwave-triggered demand surge validated against IMD Santacruz weather station data. Expected to normalize in 48h.",
    risk_level: "medium",
    timestamp: new Date(Date.now() - 6 * 60000).toISOString(),
    authorized_by: null,
    justification: null,
  },
  {
    decision_id: "gov-t2-002",
    decision_type: "quality_escrow",
    governance_tier: 2,
    status: "pending_review",
    ward_code: "S",
    volume_liters: 10000,
    tanker_id: "T-19",
    description: "Water quality borderline for T-19 delivery to Ward S (Bhandup). pH 8.4 (limit: 8.5). TDS 480 mg/L (limit: 500). Contractor payout placed in escrow.",
    ai_recommendation: "Release escrow with ₹0 penalty. Readings within IS 10500 tolerance but near upper boundary. Flag for re-test on next delivery.",
    risk_level: "medium",
    timestamp: new Date(Date.now() - 4 * 60000).toISOString(),
    authorized_by: null,
    justification: null,
  },
  {
    decision_id: "gov-t2-003",
    decision_type: "gps_variance",
    governance_tier: 2,
    status: "pending_review",
    ward_code: "K/E",
    volume_liters: 8000,
    tanker_id: "T-22",
    description: "T-22 delivery GPS shows 180m deviation from designated standpost in Andheri East. Within 300m tolerance but flagged for operator awareness.",
    ai_recommendation: "Accept delivery. GPS offset likely due to narrow lane access via secondary approach road. No fraud indicators detected.",
    risk_level: "low",
    timestamp: new Date(Date.now() - 3 * 60000).toISOString(),
    authorized_by: null,
    justification: null,
  },

  // ── Tier 3: Critical Authorization (hard-blocked until executive PIN) ──
  {
    decision_id: "gov-t3-001",
    decision_type: "hospital_preemption",
    governance_tier: 3,
    status: "pending",
    ward_code: "F/S",
    volume_liters: 25000,
    tanker_id: "T-08",
    description: "⚠️ CRITICAL: Trunk main burst detected in Ward F/South. AI proposes pre-empting 25,000 L from Ward G/South (residential low-priority) to KEM Hospital Dialysis & ICU Unit. 142 patients at immediate risk.",
    ai_recommendation: "Pre-empt 25,000 L to KEM Hospital. G/South residential can sustain 6h delay (current reserve: 18h). Hospital dialysis unit requires continuous supply — failure = medical emergency.",
    risk_level: "critical",
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
    authorized_by: null,
    justification: null,
  },
  {
    decision_id: "gov-t3-002",
    decision_type: "reserve_breach",
    governance_tier: 3,
    status: "pending",
    ward_code: "M/E",
    volume_liters: 40000,
    tanker_id: null,
    description: "🔴 EXTREME: Govandi Ward M/East facing 58h complete outage during +5.2°C heatwave. AI proposes tapping 40,000 L from the statutory 10% Vihar Strategic Disaster Reserve. This breaches the emergency buffer protocol.",
    ai_recommendation: "Release 40,000 L from Strategic Reserve. Current Vihar reservoir at 82% capacity — post-release would remain at 78.4%, still above 70% safety threshold. 807,720 residents affected.",
    risk_level: "critical",
    timestamp: new Date(Date.now() - 1 * 60000).toISOString(),
    authorized_by: null,
    justification: null,
  },
  {
    decision_id: "gov-t3-003",
    decision_type: "fleet_freeze",
    governance_tier: 3,
    status: "pending",
    ward_code: "—",
    volume_liters: 0,
    tanker_id: "T-14",
    description: "🛑 ANTI-MAFIA ALERT: Tanker T-14 (MH-01-CV-4921) diverged 2.3 km off-route into private industrial zone in Bhiwandi. GPS trail shows 22-min unauthorized stop. Contractor payout frozen.",
    ai_recommendation: "Confirm impound & initiate police audit. GPS trail shows unauthorized detour to private water resale point. Pattern matches known mafia diversion route. Estimated public funds at risk: ₹18,000.",
    risk_level: "critical",
    timestamp: new Date(Date.now() - 0.5 * 60000).toISOString(),
    authorized_by: null,
    justification: null,
  },
];

const GOVERNANCE_DECISIONS = [...INITIAL_GOV_DECISIONS];
const GOVERNANCE_AUDIT_LOG = [];



// GET /api/governance/decisions — Return all governance decisions with computed stats
app.get("/api/governance/decisions", (req, res) => {
  const tier = req.query.tier ? parseInt(req.query.tier) : null;
  const status = req.query.status || null;

  let filtered = [...GOVERNANCE_DECISIONS];
  if (tier) filtered = filtered.filter(d => d.governance_tier === tier);
  if (status) filtered = filtered.filter(d => d.status === status);

  // Sort: pending first (Tier 3 > Tier 2), then executed, most recent first
  filtered.sort((a, b) => {
    const statusOrder = { pending: 0, pending_review: 1, authorized: 2, executed: 3, rejected: 4 };
    const aDiff = (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
    if (aDiff !== 0) return aDiff;
    // Within same status, Tier 3 > Tier 2 > Tier 1
    if (a.status === "pending" || a.status === "pending_review") {
      return b.governance_tier - a.governance_tier;
    }
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  const pendingAuth = GOVERNANCE_DECISIONS.filter(d => d.governance_tier === 3 && d.status === "pending").length;
  const pendingReview = GOVERNANCE_DECISIONS.filter(d => d.governance_tier === 2 && (d.status === "pending" || d.status === "pending_review")).length;
  const autoExecuted = GOVERNANCE_DECISIONS.filter(d => d.governance_tier === 1).length;

  res.json({
    decisions: filtered,
    stats: {
      total: GOVERNANCE_DECISIONS.length,
      pending_authorization: pendingAuth,
      pending_review: pendingReview,
      auto_executed: autoExecuted,
      resolved: GOVERNANCE_DECISIONS.filter(d => ["authorized", "rejected", "executed"].includes(d.status)).length,
    },
    governance_policy: {
      tier_1_threshold: "Routine dispatch ≤15,000L, standard route, auto-approved invoices",
      tier_2_threshold: "Quota variance 10-20%, borderline GPS/quality, volume >15kL",
      tier_3_threshold: "Hospital pre-emption, strategic reserve breach, anti-mafia fleet freeze, emergency rationing",
      executive_pin_required_for: "Tier 3 only",
    },
  });
});

// GET /api/governance/stats — Lightweight stats for header badge
app.get("/api/governance/stats", (req, res) => {
  const pendingAuth = GOVERNANCE_DECISIONS.filter(d => d.governance_tier === 3 && d.status === "pending").length;
  const pendingReview = GOVERNANCE_DECISIONS.filter(d => d.governance_tier === 2 && (d.status === "pending" || d.status === "pending_review")).length;
  const autoExecuted = GOVERNANCE_DECISIONS.filter(d => d.governance_tier === 1).length;
  res.json({
    pending_authorization: pendingAuth,
    pending_review: pendingReview,
    auto_executed: autoExecuted,
    total_pending: pendingAuth + pendingReview,
  });
});

// POST /api/governance/authorize — Authorize, approve, or reject a governance decision
app.post("/api/governance/authorize", (req, res) => {
  const { decision_id, action, officer_id, officer_name, pin, justification } = req.body;

  if (!decision_id || !action) {
    return res.status(400).json({ success: false, error: "decision_id and action are required" });
  }

  const decision = GOVERNANCE_DECISIONS.find(d => d.decision_id === decision_id);
  if (!decision) {
    return res.status(404).json({ success: false, error: `Decision ${decision_id} not found` });
  }

  if (decision.status === "authorized" || decision.status === "rejected" || decision.status === "executed") {
    return res.status(409).json({ success: false, error: `Decision already ${decision.status}` });
  }

  // Tier 3 requires valid demonstration executive authorization
  if (decision.governance_tier === 3 && action === "AUTHORIZE") {
    const authCheck = verifyDemoExecutiveAuth(pin);
    if (!authCheck.valid) {
      return res.status(403).json({ success: false, error: authCheck.reason || "Invalid executive authorization PIN" });
    }
  }

  // Record the action
  const auditRecord = {
    audit_id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    decision_id,
    action,
    officer_id: officer_id || "DEMO_OFFICER_01",
    officer_name: officer_name || "Demonstration Operations Supervisor",
    pin_used: pin ? "****" + (String(pin).length > 2 ? String(pin).slice(-2) : String(pin)) : null,
    authorization_gate: "[DEMO AUTHORIZATION GATE — NOT PRODUCTION CREDENTIAL]",
    justification: justification || "",
    timestamp: new Date().toISOString(),
    governance_tier: decision.governance_tier,
    decision_type: decision.decision_type,
  };
  GOVERNANCE_AUDIT_LOG.push(auditRecord);

  // Update decision status
  if (action === "AUTHORIZE" || action === "APPROVE") {
    decision.status = "authorized";
    decision.authorized_by = officer_name || officer_id;
    decision.justification = justification || "Authorized after review";
  } else if (action === "REJECT") {
    decision.status = "rejected";
    decision.authorized_by = officer_name || officer_id;
    decision.justification = justification || "Rejected — re-route or escalate";
  }

  console.log(`🔐 Governance ${action}: ${decision_id} by ${officer_name} (Tier ${decision.governance_tier})`);

  res.json({
    success: true,
    audit_id: auditRecord.audit_id,
    decision_id,
    new_status: decision.status,
    governance_tier: decision.governance_tier,
    officer: officer_name,
    timestamp: auditRecord.timestamp,
  });
});

// GET /api/governance/audit-log — In-memory governance audit log of authorization actions
app.get("/api/governance/audit-log", (req, res) => {
  res.json({
    audit_log: GOVERNANCE_AUDIT_LOG,
    total_entries: GOVERNANCE_AUDIT_LOG.length,
    storage_type: "IN_MEMORY",
    persistence_note: "In-memory governance audit log (resets on server restart or operational state reset)",
    governance_policy_version: "HITL-v1.0",
  });
});


// ---------------------------------------------------------------------------
// Mount Resilience, Autonomy, and Field Sync routes
// (uses GOVERNANCE_DECISIONS and GOVERNANCE_AUDIT_LOG from above)
// ---------------------------------------------------------------------------
mountResilienceRoutes(app, GOVERNANCE_DECISIONS, GOVERNANCE_AUDIT_LOG, {
  createMission,
  verifyMissionDelivery,
  verifyDemoExecutiveAuth,
  generateDecisionRecord,
  OPERATIONAL_DECISION_RECORDS,
  getWards: () => wardsState,
  getTankers: () => tankersState,
  resetOperationalState,
});
mountAutonomyRoutes(app, GOVERNANCE_DECISIONS, GOVERNANCE_AUDIT_LOG);
mountFieldSyncRoutes(app);
console.log("✅ Resilience Engine, Autonomy Engine, and Field Sync routes mounted");

// ---------------------------------------------------------------------------
// Closed-Loop Operational Feedback: Field Delivery Verification -> Demand Fulfillment
// ---------------------------------------------------------------------------

registerDeliveryVerifiedCallback((verificationData) => {
  const { mission_id, ward_code, quantity_delivered_liters, verified_at, authorized_by, transaction_hash } = verificationData;
  console.log(`🔄 Closed-Loop Feedback Triggered: Mission #${mission_id} delivered ${quantity_delivered_liters}L to Ward ${ward_code}`);

  // 1. Decrement target ward demand and clear dry pipe hours if satisfied
  const ward = wardsState.find(w => w.ward_number === ward_code || w.ward_code === ward_code);
  let prevDemand = 0;
  let newDemand = 0;
  let prevDryHours = 0;
  let newDryHours = 0;
  if (ward) {
    prevDemand = ward.demand_liters;
    prevDryHours = ward.dry_pipe_hours || 0;
    ward.demand_liters = Math.max(0, ward.demand_liters - quantity_delivered_liters);
    newDemand = ward.demand_liters;
    if (ward.demand_liters === 0) {
      ward.dry_pipe_hours = 0;
      ward.status = "normal";
      ward.water_deficit_pct = Math.max(0, (ward.water_deficit_pct || 50) - 50);
    } else {
      const satisfiedFraction = quantity_delivered_liters / Math.max(prevDemand, 1);
      ward.dry_pipe_hours = Math.max(0, Math.round((ward.dry_pipe_hours || 0) * (1 - satisfiedFraction)));
      ward.water_deficit_pct = Math.max(0, Math.round((ward.water_deficit_pct || 50) * (1 - satisfiedFraction)));
      if (ward.dry_pipe_hours < 24) ward.status = "warning";
    }
    newDryHours = ward.dry_pipe_hours;
    console.log(`   Ward ${ward_code}: Demand ${prevDemand}L -> ${newDemand}L | Dry Hours -> ${ward.dry_pipe_hours}h`);
  }

  // 2. Return tanker to available pool
  const mission = verificationData.mission || MISSION_VERSIONS.get(String(mission_id));
  const tankerId = mission ? mission.tanker_id : null;
  if (tankerId) {
    const tanker = tankersState.find(t => t.transponder_id === tankerId || t.tanker_id === tankerId);
    if (tanker) {
      tanker.status = "available";
      tanker.current_load = 0;
      tanker.assigned_ward = null;
      tanker.eta_minutes = null;
      console.log(`   Tanker ${tankerId}: Status returned to 'available', current load 0L`);
    }
  }

  const actualVerifiedVol = quantity_delivered_liters;
  const actualUnmetBefore = prevDemand;
  const actualUnmetAfter = newDemand;
  const invariantHolds = (actualUnmetAfter === Math.max(0, actualUnmetBefore - actualVerifiedVol));

  const postActionEffect = {
    planned_recovery_volume_liters: 35000,
    expected_unmet_demand_after_plan_liters: 0,
    actual_executed_volume_liters: actualVerifiedVol,
    actual_verified_volume_liters: actualVerifiedVol,
    actual_unmet_demand_before_execution_liters: actualUnmetBefore,
    actual_unmet_demand_after_execution_liters: actualUnmetAfter,
    recovery_completion_status: actualUnmetAfter === 0 ? "FULLY_RECOVERED" : "PARTIALLY_RECOVERED",
    mathematical_consistency_holds: invariantHolds,
    verified_volume_delivered: actualVerifiedVol,
    pre_delivery_unmet_demand: actualUnmetBefore,
    post_delivery_unmet_demand: actualUnmetAfter,
    unmet_demand_reduction_liters: Math.max(0, actualUnmetBefore - actualUnmetAfter),
    pre_delivery_dry_pipe_hours: prevDryHours,
    post_delivery_dry_pipe_hours: newDryHours,
    receipt_type: "DIGITAL_DELIVERY_RECEIPT",
    digital_receipt: {
      digital_delivery_receipt_id: transaction_hash,
      receipt_reference: transaction_hash,
      transaction_hash,
      type: "DIGITAL_DELIVERY_RECEIPT",
      verified_at: verified_at || new Date().toISOString(),
      authorized_by: authorized_by || "OFFICER_FIELD_OPS",
    },
    state_delta_summary: `Ward ${ward_code}: Unmet demand reduced from ${actualUnmetBefore}L to ${actualUnmetAfter}L (-${actualVerifiedVol}L). Dry pipe hours updated from ${prevDryHours}h to ${newDryHours}h. Tanker ${tankerId || "N/A"} released to pool. Status: PARTIALLY_RECOVERED (Tranche 1).`,
  };

  if (mission) {
    mission.post_action_effect = postActionEffect;
  }

  // Update linked decision record in OPERATIONAL_DECISION_RECORDS
  for (const [, dec] of OPERATIONAL_DECISION_RECORDS) {
    if (dec.mission_id === String(mission_id) || dec.target_ward === ward_code) {
      dec.execution_status = "DELIVERED";
      dec.verification_status = "VERIFIED";
      dec.post_action_effect = postActionEffect;
      break;
    }
  }

  // 3. Append to in-memory governance audit log
  GOVERNANCE_AUDIT_LOG.push({
    audit_id: `audit-loop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    decision_id: `delivery-${mission_id}`,
    action: "DELIVERY_VERIFIED_CLOSED_LOOP",
    officer_id: authorized_by || "OFFICER_FIELD_OPS",
    officer_name: "Operations Field Supervisor",
    ward_code,
    volume_delivered: quantity_delivered_liters,
    transaction_hash,
    timestamp: verified_at || new Date().toISOString(),
    governance_tier: 1,
    decision_type: "delivery_closed_loop_feedback",
    post_action_effect: postActionEffect,
    details: postActionEffect.state_delta_summary,
    audit_storage: "IN_MEMORY",
  });

  return postActionEffect;
});

// ---------------------------------------------------------------------------
// POST /api/dispatch — Operational Dispatch Mission Generation
// ---------------------------------------------------------------------------

app.post("/api/dispatch", async (req, res) => {
  try {
    const {
      ward_code,
      volume_liters,
      tanker_id: requestedTankerId,
      pin,
      officer_id,
      officer_name,
      notes,
    } = req.body;

    if (!ward_code) {
      return res.status(400).json({ success: false, error: "ward_code is required" });
    }

    const wards = await getWards();
    const ward = wards.find(w => w.ward_number === ward_code || w.ward_code === ward_code);
    if (!ward) {
      return res.status(404).json({ success: false, error: `Ward ${ward_code} not found` });
    }

    if (volume_liters !== undefined && (isNaN(Number(volume_liters)) || Number(volume_liters) <= 0)) {
      return res.status(400).json({ success: false, error: "volume_liters must be a positive number" });
    }
    const volume = volume_liters !== undefined ? Number(volume_liters) : (ward.demand_liters || 10000);

    // Determine governance tier
    // Tier 3: Critical ward with >48h dry or volume > 15,000L or extreme vulnerability >= 0.90
    let governanceTier = 1;
    if (volume > 15000 || (ward.dry_pipe_hours >= 48 && ward.vulnerability_index >= 0.90)) {
      governanceTier = 3;
    } else if (volume > 12000 || ward.vulnerability_index >= 0.85) {
      governanceTier = 2;
    }

    // Executive PIN check for Tier 3
    if (governanceTier === 3) {
      const authCheck = verifyDemoExecutiveAuth(pin);
      if (!authCheck.valid) {
        return res.status(403).json({
          success: false,
          error: "TIER_3_PIN_REQUIRED: Critical Tier 3 dispatch requires valid executive demonstration authorization",
          governance_tier: 3,
        });
      }
    }

    // Find available tanker
    const tankers = await getTankers();
    let tanker = null;
    if (requestedTankerId) {
      tanker = tankers.find(
        t => (t.transponder_id === requestedTankerId || t.tanker_id === requestedTankerId) && t.status === "available"
      );
      if (!tanker) {
        return res.status(409).json({ success: false, error: `Requested tanker ${requestedTankerId} is not available`, reason: "NO_AVAILABLE_TANKER" });
      }
    } else {
      tanker = tankers.find(t => t.status === "available" && t.capacity >= volume);
      if (!tanker) {
        tanker = tankers.find(t => t.status === "available");
      }
    }

    if (!tanker) {
      return res.status(409).json({
        success: false,
        error: "FLEET_DEPLETED: No available tanker in fleet for dispatch",
        reason: "NO_AVAILABLE_TANKER",
        status: "INFEASIBLE",
        binding_constraints: ["NO_AVAILABLE_TANKER"],
      });
    }

    // Assign tanker
    tanker.status = "en_route";
    tanker.assigned_ward = ward.ward_number;
    tanker.current_load = volume;
    tanker.eta_minutes = Math.max(10, Math.round((ward.depot_distance_km || 5) * 3));

    // Create authoritative mission in field_sync
    const mission = createMission({
      tanker_id: tanker.transponder_id,
      ward_code: ward.ward_number,
      target_liters: volume,
      destination_address: ward.name,
      destination_lat: ward.lat,
      destination_lng: ward.lng,
      driver_name: tanker.driver_name || "Assigned Driver",
      driver_phone: "+91 98200 44910",
      notes: notes || `Direct operational dispatch to Ward ${ward.ward_number}`,
    });

    const decisionRecord = generateDecisionRecord({
      ward,
      volume_liters: volume,
      tanker,
      governance_tier: governanceTier,
      officer_name,
      officer_id,
      mission,
      pin,
      notes,
    });
    mission.decision_id = decisionRecord.decision_id;

    // Record in governance decisions
    const govDecision = {
      decision_id: decisionRecord.decision_id,
      decision_type: "routine_dispatch",
      governance_tier: governanceTier,
      status: "executed",
      ward_code: ward.ward_number,
      volume_liters: volume,
      tanker_id: tanker.transponder_id,
      mission_id: mission.id,
      operational_decision_id: decisionRecord.decision_id,
      description: `Dispatched ${volume}L via tanker ${tanker.transponder_id} to ${ward.name}`,
      risk_level: governanceTier === 3 ? "critical" : governanceTier === 2 ? "medium" : "low",
      timestamp: new Date().toISOString(),
      authorized_by: officer_name || (governanceTier === 3 ? "Executive Officer (DEMO_EXECUTIVE_AUTH)" : "Operations Supervisor"),
      justification: notes || `Operational dispatch: Priority Ward ${ward.ward_number}`,
    };
    GOVERNANCE_DECISIONS.push(govDecision);

    GOVERNANCE_AUDIT_LOG.push({
      audit_id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      decision_id: decisionRecord.decision_id,
      action: "DISPATCH_EXECUTED",
      officer_id: officer_id || "OP_SUP_01",
      officer_name: officer_name || "Operations Supervisor",
      pin_used: pin ? "****" + (String(pin).length > 2 ? String(pin).slice(-2) : String(pin)) : null,
      ward_code: ward.ward_number,
      volume_liters: volume,
      tanker_id: tanker.transponder_id,
      mission_id: mission.id,
      governance_tier: governanceTier,
      timestamp: new Date().toISOString(),
    });

    console.log(`🚀 Dispatch Executed: Mission #${mission.id} -> Ward ${ward.ward_number} via Tanker ${tanker.transponder_id} (${volume}L) [Tier ${governanceTier}] Decision: ${decisionRecord.decision_id}`);

    res.json({
      success: true,
      message: `Mission #${mission.id} dispatched successfully`,
      mission,
      decision_record: decisionRecord,
      decision_id: decisionRecord.decision_id,
      tanker: {
        transponder_id: tanker.transponder_id,
        status: tanker.status,
        assigned_ward: tanker.assigned_ward,
        eta_minutes: tanker.eta_minutes,
      },
      governance_tier: governanceTier,
      otp_code: mission.otp_code,
    });
  } catch (err) {
    console.error("Dispatch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Operational Decision Record Endpoints (Day 2 Hardened)
// ---------------------------------------------------------------------------

app.get("/api/decisions", (req, res) => {
  const { ward, tier, status } = req.query;
  let list = Array.from(OPERATIONAL_DECISION_RECORDS.values());
  if (ward) list = list.filter(d => d.target_ward === ward);
  if (tier) list = list.filter(d => d.governance_tier && d.governance_tier.includes(tier.toUpperCase()));
  if (status) list = list.filter(d => d.execution_status === status || d.authorization_status === status);
  list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json({
    success: true,
    total: list.length,
    decisions: list,
  });
});

app.get("/api/decisions/:id", (req, res) => {
  const id = req.params.id;
  let record = OPERATIONAL_DECISION_RECORDS.get(id);
  if (!record) {
    record = Array.from(OPERATIONAL_DECISION_RECORDS.values()).find(d => d.mission_id === id);
  }
  if (!record) {
    return res.status(404).json({ success: false, error: `Decision record '${id}' not found` });
  }

  let missionDetails = null;
  if (record.mission_id) {
    missionDetails = MISSION_VERSIONS.get(String(record.mission_id)) || null;
  }

  res.json({
    success: true,
    decision_id: record.decision_id,
    scenario_id: record.scenario_id || "SEED_42_BASELINE",
    recovery_option_id: record.recovery_option_id || null,
    verification_status: record.verification_status,
    decision: record,
    linked_mission: missionDetails,
    complete_trace: {
      decision_id: record.decision_id,
      scenario_id: record.scenario_id || "SEED_42_BASELINE",
      recovery_option_id: record.recovery_option_id || null,
      priority: record.priority,
      priority_factors: record.priority_factors,
      allocation: {
        requested: record.allocation_requested,
        granted: record.allocation_granted,
        unmet_demand: record.unmet_demand,
        binding_constraints: record.binding_constraints,
      },
      governance: {
        tier: record.governance_tier,
        status: record.authorization_status,
        authorized_by: record.authorized_by,
      },
      mission_id: record.mission_id,
      tanker_id: record.tanker_id,
      execution_status: record.execution_status,
      verification_status: record.verification_status,
      post_action_effect: record.post_action_effect,
    },
  });
});

app.get("/api/priority-ranking", async (req, res) => {
  const wards = await getWards();
  const queue = computePriorityQueue(wards);
  res.json({
    success: true,
    policy_version: "2.4.0-hardened",
    total_wards: queue.length,
    provenance_badge: "SYNTHETIC_SEEDED: Seed 42 baseline",
    queue,
  });
});

// ---------------------------------------------------------------------------
// POST /api/allocation/evaluate — Direct Constrained Allocation Evaluation
// ---------------------------------------------------------------------------

app.post("/api/allocation/evaluate", async (req, res) => {
  try {
    const wards = await getWards();
    const depots = await getDepots();
    const totalStock = depots.reduce((sum, d) => sum + (d.current_stock || 0), 0);

    const available_supply_liters = req.body.available_supply_liters !== undefined
      ? req.body.available_supply_liters
      : totalStock;
    const strategic_reserve_fraction = req.body.strategic_reserve_fraction !== undefined
      ? req.body.strategic_reserve_fraction
      : 0.15;
    const water_quality_safe = req.body.water_quality_safe !== undefined
      ? req.body.water_quality_safe
      : true;

    const result = computeConstrainedAllocation({
      wards,
      available_supply_liters,
      strategic_reserve_fraction,
      water_quality_safe,
    });

    res.json(result);
  } catch (err) {
    console.error("Allocation evaluation error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/operational-state/reset — Reset to Baseline Seed 42 State
// ---------------------------------------------------------------------------

app.post("/api/operational-state/reset", (req, res) => {
  resetOperationalState();
  res.json({
    success: true,
    message: "Operational state reset to Seed 42 baseline",
    wards_count: wardsState.length,
    tankers_count: tankersState.length,
    decisions_count: OPERATIONAL_DECISION_RECORDS.size,
  });
});

// ---------------------------------------------------------------------------
// Start server & Exports
// ---------------------------------------------------------------------------

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🌊 WaterFlow OS Gateway running on http://localhost:${PORT}`);
    console.log(`   City:       Mumbai BMC (24 Administrative Wards)`);
    console.log(`   Dashboard:  GET  http://localhost:${PORT}/api/dashboard`);
    console.log(`   Decisions:  GET  http://localhost:${PORT}/api/decisions`);
    console.log(`   Priority:   GET  http://localhost:${PORT}/api/priority-ranking`);
    console.log(`   Resilience: POST http://localhost:${PORT}/api/resilience/simulate`);
    console.log(`   Autonomy:   POST http://localhost:${PORT}/api/automation/evaluate`);
    console.log(`   Field Sync: POST http://localhost:${PORT}/api/field/sync`);
    console.log(`   Dispatch:   POST http://localhost:${PORT}/api/dispatch`);
    console.log(`   AI Engine:  ${AI_ENGINE_URL}`);
    console.log(`   DB Status:  ${dbAvailable ? "✅ Connected" : "⚠️  Mumbai BMC Mock Fallback"}\n`);
  });
}

module.exports = {
  app,
  getWards,
  getTankers,
  getDepots,
  getAlerts,
  resetOperationalState,
  computeConstrainedAllocation,
  computePriorityLocal: computePriority,
  computePriorityQueueLocal: computePriorityQueue,
  computePriority,
  computePriorityQueue,
  generateDecisionRecord,
  verifyDemoExecutiveAuth,
  OPERATIONAL_DECISION_RECORDS,
  GOVERNANCE_DECISIONS,
  GOVERNANCE_AUDIT_LOG,
  CANONICAL_PROVENANCE_CLASSES,
  classifyWardGovernanceTier,
  FAILURE_SCENARIOS,
  analyzeNetworkImpact,
  generateRecoveryAlternatives,
  localizeFault,
  classifyResilienceGovernanceTier,
  ACTIVE_RESILIENCE_TRACES,
};

