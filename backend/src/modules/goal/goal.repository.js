const { query, withTransaction } = require('../../config/db');

const GOAL_SELECT = `
  SELECT
    g.goal_id, g.organization_id, g.financial_year_id, g.title, g.description, g.goal_type,
    g.parent_goal_id, pg.title AS parent_goal_title,
    g.assigned_to_employee_id,
    CONCAT(ae.first_name,' ',ae.last_name) AS assigned_to_employee_name,
    CONCAT(ae.first_name,' ',ae.last_name) AS owner_employee_name,
    ae.employee_code AS assigned_to_employee_code,
    g.assigned_to_department_id, COALESCE(d.name, emp_d.name) AS assigned_to_department_name,
    g.created_by,
    COALESCE(NULLIF(CONCAT(cue.first_name, ' ', cue.last_name), ' '), cu.email) AS created_by_name,
    g.assigned_by,
    COALESCE(NULLIF(CONCAT(asge.first_name, ' ', asge.last_name), ' '), asg.email) AS assigned_by_name,
    g.start_date, g.due_date, g.target_metric,
    g.weight, g.progress, g.override_progress,
    g.override_by, CONCAT(oe.first_name,' ',oe.last_name) AS override_by_name,
    g.override_reason,
    g.priority, g.status,
    g.submitted_at,
    g.approved_by,
    COALESCE(NULLIF(CONCAT(aue.first_name, ' ', aue.last_name), ' '), au.email) AS approved_by_name,
    g.approved_at,
    g.rejected_by, g.rejected_at, g.rejection_reason,
    g.created_at, g.updated_at,
    g.goal_code, g.visibility,
    g.goal_category_id,
    gc.name AS goal_category_name,
    g.goal_category,
    COALESCE(g.performance_technique, 'KPI') AS performance_technique
  FROM goals g
  LEFT JOIN goals        pg ON g.parent_goal_id             = pg.goal_id
  LEFT JOIN employees    ae ON g.assigned_to_employee_id    = ae.employee_id
  LEFT JOIN departments  d  ON g.assigned_to_department_id  = d.department_id
  LEFT JOIN departments  emp_d ON ae.department_id          = emp_d.department_id
  LEFT JOIN employees    oe ON g.override_by                = oe.employee_id
  LEFT JOIN goal_categories gc ON g.goal_category_id         = gc.category_id
  LEFT JOIN users        cu ON g.created_by                 = cu.user_id
  LEFT JOIN employees    cue ON cu.employee_id              = cue.employee_id
  LEFT JOIN users        au ON g.approved_by                = au.user_id
  LEFT JOIN employees    aue ON au.employee_id              = aue.employee_id
  LEFT JOIN users        asg ON g.assigned_by               = asg.user_id
  LEFT JOIN employees    asge ON asg.employee_id            = asge.employee_id
`;

