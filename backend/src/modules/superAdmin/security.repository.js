const { query } = require('../../config/db');
const { companyRowId } = require('../../config/env');

async function getSecuritySettings() {
  const result = await query(
    `SELECT otp_login_enabled, otp_super_admin_enabled, otp_client_admin_enabled,
            otp_employee_enabled, max_login_attempts, lockout_duration_minutes
     FROM companies WHERE id = $1`,
    [companyRowId]
  );
  if (result.rows.length === 0) {
    return {
      otpLoginEnabled: true,
      otpSuperAdminEnabled: true,
      otpClientAdminEnabled: true,
      otpEmployeeEnabled: true,
      maxLoginAttempts: 5,
      lockoutDurationMinutes: 30,
    };
  }
  const row = result.rows[0];
  return {
    otpLoginEnabled: row.otp_login_enabled,
    otpSuperAdminEnabled: row.otp_super_admin_enabled ?? true,
    otpClientAdminEnabled: row.otp_client_admin_enabled ?? true,
    otpEmployeeEnabled: row.otp_employee_enabled ?? true,
    maxLoginAttempts: row.max_login_attempts ?? 5,
    lockoutDurationMinutes: row.lockout_duration_minutes ?? 30,
  };
}

async function saveSecuritySettings({ otpSuperAdminEnabled, otpClientAdminEnabled, otpEmployeeEnabled, maxLoginAttempts, lockoutDurationMinutes }) {
  const otpLoginEnabled = otpSuperAdminEnabled || otpClientAdminEnabled || otpEmployeeEnabled;
  await query(
    `INSERT INTO companies (id, otp_login_enabled, otp_super_admin_enabled, otp_client_admin_enabled, otp_employee_enabled, max_login_attempts, lockout_duration_minutes)
     VALUES ($7, $1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET
       otp_login_enabled = $1,
       otp_super_admin_enabled = $2,
       otp_client_admin_enabled = $3,
       otp_employee_enabled = $4,
       max_login_attempts = $5,
       lockout_duration_minutes = $6`,
    [otpLoginEnabled, otpSuperAdminEnabled, otpClientAdminEnabled, otpEmployeeEnabled, maxLoginAttempts, lockoutDurationMinutes, companyRowId]
  );
}

module.exports = { getSecuritySettings, saveSecuritySettings };
