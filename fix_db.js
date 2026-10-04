const fs = require('fs');
let content = fs.readFileSync('backend/db.js', 'utf8');
const oldPool = const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/waterflow_os",
  max: 10,
  connectionTimeoutMillis: 3000,
});;
const newPool = const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/waterflow_os";
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const pool = new Pool({
  connectionString,
  max: 10,
  connectionTimeoutMillis: 3000,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});;
content = content.replace(oldPool, newPool);
fs.writeFileSync('backend/db.js', content, 'utf8');
console.log('Fixed db.js pool SSL');