async function listGoals(orgId, filters = {}) {
  const conditions = ['g.organization_id = $1'];
  const params = [orgId];
  let i = 2;

  if (filters.goal_type) {
    conditions.push(`g.goal_type = $${i++}`);
    params.push(filters.goal_type);
  }
  if (filters.status) {
    conditions.push(`g.status = $${i++}`);
    params.push(filters.status);
  }
  if (filters.priority) {
    conditions.push(`g.priority = $${i++}`);
    params.push(filters.priority);
  }
  if (filters.category) {
    conditions.push(`g.goal_category_id = $${i++}`);
    params.push(filters.category);
  }
  if (filters.employee_id) {
    conditions.push(`g.assigned_to_employee_id = $${i++}`);
    params.push(filters.employee_id);
  }
  if (filters.manager_id) {
    conditions.push(`(g.assigned_by = $${i} OR ae.manager_employee_id = $${i})`);
    params.push(filters.manager_id);
    i++;
  }
  if (filters.department_id) {
    conditions.push(`g.assigned_to_department_id = $${i++}`);
    params.push(filters.department_id);
  }
  if (filters.financial_year_id) {
    conditions.push(`g.financial_year_id = $${i++}`);
    params.push(filters.financial_year_id);
  }

  if (filters.parent_goal_id !== undefined) {
    if (filters.parent_goal_id === null) {
      conditions.push('g.parent_goal_id IS NULL');
    } else {
      conditions.push(`g.parent_goal_id = $${i++}`);
      params.push(filters.parent_goal_id);
    }
  }

  if (filters.exclude_cascaded_sub_goals) {
    conditions.push('(g.parent_goal_id IS NULL OR pg.goal_type != \'individual\' OR pg.assigned_to_employee_id IS DISTINCT FROM g.assigned_to_employee_id)');
  }

  if (filters.search) {
    conditions.push(`(g.title ILIKE $${i} OR g.description ILIKE $${i})`);
    params.push(`%${filters.search}%`);
    i++;
  }

  if (filters.start_date) {
    conditions.push(`g.start_date >= $${i++}`);
    params.push(filters.start_date);
  }
  if (filters.due_date) {
    conditions.push(`g.due_date <= $${i++}`);
    params.push(filters.due_date);
  }

  // Employee-only role visibility check:
  if (filters.my_goals_only) {
    conditions.push(`(
      g.assigned_to_employee_id = $${i} 
      OR g.created_by = $${i+1} 
      OR g.goal_type = 'company' 
      OR (g.goal_type = 'department' AND g.assigned_to_department_id = (SELECT department_id FROM employees WHERE employee_id = $${i}))
      OR (
        g.visibility = 'TEAM' 
        AND ae.manager_employee_id = (SELECT manager_employee_id FROM employees WHERE employee_id = $${i})
        AND ae.manager_employee_id IS NOT NULL
      )
      OR (
        g.visibility = 'DEPARTMENT'
        AND ae.department_id = (SELECT department_id FROM employees WHERE employee_id = $${i})
      )
      OR g.visibility = 'ORGANIZATION'
    )`);
    params.push(filters.my_employee_id, filters.my_user_id);
    i += 2;
  }

  // Department-based goal visibility check for all users with an employee profile:
  if (filters.my_employee_id) {
    conditions.push(`(
      g.assigned_to_department_id IS NULL 
      OR g.assigned_to_department_id = (SELECT department_id FROM employees WHERE employee_id = $${i})
    )`);
    params.push(filters.my_employee_id);
    i++;
  }

  let queryText = `${GOAL_SELECT} WHERE ${conditions.join(' AND ')}`;

  // Sorting
  const allowedSortFields = {
    created_at: 'g.created_at',
    weight: 'g.weight',
    priority: 'g.priority',
    title: 'g.title'
  };
  const sortBy = allowedSortFields[filters.sortBy] || 'g.created_at';
  const sortDir = filters.sortDir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  queryText += ` ORDER BY ${sortBy} ${sortDir}`;

  // Pagination
  if (filters.limit) {
    queryText += ` LIMIT $${i++}`;
    params.push(parseInt(filters.limit, 10));
  }
  if (filters.offset) {
    queryText += ` OFFSET $${i++}`;
    params.push(parseInt(filters.offset, 10));
  }

  const result = await query(queryText, params);
  return result.rows;
}

async function getGoalById(orgId, id) {
  const result = await query(
    `${GOAL_SELECT} WHERE g.organization_id = $1 AND g.goal_id = $2`,
    [orgId, id]
  );
  return result.rows[0] || null;
}

async function getSubGoals(orgId, parentId) {
  const result = await query(
    `${GOAL_SELECT} WHERE g.organization_id = $1 AND g.parent_goal_id = $2 ORDER BY g.created_at ASC`,
    [orgId, parentId]
  );
  return result.rows;
}

