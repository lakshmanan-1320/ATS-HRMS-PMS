const service = require('./pip.service');
const templateService = require('./pipTemplate.service');
const reportService = require('./pipReport.service');
const { STATUS_CODES } = require('../../constants/statusCodes');

// Settings
async function handleGetSettings(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const settings = await service.getSettings(orgId);
    res.status(STATUS_CODES.OK).json({ success: true, data: settings });
  } catch (err) { next(err); }
}

async function handleSaveSettings(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const settings = await service.saveSettings(orgId, req.body, req.user);
    res.status(STATUS_CODES.OK).json({ success: true, data: settings });
  } catch (err) { next(err); }
}

// Templates
async function handleCreateTemplate(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const template = await templateService.createTemplate(orgId, req.body);
    res.status(STATUS_CODES.CREATED).json({ success: true, data: template });
  } catch (err) { next(err); }
}

async function handleUpdateTemplate(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const template = await templateService.updateTemplate(orgId, req.params.id, req.body);
    res.status(STATUS_CODES.OK).json({ success: true, data: template });
  } catch (err) { next(err); }
}

async function handleDeleteTemplate(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    await templateService.deleteTemplate(orgId, req.params.id);
    res.status(STATUS_CODES.OK).json({ success: true, message: 'Template deleted.' });
  } catch (err) { next(err); }
}

async function handleGetTemplate(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const template = await templateService.getTemplate(orgId, req.params.id);
    res.status(STATUS_CODES.OK).json({ success: true, data: template });
  } catch (err) { next(err); }
}

async function handleListTemplates(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const list = await templateService.listTemplates(orgId);
    res.status(STATUS_CODES.OK).json({ success: true, data: list });
  } catch (err) { next(err); }
}

// Candidates
async function handleListCandidates(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const list = await service.listCandidates(orgId, req.query);
    res.status(STATUS_CODES.OK).json({ success: true, data: list });
  } catch (err) { next(err); }
}

async function handleGetCandidate(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const cand = await service.getCandidate(orgId, req.params.id);
    res.status(STATUS_CODES.OK).json({ success: true, data: cand });
  } catch (err) { next(err); }
}

async function handleCreateCandidate(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const cand = await service.createCandidate(orgId, req.body, req.user);
    res.status(STATUS_CODES.CREATED).json({ success: true, data: cand });
  } catch (err) { next(err); }
}

async function handleReviewCandidate(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const result = await service.reviewCandidate(orgId, req.params.id, req.body, req.user);
    res.status(STATUS_CODES.OK).json({ success: true, data: result });
  } catch (err) { next(err); }
}

// Active PIPs
async function handleGetPip(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const pip = await service.getPip(orgId, req.params.id);
    res.status(STATUS_CODES.OK).json({ success: true, data: pip });
  } catch (err) { next(err); }
}

async function handleListPips(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const list = await service.listPips(orgId, req.query);
    res.status(STATUS_CODES.OK).json({ success: true, data: list });
  } catch (err) { next(err); }
}

async function handleConfirmRead(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const updated = await service.confirmRead(orgId, req.params.id, req.user);
    res.status(STATUS_CODES.OK).json({ success: true, data: updated });
  } catch (err) { next(err); }
}

async function handleRefreshMetrics(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const result = await service.refreshMetricValues(orgId, req.params.id);
    res.status(STATUS_CODES.OK).json({ success: true, data: result });
  } catch (err) { next(err); }
}

// Check-ins
async function handleCompleteCheckin(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const checkin = await service.completeCheckin(orgId, req.params.id, req.body, req.user);
    res.status(STATUS_CODES.OK).json({ success: true, data: checkin });
  } catch (err) { next(err); }
}

async function handleAddEmployeeComment(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const checkin = await service.addEmployeeComment(orgId, req.params.id, req.body.comments, req.user);
    res.status(STATUS_CODES.OK).json({ success: true, data: checkin });
  } catch (err) { next(err); }
}

// HR Decision
async function handleProcessHrDecision(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const result = await service.processHrDecision(orgId, req.params.id, req.body, req.user);
    res.status(STATUS_CODES.OK).json({ success: true, data: result });
  } catch (err) { next(err); }
}

// Reports
async function handleGetDetailedReport(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const list = await reportService.getDetailedReport(orgId, req.query);
    res.status(STATUS_CODES.OK).json({ success: true, data: list });
  } catch (err) { next(err); }
}

async function handleGetPipStatistics(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const stats = await reportService.getPipStatistics(orgId, req.query);
    res.status(STATUS_CODES.OK).json({ success: true, data: stats });
  } catch (err) { next(err); }
}

async function handleGetLatestEmployeeAppraisal(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const { employeeId } = req.params;
    const appraisal = await service.getLatestEmployeeAppraisal(orgId, employeeId);
    res.status(STATUS_CODES.OK).json({ success: true, data: appraisal });
  } catch (err) { next(err); }
}

async function handleConvertPip(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const result = await service.convertToPip(orgId, req.params.id, req.body, req.user);
    res.status(STATUS_CODES.OK).json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function handleGetMetricTrendSnapshots(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const snapshots = await service.getMetricTrendSnapshots(orgId, req.params.id);
    res.status(STATUS_CODES.OK).json({ success: true, data: snapshots });
  } catch (err) { next(err); }
}

module.exports = {
  handleGetLatestEmployeeAppraisal,
  handleConvertPip,
  handleGetMetricTrendSnapshots,
  handleGetSettings,
  handleSaveSettings,
  handleCreateTemplate,
  handleUpdateTemplate,
  handleDeleteTemplate,
  handleGetTemplate,
  handleListTemplates,
  handleListCandidates,
  handleGetCandidate,
  handleCreateCandidate,
  handleReviewCandidate,
  handleGetPip,
  handleListPips,
  handleConfirmRead,
  handleRefreshMetrics,
  handleCompleteCheckin,
  handleAddEmployeeComment,
  handleProcessHrDecision,
  handleGetDetailedReport,
  handleGetPipStatistics
};
