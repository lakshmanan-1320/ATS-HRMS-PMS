const { query, withTransaction } = require('../../config/db');

async function findGoalById(goalId) {
  const res = await query('SELECT * FROM goals WHERE goal_id = $1', [goalId]);
  return res.rows[0] || null;
}

async function findPendingCompletionRequest(goalId) {
  const res = await query(
    `SELECT * FROM goal_completion_requests 
     WHERE goal_id = $1 AND status = 'PENDING' 
     ORDER BY created_at DESC LIMIT 1`,
    [goalId]
  );
  return res.rows[0] || null;
}

async function findCompletionRequestById(requestId) {
  const res = await query(
    `SELECT gcr.*, g.title AS goal_title, e.first_name, e.last_name, e.employee_code, e.email AS employee_email
     FROM goal_completion_requests gcr
     JOIN goals g ON g.goal_id = gcr.goal_id
     JOIN employees e ON e.employee_id = gcr.employee_id
     WHERE gcr.goal_completion_request_id = $1`,
    [requestId]
  );
  return res.rows[0] || null;
}

async function createCompletionRequest(data, txClient = null) {
  const run = txClient || { query };
  const { organization_id, goal_id, employee_id, completion_comments, completion_date } = data;

  const res = await run.query(
    `INSERT INTO goal_completion_requests (
      organization_id, goal_id, employee_id, completion_comments, completion_date, status
    ) VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), 'PENDING')
    RETURNING *`,
    [organization_id, goal_id, employee_id, completion_comments, completion_date || null]
  );
  return res.rows[0];
}

