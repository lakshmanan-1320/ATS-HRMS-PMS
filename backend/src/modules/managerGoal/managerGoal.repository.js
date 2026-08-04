const { query, withTransaction } = require('../../config/db')

/* Base SELECT — safe to use before migration 010 is applied */
const GOAL_SELECT_BASE = `
  SELECT
    g.goal_id, g.client_admin_id, g.title, g.description, g.goal_type,
    g.parent_goal_id, pg.title AS parent_goal_title,
    g.assigned_to_employee_id,
    CONCAT(ae.first_name,' ',ae.last_name) AS assigned_to_employee_name,
    ae.employee_code AS assigned_to_employee_code,
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

/* Full SELECT — includes completion columns added by migration 010 */
const GOAL_SELECT = `
  SELECT
    g.goal_id, g.client_admin_id, g.title, g.description, g.goal_type,
    g.parent_goal_id, pg.title AS parent_goal_title,
    g.assigned_to_employee_id,
    CONCAT(ae.first_name,' ',ae.last_name) AS assigned_to_employee_name,
    ae.employee_code AS assigned_to_employee_code,
    g.created_by_employee_id,
    CONCAT(ce.first_name,' ',ce.last_name) AS created_by_employee_name,
    g.start_date, g.due_date, g.target_metric,
    g.weight, g.progress,
    g.priority, g.status,
    g.submitted_at,
    g.approved_by, CONCAT(ab.first_name,' ',ab.last_name) AS approved_by_name, g.approved_at,
    g.rejected_by, CONCAT(rb.first_name,' ',rb.last_name) AS rejected_by_name, g.rejected_at, g.rejection_reason,
    g.pending_completion, g.completion_note, g.completion_submitted_at,
    g.completion_approved_by,
    CONCAT(cab.first_name,' ',cab.last_name) AS completion_approved_by_name,
    g.completion_approved_at,
    g.completion_rejected_at, g.completion_rejection_reason,
    (SELECT COUNT(*) FROM goals sg WHERE sg.parent_goal_id = g.goal_id) AS sub_goal_count,
    (SELECT COALESCE(SUM(sg.weight),0) FROM goals sg WHERE sg.parent_goal_id = g.goal_id) AS sub_goal_weight_total,
    g.created_at, g.updated_at
  FROM goals g
  LEFT JOIN goals     pg  ON g.parent_goal_id          = pg.goal_id
  LEFT JOIN employees ae  ON g.assigned_to_employee_id = ae.employee_id
  LEFT JOIN employees ce  ON g.created_by_employee_id  = ce.employee_id
  LEFT JOIN employees ab  ON g.approved_by             = ab.employee_id
  LEFT JOIN employees rb  ON g.rejected_by             = rb.employee_id
  LEFT JOIN employees cab ON g.completion_approved_by  = cab.employee_id
