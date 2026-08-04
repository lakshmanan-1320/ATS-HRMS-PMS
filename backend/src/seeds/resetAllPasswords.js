const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ host: 'localhost', port: 5432, database: 'pms_db', user: 'postgres', password: 'postgres@123' });

async function run() {
  const hash = await bcrypt.hash('Password', 12);

  const sa = await pool.query(
    'UPDATE super_admins SET password_hash = $1, updated_at = NOW() RETURNING email',
    [hash]
  );
  console.log(`✅ Super admins updated: ${sa.rows.map(r => r.email).join(', ')}`);

  const ca = await pool.query(
    'UPDATE client_admins SET password_hash = $1, updated_at = NOW() RETURNING email',
    [hash]
  );
  console.log(`✅ Client admins updated: ${ca.rows.length} row(s)`);

  const emp = await pool.query(
    'UPDATE employees SET password_hash = $1 RETURNING id',
    [hash]
  );
  console.log(`✅ Employees updated: ${emp.rows.length} row(s)`);

  console.log('\nNew password for ALL accounts: Password');
  await pool.end();
}

run().catch(e => { console.error('❌', e.message); pool.end(); });
