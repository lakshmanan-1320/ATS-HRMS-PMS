const db = require('../../config/db');
const repository = require('./auditLog.repository');

/**
 * Fire-and-forget Centralized Audit Logging Service.
 * Never throws — logging errors must never disrupt the main business transaction.
 */
async function logActivity({
  organizationId,
  actorUserId,
  actorEmployeeId,
  actorName,
  actorEmail,
  actorRole,
  moduleName,
  actionName,
  entityName,
  entityId,
  entityDisplayName,
  oldData,
  newData,
  reqContext
} = {}) {
  try {
    // If request context middleware was passed, automatically extract metadata
    const ipAddress = reqContext?.ipAddress || null;
    const userAgent = reqContext?.userAgent || null;
    const browserName = reqContext?.browserName || null;
    const operatingSystem = reqContext?.operatingSystem || null;
    const deviceType = reqContext?.deviceType || null;
    const requestUrl = reqContext?.requestUrl || null;
    const httpMethod = reqContext?.httpMethod || null;
    const requestId = reqContext?.requestId || null;
    const sessionId = reqContext?.sessionId || null;

    let executionTimeMs = null;
    if (reqContext?.startTime) {
      executionTimeMs = Date.now() - reqContext.startTime;
    }

    // Resolve tenant organizationId from actor if missing
    let resolvedOrgId = organizationId || reqContext?.organizationId || null;
    if (!resolvedOrgId && (actorUserId || reqContext?.actorUserId)) {
      const uId = actorUserId || reqContext?.actorUserId;
      const userRes = await db.query(
        'SELECT organization_id FROM users WHERE user_id = $1 OR employee_id = $2 LIMIT 1',
        [uId, uId]
      );
      if (userRes.rows.length > 0) {
        resolvedOrgId = userRes.rows[0].organization_id;
      }
    }

    // Resolve actor details from context if missing
    const resolvedActorUserId = actorUserId || reqContext?.actorUserId || null;
    const resolvedActorEmployeeId = actorEmployeeId || reqContext?.actorEmployeeId || null;
    const resolvedActorEmail = actorEmail || reqContext?.actorEmail || null;
    const resolvedActorRole = actorRole || reqContext?.actorRole || null;

    let resolvedActorName = actorName || null;
    
    // Resolve actor name from database if missing
    if (!resolvedActorName) {
      if (resolvedActorEmployeeId) {
        const empRes = await db.query(
          'SELECT first_name, last_name FROM employees WHERE employee_id = $1',
          [resolvedActorEmployeeId]
        );
        if (empRes.rows.length > 0) {
          resolvedActorName = `${empRes.rows[0].first_name} ${empRes.rows[0].last_name}`.trim();
        }
      }
      if (!resolvedActorName && resolvedActorEmail && resolvedActorRole === 'client_admin') {
        const adminRes = await db.query(
          'SELECT full_name FROM client_admins WHERE email = $1 LIMIT 1',
          [resolvedActorEmail]
        );
        if (adminRes.rows.length > 0) {
          resolvedActorName = adminRes.rows[0].full_name;
        }
      }
      if (!resolvedActorName && resolvedActorEmail) {
        resolvedActorName = resolvedActorEmail.split('@')[0];
      }
      if (!resolvedActorName) {
        resolvedActorName = 'System / Unknown';
      }
    }

    // Determine request status and success boolean
    const requestStatus = reqContext?.responseStatusCode
      ? (reqContext.responseStatusCode >= 400 ? 'FAILED' : 'SUCCESS')
      : 'SUCCESS';
    const responseStatusCode = reqContext?.responseStatusCode || 200;
    const success = responseStatusCode >= 200 && responseStatusCode < 400;

    // Assemble final log record
    const logRecord = {
      organizationId: resolvedOrgId || '00000000-0000-0000-0000-000000000000', // fallback uuid if superadmin/global
      actorUserId: resolvedActorUserId || '00000000-0000-0000-0000-000000000000',
      actorEmployeeId: resolvedActorEmployeeId,
      actorName: resolvedActorName,
      actorEmail: resolvedActorEmail || 'system@insight.local',
      actorRole: resolvedActorRole || 'system',
      moduleName,
      actionName,
      entityName,
      entityId,
      entityDisplayName: entityDisplayName || null,
      oldData,
      newData,
      ipAddress,
      userAgent,
      browserName,
      operatingSystem,
      deviceType,
      requestUrl,
      httpMethod,
      requestStatus,
      responseStatusCode,
      requestId,
      sessionId,
      executionTimeMs,
      success
    };

    const insertedId = await repository.insertAuditLog(logRecord);
    return insertedId;
  } catch (err) {
    console.error('[AuditLogService] Logging failed:', err.message);
  }
}

async function getAuditLogs(filters, requestUser) {
  const isSuperAdmin = requestUser.role === 'super_admin';
  const orgId = isSuperAdmin ? filters.organizationId : requestUser.organizationId;

  // Log the audit log retrieval list action itself for strict security auditing
  await logActivity({
    organizationId: requestUser.organizationId,
    actorUserId: requestUser.id,
    actorEmployeeId: requestUser.employeeId,
    actorEmail: requestUser.email,
    actorRole: requestUser.role,
    moduleName: 'audit_logs',
    actionName: 'audit_logs_listed',
    entityName: 'audit_logs',
    entityId: null
  });

  return repository.findAuditLogs({
    ...filters,
    organizationId: orgId
  });
}

async function getAuditLogDetails(auditLogId, requestUser) {
  const orgId = requestUser.role === 'super_admin' ? null : requestUser.organizationId;
  const log = await repository.findAuditLogById(auditLogId, orgId);

  if (log) {
    // Log individual audit log details viewing for strict security auditing
    await logActivity({
      organizationId: requestUser.organizationId,
      actorUserId: requestUser.id,
      actorEmployeeId: requestUser.employeeId,
      actorEmail: requestUser.email,
      actorRole: requestUser.role,
      moduleName: 'audit_logs',
      actionName: 'audit_log_viewed',
      entityName: 'audit_logs',
      entityId: auditLogId
    });
  }

  return log;
}

module.exports = {
  logActivity,
  getAuditLogs,
  getAuditLogDetails
};
