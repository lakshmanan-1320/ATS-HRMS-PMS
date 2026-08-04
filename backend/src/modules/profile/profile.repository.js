const { query } = require('../../config/db');

async function getFullEmployeeProfile(employeeId, organizationId) {
  const result = await query(
    `SELECT
       e.*,
       d.name AS department_name,
       hl.level_code AS level_name,
       hl.sort_order AS level_number,
       hl.designation AS level_designation,
       m.first_name AS manager_first_name,
       m.last_name AS manager_last_name,
       m.email AS manager_email,
       m.designation AS manager_designation,
       sm.first_name AS secondary_manager_first_name,
       sm.last_name AS secondary_manager_last_name,
       sm.email AS secondary_manager_email,
       sm.designation AS secondary_manager_designation,
       o.name AS organization_name,
       ap.name AS attendance_policy_name,
       lp.name AS leave_plan_name,
       es.shift_name, es.shift_code, es.start_time AS shift_start_time, es.end_time AS shift_end_time, es.grace_minutes AS shift_grace_minutes,
       EXISTS(
         SELECT 1 FROM employees r 
         WHERE (r.manager_employee_id = e.employee_id OR r.secondary_manager_id = e.employee_id) 
           AND r.organization_id = e.organization_id
       ) AS is_manager,
       (
         SELECT COUNT(*) FROM employees r 
         WHERE (r.manager_employee_id = e.employee_id OR r.secondary_manager_id = e.employee_id) 
           AND r.organization_id = e.organization_id
       ) AS direct_reports_count
     FROM employees e
     LEFT JOIN departments d ON d.department_id = e.department_id
     LEFT JOIN hierarchy_levels hl ON hl.hierarchy_level_id = e.hierarchy_level_id AND hl.organization_id = e.organization_id
     LEFT JOIN employees m ON m.employee_id = e.manager_employee_id
     LEFT JOIN employees sm ON sm.employee_id = e.secondary_manager_id
     LEFT JOIN organizations o ON o.organization_id = e.organization_id
     LEFT JOIN attendance_policies ap ON ap.attendance_policy_id = e.attendance_policy_id
     LEFT JOIN leave_plans lp ON lp.leave_plan_id = e.leave_plan_id
     LEFT JOIN LATERAL (
        SELECT sa.shift_id
        FROM shift_assignments sa
        WHERE sa.employee_id = e.employee_id
          AND sa.effective_from <= CURRENT_DATE
          AND (sa.effective_to IS NULL OR sa.effective_to >= CURRENT_DATE)
        ORDER BY COALESCE(sa.is_temporary, false) DESC, sa.effective_from DESC, sa.created_at DESC
        LIMIT 1
      ) eff_sa ON true
      LEFT JOIN attendance_shifts es ON es.shift_id = COALESCE(
        eff_sa.shift_id,
        e.shift_id,
        (SELECT shift_id FROM attendance_shifts WHERE organization_id = e.organization_id AND is_active = true ORDER BY created_at ASC LIMIT 1)
      )
     WHERE e.employee_id = $1 AND e.organization_id = $2`,
    [employeeId, organizationId]
  );
  if (result.rows[0]) {
    // Delete password_hash for security
    delete result.rows[0].password_hash;
  }
  return result.rows[0] || null;
}

async function getClientAdminProfile(email) {
  const result = await query(
    `SELECT ca.*, o.name AS organization_name
     FROM client_admins ca
     LEFT JOIN organizations o ON o.organization_id = ca.organization_id
     WHERE LOWER(ca.email) = LOWER($1)`,
    [email.trim()]
  );
  return result.rows[0] || null;
}

async function getSuperAdminProfile(email) {
  const result = await query(
    `SELECT super_admin_id, full_name, email, is_active, created_at, updated_at
     FROM super_admins
     WHERE LOWER(email) = LOWER($1)`,
    [email.trim()]
  );
  return result.rows[0] || null;
}

async function getSalaryDetails(employeeId) {
  const configRes = await query(
    `SELECT employee_salary_config_id, salary_type, gross_salary, ctc_amount, effective_from, effective_to
     FROM employee_salary_configs
     WHERE employee_id = $1
       AND effective_from <= CURRENT_DATE
       AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
     LIMIT 1`,
    [employeeId]
  );
  
  if (!configRes.rows[0]) return null;

  const config = configRes.rows[0];

  const componentsRes = await query(
    `SELECT esc.percentage, esc.fixed_amount, esc.calculated_amount, esc.is_manual_override, esc.manual_amount,
            pc.name AS component_name, pc.type AS component_type
     FROM employee_salary_components esc
     JOIN payroll_components pc ON pc.component_id = esc.component_id
     WHERE esc.employee_salary_config_id = $1`,
    [config.employee_salary_config_id]
  );

  return {
    ...config,
    components: componentsRes.rows
  };
}

async function getLeaveDetails(employeeId) {
  const balancesRes = await query(
    `SELECT elb.allocated_days, elb.used_days, elb.financial_year,
            lt.leave_type_name, lt.leave_type_code, lt.is_paid_leave AS is_paid
     FROM employee_leave_balances elb
     JOIN leave_types lt ON lt.leave_type_id = elb.leave_type_id
     WHERE elb.employee_id = $1
     ORDER BY lt.leave_type_name`,
    [employeeId]
  );

  const statsRes = await query(
    `SELECT
       COALESCE(SUM(CASE WHEN current_status = 'APPROVED' AND end_date < CURRENT_DATE THEN total_leave_days ELSE 0 END), 0) AS leaves_taken,
       COALESCE(SUM(CASE WHEN current_status IN ('APPROVED', 'PENDING') AND start_date >= CURRENT_DATE THEN total_leave_days ELSE 0 END), 0) AS future_leaves_planned
     FROM leave_requests
     WHERE employee_id = $1`,
    [employeeId]
  );

  return {
    balances: balancesRes.rows,
    stats: statsRes.rows[0]
  };
}

async function getOfficeLocationPolicies(employeeId) {
  const policyRes = await query(
    `SELECT ap.attendance_policy_id, ap.name AS policy_name, ap.policy_type, ap.enable_location_validation, ap.enable_shift_validation
     FROM employees e
     JOIN attendance_policies ap ON ap.attendance_policy_id = e.attendance_policy_id
     WHERE e.employee_id = $1`,
    [employeeId]
  );

  if (!policyRes.rows[0]) return null;

  const policy = policyRes.rows[0];

  const locationsRes = await query(
    `SELECT ol.location_name, ol.address, ol.latitude, ol.longitude, ol.radius_meters
     FROM attendance_policy_locations apl
     JOIN office_locations ol ON ol.office_location_id = apl.office_location_id
     WHERE apl.attendance_policy_id = $1`,
    [policy.attendance_policy_id]
  );

  return {
    ...policy,
    work_mode: policy.policy_type === 'REMOTE' ? 'Work From Home (WFH)' : 'Work From Office (WFO)',
    locations: locationsRes.rows
  };
}

module.exports = {
  getFullEmployeeProfile,
  getClientAdminProfile,
  getSuperAdminProfile,
  getSalaryDetails,
  getLeaveDetails,
  getOfficeLocationPolicies
};