async function createGoal(orgId, data) {
  const {
    title, description, goal_type, parent_goal_id,
    assigned_to_employee_id, assigned_to_department_id, created_by, assigned_by,
    start_date, due_date, target_metric, weight, priority, financial_year_id,
    visibility, goal_category_id, status, approved_by, approved_at, performance_technique
  } = data;

  const result = await query(`
    INSERT INTO goals (
      organization_id, title, description, goal_type, parent_goal_id,
      assigned_to_employee_id, assigned_to_department_id, created_by, assigned_by,
      start_date, due_date, target_metric, weight, priority, status,
      financial_year_id, visibility, goal_category_id,
      approved_by, approved_at, performance_technique
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
    RETURNING goal_id
  `, [
    orgId, title, description || null, goal_type || 'individual', parent_goal_id || null,
    assigned_to_employee_id || null, assigned_to_department_id || null, created_by || null, assigned_by || null,
    start_date || null, due_date || null, target_metric || null, weight ?? 100, priority || 'MEDIUM', status || 'DRAFT',
    financial_year_id || null, visibility || 'ORGANIZATION', goal_category_id || null,
    approved_by || null, approved_at || null, performance_technique || 'KPI'
  ]);

  return getGoalById(orgId, result.rows[0].goal_id);
}

async function updateGoal(orgId, id, data) {
  const {
    title, description, goal_type, parent_goal_id,
    assigned_to_employee_id, assigned_to_department_id,
    start_date, due_date, target_metric, weight, priority, status,
    visibility, goal_category_id, assigned_by, performance_technique,
    financial_year_id,
    approved_by, approved_at,
    rejected_by, rejected_at, rejection_reason
  } = data;

  await query(`
    UPDATE goals SET
      title=$1, description=$2, goal_type=$3, parent_goal_id=$4,
      assigned_to_employee_id=$5, assigned_to_department_id=$6,
      start_date=$7, due_date=$8, target_metric=$9,
      weight=$10, priority=$11, status=$12,
      visibility=$13, goal_category_id=$14, assigned_by=$15,
      performance_technique=$16, financial_year_id=$17,
      approved_by=$18, approved_at=$19,
      rejected_by=$20, rejected_at=$21, rejection_reason=$22,
      updated_at=NOW()
    WHERE goal_id=$23 AND organization_id=$24
  `, [
    title, description || null, goal_type || 'individual', parent_goal_id || null,
    assigned_to_employee_id || null, assigned_to_department_id || null,
    start_date || null, due_date || null, target_metric || null,
    weight ?? 100, priority || 'MEDIUM', status || 'DRAFT',
    visibility || 'ORGANIZATION', goal_category_id || null, assigned_by || null,
    performance_technique || 'KPI', financial_year_id || null,
    approved_by || null, approved_at || null,
    rejected_by || null, rejected_at || null, rejection_reason || null,
    id, orgId
  ]);

  return getGoalById(orgId, id);
}

async function deleteGoal(orgId, id) {
  const result = await query(
    'DELETE FROM goals WHERE goal_id=$1 AND organization_id=$2 RETURNING goal_id',
    [id, orgId]
  );
  return result.rows[0] || null;
}

async function getGoalsTotalWeight(orgId, employeeId, financialYearId) {
  const result = await query(`
    SELECT COALESCE(SUM(weight), 0) AS total
    FROM goals
    WHERE organization_id = $1
      AND assigned_to_employee_id = $2
      AND financial_year_id = $3
      AND parent_goal_id IS NULL
      AND status NOT IN ('REJECTED')
  `, [orgId, employeeId, financialYearId]);
  return Number(result.rows[0]?.total || 0);
}

