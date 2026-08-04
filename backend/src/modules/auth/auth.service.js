const {
  findUserByEmail,
  findUserById,
  updateUserLastLogin,
  incrementFailedLoginAttempts,
  lockUserUntil,
  clearFailedLoginAttempts,
  createOtp,
  findActiveOtps,
  markOtpAsUsed,
  incrementOtpAttempts,
  updateUserPassword,
  getUserProfileDetails,
  checkIsManager,
} = require('./user.repository');

const crypto = require('crypto');
const db = require('../../config/db');
const { comparePassword, hashPassword } = require('../../utils/hash');
const { signToken, verifyToken } = require('../../utils/jwt');
const { emailService } = require('../notification');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');
const env = require('../../config/env');
const { getSecuritySettings } = require('../superAdmin/security.repository');
const { getPasswordPolicy } = require('../superAdmin/passwordPolicy.repository');
const { validatePasswordStrength, isPasswordExpired } = require('../../utils/passwordPolicy');

function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

async function login(email, password) {
  const normalizedEmail = email.toLowerCase().trim();
  console.log(`[LOGIN_DEBUG] Attempt for: "${normalizedEmail}", password length: ${password ? password.length : 0}`);

  // 1. Find user
  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    console.log(`[LOGIN_DEBUG] User not found in DB for: "${normalizedEmail}"`);
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'Invalid email or password.');
  }
  console.log(`[LOGIN_DEBUG] Found user in DB: ID="${user.user_id}", Email="${user.email}", Role="${user.role}", IsActive=${user.is_active}, HashPrefix="${user.password_hash ? user.password_hash.substring(0, 15) : 'none'}..."`);

  // 2. Check active
  if (!user.is_active) {
    console.log(`[LOGIN_DEBUG] User is inactive.`);
    // Fetch the employee's status for a more specific message
    let employeeStatus = null;
    if (user.employee_id) {
      const empRes = await db.query(
        'SELECT status FROM employees WHERE employee_id = $1',
        [user.employee_id]
      );
      employeeStatus = empRes.rows[0]?.status || null;
    }
    if (employeeStatus === 'terminated') {
      throw new ApiError(STATUS_CODES.FORBIDDEN, 'Your employment has been terminated. Please contact HR.');
    }
    if (employeeStatus === 'exit') {
      throw new ApiError(STATUS_CODES.FORBIDDEN, 'Your account has been marked as exited. Please contact HR.');
    }
    if (employeeStatus === 'on_leave') {
      throw new ApiError(STATUS_CODES.FORBIDDEN, 'Your account is currently on leave and has been deactivated. Contact administrator.');
    }
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'Your account is deactivated. Contact administrator.');
  }

  // 3. Check account lockout (disabled as requested)
  // if (user.locked_until && new Date(user.locked_until) > new Date()) {
  //   const remaining = Math.ceil((new Date(user.locked_until) - Date.now()) / 60000);
  //   console.log(`[LOGIN_DEBUG] User account is locked until ${user.locked_until}`);
  //   throw new ApiError(STATUS_CODES.FORBIDDEN, `Account temporarily locked. Try again in ${remaining} minute(s).`);
  // }

  // 4. Verify password
  const secSettings = await getSecuritySettings();
  const match = await comparePassword(password, user.password_hash);
  console.log(`[LOGIN_DEBUG] bcrypt compare match result: ${match}`);
  if (!match) {
    const attempts = await incrementFailedLoginAttempts(user.user_id);
    console.log(`[LOGIN_DEBUG] Failed login attempts incremented to: ${attempts}`);
    // Account lockout disabled as requested
    // if (attempts >= secSettings.maxLoginAttempts) {
    //   const lockUntil = new Date(Date.now() + secSettings.lockoutDurationMinutes * 60 * 1000);
    //   await lockUserUntil(user.user_id, lockUntil);
    //   throw new ApiError(STATUS_CODES.FORBIDDEN, `Too many failed attempts. Account locked for ${secSettings.lockoutDurationMinutes} minute(s).`);
    // }
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'Invalid email or password.');
  }

  // Clear failures on successful password verification
  await clearFailedLoginAttempts(user.user_id);

  // 5. Check password expiry against policy
  const policy = await getPasswordPolicy();
  if (isPasswordExpired(user.password_changed_at, policy.maxAgeDays) && !user.password_reset_required) {
    await db.query('UPDATE users SET password_reset_required = true WHERE user_id = $1', [user.user_id]);
    user.password_reset_required = true;
  }

  // 6. Check if OTP is required for this role
  let otpRequired;
  if (user.role === 'super_admin') otpRequired = secSettings.otpSuperAdminEnabled;
  else if (user.role === 'client_admin') otpRequired = secSettings.otpClientAdminEnabled;
  else otpRequired = false; // OTP is disabled for employees, managers, HR, etc.

  if (!otpRequired) {
    // Skip OTP — issue full access token directly
    await updateUserLastLogin(user.user_id);
    const isManager = await checkIsManager(user.employee_id, user.organization_id);
    const tokenPayload = {
      userId: user.user_id,
      employeeId: user.employee_id,
      role: user.role,
      email: user.email,
      organizationId: user.organization_id,
      attendanceEnabled: user.attendance_enabled,
      passwordResetRequired: user.password_reset_required,
      sessionId: crypto.randomUUID(),
    };
    const token = signToken(tokenPayload, { expiresIn: env.jwt.expiresIn });
    let company_name = null;
    if (user.role !== 'super_admin' && user.organization_id) {
      const orgRes = await db.query('SELECT name FROM organizations WHERE organization_id = $1', [user.organization_id]);
      company_name = orgRes.rows[0]?.name || null;
    }
    return {
      token,
      role: user.role,
      is_manager: isManager,
      company_name,
      passwordResetRequired: user.password_reset_required,
      otpEnabled: false,
      message: 'Login successful.',
    };
  }

  // 7. Generate OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = hashOtp(otp);
  const expiryMs = env.otp.expiryMinutes * 60 * 1000;
  const expiresAt = new Date(Date.now() + expiryMs);

  await createOtp(user.user_id, otpHash, 'login', expiresAt);

  // 8. Sign short-lived temp token (no OTP details, just user identity reference)
  const tempToken = signToken(
    { sub: 'otp_pending', userId: user.user_id, purpose: 'login' },
    { expiresIn: '15m' }
  );

  const result = { tempToken, otpEnabled: true, message: 'OTP sent to your registered email address.' };
  result.devOtp = otp; // Always return devOtp for easy deployment testing autofill
  if (env.nodeEnv !== 'development') {
    try {
      await emailService.sendOtpEmail(user.email, otp);
    } catch (emailErr) {
      // Email delivery failed (e.g. SMTP rate limit). The OTP is saved in the DB
      // so the user can request a resend. Don't abort the login flow.
      console.error('OTP email send failed:', emailErr.message);
      result.message = 'OTP generated but email delivery failed. Please use "Resend OTP".';
    }
  }

  return result;
}

