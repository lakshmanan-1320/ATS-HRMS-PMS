const { query } = require('../../config/db');

// ─── Goal-Level Config ──────────────────────────────────────────────────────

async function getGoalConfig(goalId) {
  const res = await query(
    `SELECT * FROM feedback_goal_config WHERE goal_id = $1`,
    [goalId]
  );
  return res.rows[0] || null;
}

async function saveGoalConfig(orgId, goalId, config) {
  const res = await query(
    `INSERT INTO feedback_goal_config (
      organization_id, goal_id,
      allow_manager, manager_count,
      allow_peers, peer_count,
      allow_direct_reports, direct_report_count,
      anonymous_enabled, reviewer_deadline,
      reminder_interval_days, late_submission_policy,
      manager_weight, peer_weight, direct_report_weight,
      minimum_completion_percentage, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())
    ON CONFLICT (goal_id) DO UPDATE SET
      allow_manager = EXCLUDED.allow_manager,
      manager_count = EXCLUDED.manager_count,
      allow_peers = EXCLUDED.allow_peers,
      peer_count = EXCLUDED.peer_count,
      allow_direct_reports = EXCLUDED.allow_direct_reports,
      direct_report_count = EXCLUDED.direct_report_count,
      anonymous_enabled = EXCLUDED.anonymous_enabled,
      reviewer_deadline = EXCLUDED.reviewer_deadline,
      manager_weight = EXCLUDED.manager_weight,
      peer_weight = EXCLUDED.peer_weight,
      direct_report_weight = EXCLUDED.direct_report_weight,
      reminder_interval_days = EXCLUDED.reminder_interval_days,
      late_submission_policy = EXCLUDED.late_submission_policy,
      minimum_completion_percentage = EXCLUDED.minimum_completion_percentage,
      updated_at = NOW()
    RETURNING *`,
    [
      orgId, goalId,
      config.allow_manager ?? true, config.manager_count ?? 1,
      config.allow_peers ?? true, config.peer_count ?? 3,
      config.allow_direct_reports ?? true, config.direct_report_count ?? 2,
      config.anonymous_enabled ?? false, config.reviewer_deadline || null,
      config.reminder_interval_days ?? 3, config.late_submission_policy || 'BLOCK',
      config.manager_weight ?? 40, config.peer_weight ?? 40,
      config.direct_report_weight ?? 20,
      config.minimum_completion_percentage ?? 100
    ]
  );
  return res.rows[0];
}

// ─── Questionnaire Templates ────────────────────────────────────────────────

async function getTemplates(goalId, orgId) {
  const res = await query(
    `SELECT * FROM feedback_templates
     WHERE goal_id = $1 AND organization_id = $2
     ORDER BY display_order ASC`,
    [goalId, orgId]
  );
  return res.rows;
}

async function isTemplateLocked(goalId, orgId) {
  // Locked if any reviewer has ACCEPTED or SUBMITTED for any assignment of this goal
  const res = await query(
    `SELECT 1 FROM feedback_participants fp
     JOIN goal_assignments ga ON ga.assignment_id = fp.assignment_id
     WHERE ga.goal_id = $1 AND ga.organization_id = $2
       AND fp.status IN ('ACCEPTED', 'SUBMITTED')
     LIMIT 1`,
    [goalId, orgId]
  );
  return res.rows.length > 0;
}

