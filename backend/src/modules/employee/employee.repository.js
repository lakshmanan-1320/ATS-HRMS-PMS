const { query } = require('../../config/db');

async function getEmployees(organizationId, filter) {
  const { search, department_id, status, employment_type, hierarchy_level_id } = filter;
  const params = [organizationId];
  let pi = 2;
  let where = 'WHERE e.organization_id=$1';

  if (search) {
    where += ` AND (e.first_name ILIKE $${pi} OR e.last_name ILIKE $${pi} OR e.employee_code ILIKE $${pi} OR e.email ILIKE $${pi})`;
    params.push(`%${search}%`);
    pi++;
  }
  if (department_id) {
    where += ` AND e.department_id=$${pi}`;
    params.push(department_id);
    pi++;
  }
  if (status) {
    where += ` AND e.status=$${pi}`;
    params.push(status);
    pi++;
  }
  if (employment_type) {
    where += ` AND e.employment_type=$${pi}`;
    params.push(employment_type);
    pi++;
  }
  if (hierarchy_level_id) {
    where += ` AND e.hierarchy_level_id=$${pi}`;
    params.push(hierarchy_level_id);
    pi++;
  }

  const result = await query(`
    SELECT e.employee_id, e.employee_code, e.first_name, e.last_name, e.email, e.phone,
           e.gender, e.date_of_birth, e.date_of_joining,
           e.department_id, d.name AS department_name,
           e.designation, e.employment_type, e.status,
           e.manager_employee_id AS manager_id, CONCAT(m.first_name, ' ', m.last_name) AS manager_name,
           e.secondary_manager_id, CONCAT(sm.first_name, ' ', sm.last_name) AS secondary_manager_name,
           e.hierarchy_level_id, hl.level_code, hl.designation AS level_designation,
           e.father_name, e.mother_name, e.blood_group, e.emergency_contact,
           e.bank_name, e.bank_account_number, e.bank_ifsc, e.bank_account_holder,
           e.uan_number, e.esi_number,
           e.attendance_policy_id, ap.name AS attendance_policy_name, ap.policy_type AS attendance_policy_type,
           e.shift_id, s.shift_name,
           ol.location_name AS office_location_name,
           e.created_at, e.updated_at
    FROM employees e
    LEFT JOIN departments d    ON e.department_id       = d.department_id
    LEFT JOIN employees  m     ON e.manager_employee_id = m.employee_id
    LEFT JOIN employees  sm    ON e.secondary_manager_id = sm.employee_id
    LEFT JOIN hierarchy_levels hl ON e.hierarchy_level_id = hl.hierarchy_level_id
    LEFT JOIN attendance_policies ap ON e.attendance_policy_id = ap.attendance_policy_id
    LEFT JOIN LATERAL (
      SELECT sa.shift_id
      FROM shift_assignments sa
      WHERE sa.employee_id = e.employee_id
        AND sa.effective_from <= CURRENT_DATE
        AND (sa.effective_to IS NULL OR sa.effective_to >= CURRENT_DATE)
      ORDER BY COALESCE(sa.is_temporary, false) DESC, sa.effective_from DESC, sa.created_at DESC
      LIMIT 1
    ) eff_sa ON true
    LEFT JOIN attendance_shifts s ON COALESCE(eff_sa.shift_id, e.shift_id) = s.shift_id
    LEFT JOIN attendance_policy_locations apl ON ap.attendance_policy_id = apl.attendance_policy_id
    LEFT JOIN office_locations ol ON apl.office_location_id = ol.office_location_id
    ${where}
    ORDER BY e.created_at DESC
  `, params);
  return result.rows;
}

async function getOrgChart(organizationId) {
  const result = await query(`
    SELECT e.employee_id, e.employee_code, e.first_name, e.last_name,
           e.designation, e.department_id, d.name AS department_name,
           e.employment_type, e.status,
           e.manager_employee_id AS manager_id,
           CONCAT(m.first_name, ' ', m.last_name) AS manager_name,
           m.employee_code AS manager_code,
           e.secondary_manager_id,
           CONCAT(sm.first_name, ' ', sm.last_name) AS secondary_manager_name,
           sm.employee_code AS secondary_manager_code,
           e.hierarchy_level_id, hl.level_code, hl.designation AS level_designation
    FROM employees e
    LEFT JOIN departments d    ON e.department_id       = d.department_id
    LEFT JOIN employees m      ON e.manager_employee_id = m.employee_id
    LEFT JOIN employees sm     ON e.secondary_manager_id = sm.employee_id
    LEFT JOIN hierarchy_levels hl ON e.hierarchy_level_id = hl.hierarchy_level_id
    WHERE e.organization_id=$1 AND e.status != 'terminated'
    ORDER BY e.first_name
  `, [organizationId]);
  return result.rows;
}

async function getEmployeeById(organizationId, id) {
  const result = await query('SELECT employee_id FROM employees WHERE employee_id=$1 AND organization_id=$2', [id, organizationId]);
  return result.rows[0] || null;
}

