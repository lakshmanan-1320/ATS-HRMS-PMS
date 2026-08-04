const employeeRepository = require('./employee.repository');
const { mapEmployee } = require('./employee.mapper');
const { nextCode, wouldCreateCycle } = require('../../utils/helpers');
const { query, withTransaction } = require('../../config/db');
const { hashPassword } = require('../../utils/hash');
const crypto = require('crypto');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');
const { provisionLeaveBalancesForNewEmployee } = require('../leave/leave.service');

async function determineRole(designation, hierarchyLevelId, client) {
  let role = 'employee';
  let checkDesignation = designation || '';
  let levelDesignation = '';
  let levelCode = '';

  if (hierarchyLevelId) {
    const levelRes = await client.query(
      'SELECT designation, level_code FROM hierarchy_levels WHERE hierarchy_level_id = $1',
      [hierarchyLevelId]
    );
    if (levelRes.rows.length) {
      levelDesignation = levelRes.rows[0].designation || '';
      levelCode = levelRes.rows[0].level_code || '';
    }
  }

  const lowerDes = checkDesignation.toLowerCase();
  const lowerLvlDes = levelDesignation.toLowerCase();
  const lowerCode = levelCode.toLowerCase();

  if (lowerDes.includes('hr') || lowerDes.includes('human resource') || lowerLvlDes.includes('hr') || /\bhr\b/i.test(levelCode)) {
    role = 'hr';
  } else if (
    lowerDes.includes('manager') ||
    lowerDes.includes('director') ||
    lowerDes.includes('ceo') ||
    lowerDes.includes('vp') ||
    lowerDes.includes('chief') ||
    lowerDes.includes('lead') ||
    lowerDes.includes('head') ||
    lowerLvlDes.includes('manager') ||
    lowerLvlDes.includes('director') ||
    lowerLvlDes.includes('ceo') ||
    lowerLvlDes.includes('vp') ||
    lowerLvlDes.includes('chief') ||
    lowerLvlDes.includes('lead') ||
    lowerLvlDes.includes('head') ||
    /\b(l1|l2|l3)\b/i.test(levelCode) ||
    lowerCode.includes('manager') ||
    lowerCode.includes('director') ||
    lowerCode.includes('ceo') ||
    lowerCode.includes('vp') ||
    lowerCode.includes('lead')
  ) {
    role = 'manager';
  }

  return role;
}

async function listEmployees(organizationId, filter) {
  const rows = await employeeRepository.getEmployees(organizationId, filter);
  return rows.map(mapEmployee);
}

async function getEmployee(organizationId, id) {
  const row = await employeeRepository.getDetailedEmployeeById(organizationId, id);
  if (!row) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Employee not found.');
  return mapEmployee(row);
}

async function getOrgChart(organizationId) {
  const rows = await employeeRepository.getOrgChart(organizationId);
  return rows.map(mapEmployee);
}

async function getNextCode(organizationId) {
  const code = await nextCode(null, organizationId);
  return code;
}

