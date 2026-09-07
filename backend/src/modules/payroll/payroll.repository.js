const { query } = require('../../config/db');

// --- Salary Structures ---
async function createSalaryStructure(organizationId, data, txClient = null) {
  const run = txClient || { query };
  const {
    structure_name,
    basic_salary,
    hra_amount,
    special_allowance_amount,
    travel_allowance_amount,
    medical_allowance_amount,
    benefits_amount,
    pf_amount,
    esi_amount,
    professional_tax,
    income_tax,
    created_by_admin_user_id
  } = data;

  const result = await run.query(`
    INSERT INTO salary_structures (
      organization_id, structure_name, basic_salary, hra_amount,
      special_allowance_amount, travel_allowance_amount, medical_allowance_amount,
      benefits_amount, pf_amount, esi_amount, professional_tax, income_tax,
      is_active, created_by_admin_user_id, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13, NOW(), NOW())
    RETURNING *
  `, [
    organizationId,
    structure_name.trim(),
    basic_salary,
    hra_amount,
    special_allowance_amount,
    travel_allowance_amount,
    medical_allowance_amount,
    benefits_amount || 0.00,
    pf_amount || 0.00,
    esi_amount || 0.00,
    professional_tax || 0.00,
    income_tax || 0.00,
    created_by_admin_user_id
  ]);
  return result.rows[0];
}

async function getSalaryStructures(organizationId) {
  const result = await query(`
    SELECT * FROM salary_structures
    WHERE organization_id = $1 AND is_active = true
    ORDER BY created_at DESC
  `, [organizationId]);
  return result.rows;
}

async function getSalaryStructureById(organizationId, id) {
  const result = await query(`
    SELECT * FROM salary_structures
    WHERE organization_id = $1 AND salary_structure_id = $2
  `, [organizationId, id]);
  return result.rows[0] || null;
}

async function updateSalaryStructure(organizationId, id, data) {
  const {
    structure_name,
    basic_salary,
    hra_amount,
    special_allowance_amount,
    travel_allowance_amount,
    medical_allowance_amount,
    benefits_amount,
    pf_amount,
    esi_amount,
    professional_tax,
    income_tax
  } = data;

  const result = await query(`
    UPDATE salary_structures SET
      structure_name = $1,
      basic_salary = $2,
      hra_amount = $3,
      special_allowance_amount = $4,
      travel_allowance_amount = $5,
      medical_allowance_amount = $6,
      benefits_amount = $7,
      pf_amount = $8,
      esi_amount = $9,
      professional_tax = $10,
      income_tax = $11,
      updated_at = NOW()
    WHERE organization_id = $12 AND salary_structure_id = $13
    RETURNING *
  `, [
    structure_name.trim(),
    basic_salary,
    hra_amount,
    special_allowance_amount,
    travel_allowance_amount,
    medical_allowance_amount,
    benefits_amount || 0.00,
    pf_amount || 0.00,
    esi_amount || 0.00,
    professional_tax || 0.00,
    income_tax || 0.00,
    organizationId,
    id
  ]);
  return result.rows[0];
}

// --- Salary Assignments ---
async function assignSalaryStructure(organizationId, data, txClient = null) {
  const run = txClient || { query };
  const {
    employee_id,
    salary_structure_id,
    effective_from,
    effective_to
  } = data;

  const result = await run.query(`
    INSERT INTO employee_salary_assignments (
      organization_id, employee_id, salary_structure_id, effective_from, effective_to, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING *
  `, [
    organizationId,
    employee_id,
    salary_structure_id,
    effective_from,
    effective_to || null
  ]);
  return result.rows[0];
}

