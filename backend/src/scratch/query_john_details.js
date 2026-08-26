const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:ashmitha%40123@localhost:5432/pms_db'
});
async function run() {
  const empRes = await pool.query("SELECT employee_id, first_name FROM employees WHERE email = 'john@example.com'");
  const john = empRes.rows[0];
  console.log("JOHN:", john);
  if (john) {
    const balRes = await pool.query("SELECT * FROM employee_leave_balances WHERE employee_id = $1", [john.employee_id]);
    console.log("BALANCES:");
    console.table(balRes.rows);

    const ledgerRes = await pool.query("SELECT * FROM leave_ledger_entries WHERE employee_id = $1", [john.employee_id]);
    console.log("LEDGER:");
    console.table(ledgerRes.rows);
  }
  await pool.end();
}
run();
