require('dotenv').config();
const { query } = require('../src/config/db');

const GOAL_SELECT = `
  SELECT 
    g.*,
    c.name AS goal_category_name,
    pc.cycle_name AS performance_cycle_name,
    pc.status AS performance_cycle_status,
    TRIM(CONCAT(e.first_name, ' ', e.last_name)) AS assigned_to_employee_name,
    e.employee_code AS assigned_to_employee_code,
    d.name AS assigned_to_department_name,
    TRIM(CONCAT(cb.first_name, ' ', cb.last_name)) AS creator_name,
    TRIM(CONCAT(ae.first_name, ' ', ae.last_name)) AS approver_name
  FROM goals g
  LEFT JOIN goal_categories c ON g.goal_category_id = c.category_id
  LEFT JOIN performance_configurations pc ON g.performance_configuration_id = pc.performance_configuration_id
  LEFT JOIN employees    e   ON g.assigned_to_employee_id   = e.employee_id
  LEFT JOIN departments  d   ON g.assigned_to_department_id = d.department_id
  LEFT JOIN users        cu  ON g.created_by                = cu.user_id
  LEFT JOIN employees    cb  ON cu.employee_id              = cb.employee_id
  LEFT JOIN users        au  ON g.approved_by                = au.user_id
  LEFT JOIN employees    ae  ON au.employee_id              = ae.employee_id
`;

async function run() {
  try {
    const orgId = '465023ed-ffd9-41b0-8fc6-8bd5f691d3dc';
    const myEmpId = '4902a11d-b2d3-4676-9849-8fcb3fbbb81e';
    const myUserId = '1b20da69-eab8-4f23-aaad-4f3b1fc631ea';
    const configId = '22791c09-62a7-4424-b6aa-5dd98a591e8e';

    const conditions = ['g.organization_id = $1'];
    const params = [orgId];
    let i = 2;

    // mimic my_goals_only
    conditions.push(`(
      g.assigned_to_employee_id = $${i} 
      OR g.created_by = $${i+1} 
      OR g.goal_type = 'company' 
      OR (g.goal_type = 'department' AND g.assigned_to_department_id = (SELECT department_id FROM employees WHERE employee_id = $${i}))
    )`);
    params.push(myEmpId, myUserId);
    i += 2;

    // mimic my_employee_id
    conditions.push(`(
      g.assigned_to_department_id IS NULL 
      OR g.assigned_to_department_id = (SELECT department_id FROM employees WHERE employee_id = $${i})
    )`);
    params.push(myEmpId);
    i++;

    // mimic active config
    conditions.push(`g.performance_configuration_id = $${i}`);
    params.push(configId);
    i++;

    let queryText = `${GOAL_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY g.created_at DESC`;
    console.log('SQL Query:', queryText);
    console.log('Params:', params);

    const res = await query(queryText, params);
    console.log(`\nQueryResult count: ${res.rows.length}`);
    console.log(res.rows.map(r => ({ goal_id: r.goal_id, title: r.title, technique: r.performance_technique })));
  } catch (err) {
    console.error(err);
  }
}

run();