async function getDetailedEmployeeById(organizationId, id) {
  const result = await query(`
    SELECT e.employee_id, e.employee_code, e.first_name, e.last_name, e.email, e.phone,
           e.gender, e.date_of_birth, e.date_of_joining,
           e.department_id, d.name AS department_name,
           e.designation, e.employment_type, e.status,
           e.manager_employee_id AS manager_id, CONCAT(m.first_name, ' ', m.last_name) AS manager_name,
           e.secondary_manager_id, CONCAT(sm.first_name, ' ', sm.last_name) AS secondary_manager_name,
           e.hierarchy_level_id, hl.level_code, hl.designation AS level_designation,
           e.father_name, e.mother_name, e.blood_group, e.emergency_contact,
           e.bank_name, e.bank_account_number, e.bank_ifsc, e.bank_account_holder,
           e.uan_number, e.esi_number,
           e.attendance_policy_id, ap.name AS attendance_policy_name, ap.policy_type AS attendance_policy_type,
           e.shift_id, s.shift_name,
           ol.location_name AS office_location_name,
           e.created_at, e.updated_at
    FROM employees e
    LEFT JOIN departments d    ON e.department_id       = d.department_id
    LEFT JOIN employees  m     ON e.manager_employee_id = m.employee_id
    LEFT JOIN employees  sm    ON e.secondary_manager_id = sm.employee_id
    LEFT JOIN hierarchy_levels hl ON e.hierarchy_level_id = hl.hierarchy_level_id
    LEFT JOIN attendance_policies ap ON e.attendance_policy_id = ap.attendance_policy_id
    LEFT JOIN LATERAL (
      SELECT sa.shift_id
      FROM shift_assignments sa
      WHERE sa.employee_id = e.employee_id
        AND sa.effective_from <= CURRENT_DATE
        AND (sa.effective_to IS NULL OR sa.effective_to >= CURRENT_DATE)
      ORDER BY sa.effective_from DESC, sa.created_at DESC
      LIMIT 1
    ) eff_sa ON true
    LEFT JOIN attendance_shifts s ON COALESCE(eff_sa.shift_id, e.shift_id) = s.shift_id
    LEFT JOIN attendance_policy_locations apl ON ap.attendance_policy_id = apl.attendance_policy_id
    LEFT JOIN office_locations ol ON apl.office_location_id = ol.office_location_id
    WHERE e.employee_id = $1 AND e.organization_id = $2
  `, [id, organizationId]);
  return result.rows[0] || null;
}

async function getEmployeeByCode(organizationId, code) {
  const result = await query(
    'SELECT employee_id FROM employees WHERE LOWER(employee_code)=LOWER($1) AND organization_id=$2',
    [code, organizationId]
  );
  return result.rows[0] || null;
}

async function getEmployeeByCodeExcludingId(organizationId, code, excludeId) {
  const result = await query(
    'SELECT employee_id FROM employees WHERE LOWER(employee_code)=LOWER($1) AND organization_id=$2 AND employee_id!=$3',
    [code, organizationId, excludeId]
  );
  return result.rows[0] || null;
}

async function getEmployeeByEmail(organizationId, email) {
  const result = await query(
    'SELECT employee_id FROM employees WHERE LOWER(email)=LOWER($1) AND organization_id=$2',
    [email, organizationId]
  );
  return result.rows[0] || null;
}

async function getEmployeeByEmailExcludingId(organizationId, email, excludeId) {
  const result = await query(
    'SELECT employee_id FROM employees WHERE LOWER(email)=LOWER($1) AND organization_id=$2 AND employee_id!=$3',
    [email, organizationId, excludeId]
  );
  return result.rows[0] || null;
}

async function createEmployee(organizationId, data, txClient = null) {
  const run = txClient || { query };
  const {
    employee_code, first_name, last_name, email, phone,
    gender, date_of_birth, date_of_joining,
    department_id, designation, employment_type, status, manager_id, secondary_manager_id,
    hierarchy_level_id,
    father_name, mother_name, blood_group, emergency_contact,
    bank_name, bank_account_number, bank_ifsc, bank_account_holder,
    uan_number, esi_number,
    attendance_policy_id,
  } = data;

  const result = await run.query(`
    INSERT INTO employees
      (organization_id, employee_code, first_name, last_name, email, phone,
       gender, date_of_birth, date_of_joining, department_id, designation,
       employment_type, status, manager_employee_id, secondary_manager_id, hierarchy_level_id,
       father_name, mother_name, blood_group, emergency_contact,
       bank_name, bank_account_number, bank_ifsc, bank_account_holder,
       uan_number, esi_number, attendance_policy_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
    RETURNING *
  `, [
    organizationId, employee_code, first_name, last_name, email, phone,
    gender, date_of_birth, date_of_joining, department_id, designation,
    employment_type, status, manager_id, secondary_manager_id, hierarchy_level_id,
    father_name, mother_name, blood_group, emergency_contact,
    bank_name, bank_account_number, bank_ifsc, bank_account_holder,
    uan_number || null, esi_number || null, attendance_policy_id || null,
  ]);
  return result.rows[0];
}

