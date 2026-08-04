const path = require('path');
const { query } = require(path.join('d:/Insight HCM/pms-management/Performance-Management-System/backend/src/config/db'));

async function main() {
  const res = await query(`
    SELECT user_id, email, employee_id
    FROM users
    WHERE user_id = 'be773668-38c9-4ae7-a15e-44d58572cb39'
  `);
  console.log('User details:', res.rows);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
