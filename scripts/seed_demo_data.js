const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/waterflow_os"
});

const MOCK_WARDS = [
  { ward_id: "1", ward_code: "M/E", name: "Govandi", zone: "Eastern", population: 807720, vulnerability_index: 0.96, dry_pipe_hours: 58, historical_deficit: 0.78, demand_liters: 32000, coverage_pct: 38, depot_distance_km: 4.8, lat: 19.055, lng: 72.918, status: "critical", water_deficit_pct: 82, description: "Demo" },
  { ward_id: "2", ward_code: "G/N", name: "Dharavi", zone: "City", population: 599039, vulnerability_index: 0.93, dry_pipe_hours: 52, historical_deficit: 0.7, demand_liters: 28000, coverage_pct: 42, depot_distance_km: 3.6, lat: 19.043, lng: 72.846, status: "critical", water_deficit_pct: 78, description: "Demo" }
];

const MOCK_TANKERS = [
  { tanker_id: "T-01", capacity_liters: 10000, current_load: 10000, status: "available", location_lat: 19.05, location_lng: 72.9, assigned_ward: null, driver_name: "R. Kumar", contact: "9876543210", eta_minutes: 0 },
  { tanker_id: "T-02", capacity_liters: 12000, current_load: 4200, status: "dispensing", location_lat: 19.04, location_lng: 72.85, assigned_ward: "2", driver_name: "S. Patel", contact: "9876543211", eta_minutes: 0 },
  { tanker_id: "T-08", capacity_liters: 10000, current_load: 10000, status: "available", location_lat: 19.05, location_lng: 72.9, assigned_ward: null, driver_name: "Rajesh Patil", contact: "9820411849", eta_minutes: 0 }
];

async function seed() {
  console.log("Seeding Seed 42 Demo Data...");
  
  await pool.query("DELETE FROM field_operations");
  await pool.query("DELETE FROM missions");
  await pool.query("DELETE FROM operational_decisions");
  await pool.query("DELETE FROM tankers");
  await pool.query("DELETE FROM wards");

  for (const w of MOCK_WARDS) {
    await pool.query(`
      INSERT INTO wards (ward_id, name, zone, population, vulnerability_index, dry_pipe_hours, historical_deficit, demand_liters, coverage_pct, depot_distance_km, lat, lng, status, water_deficit_pct, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [w.ward_id, w.name, w.zone, w.population, w.vulnerability_index, w.dry_pipe_hours, w.historical_deficit, w.demand_liters, w.coverage_pct, w.depot_distance_km, w.lat, w.lng, w.status, w.water_deficit_pct, w.description]);
  }

  for (const t of MOCK_TANKERS) {
    await pool.query(`
      INSERT INTO tankers (tanker_id, capacity_liters, current_load, status, location_lat, location_lng, assigned_ward, driver_name, contact, eta_minutes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [t.tanker_id, t.capacity_liters, t.current_load, t.status, t.location_lat, t.location_lng, t.assigned_ward, t.driver_name, t.contact, t.eta_minutes]);
  }

  // Pre-seed 2 dummy missions to match Seed 42
  await pool.query(`
    INSERT INTO missions (mission_id, ward_id, tanker_id, volume_liters, status, priority_tier, version)
    VALUES ('501', '1', 'T-08', 10000, 'in_transit', 1, 1),
           ('502', '2', 'T-02', 12000, 'in_transit', 2, 1)
  `);

  console.log("Seed 42 Complete.");
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