async function addEmployee(organizationId, data) {
  const {
    employee_code, first_name, last_name, email, phone,
    gender, date_of_birth, date_of_joining,
    department_id, designation, employment_type, status, manager_id, secondary_manager_id,
    hierarchy_level_id,
    father_name, mother_name, blood_group, emergency_contact,
    bank_name, bank_account_number, bank_ifsc, bank_account_holder,
    login_password,
    salary_structure_id, uan_number, esi_number,
    attendance_policy_id,
  } = data;

  let code = employee_code?.trim();
  if (!code) code = await nextCode(null, organizationId);

  const codeExists = await employeeRepository.getEmployeeByCode(organizationId, code);
  if (codeExists) {
    throw new ApiError(STATUS_CODES.CONFLICT, `Employee code "${code}" is already in use.`);
  }

  if (email?.trim()) {
    const emailExists = await employeeRepository.getEmployeeByEmail(organizationId, email.trim());
    if (emailExists) {
      throw new ApiError(STATUS_CODES.CONFLICT, 'An employee with this email already exists.');
    }
  }

  const tempPassword = login_password?.trim() || ('Pms@' + crypto.randomInt(100000, 999999).toString());
  const passwordHash = await hashPassword(tempPassword);

  const row = await withTransaction(async (client) => {
    // 1. Create employee
    const newEmp = await employeeRepository.createEmployee(organizationId, {
      employee_code: code,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      gender: gender || null,
      date_of_birth: date_of_birth || null,
      date_of_joining: date_of_joining || null,
      department_id: department_id || null,
      designation: designation?.trim() || null,
      employment_type: employment_type || 'full_time',
      status: status || 'active',
      manager_id: manager_id || null,
      secondary_manager_id: secondary_manager_id || null,
      hierarchy_level_id: hierarchy_level_id || null,
      father_name: father_name?.trim() || null,
      mother_name: mother_name?.trim() || null,
      blood_group: blood_group || null,
      emergency_contact: emergency_contact?.trim() || null,
      bank_name: bank_name?.trim() || null,
      bank_account_number: bank_account_number?.trim() || null,
      bank_ifsc: bank_ifsc?.trim().toUpperCase() || null,
      bank_account_holder: bank_account_holder?.trim() || null,
      uan_number: uan_number?.trim() || null,
      esi_number: esi_number?.trim() || null,
      attendance_policy_id: attendance_policy_id || null,
    }, client);

    // 1.1 Insert assignment record if policy is set
    if (attendance_policy_id) {
      await client.query(
        `INSERT INTO attendance_policy_assignments (policy_id, employee_id, assignment_type, effective_from)
         VALUES ($1, $2, 'EMPLOYEE', CURRENT_DATE)`,
        [attendance_policy_id, newEmp.employee_id]
      );
    }

    // 2. Create user login if email is provided
    if (email?.trim()) {
      const role = await determineRole(designation, hierarchy_level_id, client);

      await client.query(
        `INSERT INTO users (
          organization_id, employee_id, email, password_hash, role, is_active, attendance_enabled, password_reset_required
        ) VALUES ($1, $2, $3, $4, $5, true, true, true)`,
        [organizationId, newEmp.employee_id, email.toLowerCase().trim(), passwordHash, role]
      );
    }

    // 3. Assign Salary Structure
    if (salary_structure_id) {
      const { assignSalaryStructure } = require('../payroll/payroll.repository');
      await assignSalaryStructure(organizationId, {
        employee_id: newEmp.employee_id,
        salary_structure_id,
        effective_from: date_of_joining || new Date().toISOString().split('T')[0],
        effective_to: null,
      }, client);
    }

    // 4. Auto-provision leave balances (pro-rata if joining mid-year)
    try {
      await provisionLeaveBalancesForNewEmployee(newEmp.employee_id, date_of_joining, client);
    } catch (leaveErr) {
      console.warn('[Leave] Balance provisioning skipped for new employee:', leaveErr.message);
    }

    // 5. Auto-provision permission balance (pro-rata for joining month)
    try {
      const { provisionPermissionsForNewEmployee } = require('../permission/permission.service');
      await provisionPermissionsForNewEmployee(newEmp.employee_id, date_of_joining, client);
    } catch (permErr) {
      console.warn('[Permission] Balance provisioning skipped for new employee:', permErr.message);
    }

    return newEmp;
  });

  // 3. Send temporary password email after transaction commit
  if (email?.trim()) {
    try {
      const { emailService } = require('../notification');
      await emailService.sendTemporaryPasswordEmail(email.toLowerCase().trim(), tempPassword);
      console.log(`✉️ Temporary password email sent to ${email} (Password: ${tempPassword})`);
    } catch (err) {
      console.warn(`⚠️ Failed to send temporary password email to ${email}:`, err.message);
    }
  }

  const detailed = await employeeRepository.getDetailedEmployeeById(organizationId, row.employee_id);
  const result = mapEmployee(detailed);
  if (email?.trim()) result.tempPassword = tempPassword; // Expose first-login password in result
  return result;
}

