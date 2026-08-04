const { query } = require('../../config/db')

const GOAL_SELECT_BASE = `
  SELECT
    g.goal_id, g.client_admin_id, g.title, g.description, g.goal_type,
    g.parent_goal_id, pg.title AS parent_goal_title,
    g.assigned_to_employee_id,
    CONCAT(ae.first_name,' ',ae.last_name) AS assigned_to_employee_name,
    g.created_by_employee_id,
    CONCAT(ce.first_name,' ',ce.last_name) AS created_by_employee_name,
    g.start_date, g.due_date, g.target_metric,
    g.weight, g.progress,
    g.priority, g.status,
    g.submitted_at,
    g.approved_by, CONCAT(ab.first_name,' ',ab.last_name) AS approved_by_name, g.approved_at,
    g.rejected_by, CONCAT(rb.first_name,' ',rb.last_name) AS rejected_by_name, g.rejected_at, g.rejection_reason,
    (SELECT COUNT(*) FROM goals sg WHERE sg.parent_goal_id = g.goal_id) AS sub_goal_count,
    (SELECT COALESCE(SUM(sg.weight),0) FROM goals sg WHERE sg.parent_goal_id = g.goal_id) AS sub_goal_weight_total,
    g.created_at, g.updated_at
  FROM goals g
  LEFT JOIN goals     pg ON g.parent_goal_id          = pg.goal_id
  LEFT JOIN employees ae ON g.assigned_to_employee_id = ae.employee_id
  LEFT JOIN employees ce ON g.created_by_employee_id  = ce.employee_id
  LEFT JOIN employees ab ON g.approved_by             = ab.employee_id
  LEFT JOIN employees rb ON g.rejected_by             = rb.employee_id
`

const GOAL_SELECT = `
  SELECT
    g.goal_id, g.client_admin_id, g.title, g.description, g.goal_type,
    g.parent_goal_id, pg.title AS parent_goal_title,
    g.assigned_to_employee_id,
    CONCAT(ae.first_name,' ',ae.last_name) AS assigned_to_employee_name,
    g.created_by_employee_id,
    CONCAT(ce.first_name,' ',ce.last_name) AS created_by_employee_name,
    g.start_date, g.due_date, g.target_metric,
    g.weight, g.progress,
    g.priority, g.status,
    g.submitted_at,
    g.approved_by, CONCAT(ab.first_name,' ',ab.last_name) AS approved_by_name, g.approved_at,
    g.rejected_by, CONCAT(rb.first_name,' ',rb.last_name) AS rejected_by_name, g.rejected_at, g.rejection_reason,
    g.pending_completion, g.completion_note, g.completion_submitted_at,
    g.completion_approved_by, g.completion_approved_at,
    g.completion_rejected_at, g.completion_rejection_reason,
    (SELECT COUNT(*) FROM goals sg WHERE sg.parent_goal_id = g.goal_id) AS sub_goal_count,
    (SELECT COALESCE(SUM(sg.weight),0) FROM goals sg WHERE sg.parent_goal_id = g.goal_id) AS sub_goal_weight_total,
    g.created_at, g.updated_at
  FROM goals g
  LEFT JOIN goals     pg ON g.parent_goal_id          = pg.goal_id
  LEFT JOIN employees ae ON g.assigned_to_employee_id = ae.employee_id
  LEFT JOIN employees ce ON g.created_by_employee_id  = ce.employee_id
  LEFT JOIN employees ab ON g.approved_by             = ab.employee_id
  LEFT JOIN employees rb ON g.rejected_by             = rb.employee_id
`

async function logHistory(goalId, action, actorId, note = null) {
  try {
    await query(
      `INSERT INTO goal_history (goal_id, action, actor_id, note) VALUES ($1, $2, $3, $4)`,
      [goalId, action, actorId || null, note || null]
    )
  } catch (_) { /* history table may not exist yet */ }
}

async function getGoalHistory(goalId) {
  const result = await query(`
    SELECT
      gh.id, gh.goal_id, gh.action, gh.actor_id, gh.note, gh.created_at,
      CONCAT(e.first_name, ' ', e.last_name) AS actor_name,
      g.title AS goal_title
    FROM goal_history gh
    LEFT JOIN employees e ON gh.actor_id   = e.employee_id
    LEFT JOIN goals     g ON gh.goal_id    = g.goal_id
    WHERE gh.goal_id = $1
    ORDER BY gh.created_at ASC
  `, [goalId])
  return result.rows
}

