const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:54322/postgres'
});

async function runSchema() {
  const schema = fs.readFileSync('./supabase/migrations/20261004000000_deployment_schema.sql', 'utf8');
  await pool.query(schema);
  console.log('Schema applied successfully');
  process.exit(0);
}

runSchema().catch(err => {
  console.error(err);
  process.exit(1);
});