async function editEmployee(organizationId, id, data) {
  const {
    employee_code, first_name, last_name, email, phone,
    gender, date_of_birth, date_of_joining,
    department_id, designation, employment_type, status, manager_id, secondary_manager_id,
    hierarchy_level_id,
    father_name, mother_name, blood_group, emergency_contact,
    bank_name, bank_account_number, bank_ifsc, bank_account_holder,
    uan_number, esi_number,
    attendance_policy_id,
  } = data;

  const detailedCurrent = await employeeRepository.getDetailedEmployeeById(organizationId, id);
  if (!detailedCurrent) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Employee not found.');
  }
  const previousPolicyId = detailedCurrent.attendance_policy_id;

  const codeExists = await employeeRepository.getEmployeeByCodeExcludingId(organizationId, employee_code.trim(), id);
  if (codeExists) {
    throw new ApiError(STATUS_CODES.CONFLICT, `Employee code "${employee_code.trim()}" is already in use.`);
  }

  if (email?.trim()) {
    const emailExists = await employeeRepository.getEmployeeByEmailExcludingId(organizationId, email.trim(), id);
    if (emailExists) {
      throw new ApiError(STATUS_CODES.CONFLICT, 'Another employee already uses this email.');
    }
  }

  if (manager_id && await wouldCreateCycle(null, organizationId, id, manager_id)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'This manager assignment would create a circular reporting chain.');
  }

  if (secondary_manager_id && secondary_manager_id === id) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'An employee cannot be their own secondary manager.');
  }

  let tempPassword = null;

  const row = await withTransaction(async (client) => {
    // 1. Update employee
    const updated = await employeeRepository.updateEmployee(organizationId, id, {
      employee_code: employee_code.trim(),
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      gender: gender || null,
      date_of_birth: date_of_birth || null,
      date_of_joining: date_of_joining || null,
      department_id: department_id || null,
      designation: designation?.trim() || null,
      employment_type: employment_type || 'full_time',
      status: status || 'active',
      manager_id: manager_id || null,
      secondary_manager_id: secondary_manager_id || null,
      hierarchy_level_id: hierarchy_level_id || null,
      father_name: father_name?.trim() || null,
      mother_name: mother_name?.trim() || null,
      blood_group: blood_group || null,
      emergency_contact: emergency_contact?.trim() || null,
      bank_name: bank_name?.trim() || null,
      bank_account_number: bank_account_number?.trim() || null,
      bank_ifsc: bank_ifsc?.trim().toUpperCase() || null,
      bank_account_holder: bank_account_holder?.trim() || null,
      uan_number: uan_number?.trim() || null,
      esi_number: esi_number?.trim() || null,
      attendance_policy_id: attendance_policy_id || null,
    }, client);

    // 1.1 Handle assignment change tracking
    const updatedPolicyId = attendance_policy_id || null;
    const previousPolicyIdStr = previousPolicyId ? String(previousPolicyId) : null;
    const updatedPolicyIdStr = updatedPolicyId ? String(updatedPolicyId) : null;
    
    if (updatedPolicyIdStr !== previousPolicyIdStr) {
      if (updatedPolicyId) {
        await client.query(
          `INSERT INTO attendance_policy_assignments (policy_id, employee_id, assignment_type, effective_from)
           VALUES ($1, $2, 'EMPLOYEE', CURRENT_DATE)`,
          [updatedPolicyId, id]
        );
      }
    }

    // 2. Sync credentials
    if (email?.trim()) {
      const role = await determineRole(designation, hierarchy_level_id, client);

      const userRes = await client.query('SELECT user_id FROM users WHERE organization_id = $1 AND employee_id = $2', [organizationId, id]);
      if (!userRes.rows.length) {
        tempPassword = 'Pms@' + crypto.randomInt(100000, 999999).toString();
        const passwordHash = await hashPassword(tempPassword);
        await client.query(
          `INSERT INTO users (
            organization_id, employee_id, email, password_hash, role, is_active, attendance_enabled, password_reset_required
          ) VALUES ($1, $2, $3, $4, $5, true, true, true)`,
          [organizationId, id, email.toLowerCase().trim(), passwordHash, role]
        );
      } else {
        await client.query(
          'UPDATE users SET email = $1, role = $2 WHERE organization_id = $3 AND employee_id = $4',
          [email.toLowerCase().trim(), role, organizationId, id]
        );
      }
    } else {
      // If email removed, delete user account
      await client.query('DELETE FROM users WHERE organization_id = $1 AND employee_id = $2', [organizationId, id]);
    }

    return updated;
  });

  // 3. Send temporary password email after transaction commit if created on update
  if (tempPassword && email?.trim()) {
    try {
      const { emailService } = require('../notification');
      await emailService.sendTemporaryPasswordEmail(email.toLowerCase().trim(), tempPassword);
    } catch (err) {
      console.warn(`⚠️ Failed to send temporary password email to ${email}:`, err.message);
    }
  }

  const detailed = await employeeRepository.getDetailedEmployeeById(organizationId, id);
  const result = mapEmployee(detailed);
  if (tempPassword) result.tempPassword = tempPassword;
  return result;
}

