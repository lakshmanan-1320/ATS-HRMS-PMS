const service = require('./goalCompletion.service');
const { STATUS_CODES } = require('../../constants/statusCodes');
const { logAudit } = require('../../utils/auditLog');

async function handleSubmitCompletion(req, res, next) {
  try {
    const goalId = req.params.goalId;
    const employeeId = req.user.employeeId;
    const orgId = req.user.organizationId;

    const data = await service.submitCompletion(employeeId, orgId, goalId, req.body, req.files || []);

    logAudit({
      actorId: req.user.id || req.user.userId,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'goal_completion_submitted',
      target: `Goal ${goalId}`,
      metadata: { requestId: data.goal_completion_request_id, filesCount: (req.files || []).length },
      ip: req.ip
    });

    res.status(STATUS_CODES.CREATED).json({
      message: 'Goal completion request submitted successfully and is pending manager verification.',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function handleGetMyCompletionRequests(req, res, next) {
  try {
    const employeeId = req.user.employeeId;
    const orgId = req.user.organizationId;

    const data = await service.getMyCompletionRequests(employeeId, orgId);
    res.status(STATUS_CODES.OK).json(data);
  } catch (err) {
    next(err);
  }
}

async function handleGetManagerCompletionRequests(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const managerEmployeeId = req.user.role === 'client_admin' ? null : req.user.employeeId;

    const filters = {
      status: req.query.status,
      employee_id: req.query.employee_id,
      goal_id: req.query.goal_id,
      date: req.query.date
    };

    const data = await service.getManagerCompletionRequests(managerEmployeeId, orgId, filters);
    res.status(STATUS_CODES.OK).json(data);
  } catch (err) {
    next(err);
  }
}

async function handleApproveCompletionRequest(req, res, next) {
  try {
    const requestId = req.params.requestId || req.params.id;
    const data = await service.approveCompletionRequest(requestId, req.user);

    logAudit({
      actorId: req.user.id || req.user.userId,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'goal_completion_approved',
      target: `Completion Request ${requestId}`,
      ip: req.ip
    });

    res.status(STATUS_CODES.OK).json({
      message: 'Goal completion request approved and goal marked as COMPLETED.',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function handleRejectCompletionRequest(req, res, next) {
  try {
    const requestId = req.params.requestId || req.params.id;
    const remarks = req.body.remarks || req.body.manager_remarks;

    const data = await service.rejectCompletionRequest(requestId, remarks, req.user);

    logAudit({
      actorId: req.user.id || req.user.userId,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'goal_completion_rejected',
      target: `Completion Request ${requestId}`,
      metadata: { remarks },
      ip: req.ip
    });

    res.status(STATUS_CODES.OK).json({
      message: 'Goal completion request rejected and goal returned to IN_PROGRESS.',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function handleGetGoalCompletionHistory(req, res, next) {
  try {
    const goalId = req.params.goalId;
    const data = await service.getGoalCompletionHistory(goalId);
    res.status(STATUS_CODES.OK).json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleSubmitCompletion,
  handleGetMyCompletionRequests,
  handleGetManagerCompletionRequests,
  handleApproveCompletionRequest,
  handleRejectCompletionRequest,
  handleGetGoalCompletionHistory,
};
