const { query } = require('../../config/db');

// --- Global Competency Library ---
async function listLibrary(orgId) {
  const compRes = await query(
    `SELECT * FROM competency_library 
     WHERE organization_id = $1 AND is_active = TRUE 
     ORDER BY name`,
    [orgId]
  );
  
  const ids = compRes.rows.map(r => r.competency_id);
  if (ids.length === 0) return [];

  const indRes = await query(
    `SELECT * FROM competency_indicators 
     WHERE competency_id = ANY($1) 
     ORDER BY competency_id, rating_level`,
    [ids]
  );

  return compRes.rows.map(comp => {
    comp.indicators = indRes.rows.filter(ind => ind.competency_id === comp.competency_id);
    return comp;
  });
}

async function getLibraryById(id, orgId) {
  const compRes = await query(
    `SELECT * FROM competency_library WHERE competency_id = $1 AND organization_id = $2`,
    [id, orgId]
  );
  const comp = compRes.rows[0];
  if (!comp) return null;

  const indRes = await query(
    `SELECT * FROM competency_indicators WHERE competency_id = $1 ORDER BY rating_level`,
    [id]
  );
  comp.indicators = indRes.rows;
  return comp;
}

async function createLibraryComp(orgId, name, description) {
  const res = await query(
    `INSERT INTO competency_library (organization_id, name, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [orgId, name, description]
  );
  return res.rows[0];
}

async function updateLibraryComp(id, orgId, name, description) {
  const res = await query(
    `UPDATE competency_library 
     SET name = $3, description = $4, updated_at = NOW()
     WHERE competency_id = $1 AND organization_id = $2
     RETURNING *`,
    [id, orgId, name, description]
  );
  return res.rows[0];
}

async function deleteLibraryComp(id, orgId) {
  const res = await query(
    `DELETE FROM competency_library WHERE competency_id = $1 AND organization_id = $2 RETURNING *`,
    [id, orgId]
  );
  return res.rows[0];
}

async function createIndicator(competencyId, ratingLevel, indicatorText) {
  const res = await query(
    `INSERT INTO competency_indicators (competency_id, rating_level, behavioral_indicator)
     VALUES ($1, $2, $3)
     ON CONFLICT (competency_id, rating_level) 
     DO UPDATE SET behavioral_indicator = EXCLUDED.behavioral_indicator, updated_at = NOW()
     RETURNING *`,
    [competencyId, ratingLevel, indicatorText]
  );
  return res.rows[0];
}

async function clearIndicators(competencyId) {
  await query(`DELETE FROM competency_indicators WHERE competency_id = $1`, [competencyId]);
}


// --- Rating Scales ---
async function listRatingScales(orgId) {
  const res = await query(
    `SELECT * FROM competency_rating_scales WHERE organization_id = $1 ORDER BY rating_level`,
    [orgId]
  );
  return res.rows;
}

async function updateRatingScale(orgId, ratingLevel, label) {
  const res = await query(
    `INSERT INTO competency_rating_scales (organization_id, rating_level, label)
     VALUES ($1, $2, $3)
     ON CONFLICT (organization_id, rating_level) 
     DO UPDATE SET label = EXCLUDED.label
     RETURNING *`,
    [orgId, ratingLevel, label]
  );
  return res.rows[0];
}


// --- Goal Competency Template ---
async function listGoalCompetencies(goalId) {
  const res = await query(
    `SELECT * FROM goal_competencies WHERE goal_id = $1 ORDER BY display_order, name`,
    [goalId]
  );
  return res.rows;
}

async function clearGoalCompetencies(goalId) {
  await query(`DELETE FROM goal_competencies WHERE goal_id = $1`, [goalId]);
}

async function createGoalCompetency(goalId, libraryId, name, description, weight, displayOrder) {
  const res = await query(
    `INSERT INTO goal_competencies (goal_id, competency_library_id, name, description, weight, display_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [goalId, libraryId || null, name, description, weight, displayOrder || 0]
  );
  return res.rows[0];
}


// --- Assignment Assessments ---
async function getAssessmentsByAssignment(assignmentId) {
  const res = await query(
    `SELECT * FROM competency_assessments WHERE assignment_id = $1`,
    [assignmentId]
  );
  return res.rows;
}

async function saveAssessmentRating(orgId, goalId, assignmentId, goalCompetencyId, rating, comment, userId) {
  const res = await query(
    `INSERT INTO competency_assessments (organization_id, goal_id, assignment_id, goal_competency_id, rating, comment, rated_by, rated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (assignment_id, goal_competency_id) 
     DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, rated_by = EXCLUDED.rated_by, rated_at = NOW(), updated_at = NOW()
     RETURNING *`,
    [orgId, goalId, assignmentId, goalCompetencyId, rating, comment || null, userId]
  );
  return res.rows[0];
}

async function updateAssignmentScoreAndProgress(assignmentId, progress, score) {
  const res = await query(
    `UPDATE goal_assignments 
     SET progress = $2, weighted_score = $3, updated_at = NOW()
     WHERE assignment_id = $1
     RETURNING *`,
    [assignmentId, progress, score]
  );
  return res.rows[0];
}

async function acknowledgeAssignment(assignmentId) {
  const res = await query(
    `UPDATE goal_assignments 
     SET employee_acknowledged = TRUE, acknowledged_at = NOW(), updated_at = NOW()
     WHERE assignment_id = $1
     RETURNING *`,
    [assignmentId]
  );
  return res.rows[0];
}

async function getGoalAssignmentsOverview(goalId) {
  const res = await query(
    `SELECT 
       COALESCE(AVG(progress), 0.00)::numeric(5,2) AS avg_progress,
       COALESCE(AVG(weighted_score), 0.00)::numeric(5,2) AS avg_score,
       COUNT(CASE WHEN status = 'COMPLETED' AND completion_outcome = 'ACHIEVED' THEN 1 END)::int AS achieved_count,
       COUNT(CASE WHEN status = 'COMPLETED' AND completion_outcome = 'NEEDS_DEVELOPMENT' THEN 1 END)::int AS needs_development_count,
       COUNT(assignment_id)::int AS total_assigned
     FROM goal_assignments
     WHERE goal_id = $1`,
    [goalId]
  );
  return res.rows[0];
}

async function getCompetencyGapReport(orgId, filters = {}) {
  const { department_id = null, employee_id = null } = filters;
  const res = await query(
    `SELECT 
      e.first_name || ' ' || e.last_name AS employee_name,
      e.employee_code,
      d.name AS department_name,
      gc.name AS competency_name,
      5.00::numeric(5,2) AS target_rating,
      ca.rating::numeric(5,2) AS actual_rating,
      (ca.rating - 5.00)::numeric(5,2) AS gap_score
    FROM competency_assessments ca
    JOIN goal_assignments ga ON ga.assignment_id = ca.assignment_id
    JOIN employees e ON e.employee_id = ga.employee_id
    LEFT JOIN departments d ON d.department_id = e.department_id
    JOIN goal_competencies gc ON gc.goal_competency_id = ca.goal_competency_id
    WHERE ca.organization_id = $1
      AND ($2::UUID IS NULL OR e.department_id = $2)
      AND ($3::UUID IS NULL OR e.employee_id = $3)
    ORDER BY employee_name, competency_name`,
    [orgId, department_id, employee_id]
  );
  return res.rows;
}

async function getRatingDistributionReport(orgId, filters = {}) {
  const { department_id = null, employee_id = null } = filters;
  const res = await query(
    `SELECT 
      gc.name AS competency_name,
      COUNT(CASE WHEN ca.rating = 1 THEN 1 END)::int AS level_1_count,
      COUNT(CASE WHEN ca.rating = 2 THEN 1 END)::int AS level_2_count,
      COUNT(CASE WHEN ca.rating = 3 THEN 1 END)::int AS level_3_count,
      COUNT(CASE WHEN ca.rating = 4 THEN 1 END)::int AS level_4_count,
      COUNT(CASE WHEN ca.rating = 5 THEN 1 END)::int AS level_5_count,
      COUNT(ca.rating)::int AS total_ratings
    FROM goal_competencies gc
    JOIN competency_assessments ca ON ca.goal_competency_id = gc.goal_competency_id
    JOIN goal_assignments ga ON ga.assignment_id = ca.assignment_id
    JOIN employees e ON e.employee_id = ga.employee_id
    WHERE ca.organization_id = $1
      AND ($2::UUID IS NULL OR e.department_id = $2)
      AND ($3::UUID IS NULL OR e.employee_id = $3)
    GROUP BY gc.name
    ORDER BY gc.name`,
    [orgId, department_id, employee_id]
  );
  return res.rows;
}

async function getAverageRatingReport(orgId, filters = {}) {
  const { department_id = null, employee_id = null } = filters;
  const res = await query(
    `SELECT 
      gc.name AS competency_name,
      AVG(ca.rating)::numeric(5,2) AS avg_rating,
      COUNT(ca.rating)::int AS total_ratings
    FROM goal_competencies gc
    JOIN competency_assessments ca ON ca.goal_competency_id = gc.goal_competency_id
    JOIN goal_assignments ga ON ga.assignment_id = ca.assignment_id
    JOIN employees e ON e.employee_id = ga.employee_id
    WHERE ca.organization_id = $1
      AND ($2::UUID IS NULL OR e.department_id = $2)
      AND ($3::UUID IS NULL OR e.employee_id = $3)
    GROUP BY gc.name
    ORDER BY gc.name`,
    [orgId, department_id, employee_id]
  );
  return res.rows;
}

async function listAssessments(orgId, filters = {}) {
  const { department_id = null, employee_id = null } = filters;
  const res = await query(
    `SELECT 
      ga.assignment_id,
      ga.goal_id,
      ga.employee_id,
      ga.status,
      ga.progress,
      ga.weighted_score,
      ga.employee_acknowledged,
      ga.acknowledged_at,
      ga.completed_at,
      g.title,
      g.description,
      g.performance_technique,
      g.start_date,
      g.due_date,
      g.visibility,
      g.goal_type,
      g.priority,
      g.created_by,
      COALESCE(NULLIF(CONCAT(cue.first_name, ' ', cue.last_name), ' '), cu.email) AS created_by_name,
      g.approved_by,
      COALESCE(NULLIF(CONCAT(aue.first_name, ' ', aue.last_name), ' '), au.email) AS approved_by_name,
      g.assigned_by,
      COALESCE(NULLIF(CONCAT(asge.first_name, ' ', asge.last_name), ' '), asg.email) AS assigned_by_name,
      g.goal_code,
      e.first_name || ' ' || e.last_name AS employee_name,
      e.employee_code,
      d.name AS department_name,
      e.designation AS employee_designation,
      gc.name AS goal_category_name
     FROM goal_assignments ga
     JOIN goals g ON g.goal_id = ga.goal_id
     JOIN employees e ON e.employee_id = ga.employee_id
     LEFT JOIN departments d ON d.department_id = e.department_id
     LEFT JOIN goal_categories gc ON g.goal_category_id = gc.category_id
     LEFT JOIN users cu ON g.created_by = cu.user_id
     LEFT JOIN employees cue ON cu.employee_id = cue.employee_id
     LEFT JOIN users au ON g.approved_by = au.user_id
     LEFT JOIN employees aue ON au.employee_id = aue.employee_id
     LEFT JOIN users asg ON g.assigned_by = asg.user_id
     LEFT JOIN employees asge ON asg.employee_id = asge.employee_id
     WHERE ga.organization_id = $1
       AND g.performance_technique = 'COMPETENCY_ASSESSMENT'
       AND ($2::UUID IS NULL OR e.department_id = $2)
       AND ($3::UUID IS NULL OR e.employee_id = $3)
     ORDER BY ga.created_at DESC`,
    [orgId, department_id, employee_id]
  );
  return res.rows;
}

module.exports = {
  listLibrary,
  getLibraryById,
  createLibraryComp,
  updateLibraryComp,
  deleteLibraryComp,
  createIndicator,
  clearIndicators,
  listRatingScales,
  updateRatingScale,
  listGoalCompetencies,
  clearGoalCompetencies,
  createGoalCompetency,
  getAssessmentsByAssignment,
  saveAssessmentRating,
  updateAssignmentScoreAndProgress,
  acknowledgeAssignment,
  getGoalAssignmentsOverview,
  getCompetencyGapReport,
  getRatingDistributionReport,
  getAverageRatingReport,
  listAssessments
};
