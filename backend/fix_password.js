const bcrypt = require('./node_modules/bcryptjs');

async function main() {
  const hash = await bcrypt.hash('Password123', 12);
  console.log('New hash for Password123:', hash);
  
  // Now connect to the Neon DB and update it
  const { Pool } = require('./node_modules/pg');
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_ewP4brWvGaU9@ep-lively-wildflower-aovdzcwa-pooler.c-2.ap-southeast-1.aws.neon.tech/pms_db_new?sslmode=require',
    ssl: { rejectUnauthorized: false },
  });

  // First check the current hash
  const current = await pool.query("SELECT user_id, email, password_hash, role, is_active, locked_until, failed_login_attempts FROM users WHERE email = 'admin@insighttechnology.in'");
  console.log('\nCurrent admin row(s):', JSON.stringify(current.rows, null, 2));

  // Also check demo@insight.local
  const demo = await pool.query("SELECT user_id, email, password_hash, role, is_active, locked_until, failed_login_attempts FROM users WHERE email = 'demo@insight.local'");
  console.log('\nDemo admin row(s):', JSON.stringify(demo.rows, null, 2));

  // Update the super admin password
  const res = await pool.query(
    "UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL WHERE email = 'admin@insighttechnology.in' AND role = 'super_admin'",
    [hash]
  );
  console.log('\nUpdated super admin password rows:', res.rowCount);

  // Also update demo client admin
  const demoHash = await bcrypt.hash('Demo@12345', 12);
  const res2 = await pool.query(
    "UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL WHERE email = 'demo@insight.local'",
    [demoHash]
  );
  console.log('Updated demo admin password rows:', res2.rowCount);

  await pool.end();
}

main().catch(console.error);
