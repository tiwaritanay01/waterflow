const { Pool } = require("pg");

const fs = require("fs");
const path = require("path");

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/waterflow_os";
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const pool = new Pool({
  connectionString,
  max: 10,
  connectionTimeoutMillis: 10000,
  ssl: isLocal ? false : { 
    rejectUnauthorized: false
  }
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
    console.log("⚠️  DATABASE_UNAVAILABLE", {
      name: e?.name,
      code: e?.code,
      message: e?.message,
      errno: e?.errno,
      syscall: e?.syscall
    });
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
