const clientAdminRepository = require('./clientAdmin.repository');
const { mapClientAdmin } = require('./clientAdmin.mapper');
const { hashPassword } = require('../../utils/hash');
const { withTransaction } = require('../../config/db');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');

async function listClientAdmins() {
  const rows = await clientAdminRepository.getClientAdmins();
  return rows.map(mapClientAdmin);
}

async function addClientAdmin(data) {
  const { organization_id: inputOrgId, full_name, email, phone, company_name, password, notes, created_by } = data;

  if (!full_name || !email || !password) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Full name, email, and password are required.');
  }
  if (password.length < 8) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Password must be at least 8 characters.');
  }

  const exists = await clientAdminRepository.getClientAdminByEmail(email.toLowerCase().trim());
  if (exists) {
    throw new ApiError(STATUS_CODES.CONFLICT, 'A client admin with this email already exists.');
  }

  const password_hash = await hashPassword(password);

  const row = await withTransaction(async (client) => {
    let organization_id = inputOrgId;
    let companyNameResolved = company_name ? company_name.trim() : null;

    if (!organization_id) {
      // 1. Create organization record with default timeout settings
      const orgResult = await client.query(
        `INSERT INTO organizations (
          name, idle_session_timeout_minutes, warn_before_expiry_minutes, absolute_timeout_hours, extend_on_activity
         ) VALUES ($1, 15, 2, 8, true) 
         RETURNING organization_id, name`,
        [companyNameResolved || `${full_name.trim()}'s Organization`]
      );
      organization_id = orgResult.rows[0].organization_id;
      companyNameResolved = orgResult.rows[0].name;
    } else {
      const orgResult = await client.query('SELECT name FROM organizations WHERE organization_id = $1', [organization_id]);
      if (orgResult.rows[0]) {
        companyNameResolved = orgResult.rows[0].name;
      }
    }

    // 2. Create client admin profile
    const clientAdmin = await clientAdminRepository.createClientAdmin({
      organization_id,
      full_name: full_name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || null,
      company_name: companyNameResolved,
      notes: notes || null,
      created_by,
    }, client);

    // 3. Create user credentials record
    await client.query(
      `INSERT INTO users (
        organization_id, email, password_hash, role, is_active, password_reset_required
      ) VALUES ($1, $2, $3, 'client_admin', true, true)`,
      [organization_id, email.toLowerCase().trim(), password_hash]
    );

    // 4. Seed default modules
    const defaultModules = [
      { key: 'goals',       name: 'Goals Management' },
      { key: 'performance', name: 'Performance Appraisal' },
      { key: 'leave',       name: 'Leave Management' },
      { key: 'payroll',     name: 'Payroll' },
      { key: 'attendance',  name: 'Attendance Tracking' },
    ];
    const placeholders = defaultModules.map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3}, true)`).join(', ');
    const values = [clientAdmin.client_admin_id];
    defaultModules.forEach(m => values.push(m.key, m.name));
    await client.query(
      `INSERT INTO client_modules (client_admin_id, module_key, module_name, is_enabled)
       VALUES ${placeholders}
       ON CONFLICT (client_admin_id, module_key) DO NOTHING`,
      values
    );

    return { ...clientAdmin, company_name: companyNameResolved, organization_name: companyNameResolved };
  });

  return mapClientAdmin(row);
}

async function editClientAdmin(id, data) {
  const { full_name, email, phone, company_name, password, notes } = data;

  if (!full_name || !email) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Full name and email are required.');
  }

  const exists = await clientAdminRepository.getClientAdminByEmailExcludingId(email.toLowerCase().trim(), id);
  if (exists) {
    throw new ApiError(STATUS_CODES.CONFLICT, 'Another client admin with this email already exists.');
  }

  const row = await withTransaction(async (client) => {
    const current = await clientAdminRepository.findClientAdminById(id);
    if (!current) {
      throw new ApiError(STATUS_CODES.NOT_FOUND, 'Client admin not found.');
    }

    // 1. Update client admin profile
    const updated = await clientAdminRepository.updateClientAdmin(id, {
      full_name: full_name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || null,
      company_name: company_name ? company_name.trim() : null,
      notes: notes || null,
    }, client);

    // 2. Update user email/password in users table
    if (password && password.trim()) {
      if (password.length < 8) {
        throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Password must be at least 8 characters.');
      }
      const password_hash = await hashPassword(password);
      await client.query(
        `UPDATE users SET email = $1, password_hash = $2, password_reset_required = true, updated_at = NOW() 
         WHERE organization_id = $3 AND role = 'client_admin'`,
        [email.toLowerCase().trim(), password_hash, current.organization_id]
      );
    } else {
      await client.query(
        `UPDATE users SET email = $1, updated_at = NOW() 
         WHERE organization_id = $2 AND role = 'client_admin'`,
        [email.toLowerCase().trim(), current.organization_id]
      );
    }

    // 3. Update organization name if company_name updated
    if (company_name && company_name.trim()) {
      await client.query(
        'UPDATE organizations SET name = $1, updated_at = NOW() WHERE organization_id = $2',
        [company_name.trim(), current.organization_id]
      );
    }

    return updated;
  });

  return mapClientAdmin(row);
}

async function changeClientAdminStatus(id, status) {
  const allowed = ['active', 'inactive', 'suspended'];
  if (!allowed.includes(status)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Status must be active, inactive, or suspended.');
  }

  const row = await withTransaction(async (client) => {
    const updated = await clientAdminRepository.updateClientAdminStatus(id, status, client);
    if (!updated) {
      throw new ApiError(STATUS_CODES.NOT_FOUND, 'Client admin not found.');
    }

    await client.query(
      `UPDATE users SET is_active = $1, updated_at = NOW() 
       WHERE organization_id = $2 AND role = 'client_admin'`,
      [status === 'active', updated.organization_id]
    );

    return updated;
  });

  // Fetch updated profile
  const fullProfile = await clientAdminRepository.findClientAdminById(id);
  return mapClientAdmin(fullProfile);
}

async function changeClientAdminGoalMode(id, goal_mode) {
  const valid = ['top_down', 'bottom_up', 'hybrid']
  if (!valid.includes(goal_mode)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'goal_mode must be top_down, bottom_up, or hybrid.')
  }
  const row = await clientAdminRepository.updateClientAdminGoalMode(id, goal_mode)
  if (!row) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Client admin not found.')
  return row
}

async function getGoalConfig(id) {
  const row = await clientAdminRepository.getGoalConfig(id);
  if (!row) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Client admin not found.');
  return row;
}

async function updateGoalConfig(id, config) {
  const { allow_employee_goal, allow_manager_goal, allow_admin_goal } = config;
  if (
    typeof allow_employee_goal !== 'boolean' ||
    typeof allow_manager_goal  !== 'boolean' ||
    typeof allow_admin_goal    !== 'boolean'
  ) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'All goal config fields must be boolean.');
  }
  const row = await clientAdminRepository.updateGoalConfig(id, { allow_employee_goal, allow_manager_goal, allow_admin_goal });
  if (!row) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Client admin not found.');
  return row;
}

async function removeClientAdmin(id) {
  const row = await clientAdminRepository.deleteClientAdmin(id);
  if (!row) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Client admin not found.');
  }
  return true;
}

async function listCompanies() {
  return await clientAdminRepository.getCompanies();
}

async function addCompany(data) {
  const { name, idle_session_timeout_minutes, warn_before_expiry_minutes, absolute_timeout_hours, extend_on_activity } = data;
  if (!name || !name.trim()) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Company name is required.');
  }
  const timeoutConfig = {
    idle_session_timeout_minutes: idle_session_timeout_minutes !== undefined ? parseInt(idle_session_timeout_minutes, 10) : undefined,
    warn_before_expiry_minutes: warn_before_expiry_minutes !== undefined ? parseInt(warn_before_expiry_minutes, 10) : undefined,
    absolute_timeout_hours: absolute_timeout_hours !== undefined ? parseInt(absolute_timeout_hours, 10) : undefined,
    extend_on_activity: extend_on_activity !== undefined ? !!extend_on_activity : undefined,
  };
  return await clientAdminRepository.createCompany(name, timeoutConfig);
}

async function removeCompany(id) {
  const row = await clientAdminRepository.deleteCompany(id);
  if (!row) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Company not found.');
  }
  return true;
}

module.exports = {
  listClientAdmins,
  addClientAdmin,
  editClientAdmin,
  changeClientAdminStatus,
  changeClientAdminGoalMode,
  getGoalConfig,
  updateGoalConfig,
  removeClientAdmin,
  listCompanies,
  addCompany,
  removeCompany,
};
