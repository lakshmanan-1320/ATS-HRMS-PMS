const service = require('./regularization.service');
const { STATUS_CODES } = require('../../constants/statusCodes');

async function handleGetSettings(req, res, next) {
  try {
    const data = await service.getSystemSettings();
    res.status(STATUS_CODES.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleUpdateSettings(req, res, next) {
  try {
    const data = await service.updateSystemSettings(req.validatedBody, req.user.id);
    res.status(STATUS_CODES.OK).json({ success: true, message: 'Settings updated successfully.', data });
  } catch (err) {
    next(err);
  }
}

async function handleCreateRequest(req, res, next) {
  try {
    if (!req.user.employeeId) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ message: 'Only employees can submit regularization requests.' });
    }
    const data = await service.createRequest(req.user.employeeId, req.validatedBody);
    res.status(STATUS_CODES.CREATED).json({ success: true, message: 'Regularization request submitted successfully.', data });
  } catch (err) {
    next(err);
  }
}

async function handleGetMyRequests(req, res, next) {
  try {
    if (!req.user.employeeId) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ message: 'Only employees have personal regularization history.' });
    }
    const data = await service.listEmployeeRequests(req.user.employeeId);
    res.status(STATUS_CODES.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleGetRequestById(req, res, next) {
  const { id } = req.params;
  try {
    const data = await service.getRequestById(id, req.user.employeeId || null, req.user.role);
    res.status(STATUS_CODES.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleGetManagerRequests(req, res, next) {
  try {
    if (!req.user.employeeId) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ message: 'Only employees can review requests as managers.' });
    }
    const data = await service.listManagerRequests(req.user.employeeId);
    res.status(STATUS_CODES.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleApproveRequest(req, res, next) {
  const { id } = req.params;
  try {
    if (!req.user.employeeId) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ message: 'Only employees can review requests as managers.' });
    }
    const data = await service.approveRequest(id, req.user.employeeId);
    res.status(STATUS_CODES.OK).json({ success: true, message: 'Regularization request approved.', data });
  } catch (err) {
    next(err);
  }
}

async function handleRejectRequest(req, res, next) {
  const { id } = req.params;
  const { rejection_reason } = req.body;
  try {
    if (!req.user.employeeId) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ message: 'Only employees can review requests as managers.' });
    }
    const data = await service.rejectRequest(id, req.user.employeeId, rejection_reason);
    res.status(STATUS_CODES.OK).json({ success: true, message: 'Regularization request rejected.', data });
  } catch (err) {
    next(err);
  }
}

async function handleGetAllRequests(req, res, next) {
  try {
    const data = await service.listAllRequests({ ...req.query, organizationId: req.user.organizationId });
    res.status(STATUS_CODES.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleAdminApproveRequest(req, res, next) {
  const { id } = req.params;
  try {
    const data = await service.adminApproveRequest(id, req.user.organizationId);
    res.status(STATUS_CODES.OK).json({ success: true, message: 'Regularization approved by admin.', data });
  } catch (err) {
    next(err);
  }
}

async function handleAdminRejectRequest(req, res, next) {
  const { id } = req.params;
  const { rejection_reason } = req.body;
  try {
    const data = await service.adminRejectRequest(id, rejection_reason, req.user.organizationId);
    res.status(STATUS_CODES.OK).json({ success: true, message: 'Regularization rejected by admin.', data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleGetSettings,
  handleUpdateSettings,
  handleCreateRequest,
  handleGetMyRequests,
  handleGetRequestById,
  handleGetManagerRequests,
  handleApproveRequest,
  handleRejectRequest,
  handleGetAllRequests,
  handleAdminApproveRequest,
  handleAdminRejectRequest
};
