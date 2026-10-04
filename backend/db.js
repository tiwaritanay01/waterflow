const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/waterflow_os",
  max: 10,
  connectionTimeoutMillis: 3000,
});

let dbAvailable = false;

async function checkDb() {
  try {
    await pool.query("SELECT 1");
    dbAvailable = true;
    console.log("✅ PostgreSQL connected");
  } catch (e) {
    dbAvailable = false;
    console.log("⚠️  PostgreSQL unavailable — using Mock Fallback", e.message);
  }
}

// Check initially
checkDb();

module.exports = {
  pool,
  getDbAvailable: () => dbAvailable,
  checkDb
};
