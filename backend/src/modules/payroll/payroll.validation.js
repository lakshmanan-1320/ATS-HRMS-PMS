function createSalaryStructureSchema(body) {
  const {
    structure_name,
    basic_salary,
    hra_amount,
    special_allowance_amount,
    travel_allowance_amount,
    medical_allowance_amount
  } = body;

  if (!structure_name || !structure_name.trim()) {
    return { error: 'Structure name is required.' };
  }

  const basic = parseFloat(basic_salary);
  if (isNaN(basic) || basic < 0) {
    return { error: 'Basic salary must be a non-negative number.' };
  }

  const hra = parseFloat(hra_amount);
  if (isNaN(hra) || hra < 0) {
    return { error: 'HRA amount must be a non-negative number.' };
  }

  const spec = parseFloat(special_allowance_amount);
  if (isNaN(spec) || spec < 0) {
    return { error: 'Special allowance must be a non-negative number.' };
  }

  const travel = parseFloat(travel_allowance_amount);
  if (isNaN(travel) || travel < 0) {
    return { error: 'Travel allowance must be a non-negative number.' };
  }

  const medical = parseFloat(medical_allowance_amount);
  if (isNaN(medical) || medical < 0) {
    return { error: 'Medical allowance must be a non-negative number.' };
  }

  return { value: body };
}

function assignSalarySchema(body) {
  const {
    salary_structure_id,
    effective_from,
    effective_to
  } = body;

  if (!salary_structure_id || !/^[0-9a-fA-F-]{36}$/.test(salary_structure_id)) {
    return { error: 'Valid salary structure ID is required.' };
  }

  if (!effective_from || !/^\d{4}-\d{2}-\d{2}$/.test(effective_from)) {
    return { error: 'Valid effective from date (YYYY-MM-DD) is required.' };
  }

  if (effective_to && !/^\d{4}-\d{2}-\d{2}$/.test(effective_to)) {
    return { error: 'Valid effective to date (YYYY-MM-DD) must be specified if provided.' };
  }

  if (effective_to && effective_to < effective_from) {
    return { error: 'Effective to date must be greater than or equal to effective from date.' };
  }

  return { value: body };
}

function generatePayrollSchema(body) {
  const {
    payroll_month,
    payroll_year,
    payroll_start_date,
    payroll_end_date
  } = body;

  const month = parseInt(payroll_month);
  if (isNaN(month) || month < 1 || month > 12) {
    return { error: 'Valid payroll month (1-12) is required.' };
  }

  const year = parseInt(payroll_year);
  if (isNaN(year) || year < 2000) {
    return { error: 'Valid payroll year (>=2000) is required.' };
  }

  if (!payroll_start_date || !/^\d{4}-\d{2}-\d{2}$/.test(payroll_start_date)) {
    return { error: 'Valid payroll start date (YYYY-MM-DD) is required.' };
  }

  if (!payroll_end_date || !/^\d{4}-\d{2}-\d{2}$/.test(payroll_end_date)) {
    return { error: 'Valid payroll end date (YYYY-MM-DD) is required.' };
  }

  if (payroll_end_date < payroll_start_date) {
    return { error: 'Payroll end date must be greater than or equal to payroll start date.' };
  }

  return { value: body };
}

function createAdjustmentSchema(body) {
  const {
    employee_payroll_id,
    adjustment_type,
    adjustment_name,
    amount,
    remarks
  } = body;

  if (!employee_payroll_id || !/^[0-9a-fA-F-]{36}$/.test(employee_payroll_id)) {
    return { error: 'Valid employee payroll snapshot ID is required.' };
  }

  if (!adjustment_type || !['ADDITION', 'DEDUCTION'].includes(adjustment_type)) {
    return { error: 'Adjustment type must be ADDITION or DEDUCTION.' };
  }

  if (!adjustment_name || !adjustment_name.trim()) {
    return { error: 'Adjustment name is required.' };
  }

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    return { error: 'Adjustment amount must be positive (greater than 0).' };
  }

  return { value: body };
}

function updateWeekOffSettingsSchema(body) {
  const { week_off_days } = body;

  if (!Array.isArray(week_off_days)) {
    return { error: 'Week off days must be an array of integers.' };
  }

  for (const day of week_off_days) {
    const val = parseInt(day);
    if (isNaN(val) || val < 0 || val > 6) {
      return { error: 'Week off days must be integers between 0 (Sunday) and 6 (Saturday).' };
    }
  }

  return { value: body };
}

function createPayrollComponentSchema(body) {
  const {
    component_name,
    component_code,
    component_type,
    category,
    calculation_basis,
    default_value
  } = body;

  if (!component_name || !component_name.trim()) {
    return { error: 'Component name is required.' };
  }

  if (!component_code || !component_code.trim()) {
    return { error: 'Component code is required.' };
  }

  const VALID_TYPES = ['EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION'];
  if (!component_type || !VALID_TYPES.includes(component_type)) {
    return { error: 'Component type must be EARNING, DEDUCTION, or EMPLOYER_CONTRIBUTION.' };
  }

  const VALID_BASES = ['FIXED_AMOUNT', 'GROSS', 'BASIC', 'COMPONENT', 'FORMULA'];
  if (!calculation_basis || !VALID_BASES.includes(calculation_basis)) {
    return { error: 'Calculation basis must be FIXED_AMOUNT, GROSS, BASIC, COMPONENT, or FORMULA.' };
  }

  const defVal = parseFloat(default_value);
  if (isNaN(defVal) || defVal < 0) {
    return { error: 'Default value must be a non-negative number.' };
  }

  return { value: body };
}