async function updateEmployee(organizationId, id, data, txClient = null) {
  const run = txClient || { query };
  const {
    employee_code, first_name, last_name, email, phone,
    gender, date_of_birth, date_of_joining,
    department_id, designation, employment_type, status, manager_id, secondary_manager_id,
    hierarchy_level_id,
    father_name, mother_name, blood_group, emergency_contact,
    bank_name, bank_account_number, bank_ifsc, bank_account_holder,
    uan_number, esi_number,
    attendance_policy_id,
  } = data;

  const result = await run.query(`
    UPDATE employees SET
      employee_code=$1, first_name=$2, last_name=$3, email=$4, phone=$5,
      gender=$6, date_of_birth=$7, date_of_joining=$8, department_id=$9,
      designation=$10, employment_type=$11, status=$12, manager_employee_id=$13,
      secondary_manager_id=$14, hierarchy_level_id=$15,
      father_name=$16, mother_name=$17, blood_group=$18, emergency_contact=$19,
      bank_name=$20, bank_account_number=$21, bank_ifsc=$22, bank_account_holder=$23,
      uan_number=$24, esi_number=$25, attendance_policy_id=$26,
      updated_at=NOW()
    WHERE employee_id=$27 AND organization_id=$28
    RETURNING *
  `, [
    employee_code, first_name, last_name, email, phone,
    gender, date_of_birth, date_of_joining, department_id, designation,
    employment_type, status, manager_id, secondary_manager_id, hierarchy_level_id,
    father_name, mother_name, blood_group, emergency_contact,
    bank_name, bank_account_number, bank_ifsc, bank_account_holder,
    uan_number || null, esi_number || null, attendance_policy_id || null,
    id, organizationId,
  ]);
  return result.rows[0];
}

async function updateEmployeeStatus(organizationId, id, status, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(
    'UPDATE employees SET status=$1, updated_at=NOW() WHERE employee_id=$2 AND organization_id=$3 RETURNING employee_id, status',
    [status, id, organizationId]
  );
  return result.rows[0];
}

async function getManagers(organizationId, filter = {}) {
  const { exclude_id, current_manager_id, current_secondary_id } = filter;
  const params = [organizationId];
  let paramIdx = 2;
  
  let excludeClause = '';
  if (exclude_id) {
    excludeClause = ` AND e.employee_id != $${paramIdx++}`;
    params.push(exclude_id);
  }

  let extraInclude = '';
  if (current_manager_id || current_secondary_id) {
    const idsToInclude = [current_manager_id, current_secondary_id].filter(Boolean);
    if (idsToInclude.length > 0) {
      extraInclude = ` OR e.employee_id IN (${idsToInclude.map(id => `$${paramIdx++}`).join(',')})`;
      params.push(...idsToInclude);
    }
  }

  const sql = `
    SELECT DISTINCT e.employee_id, e.employee_code, e.first_name, e.last_name,
           e.designation, e.department_id, d.name AS department_name,
           e.hierarchy_level_id, hl.level_code, hl.sort_order, hl.designation AS level_designation
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.department_id
    LEFT JOIN hierarchy_levels hl ON e.hierarchy_level_id = hl.hierarchy_level_id
    WHERE e.organization_id = $1
      AND e.status = 'active'
      ${excludeClause}
      AND (
        EXISTS (
          SELECT 1 FROM employees sub 
          WHERE (sub.manager_employee_id = e.employee_id OR sub.secondary_manager_id = e.employee_id)
            AND sub.organization_id = $1
        )
        OR (hl.sort_order IS NOT NULL AND hl.sort_order <= 4)
        OR (hl.level_code IN ('L1', 'L2', 'L3', 'L4'))
        OR (e.designation ILIKE '%manager%' OR e.designation ILIKE '%lead%' OR e.designation ILIKE '%head%' 
            OR e.designation ILIKE '%director%' OR e.designation ILIKE '%chief%' OR e.designation ILIKE '%vp%' 
            OR e.designation ILIKE '%executive%' OR e.designation ILIKE '%president%' OR e.designation ILIKE '%ceo%')
        ${extraInclude}
      )
    ORDER BY hl.sort_order ASC NULLS LAST, e.first_name ASC
  `;

  const result = await query(sql, params);
  return result.rows;
}

module.exports = {
  getEmployees,
  getOrgChart,
  getManagers,
  getEmployeeById,
  getDetailedEmployeeById,
  getEmployeeByCode,
  getEmployeeByCodeExcludingId,
  getEmployeeByEmail,
  getEmployeeByEmailExcludingId,
  createEmployee,
  updateEmployee,
  updateEmployeeStatus,
};