async function verifyOtp(otp, tempToken) {
  let payload;
  try {
    payload = verifyToken(tempToken);
    if (payload.sub !== 'otp_pending' || payload.purpose !== 'login') {
      throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'Invalid session.');
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'Session expired. Please sign in again.');
  }

  const userId = payload.userId;
  const user = await findUserById(userId);
  if (!user || !user.is_active) {
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'User not found or deactivated.');
  }

  // Find active OTPs
  const activeOtps = await findActiveOtps(userId, 'login');
  if (!activeOtps.length) {
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'OTP expired or not found. Please login again.');
  }

  const activeOtp = activeOtps[0]; // latest one
  if (activeOtp.attempts >= env.otp.maxAttempts) {
    await markOtpAsUsed(activeOtp.otp_id);
    throw new ApiError(STATUS_CODES.TOO_MANY_REQUESTS, 'Too many incorrect attempts. Please sign in again.');
  }

  const hashedInput = hashOtp(otp);
  if (hashedInput !== activeOtp.otp_hash) {
    const attempts = await incrementOtpAttempts(activeOtp.otp_id);
    const remaining = env.otp.maxAttempts - attempts;
    if (remaining <= 0) {
      await markOtpAsUsed(activeOtp.otp_id);
      throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'Incorrect OTP. Maximum attempts reached. Sign in again.');
    }
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, `Incorrect OTP. ${remaining} attempt(s) remaining.`);
  }

  // Success
  await markOtpAsUsed(activeOtp.otp_id);
  await updateUserLastLogin(userId);

  const isManager = await checkIsManager(user.employee_id, user.organization_id);

  // Generate full access token
  const tokenPayload = {
    userId: user.user_id,
    employeeId: user.employee_id,
    role: user.role,
    email: user.email,
    organizationId: user.organization_id,
    attendanceEnabled: user.attendance_enabled,
    passwordResetRequired: user.password_reset_required,
    isManager,
    sessionId: crypto.randomUUID(),
  };

  const token = signToken(tokenPayload, { expiresIn: env.jwt.expiresIn });

  let company_name = null;
  if (user.role !== 'super_admin' && user.organization_id) {
    const orgRes = await db.query('SELECT name FROM organizations WHERE organization_id = $1', [user.organization_id]);
    company_name = orgRes.rows[0]?.name || null;
  }

  return {
    token,
    role: user.role,
    is_manager: isManager,
    company_name,
    passwordResetRequired: user.password_reset_required,
    message: 'Authentication successful.',
  };
}

