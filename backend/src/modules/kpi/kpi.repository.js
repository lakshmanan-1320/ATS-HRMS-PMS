const db = require('../../config/db');

async function getKpiById(orgId, kpiId, client = null) {
  const runner = client || db;
  const result = await runner.query(
    `SELECT k.*, 
            u.email AS owner_email,
            CONCAT(e.first_name, ' ', e.last_name) AS owner_name
     FROM goal_kpis k
     LEFT JOIN users u ON k.owner_user_id = u.user_id
     LEFT JOIN employees e ON u.employee_id = e.employee_id
     WHERE k.organization_id = $1 AND k.kpi_id = $2`,
    [orgId, kpiId]
  );
  return result.rows[0] || null;
}

async function listKpis(orgId, filters = {}) {
  const conditions = ['k.organization_id = $1'];
  const params = [orgId];
  let i = 2;

  if (filters.goal_id) {
    conditions.push(`k.goal_id = $${i++}`);
    params.push(filters.goal_id);
  }

  if (filters.status) {
    conditions.push(`k.status = $${i++}`);
    params.push(filters.status);
  }

  if (filters.priority) {
    conditions.push(`k.priority = $${i++}`);
    params.push(filters.priority);
  }

  if (filters.search) {
    conditions.push(`(k.title ILIKE $${i} OR k.kpi_code ILIKE $${i})`);
    params.push(`%${filters.search}%`);
    i++;
  }

  const whereClause = conditions.join(' AND ');

  const sortBy = filters.sortBy || 'created_at';
  const sortDir = filters.sortDir === 'ASC' ? 'ASC' : 'DESC';

  const allowedSortCols = ['title', 'kpi_code', 'weight_percentage', 'completion_percentage', 'status', 'created_at', 'due_date'];
  const sortCol = allowedSortCols.includes(sortBy) ? `k.${sortBy}` : 'k.created_at';

  const limit = filters.limit ? parseInt(filters.limit, 10) : 20;
  const offset = filters.offset ? parseInt(filters.offset, 10) : 0;

  const queryText = `
    SELECT k.*, 
           u.email AS owner_email,
           CONCAT(e.first_name, ' ', e.last_name) AS owner_name
    FROM goal_kpis k
    LEFT JOIN users u ON k.owner_user_id = u.user_id
    LEFT JOIN employees e ON u.employee_id = e.employee_id
    WHERE ${whereClause}
    ORDER BY ${sortCol} ${sortDir}
    LIMIT $${i++} OFFSET $${i++}
  `;
  params.push(limit, offset);

  const result = await db.query(queryText, params);
  return result.rows;
}

async function countKpis(orgId, filters = {}) {
  const conditions = ['organization_id = $1'];
  const params = [orgId];
  let i = 2;

  if (filters.goal_id) {
    conditions.push(`goal_id = $${i++}`);
    params.push(filters.goal_id);
  }

  if (filters.status) {
    conditions.push(`status = $${i++}`);
    params.push(filters.status);
  }

  if (filters.priority) {
    conditions.push(`priority = $${i++}`);
    params.push(filters.priority);
  }

  if (filters.search) {
    conditions.push(`(title ILIKE $${i} OR kpi_code ILIKE $${i})`);
    params.push(`%${filters.search}%`);
    i++;
  }

  const whereClause = conditions.join(' AND ');

  const queryText = `SELECT COUNT(*)::int FROM goal_kpis WHERE ${whereClause}`;
  const result = await db.query(queryText, params);
  return result.rows[0]?.count || 0;
}

