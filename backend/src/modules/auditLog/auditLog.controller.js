const service = require('./auditLog.service');

async function handleGetAuditLogs(req, res, next) {
  try {
    const {
      organizationId,
      module: moduleName,
      actor: actorUserId,
      role: actorRole,
      action: actionName,
      startDate,
      endDate,
      search,
      limit,
      offset
    } = req.query;

    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    const result = await service.getAuditLogs({
      organizationId,
      moduleName,
      actorUserId,
      actorRole,
      actionName,
      startDate,
      endDate,
      search,
      limit: parsedLimit,
      offset: parsedOffset
    }, req.user);

    return res.status(200).json({
      success: true,
      data: result.data,
      total: result.total
    });
  } catch (err) {
    next(err);
  }
}

async function handleGetAuditLogById(req, res, next) {
  try {
    const { auditLogId } = req.params;
    const log = await service.getAuditLogDetails(auditLogId, req.user);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: log
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleGetAuditLogs,
  handleGetAuditLogById
};
