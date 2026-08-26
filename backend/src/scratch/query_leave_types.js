const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ashmitha%40123@localhost:5432/pms_db'
});

async function run() {
  try {
    console.log("--- Leave Types ---");
    const ltRes = await pool.query("SELECT leave_type_id, leave_type_name, leave_type_code, is_active, is_paid_leave FROM leave_types");
    console.table(ltRes.rows);

    console.log("\n--- Leave Plans ---");
    const lpRes = await pool.query("SELECT leave_plan_id, name, is_active, organization_id FROM leave_plans");
    console.table(lpRes.rows);

    console.log("\n--- Leave Plan Types ---");
    const lptRes = await pool.query(`
      SELECT lpt.leave_plan_id, lp.name as plan_name, lpt.leave_type_id, lt.leave_type_name as leave_type_name, lpt.quota_days, lpt.accrual_type
      FROM leave_plan_types lpt
      JOIN leave_plans lp ON lpt.leave_plan_id = lp.leave_plan_id
      JOIN leave_types lt ON lpt.leave_type_id = lt.leave_type_id
    `);
    console.table(lptRes.rows);

    console.log("\n--- Organization Leave Settings ---");
    const settingsRes = await pool.query("SELECT * FROM organization_leave_settings");
    console.table(settingsRes.rows);

    console.log("\n--- Employee Details ---");
    const empRes = await pool.query(`
      SELECT employee_id, first_name, last_name, email, date_of_joining, leave_plan_id, organization_id
      FROM employees WHERE email IN ('john@example.com', 'arjun.sharma@company.com')
    `);
    console.table(empRes.rows);

    for (const emp of empRes.rows) {
      console.log(`\n--- ${emp.first_name}'s Leave Balances ---`);
      const balRes = await pool.query(`
        SELECT eb.*, lt.leave_type_name as leave_type_name 
        FROM employee_leave_balances eb
        JOIN leave_types lt ON eb.leave_type_id = lt.leave_type_id
        WHERE eb.employee_id = $1
      `, [emp.employee_id]);
      console.table(balRes.rows);

      console.log(`\n--- ${emp.first_name}'s Ledger Entries ---`);
      const ledgerRes = await pool.query(`
        SELECT * FROM leave_ledger_entries WHERE employee_id = $1
      `, [emp.employee_id]);
      console.table(ledgerRes.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
