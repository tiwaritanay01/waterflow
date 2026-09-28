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
// Helper: Fetch data from DB or fallback to mock
// ---------------------------------------------------------------------------

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
      console.log("⚠️  DB query failed, using mock:", e.message);
    }
  }
  return MOCK_WARDS;
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
      console.log("⚠️  DB query failed, using mock:", e.message);
    }
  }
  return MOCK_TANKERS;
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
      console.log("⚠️  DB query failed, using mock:", e.message);
    }
  }
  return MOCK_DEPOTS;
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
      console.log("⚠️  DB query failed, using mock:", e.message);
    }
  }
  return MOCK_ALERTS;
}

// ---------------------------------------------------------------------------
// Priority Scoring Algorithm (Algorithmic Equity Formula)
// P_i = 0.30*V_i + 0.25*D_i + 0.20*Pop_i + 0.15*H_i + 0.10*Dist_i
// ---------------------------------------------------------------------------

function computePriorityLocal(ward) {
  const MAX_DRY = 72;
  const MAX_POP = 1000000; // 1 Million for Mumbai wards
  const MAX_DIST = 20;

  const vulnNorm = Math.min(Math.max(ward.vulnerability_index || 0, 0), 1);
  const vulnScore = vulnNorm * 0.30 * 100;
  const vulnDesc = vulnNorm >= 0.85 ? "Extreme informal density" : vulnNorm >= 0.65 ? "High vulnerability" : vulnNorm >= 0.45 ? "Moderate vulnerability" : "Stable residential";

  const demandNorm = Math.min((ward.dry_pipe_hours || 0) / MAX_DRY, 1);
  const demandScore = demandNorm * 0.25 * 100;
  const demandDesc = `${Math.round(ward.dry_pipe_hours || 0)}h pipe dry`;

  const popNorm = Math.min((ward.population || 0) / MAX_POP, 1);
  const popScore = popNorm * 0.20 * 100;
  const popDesc = `${((ward.population || 0) / 1000).toFixed(0)}k residents`;

  const deficitNorm = Math.min(Math.max(ward.historical_deficit || 0, 0), 1);
  const deficitScore = deficitNorm * 0.15 * 100;
  const deficitDesc = `${Math.round(deficitNorm * 100)}% last deficit`;

  const distNorm = Math.min((ward.depot_distance_km || 0) / MAX_DIST, 1);
  const distScore = distNorm * 0.10 * 100;
  const distDesc = `${(ward.depot_distance_km || 0).toFixed(1)}km to depot`;

  const total = Math.min(Math.round((vulnScore + demandScore + popScore + deficitScore + distScore) * 10) / 10, 100);
  const tier = total >= 75 ? 1 : total >= 55 ? 2 : total >= 35 ? 3 : 4;

  return {
    ward_id: ward.ward_id,
    ward_number: ward.ward_number,
    ward_code: ward.ward_code || ward.ward_number,
    name: ward.name,
    zone: ward.zone,
    demand_liters: ward.demand_liters,
    total_score: total,
    tier,
    lat: ward.lat,
    lng: ward.lng,
    coverage_pct: ward.coverage_pct,
    water_deficit_pct: ward.water_deficit_pct || Math.round((1 - (ward.coverage_pct || 50) / 100) * 100),
    dry_pipe_hours: ward.dry_pipe_hours,
    population: ward.population,
    vulnerability_index: ward.vulnerability_index,
    breakdown: [
      { factor: "Vulnerability",      weight: 0.30, raw_value: ward.vulnerability_index, normalized: Math.round(vulnNorm * 1000) / 1000, weighted_score: Math.round(vulnScore * 10) / 10, description: vulnDesc },
      { factor: "Dry Pipe Time",      weight: 0.25, raw_value: ward.dry_pipe_hours,      normalized: Math.round(demandNorm * 1000) / 1000, weighted_score: Math.round(demandScore * 10) / 10, description: demandDesc },
      { factor: "Population",         weight: 0.20, raw_value: ward.population,          normalized: Math.round(popNorm * 1000) / 1000, weighted_score: Math.round(popScore * 10) / 10, description: popDesc },
      { factor: "Historical Deficit", weight: 0.15, raw_value: ward.historical_deficit,  normalized: Math.round(deficitNorm * 1000) / 1000, weighted_score: Math.round(deficitScore * 10) / 10, description: deficitDesc },
      { factor: "Depot Distance",     weight: 0.10, raw_value: ward.depot_distance_km,   normalized: Math.round(distNorm * 1000) / 1000, weighted_score: Math.round(distScore * 10) / 10, description: distDesc },
    ],
    recommended_volume: ward.demand_liters,
    description: ward.description,
  };
}

