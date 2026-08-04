const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'pms_db', user: 'postgres', password: 'postgres@123' });

async function check() {
  const r = await pool.query('SELECT id, email, is_active, password_hash FROM super_admins WHERE email = $1', ['info@insighthcm.in']);
  if (!r.rows.length) {
    console.log('Super admin NOT FOUND');
    return pool.end();
  }
  const sa = r.rows[0];
  console.log('Found:', { id: sa.id, email: sa.email, is_active: sa.is_active });

  const candidates = ['Admin@1234', 'Admin@12324', 'Admin@123', 'Admin@12345', 'Info@1234', 'Insight@123'];
  for (const p of candidates) {
    const match = await bcrypt.compare(p, sa.password_hash);
    console.log(`  "${p}" -> ${match ? '✅ MATCH' : '❌'}`);
  }
  await pool.end();
}

check().catch(e => { console.error(e.message); pool.end(); });