async function getSalaryAssignmentsByEmployeeId(organizationId, employeeId) {
  const result = await query(`
    SELECT sa.*, ss.structure_name, ss.basic_salary, ss.hra_amount, ss.special_allowance_amount, ss.travel_allowance_amount, ss.medical_allowance_amount,
           ss.benefits_amount, ss.pf_amount, ss.esi_amount, ss.professional_tax, ss.income_tax
    FROM employee_salary_assignments sa
    JOIN salary_structures ss ON sa.salary_structure_id = ss.salary_structure_id
    WHERE sa.organization_id = $1 AND sa.employee_id = $2
    ORDER BY sa.effective_from DESC
  `, [organizationId, employeeId]);
  return result.rows;
}

async function getSalaryAssignmentsOverlapping(organizationId, employeeId, effectiveFrom, effectiveTo, txClient = null) {
  const run = txClient || { query };
  // Check for any assignment where effective_from <= effectiveTo AND (effective_to IS NULL OR effective_to >= effectiveFrom)
  const params = [organizationId, employeeId, effectiveFrom];
  let toFilter = 'AND (effective_to IS NULL OR effective_to >= $3)';
  if (effectiveTo) {
    params.push(effectiveTo);
    toFilter = 'AND effective_from <= $4 AND (effective_to IS NULL OR effective_to >= $3)';
  }

  const result = await run.query(`
    SELECT * FROM employee_salary_assignments
    WHERE organization_id = $1 AND employee_id = $2
    ${toFilter}
  `, params);
  return result.rows;
}

async function getActiveAssignmentForDate(organizationId, employeeId, date, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(`
    SELECT sa.*, ss.basic_salary, ss.hra_amount, ss.special_allowance_amount, ss.travel_allowance_amount, ss.medical_allowance_amount,
           ss.benefits_amount, ss.pf_amount, ss.esi_amount, ss.professional_tax, ss.income_tax
    FROM employee_salary_assignments sa
    JOIN salary_structures ss ON sa.salary_structure_id = ss.salary_structure_id
    WHERE sa.organization_id = $1
      AND sa.employee_id = $2
      AND sa.effective_from <= $3
      AND (sa.effective_to IS NULL OR sa.effective_to >= $3)
    LIMIT 1
  `, [organizationId, employeeId, date]);
  return result.rows[0] || null;
}

// --- Week Off Settings ---
async function getWeekOffToggles(organizationId, txClient = null) {
  const run = txClient || { query };
  const res = await run.query(`
    SELECT * FROM week_off_global_configs WHERE organization_id = $1
  `, [organizationId]);
  
  if (res.rows.length === 0) {
    // Seed default config
    const insertRes = await run.query(`
      INSERT INTO week_off_global_configs (organization_id, enable_generic_week_off, enable_department_week_off)
      VALUES ($1, true, false)
      RETURNING *
    `, [organizationId]);
    return insertRes.rows[0];
  }
  return res.rows[0];
}

async function updateWeekOffToggles(organizationId, toggles, txClient = null) {
  const run = txClient || { query };
  const { enable_generic_week_off, enable_department_week_off } = toggles;
  const res = await run.query(`
    INSERT INTO week_off_global_configs (organization_id, enable_generic_week_off, enable_department_week_off, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (organization_id) DO UPDATE SET
      enable_generic_week_off = EXCLUDED.enable_generic_week_off,
      enable_department_week_off = EXCLUDED.enable_department_week_off,
      updated_at = NOW()
    RETURNING *
  `, [organizationId, enable_generic_week_off, enable_department_week_off]);
  return res.rows[0];
}

async function listWeekOffSettings(organizationId, txClient = null) {
  const run = txClient || { query };
  
  // Fetch settings
  const settingsRes = await run.query(`
    SELECT s.*,
           d.name as department_name
    FROM week_off_settings s
    LEFT JOIN departments d ON s.scope_id = d.department_id AND s.scope = 'DEPARTMENT'
    WHERE s.organization_id = $1
    ORDER BY s.scope ASC, s.effective_from DESC
  `, [organizationId]);

  const settings = settingsRes.rows;
  if (settings.length === 0) return [];

  // Fetch days for each setting
  for (const s of settings) {
    const daysRes = await run.query(`
      SELECT * FROM week_off_days
      WHERE week_off_setting_id = $1
      ORDER BY weekday ASC, week_number ASC
    `, [s.week_off_setting_id]);
    s.days = daysRes.rows;
  }

  return settings;
}

