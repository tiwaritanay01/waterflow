const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.nlisngjqhrshrbxxiulg:WaterFlowOSop@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});
pool.query('SELECT 1').then(() => console.log('Connected')).catch(e => console.error(e));
