const { query } = require('../../config/db');

async function getMyProfile(employeeId, organizationId) {
  const result = await query(
    `SELECT
       e.employee_id AS id, e.employee_code, e.first_name, e.last_name, e.email, e.phone,
       e.designation, e.employment_type, e.date_of_joining, e.gender, e.status,
       e.hierarchy_level_id,
       d.name AS department_name, d.department_id,
       hl.level_code AS level_name, hl.sort_order AS level_number, hl.designation AS level_designation,
       COALESCE(m.employee_id, sm.employee_id) AS manager_id,
       COALESCE(m.first_name, sm.first_name) AS manager_first_name,
       COALESCE(m.last_name, sm.last_name) AS manager_last_name,
       COALESCE(m.email, sm.email) AS manager_email,
       COALESCE(m.designation, sm.designation) AS manager_designation,
       EXISTS(SELECT 1 FROM employees r WHERE (r.manager_employee_id = e.employee_id OR r.secondary_manager_id = e.employee_id) AND r.organization_id = e.organization_id) AS is_manager,
       (SELECT COUNT(*) FROM employees r WHERE (r.manager_employee_id = e.employee_id OR r.secondary_manager_id = e.employee_id) AND r.organization_id = e.organization_id) AS direct_reports_count,
       o.name AS organization_name,
       es.shift_name, es.shift_code, es.start_time AS shift_start_time, es.end_time AS shift_end_time, es.color_code AS shift_color_code, es.grace_minutes AS shift_grace_minutes
     FROM employees e
     LEFT JOIN departments d ON d.department_id = e.department_id
     LEFT JOIN hierarchy_levels hl ON hl.hierarchy_level_id = e.hierarchy_level_id AND hl.organization_id = e.organization_id
     LEFT JOIN employees m ON m.employee_id = e.manager_employee_id
     LEFT JOIN employees sm ON sm.employee_id = e.secondary_manager_id
     LEFT JOIN organizations o ON o.organization_id = e.organization_id
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
  return result.rows[0] || null;
}

async function getMyTeam(employeeId, organizationId) {
  const result = await query(
    `SELECT
       e.employee_id AS id, e.employee_code, e.first_name, e.last_name, e.email,
       e.designation, e.status,
       d.name AS department_name,
       hl.level_code AS level_name, hl.sort_order AS level_number,
       EXISTS(SELECT 1 FROM employees r WHERE r.manager_employee_id = e.employee_id AND r.organization_id = e.organization_id) AS is_manager
     FROM employees e
     LEFT JOIN departments d ON d.department_id = e.department_id
     LEFT JOIN hierarchy_levels hl ON hl.hierarchy_level_id = e.hierarchy_level_id AND hl.organization_id = e.organization_id
     WHERE e.manager_employee_id = $1 AND e.organization_id = $2
     ORDER BY hl.sort_order DESC, e.first_name`,
    [employeeId, organizationId]
  );
  return result.rows;
}

async function getMyGoals(employeeId, organizationId) {
  const result = await query(
    `SELECT
       g.goal_id, g.title, g.goal_type, g.priority, g.status, g.progress,
       g.start_date, g.due_date, g.weight, g.target_metric,
       g.parent_goal_id,
       pg.title AS parent_goal_title,
       g.pending_completion, g.completion_note,
       g.completion_submitted_at, g.completion_rejection_reason,
       (SELECT COUNT(*) FROM goals sg WHERE sg.parent_goal_id = g.goal_id AND sg.client_admin_id = g.client_admin_id) AS sub_goal_count
     FROM goals g
     LEFT JOIN goals pg ON pg.goal_id = g.parent_goal_id
     WHERE g.assigned_to_employee_id = $1
       AND g.client_admin_id = (SELECT client_admin_id FROM client_admins WHERE organization_id = $2)
     ORDER BY g.created_at DESC`,
    [employeeId, organizationId]
  );
  return result.rows;
}

module.exports = { getMyProfile, getMyTeam, getMyGoals };