async function createKpi(orgId, data, client = null) {
  const runner = client || db;
  const queryText = `
    INSERT INTO goal_kpis (
      organization_id, goal_id, title, description,
      measurement_type, target_value, approved_value, target_text, approved_text,
      target_boolean, approved_boolean, unit, weight_percentage, completion_percentage,
      frequency, kpi_type, priority, status, start_date, due_date,
      owner_user_id, created_by, assigned_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
    ) RETURNING *
  `;
  const values = [
    orgId,
    data.goal_id,
    data.title,
    data.description || null,
    data.measurement_type,
    data.target_value !== undefined ? data.target_value : null,
    data.approved_value !== undefined ? data.approved_value : 0.0000,
    data.target_text || null,
    data.approved_text || null,
    data.target_boolean !== undefined ? data.target_boolean : null,
    data.approved_boolean !== undefined ? data.approved_boolean : null,
    data.unit || null,
    data.weight_percentage,
    data.completion_percentage || 0.00,
    data.frequency || 'MONTHLY',
    data.kpi_type || 'OUTCOME',
    data.priority || 'MEDIUM',
    data.status || 'DRAFT',
    data.start_date || null,
    data.due_date || null,
    data.owner_user_id || null,
    data.created_by || null,
    data.assigned_by || null
  ];

  const result = await runner.query(queryText, values);
  return result.rows[0];
}

async function updateKpi(orgId, kpiId, data, client = null) {
  const runner = client || db;
  const queryText = `
    UPDATE goal_kpis SET
      title = $1,
      description = $2,
      measurement_type = $3,
      target_value = $4,
      approved_value = $5,
      target_text = $6,
      approved_text = $7,
      target_boolean = $8,
      approved_boolean = $9,
      unit = $10,
      weight_percentage = $11,
      completion_percentage = $12,
      frequency = $13,
      kpi_type = $14,
      priority = $15,
      status = $16,
      start_date = $17,
      due_date = $18,
      owner_user_id = $19,
      approved_by = $20,
      updated_at = NOW()
    WHERE organization_id = $21 AND kpi_id = $22
    RETURNING *
  `;
  const values = [
    data.title,
    data.description || null,
    data.measurement_type,
    data.target_value !== undefined ? data.target_value : null,
    data.approved_value !== undefined ? data.approved_value : 0.0000,
    data.target_text || null,
    data.approved_text || null,
    data.target_boolean !== undefined ? data.target_boolean : null,
    data.approved_boolean !== undefined ? data.approved_boolean : null,
    data.unit || null,
    data.weight_percentage,
    data.completion_percentage || 0.00,
    data.frequency || 'MONTHLY',
    data.kpi_type || 'OUTCOME',
    data.priority || 'MEDIUM',
    data.status || 'DRAFT',
    data.start_date || null,
    data.due_date || null,
    data.owner_user_id || null,
    data.approved_by || null,
    orgId,
    kpiId
  ];

  const result = await runner.query(queryText, values);
  return result.rows[0] || null;
}

async function deleteKpi(orgId, kpiId, client = null) {
  const runner = client || db;
  const result = await runner.query(
    'DELETE FROM goal_kpis WHERE organization_id = $1 AND kpi_id = $2 RETURNING *',
    [orgId, kpiId]
  );
  return result.rows[0] || null;
}

async function countKpisForGoal(orgId, goalId, client = null) {
  const runner = client || db;
  const result = await runner.query(
    'SELECT COUNT(*)::int FROM goal_kpis WHERE organization_id = $1 AND goal_id = $2',
    [orgId, goalId]
  );
  return result.rows[0]?.count || 0;
}

async function getKpisForGoal(orgId, goalId, client = null) {
  const runner = client || db;
  const result = await runner.query(
    'SELECT * FROM goal_kpis WHERE organization_id = $1 AND goal_id = $2',
    [orgId, goalId]
  );
  return result.rows;
}

// ── Checklist Tasks Repository ──

