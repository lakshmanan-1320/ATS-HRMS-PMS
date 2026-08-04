const { query } = require('../config/db');

async function check() {
  try {
    const orgs = await query('SELECT * FROM organizations');
    console.log('Organizations count:', orgs.rows.length, orgs.rows);

    const clientAdmins = await query('SELECT * FROM client_admins');
    console.log('Client Admins count:', clientAdmins.rows.length, clientAdmins.rows);

    const employees = await query('SELECT employee_id, first_name, last_name, email, organization_id FROM employees');
    console.log('Employees count:', employees.rows.length, employees.rows);

    const users = await query('SELECT user_id, email, role, organization_id FROM users');
    console.log('Users count:', users.rows.length, users.rows);

    const depts = await query('SELECT * FROM departments');
    console.log('Departments count:', depts.rows.length, depts.rows.map(d => ({ department_id: d.department_id, name: d.name, organization_id: d.organization_id })));

    const levels = await query('SELECT * FROM hierarchy_levels');
    console.log('Hierarchy Levels count:', levels.rows.length, levels.rows.map(l => ({ hierarchy_level_id: l.hierarchy_level_id, designation: l.designation, organization_id: l.organization_id })));

  } catch (err) {
    console.error('Error running check script:', err);
  }
}

check();
