const db = require('../../config/db');
const superAdminService = require('./superAdmin.service');
const { STATUS_CODES } = require('../../constants/statusCodes');
const ApiError = require('../../utils/apiError');
const { logAudit } = require('../../utils/auditLog');
const notifRepo = require('../notification/notificationSettings.repository');
const passwordPolicyRepo = require('./passwordPolicy.repository');
const sessionTimeoutRepo = require('./sessionTimeout.repository');

async function handleGetSmtp(req, res, next) {
  try {
    const settings = await superAdminService.getSmtpSettings();
    res.status(STATUS_CODES.OK).json(settings);
  } catch (err) {
    next(err);
  }
}

async function handleSaveSmtp(req, res, next) {
  const { host, port, encryption, username, password, fromAddress, fromName } = req.body;
  if (!host || !port || !encryption || !username || !fromAddress || !fromName) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'All SMTP fields are required.'));
  }
  try {
    await superAdminService.saveSmtpSettings({ host, port, encryption, username, password, fromAddress, fromName });
    logAudit({ actorId: req.user.id, actorEmail: req.user.email, actorRole: req.user.role, action: 'smtp_settings_updated', target: 'smtp_settings', ip: req.ip });
    res.status(STATUS_CODES.OK).json({ message: 'SMTP settings saved successfully.' });
  } catch (err) {
    next(err);
  }
}

async function handleTestSmtp(req, res, next) {
  const cfg = req.body;
  try {
    await superAdminService.testSmtp(cfg);
    res.status(STATUS_CODES.OK).json({ message: 'SMTP connection verified successfully.' });
  } catch (err) {
    next(new ApiError(STATUS_CODES.BAD_REQUEST, `Connection failed: ${err.message}`));
  }
}

async function handleGetSecurity(req, res, next) {
  try {
    const settings = await superAdminService.getSecuritySettings();
    res.status(STATUS_CODES.OK).json(settings);
  } catch (err) {
    next(err);
  }
}

async function handleSaveSecurity(req, res, next) {
  const { otpSuperAdminEnabled, otpClientAdminEnabled, otpEmployeeEnabled, maxLoginAttempts, lockoutDurationMinutes } = req.body;
  if (typeof otpSuperAdminEnabled !== 'boolean' || typeof otpClientAdminEnabled !== 'boolean' || typeof otpEmployeeEnabled !== 'boolean') {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'OTP role fields must be booleans.'));
  }
  const attempts = Number(maxLoginAttempts);
  const lockout = Number(lockoutDurationMinutes);
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 20) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'maxLoginAttempts must be an integer between 1 and 20.'));
  }
  if (!Number.isInteger(lockout) || lockout < 1 || lockout > 1440) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'lockoutDurationMinutes must be an integer between 1 and 1440.'));
  }
  try {
    await superAdminService.saveSecuritySettings({ otpSuperAdminEnabled, otpClientAdminEnabled, otpEmployeeEnabled, maxLoginAttempts: attempts, lockoutDurationMinutes: lockout });
    logAudit({ actorId: req.user.id, actorEmail: req.user.email, actorRole: req.user.role, action: 'security_settings_updated', target: 'security_settings', metadata: { otpSuperAdminEnabled, otpClientAdminEnabled, otpEmployeeEnabled, maxLoginAttempts: attempts, lockoutDurationMinutes: lockout }, ip: req.ip });
    res.status(STATUS_CODES.OK).json({ message: 'Security settings saved successfully.' });
  } catch (err) {
    next(err);
  }
}

