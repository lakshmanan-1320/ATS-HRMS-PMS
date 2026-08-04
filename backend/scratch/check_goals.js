require('dotenv').config();
const { query } = require('../src/config/db');

async function run() {
  try {
    const empRes = await query("SELECT employee_id, email, first_name, department_id FROM employees WHERE email = 'priyanka.goyal@company.com'");
    if (empRes.rows.length === 0) {
      console.log('Employee priyanka.goyal@company.com not found');
      return;
    }
    const emp = empRes.rows[0];
    console.log('Found employee:', emp);

    const goalsRes = await query(
      `SELECT goal_id, title, status, parent_goal_id, performance_configuration_id, 
              assigned_to_employee_id, assigned_to_department_id, created_by, organization_id, goal_type 
       FROM goals WHERE assigned_to_employee_id = $1 OR created_by = (SELECT user_id FROM users WHERE employee_id = $1)`,
      [emp.employee_id]
    );
    console.log(`\nGoals count for Priyanka (total ${goalsRes.rows.length}):`);
    console.log(JSON.stringify(goalsRes.rows, null, 2));

  } catch (err) {
    console.error('Error running scratch script:', err);
  }
}

run();