async function changeEmployeeStatus(organizationId, id, status) {
  const VALID = ['active', 'inactive', 'on_leave', 'terminated', 'exit'];
  if (!VALID.includes(status)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Invalid status.');
  }

  const row = await withTransaction(async (client) => {
    const updated = await employeeRepository.updateEmployeeStatus(organizationId, id, status, client);
    if (!updated) {
      throw new ApiError(STATUS_CODES.NOT_FOUND, 'Employee not found.');
    }

    // Sync status with user credentials
    await client.query(
      'UPDATE users SET is_active = $1 WHERE organization_id = $2 AND employee_id = $3',
      [status === 'active', organizationId, id]
    );

    return updated;
  });

  return mapEmployee(row);
}

async function bulkImportEmployees(organizationId, rows) {
  if (!Array.isArray(rows) || !rows.length) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'No rows provided.');
  }

  // Pre-load departments for name→id lookup
  const deptResult = await query(
    'SELECT department_id, name FROM departments WHERE organization_id=$1 AND parent_id IS NULL',
    [organizationId]
  );
  const deptMap = {};
  for (const d of deptResult.rows) deptMap[d.name.toLowerCase().trim()] = d.department_id;

  // Pre-load active salary structures for name→id lookup
  const structResult = await query(
    'SELECT salary_structure_id, structure_name FROM salary_structures WHERE organization_id=$1 AND is_active=true',
    [organizationId]
  );
  const structMap = {};
  for (const s of structResult.rows) structMap[s.structure_name.toLowerCase().trim()] = s.salary_structure_id;

  let imported = 0;
  const errors = [];
  const credentials = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 2;
    
    // Support unified employee_name or separate first/last names
    const nameVal = (r.employee_name || r.name || '').trim();
    let firstName = (r.first_name || r['first name'] || '').trim();
    let lastName = (r.last_name || r['last name'] || '').trim();

    if (!firstName && nameVal) {
      const nameParts = nameVal.split(/\s+/);
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || 'Employee';
    }

    const email = (r.email || '').trim() || null;
    const phone = (r.phone || '').trim() || null;
    const gender = (r.gender || '').trim() || null;
    const dob = (r.date_of_birth || r['date of birth (yyyy-mm-dd)'] || '').trim() || null;
    const doj = (r.date_of_joining || r['date of joining (yyyy-mm-dd)'] || '').trim() || null;
    const deptName = (r.department || '').trim().toLowerCase();
    const designation = (r.designation || '').trim() || null;
    const rawType = (r.employment_type || r['employment type (full_time/part_time/contract/intern)'] || 'full_time').trim().toLowerCase();
    const VALID_TYPES = ['full_time', 'part_time', 'contract', 'intern'];
    const empType = VALID_TYPES.includes(rawType) ? rawType : 'full_time';

    const rawStruct = (r.salary_structure || r['salary_structure'] || '').trim().toLowerCase();

    if (!firstName) { errors.push({ row: rowNum, reason: 'First name / Employee name is required.' }); continue; }
    if (!lastName) { errors.push({ row: rowNum, reason: 'Last name is required.' }); continue; }

    const deptId = deptName ? (deptMap[deptName] || null) : null;
    if (deptName && !deptId) {
      errors.push({ row: rowNum, reason: `Department "${r.department}" not found — row imported without department.` });
    }

    const structId = rawStruct ? (structMap[rawStruct] || null) : null;
    if (rawStruct && !structId) {
      errors.push({ row: rowNum, reason: `Salary structure "${r.salary_structure}" not found — row imported without salary structure.` });
    }

    try {
      let code = (r.employee_code || r['employee code'] || '').trim();
      if (!code) {
        code = await nextCode(null, organizationId);
      } else {
        const codeExists = await employeeRepository.getEmployeeByCode(organizationId, code);
        if (codeExists) {
          errors.push({ row: rowNum, reason: `Employee code "${code}" already exists.` });
          continue;
        }
      }

      if (email) {
        const emailExists = await employeeRepository.getEmployeeByEmail(organizationId, email);
        if (emailExists) {
          errors.push({ row: rowNum, reason: `Email "${email}" already exists.` });
          continue;
        }
      }

      await withTransaction(async (client) => {
        const newEmpRes = await client.query(`
          INSERT INTO employees
            (organization_id, employee_code, first_name, last_name, email, phone,
             gender, date_of_birth, date_of_joining, department_id, designation, employment_type)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
          RETURNING employee_id
        `, [organizationId, code, firstName, lastName, email, phone, gender, dob || null, doj || null, deptId, designation, empType]);

        const employeeId = newEmpRes.rows[0].employee_id;

        if (email) {
          const tempPassword = 'Pms@' + crypto.randomInt(100000, 999999).toString();
          const passwordHash = await hashPassword(tempPassword);
          const role = await determineRole(designation, null, client);

          await client.query(
            `INSERT INTO users (
              organization_id, employee_id, email, password_hash, role, is_active, attendance_enabled, password_reset_required
            ) VALUES ($1, $2, $3, $4, $5, true, true, true)`,
            [organizationId, employeeId, email.toLowerCase().trim(), passwordHash, role]
          );

          credentials.push({
            row: rowNum,
            employeeCode: code,
            name: `${firstName} ${lastName}`,
            email: email.toLowerCase().trim(),
            tempPassword,
            emailSent: false,
          });
        }

        // Assign Salary Structure if mapped
        if (structId) {
          const { assignSalaryStructure } = require('../payroll/payroll.repository');
          await assignSalaryStructure(organizationId, {
            employee_id: employeeId,
            salary_structure_id: structId,
            effective_from: doj || new Date().toISOString().split('T')[0],
            effective_to: null,
          }, client);
        }

        // Auto-provision leave balances
        try {
          await provisionLeaveBalancesForNewEmployee(employeeId, doj, client);
        } catch (leaveErr) {
          console.warn('[Leave] Balance provisioning skipped for imported employee:', leaveErr.message);
        }

        // Auto-provision permission balance
        try {
          const { provisionPermissionsForNewEmployee } = require('../permission/permission.service');
          await provisionPermissionsForNewEmployee(employeeId, doj, client);
        } catch (permErr) {
          console.warn('[Permission] Balance provisioning skipped for imported employee:', permErr.message);
        }
      });

      imported++;
    } catch (err) {
      errors.push({ row: rowNum, reason: err.message });
    }
  }

  for (const credential of credentials) {
    try {
      const { emailService } = require('../notification');
      await emailService.sendTemporaryPasswordEmail(credential.email, credential.tempPassword);
      credential.emailSent = true;
    } catch (err) {
      credential.emailError = err.message;
      console.warn(`Failed to send temporary password email to ${credential.email}:`, err.message);
    }
  }

  return { imported, skipped: errors.length, errors, credentials };
}