async function getGoalDashboardSummary(orgId, financialYearId, userContext = null) {
  const isEmployeeOnly = userContext?.role === 'employee';
  const employeeId = userContext?.employeeId || null;
  const userId = userContext?.id || null;

  const result = await query(`
    SELECT 
      COUNT(g.*) AS total,
      COUNT(CASE WHEN g.status = 'DRAFT' THEN 1 END) AS draft,
      COUNT(CASE WHEN g.status = 'PENDING_APPROVAL' THEN 1 END) AS pending_approval,
      COUNT(CASE WHEN g.status = 'CHANGES_REQUESTED' THEN 1 END) AS changes_requested,
      COUNT(CASE WHEN g.status = 'ACTIVE' THEN 1 END) AS active,
      COUNT(CASE WHEN g.status = 'IN_PROGRESS' THEN 1 END) AS in_progress,
      COUNT(CASE WHEN g.status = 'COMPLETED' THEN 1 END) AS completed,
      COUNT(CASE WHEN g.status = 'REJECTED' THEN 1 END) AS rejected,
      COALESCE(AVG(g.progress), 0)::numeric(5,2) AS average_progress
    FROM goals g
    LEFT JOIN goals pg ON g.parent_goal_id = pg.goal_id
    LEFT JOIN employees ae ON g.assigned_to_employee_id = ae.employee_id
    WHERE g.organization_id = $1 
      AND ($2::uuid IS NULL OR g.financial_year_id = $2)
      AND (
        g.parent_goal_id IS NULL 
        OR pg.goal_type IN ('company', 'department', 'team')
      )
      AND (
        $3::boolean = false
        OR (
          (
            g.assigned_to_employee_id = $4
            OR g.created_by = $5
            OR g.goal_type = 'company'
            OR (g.goal_type = 'department' AND g.assigned_to_department_id = (SELECT department_id FROM employees WHERE employee_id = $4))
            OR (
              g.visibility = 'TEAM' 
              AND ae.manager_employee_id = (SELECT manager_employee_id FROM employees WHERE employee_id = $4)
              AND ae.manager_employee_id IS NOT NULL
            )
            OR (
              g.visibility = 'DEPARTMENT'
              AND ae.department_id = (SELECT department_id FROM employees WHERE employee_id = $4)
            )
            OR g.visibility = 'ORGANIZATION'
          )
          AND (
            g.assigned_to_department_id IS NULL 
            OR g.assigned_to_department_id = (SELECT department_id FROM employees WHERE employee_id = $4)
          )
        )
      )
  `, [orgId, financialYearId || null, isEmployeeOnly, employeeId, userId]);
  
  const row = result.rows[0];

  // Compute weighted KPI progress across all goals in this cycle
  const kpiProgressRes = await query(`
    SELECT 
      COALESCE(
        SUM(k.completion_percentage * k.weight_percentage) / NULLIF(SUM(k.weight_percentage), 0),
        0
      )::numeric(5,2) AS weighted_kpi_progress
    FROM goal_kpis k
    INNER JOIN goals g ON k.goal_id = g.goal_id
    WHERE k.organization_id = $1
      AND ($2::uuid IS NULL OR g.financial_year_id = $2)
      AND k.status != 'REJECTED'
      AND (
        $3::boolean = false
        OR (
          (
            g.assigned_to_employee_id = $4
            OR g.created_by = $5
            OR g.goal_type = 'company'
            OR (g.goal_type = 'department' AND g.assigned_to_department_id = (SELECT department_id FROM employees WHERE employee_id = $4))
          )
          AND (
            g.assigned_to_department_id IS NULL 
            OR g.assigned_to_department_id = (SELECT department_id FROM employees WHERE employee_id = $4)
          )
        )
      )
  `, [orgId, financialYearId || null, isEmployeeOnly, employeeId, userId]);

  const weightedKpiProgress = parseFloat(kpiProgressRes.rows[0]?.weighted_kpi_progress || 0);

  return {
    total: parseInt(row.total || 0, 10),
    totalGoals: parseInt(row.total || 0, 10),
    draft: parseInt(row.draft || 0, 10),
    pending_approval: parseInt(row.pending_approval || 0, 10),
    changes_requested: parseInt(row.changes_requested || 0, 10),
    active: parseInt(row.active || 0, 10),
    in_progress: parseInt(row.in_progress || 0, 10),
    completed: parseInt(row.completed || 0, 10),
    completedGoals: parseInt(row.completed || 0, 10),
    rejected: parseInt(row.rejected || 0, 10),
    averageProgress: parseFloat(row.average_progress || 0),
    weightedKpiProgress
  };
}