async function getClientAdminIdByOrg(orgId) {
  const result = await query(
    'SELECT client_admin_id FROM client_admins WHERE organization_id = $1',
    [orgId]
  )
  return result.rows[0]?.client_admin_id || null
}

async function getGoalConfig(clientAdminId) {
  try {
    const result = await query(
      'SELECT allow_employee_goal, allow_manager_goal, allow_admin_goal FROM client_admins WHERE client_admin_id = $1',
      [clientAdminId]
    )
    return result.rows[0] || null
  } catch (_) {
    return { allow_employee_goal: true, allow_manager_goal: true, allow_admin_goal: true }
  }
}

async function getSubGoalWeightSum(parentGoalId) {
  const result = await query(
    'SELECT COALESCE(SUM(weight), 0) AS total FROM goals WHERE parent_goal_id = $1',
    [parentGoalId]
  )
  return Number(result.rows[0]?.total || 0)
}

async function createEmployeeGoal(clientAdminId, employeeId, data) {
  const { title, description, target_metric, start_date, due_date, priority, weight, parent_goal_id, financial_year_id } = data
  const isSubGoal = !!parent_goal_id
  const goalWeight = isSubGoal ? (Number(weight) || 100) : 100
  const status = isSubGoal ? 'active' : 'draft'

  const result = await query(`
    INSERT INTO goals (
      client_admin_id, title, description, goal_type,
      created_by_employee_id, assigned_to_employee_id,
      target_metric, start_date, due_date, priority, weight, status, parent_goal_id, financial_year_id
    ) VALUES ($1,$2,$3,'individual',$4,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING goal_id
  `, [
    clientAdminId, title, description || null,
    employeeId,
    target_metric || null, start_date || null, due_date || null,
    priority || 'medium', goalWeight, status,
    parent_goal_id || null,
    financial_year_id
  ])
  const goalId = result.rows[0].goal_id

  if (isSubGoal) {
    await logHistory(parent_goal_id, 'sub_goal_added', employeeId, title)
  } else {
    await logHistory(goalId, 'created', employeeId, null)
  }

  return getEmployeeGoalById(clientAdminId, goalId)
}

async function getGoalsByCreator(clientAdminId, employeeId) {
  try {
    const result = await query(
      `${GOAL_SELECT}
       WHERE g.client_admin_id = $1
         AND g.created_by_employee_id = $2
         AND g.parent_goal_id IS NULL
       ORDER BY g.created_at DESC`,
      [clientAdminId, employeeId]
    )
    return result.rows
  } catch (_) {
    const result = await query(
      `${GOAL_SELECT_BASE}
       WHERE g.client_admin_id = $1
         AND g.created_by_employee_id = $2
         AND g.parent_goal_id IS NULL
       ORDER BY g.created_at DESC`,
      [clientAdminId, employeeId]
    )
    return result.rows
  }
}

async function getSubGoalsByParent(clientAdminId, parentGoalId) {
  try {
    const result = await query(
      `${GOAL_SELECT}
       WHERE g.client_admin_id = $1 AND g.parent_goal_id = $2
       ORDER BY g.created_at ASC`,
      [clientAdminId, parentGoalId]
    )
    return result.rows
  } catch (_) {
    const result = await query(
      `${GOAL_SELECT_BASE}
       WHERE g.client_admin_id = $1 AND g.parent_goal_id = $2
       ORDER BY g.created_at ASC`,
      [clientAdminId, parentGoalId]
    )
    return result.rows
  }
}

async function getEmployeeGoalById(clientAdminId, goalId) {
  try {
    const result = await query(
      `${GOAL_SELECT} WHERE g.client_admin_id = $1 AND g.goal_id = $2`,
      [clientAdminId, goalId]
    )
    return result.rows[0] || null
  } catch (_) {
    const result = await query(
      `${GOAL_SELECT_BASE} WHERE g.client_admin_id = $1 AND g.goal_id = $2`,
      [clientAdminId, goalId]
    )
    return result.rows[0] || null
  }
}