function saveEmployeeSalaryConfigSchema(body) {
  const {
    salary_type,
    gross_salary,
    ctc_amount,
    effective_from,
    components
  } = body;

  if (!salary_type || !['MONTHLY_GROSS', 'ANNUAL_CTC'].includes(salary_type)) {
    return { error: 'Salary type must be MONTHLY_GROSS or ANNUAL_CTC.' };
  }

  const gross = parseFloat(gross_salary);
  if (isNaN(gross) || gross < 0) {
    return { error: 'Gross salary must be a non-negative number.' };
  }

  const ctc = parseFloat(ctc_amount);
  if (isNaN(ctc) || ctc < 0) {
    return { error: 'CTC amount must be a non-negative number.' };
  }

  if (!effective_from || !/^\d{4}-\d{2}-\d{2}$/.test(effective_from)) {
    return { error: 'Effective from date (YYYY-MM-DD) is required.' };
  }

  if (!Array.isArray(components)) {
    return { error: 'Components list must be an array.' };
  }

  for (const c of components) {
    if (!c.component_id || !/^[0-9a-fA-F-]{36}$/.test(c.component_id)) {
      return { error: 'Valid component_id is required for each component.' };
    }
  }

  return { value: body };
}

function upsertOvertimeSettingsSchema(body) {
  const {
    is_enabled,
    requires_approval,
    calculation_method,
    hourly_rate_basis,
    standard_monthly_hours,
    weekday_multiplier,
    weekend_multiplier,
    holiday_multiplier,
    weekday_hourly_rate,
    weekend_hourly_rate,
    holiday_hourly_rate,
    minimum_ot_minutes,
    rounding_rule
  } = body;

  if (typeof is_enabled !== 'boolean') {
    return { error: 'is_enabled must be a boolean.' };
  }
  if (typeof requires_approval !== 'boolean') {
    return { error: 'requires_approval must be a boolean.' };
  }
  if (!['SALARY_MULTIPLIER', 'HOURLY_RATE'].includes(calculation_method)) {
    return { error: 'calculation_method must be SALARY_MULTIPLIER or HOURLY_RATE.' };
  }
  if (!['FIXED_RATE', 'GROSS_STANDARD_HOURS', 'GROSS_ACTUAL_HOURS'].includes(hourly_rate_basis)) {
    return { error: 'hourly_rate_basis must be FIXED_RATE, GROSS_STANDARD_HOURS, or GROSS_ACTUAL_HOURS.' };
  }
  if (typeof standard_monthly_hours !== 'number' || standard_monthly_hours <= 0) {
    return { error: 'standard_monthly_hours must be a positive integer.' };
  }
  if (typeof weekday_multiplier !== 'number' || weekday_multiplier < 0) {
    return { error: 'weekday_multiplier must be a non-negative number.' };
  }
  if (typeof weekend_multiplier !== 'number' || weekend_multiplier < 0) {
    return { error: 'weekend_multiplier must be a non-negative number.' };
  }
  if (typeof holiday_multiplier !== 'number' || holiday_multiplier < 0) {
    return { error: 'holiday_multiplier must be a non-negative number.' };
  }
  if (typeof weekday_hourly_rate !== 'number' || weekday_hourly_rate < 0) {
    return { error: 'weekday_hourly_rate must be a non-negative number.' };
  }
  if (typeof weekend_hourly_rate !== 'number' || weekend_hourly_rate < 0) {
    return { error: 'weekend_hourly_rate must be a non-negative number.' };
  }
  if (typeof holiday_hourly_rate !== 'number' || holiday_hourly_rate < 0) {
    return { error: 'holiday_hourly_rate must be a non-negative number.' };
  }
  if (typeof minimum_ot_minutes !== 'number' || minimum_ot_minutes < 0) {
    return { error: 'minimum_ot_minutes must be a non-negative integer.' };
  }
  if (!['EXACT', 'NEAREST_15_MIN', 'NEAREST_30_MIN'].includes(rounding_rule)) {
    return { error: 'rounding_rule must be EXACT, NEAREST_15_MIN, or NEAREST_30_MIN.' };
  }

  return { value: body };
}

function createOvertimeRequestSchema(body) {
  const { attendance_date, reason } = body;
  if (!attendance_date || !/^\d{4}-\d{2}-\d{2}$/.test(attendance_date)) {
    return { error: 'Valid attendance_date (YYYY-MM-DD) is required.' };
  }
  if (!reason || !reason.trim()) {
    return { error: 'Reason is required.' };
  }
  return { value: body };
}

module.exports = {
  createSalaryStructureSchema,
  assignSalarySchema,
  generatePayrollSchema,
  createAdjustmentSchema,
  updateWeekOffSettingsSchema,
  createPayrollComponentSchema,
  saveEmployeeSalaryConfigSchema,
  upsertOvertimeSettingsSchema,
  createOvertimeRequestSchema
};
