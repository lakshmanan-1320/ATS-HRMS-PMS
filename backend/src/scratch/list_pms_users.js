const { query } = require('../src/config/db');

async function main() {
  const res = await query(`
    SELECT user_id, email, role, employee_id
    FROM users
    LIMIT 20
  `);
  console.log('PMS Users List:', res.rows);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
