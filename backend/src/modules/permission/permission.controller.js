const permissionService = require('./permission.service');
const permissionRepository = require('./permission.repository');
const { STATUS_CODES } = require('../../constants/statusCodes');

// ── Settings ─────────────────────────────────────────────────────

async function handleGetSettings(req, res, next) {
  try {
    const settings = await permissionService.getSettings();
    res.status(STATUS_CODES.OK).json(settings);
  } catch (err) { next(err); }
}

async function handleSaveSettings(req, res, next) {
  try {
    const settings = await permissionService.saveSettings(req.body);
    res.status(STATUS_CODES.OK).json(settings);
  } catch (err) { next(err); }
}

// ── Employee Portal ───────────────────────────────────────────────

async function handleGetMyBalance(req, res, next) {
  try {
    const balance = await permissionService.getMyBalance(req.user.employeeId);
    res.status(STATUS_CODES.OK).json(balance);
  } catch (err) { next(err); }
}

async function handleGetMyBalances(req, res, next) {
  try {
    const balances = await permissionService.getMyBalances(req.user.employeeId);
    res.status(STATUS_CODES.OK).json(balances);
  } catch (err) { next(err); }
}

async function handleGetMyRequests(req, res, next) {
  try {
    const requests = await permissionRepository.getMyRequests(req.user.employeeId);
    res.status(STATUS_CODES.OK).json(requests);
  } catch (err) { next(err); }
}

async function handleApplyPermission(req, res, next) {
  try {
    const { permission_date, start_time, end_time, reason } = req.body;
    const result = await permissionService.applyPermission(
      req.user.employeeId,
      req.user.organizationId,
      { permission_date, start_time, end_time, reason }
    );
    res.status(STATUS_CODES.CREATED).json(result);
  } catch (err) { next(err); }
}

async function handleCancelRequest(req, res, next) {
  try {
    const result = await permissionService.cancelRequest(req.params.id, req.user.employeeId);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) { next(err); }
}

// ── Admin / HR / Manager ──────────────────────────────────────────

async function handleAdminGetRequests(req, res, next) {
  try {
    const { month, year, status } = req.query;
    const requests = await permissionService.getAdminRequests({
      month:  month  ? parseInt(month, 10)  : null,
      year:   year   ? parseInt(year, 10)   : null,
      status: status || null,
    });
    res.status(STATUS_CODES.OK).json(requests);
  } catch (err) { next(err); }
}

async function handleAdminApprove(req, res, next) {
  try {
    const result = await permissionService.approveRequest(req.params.id, req.user.employeeId);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) { next(err); }
}

async function handleAdminReject(req, res, next) {
  try {
    const { rejection_reason } = req.body;
    const result = await permissionService.rejectRequest(req.params.id, req.user.employeeId, rejection_reason);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) { next(err); }
}

async function handleAdminGetBalances(req, res, next) {
  try {
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month, 10) : now.getMonth() + 1;
    const year  = req.query.year  ? parseInt(req.query.year,  10) : now.getFullYear();
    const balances = await permissionService.getAllBalancesForMonth(month, year);
    res.status(STATUS_CODES.OK).json({ balances, month, year });
  } catch (err) { next(err); }
}

module.exports = {
  handleGetSettings,
  handleSaveSettings,
  handleGetMyBalance,
  handleGetMyBalances,
  handleGetMyRequests,
  handleApplyPermission,
  handleCancelRequest,
  handleAdminGetRequests,
  handleAdminApprove,
  handleAdminReject,
  handleAdminGetBalances,
};