async function resetEmployeePassword(organizationId, id) {
  const userRes = await query(
    'SELECT user_id, email FROM users WHERE organization_id = $1 AND employee_id = $2',
    [organizationId, id]
  );
  if (!userRes.rows.length) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'No login account exists for this employee. Add an email first.');
  }

  const { user_id, email } = userRes.rows[0];
  const tempPassword = 'Pms@' + crypto.randomInt(100000, 999999).toString();
  const passwordHash = await hashPassword(tempPassword);

  await query(
    'UPDATE users SET password_hash = $1, password_reset_required = true WHERE user_id = $2',
    [passwordHash, user_id]
  );

  try {
    const { emailService } = require('../notification');
    await emailService.sendTemporaryPasswordEmail(email, tempPassword);
  } catch (err) {
    console.warn(`⚠️ Failed to send password reset email to ${email}:`, err.message);
  }

  const emp = await employeeRepository.getDetailedEmployeeById(organizationId, id);
  const result = mapEmployee(emp);
  result.tempPassword = tempPassword;
  return result;
}

async function listManagers(organizationId, filter = {}) {
  return await employeeRepository.getManagers(organizationId, filter);
}

module.exports = {
  listEmployees,
  getEmployee,
  getOrgChart,
  getManagers: listManagers,
  listManagers,
  getNextCode,
  addEmployee,
  editEmployee,
  changeEmployeeStatus,
  bulkImportEmployees,
  resetEmployeePassword,
};
