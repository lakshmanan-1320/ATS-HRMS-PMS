const authService = require('./auth.service');
const { verifyToken } = require('../../utils/jwt');
const { STATUS_CODES } = require('../../constants/statusCodes');
const { getCompanyById } = require('../company/company.repository');
const { getPasswordPolicy } = require('../superAdmin/passwordPolicy.repository');

async function handleLogin(req, res, next) {
  const { email, password } = req.validatedBody;
  try {
    const result = await authService.login(email, password);
    // When OTP is disabled the token is issued immediately — log the login here.
    if (!result.otpEnabled && result.token) {
      const decoded = verifyToken(result.token);
      await req.logActivity({
        organizationId: decoded.organizationId,
        actorUserId: decoded.userId,
        actorEmployeeId: decoded.employeeId,
        actorRole: decoded.role,
        actorEmail: decoded.email,
        moduleName: 'authentication',
        actionName: 'login',
        entityName: 'session'
      });
    }
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleVerifyOtp(req, res, next) {
  const { otp, tempToken } = req.validatedBody;
  try {
    const result = await authService.verifyOtp(otp, tempToken);
    // OTP path — this is the final login step.
    if (result.token) {
      const decoded = verifyToken(result.token);
      await req.logActivity({
        organizationId: decoded.organizationId,
        actorUserId: decoded.userId,
        actorEmployeeId: decoded.employeeId,
        actorRole: decoded.role,
        actorEmail: decoded.email,
        moduleName: 'authentication',
        actionName: 'login',
        entityName: 'session'
      });
    }
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleResendOtp(req, res, next) {
  const { tempToken } = req.validatedBody;
  try {
    const result = await authService.resendOtp(tempToken);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleForgotPassword(req, res, next) {
  const { email } = req.validatedBody;
  try {
    const result = await authService.forgotPassword(email);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleResetPassword(req, res, next) {
  const { otp, tempToken, newPassword } = req.validatedBody;
  try {
    const result = await authService.resetPassword(otp, tempToken, newPassword);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleChangePassword(req, res, next) {
  const { currentPassword, newPassword } = req.validatedBody;
  const userId = req.user.userId;
  try {
    const result = await authService.changePassword(userId, currentPassword, newPassword);
    await req.logActivity({
      moduleName: 'authentication',
      actionName: 'password_changed',
      entityName: 'user',
      entityId: userId
    });
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleGetMe(req, res, next) {
  try {
    const result = await authService.getProfile(req.user);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleGetPasswordPolicy(req, res, next) {
  try {
    const policy = await getPasswordPolicy();
    res.status(STATUS_CODES.OK).json(policy);
  } catch (err) {
    next(err);
  }
}

async function handleGetBranding(req, res, next) {
  try {
    const company = await getCompanyById(1);
    res.status(STATUS_CODES.OK).json({
      logo_base64: company?.logo_base64 || null,
      name: company?.name || null,
    });
  } catch (err) {
    next(err);
  }
}

async function handleGetSessionTimeout(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    if (orgId) {
      const { query } = require('../../config/db');
      const orgRes = await query(
        `SELECT idle_session_timeout_minutes, warn_before_expiry_minutes, absolute_timeout_hours, extend_on_activity 
         FROM organizations WHERE organization_id = $1`,
        [orgId]
      );
      const org = orgRes.rows[0];
      return res.status(STATUS_CODES.OK).json({
        idleTimeoutMinutes: org?.idle_session_timeout_minutes ?? 15,
        warnBeforeExpiryMinutes: org?.warn_before_expiry_minutes ?? 2,
        absoluteTimeoutHours: org?.absolute_timeout_hours ?? 8,
        extendOnActivity: org?.extend_on_activity ?? true,
      });
    }

    // Fallback for Super Admin
    const { getSessionTimeout } = require('../superAdmin/sessionTimeout.repository');
    const policy = await getSessionTimeout();
    res.status(STATUS_CODES.OK).json(policy);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleLogin,
  handleVerifyOtp,
  handleResendOtp,
  handleForgotPassword,
  handleResetPassword,
  handleChangePassword,
  handleGetMe,
  handleGetBranding,
  handleGetPasswordPolicy,
  handleGetSessionTimeout,
};