async function createAttachments(requestId, files, txClient = null) {
  const run = txClient || { query };
  const inserted = [];

  for (const f of files) {
    const res = await run.query(
      `INSERT INTO goal_completion_attachments (
        goal_completion_request_id, file_name, original_name, file_type, file_size, storage_path
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [requestId, f.filename, f.originalname, f.mimetype, f.size, f.path]
    );
    inserted.push(res.rows[0]);
  }
  return inserted;
}

async function createLinks(requestId, links, txClient = null) {
  const run = txClient || { query };
  const inserted = [];

  for (const l of links) {
    if (!l.url || !l.url.trim()) continue;
    const res = await run.query(
      `INSERT INTO goal_completion_links (
        goal_completion_request_id, title, url
      ) VALUES ($1, $2, $3)
      RETURNING *`,
      [requestId, l.title ? l.title.trim() : null, l.url.trim()]
    );
    inserted.push(res.rows[0]);
  }
  return inserted;
}

async function updateGoalStatus(goalId, status, extraFields = {}, txClient = null) {
  const run = txClient || { query };

  if (status === 'completed') {
    const res = await run.query(
      `UPDATE goals 
       SET status = 'completed', progress = 100.00, approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE goal_id = $2 RETURNING *`,
      [extraFields.approved_by || null, goalId]
    );
    return res.rows[0];
  } else if (status === 'in_progress') {
    const res = await run.query(
      `UPDATE goals 
       SET status = 'in_progress', rejected_by = $1, rejected_at = NOW(), rejection_reason = $2, updated_at = NOW()
       WHERE goal_id = $3 RETURNING *`,
      [extraFields.rejected_by || null, extraFields.rejection_reason || null, goalId]
    );
    return res.rows[0];
  } else {
    const res = await run.query(
      `UPDATE goals 
       SET status = $1, updated_at = NOW()
       WHERE goal_id = $2 RETURNING *`,
      [status, goalId]
    );
    return res.rows[0];
  }
}

async function getEmployeeCompletionRequests(employeeId, orgId) {
  const res = await query(
    `SELECT gcr.*, g.title AS goal_title, g.description AS goal_description, g.due_date,
            COALESCE(
              (SELECT json_agg(gca.*) FROM goal_completion_attachments gca WHERE gca.goal_completion_request_id = gcr.goal_completion_request_id), '[]'::json
            ) AS attachments,
            COALESCE(
              (SELECT json_agg(gcl.*) FROM goal_completion_links gcl WHERE gcl.goal_completion_request_id = gcr.goal_completion_request_id), '[]'::json
            ) AS links
     FROM goal_completion_requests gcr
     JOIN goals g ON g.goal_id = gcr.goal_id
     WHERE gcr.employee_id = $1 AND gcr.organization_id = $2
     ORDER BY gcr.created_at DESC`,
    [employeeId, orgId]
  );
  return res.rows;
}

async function getManagerCompletionRequests(managerEmployeeId, orgId, filters = {}) {
  const conditions = ['gcr.organization_id = $1'];
  const params = [orgId];
  let paramIdx = 2;

  if (managerEmployeeId) {
    conditions.push(`e.manager_employee_id = $${paramIdx++}`);
    params.push(managerEmployeeId);
  }

  if (filters.status) {
    conditions.push(`gcr.status = $${paramIdx++}`);
    params.push(filters.status.toUpperCase());
  }

  if (filters.employee_id) {
    conditions.push(`gcr.employee_id = $${paramIdx++}`);
    params.push(filters.employee_id);
  }

  if (filters.goal_id) {
    conditions.push(`gcr.goal_id = $${paramIdx++}`);
    params.push(filters.goal_id);
  }

  if (filters.date) {
    conditions.push(`gcr.completion_date = $${paramIdx++}::date`);
    params.push(filters.date);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const res = await query(
    `SELECT gcr.*, 
            g.title AS goal_title, g.description AS goal_description, g.due_date AS goal_due_date,
            e.first_name, e.last_name, e.employee_code, e.email AS employee_email,
            u.email AS approved_by_email,
            COALESCE(
              (SELECT json_agg(gca.*) FROM goal_completion_attachments gca WHERE gca.goal_completion_request_id = gcr.goal_completion_request_id), '[]'::json
            ) AS attachments,
            COALESCE(
              (SELECT json_agg(gcl.*) FROM goal_completion_links gcl WHERE gcl.goal_completion_request_id = gcr.goal_completion_request_id), '[]'::json
            ) AS links
     FROM goal_completion_requests gcr
     JOIN goals g ON g.goal_id = gcr.goal_id
     JOIN employees e ON e.employee_id = gcr.employee_id
     LEFT JOIN users u ON u.user_id = gcr.approved_by
     ${whereClause}
     ORDER BY gcr.created_at DESC`,
    params
  );
  return res.rows;
}

async function approveCompletionRequest(requestId, approverUserId, txClient = null) {
  const run = txClient || { query };
  const res = await run.query(
    `UPDATE goal_completion_requests
     SET status = 'APPROVED', approved_by = $1, approved_at = NOW(), updated_at = NOW()
     WHERE goal_completion_request_id = $2
     RETURNING *`,
    [approverUserId, requestId]
  );
  return res.rows[0] || null;
}

async function rejectCompletionRequest(requestId, remarks, approverUserId, txClient = null) {
  const run = txClient || { query };
  const res = await run.query(
    `UPDATE goal_completion_requests
     SET status = 'REJECTED', manager_remarks = $1, approved_by = $2, approved_at = NOW(), updated_at = NOW()
     WHERE goal_completion_request_id = $3
     RETURNING *`,
    [remarks, approverUserId, requestId]
  );
  return res.rows[0] || null;
}

async function getGoalCompletionHistory(goalId) {
  const res = await query(
    `SELECT gcr.*,
            e.first_name AS employee_first_name, e.last_name AS employee_last_name, e.employee_code,
            u.email AS reviewer_email,
            COALESCE(
              (SELECT json_agg(gca.*) FROM goal_completion_attachments gca WHERE gca.goal_completion_request_id = gcr.goal_completion_request_id), '[]'::json
            ) AS attachments,
            COALESCE(
              (SELECT json_agg(gcl.*) FROM goal_completion_links gcl WHERE gcl.goal_completion_request_id = gcr.goal_completion_request_id), '[]'::json
            ) AS links
     FROM goal_completion_requests gcr
     JOIN employees e ON e.employee_id = gcr.employee_id
     LEFT JOIN users u ON u.user_id = gcr.approved_by
     WHERE gcr.goal_id = $1
     ORDER BY gcr.created_at DESC`,
    [goalId]
  );
  return res.rows;
}

module.exports = {
  findGoalById,
  findPendingCompletionRequest,
  findCompletionRequestById,
  createCompletionRequest,
  createAttachments,
  createLinks,
  updateGoalStatus,
  getEmployeeCompletionRequests,
  getManagerCompletionRequests,
  approveCompletionRequest,
  rejectCompletionRequest,
  getGoalCompletionHistory,
};
