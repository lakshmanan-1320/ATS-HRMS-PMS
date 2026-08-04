const { query } = require('../config/db');

async function check() {
  try {
    console.log('--- Inspecting Priya and Arjun Database State ---');

    // 1. Fetch employee details
    const employees = await query("SELECT employee_id, first_name, last_name, email, manager_employee_id, status FROM employees");
    console.log('\nEmployees List in DB:');
    console.log(employees.rows);

    // 2. Fetch user login details
    const users = await query("SELECT user_id, email, role, is_active, employee_id FROM users");
    console.log('\nUser Logins in DB:');
    console.log(users.rows);

    // 3. Fetch regularization requests
    const regs = await query("SELECT regularization_id, employee_id, manager_employee_id, current_status, attendance_date FROM attendance_regularizations");
    console.log('\nRegularization Requests in DB:');
    console.log(regs.rows);

  } catch (err) {
    console.error('Error checking DB:', err);
  }
}

check();