async function getWeekOffSettingById(organizationId, settingId, txClient = null) {
  const run = txClient || { query };
  const res = await run.query(`
    SELECT * FROM week_off_settings
    WHERE organization_id = $1 AND week_off_setting_id = $2
  `, [organizationId, settingId]);
  
  const setting = res.rows[0];
  if (!setting) return null;

  const daysRes = await run.query(`
    SELECT * FROM week_off_days
    WHERE week_off_setting_id = $1
    ORDER BY weekday ASC, week_number ASC
  `, [settingId]);
  setting.days = daysRes.rows;

  return setting;
}

async function upsertWeekOffSetting(organizationId, payload, txClient = null) {
  const run = txClient || { query };
  const {
    week_off_setting_id,
    rule_name,
    scope,
    scope_id,
    effective_from,
    effective_to,
    is_enabled,
    days
  } = payload;

  let setting;

  if (week_off_setting_id) {
    // Update existing setting
    const res = await run.query(`
      UPDATE week_off_settings
      SET rule_name = $1,
          scope = $2,
          scope_id = $3,
          effective_from = $4,
          effective_to = $5,
          is_enabled = $6,
          updated_at = NOW()
      WHERE organization_id = $7 AND week_off_setting_id = $8
      RETURNING *
    `, [rule_name, scope, scope_id || null, effective_from, effective_to || null, is_enabled !== false, organizationId, week_off_setting_id]);
    setting = res.rows[0];

    // Delete existing days to recreate
    if (setting) {
      await run.query(`
        DELETE FROM week_off_days WHERE week_off_setting_id = $1
      `, [setting.week_off_setting_id]);
    }
  } else {
    // Cap overlapping active configs of the same scope if new config is active and open-ended
    if (is_enabled !== false && !effective_to) {
      await run.query(`
        UPDATE week_off_settings
        SET effective_to = ($1::date - INTERVAL '1 day')::date, updated_at = NOW()
        WHERE organization_id = $2 AND scope = $3 
          AND COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE($4, '00000000-0000-0000-0000-000000000000'::uuid)
          AND effective_to IS NULL AND effective_from < $1::date AND is_enabled = TRUE
      `, [effective_from, organizationId, scope, scope_id || null]);
    }

    // Insert new setting
    const res = await run.query(`
      INSERT INTO week_off_settings (
        organization_id, rule_name, scope, scope_id, effective_from, effective_to, is_enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [organizationId, rule_name, scope, scope_id || null, effective_from, effective_to || null, is_enabled !== false]);
    setting = res.rows[0];
  }

  if (!setting) {
    throw new Error('Failed to upsert week off setting.');
  }

  // Insert associated days
  if (Array.isArray(days) && days.length > 0) {
    for (const d of days) {
      await run.query(`
        INSERT INTO week_off_days (week_off_setting_id, weekday, week_number, off_type)
        VALUES ($1, $2, $3, $4)
      `, [setting.week_off_setting_id, d.weekday, d.week_number || 'ALL', d.off_type || 'FULL']);
    }
  }

  // Fetch full updated/inserted setting with days
  const finalSetting = await getWeekOffSettingById(organizationId, setting.week_off_setting_id, run);
  return finalSetting;
}

async function deleteWeekOffSetting(organizationId, settingId, txClient = null) {
  const run = txClient || { query };
  const res = await run.query(`
    DELETE FROM week_off_settings
    WHERE organization_id = $1 AND week_off_setting_id = $2
    RETURNING *
  `, [organizationId, settingId]);
  return res.rows[0] || null;
}

// --- Payroll Runs ---
async function createPayrollRun(organizationId, data, txClient = null) {
  const run = txClient || { query };
  const {
    payroll_month,
    payroll_year,
    payroll_start_date,
    payroll_end_date,
    generated_by_admin_user_id
  } = data;

  const result = await run.query(`
    INSERT INTO payroll_runs (
      organization_id, payroll_month, payroll_year, payroll_start_date, payroll_end_date,
      current_status, generated_by_admin_user_id, generated_at, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6, NOW(), NOW(), NOW())
    RETURNING *
  `, [
    organizationId,
    payroll_month,
    payroll_year,
    payroll_start_date,
    payroll_end_date,
    generated_by_admin_user_id
  ]);
  return result.rows[0];
}

async function getPayrollRuns(organizationId) {
  const result = await query(`
    SELECT r.*,
           CONCAT(u.email) AS generated_by_email,
           CONCAT(a.email) AS approved_by_email
    FROM payroll_runs r
    LEFT JOIN users u ON r.generated_by_admin_user_id = u.user_id
    LEFT JOIN users a ON r.approved_by_admin_user_id = a.user_id
    WHERE r.organization_id = $1
    ORDER BY r.payroll_year DESC, r.payroll_month DESC
  `, [organizationId]);
  return result.rows;
}

async function getPayrollRunById(organizationId, id, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(`
    SELECT r.*,
           CONCAT(u.email) AS generated_by_email,
           CONCAT(a.email) AS approved_by_email
    FROM payroll_runs r
    LEFT JOIN users u ON r.generated_by_admin_user_id = u.user_id
    LEFT JOIN users a ON r.approved_by_admin_user_id = a.user_id
    WHERE r.organization_id = $1 AND r.payroll_run_id = $2
  `, [organizationId, id]);
  return result.rows[0] || null;
}

async function getPayrollRunByMonthYear(organizationId, month, year, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(`
    SELECT * FROM payroll_runs
    WHERE organization_id = $1 AND payroll_month = $2 AND payroll_year = $3
  `, [organizationId, month, year]);
  return result.rows[0] || null;
}

async function updatePayrollRunStatus(id, status, userId, actionField, txClient = null) {
  const run = txClient || { query };
  let extraSet = '';
  const params = [status, id];
  if (actionField === 'approve') {
    extraSet = ', approved_by_admin_user_id = $3, approved_at = NOW()';
    params.push(userId);
  } else if (actionField === 'lock') {
    extraSet = ', locked_by_admin_user_id = $3, locked_at = NOW()';
    params.push(userId);
  }

  const result = await run.query(`
    UPDATE payroll_runs SET
      current_status = $1,
      updated_at = NOW()
      ${extraSet}
    WHERE payroll_run_id = $2
    RETURNING *
  `, params);
  return result.rows[0];
}

// --- Employee Payrolls ---
async function createEmployeePayroll(data, txClient = null) {
  const run = txClient || { query };
  const {
    payroll_run_id,
    employee_id,
    salary_structure_id,
    working_days,
    present_days,
    paid_leave_days,
    holiday_days,
    week_off_days,
    lop_days,
    lop_days_absence,
    lop_days_late,
    gross_salary,
    total_earnings,
    total_additions,
    total_deductions,
    net_salary,
    benefits_amount,
    pf_amount,
    esi_amount,
    professional_tax,
    income_tax
  } = data;

  const result = await run.query(`
    INSERT INTO employee_payrolls (
      payroll_run_id, employee_id, salary_structure_id, working_days, present_days,
      paid_leave_days, holiday_days, week_off_days, lop_days, lop_days_absence, lop_days_late, gross_salary,
      total_earnings, total_additions, total_deductions, net_salary, benefits_amount,
      pf_amount, esi_amount, professional_tax, income_tax, current_status, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'DRAFT', NOW(), NOW())
    ON CONFLICT (payroll_run_id, employee_id) DO UPDATE SET
      salary_structure_id = EXCLUDED.salary_structure_id,
      working_days = EXCLUDED.working_days,
      present_days = EXCLUDED.present_days,
      paid_leave_days = EXCLUDED.paid_leave_days,
      holiday_days = EXCLUDED.holiday_days,
      week_off_days = EXCLUDED.week_off_days,
      lop_days = EXCLUDED.lop_days,
      lop_days_absence = EXCLUDED.lop_days_absence,
      lop_days_late = EXCLUDED.lop_days_late,
      gross_salary = EXCLUDED.gross_salary,
      total_earnings = EXCLUDED.total_earnings,
      total_additions = EXCLUDED.total_additions,
      total_deductions = EXCLUDED.total_deductions,
      net_salary = EXCLUDED.net_salary,
      benefits_amount = EXCLUDED.benefits_amount,
      pf_amount = EXCLUDED.pf_amount,
      esi_amount = EXCLUDED.esi_amount,
      professional_tax = EXCLUDED.professional_tax,
      income_tax = EXCLUDED.income_tax,
      updated_at = NOW()
    RETURNING *
  `, [
    payroll_run_id,
    employee_id,
    salary_structure_id,
    working_days,
    present_days,
    paid_leave_days,
    holiday_days,
    week_off_days,
    lop_days,
    lop_days_absence || 0.00,
    lop_days_late || 0.00,
    gross_salary,
    total_earnings,
    total_additions,
    total_deductions,
    net_salary,
    benefits_amount || 0.00,
    pf_amount || 0.00,
    esi_amount || 0.00,
    professional_tax || 0.00,
    income_tax || 0.00
  ]);
  return result.rows[0];
}

async function updateEmployeePayrollLopDays(employeePayrollId, lopDays, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(`
    UPDATE employee_payrolls
    SET lop_days = $1, lop_days_absence = $1, lop_days_late = 0.00, updated_at = NOW()
    WHERE employee_payroll_id = $2
    RETURNING *
  `, [lopDays, employeePayrollId]);
  return result.rows[0] || null;
}

async function getEmployeePayrollsByRunId(runId) {
  const result = await query(`
    SELECT ep.*, e.first_name, e.last_name, e.employee_code, e.designation, ss.structure_name
    FROM employee_payrolls ep
    JOIN employees e ON ep.employee_id = e.employee_id
    LEFT JOIN salary_structures ss ON ep.salary_structure_id = ss.salary_structure_id
    WHERE ep.payroll_run_id = $1
    ORDER BY e.first_name ASC
  `, [runId]);
  return result.rows;
}

async function getEmployeePayrollById(id) {
  const result = await query(`
    SELECT ep.*, e.first_name, e.last_name, e.employee_code, e.designation, ss.structure_name,
           ss.basic_salary, ss.hra_amount, ss.special_allowance_amount, ss.travel_allowance_amount, ss.medical_allowance_amount,
           e.father_name, e.bank_name, e.bank_account_number, e.bank_ifsc, e.bank_account_holder,
           e.uan_number, e.esi_number, e.date_of_joining,
           r.payroll_month, r.payroll_year, r.payroll_start_date, r.payroll_end_date, d.name AS department_name
    FROM employee_payrolls ep
    JOIN employees e ON ep.employee_id = e.employee_id
    JOIN payroll_runs r ON ep.payroll_run_id = r.payroll_run_id
    LEFT JOIN salary_structures ss ON ep.salary_structure_id = ss.salary_structure_id
    LEFT JOIN departments d ON e.department_id = d.department_id
    WHERE ep.employee_payroll_id = $1
  `, [id]);
  return result.rows[0] || null;
}

async function updateEmployeePayrollsStatus(runId, status, txClient = null) {
  const run = txClient || { query };
  await run.query(`
    UPDATE employee_payrolls SET
      current_status = $1,
      updated_at = NOW()
    WHERE payroll_run_id = $2
  `, [status, runId]);
}

async function getEmployeePayrollsForEmployee(employeeId) {
  const result = await query(`
    SELECT ep.*, r.payroll_month, r.payroll_year, r.payroll_start_date, r.payroll_end_date, ss.structure_name
    FROM employee_payrolls ep
    JOIN payroll_runs r ON ep.payroll_run_id = r.payroll_run_id
    LEFT JOIN salary_structures ss ON ep.salary_structure_id = ss.salary_structure_id
    WHERE ep.employee_id = $1 AND ep.current_status IN ('APPROVED', 'LOCKED')
    ORDER BY r.payroll_year DESC, r.payroll_month DESC
  `, [employeeId]);
  return result.rows;
}

// --- Payroll Adjustments ---
async function createAdjustment(data, txClient = null) {
  const run = txClient || { query };
  const {
    employee_payroll_id,
    adjustment_type,
    adjustment_name,
    amount,
    remarks,
    created_by_admin_user_id
  } = data;

  const result = await run.query(`
    INSERT INTO payroll_adjustments (
      employee_payroll_id, adjustment_type, adjustment_name, amount, remarks, created_by_admin_user_id, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING *
  `, [
    employee_payroll_id,
    adjustment_type,
    adjustment_name.trim(),
    amount,
    remarks || null,
    created_by_admin_user_id
  ]);
  return result.rows[0];
}

async function deleteAdjustment(id, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(`
    DELETE FROM payroll_adjustments WHERE adjustment_id = $1 RETURNING *
  `, [id]);
  return result.rows[0] || null;
}

async function getAdjustmentsByRunId(runId) {
  const result = await query(`
    SELECT a.*, e.first_name, e.last_name, e.employee_code, ep.employee_id
    FROM payroll_adjustments a
    JOIN employee_payrolls ep ON a.employee_payroll_id = ep.employee_payroll_id
    JOIN employees e ON ep.employee_id = e.employee_id
    WHERE ep.payroll_run_id = $1
    ORDER BY a.created_at DESC
  `, [runId]);
  return result.rows;
}

async function getAdjustmentsByRunAndEmployee(runId, employeeId, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(`
    SELECT a.*
    FROM payroll_adjustments a
    JOIN employee_payrolls ep ON a.employee_payroll_id = ep.employee_payroll_id
    WHERE ep.payroll_run_id = $1 AND ep.employee_id = $2
  `, [runId, employeeId]);
  return result.rows;
}

// --- Payroll Run Logs ---
async function createRunLog(runId, action, userId, remarks, txClient = null) {
  const run = txClient || { query };
  await run.query(`
    INSERT INTO payroll_run_logs (payroll_run_id, action, action_taken_by, remarks, created_at)
    VALUES ($1, $2, $3, $4, NOW())
  `, [runId, action, userId, remarks || null]);
}

async function getRunLogs(runId) {
  const result = await query(`
    SELECT l.*, u.email AS action_taken_by_email
    FROM payroll_run_logs l
    LEFT JOIN users u ON l.action_taken_by = u.user_id
    WHERE l.payroll_run_id = $1
    ORDER BY l.created_at DESC
  `, [runId]);
  return result.rows;
}

// --- General DB Helpers ---
async function getAllEmployeesForOrg(organizationId) {
  const result = await query(`
    SELECT employee_id, first_name, last_name, employee_code, status, date_of_joining
    FROM employees
    WHERE organization_id = $1 AND status != 'terminated'
  `, [organizationId]);
  return result.rows;
}

async function getPunchesForEmployee(userId, startDate, endDate, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(`
    SELECT DISTINCT attendance_date
    FROM attendance_punches
    WHERE employee_id = $1
      AND attendance_date >= $2
      AND attendance_date <= $3
  `, [userId, startDate, endDate]);
  return result.rows;
}

// --- Dynamic Payroll Components ---
async function getPayrollComponents(organizationId, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(`
    SELECT * FROM payroll_components
    WHERE organization_id = $1
    ORDER BY display_order ASC, created_at DESC
  `, [organizationId]);
  return result.rows;
}

async function getPayrollComponentById(organizationId, id) {
  const result = await query(`
    SELECT * FROM payroll_components
    WHERE organization_id = $1 AND component_id = $2
  `, [organizationId, id]);
  return result.rows[0] || null;
}

async function createPayrollComponent(organizationId, data, txClient = null) {
  const run = txClient || { query };
  const {
    component_name,
    component_code,
    component_type,
    category,
    calculation_basis,
    reference_component_id,
    default_value,
    display_order,
    is_taxable,
    include_in_ctc,
    include_in_gross,
    is_mandatory,
    is_active
  } = data;
  const result = await run.query(`
    INSERT INTO payroll_components (
      organization_id, component_name, component_code, component_type,
      category, calculation_basis, reference_component_id, default_value,
      display_order, is_taxable, include_in_ctc, include_in_gross, is_mandatory, is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *
  `, [
    organizationId, component_name.trim(), component_code.toUpperCase().trim(), component_type,
    category || 'ALLOWANCE', calculation_basis, reference_component_id || null, default_value || 0,
    display_order || 0, !!is_taxable, !!include_in_ctc, !!include_in_gross, !!is_mandatory, is_active !== false
  ]);
  return result.rows[0];
}

async function updatePayrollComponent(organizationId, id, data) {
  const {
    component_name,
    component_code,
    component_type,
    category,
    calculation_basis,
    reference_component_id,
    default_value,
    display_order,
    is_taxable,
    include_in_ctc,
    include_in_gross,
    is_mandatory,
    is_active
  } = data;
  const result = await query(`
    UPDATE payroll_components SET
      component_name = $1,
      component_code = $2,
      component_type = $3,
      category = $4,
      calculation_basis = $5,
      reference_component_id = $6,
      default_value = $7,
      display_order = $8,
      is_taxable = $9,
      include_in_ctc = $10,
      include_in_gross = $11,
      is_mandatory = $12,
      is_active = $13,
      updated_at = NOW()
    WHERE organization_id = $14 AND component_id = $15
    RETURNING *
  `, [
    component_name.trim(), component_code.toUpperCase().trim(), component_type,
    category || 'ALLOWANCE', calculation_basis, reference_component_id || null, default_value || 0,
    display_order || 0, !!is_taxable, !!include_in_ctc, !!include_in_gross, !!is_mandatory, is_active !== false,
    organizationId, id
  ]);
  return result.rows[0];
}

async function deletePayrollComponent(organizationId, id) {
  const result = await query(`
    DELETE FROM payroll_components
    WHERE organization_id = $1 AND component_id = $2
    RETURNING *
  `, [organizationId, id]);
  return result.rows[0] || null;
}

// --- Employee Salary Configuration ---
async function getEmployeeSalaryConfigForDate(organizationId, employeeId, targetDate, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(`
    SELECT * FROM employee_salary_configs
    WHERE organization_id = $1 AND employee_id = $2
      AND $3::date >= effective_from
    ORDER BY effective_from DESC
    LIMIT 1
  `, [organizationId, employeeId, targetDate]);
  return result.rows[0] || null;
}

async function getEmployeeSalaryComponents(configId, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(`
    SELECT esc.*, pc.component_name, pc.component_code, pc.component_type, pc.category, pc.calculation_basis, pc.include_in_gross, pc.include_in_ctc
    FROM employee_salary_components esc
    JOIN payroll_components pc ON esc.component_id = pc.component_id
    WHERE esc.employee_salary_config_id = $1
    ORDER BY pc.display_order ASC
  `, [configId]);
  return result.rows;
}

async function saveEmployeeSalaryConfig(organizationId, employeeId, payload, txClient = null) {
  if (!employeeId || employeeId === 'undefined' || !/^[0-9a-fA-F-]{36}$/.test(String(employeeId))) {
    const ApiError = require('../../utils/apiError');
    const { STATUS_CODES } = require('../../constants/statusCodes');
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'A valid Employee ID (UUID) is required.');
  }
  const run = txClient || { query };
  const { salary_type, gross_salary, ctc_amount, effective_from, components } = payload;

  // 1. Auto-close any previous active configurations
  await run.query(`
    UPDATE employee_salary_configs
    SET effective_to = ($1::date - INTERVAL '1 day')::date, updated_at = NOW()
    WHERE organization_id = $2 AND employee_id = $3 AND effective_to IS NULL AND effective_from < $1::date
  `, [effective_from, organizationId, employeeId]);

  // 2. Insert parent config row
  const configRes = await run.query(`
    INSERT INTO employee_salary_configs (
      employee_id, organization_id, salary_type, gross_salary, ctc_amount, effective_from, effective_to
    )
    VALUES ($1, $2, $3, $4, $5, $6, null)
    RETURNING *
  `, [employeeId, organizationId, salary_type, gross_salary, ctc_amount, effective_from]);
  const config = configRes.rows[0];

  // 3. Insert component values
  for (const c of components) {
    await run.query(`
      INSERT INTO employee_salary_components (
        employee_salary_config_id, component_id, percentage, fixed_amount, calculated_amount, is_manual, is_manual_override, manual_amount
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      config.employee_salary_config_id,
      c.component_id,
      c.percentage || null,
      c.fixed_amount || null,
      c.calculated_amount || 0.00,
      !!c.is_manual,
      !!c.is_manual_override,
      c.manual_amount !== undefined ? c.manual_amount : null
    ]);
  }

  return config;
}

// --- Payslip components snapshot ---
async function createEmployeePayrollComponent(data, txClient = null) {
  const run = txClient || { query };
  const { employee_payroll_id, component_id, component_name, component_code, component_type, category, calculated_amount, actual_amount } = data;
  const result = await run.query(`
    INSERT INTO employee_payroll_components (
      employee_payroll_id, component_id, component_name, component_code, component_type, category, calculated_amount, actual_amount
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [employee_payroll_id, component_id, component_name, component_code, component_type, category, calculated_amount, actual_amount]);
  return result.rows[0];
}

async function getEmployeePayrollComponentsByPayrollId(payrollId) {
  const result = await query(`
    SELECT * FROM employee_payroll_components
    WHERE employee_payroll_id = $1
    ORDER BY created_at ASC
  `, [payrollId]);
  return result.rows;
}

module.exports = {
  createSalaryStructure,
  getSalaryStructures,
  getSalaryStructureById,
  updateSalaryStructure,
  assignSalaryStructure,
  getSalaryAssignmentsByEmployeeId,
  getSalaryAssignmentsOverlapping,
  getActiveAssignmentForDate,
  getWeekOffToggles,
  updateWeekOffToggles,
  listWeekOffSettings,
  getWeekOffSettingById,
  upsertWeekOffSetting,
  deleteWeekOffSetting,
  createPayrollRun,
  getPayrollRuns,
  getPayrollRunById,
  getPayrollRunByMonthYear,
  updatePayrollRunStatus,
  createEmployeePayroll,
  updateEmployeePayrollLopDays,
  getEmployeePayrollsByRunId,
  getEmployeePayrollById,
  updateEmployeePayrollsStatus,
  getEmployeePayrollsForEmployee,
  createAdjustment,
  deleteAdjustment,
  getAdjustmentsByRunId,
  getAdjustmentsByRunAndEmployee,
  createRunLog,
  getRunLogs,
  getAllEmployeesForOrg,
  getPunchesForEmployee,
  getPayrollComponents,
  getPayrollComponentById,
  createPayrollComponent,
  updatePayrollComponent,
  deletePayrollComponent,
  getEmployeeSalaryConfigForDate,
  getEmployeeSalaryComponents,
  saveEmployeeSalaryConfig,
  createEmployeePayrollComponent,
  getEmployeePayrollComponentsByPayrollId,
};
