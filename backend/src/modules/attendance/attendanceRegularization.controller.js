const service = require('./attendanceRegularization.service');
const { STATUS_CODES } = require('../../constants/statusCodes');
const { logAudit } = require('../../utils/auditLog');

async function handleGetSettings(req, res, next) {
  try {
    const settings = await service.getSettings(req.user.organizationId);
    res.status(STATUS_CODES.OK).json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
}

async function handleUpdateSettings(req, res, next) {
  try {
    const settings = await service.updateSettings(req.user.organizationId, req.body);
    logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'attendance_regularization_settings_updated',
      target: req.user.organizationId,
      metadata: { body: req.body },
      ip: req.ip
    });
    res.status(STATUS_CODES.OK).json({ success: true, message: 'Regularization settings updated successfully.', data: settings });
  } catch (err) {
    next(err);
  }
}

async function handleCreateRequest(req, res, next) {
  try {
    const request = await service.createRequest(req.user.id, req.user.organizationId, req.body);
    logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'attendance_regularization_requested',
      target: request.regularization_request_id,
      metadata: { date: data => req.body.attendance_date, type: req.body.request_type },
      ip: req.ip
    });
    res.status(STATUS_CODES.CREATED).json({ success: true, message: 'Regularization request submitted successfully.', data: request });
  } catch (err) {
    next(err);
  }
}

async function handleGetMyRequests(req, res, next) {
  try {
    const list = await service.getMyRequests(req.user.id);
    res.status(STATUS_CODES.OK).json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
}

async function handleCancelRequest(req, res, next) {
  const { id } = req.params;
  try {
    const request = await service.cancelRequest(req.user.id, id);
    logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'attendance_regularization_cancelled',
      target: id,
      ip: req.ip
    });
    res.status(STATUS_CODES.OK).json({ success: true, message: 'Regularization request cancelled successfully.', data: request });
  } catch (err) {
    next(err);
  }
}

async function handleGetPendingRequests(req, res, next) {
  try {
    const list = await service.getPendingRequests(req.user.id);
    res.status(STATUS_CODES.OK).json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
}

async function handleApproveRequest(req, res, next) {
  const { id } = req.params;
  const { remarks } = req.body;
  try {
    const request = await service.approveRequest(req.user.id, id, remarks);
    logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'attendance_regularization_approved',
      target: id,
      metadata: { remarks },
      ip: req.ip
    });
    res.status(STATUS_CODES.OK).json({ success: true, message: 'Regularization request approved successfully.', data: request });
  } catch (err) {
    next(err);
  }
}

async function handleRejectRequest(req, res, next) {
  const { id } = req.params;
  const { remarks } = req.body;
  try {
    const request = await service.rejectRequest(req.user.id, id, remarks);
    logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'attendance_regularization_rejected',
      target: id,
      metadata: { remarks },
      ip: req.ip
    });
    res.status(STATUS_CODES.OK).json({ success: true, message: 'Regularization request rejected successfully.', data: request });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleGetSettings,
  handleUpdateSettings,
  handleCreateRequest,
  handleGetMyRequests,
  handleCancelRequest,
  handleGetPendingRequests,
  handleApproveRequest,
  handleRejectRequest
};
