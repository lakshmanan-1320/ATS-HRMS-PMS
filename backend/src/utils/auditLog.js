const { logActivity } = require('../modules/auditLog/auditLog.service');

async function logAudit(payload = {}) {
  // Map legacy properties to new centralized payload schema
  return logActivity({
    organizationId: payload.organizationId,
    actorUserId: payload.actorId,
    actorEmail: payload.actorEmail,
    actorRole: payload.actorRole,
    actionName: payload.action,
    moduleName: payload.module || 'system',
    entityName: payload.target || 'general',
    entityId: payload.entityId,
    oldData: payload.metadata?.oldData || payload.metadata || null,
    newData: payload.metadata?.newData || null,
    reqContext: {
      ipAddress: payload.ip,
      userAgent: payload.userAgent,
      browserName: payload.browser,
      operatingSystem: payload.operatingSystem,
      deviceType: payload.device,
      requestUrl: payload.requestUrl,
      httpMethod: payload.httpMethod,
      responseStatusCode: payload.responseStatusCode || 200,
    }
  });
}

module.exports = { logAudit };
