const db = require('../../config/db');

async function insertAuditLog(logData) {
  const queryText = `
    INSERT INTO audit_logs (
      organization_id, actor_user_id, actor_employee_id, actor_name, actor_email, actor_role,
      module_name, action_name, entity_name, entity_id, entity_display_name, old_data, new_data,
      ip_address, user_agent, browser_name, operating_system, device_type,
      request_url, http_method, request_status, response_status_code, request_id,
      session_id, execution_time_ms, success
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
    ) RETURNING audit_log_id
  `;

  const values = [
    logData.organizationId,
    logData.actorUserId,
    logData.actorEmployeeId || null,
    logData.actorName,
    logData.actorEmail,
    logData.actorRole,
    logData.moduleName,
    logData.actionName,
    logData.entityName,
    logData.entityId || null,
    logData.entityDisplayName || null,
    logData.oldData ? JSON.stringify(logData.oldData) : null,
    logData.newData ? JSON.stringify(logData.newData) : null,
    logData.ipAddress || null,
    logData.userAgent || null,
    logData.browserName || null,
    logData.operatingSystem || null,
    logData.deviceType || null,
    logData.requestUrl || null,
    logData.httpMethod || null,
    logData.requestStatus || null,
    logData.responseStatusCode || null,
    logData.requestId || null,
    logData.sessionId || null,
    logData.executionTimeMs || null,
    logData.success !== undefined ? logData.success : true
  ];

  const res = await db.query(queryText, values);
  return res.rows[0].audit_log_id;
}

async function findAuditLogs({ organizationId, moduleName, actorUserId, actorRole, actionName, startDate, endDate, search, limit = 50, offset = 0 } = {}) {
  const whereClauses = [];
  const values = [];

  if (organizationId) {
    values.push(organizationId);
    whereClauses.push(`organization_id = $${values.length}`);
  }

  if (moduleName) {
    values.push(moduleName);
    whereClauses.push(`module_name = $${values.length}`);
  }

  if (actorUserId) {
    values.push(actorUserId);
    whereClauses.push(`actor_user_id = $${values.length}`);
  }

  if (actorRole) {
    values.push(actorRole);
    whereClauses.push(`actor_role = $${values.length}`);
  }

  if (actionName) {
    values.push(actionName);
    whereClauses.push(`action_name = $${values.length}`);
  }

  if (startDate) {
    values.push(startDate);
    whereClauses.push(`created_at >= $${values.length}::timestamptz`);
  }

  if (endDate) {
    values.push(endDate);
    whereClauses.push(`created_at <= $${values.length}::timestamptz`);
  }

  if (search) {
    values.push(`%${search}%`);
    const idx = values.length;
    whereClauses.push(`(actor_name ILIKE $${idx} OR actor_email ILIKE $${idx} OR action_name ILIKE $${idx} OR entity_name ILIKE $${idx})`);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  
  // Get count
  const countRes = await db.query(`SELECT COUNT(*) FROM audit_logs ${whereStr}`, values);
  const total = parseInt(countRes.rows[0].count, 10);

  // Get data
  values.push(limit);
  const limitIdx = values.length;
  values.push(offset);
  const offsetIdx = values.length;

  const dataRes = await db.query(`
    SELECT * FROM audit_logs
    ${whereStr}
    ORDER BY created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `, values);

  return {
    total,
    data: dataRes.rows
  };
}

async function findAuditLogById(auditLogId, organizationId = null) {
  let queryText = 'SELECT * FROM audit_logs WHERE audit_log_id = $1';
  const values = [auditLogId];

  if (organizationId) {
    queryText += ' AND organization_id = $2';
    values.push(organizationId);
  }

  const res = await db.query(queryText, values);
  return res.rows[0] || null;
}

module.exports = {
  insertAuditLog,
  findAuditLogs,
  findAuditLogById
};
