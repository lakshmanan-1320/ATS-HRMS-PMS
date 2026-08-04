const { query, withTransaction } = require('../../config/db')

/* ── helpers ─────────────────────────────────────────────────────────── */

async function getClientAdminIdByOrg(orgId) {
  const r = await query(
    'SELECT client_admin_id FROM client_admins WHERE organization_id = $1',
    [orgId]
  )
  return r.rows[0]?.client_admin_id || null
}

/* ── appraisal cycles (admin) ─────────────────────────────────────────── */

async function listCycles(clientAdminId) {
  const r = await query(
    `SELECT ac.*, ac.appraisal_cycle_id AS id,
            '[]'::json AS performance_cycles
     FROM appraisal_cycles ac
     WHERE ac.client_admin_id = $1
     ORDER BY ac.period_start DESC`,
    [clientAdminId]
  )
  return r.rows
}

async function getCycleById(clientAdminId, cycleId) {
  const r = await query(
    `SELECT ac.*, ac.appraisal_cycle_id AS id,
            '[]'::json AS performance_cycles
     FROM appraisal_cycles ac
     WHERE ac.appraisal_cycle_id = $1 AND ac.client_admin_id = $2`,
    [cycleId, clientAdminId]
  )
  return r.rows[0] || null
}

async function createCycle(clientAdminId, data) {
  const { name, period_start, period_end, self_appraisal_deadline, manager_review_deadline, financial_year_id } = data
  const r = await query(
    `INSERT INTO appraisal_cycles
       (client_admin_id, name, period_start, period_end, self_appraisal_deadline, manager_review_deadline, financial_year_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [clientAdminId, name, period_start, period_end,
     self_appraisal_deadline || null, manager_review_deadline || null, financial_year_id || null]
  )
  return r.rows[0]
}

async function updateCycle(clientAdminId, cycleId, data) {
  const { name, period_start, period_end, self_appraisal_deadline, manager_review_deadline, status, financial_year_id } = data
  const r = await query(
    `UPDATE appraisal_cycles SET
       name = COALESCE($3, name),
       period_start = COALESCE($4, period_start),
       period_end = COALESCE($5, period_end),
       self_appraisal_deadline = COALESCE($6, self_appraisal_deadline),
       manager_review_deadline = COALESCE($7, manager_review_deadline),
       status = COALESCE($8, status),
       financial_year_id = COALESCE($9, financial_year_id),
       updated_at = NOW()
     WHERE appraisal_cycle_id = $1 AND client_admin_id = $2
     RETURNING *`,
    [cycleId, clientAdminId, name || null, period_start || null, period_end || null,
     self_appraisal_deadline || null, manager_review_deadline || null, status || null, financial_year_id || null]
  )
  return r.rows[0] || null
}

async function deleteCycle(clientAdminId, cycleId) {
  const r = await query(
    `DELETE FROM appraisal_cycles WHERE appraisal_cycle_id = $1 AND client_admin_id = $2 RETURNING appraisal_cycle_id`,
    [cycleId, clientAdminId]
  )
  return r.rows[0] || null;
}

/* Returns each employee with their self & manager appraisal status for one cycle */
async function getCycleEmployeeSummary(clientAdminId, cycleId) {
  const r = await query(
    `SELECT
       e.employee_id, e.employee_code,
       CONCAT(e.first_name,' ',e.last_name) AS employee_name,
       e.designation,
       CONCAT(m.first_name,' ',m.last_name) AS manager_name,
       sa.self_appraisal_id,   sa.status AS self_status,   sa.submitted_at AS self_submitted_at,
       ma.manager_appraisal_id, ma.status AS manager_status, ma.submitted_at AS manager_submitted_at,
       ma.final_rating
     FROM employees e
     LEFT JOIN employees m  ON e.manager_employee_id = m.employee_id
     LEFT JOIN self_appraisals    sa ON sa.cycle_id = $2 AND sa.employee_id = e.employee_id
     LEFT JOIN manager_appraisals ma ON ma.cycle_id = $2 AND ma.employee_id = e.employee_id
     WHERE e.organization_id = (SELECT organization_id FROM client_admins WHERE client_admin_id = $1)
       AND e.status = 'active'
     ORDER BY e.first_name, e.last_name`,
    [clientAdminId, cycleId]
  )
  return r.rows
}

/* ── goals eligible for appraisal ───────────────────────────────────────
   Top-level goals assigned to an employee that overlap the cycle period. */
async function getAppraisalGoalsForEmployee(clientAdminId, employeeId, cycleId) {
  const r = await query(
    `SELECT
       g.goal_id, g.goal_id AS id, g.title, g.description, g.target_metric,
       g.weight, g.progress, g.status, g.priority,
       g.start_date, g.due_date, COALESCE(g.performance_technique, 'KPI') AS performance_technique
     FROM goals g
     JOIN appraisal_cycles ac ON ac.appraisal_cycle_id = $3
     WHERE ac.client_admin_id = $1
       AND (g.assigned_to_employee_id = $2 OR g.goal_id IN (SELECT goal_id FROM goal_assignments WHERE employee_id = $2))
       AND g.parent_goal_id IS NULL
       AND g.status = 'ACTIVE'
       AND g.financial_year_id = ac.financial_year_id
       AND g.start_date <= ac.period_end
       AND g.due_date >= ac.period_start
     ORDER BY g.weight DESC NULLS LAST, g.created_at ASC`,
    [clientAdminId, employeeId, cycleId]
  )
  return r.rows
}

/* ── self-appraisal ──────────────────────────────────────────────────── */

async function getSelfAppraisal(cycleId, employeeId) {
  const r = await query(
    `SELECT sa.*,
       COALESCE(
         json_agg(
           json_build_object(
             'self_appraisal_goal_rating_id', sgr.self_appraisal_goal_rating_id, 'goal_id', sgr.goal_id,
             'achievement_pct', sgr.achievement_pct, 'comment', sgr.comment
           ) ORDER BY sgr.self_appraisal_goal_rating_id
         ) FILTER (WHERE sgr.self_appraisal_goal_rating_id IS NOT NULL),
         '[]'
       ) AS goal_ratings
     FROM self_appraisals sa
     LEFT JOIN self_appraisal_goal_ratings sgr ON sgr.self_appraisal_id = sa.self_appraisal_id
     WHERE sa.cycle_id = $1 AND sa.employee_id = $2
     GROUP BY sa.self_appraisal_id`,
    [cycleId, employeeId]
  )
  return r.rows[0] || null
}

async function upsertSelfAppraisal(cycleId, employeeId, overallComment, achievements, challenges, learnings, careerGoals, selfRating) {
  const r = await query(
    `INSERT INTO self_appraisals (cycle_id, employee_id, overall_comment, achievements, challenges, learnings, career_goals, self_rating)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (cycle_id, employee_id)
     DO UPDATE SET 
       overall_comment = EXCLUDED.overall_comment,
       achievements = EXCLUDED.achievements,
       challenges = EXCLUDED.challenges,
       learnings = EXCLUDED.learnings,
       career_goals = EXCLUDED.career_goals,
       self_rating = EXCLUDED.self_rating,
       updated_at = NOW()
     RETURNING *`,
    [
      cycleId,
      employeeId,
      overallComment || null,
      achievements || null,
      challenges || null,
      learnings || null,
      careerGoals || null,
      selfRating ? parseInt(selfRating, 10) : 0
    ]
  )
  return r.rows[0]
}

async function upsertSelfGoalRating(selfAppraisalId, goalId, achievementPct, comment) {
  await query(
    `INSERT INTO self_appraisal_goal_ratings (self_appraisal_id, goal_id, achievement_pct, comment)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (self_appraisal_id, goal_id)
     DO UPDATE SET achievement_pct = EXCLUDED.achievement_pct, comment = EXCLUDED.comment, updated_at = NOW()`,
    [selfAppraisalId, goalId, achievementPct, comment || null]
  )
}

async function submitSelfAppraisal(cycleId, employeeId) {
  const r = await query(
    `UPDATE self_appraisals
     SET status = 'submitted', submitted_at = NOW(), updated_at = NOW()
     WHERE cycle_id = $1 AND employee_id = $2 AND status = 'draft'
     RETURNING *`,
    [cycleId, employeeId]
  )
  return r.rows[0] || null
}

/* ── manager appraisal ───────────────────────────────────────────────── */

async function getManagerAppraisal(cycleId, employeeId) {
  const r = await query(
    `SELECT ma.*,
       CONCAT(m.first_name,' ',m.last_name) AS manager_name,
       COALESCE(
         json_agg(
           json_build_object(
             'manager_appraisal_goal_rating_id', mgr.manager_appraisal_goal_rating_id, 'goal_id', mgr.goal_id,
             'achievement_pct', mgr.achievement_pct, 'comment', mgr.comment
           ) ORDER BY mgr.manager_appraisal_goal_rating_id
         ) FILTER (WHERE mgr.manager_appraisal_goal_rating_id IS NOT NULL),
         '[]'
       ) AS goal_ratings
     FROM manager_appraisals ma
     LEFT JOIN employees m  ON ma.manager_id = m.employee_id
     LEFT JOIN manager_appraisal_goal_ratings mgr ON mgr.manager_appraisal_id = ma.manager_appraisal_id
     WHERE ma.cycle_id = $1 AND ma.employee_id = $2
     GROUP BY ma.manager_appraisal_id, m.first_name, m.last_name`,
    [cycleId, employeeId]
  )
  return r.rows[0] || null
}

async function upsertManagerAppraisal(cycleId, employeeId, managerId, overallComment, finalRating, finalScore, promotionRec, trainingRec) {
  const r = await query(
    `INSERT INTO manager_appraisals (cycle_id, employee_id, manager_id, overall_comment, final_rating, final_score, promotion_recommendation, training_recommendation)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (cycle_id, employee_id)
     DO UPDATE SET overall_comment = EXCLUDED.overall_comment,
                   final_rating = EXCLUDED.final_rating,
                   final_score = EXCLUDED.final_score,
                   manager_id = EXCLUDED.manager_id,
                   promotion_recommendation = EXCLUDED.promotion_recommendation,
                   training_recommendation = EXCLUDED.training_recommendation,
                   updated_at = NOW()
     RETURNING *`,
    [cycleId, employeeId, managerId, overallComment || null, finalRating || null, finalScore || null, promotionRec || null, trainingRec || null]
  )
  return r.rows[0]
}

async function upsertManagerGoalRating(managerAppraisalId, goalId, achievementPct, comment) {
  await query(
    `INSERT INTO manager_appraisal_goal_ratings (manager_appraisal_id, goal_id, achievement_pct, comment)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (manager_appraisal_id, goal_id)
     DO UPDATE SET achievement_pct = EXCLUDED.achievement_pct, comment = EXCLUDED.comment, updated_at = NOW()`,
    [managerAppraisalId, goalId, achievementPct, comment || null]
  )
}

async function submitManagerAppraisal(cycleId, employeeId, managerId) {
  const r = await query(
    `UPDATE manager_appraisals
     SET status = 'submitted', submitted_at = NOW(), updated_at = NOW()
     WHERE cycle_id = $1 AND employee_id = $2 AND manager_id = $3 AND status = 'draft'
     RETURNING *`,
    [cycleId, employeeId, managerId]
  )
  return r.rows[0] || null
}

/* Manager sees all their direct reports with appraisal status for a cycle */
async function getManagerTeamAppraisalStatus(managerId, cycleId) {
  const r = await query(
    `SELECT
       e.employee_id, e.employee_code,
       CONCAT(e.first_name,' ',e.last_name) AS employee_name,
       e.designation,
       sa.self_appraisal_id, sa.status AS self_status, sa.submitted_at AS self_submitted_at,
       ma.manager_appraisal_id, ma.status AS manager_status,
       ma.submitted_at AS manager_submitted_at, ma.final_rating
     FROM employees e
     LEFT JOIN self_appraisals    sa ON sa.cycle_id = $2 AND sa.employee_id = e.employee_id
     LEFT JOIN manager_appraisals ma ON ma.cycle_id = $2 AND ma.employee_id = e.employee_id
     WHERE e.manager_employee_id = $1 
       AND e.status = 'active'
       AND e.department_id = (SELECT department_id FROM employees WHERE employee_id = $1)
     ORDER BY e.first_name, e.last_name`,
    [managerId, cycleId]
  )
  return r.rows
}

/* Active cycles visible to employees */
async function getActiveCyclesForOrg(clientAdminId) {
  const r = await query(
    `SELECT *, appraisal_cycle_id AS id FROM appraisal_cycles
     WHERE client_admin_id = $1 AND status = 'active'
     ORDER BY period_start DESC`,
    [clientAdminId]
  )
  return r.rows
}

/* ── integrated performance techniques queries ─────────────────────── */

async function getGoalAssignment(goalId, employeeId) {
  const r = await query(
    `SELECT assignment_id FROM goal_assignments 
     WHERE goal_id = $1 AND employee_id = $2 AND status = 'ACTIVE' LIMIT 1`,
    [goalId, employeeId]
  )
  return r.rows[0] || null
}

async function getGoalKpis(goalId) {
  const r = await query(
    `SELECT kpi_id, title, completion_percentage, target_value, approved_value, status, priority, unit 
     FROM goal_kpis WHERE goal_id = $1`,
    [goalId]
  )
  return r.rows
}

async function getPendingKpiSubmissionsCount(kpiId) {
  const r = await query(
    `SELECT COUNT(*)::int AS count FROM goal_kpi_submissions WHERE kpi_id = $1 AND status = 'PENDING'`,
    [kpiId]
  )
  return r.rows[0]?.count || 0
}

async function getGoalCompetencyAssessments(assignmentId) {
  const r = await query(
    `SELECT ca.assessment_id, ca.rating, ca.comment, ca.rated_at,
            gc.name AS competency_name, gc.description AS competency_description, gc.weight AS competency_weight
     FROM competency_assessments ca
     JOIN goal_competencies gc ON ca.goal_competency_id = gc.goal_competency_id
     WHERE ca.assignment_id = $1`,
    [assignmentId]
  )
  return r.rows
}

async function getGoalSelfAssessment(assignmentId) {
  const submissionRes = await query(
    `SELECT submission_id, status, overall_employee_score, overall_manager_score, final_score, employee_comments, manager_comments
     FROM self_assessment_submissions WHERE assignment_id = $1 LIMIT 1`,
    [assignmentId]
  )
  const submission = submissionRes.rows[0] || null
  if (!submission) return null

  const answersRes = await query(
    `SELECT a.answer_id, a.answer, a.employee_rating, a.manager_rating, a.manager_comment, a.employee_comment,
            t.question, t.question_type, t.weight
     FROM self_assessment_answers a
     LEFT JOIN self_assessment_templates t ON a.template_id = t.template_id
     WHERE a.submission_id = $1
     ORDER BY t.display_order ASC`,
    [submission.submission_id]
  )
  submission.answers = answersRes.rows
  return submission
}

async function getGoal360Feedback(assignmentId) {
  const summaryRes = await query(
    `SELECT manager_average, peer_average, direct_report_average, external_average, overall_score, completion_percentage, final_score
     FROM feedback_summary WHERE assignment_id = $1 LIMIT 1`,
    [assignmentId]
  )
  return summaryRes.rows[0] || null
}

async function getGoalContinuousFeedback(assignmentId) {
  const praisesCountRes = await query(
    `SELECT COUNT(*)::int AS count FROM feedback_praises WHERE assignment_id = $1`,
    [assignmentId]
  )
  const notesRes = await query(
    `SELECT feedback_text, created_at FROM feedback_entries 
     WHERE assignment_id = $1 ORDER BY created_at DESC`,
    [assignmentId]
  )
  return {
    praisesCount: praisesCountRes.rows[0]?.count || 0,
    coachingNotes: notesRes.rows,
  }
}

module.exports = {
  getClientAdminIdByOrg,
  listCycles,
  getCycleById,
  createCycle,
  updateCycle,
  deleteCycle,
  getCycleEmployeeSummary,
  getAppraisalGoalsForEmployee,
  getSelfAppraisal,
  upsertSelfAppraisal,
  upsertSelfGoalRating,
  submitSelfAppraisal,
  getManagerAppraisal,
  upsertManagerAppraisal,
  upsertManagerGoalRating,
  submitManagerAppraisal,
  getManagerTeamAppraisalStatus,
  getActiveCyclesForOrg,
  getGoalAssignment,
  getGoalKpis,
  getPendingKpiSubmissionsCount,
  getGoalCompetencyAssessments,
  getGoalSelfAssessment,
  getGoal360Feedback,
  getGoalContinuousFeedback,
}
