const { query } = require('../../config/db');

async function isTemplateLocked(goalId, orgId) {
  const res = await query(
    `SELECT 1 FROM self_assessment_submissions 
     WHERE goal_id = $1 AND organization_id = $2 LIMIT 1`,
    [goalId, orgId]
  );
  return res.rows.length > 0;
}

async function getSelfAssessmentTemplate(goalId, orgId) {
  const res = await query(
    `SELECT * FROM self_assessment_templates 
     WHERE goal_id = $1 AND organization_id = $2
     ORDER BY display_order ASC`,
    [goalId, orgId]
  );
  return res.rows;
}

async function saveSelfAssessmentTemplate(orgId, goalId, questions, createdBy) {
  // Run in transaction to replace template
  const client = await require('../../config/db').getPool().connect();
  try {
    await client.query('BEGIN');

    // Verify lock
    const lockRes = await client.query(
      `SELECT 1 FROM self_assessment_submissions 
       WHERE goal_id = $1 AND organization_id = $2 LIMIT 1`,
      [goalId, orgId]
    );
    if (lockRes.rows.length > 0) {
      throw new Error('Self assessment template is locked because submissions already exist.');
    }

    // Delete existing
    await client.query(
      `DELETE FROM self_assessment_templates WHERE goal_id = $1 AND organization_id = $2`,
      [goalId, orgId]
    );

    const inserted = [];
    for (const q of questions) {
      const res = await client.query(
        `INSERT INTO self_assessment_templates (
          organization_id, goal_id, question, question_type, display_order, 
          required, weight, options_json, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          orgId, goalId, q.question, q.question_type, q.display_order || 0,
          q.required ?? true, q.weight || 0.00, JSON.stringify(q.options_json || {}), createdBy
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

async function getSubmissionByAssignmentId(assignmentId, orgId) {
  const res = await query(
    `SELECT * FROM self_assessment_submissions 
     WHERE assignment_id = $1 AND organization_id = $2`,
    [assignmentId, orgId]
  );
  return res.rows[0] || null;
}

async function createSubmission({ organization_id, goal_id, assignment_id, employee_id }) {
  const res = await query(
    `INSERT INTO self_assessment_submissions (
      organization_id, goal_id, assignment_id, employee_id, status
    ) VALUES ($1, $2, $3, $4, 'DRAFT')
    ON CONFLICT (assignment_id) DO UPDATE SET updated_at = NOW()
    RETURNING *`,
    [organization_id, goal_id, assignment_id, employee_id]
  );
  return res.rows[0];
}

async function saveDraftAnswers(submissionId, answers) {
  const client = await require('../../config/db').getPool().connect();
  try {
    await client.query('BEGIN');

    for (const ans of answers) {
      await client.query(
        `INSERT INTO self_assessment_answers (
          submission_id, template_id, answer, employee_rating, employee_comment, weight
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (submission_id, template_id) 
        DO UPDATE SET 
          answer = EXCLUDED.answer,
          employee_rating = EXCLUDED.employee_rating,
          employee_comment = EXCLUDED.employee_comment,
          weight = EXCLUDED.weight,
          updated_at = NOW()`,
        [
          submissionId, ans.template_id, ans.answer || null, 
          ans.employee_rating !== undefined ? ans.employee_rating : null,
          ans.employee_comment || null, ans.weight || 0.00
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

async function submitAssessment(submissionId, employeeComments, score) {
  const res = await query(
    `UPDATE self_assessment_submissions 
     SET status = 'SUBMITTED', submitted_at = NOW(), overall_employee_score = $1, employee_comments = $2, updated_at = NOW()
     WHERE submission_id = $3
     RETURNING *`,
    [score, employeeComments, submissionId]
  );
  return res.rows[0];
}

async function saveManagerAnswers(submissionId, answers) {
  const client = await require('../../config/db').getPool().connect();
  try {
    await client.query('BEGIN');

    for (const ans of answers) {
      await client.query(
        `UPDATE self_assessment_answers 
         SET 
           manager_rating = $1, 
           manager_comment = $2, 
           weighted_score = $3,
           updated_at = NOW()
         WHERE submission_id = $4 AND template_id = $5`,
        [
          ans.manager_rating !== undefined ? ans.manager_rating : null,
          ans.manager_comment || null,
          ans.weighted_score !== undefined ? ans.weighted_score : null,
          submissionId, ans.template_id
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

async function reviewAssessment(submissionId, { status, managerComments, managerScore, finalScore, reviewerId }) {
  const res = await query(
    `UPDATE self_assessment_submissions 
     SET status = $1, reviewed_at = NOW(), reviewed_by = $2, overall_manager_score = $3, final_score = $4, manager_comments = $5, updated_at = NOW()
     WHERE submission_id = $6
     RETURNING *`,
    [status, reviewerId, managerScore, finalScore, managerComments, submissionId]
  );
  return res.rows[0];
}

async function acknowledgeAssessment(submissionId) {
  const res = await query(
    `UPDATE self_assessment_submissions 
     SET employee_acknowledged = TRUE, acknowledged_at = NOW(), updated_at = NOW()
     WHERE submission_id = $1
     RETURNING *`,
    [submissionId]
  );
  return res.rows[0];
}

async function getAnswersForSubmission(submissionId) {
  const res = await query(
    `SELECT 
      a.*,
      t.question,
      t.question_type,
      t.options_json,
      t.required
     FROM self_assessment_answers a
     JOIN self_assessment_templates t ON t.template_id = a.template_id
     WHERE a.submission_id = $1
     ORDER BY t.display_order ASC`,
    [submissionId]
  );
  return res.rows;
}

async function createAttachment({ organization_id, answer_id, file_name, original_name, file_type, file_size, storage_path }) {
  const res = await query(
    `INSERT INTO self_assessment_attachments (
      organization_id, answer_id, file_name, original_name, file_type, file_size, storage_path
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [organization_id, answer_id, file_name, original_name, file_type, file_size, storage_path]
  );
  return res.rows[0];
}

async function updateAttachmentStatus(attachmentId, orgId, status, managerFeedback) {
  const res = await query(
    `UPDATE self_assessment_attachments 
     SET verification_status = $1, manager_feedback = $2
     WHERE attachment_id = $3 AND organization_id = $4
     RETURNING *`,
    [status, managerFeedback, attachmentId, orgId]
  );
  return res.rows[0] || null;
}

async function getAttachmentsForSubmission(submissionId) {
  const res = await query(
    `SELECT att.*, ans.template_id 
     FROM self_assessment_attachments att
     JOIN self_assessment_answers ans ON ans.answer_id = att.answer_id
     WHERE ans.submission_id = $1`,
    [submissionId]
  );
  return res.rows;
}

module.exports = {
  isTemplateLocked,
  getSelfAssessmentTemplate,
  saveSelfAssessmentTemplate,
  getSubmissionByAssignmentId,
  createSubmission,
  saveDraftAnswers,
  submitAssessment,
  saveManagerAnswers,
  reviewAssessment,
  acknowledgeAssessment,
  getAnswersForSubmission,
  createAttachment,
  updateAttachmentStatus,
  getAttachmentsForSubmission,
  getSummaryReport,
  getComparisonReport
};

async function getSummaryReport(orgId, filters) {
  let sql = `
    SELECT 
      sub.submission_id,
      COALESCE(sub.status, 'PENDING') AS status,
      sub.submitted_at,
      sub.reviewed_at,
      sub.reviewed_by,
      sub.overall_employee_score,
      sub.overall_manager_score,
      sub.final_score,
      sub.employee_comments,
      sub.manager_comments,
      sub.employee_acknowledged,
      sub.acknowledged_at,
      ga.assignment_id,
      ga.employee_id,
      ga.goal_id,
      ga.organization_id,
      TRIM(CONCAT(e.first_name, ' ', e.last_name)) AS employee_name,
      TRIM(CONCAT(e.first_name, ' ', e.last_name)) AS assigned_to_employee_name,
      d.name AS department_name,
      d.name AS assigned_to_department_name,
      fy.name AS cycle_name,
      TRIM(CONCAT(m.first_name, ' ', m.last_name)) AS manager_name,
      g.description,
      g.goal_type,
      g.goal_code,
      g.start_date,
      g.due_date,
      g.weight,
      g.progress,
      g.priority,
      g.visibility,
      g.status AS goal_status,
      COALESCE(g.performance_technique, 'KPI') AS performance_technique,
      gc.name AS goal_category_name,
      COALESCE(NULLIF(CONCAT(cue.first_name, ' ', cue.last_name), ' '), cu.email) AS created_by_name,
      COALESCE(NULLIF(CONCAT(aue.first_name, ' ', aue.last_name), ' '), au.email) AS approved_by_name,
      COALESCE(NULLIF(CONCAT(asge.first_name, ' ', asge.last_name), ' '), asg.email) AS assigned_by_name
    FROM goal_assignments ga
    JOIN employees e ON e.employee_id = ga.employee_id
    LEFT JOIN departments d ON d.department_id = e.department_id
    JOIN goals g ON g.goal_id = ga.goal_id
    LEFT JOIN goal_categories gc ON g.goal_category_id = gc.category_id
    LEFT JOIN financial_years fy ON fy.financial_year_id = g.financial_year_id
    LEFT JOIN employees m ON m.employee_id = e.manager_employee_id
    LEFT JOIN users cu ON g.created_by = cu.user_id
    LEFT JOIN employees cue ON cu.employee_id = cue.employee_id
    LEFT JOIN users au ON g.approved_by = au.user_id
    LEFT JOIN employees aue ON au.employee_id = aue.employee_id
    LEFT JOIN users asg ON g.assigned_by = asg.user_id
    LEFT JOIN employees asge ON asg.employee_id = asge.employee_id
    LEFT JOIN self_assessment_submissions sub ON sub.assignment_id = ga.assignment_id
    WHERE ga.organization_id = $1 AND g.performance_technique = 'SELF_ASSESSMENT'
  `;
  
  const params = [orgId];
  let idx = 2;

  if (filters.cycle_id) {
    sql += ` AND g.financial_year_id = $${idx++}`;
    params.push(filters.cycle_id);
  }
  if (filters.department_id) {
    sql += ` AND e.department_id = $${idx++}`;
    params.push(filters.department_id);
  }
  if (filters.manager_employee_id) {
    sql += ` AND e.manager_employee_id = $${idx++}`;
    params.push(filters.manager_employee_id);
  }
  if (filters.employee_id) {
    sql += ` AND ga.employee_id = $${idx++}`;
    params.push(filters.employee_id);
  }
  if (filters.status) {
    sql += ` AND COALESCE(sub.status, 'PENDING') = $${idx++}`;
    params.push(filters.status);
  }

  sql += ` ORDER BY sub.created_at DESC NULLS LAST, ga.created_at DESC`;

  const res = await query(sql, params);
  return res.rows;
}

async function getComparisonReport(orgId, filters) {
  let sql = `
    SELECT 
      ans.answer_id,
      ans.employee_rating,
      ans.manager_rating,
      t.question,
      t.question_type,
      sub.submission_id,
      TRIM(CONCAT(e.first_name, ' ', e.last_name)) AS employee_name,
      d.name AS department_name
    FROM self_assessment_answers ans
    JOIN self_assessment_submissions sub ON sub.submission_id = ans.submission_id
    JOIN self_assessment_templates t ON t.template_id = ans.template_id
    JOIN employees e ON e.employee_id = sub.employee_id
    LEFT JOIN departments d ON d.department_id = e.department_id
    JOIN goals g ON g.goal_id = sub.goal_id
    WHERE sub.organization_id = $1
  `;
  
  const params = [orgId];
  let idx = 2;

  if (filters.cycle_id) {
    sql += ` AND g.financial_year_id = $${idx++}`;
    params.push(filters.cycle_id);
  }
  if (filters.department_id) {
    sql += ` AND e.department_id = $${idx++}`;
    params.push(filters.department_id);
  }
  if (filters.employee_id) {
    sql += ` AND sub.employee_id = $${idx++}`;
    params.push(filters.employee_id);
  }

  const res = await query(sql, params);
  return res.rows;
}
