const service = require('./goal.service');
const validator = require('./goal.validator');
const { STATUS_CODES } = require('../../constants/statusCodes');
const { logAudit } = require('../../utils/auditLog');
const ApiError = require('../../utils/apiError');

// For a department goal, only managers from the same department can review employees.
async function handleList(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    const isEmployee = req.user.role === 'employee';
    const isMyGoals = req.query.is_my_goals === 'true' || isEmployee;

    const filters = {
      goal_type: req.query.goal_type || undefined,
      status: req.query.status || undefined,
      priority: req.query.priority || undefined,
      category: req.query.category || undefined,
      employee_id: req.query.employee_id || undefined,
      manager_id: req.query.manager_id || undefined,
      department_id: req.query.department_id || undefined,
      search: req.query.search || undefined,
      start_date: req.query.start_date || undefined,
      due_date: req.query.due_date || undefined,
      parent_goal_id: req.query.parent_goal_id === 'null' ? null 
                      : req.query.parent_goal_id || undefined,
      sortBy: req.query.sortBy || 'created_at',
      sortDir: req.query.sortDir || 'DESC',
      limit,
      offset,
      my_goals_only: isMyGoals,
      my_employee_id: req.user.employeeId || null,
      my_user_id: req.user.id || null
    };

    const data = await service.listGoals(orgId, filters);
    res.json({
      success: true,
      page,
      limit,
      data
    });
  } catch (err) {
    next(err);
  }
}

async function handleGet(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const goalId = req.params.goalId;
    const data = await service.getGoal(orgId, goalId, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleCreate(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const { error, value } = validator.validateGoal(req.body);
    if (error) throw new ApiError(STATUS_CODES.BAD_REQUEST, error);

    const data = await service.createGoal(orgId, value, req.user);

    logAudit({
      organizationId: orgId,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'goal_created',
      target: `Goal ${data.goal_id}`,
      entityId: data.goal_id,
      module: 'goals',
      metadata: { title: data.title },
      ip: req.ip
    });

    res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: 'Goal created successfully.',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function handleUpdate(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const goalId = req.params.goalId;
    
    const { error, value } = validator.validateGoal(req.body);
    if (error) throw new ApiError(STATUS_CODES.BAD_REQUEST, error);

    const data = await service.updateGoal(orgId, goalId, value, req.user);

    logAudit({
      organizationId: orgId,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'goal_updated',
      target: `Goal ${goalId}`,
      entityId: goalId,
      module: 'goals',
      metadata: { title: data.title },
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Goal updated successfully.',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function handleDelete(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const goalId = req.params.goalId;

    await service.deleteGoal(orgId, goalId, req.user.role);

    logAudit({
      organizationId: orgId,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'goal_deleted',
      target: `Goal ${goalId}`,
      entityId: goalId,
      module: 'goals',
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Goal deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
}

async function handleUpdateStatus(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const goalId = req.params.goalId;
    const { status } = req.body;

    if (!status) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Status is required.');
    }

    const data = await service.updateGoalStatus(orgId, goalId, status, req.body, req.user);

    let auditAction = 'goal_status_updated';
    if (status === 'PENDING_APPROVAL') auditAction = 'goal_submitted';
    else if (status === 'ACTIVE') auditAction = 'goal_approved';
    else if (status === 'REJECTED') auditAction = 'goal_rejected';
    else if (status === 'CHANGES_REQUESTED') auditAction = 'goal_changes_requested';
    else if (status === 'COMPLETED') auditAction = 'goal_completed';

    logAudit({
      organizationId: orgId,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: auditAction,
      target: `Goal ${goalId}`,
      entityId: goalId,
      module: 'goals',
      metadata: { status, reason: req.body.reason || null },
      ip: req.ip
    });

    res.json({
      success: true,
      message: `Goal status updated to ${status} successfully.`,
      data
    });
  } catch (err) {
    next(err);
  }
}

async function handleDashboardSummary(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const data = await service.getGoalDashboardSummary(orgId, req.user);
    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
}

async function handleGetDocuments(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const goalId = req.params.goalId;
    const data = await service.getGoalDocuments(orgId, goalId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleGetActivityLogs(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const goalId = req.params.goalId;
    const data = await service.getGoalActivityLogs(orgId, goalId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleGetAssignments(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const goalId = req.params.goalId;
    const goalAssignmentService = require('./goalAssignment.service');
    const data = await goalAssignmentService.getAssignmentsForGoal(orgId, goalId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleUpdateAssignmentStatus(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const { goalId, assignmentId } = req.params;
    const { status, completionOutcome } = req.body;
    const goalAssignmentService = require('./goalAssignment.service');
    const data = await goalAssignmentService.updateAssignmentStatus(orgId, goalId, assignmentId, status, completionOutcome);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleGetActiveConfig(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const data = await service.getActiveConfig(orgId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleList,
  handleGet,
  handleCreate,
  handleUpdate,
  handleDelete,
  handleUpdateStatus,
  handleDashboardSummary,
  handleGetDocuments,
  handleGetActivityLogs,
  handleGetAssignments,
  handleUpdateAssignmentStatus,
  handleGetActiveConfig
};