async function insertKpiTask(kpiId, orgId, title, client = null) {
  const runner = client || db;
  const result = await runner.query(
    `INSERT INTO goal_kpi_tasks (kpi_id, organization_id, title)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [kpiId, orgId, title]
  );
  return result.rows[0];
}

async function getKpiTasks(kpiId, orgId, client = null) {
  const runner = client || db;
  const result = await runner.query(
    'SELECT * FROM goal_kpi_tasks WHERE kpi_id = $1 AND organization_id = $2 ORDER BY created_at ASC',
    [kpiId, orgId]
  );
  return result.rows;
}

async function deleteKpiTasks(kpiId, client = null) {
  const runner = client || db;
  await runner.query('DELETE FROM goal_kpi_tasks WHERE kpi_id = $1', [kpiId]);
}

async function updateTaskCompletion(taskId, isCompleted, client = null) {
  const runner = client || db;
  const result = await runner.query(
    'UPDATE goal_kpi_tasks SET is_completed = $1, updated_at = NOW() WHERE task_id = $2 RETURNING *',
    [isCompleted, taskId]
  );
  return result.rows[0] || null;
}

// ── Submissions Repository ──

async function insertSubmission(orgId, data, client = null) {
  const runner = client || db;
  const queryText = `
    INSERT INTO goal_kpi_submissions (
      organization_id, kpi_id, submitted_value, submitted_text, submitted_boolean,
      comment, status, review_due_date, submitted_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9
    ) RETURNING *
  `;
  const values = [
    orgId,
    data.kpi_id,
    data.submitted_value !== undefined ? data.submitted_value : null,
    data.submitted_text || null,
    data.submitted_boolean !== undefined ? data.submitted_boolean : null,
    data.comment || null,
    data.status || 'PENDING',
    data.review_due_date || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    data.submitted_by || null
  ];

  const result = await runner.query(queryText, values);
  return result.rows[0];
}

async function getSubmissionById(orgId, submissionId, client = null) {
  const runner = client || db;
  const result = await runner.query(
    'SELECT * FROM goal_kpi_submissions WHERE organization_id = $1 AND submission_id = $2',
    [orgId, submissionId]
  );
  return result.rows[0] || null;
}

async function updateSubmissionStatus(orgId, submissionId, status, reviewerId, reviewComment, client = null) {
  const runner = client || db;
  const result = await runner.query(
    `UPDATE goal_kpi_submissions SET
       status = $1,
       reviewed_by = $2,
       review_comment = $3,
       reviewed_at = NOW()
     WHERE organization_id = $4 AND submission_id = $5
     RETURNING *`,
    [status, reviewerId || null, reviewComment || null, orgId, submissionId]
  );
  return result.rows[0] || null;
}

async function getSubmissionsByKpiId(orgId, kpiId, client = null) {
  const runner = client || db;
  const result = await runner.query(
    `SELECT s.*, 
            u.email AS submitter_email,
            CONCAT(e.first_name, ' ', e.last_name) AS submitter_name,
            ru.email AS reviewer_email,
            CONCAT(re.first_name, ' ', re.last_name) AS reviewer_name
     FROM goal_kpi_submissions s
     LEFT JOIN users u ON s.submitted_by = u.user_id
     LEFT JOIN employees e ON u.employee_id = e.employee_id
     LEFT JOIN users ru ON s.reviewed_by = ru.user_id
     LEFT JOIN employees re ON ru.employee_id = re.employee_id
     WHERE s.organization_id = $1 AND s.kpi_id = $2
     ORDER BY s.submitted_at DESC`,
    [orgId, kpiId]
  );
  return result.rows;
}

async function insertAttachment(data, client = null) {
  const runner = client || db;
  const result = await runner.query(
    `INSERT INTO goal_kpi_submission_attachments (submission_id, file_name, file_url, file_type)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.submission_id, data.file_name, data.file_url, data.file_type || null]
  );
  return result.rows[0];
}

async function getAttachmentsBySubmissionId(submissionId, client = null) {
  const runner = client || db;
  const result = await runner.query(
    'SELECT * FROM goal_kpi_submission_attachments WHERE submission_id = $1',
    [submissionId]
  );
  return result.rows;
}