async function updateEmployeeGoal(clientAdminId, goalId, employeeId, data) {
  const { title, description, target_metric, start_date, due_date, priority, weight } = data
  await query(`
    UPDATE goals SET
      title=$1, description=$2, target_metric=$3,
      start_date=$4, due_date=$5, priority=$6,
      weight=COALESCE($7, weight), updated_at=NOW()
    WHERE goal_id=$8 AND client_admin_id=$9 AND created_by_employee_id=$10
      AND status IN ('draft','in_progress')
  `, [
    title, description || null, target_metric || null,
    start_date || null, due_date || null, priority || 'medium',
    weight != null ? Number(weight) : null,
    goalId, clientAdminId, employeeId,
  ])
  return getEmployeeGoalById(clientAdminId, goalId)
}

async function deleteEmployeeGoal(clientAdminId, goalId, employeeId) {
  const result = await query(
    `DELETE FROM goals WHERE goal_id=$1 AND client_admin_id=$2 AND created_by_employee_id=$3 AND status='draft' RETURNING goal_id`,
    [goalId, clientAdminId, employeeId]
  )
  return result.rows[0] || null
}

async function submitEmployeeGoal(clientAdminId, goalId, employeeId) {
  await query(`
    UPDATE goals SET status='submitted', submitted_at=NOW(), updated_at=NOW()
    WHERE goal_id=$1 AND client_admin_id=$2 AND created_by_employee_id=$3
      AND status IN ('draft','in_progress')
  `, [goalId, clientAdminId, employeeId])
  await logHistory(goalId, 'submitted_for_approval', employeeId, null)
  return getEmployeeGoalById(clientAdminId, goalId)
}

// Sets pending_completion = true so the manager must approve before status becomes 'completed'
async function markCompleted(goalId, employeeId, note) {
  const result = await query(`
    UPDATE goals SET
      pending_completion      = true,
      completion_note         = $1,
      completion_submitted_at = NOW(),
      completion_rejected_at  = NULL,
      completion_rejection_reason = NULL,
      updated_at              = NOW()
    WHERE goal_id = $2 AND assigned_to_employee_id = $3
      AND status IN ('active','in_progress','approved')
      AND pending_completion = false
    RETURNING parent_goal_id, title
  `, [note || null, goalId, employeeId])

  if (result.rows.length) {
    const { parent_goal_id, title } = result.rows[0]
    await logHistory(goalId, 'completion_requested', employeeId, note || null)
    if (parent_goal_id) {
      await logHistory(parent_goal_id, 'sub_goal_completion_requested', employeeId,
        `Sub-goal "${title}" completion requested`)
    }
  }

  try {
    const r = await query(`${GOAL_SELECT} WHERE g.goal_id = $1`, [goalId])
    return r.rows[0] || null
  } catch (_) {
    const r = await query(`${GOAL_SELECT_BASE} WHERE g.goal_id = $1`, [goalId])
    return r.rows[0] || null
  }
}

async function withdrawCompletionRequest(goalId, employeeId) {
  await query(`
    UPDATE goals SET
      pending_completion      = false,
      completion_note         = NULL,
      completion_submitted_at = NULL,
      updated_at              = NOW()
    WHERE goal_id = $1 AND assigned_to_employee_id = $2 AND pending_completion = true
  `, [goalId, employeeId])
  await logHistory(goalId, 'completion_withdrawn', employeeId, null)
  try {
    const r = await query(`${GOAL_SELECT} WHERE g.goal_id = $1`, [goalId])
    return r.rows[0] || null
  } catch (_) {
    const r = await query(`${GOAL_SELECT_BASE} WHERE g.goal_id = $1`, [goalId])
    return r.rows[0] || null
  }
}

async function getGoalCountForEmployee(clientAdminId, employeeId, financialYearId, goalType = 'individual') {
  const result = await query(
    `SELECT COUNT(*)::integer AS count FROM goals 
     WHERE client_admin_id = $1 
       AND assigned_to_employee_id = $2 
       AND financial_year_id = $3
       AND goal_type = $4
       AND parent_goal_id IS NULL
       AND status NOT IN ('rejected')`,
    [clientAdminId, employeeId, financialYearId, goalType]
  );
  return result.rows[0].count;
}

module.exports = {
  getClientAdminIdByOrg,
  getGoalConfig,
  getSubGoalWeightSum,
  createEmployeeGoal,
  getGoalsByCreator,
  getSubGoalsByParent,
  getEmployeeGoalById,
  updateEmployeeGoal,
  deleteEmployeeGoal,
  submitEmployeeGoal,
  markCompleted,
  withdrawCompletionRequest,
  getGoalHistory,
  getGoalCountForEmployee
}
