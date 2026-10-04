const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/waterflow_os",
  max: 10,
  connectionTimeoutMillis: 3000,
});

let dbAvailable = false;
let dbStatus = "DATABASE_UNAVAILABLE";

async function checkDb() {
  if (!process.env.DATABASE_URL) {
    dbStatus = "DATABASE_UNAVAILABLE";
    dbAvailable = false;
    console.log("⚠️  DATABASE_UNAVAILABLE");
    return;
  }
  dbStatus = "DATABASE_CONFIGURED";
  try {
    await pool.query("SELECT 1");
    dbAvailable = true;
    dbStatus = "DATABASE_CONNECTED";
    console.log("✅ DATABASE_CONNECTED");
  } catch (e) {
    dbAvailable = false;
    dbStatus = "DATABASE_UNAVAILABLE";
    console.log("⚠️  DATABASE_UNAVAILABLE");
  }
}

// Check initially
checkDb();

module.exports = {
  pool,
  getDbAvailable: () => dbAvailable,
  getDbStatus: () => dbStatus,
  checkDb
};