async function getGoalCountForEmployee(orgId, employeeId, financialYearId, goalType) {
  const result = await query(
    `SELECT COUNT(*)::integer AS count FROM goals 
     WHERE organization_id = $1 
       AND assigned_to_employee_id = $2 
       AND financial_year_id = $3
       AND goal_type = $4
       AND parent_goal_id IS NULL
       AND status NOT IN ('REJECTED')
       AND COALESCE(performance_technique, 'KPI') NOT IN ('SELF_ASSESSMENT', 'COMPETENCY')`,
    [orgId, employeeId, financialYearId, goalType || 'individual']
  );
  return result.rows[0].count;
}

async function getGoalDocuments(orgId, goalId) {
  const attachmentsRes = await query(`
    SELECT 
      att.attachment_id,
      att.submission_id,
      att.file_name,
      att.file_url,
      att.file_type,
      att.uploaded_at,
      k.kpi_code,
      k.title AS kpi_title
    FROM goal_kpi_submission_attachments att
    JOIN goal_kpi_submissions sub ON att.submission_id = sub.submission_id
    JOIN goal_kpis k ON sub.kpi_id = k.kpi_id
    WHERE k.goal_id = $1 AND k.organization_id = $2
    ORDER BY att.uploaded_at DESC
  `, [goalId, orgId]);

  const linksRes = await query(`
    SELECT 
      l.link_id,
      l.submission_id,
      l.link_name,
      l.link_url,
      l.created_at,
      k.kpi_code,
      k.title AS kpi_title
    FROM goal_kpi_submission_links l
    JOIN goal_kpi_submissions sub ON l.submission_id = sub.submission_id
    JOIN goal_kpis k ON sub.kpi_id = k.kpi_id
    WHERE k.goal_id = $1 AND k.organization_id = $2
    ORDER BY l.created_at DESC
  `, [goalId, orgId]);

  return {
    attachments: attachmentsRes.rows,
    links: linksRes.rows
  };
}

async function getGoalActivityLogs(orgId, goalId) {
  const result = await query(`
    SELECT 
      a.audit_log_id,
      a.actor_name,
      a.actor_email,
      a.actor_role,
      a.module_name,
      a.action_name,
      a.entity_name,
      a.entity_id,
      a.created_at
    FROM audit_logs a
    WHERE a.organization_id = $1
      AND (
        a.entity_id = $2 
        OR a.entity_id IN (
          SELECT kpi_id FROM goal_kpis WHERE goal_id = $2
        )
        OR (
          a.module_name = 'continuous_feedback'
          AND (
            a.entity_id IN (
              SELECT reflection_id FROM feedback_reflections WHERE goal_id = $2
            )
            OR a.entity_id IN (
              SELECT feedback_id FROM feedback_entries WHERE goal_id = $2
            )
            OR a.entity_id IN (
              SELECT action_item_id FROM feedback_action_items WHERE goal_id = $2
            )
            OR a.entity_id IN (
              SELECT praise_id FROM feedback_praises WHERE goal_id = $2
            )
          )
        )
      )
    ORDER BY a.created_at DESC
    LIMIT 100
  `, [orgId, goalId]);

  return result.rows;
}

module.exports = {
  listGoals,
  getGoalById,
  getSubGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  getGoalsTotalWeight,
  getGoalDashboardSummary,
  getGoalCountForEmployee,
  getGoalDocuments,
  getGoalActivityLogs,
  withTransaction
};
