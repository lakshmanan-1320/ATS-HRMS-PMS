const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ashmitha%40123@localhost:5432/pms_db'
});

async function run() {
  try {
    console.log("Removing migration log for 031_sync_leave_quotas.sql...");
    await pool.query("DELETE FROM schema_migrations WHERE name = '031_sync_leave_quotas.sql'");
    console.log("Migration log removed. Rerunning runMigrations...");
    
    const runMigrations = require('../src/database/runMigrations');
    await runMigrations();
    console.log("Re-applied migration successfully.");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
