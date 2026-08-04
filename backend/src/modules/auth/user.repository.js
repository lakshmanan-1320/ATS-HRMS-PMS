const db = require('../../config/db');

async function getExecutor(client) {
  return client || db;
}

async function findUserByEmail(email) {
  const result = await db.query(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1) ORDER BY created_at ASC LIMIT 1',
    [email.trim()]
  );
  return result.rows[0] || null;
}

async function findUserById(userId) {
  const result = await db.query(
    'SELECT * FROM users WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

async function createUser(data, txClient = null) {
  const run = await getExecutor(txClient);
  const {
    organization_id,
    employee_id,
    email,
    password_hash,
    role,
    is_active = true,
    attendance_enabled = false,
    password_reset_required = false,
    created_by = null,
  } = data;

  const result = await run.query(
    `INSERT INTO users (
      organization_id, employee_id, email, password_hash, role,
      is_active, attendance_enabled, password_reset_required, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      organization_id,
      employee_id,
      email.toLowerCase().trim(),
      password_hash,
      role,
      is_active,
      attendance_enabled,
      password_reset_required,
      created_by,
    ]
  );
  return result.rows[0];
}

async function updateUser(userId, data, txClient = null) {
  const run = await getExecutor(txClient);
  const {
    email,
    is_active,
    attendance_enabled,
    password_reset_required,
    updated_by,
  } = data;

  // Dynamically build the update columns
  const fields = [];
  const values = [];
  let index = 1;

  if (email !== undefined) {
    fields.push(`email = $${index++}`);
    values.push(email.toLowerCase().trim());
  }
  if (is_active !== undefined) {
    fields.push(`is_active = $${index++}`);
    values.push(is_active);
  }
  if (attendance_enabled !== undefined) {
    fields.push(`attendance_enabled = $${index++}`);
    values.push(attendance_enabled);
  }
  if (password_reset_required !== undefined) {
    fields.push(`password_reset_required = $${index++}`);
    values.push(password_reset_required);
  }
  if (updated_by !== undefined) {
    fields.push(`updated_by = $${index++}`);
    values.push(updated_by);
  }

  if (fields.length === 0) return null;

  values.push(userId);
  const result = await run.query(
    `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE user_id = $${index} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

async function updateUserPassword(userId, newPasswordHash) {
  const result = await db.query(
    `UPDATE users SET 
      password_hash = $1, 
      password_reset_required = false, 
      password_changed_at = NOW(),
      updated_at = NOW() 
    WHERE user_id = $2 
    RETURNING *`,
    [newPasswordHash, userId]
  );
  return result.rows[0] || null;
}

async function updateUserLastLogin(userId) {
  await db.query(
    'UPDATE users SET last_login_at = NOW() WHERE user_id = $1',
    [userId]
  );
}

async function incrementFailedLoginAttempts(userId) {
  const result = await db.query(
    'UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE user_id = $1 RETURNING failed_login_attempts',
    [userId]
  );
  return result.rows[0]?.failed_login_attempts || 0;
}

async function lockUserUntil(userId, lockedUntil) {
  await db.query(
    'UPDATE users SET locked_until = $1 WHERE user_id = $2',
    [lockedUntil, userId]
  );
}

async function clearFailedLoginAttempts(userId) {
  await db.query(
    'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE user_id = $1',
    [userId]
  );
}

async function createOtp(userId, otpHash, purpose, expiresAt) {
  const result = await db.query(
    `INSERT INTO user_otps (user_id, otp_hash, purpose, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING otp_id`,
    [userId, otpHash, purpose, expiresAt]
  );
  return result.rows[0].otp_id;
}

async function findActiveOtps(userId, purpose) {
  const result = await db.query(
    `SELECT * FROM user_otps 
     WHERE user_id = $1 AND purpose = $2 AND expires_at > NOW() AND used_at IS NULL
     ORDER BY created_at DESC`,
    [userId, purpose]
  );
  return result.rows;
}

async function markOtpAsUsed(otpId) {
  await db.query(
    'UPDATE user_otps SET used_at = NOW() WHERE otp_id = $1',
    [otpId]
  );
}

async function incrementOtpAttempts(otpId) {
  const result = await db.query(
    'UPDATE user_otps SET attempts = attempts + 1 WHERE otp_id = $1 RETURNING attempts',
    [otpId]
  );
  return result.rows[0]?.attempts || 0;
}

async function checkIsManager(employeeId, organizationId) {
  if (!employeeId || !organizationId) return false;
  const result = await db.query(
    'SELECT EXISTS(SELECT 1 FROM employees WHERE manager_employee_id = $1 AND organization_id = $2) AS is_manager',
    [employeeId, organizationId]
  );
  return result.rows[0]?.is_manager === true;
}

async function getUserProfileDetails(user) {
  if (!user) return null;

  const role = user.role;
  const email = user.email;
  const userId = user.userId || user.user_id || user.id;
  const organizationId = user.organizationId || user.organization_id;
  const employeeId = user.employeeId || user.employee_id;
  const attendanceEnabled = user.attendanceEnabled !== undefined ? user.attendanceEnabled : (user.attendance_enabled ?? true);

  if (role === 'super_admin') {
    const res = await db.query(
      'SELECT super_admin_id, full_name, email, is_active FROM super_admins WHERE email = $1',
      [email]
    );
    return {
      user_id: userId,
      role,
      email,
      attendance_enabled: true,
      profile: res.rows[0] || { full_name: 'Super Admin' }
    };
  }

  if (role === 'client_admin') {
    const res = await db.query(
      'SELECT client_admin_id, full_name, email, phone, company_name, status, notes FROM client_admins WHERE email = $1 AND organization_id = $2',
      [email, organizationId]
    );
    return {
      user_id: userId,
      role,
      email,
      organization_id: organizationId,
      attendance_enabled: true,
      profile: res.rows[0] || null
    };
  }

  // Employee, Manager, HR
  if (employeeId) {
    const res = await db.query(`
      SELECT e.employee_id, e.employee_code, e.first_name, e.last_name, e.email, e.phone,
             e.gender, e.date_of_birth, e.date_of_joining,
             e.department_id, d.name AS department_name,
             e.designation, e.employment_type, e.status,
             e.manager_employee_id AS manager_id, CONCAT(m.first_name, ' ', m.last_name) AS manager_name,
             e.secondary_manager_id, CONCAT(sm.first_name, ' ', sm.last_name) AS secondary_manager_name,
             e.hierarchy_level_id, hl.level_code, hl.designation AS level_designation,
             e.father_name, e.mother_name, e.blood_group, e.emergency_contact,
             e.bank_name, e.bank_account_number, e.bank_ifsc, e.bank_account_holder
      FROM employees e
      LEFT JOIN departments d    ON e.department_id       = d.department_id
      LEFT JOIN employees  m     ON e.manager_employee_id = m.employee_id
      LEFT JOIN employees  sm    ON e.secondary_manager_id = sm.employee_id
      LEFT JOIN hierarchy_levels hl ON e.hierarchy_level_id = hl.hierarchy_level_id
      WHERE e.employee_id = $1 AND e.organization_id = $2
    `, [employeeId, organizationId]);
    return {
      user_id: userId,
      role,
      email,
      organization_id: organizationId,
      attendance_enabled: attendanceEnabled,
      profile: res.rows[0] || null
    };
  }

  return {
    user_id: userId,
    role,
    email,
    profile: null
  };
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  updateUserPassword,
  updateUserLastLogin,
  incrementFailedLoginAttempts,
  lockUserUntil,
  clearFailedLoginAttempts,
  createOtp,
  findActiveOtps,
  markOtpAsUsed,
  incrementOtpAttempts,
  getUserProfileDetails,
  checkIsManager,
};