async function insertLink(data, client = null) {
  const runner = client || db;
  const result = await runner.query(
    `INSERT INTO goal_kpi_submission_links (submission_id, link_name, link_url)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.submission_id, data.link_name, data.link_url]
  );
  return result.rows[0];
}

async function getLinksBySubmissionId(submissionId, client = null) {
  const runner = client || db;
  const result = await runner.query(
    'SELECT * FROM goal_kpi_submission_links WHERE submission_id = $1',
    [submissionId]
  );
  return result.rows;
}

// ── Goal Progress History ──

async function insertGoalProgressHistory(orgId, data, client = null) {
  const runner = client || db;
  const result = await runner.query(
    `INSERT INTO goal_progress_history (goal_id, organization_id, old_progress, new_progress, status, comment, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [data.goal_id, orgId, data.old_progress, data.new_progress, data.status, data.comment || null, data.updated_by || null]
  );
  return result.rows[0];
}

async function getGoalProgressHistory(orgId, goalId) {
  const result = await db.query(
    `SELECT h.*, 
            u.email AS updated_by_email,
            CONCAT(e.first_name, ' ', e.last_name) AS updated_by_name
     FROM goal_progress_history h
     LEFT JOIN users u ON h.updated_by = u.user_id
     LEFT JOIN employees e ON u.employee_id = e.employee_id
     WHERE h.organization_id = $1 AND h.goal_id = $2
     ORDER BY h.created_at DESC`,
    [orgId, goalId]
  );
  return result.rows;
}

async function recalculateGoalProgress(orgId, goalId, updaterId, comment, client = null) {
  const runner = client || db;

  // 1. Get all KPIs for the goal (excluding Draft or Rejected)
  const kpisRes = await runner.query(
    `SELECT completion_percentage, weight_percentage 
     FROM goal_kpis 
     WHERE organization_id = $1 AND goal_id = $2 AND status != 'REJECTED'`,
    [orgId, goalId]
  );
  const kpis = kpisRes.rows;

  let newProgress = 0.00;
  if (kpis.length > 0) {
    let sumWeights = 0;
    let sumWeightedProgress = 0;
    for (const kpi of kpis) {
      const weight = parseFloat(kpi.weight_percentage) || 0;
      const progress = parseFloat(kpi.completion_percentage) || 0;
      sumWeights += weight;
      sumWeightedProgress += (progress * weight);
    }
    newProgress = sumWeights > 0 ? (sumWeightedProgress / sumWeights) : 0.00;
  } else {
    // If no direct KPIs, calculate progress from child goals aligned to it
    const childrenRes = await runner.query(
      `SELECT progress FROM goals 
       WHERE organization_id = $1 AND parent_goal_id = $2 AND status != 'REJECTED'`,
      [orgId, goalId]
    );
    const children = childrenRes.rows;
    if (children.length > 0) {
      let sumProgress = 0;
      for (const child of children) {
        sumProgress += parseFloat(child.progress) || 0;
      }
      newProgress = sumProgress / children.length;
    }
  }

  newProgress = Math.round(newProgress * 100) / 100;

  // Get current goal details
  const goalRes = await runner.query(
    'SELECT progress, status, parent_goal_id FROM goals WHERE organization_id = $1 AND goal_id = $2',
    [orgId, goalId]
  );
  const goal = goalRes.rows[0];
  if (!goal) return 0.00;

  const oldProgress = parseFloat(goal.progress) || 0.00;

  if (oldProgress !== newProgress) {
    let nextStatus = goal.status;
    if (newProgress >= 100 && ['ACTIVE', 'IN_PROGRESS'].includes(goal.status)) {
      nextStatus = 'COMPLETED';
    } else if (newProgress < 100 && goal.status === 'COMPLETED') {
      nextStatus = 'IN_PROGRESS';
    }

    const goalParams = [newProgress, nextStatus, orgId, goalId];

    await runner.query(
      `UPDATE goals 
       SET progress = $1, status = $2, updated_at = NOW()
       WHERE organization_id = $3 AND goal_id = $4`,
      goalParams
    );

    // Track Goal Progress History
    await insertGoalProgressHistory(orgId, {
      goal_id: goalId,
      old_progress: oldProgress,
      new_progress: newProgress,
      status: nextStatus,
      comment: comment || 'Goal progress updated derived from KPIs.',
      updated_by: updaterId
    }, runner);
  }

  // If this goal has a parent goal, recursively trigger recalculating parent's progress
  if (goal.parent_goal_id) {
    await recalculateGoalProgress(orgId, goal.parent_goal_id, updaterId, `Parent progress updated derived from child goal ${goalId}.`, runner);
  }

  return newProgress;
}

// ── Dashboard Statistics ──
async function getKpiDashboardStats(orgId, performanceConfigId, userContext) {
  // Counts
  const countsRes = await db.query(
    `SELECT 
       COUNT(*)::int AS total,
       COUNT(CASE WHEN gk.status = 'DRAFT' THEN 1 END)::int AS draft,
       COUNT(CASE WHEN gk.status = 'PENDING_APPROVAL' THEN 1 END)::int AS pending_approval,
       COUNT(CASE WHEN gk.status = 'ACTIVE' THEN 1 END)::int AS active,
       COUNT(CASE WHEN gk.status = 'COMPLETED' THEN 1 END)::int AS completed,
       COUNT(CASE WHEN gk.status = 'REJECTED' THEN 1 END)::int AS rejected,
       COALESCE(
         SUM(gk.completion_percentage * gk.weight_percentage) / NULLIF(SUM(CASE WHEN gk.status != 'REJECTED' THEN gk.weight_percentage END), 0),
         0
       )::numeric(5,2) AS average_progress
     FROM goal_kpis gk
     JOIN goals g ON g.goal_id = gk.goal_id
     WHERE gk.organization_id = $1 AND ($2::uuid IS NULL OR g.financial_year_id = $2)`,
    [orgId, performanceConfigId || null]
  );
  const stats = countsRes.rows[0];

  // pendingReviews
  const pendingReviewsRes = await db.query(
    `SELECT COUNT(*)::int 
     FROM goal_kpi_submissions 
     WHERE organization_id = $1 AND status = 'PENDING'`,
    [orgId]
  );

  // overdueKpis: due_date passed and completion_percentage < 100
  const overdueRes = await db.query(
    `SELECT COUNT(*)::int 
     FROM goal_kpis gk
     JOIN goals g ON g.goal_id = gk.goal_id
     WHERE gk.organization_id = $1 
       AND gk.due_date < NOW() 
       AND gk.completion_percentage < 100 
       AND gk.status IN ('ACTIVE', 'IN_PROGRESS')
       AND ($2::uuid IS NULL OR g.financial_year_id = $2)`,
    [orgId, performanceConfigId || null]
  );

  // completedToday
  const completedTodayRes = await db.query(
    `SELECT COUNT(*)::int 
     FROM goal_kpis gk
     JOIN goals g ON g.goal_id = gk.goal_id
     WHERE gk.organization_id = $1 
       AND gk.status = 'COMPLETED' 
       AND gk.updated_at >= date_trunc('day', now())
       AND ($2::uuid IS NULL OR g.financial_year_id = $2)`,
    [orgId, performanceConfigId || null]
  );

  // dueThisWeek
  const dueThisWeekRes = await db.query(
    `SELECT COUNT(*)::int 
     FROM goal_kpis gk
     JOIN goals g ON g.goal_id = gk.goal_id
     WHERE gk.organization_id = $1 
       AND gk.due_date >= date_trunc('week', now()) 
       AND gk.due_date < date_trunc('week', now()) + INTERVAL '7 days'
       AND gk.status IN ('ACTIVE', 'IN_PROGRESS')
       AND ($2::uuid IS NULL OR g.financial_year_id = $2)`,
    [orgId, performanceConfigId || null]
  );

  // myKpis (owned by this user)
  const myKpisRes = await db.query(
    `SELECT COUNT(*)::int 
     FROM goal_kpis gk
     JOIN goals g ON g.goal_id = gk.goal_id
     WHERE gk.organization_id = $1 AND gk.owner_user_id = $3
       AND ($2::uuid IS NULL OR g.financial_year_id = $2)`,
    [orgId, performanceConfigId || null, userContext.id]
  );

  // teamKpis (owned by direct reports)
  const teamKpisRes = await db.query(
    `SELECT COUNT(*)::int 
     FROM goal_kpis gk
     JOIN goals g ON g.goal_id = gk.goal_id
     WHERE gk.organization_id = $1 
       AND gk.owner_user_id IN (
         SELECT user_id FROM users 
         WHERE employee_id IN (
           SELECT employee_id FROM employees WHERE manager_employee_id = $3
         )
       )
       AND ($2::uuid IS NULL OR g.financial_year_id = $2)`,
    [orgId, performanceConfigId || null, userContext.employeeId || null]
  );

  return {
    total: stats.total,
    draft: stats.draft,
    pendingApproval: stats.pending_approval,
    active: stats.active,
    completed: stats.completed,
    rejected: stats.rejected,
    averageProgress: parseFloat(stats.average_progress),
    pendingReviews: pendingReviewsRes.rows[0]?.count || 0,
    overdueKpis: overdueRes.rows[0]?.count || 0,
    completedToday: completedTodayRes.rows[0]?.count || 0,
    dueThisWeek: dueThisWeekRes.rows[0]?.count || 0,
    myKpis: myKpisRes.rows[0]?.count || 0,
    teamKpis: teamKpisRes.rows[0]?.count || 0
  };
}

async function getPendingSubmissions(orgId, userContext) {
  const isManager = userContext.role === 'manager';
  const isClientAdmin = ['client_admin', 'hr'].includes(userContext.role);
  
  let queryText = `
    SELECT s.submission_id, 
           s.kpi_id, 
           s.submitted_value, 
           s.submitted_text, 
           s.submitted_boolean, 
           s.comment, 
           s.status, 
           s.submitted_at,
           k.title AS kpi_title,
           k.measurement_type,
           k.target_value,
           k.unit,
           g.title AS goal_title,
           g.goal_id,
           COALESCE(CONCAT(se.first_name, ' ', se.last_name), su.email) AS employee_name,
           se.email AS employee_email
    FROM goal_kpi_submissions s
    JOIN goal_kpis k ON s.kpi_id = k.kpi_id
    JOIN goals g ON k.goal_id = g.goal_id
    LEFT JOIN users su ON s.submitted_by = su.user_id
    LEFT JOIN employees se ON su.employee_id = se.employee_id
    WHERE s.organization_id = $1 AND s.status = 'PENDING'
  `;
  const params = [orgId];
  
  if (isManager && userContext.employeeId) {
    queryText += ` AND (se.manager_employee_id = $2 OR se.secondary_manager_id = $2)`;
    params.push(userContext.employeeId);
  }
  
  queryText += ` ORDER BY s.submitted_at DESC`;
  
  const result = await db.query(queryText, params);
  return result.rows;
}

module.exports = {
  getKpiById,
  listKpis,
  countKpis,
  createKpi,
  updateKpi,
  deleteKpi,
  countKpisForGoal,
  getKpisForGoal,
  
  // Tasks
  insertKpiTask,
  getKpiTasks,
  deleteKpiTasks,
  updateTaskCompletion,

  // Submissions
  insertSubmission,
  getSubmissionById,
  updateSubmissionStatus,
  getSubmissionsByKpiId,
  insertAttachment,
  getAttachmentsBySubmissionId,
  insertLink,
  getLinksBySubmissionId,
  getPendingSubmissions,

  // Goal Progress History
  insertGoalProgressHistory,
  getGoalProgressHistory,
  recalculateGoalProgress,
  getKpiDashboardStats
};
