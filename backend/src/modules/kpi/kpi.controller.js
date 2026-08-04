const service = require('./kpi.service');
const validator = require('./kpi.validator');
const { STATUS_CODES } = require('../../constants/statusCodes');
const { logAudit } = require('../../utils/auditLog');
const ApiError = require('../../utils/apiError');

async function handleListGoalKpis(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const goalId = req.params.goalId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    const filters = {
      status: req.query.status || undefined,
      priority: req.query.priority || undefined,
      search: req.query.search || undefined,
      sortBy: req.query.sortBy || 'created_at',
      sortDir: req.query.sortDir || 'DESC',
      limit,
      offset
    };

    const data = await service.listGoalKpis(orgId, goalId, filters, req.user);
    res.json({
      success: true,
      page,
      limit,
      data: data.items,
      total: data.total
    });
  } catch (err) {
    next(err);
  }
}

async function handleGetKpi(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const kpiId = req.params.kpiId;
    const data = await service.getKpiDetails(orgId, kpiId, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleCreateKpi(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const goalId = req.params.goalId;

    const { error, value } = validator.validateKpi(req.body);
    if (error) throw new ApiError(STATUS_CODES.BAD_REQUEST, error);

    const data = await service.createKpi(orgId, goalId, value, req.user);

    logAudit({
      organizationId: orgId,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'kpi_created',
      target: `KPI ${data.kpi_code}`,
      entityId: data.kpi_id,
      module: 'goals',
      metadata: { title: data.title },
      ip: req.ip
    });

    res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: 'KPI created successfully.',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function handleUpdateKpi(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const kpiId = req.params.kpiId;

    const { error, value } = validator.validateKpi(req.body);
    if (error) throw new ApiError(STATUS_CODES.BAD_REQUEST, error);

    const data = await service.updateKpi(orgId, kpiId, value, req.user);

    logAudit({
      organizationId: orgId,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'kpi_updated',
      target: `KPI ${data.kpi_code}`,
      entityId: data.kpi_id,
      module: 'goals',
      metadata: { title: data.title },
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'KPI updated successfully.',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function handleDeleteKpi(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const kpiId = req.params.kpiId;

    const data = await service.deleteKpi(orgId, kpiId, req.user);

    logAudit({
      organizationId: orgId,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'kpi_deleted',
      target: `KPI ${data.kpi_code}`,
      entityId: data.kpi_id,
      module: 'goals',
      metadata: { title: data.title },
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'KPI deleted successfully.',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function handleUpdateStatus(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const kpiId = req.params.kpiId;
    const { status, reason } = req.body;

    if (!status) throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Status is required.');

    const data = await service.updateKpiStatus(orgId, kpiId, status, reason, req.user);

    logAudit({
      organizationId: orgId,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'kpi_status_updated',
      target: `KPI ${data.kpi_code}`,
      entityId: data.kpi_id,
      module: 'goals',
      metadata: { status, reason },
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'KPI status updated successfully.',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function handleUpdateProgress(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const kpiId = req.params.kpiId;

    const data = await service.updateKpiProgress(orgId, kpiId, req.body, req.user);

    logAudit({
      organizationId: orgId,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'kpi_progress_updated',
      target: `KPI ${data.kpi_code}`,
      entityId: data.kpi_id,
      module: 'goals',
      metadata: { 
        current_value: req.body.current_value,
        current_text: req.body.current_text,
        current_boolean: req.body.current_boolean,
        comment: req.body.comment
      },
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'KPI progress updated successfully.',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function handleDashboardSummary(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const data = await service.getDashboardSummary(orgId, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ── KPI Submissions Handlers ──

async function handleCreateSubmission(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const kpiId = req.params.kpiId;

    const kpi = await service.getKpiDetails(orgId, kpiId, req.user);
    const { error, value } = validator.validateSubmission(req.body, kpi.measurement_type);
    if (error) throw new ApiError(STATUS_CODES.BAD_REQUEST, error);

    const data = await service.submitKpiCompletion(orgId, kpiId, value, req.user);

    logAudit({
      organizationId: orgId,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'kpi_submitted',
      target: `KPI ${kpi.kpi_code}`,
      entityId: kpi.kpi_id,
      module: 'goals',
      metadata: { submission_id: data.submission_id, comment: data.comment },
      ip: req.ip
    });

    res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: 'KPI progress submitted successfully.',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function handleReviewSubmission(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const submissionId = req.params.submissionId;
    const { status, comment } = req.body;

    if (!status) throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Status is required.');

    const data = await service.reviewSubmission(orgId, submissionId, { status, comment }, req.user);

    let auditAction = 'kpi_changes_requested';
    if (status === 'APPROVED') auditAction = 'kpi_submission_approved';
    else if (status === 'REJECTED') auditAction = 'kpi_submission_rejected';

    logAudit({
      organizationId: orgId,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: auditAction,
      target: `Submission ${submissionId}`,
      entityId: data.kpi_id,
      module: 'goals',
      metadata: { submission_id: submissionId, comment },
      ip: req.ip
    });

    res.json({
      success: true,
      message: `KPI submission reviewed successfully: status set to ${status}.`,
      data
    });
  } catch (err) {
    next(err);
  }
}

async function handleListSubmissions(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const kpiId = req.params.kpiId;
    const data = await service.listSubmissionHistory(orgId, kpiId, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleGetGoalProgressHistory(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const goalId = req.params.goalId;
    const data = await service.getGoalProgressHistory(orgId, goalId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleGetPendingSubmissions(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const data = await service.listPendingSubmissions(orgId, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleListGoalKpis,
  handleGetKpi,
  handleCreateKpi,
  handleUpdateKpi,
  handleDeleteKpi,
  handleUpdateStatus,
  handleUpdateProgress,
  handleDashboardSummary,
  handleCreateSubmission,
  handleReviewSubmission,
  handleListSubmissions,
  handleGetGoalProgressHistory,
  handleGetPendingSubmissions
};