function computePriorityQueueLocal(wards) {
  const scored = wards.map(computePriorityLocal);
  scored.sort((a, b) => b.total_score - a.total_score);
  return scored;
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
  const aiSorted = computePriorityQueueLocal(wards);
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
      : computePriorityQueueLocal(wards);

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
// 3-Tier HITL Governance Engine — Decision Gate & Authorization
// ---------------------------------------------------------------------------
// Tier 1: AUTONOMOUS   — AI auto-executes (routine <15kL, standard routes, PoD invoices)
// Tier 2: SUPERVISED   — Operator 1-click confirm (quota variance, GPS deviation, quality escrow)
// Tier 3: CRITICAL     — Executive PIN authorization (hospital pre-emption, reserve breach, anti-mafia)
// ---------------------------------------------------------------------------

const GOVERNANCE_DECISIONS = [
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
    justification: "Tier 1 auto-execution. Score 62.4, volume ≤15,000L, standard route.",
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

const GOVERNANCE_AUDIT_LOG = [];

/**
 * Classify a dispatch decision into its governance tier.
 * Tier 1: Routine (<15kL, standard route, auto-approved invoices, complaint dedup)
 * Tier 2: Minor variance (10-20% demand bump, borderline GPS, quality escrow)
 * Tier 3: Critical (hospital pre-emption, reserve breach, anti-mafia, emergency rationing)
 */
function classifyGovernanceTier(decision) {
  const { decision_type, volume_liters, risk_level } = decision;

  // Hard-coded critical types always Tier 3
  const criticalTypes = ["hospital_preemption", "reserve_breach", "fleet_freeze", "emergency_rationing"];
  if (criticalTypes.includes(decision_type)) return 3;
  if (risk_level === "critical") return 3;

  // Review types always Tier 2
  const reviewTypes = ["quota_variance", "quality_escrow", "gps_variance"];
  if (reviewTypes.includes(decision_type)) return 2;
  if (risk_level === "medium") return 2;

  // Volume threshold: >15,000L requires at least review
  if (volume_liters > 15000) return 2;

  // Default: autonomous
  return 1;
}

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

  // Tier 3 requires valid executive PIN
  if (decision.governance_tier === 3 && action === "AUTHORIZE") {
    const validPins = ["4491", "admin123", "7419"];
    if (!validPins.includes(pin)) {
      return res.status(403).json({ success: false, error: "Invalid executive authorization PIN" });
    }
  }

  // Record the action
  const auditRecord = {
    audit_id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    decision_id,
    action,
    officer_id: officer_id || "UNKNOWN",
    officer_name: officer_name || "Unknown Officer",
    pin_used: pin ? "****" + pin.slice(-2) : null,
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

// GET /api/governance/audit-log — Immutable audit trail of all authorization actions
app.get("/api/governance/audit-log", (req, res) => {
  res.json({
    audit_log: GOVERNANCE_AUDIT_LOG,
    total_entries: GOVERNANCE_AUDIT_LOG.length,
    governance_policy_version: "HITL-v1.0",
  });
});


// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`\n🌊 WaterFlow OS Gateway running on http://localhost:${PORT}`);
  console.log(`   City:       Mumbai BMC (24 Administrative Wards)`);
  console.log(`   Dashboard:  GET  http://localhost:${PORT}/api/dashboard`);
  console.log(`   AI Engine:  ${AI_ENGINE_URL}`);
  console.log(`   DB Status:  ${dbAvailable ? "✅ Connected" : "⚠️  Mumbai BMC Mock Fallback"}\n`);
});