`

async function logHistory(goalId, action, actorId, note = null) {
  try {
    await query(
      `INSERT INTO goal_history (goal_id, action, actor_id, note) VALUES ($1, $2, $3, $4)`,
      [goalId, action, actorId || null, note || null]
    )
  } catch (_) { /* history table may not exist yet */ }
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

async function getDirectReports(managerId, orgId) {
  const result = await query(
    `SELECT employee_id, first_name, last_name, employee_code, designation
     FROM employees WHERE manager_employee_id = $1 AND organization_id = $2 AND status = 'active'
     ORDER BY first_name, last_name`,
    [managerId, orgId]
  )
  return result.rows
}

async function getGoalById(clientAdminId, goalId) {
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

async function getTeamGoals(clientAdminId, directReportIds, filters = {}) {
  if (!directReportIds.length) {
    return { goals: [], total: 0, page: 1, limit: 10, counts: { submitted: 0, approved: 0, rejected: 0, in_progress: 0 } }
  }

  const { status, employeeId, search, page = 1, limit = 10 } = filters

  const statsResult = await query(
    `SELECT status, COUNT(*) AS cnt FROM goals
     WHERE client_admin_id = $1 AND created_by_employee_id = ANY($2::uuid[])
       AND status IN ('submitted','approved','rejected','in_progress')
     GROUP BY status`,
    [clientAdminId, directReportIds]
  )
  const counts = { submitted: 0, approved: 0, rejected: 0, in_progress: 0 }
  statsResult.rows.forEach(r => { counts[r.status] = parseInt(r.cnt) })

  const statuses = status && status !== 'all'
    ? [status]
    : ['submitted', 'approved', 'rejected', 'in_progress']

  const params = [clientAdminId, directReportIds, statuses]
  let extraWhere = ''

  if (employeeId) {
    params.push(employeeId)
    extraWhere += ` AND g.created_by_employee_id = $${params.length}`
  }

  if (search) {
    params.push(`%${search}%`)
    const idx = params.length
    extraWhere += ` AND (g.title ILIKE $${idx} OR g.description ILIKE $${idx})`
  }

  const whereClause = `WHERE g.client_admin_id = $1
    AND g.created_by_employee_id = ANY($2::uuid[])
    AND g.status = ANY($3::text[])${extraWhere}`

  const totalResult = await query(`SELECT COUNT(*) FROM goals g ${whereClause}`, params)
  const total = parseInt(totalResult.rows[0].count)

  const offset = (Number(page) - 1) * Number(limit)
  const paginatedParams = [...params, Number(limit), offset]

  const result = await query(
    `${GOAL_SELECT_BASE} ${whereClause}
     ORDER BY CASE WHEN g.status='submitted' THEN 0 ELSE 1 END, g.submitted_at DESC, g.created_at DESC
     LIMIT $${paginatedParams.length - 1} OFFSET $${paginatedParams.length}`,
    paginatedParams
  )

  return { goals: result.rows, total, page: Number(page), limit: Number(limit), counts }
}

async function getTeamSubmittedGoals(clientAdminId, directReportIds) {
  if (!directReportIds.length) return []
  const result = await query(
    `${GOAL_SELECT_BASE}
     WHERE g.client_admin_id = $1
       AND g.created_by_employee_id = ANY($2::uuid[])
       AND g.status = 'submitted'
     ORDER BY g.submitted_at DESC`,
    [clientAdminId, directReportIds]
  )
  return result.rows
}

async function getCompletionRequests(clientAdminId, directReportIds, managerId, filters = {}) {
  const safeReportIds = directReportIds.length ? directReportIds : ['00000000-0000-0000-0000-000000000000']
  const { status, employeeId, search, page = 1, limit = 10 } = filters

  let counts = { pending: 0, approved: 0, rejected: 0 }
  try {
    const statsResult = await query(
      `SELECT
         SUM(CASE WHEN pending_completion = true THEN 1 ELSE 0 END)::int AS pending,
         SUM(CASE WHEN completion_approved_at IS NOT NULL THEN 1 ELSE 0 END)::int AS approved,
         SUM(CASE WHEN completion_rejected_at IS NOT NULL AND pending_completion = false THEN 1 ELSE 0 END)::int AS rejected
       FROM goals g
       WHERE g.client_admin_id = $1
         AND g.completion_submitted_at IS NOT NULL
         AND (g.assigned_to_employee_id = ANY($2::uuid[]) OR g.created_by_employee_id = $3)`,
      [clientAdminId, safeReportIds, managerId]
    )
    const r = statsResult.rows[0]
    counts = { pending: parseInt(r?.pending || 0), approved: parseInt(r?.approved || 0), rejected: parseInt(r?.rejected || 0) }
  } catch (_) {}

  let statusCondition = 'g.completion_submitted_at IS NOT NULL'
  if (status === 'pending')  statusCondition = 'g.pending_completion = true'
  else if (status === 'approved') statusCondition = 'g.completion_approved_at IS NOT NULL'
  else if (status === 'rejected') statusCondition = 'g.completion_rejected_at IS NOT NULL AND g.pending_completion = false'

  const params = [clientAdminId, safeReportIds, managerId]
  let extraWhere = ''

  if (employeeId) {
    params.push(employeeId)
    extraWhere += ` AND g.assigned_to_employee_id = $${params.length}`
  }

  if (search) {
    params.push(`%${search}%`)
    const idx = params.length
    extraWhere += ` AND (g.title ILIKE $${idx} OR g.description ILIKE $${idx})`
  }

  const whereClause = `WHERE g.client_admin_id = $1
    AND ${statusCondition}
    AND (g.assigned_to_employee_id = ANY($2::uuid[]) OR g.created_by_employee_id = $3)${extraWhere}`

  let total = 0
  try {
    const totalResult = await query(`SELECT COUNT(*) FROM goals g ${whereClause}`, params)
    total = parseInt(totalResult.rows[0].count)
  } catch (_) {
    return { requests: [], total: 0, page: 1, limit: Number(limit), counts }
  }

  const offset = (Number(page) - 1) * Number(limit)
  const paginatedParams = [...params, Number(limit), offset]

  try {
    const result = await query(
      `${GOAL_SELECT} ${whereClause}
       ORDER BY CASE WHEN g.pending_completion = true THEN 0 ELSE 1 END, g.completion_submitted_at DESC
       LIMIT $${paginatedParams.length - 1} OFFSET $${paginatedParams.length}`,
      paginatedParams
    )
    return { requests: result.rows, total, page: Number(page), limit: Number(limit), counts }
  } catch (_) {
    return { requests: [], total: 0, page: 1, limit: Number(limit), counts }
  }
}

async function approveGoalByManager(clientAdminId, goalId, managerId) {
  await withTransaction(async (client) => {
    await client.query(`
      UPDATE goals SET status='approved', approved_by=$1, approved_at=NOW(), updated_at=NOW()
      WHERE goal_id=$2 AND client_admin_id=$3
    `, [managerId, goalId, clientAdminId])
  })
  await logHistory(goalId, 'approved', managerId, null)
  return getGoalById(clientAdminId, goalId)
}

async function rejectGoalByManager(clientAdminId, goalId, managerId, reason) {
  await query(`
    UPDATE goals SET status='in_progress', rejected_by=$1, rejected_at=NOW(),
                    rejection_reason=$2, updated_at=NOW()
    WHERE goal_id=$3 AND client_admin_id=$4
  `, [managerId, reason || null, goalId, clientAdminId])
  await logHistory(goalId, 'rejected', managerId, reason || null)
  return getGoalById(clientAdminId, goalId)
}

async function approveCompletion(clientAdminId, goalId, managerId) {
  const result = await query(`
    UPDATE goals SET
      status                      = 'completed',
      pending_completion          = false,
      completion_approved_by      = $1,
      completion_approved_at      = NOW(),
      completion_rejected_at      = NULL,
      completion_rejection_reason = NULL,
      updated_at                  = NOW()
    WHERE goal_id = $2 AND client_admin_id = $3 AND pending_completion = true
    RETURNING parent_goal_id, title
  `, [managerId, goalId, clientAdminId])

  if (result.rows.length) {
    const { parent_goal_id, title } = result.rows[0]
    await logHistory(goalId, 'completion_approved', managerId, null)
    if (parent_goal_id) {
      await logHistory(parent_goal_id, 'sub_goal_completed', managerId,
        `Sub-goal "${title}" completion approved`)
    }
  }

  return getGoalById(clientAdminId, goalId)
}

async function rejectCompletion(clientAdminId, goalId, managerId, reason) {
  await query(`
    UPDATE goals SET
      pending_completion          = false,
      completion_rejected_at      = NOW(),
      completion_rejection_reason = $1,
      updated_at                  = NOW()
    WHERE goal_id = $2 AND client_admin_id = $3 AND pending_completion = true
  `, [reason || null, goalId, clientAdminId])
  await logHistory(goalId, 'completion_rejected', managerId, reason || null)
  return getGoalById(clientAdminId, goalId)
}

async function createAssignedGoal(clientAdminId, managerId, data) {
  const { title, description, target_metric, start_date, due_date, priority, assigned_to_employee_id, weight, parent_goal_id } = data
  const isSubGoal = !!parent_goal_id
  const goalWeight = Number(weight) || 100
  const status = isSubGoal ? 'active' : 'draft'
  const result = await query(`
    INSERT INTO goals (
      client_admin_id, title, description, goal_type,
      created_by_employee_id, assigned_to_employee_id,
      target_metric, start_date, due_date, priority, weight, status, parent_goal_id
    ) VALUES ($1,$2,$3,'individual',$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING goal_id
  `, [
    clientAdminId, title, description || null,
    managerId, assigned_to_employee_id,
    target_metric || null, start_date || null, due_date || null,
    priority || 'medium', goalWeight, status, parent_goal_id || null,
  ])
  const goalId = result.rows[0].goal_id

  if (isSubGoal) {
    await logHistory(parent_goal_id, 'sub_goal_added', managerId, title)
  } else {
    await logHistory(goalId, 'created', managerId, null)
  }

  return getGoalById(clientAdminId, goalId)
}

async function activateAssignedGoal(clientAdminId, goalId, managerId) {
  await query(
    `UPDATE goals SET status='active', updated_at=NOW() WHERE goal_id=$1 AND client_admin_id=$2 AND created_by_employee_id=$3`,
    [goalId, clientAdminId, managerId]
  )
  await logHistory(goalId, 'activated', managerId, null)
  return getGoalById(clientAdminId, goalId)
}

async function getTotalWeightForEmployee(clientAdminId, employeeId) {
  const result = await query(`
    SELECT COALESCE(SUM(weight), 0) AS total
    FROM goals
    WHERE client_admin_id = $1
      AND assigned_to_employee_id = $2
      AND parent_goal_id IS NULL
      AND status NOT IN ('completed', 'rejected')
  `, [clientAdminId, employeeId])
  return Number(result.rows[0]?.total || 0)
}

async function getAssignedByManager(clientAdminId, managerId) {
  try {
    const result = await query(
      `${GOAL_SELECT}
       WHERE g.client_admin_id = $1
         AND g.created_by_employee_id = $2
         AND g.assigned_to_employee_id != $2
         AND g.parent_goal_id IS NULL
       ORDER BY g.created_at DESC`,
      [clientAdminId, managerId]
    )
    return result.rows
  } catch (_) {
    const result = await query(
      `${GOAL_SELECT_BASE}
       WHERE g.client_admin_id = $1
         AND g.created_by_employee_id = $2
         AND g.assigned_to_employee_id != $2
         AND g.parent_goal_id IS NULL
       ORDER BY g.created_at DESC`,
      [clientAdminId, managerId]
    )
    return result.rows
  }
}

async function overrideGoalProgress(clientAdminId, goalId, managerId, progress, reason) {
  await query(`
    UPDATE goals SET
      override_progress = $1, progress = $1,
      override_by = $2, override_reason = $3, updated_at = NOW()
    WHERE goal_id = $4 AND client_admin_id = $5
  `, [progress, managerId, reason || null, goalId, clientAdminId])
  await logHistory(goalId, 'progress_overridden', managerId, reason || null)
  return getGoalById(clientAdminId, goalId)
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

module.exports = {
  getClientAdminIdByOrg,
  getGoalConfig,
  getDirectReports,
  getGoalById,
  getTeamGoals,
  getTeamSubmittedGoals,
  getCompletionRequests,
  approveGoalByManager,
  rejectGoalByManager,
  approveCompletion,
  rejectCompletion,
  createAssignedGoal,
  activateAssignedGoal,
  getTotalWeightForEmployee,
  getAssignedByManager,
  overrideGoalProgress,
  getSubGoalsByParent,
}