// Super admin: all logs, most recent first, with pagination and filtering
async function handleGetAuditLogs(req, res, next) {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { dateFrom, dateTo, action, actorEmail, actorRole } = req.query;

    const conditions = [];
    const params = [];

    if (dateFrom) {
      params.push(dateFrom);
      conditions.push(`created_at >= $${params.length}::timestamptz`);
    }
    if (dateTo) {
      params.push(dateTo);
      conditions.push(`created_at <= $${params.length}::timestamptz`);
    }
    if (action) {
      params.push(action);
      conditions.push(`action = $${params.length}`);
    }
    if (actorEmail) {
      params.push(`%${actorEmail}%`);
      conditions.push(`actor_email ILIKE $${params.length}`);
    }
    if (actorRole) {
      params.push(actorRole);
      conditions.push(`actor_role = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const dataParams  = [...params, limit, offset];
    const countParams = [...params];

    const [{ rows }, { rows: countRows }] = await Promise.all([
      db.query(
        `SELECT id, actor_id, actor_email, actor_role, action, target, metadata, ip_address, created_at
         FROM audit_logs
         ${where}
         ORDER BY created_at DESC
         LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
        dataParams
      ),
      db.query(`SELECT COUNT(*) AS total FROM audit_logs ${where}`, countParams),
    ]);

    const total = parseInt(countRows[0].total, 10);
    res.status(STATUS_CODES.OK).json({ logs: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

// Client admin: only their own logs, with pagination, date, action, and search filtering
async function handleGetClientAdminAuditLogs(req, res, next) {
  try {
    const page       = Math.max(1, parseInt(req.query.page)  || 1);
    const limit      = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset     = (page - 1) * limit;
    const fromDate   = req.query.from_date   || null;
    const toDate     = req.query.to_date     || null;
    const action     = req.query.action      || null;
    const search     = req.query.search      || null;

    const conditions = ['actor_id = $1'];
    const baseParams = [req.user.id];

    if (fromDate) {
      baseParams.push(fromDate);
      conditions.push(`created_at >= $${baseParams.length}::date`);
    }
    if (toDate) {
      baseParams.push(toDate);
      conditions.push(`created_at < ($${baseParams.length}::date + INTERVAL '1 day')`);
    }
    if (action) {
      baseParams.push(action);
      conditions.push(`action = $${baseParams.length}`);
    }
    if (search) {
      baseParams.push(`%${search}%`);
      conditions.push(`(actor_email ILIKE $${baseParams.length} OR target ILIKE $${baseParams.length})`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const dataParams  = [...baseParams, limit, offset];
    const countParams = [...baseParams];

    const [{ rows }, { rows: countRows }] = await Promise.all([
      db.query(
        `SELECT id, actor_id, actor_email, actor_role, action, target, metadata, ip_address, created_at
         FROM audit_logs
         ${where}
         ORDER BY created_at DESC
         LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
        dataParams
      ),
      db.query(`SELECT COUNT(*) AS total FROM audit_logs ${where}`, countParams),
    ]);

    const total = parseInt(countRows[0].total, 10);
    res.status(STATUS_CODES.OK).json({ logs: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

async function handleGetNotificationSettings(req, res, next) {
  try {
    const settings = await notifRepo.getSettings();
    res.status(STATUS_CODES.OK).json(settings);
  } catch (err) {
    next(err);
  }
}

async function handleSaveNotificationSettings(req, res, next) {
  const FIELDS = [
    'leave_submitted', 'leave_decision', 'regularization_submitted',
    'regularization_decision', 'appraisal_cycle_opened', 'goal_submitted',
    'goal_deadline_reminder', 'payroll_processed',
  ];
  for (const field of FIELDS) {
    if (field in req.body && typeof req.body[field] !== 'boolean') {
      return next(new ApiError(STATUS_CODES.BAD_REQUEST, `${field} must be a boolean.`));
    }
  }
  try {
    const settings = await notifRepo.saveSettings(req.body);
    logAudit({ actorId: req.user.id, actorEmail: req.user.email, actorRole: req.user.role, action: 'notification_settings_updated', target: 'notification_settings', ip: req.ip });
    res.status(STATUS_CODES.OK).json(settings);
  } catch (err) {
    next(err);
  }
}

async function handleGetPasswordPolicy(req, res, next) {
  try {
    const policy = await passwordPolicyRepo.getPasswordPolicy();
    res.status(STATUS_CODES.OK).json(policy);
  } catch (err) {
    next(err);
  }
}

async function handleSavePasswordPolicy(req, res, next) {
  const { minLength, requireUppercase, requireLowercase, requireNumbers, requireSpecialChars, maxAgeDays } = req.body;
  if (typeof minLength !== 'number' || minLength < 4 || minLength > 128) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'minLength must be a number between 4 and 128.'));
  }
  const ageDays = Number(maxAgeDays) || 0;
  if (!Number.isInteger(ageDays) || ageDays < 0 || ageDays > 3650) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'maxAgeDays must be an integer between 0 (disabled) and 3650.'));
  }
  try {
    await passwordPolicyRepo.savePasswordPolicy({
      minLength,
      requireUppercase: !!requireUppercase,
      requireLowercase: !!requireLowercase,
      requireNumbers: !!requireNumbers,
      requireSpecialChars: !!requireSpecialChars,
      maxAgeDays: ageDays,
    });
    logAudit({ actorId: req.user.id, actorEmail: req.user.email, actorRole: req.user.role, action: 'password_policy_updated', target: 'password_policy', ip: req.ip });
    res.status(STATUS_CODES.OK).json({ message: 'Password policy saved successfully.' });
  } catch (err) {
    next(err);
  }
}

async function handleGetDashboard(req, res, next) {
  try {
    const stats = await superAdminService.getDashboardStats();
    res.status(STATUS_CODES.OK).json(stats);
  } catch (err) {
    next(err);
  }
}

async function handleGetSessionTimeout(req, res, next) {
  try {
    const policy = await sessionTimeoutRepo.getSessionTimeout();
    res.status(STATUS_CODES.OK).json(policy);
  } catch (err) {
    next(err);
  }
}

async function handleSaveSessionTimeout(req, res, next) {
  const { idleTimeoutMinutes, absoluteTimeoutHours, warnBeforeExpiryMinutes, extendOnActivity } = req.body;
  if (typeof idleTimeoutMinutes !== 'number' || idleTimeoutMinutes < 0 || idleTimeoutMinutes > 480) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'idleTimeoutMinutes must be between 0 and 480.'));
  }
  if (typeof absoluteTimeoutHours !== 'number' || absoluteTimeoutHours < 0 || absoluteTimeoutHours > 24) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'absoluteTimeoutHours must be between 0 and 24.'));
  }
  if (typeof warnBeforeExpiryMinutes !== 'number' || warnBeforeExpiryMinutes < 1 || warnBeforeExpiryMinutes > 15) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'warnBeforeExpiryMinutes must be between 1 and 15.'));
  }
  try {
    await sessionTimeoutRepo.saveSessionTimeout({
      idleTimeoutMinutes,
      absoluteTimeoutHours,
      warnBeforeExpiryMinutes,
      extendOnActivity: !!extendOnActivity,
    });
    logAudit({ actorId: req.user.id, actorEmail: req.user.email, actorRole: req.user.role, action: 'session_timeout_updated', target: 'session_timeout_policy', ip: req.ip });
    res.status(STATUS_CODES.OK).json({ message: 'Session timeout settings saved successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleGetDashboard,
  handleGetSmtp,
  handleSaveSmtp,
  handleTestSmtp,
  handleGetSecurity,
  handleSaveSecurity,
  handleGetAuditLogs,
  handleGetClientAdminAuditLogs,
  handleGetNotificationSettings,
  handleSaveNotificationSettings,
  handleGetPasswordPolicy,
  handleSavePasswordPolicy,
  handleGetSessionTimeout,
  handleSaveSessionTimeout,
};