async function resendOtp(tempToken) {
  let payload;
  try {
    payload = verifyToken(tempToken);
    if (payload.sub !== 'otp_pending') {
      throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'Session expired. Please sign in again.');
    }
  } catch (err) {
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'Session expired. Please sign in again.');
  }

  const userId = payload.userId;
  const purpose = payload.purpose || 'login';
  const user = await findUserById(userId);
  if (!user || !user.is_active) {
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'User not found or deactivated.');
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = hashOtp(otp);
  const expiryMs = env.otp.expiryMinutes * 60 * 1000;
  const expiresAt = new Date(Date.now() + expiryMs);

  await createOtp(userId, otpHash, purpose, expiresAt);

  const result = { message: 'New OTP sent to your registered email.' };
  result.devOtp = otp; // Always return devOtp for easy deployment testing autofill
  if (env.nodeEnv !== 'development') {
    try {
      await emailService.sendOtpEmail(user.email, otp);
    } catch (emailErr) {
      console.error('OTP email send failed:', emailErr.message);
      result.message = 'OTP generated but email delivery failed. Please try again shortly.';
    }
  }
  return result;
}

async function forgotPassword(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'No account found with this email address.');
  }

  if (!user.is_active) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'Account is inactive.');
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = hashOtp(otp);
  const expiryMs = env.otp.expiryMinutes * 60 * 1000;
  const expiresAt = new Date(Date.now() + expiryMs);

  await createOtp(user.user_id, otpHash, 'password_reset', expiresAt);

  const tempToken = signToken(
    { sub: 'otp_pending', userId: user.user_id, purpose: 'password_reset' },
    { expiresIn: '15m' }
  );

  const result = { tempToken, message: 'Password reset OTP sent to your email.' };
  result.devOtp = otp; // Always return devOtp for easy deployment testing autofill
  if (env.nodeEnv !== 'development') {
    try {
      await emailService.sendOtpEmail(user.email, otp);
    } catch (emailErr) {
      console.error('OTP email send failed:', emailErr.message);
      result.message = 'OTP generated but email delivery failed. Please try again shortly.';
    }
  }
  return result;
}

async function resetPassword(otp, tempToken, newPassword) {
  let payload;
  try {
    payload = verifyToken(tempToken);
    if (payload.sub !== 'otp_pending' || payload.purpose !== 'password_reset') {
      throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'Invalid reset session.');
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'Reset session expired. Please request again.');
  }

  const userId = payload.userId;
  const user = await findUserById(userId);
  if (!user || !user.is_active) {
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'User not found.');
  }

  const activeOtps = await findActiveOtps(userId, 'password_reset');
  if (!activeOtps.length) {
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'OTP expired or session not found.');
  }

  const activeOtp = activeOtps[0];
  if (activeOtp.attempts >= env.otp.maxAttempts) {
    await markOtpAsUsed(activeOtp.otp_id);
    throw new ApiError(STATUS_CODES.TOO_MANY_REQUESTS, 'Too many incorrect attempts. Please try again.');
  }

  const hashedInput = hashOtp(otp);
  if (hashedInput !== activeOtp.otp_hash) {
    const attempts = await incrementOtpAttempts(activeOtp.otp_id);
    const remaining = env.otp.maxAttempts - attempts;
    if (remaining <= 0) {
      await markOtpAsUsed(activeOtp.otp_id);
      throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'Incorrect OTP. Maximum attempts reached.');
    }
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, `Incorrect OTP. ${remaining} attempt(s) remaining.`);
  }

  // OTP is correct
  await markOtpAsUsed(activeOtp.otp_id);

  // Validate against password policy
  const resetPolicy = await getPasswordPolicy();
  const resetErrors = validatePasswordStrength(newPassword, resetPolicy);
  if (resetErrors.length) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, resetErrors.join(' '));
  }

  // Hash new password and update
  const newPasswordHash = await hashPassword(newPassword);
  await updateUserPassword(userId, newPasswordHash);
  await clearFailedLoginAttempts(userId);

  return { message: 'Password reset successful. Please sign in with your new password.' };
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'User not found.');
  }

  const match = await comparePassword(currentPassword, user.password_hash);
  if (!match) {
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'Incorrect current password.');
  }

  const changePolicy = await getPasswordPolicy();
  const changeErrors = validatePasswordStrength(newPassword, changePolicy);
  if (changeErrors.length) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, changeErrors.join(' '));
  }

  const newPasswordHash = await hashPassword(newPassword);
  await updateUserPassword(userId, newPasswordHash);

  return { message: 'Password changed successfully.' };
}

async function getProfile(user) {
  return await getUserProfileDetails(user);
}

module.exports = {
  login,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
};
