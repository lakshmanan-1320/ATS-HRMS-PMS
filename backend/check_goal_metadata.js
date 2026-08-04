const path = require('path');
const { query } = require(path.join('d:/Insight HCM/pms-management/Performance-Management-System/backend/src/config/db'));

async function main() {
  const res = await query(`
    SELECT goal_id, created_by, approved_by, assigned_by
    FROM goals
    WHERE goal_code = 'GOAL-000106'
  `);
  console.log('Goal 106 metadata fields:', res.rows);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