async function saveTemplates(orgId, goalId, questions) {
  const client = await require('../../config/db').getPool().connect();
  try {
    await client.query('BEGIN');

    // Verify lock
    const lockRes = await client.query(
      `SELECT 1 FROM feedback_participants fp
       JOIN goal_assignments ga ON ga.assignment_id = fp.assignment_id
       WHERE ga.goal_id = $1 AND ga.organization_id = $2
         AND fp.status IN ('ACCEPTED', 'SUBMITTED')
       LIMIT 1`,
      [goalId, orgId]
    );
    if (lockRes.rows.length > 0) {
      throw new Error('Questionnaire is locked because reviewers have already accepted or submitted responses.');
    }

    // Delete existing
    await client.query(
      `DELETE FROM feedback_templates WHERE goal_id = $1 AND organization_id = $2`,
      [goalId, orgId]
    );

    const inserted = [];
    for (const q of questions) {
      const res = await client.query(
        `INSERT INTO feedback_templates (
          organization_id, goal_id, question, question_type,
          weight, required, display_order, options_json
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *`,
        [
          orgId, goalId, q.question, q.question_type,
          q.weight || 0, q.required ?? true, q.display_order || 0,
          JSON.stringify(q.options_json || {})
        ]
      );
      inserted.push(res.rows[0]);
    }

    await client.query('COMMIT');
    return inserted;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Participants ───────────────────────────────────────────────────────────

async function getParticipants(assignmentId) {
  const res = await query(
    `SELECT fp.*,
       TRIM(CONCAT(e.first_name, ' ', e.last_name)) AS reviewer_name,
       e.employee_code AS reviewer_employee_code,
       d.name AS reviewer_department_name
     FROM feedback_participants fp
     JOIN employees e ON e.employee_id = fp.reviewer_employee_id
     LEFT JOIN departments d ON d.department_id = e.department_id
     WHERE fp.assignment_id = $1
     ORDER BY fp.relationship_type ASC, fp.created_at ASC`,
    [assignmentId]
  );
  return res.rows;
}

async function addParticipant(orgId, assignmentId, reviewerEmployeeId, relationshipType) {
  const res = await query(
    `INSERT INTO feedback_participants (
      organization_id, assignment_id, reviewer_employee_id,
      relationship_type, status
    ) VALUES ($1,$2,$3,$4,'INVITED')
    ON CONFLICT (assignment_id, reviewer_employee_id) DO NOTHING
    RETURNING *`,
    [orgId, assignmentId, reviewerEmployeeId, relationshipType]
  );
  return res.rows[0] || null;
}

async function removeParticipant(participantId) {
  const res = await query(
    `DELETE FROM feedback_participants
     WHERE feedback_participant_id = $1
       AND status IN ('INVITED', 'PENDING')
     RETURNING *`,
    [participantId]
  );
  return res.rows[0] || null;
}

async function updateParticipantStatus(participantId, status) {
  const now = status === 'SUBMITTED' ? ', submitted_at = NOW()' : '';
  const res = await query(
    `UPDATE feedback_participants
     SET status = $1${now}, updated_at = NOW()
     WHERE feedback_participant_id = $2
     RETURNING *`,
    [status, participantId]
  );
  return res.rows[0] || null;
}

async function getParticipantById(participantId) {
  const res = await query(
    `SELECT fp.*,
       ga.goal_id, ga.employee_id AS subject_employee_id, ga.organization_id
     FROM feedback_participants fp
     JOIN goal_assignments ga ON ga.assignment_id = fp.assignment_id
     WHERE fp.feedback_participant_id = $1`,
    [participantId]
  );
  return res.rows[0] || null;
}

async function getParticipantByReviewer(assignmentId, reviewerEmployeeId) {
  const res = await query(
    `SELECT * FROM feedback_participants
     WHERE assignment_id = $1 AND reviewer_employee_id = $2`,
    [assignmentId, reviewerEmployeeId]
  );
  return res.rows[0] || null;
}

// ─── Answers ────────────────────────────────────────────────────────────────

async function getParticipantAnswers(participantId) {
  const res = await query(
    `SELECT fa.*, ft.question, ft.question_type, ft.weight, ft.required, ft.options_json
     FROM feedback_answers fa
     JOIN feedback_templates ft ON ft.feedback_template_id = fa.question_id
     WHERE fa.feedback_participant_id = $1
     ORDER BY ft.display_order ASC`,
    [participantId]
  );
  return res.rows;
}

async function saveParticipantAnswers(participantId, answers) {
  const client = await require('../../config/db').getPool().connect();
  try {
    await client.query('BEGIN');

    for (const ans of answers) {
      await client.query(
        `INSERT INTO feedback_answers (
          feedback_participant_id, question_id, rating, comment
        ) VALUES ($1,$2,$3,$4)
        ON CONFLICT (feedback_participant_id, question_id) DO UPDATE SET
          rating = EXCLUDED.rating,
          comment = EXCLUDED.comment,
          updated_at = NOW()`,
        [
          participantId, ans.question_id,
          ans.rating !== undefined && ans.rating !== null ? ans.rating : null,
          ans.comment || null
        ]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Summary ────────────────────────────────────────────────────────────────

async function getSummary(assignmentId) {
  const res = await query(
    `SELECT * FROM feedback_summary WHERE assignment_id = $1`,
    [assignmentId]
  );
  return res.rows[0] || null;
}

async function upsertSummary(orgId, assignmentId, scores) {
  const res = await query(
    `INSERT INTO feedback_summary (
      organization_id, assignment_id,
      manager_average, peer_average, direct_report_average, external_average,
      overall_score, completion_percentage, final_score, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
    ON CONFLICT (assignment_id) DO UPDATE SET
      manager_average = EXCLUDED.manager_average,
      peer_average = EXCLUDED.peer_average,
      direct_report_average = EXCLUDED.direct_report_average,
      external_average = EXCLUDED.external_average,
      overall_score = EXCLUDED.overall_score,
      completion_percentage = EXCLUDED.completion_percentage,
      final_score = EXCLUDED.final_score,
      updated_at = NOW()
    RETURNING *`,
    [
      orgId, assignmentId,
      scores.manager_average, scores.peer_average,
      scores.direct_report_average, scores.external_average,
      scores.overall_score, scores.completion_percentage,
      scores.final_score
    ]
  );
  return res.rows[0];
}

async function markResultsViewed(assignmentId) {
  await query(
    `UPDATE feedback_summary SET results_viewed_at = NOW() WHERE assignment_id = $1`,
    [assignmentId]
  );
}

// ─── Reports ────────────────────────────────────────────────────────────────

async function getSummaryReport(orgId, filters, currentUserEmployeeId = null) {
  let sql = `
    SELECT
      fs.feedback_summary_id,
      fs.manager_average,
      fs.peer_average,
      fs.direct_report_average,
      fs.external_average,
      fs.overall_score,
      fs.completion_percentage,
      fs.final_score,
      fs.results_viewed_at,
      ga.assignment_id,
      ga.employee_id,
      ga.goal_id,
      (SELECT status FROM feedback_participants WHERE assignment_id = ga.assignment_id AND reviewer_employee_id = $2) AS my_reviewer_status,
      TRIM(CONCAT(e.first_name, ' ', e.last_name)) AS employee_name,
      d.name AS department_name,
      g.title,
      g.goal_code,
      g.status AS goal_status,
      fy.name AS cycle_name,
      COALESCE(g.performance_technique, 'KPI') AS performance_technique,
      (SELECT COUNT(*)::int FROM feedback_participants WHERE assignment_id = ga.assignment_id) AS total_reviewers,
      (SELECT COUNT(*)::int FROM feedback_participants WHERE assignment_id = ga.assignment_id AND status = 'SUBMITTED') AS submitted_reviewers,
      (SELECT COUNT(*)::int FROM feedback_participants WHERE assignment_id = ga.assignment_id AND status = 'INVITED') AS invited_reviewers,
      (SELECT COUNT(*)::int FROM feedback_participants WHERE assignment_id = ga.assignment_id AND status = 'DECLINED') AS declined_reviewers,
      COALESCE(NULLIF(CONCAT(cue.first_name, ' ', cue.last_name), ' '), cu.email) AS created_by_name,
      COALESCE(NULLIF(CONCAT(aue.first_name, ' ', aue.last_name), ' '), au.email) AS approved_by_name,
      COALESCE(NULLIF(CONCAT(asge.first_name, ' ', asge.last_name), ' '), asg.email) AS assigned_by_name
    FROM goal_assignments ga
    JOIN employees e ON e.employee_id = ga.employee_id
    LEFT JOIN departments d ON d.department_id = e.department_id
    JOIN goals g ON g.goal_id = ga.goal_id
    LEFT JOIN financial_years fy ON fy.financial_year_id = g.financial_year_id
    LEFT JOIN feedback_summary fs ON fs.assignment_id = ga.assignment_id
    LEFT JOIN users cu ON g.created_by = cu.user_id
    LEFT JOIN employees cue ON cu.employee_id = cue.employee_id
    LEFT JOIN users au ON g.approved_by = au.user_id
    LEFT JOIN employees aue ON au.employee_id = aue.employee_id
    LEFT JOIN users asg ON g.assigned_by = asg.user_id
    LEFT JOIN employees asge ON asg.employee_id = asge.employee_id
    WHERE ga.organization_id = $1 AND g.performance_technique = '360_FEEDBACK'
      AND (
        g.assigned_to_department_id IS NULL 
        OR $2 IS NULL 
        OR (SELECT department_id FROM employees WHERE employee_id = $2) IS NULL
        OR g.assigned_to_department_id = (SELECT department_id FROM employees WHERE employee_id = $2)
      )
  `;

  const params = [orgId, currentUserEmployeeId];
  let idx = 3;

  if (filters.cycle_id) {
    sql += ` AND g.financial_year_id = $${idx++}`;
    params.push(filters.cycle_id);
  }
  if (filters.goal_id) {
    sql += ` AND ga.goal_id = $${idx++}`;
    params.push(filters.goal_id);
  }
  if (filters.department_id) {
    sql += ` AND e.department_id = $${idx++}`;
    params.push(filters.department_id);
  }
  if (filters.employee_id) {
    sql += ` AND ga.employee_id = $${idx++}`;
    params.push(filters.employee_id);
  }
  if (filters.reviewer_employee_id) {
    sql += ` AND EXISTS (
      SELECT 1 FROM feedback_participants fp
      WHERE fp.assignment_id = ga.assignment_id AND fp.reviewer_employee_id = $${idx++}
    )`;
    params.push(filters.reviewer_employee_id);
  }

  sql += ` ORDER BY ga.created_at DESC`;

  const res = await query(sql, params);
  return res.rows;
}

async function getAssignmentOverview(goalId) {
  const res = await query(
    `SELECT
       COUNT(DISTINCT ga.assignment_id)::int AS total_assignments,
       COUNT(DISTINCT fs.assignment_id)::int AS finalized_assignments,
       COALESCE(AVG(fs.final_score), 0)::numeric(5,2) AS avg_final_score,
       (SELECT COUNT(*)::int FROM feedback_participants fp
        JOIN goal_assignments ga2 ON ga2.assignment_id = fp.assignment_id
        WHERE ga2.goal_id = $1) AS total_reviewers,
       (SELECT COUNT(*)::int FROM feedback_participants fp
        JOIN goal_assignments ga2 ON ga2.assignment_id = fp.assignment_id
        WHERE ga2.goal_id = $1 AND fp.status = 'SUBMITTED') AS submitted_reviewers
     FROM goal_assignments ga
     LEFT JOIN feedback_summary fs ON fs.assignment_id = ga.assignment_id AND fs.final_score IS NOT NULL
     WHERE ga.goal_id = $1`,
    [goalId]
  );
  return res.rows[0] || {};
}

// ─── Auto-Populate ──────────────────────────────────────────────────────────

async function getAutoPopulateReviewers(orgId, subjectEmployeeId) {
  // Get subject's manager and department
  const subjectRes = await query(
    `SELECT manager_employee_id, department_id FROM employees WHERE employee_id = $1 AND organization_id = $2`,
    [subjectEmployeeId, orgId]
  );
  const managerId = subjectRes.rows[0]?.manager_employee_id || null;
  const departmentId = subjectRes.rows[0]?.department_id || null;

  // Direct reports (employees who report to this subject)
  const directsRes = await query(
    `SELECT employee_id FROM employees
     WHERE organization_id = $1 AND manager_employee_id = $2 AND status = 'active'`,
    [orgId, subjectEmployeeId]
  );
  const directReports = directsRes.rows.map(r => r.employee_id);

  // Peers = all active employees in same department, excluding:
  //   - the subject themselves
  //   - their manager (categorized separately as MANAGER)
  //   - their direct reports (categorized separately as DIRECT_REPORT)
  let peers = [];
  if (departmentId) {
    const excludeIds = [subjectEmployeeId, ...(managerId ? [managerId] : []), ...directReports];
    const placeholders = excludeIds.map((_, i) => `$${i + 3}`).join(',');
    const peersRes = await query(
      `SELECT employee_id FROM employees
       WHERE organization_id = $1 AND department_id = $2
         AND employee_id NOT IN (${placeholders})
         AND status = 'active'`,
      [orgId, departmentId, ...excludeIds]
    );
    peers = peersRes.rows.map(r => r.employee_id);
  }

  return { managerId, peers, directReports };
}

module.exports = {
  getGoalConfig,
  saveGoalConfig,
  getTemplates,
  isTemplateLocked,
  saveTemplates,
  getParticipants,
  addParticipant,
  removeParticipant,
  updateParticipantStatus,
  getParticipantById,
  getParticipantByReviewer,
  getParticipantAnswers,
  saveParticipantAnswers,
  getSummary,
  upsertSummary,
  markResultsViewed,
  getSummaryReport,
  getAssignmentOverview,
  getAutoPopulateReviewers
};
