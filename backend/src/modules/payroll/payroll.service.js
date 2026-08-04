const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const repository = require('./payroll.repository');
const { PAYROLL_STATUS, ADJUSTMENT_TYPES } = require('./payroll.constants');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');
const { withTransaction, query } = require('../../config/db');
const { numberToWords } = require('../../utils/helpers');
const { getSettings: getNotifSettings } = require('../notification/notificationSettings.repository');
const { sendPayrollProcessedEmail } = require('../notification/email.service');
const notifRepo = require('../inAppNotification/inAppNotification.repository');

// --- Helper: Generate date array between two dates ---
function getDatesInRange(startDateStr, endDateStr) {
  const dates = [];
  const curr = new Date(startDateStr + 'T00:00:00Z');
  const end = new Date(endDateStr + 'T00:00:00Z');
  while (curr <= end) {
    dates.push(new Date(curr));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
}

// --- Helper: Format Date to YYYY-MM-DD ---
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// --- Salary Structures ---
async function createSalaryStructure(organizationId, data, userId) {
  const payload = {
    ...data,
    created_by_admin_user_id: userId
  };
  return await repository.createSalaryStructure(organizationId, payload);
}

async function listSalaryStructures(organizationId) {
  return await repository.getSalaryStructures(organizationId);
}

async function updateSalaryStructure(organizationId, id, data) {
  const current = await repository.getSalaryStructureById(organizationId, id);
  if (!current) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Salary structure not found.');
  }
  return await repository.updateSalaryStructure(organizationId, id, data);
}

// --- Salary Assignments ---
async function assignSalaryStructure(organizationId, employeeId, data) {
  const { salary_structure_id, effective_from, effective_to } = data;

  return await withTransaction(async (client) => {
    // Validate structure exists
    const structure = await repository.getSalaryStructureById(organizationId, salary_structure_id);
    if (!structure) {
      throw new ApiError(STATUS_CODES.NOT_FOUND, 'Salary structure not found.');
    }

    // Auto-close any previous open-ended assignments
    await client.query(`
      UPDATE employee_salary_assignments
      SET effective_to = ($1::date - INTERVAL '1 day')::date, updated_at = NOW()
      WHERE organization_id = $2 AND employee_id = $3 AND effective_to IS NULL AND effective_from < $1::date
    `, [effective_from, organizationId, employeeId]);

    // Validate no overlapping assignments
    const overlaps = await repository.getSalaryAssignmentsOverlapping(
      organizationId,
      employeeId,
      effective_from,
      effective_to,
      client
    );
    if (overlaps.length > 0) {
      throw new ApiError(STATUS_CODES.CONFLICT, 'Salary assignment dates overlap with an existing assignment for this employee.');
    }

    return await repository.assignSalaryStructure(organizationId, {
      employee_id: employeeId,
      salary_structure_id,
      effective_from,
      effective_to
    }, client);
  });
}

async function listSalaryAssignments(organizationId, employeeId) {
  return await repository.getSalaryAssignmentsByEmployeeId(organizationId, employeeId);
}

// --- Week Off Settings ---
async function getWeekOffToggles(organizationId) {
  return await repository.getWeekOffToggles(organizationId);
}

async function updateWeekOffToggles(organizationId, toggles) {
  return await repository.updateWeekOffToggles(organizationId, toggles);
}

async function listWeekOffSettings(organizationId) {
  return await repository.listWeekOffSettings(organizationId);
}

async function getWeekOffSettingById(organizationId, settingId) {
  return await repository.getWeekOffSettingById(organizationId, settingId);
}

async function upsertWeekOffSetting(organizationId, payload) {
  return await withTransaction(async (client) => {
    return await repository.upsertWeekOffSetting(organizationId, payload, client);
  });
}

async function deleteWeekOffSetting(organizationId, settingId) {
  return await repository.deleteWeekOffSetting(organizationId, settingId);
}

async function resolveWeekOffRule(organizationId, employeeId, departmentId, targetDate, txClient = null) {
  const toggles = await repository.getWeekOffToggles(organizationId, txClient);

  // 1. Priority 1: Department Override
  if (toggles.enable_department_week_off && departmentId) {
    const run = txClient || { query };
    const rules = await run.query(`
      SELECT s.* FROM week_off_settings s
      WHERE s.organization_id = $1 AND s.scope = 'DEPARTMENT' AND s.scope_id = $2 
        AND s.is_enabled = TRUE
        AND s.effective_from <= $3::date
        AND (s.effective_to IS NULL OR s.effective_to >= $3::date)
      ORDER BY s.effective_from DESC
      LIMIT 1
    `, [organizationId, departmentId, targetDate]);
    
    if (rules.rows.length > 0) {
      const setting = rules.rows[0];
      const daysRes = await run.query(`
        SELECT * FROM week_off_days WHERE week_off_setting_id = $1
      `, [setting.week_off_setting_id]);
      setting.days = daysRes.rows;
      return setting;
    }
  }

  // 2. Priority 2: Organization Level
  if (toggles.enable_generic_week_off) {
    const run = txClient || { query };
    const rules = await run.query(`
      SELECT s.* FROM week_off_settings s
      WHERE s.organization_id = $1 AND s.scope = 'ORGANIZATION' AND s.scope_id IS NULL
        AND s.is_enabled = TRUE
        AND s.effective_from <= $2::date
        AND (s.effective_to IS NULL OR s.effective_to >= $2::date)
      ORDER BY s.effective_from DESC
      LIMIT 1
    `, [organizationId, targetDate]);

    if (rules.rows.length > 0) {
      const setting = rules.rows[0];
      const daysRes = await run.query(`
        SELECT * FROM week_off_days WHERE week_off_setting_id = $1
      `, [setting.week_off_setting_id]);
      setting.days = daysRes.rows;
      return setting;
    }
  }

  return null;
}

function getWeekdayOccurrenceInMonth(date) {
  const d = date.getUTCDate();
  const occurrence = Math.ceil(d / 7);
  if (occurrence === 1) return '1ST';
  if (occurrence === 2) return '2ND';
  if (occurrence === 3) return '3RD';
  if (occurrence === 4) return '4TH';
  return '5TH';
}

function calculateWeekOffDays(rule, startDateStr, endDateStr) {
  const defaultRule = {
    days: [
      { weekday: 0, week_number: 'ALL', off_type: 'FULL' },
      { weekday: 6, week_number: 'ALL', off_type: 'FULL' }
    ]
  };
  const activeRule = rule || defaultRule;
  const days = activeRule.days || [];

  const allDates = getDatesInRange(startDateStr, endDateStr);
  let total = 0;
  const dateStrings = new Set();

  allDates.forEach(date => {
    const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
    const dateStr = formatDate(date);
    const occurrence = getWeekdayOccurrenceInMonth(date);

    // Find if this date matches any configured week off day
    const match = days.find(d => {
      const weekdayMatch = parseInt(d.weekday) === dayOfWeek;
      const weekNumberMatch = d.week_number === 'ALL' || d.week_number === occurrence;
      return weekdayMatch && weekNumberMatch && d.off_type !== 'WORKING';
    });

    if (match) {
      const value = match.off_type === 'HALF' ? 0.5 : 1.0;
      total += value;
      dateStrings.add(dateStr);
    }
  });

  return { total, dateStrings };
}

// --- Payroll Generation Run ---
async function generatePayrollRun(organizationId, runData, userId) {
  const { payroll_month, payroll_year, payroll_start_date, payroll_end_date } = runData;

  return await withTransaction(async (client) => {
    // Check if run already exists for this month/year
    const existingRun = await repository.getPayrollRunByMonthYear(organizationId, payroll_month, payroll_year, client);
    if (existingRun) {
      if (existingRun.current_status === PAYROLL_STATUS.LOCKED) {
        throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot regenerate payroll for a locked month.');
      }
      // If it exists but is not locked, delete the employee payrolls and rerun
      await client.query('DELETE FROM employee_payrolls WHERE payroll_run_id = $1', [existingRun.payroll_run_id]);
      await client.query('DELETE FROM payroll_runs WHERE payroll_run_id = $1', [existingRun.payroll_run_id]);
    }

    // 1. Create payroll run record
    const run = await repository.createPayrollRun(organizationId, {
      payroll_month,
      payroll_year,
      payroll_start_date,
      payroll_end_date,
      generated_by_admin_user_id: userId
    }, client);

    // 2. Fetch holidays in this period
    const holidaysRes = await client.query(`
      SELECT holiday_date FROM holidays
      WHERE is_active = true AND is_deleted = false
        AND holiday_date >= $1 AND holiday_date <= $2
    `, [payroll_start_date, payroll_end_date]);
    const holidayDates = holidaysRes.rows.map(h => formatDate(new Date(h.holiday_date)));

    const allDates = getDatesInRange(payroll_start_date, payroll_end_date);
    const totalCalendarDays = allDates.length;

    // 3. Fetch all employees in organization
    const employees = await repository.getAllEmployeesForOrg(organizationId);

    for (const emp of employees) {
      // 1. Resolve employee-specific active week-off rule
      const employeeRule = await resolveWeekOffRule(organizationId, emp.employee_id, emp.department_id, payroll_end_date, client);
      const { total: totalWeekOffDays, dateStrings: employeeWeekOffDateStrings } = calculateWeekOffDays(employeeRule, payroll_start_date, payroll_end_date);

      // 2. Resolve holidays (excluding any holidays that fall on this employee's week-off days)
      let totalHolidayDays = 0;
      const employeeHolidayDateStrings = new Set();
      holidayDates.forEach(hdStr => {
        if (!employeeWeekOffDateStrings.has(hdStr)) {
          totalHolidayDays++;
          employeeHolidayDateStrings.add(hdStr);
        }
      });

      const workingDays = totalCalendarDays - totalWeekOffDays - totalHolidayDays;
      if (workingDays <= 0) {
        // Skip employee with no working days or configuration error
        continue;
      }

      // Find active salary assignment or dynamic config on the end date of the period
      const config = await repository.getEmployeeSalaryConfigForDate(organizationId, emp.employee_id, payroll_end_date, client);

      let basic = 0;
      let hra = 0;
      let spec = 0;
      let travel = 0;
      let medical = 0;
      let pf = 0;
      let esi = 0;
      let pt = 0;
      let tax = 0;
      let benefits = 0;
      let grossSalary = 0;
      let calculatedComponents = [];
      let salary_structure_id = null;

      if (config) {
        // Fetch new dynamic components
        const rawComponents = await repository.getEmployeeSalaryComponents(config.employee_salary_config_id, client);
        grossSalary = parseFloat(config.gross_salary) || 0;

        // Copy the components to avoid mutating
        const comps = rawComponents.map(c => ({ ...c, calculated_val: 0 }));

        // Pass 1: FIXED and GROSS components
        comps.forEach(c => {
          if (c.is_manual_override || c.is_manual) {
            c.calculated_val = parseFloat(c.manual_amount !== null && c.manual_amount !== undefined ? c.manual_amount : (c.fixed_amount || 0));
          } else if (c.calculation_basis === 'FIXED_AMOUNT') {
            c.calculated_val = parseFloat(c.fixed_amount !== null && c.fixed_amount !== undefined ? c.fixed_amount : c.default_value) || 0;
          } else if (c.calculation_basis === 'GROSS') {
            c.calculated_val = ((parseFloat(c.percentage !== null && c.percentage !== undefined ? c.percentage : c.default_value) || 0) / 100) * grossSalary;
          }
        });

        // Find the basic component's value for calculations that depend on it
        const basicComp = comps.find(c => c.component_code === 'BASIC');
        const basicVal = basicComp ? basicComp.calculated_val : 0;

        // Pass 2: BASIC basis components
        comps.forEach(c => {
          if (!c.is_manual_override && !c.is_manual && c.calculation_basis === 'BASIC') {
            c.calculated_val = ((parseFloat(c.percentage !== null && c.percentage !== undefined ? c.percentage : c.default_value) || 0) / 100) * basicVal;
          }
        });

        // Pass 3: COMPONENT reference basis components
        comps.forEach(c => {
          if (!c.is_manual_override && !c.is_manual && c.calculation_basis === 'COMPONENT') {
            const refComp = comps.find(rc => rc.component_id === c.reference_component_id);
            const refVal = refComp ? refComp.calculated_val : 0;
            c.calculated_val = ((parseFloat(c.percentage !== null && c.percentage !== undefined ? c.percentage : c.default_value) || 0) / 100) * refVal;
          }
        });

        // Sum the totals and map them to legacy variables for compatibility:
        comps.forEach(c => {
          const amt = c.calculated_val;
          if (c.component_type === 'EARNING') {
            if (c.component_code === 'BASIC') basic = amt;
            else if (c.component_code === 'HRA') hra = amt;
            else if (c.component_code === 'SPECIAL_ALLOWANCE') spec = amt;
            else if (c.component_code === 'TRAVEL_ALLOWANCE') travel = amt;
            else if (c.component_code === 'MEDICAL_ALLOWANCE') medical = amt;
            else spec += amt; // Add other earnings to special allowance so gross matches
          } else if (c.component_type === 'DEDUCTION') {
            if (c.component_code === 'PF') pf = amt;
            else if (c.component_code === 'ESI') esi = amt;
            else if (c.component_code === 'PROFESSIONAL_TAX') pt = amt;
            else if (c.component_code === 'INCOME_TAX') tax = amt;
            else tax += amt; // Add other deductions to tax for total
          } else if (c.component_type === 'EMPLOYER_CONTRIBUTION') {
            benefits += amt;
          }
        });

        // Recompute dynamic gross as sum of earnings
        const earningsSum = comps.filter(c => c.component_type === 'EARNING').reduce((sum, c) => sum + c.calculated_val, 0);
        grossSalary = earningsSum;

        calculatedComponents = comps.map(c => ({
          component_id: c.component_id,
          component_name: c.component_name,
          component_code: c.component_code,
          component_type: c.component_type,
          category: c.category,
          calculated_amount: c.calculated_val,
          actual_amount: c.calculated_val
        }));
      } else {
        // Fallback: Check old salary structures assignment
        const assignment = await repository.getActiveAssignmentForDate(organizationId, emp.employee_id, payroll_end_date, client);
        if (!assignment) {
          // Skip employee without an active salary assignment/config
          continue;
        }

        salary_structure_id = assignment.salary_structure_id;
        basic = parseFloat(assignment.basic_salary) || 0;
        hra = parseFloat(assignment.hra_amount) || 0;
        spec = parseFloat(assignment.special_allowance_amount) || 0;
        travel = parseFloat(assignment.travel_allowance_amount) || 0;
        medical = parseFloat(assignment.medical_allowance_amount) || 0;
        grossSalary = basic + hra + spec + travel + medical;

        pf = parseFloat(assignment.pf_amount) || 0;
        esi = parseFloat(assignment.esi_amount) || 0;
        pt = parseFloat(assignment.professional_tax) || 0;
        tax = parseFloat(assignment.income_tax) || 0;
        benefits = parseFloat(assignment.benefits_amount) || 0;

        // Fetch components for the organization to link components correctly
        const orgComponents = await repository.getPayrollComponents(organizationId, client);
        const getCompId = async (code, name, type, cat) => {
          let comp = orgComponents.find(c => c.component_code === code);
          if (!comp) {
            comp = await repository.createPayrollComponent(organizationId, {
              component_name: name,
              component_code: code,
              component_type: type,
              category: cat,
              calculation_basis: 'FIXED_AMOUNT',
              default_value: 0
            }, client);
            orgComponents.push(comp);
          }
          return comp.component_id;
        };

        // Create virtual components for snapshotting
        const rawVirtComps = [
          { code: 'BASIC', name: 'Basic Salary', type: 'EARNING', cat: 'ALLOWANCE', amt: basic },
          { code: 'HRA', name: 'HRA', type: 'EARNING', cat: 'ALLOWANCE', amt: hra },
          { code: 'SPECIAL_ALLOWANCE', name: 'Special Allowance', type: 'EARNING', cat: 'ALLOWANCE', amt: spec },
          { code: 'TRAVEL_ALLOWANCE', name: 'Travel Allowance', type: 'EARNING', cat: 'ALLOWANCE', amt: travel },
          { code: 'MEDICAL_ALLOWANCE', name: 'Medical Allowance', type: 'EARNING', cat: 'ALLOWANCE', amt: medical },
          { code: 'PF', name: 'PF Employee Contribution', type: 'DEDUCTION', cat: 'STATUTORY', amt: pf },
          { code: 'ESI', name: 'ESI Employee Contribution', type: 'DEDUCTION', cat: 'STATUTORY', amt: esi },
          { code: 'PROFESSIONAL_TAX', name: 'Professional Tax', type: 'DEDUCTION', cat: 'TAX', amt: pt },
          { code: 'INCOME_TAX', name: 'Income Tax', type: 'DEDUCTION', cat: 'TAX', amt: tax },
          { code: 'BENEFITS', name: 'Employer Contributions', type: 'EMPLOYER_CONTRIBUTION', cat: 'STATUTORY', amt: benefits },
        ];

        calculatedComponents = [];
        for (const item of rawVirtComps) {
          const compId = await getCompId(item.code, item.name, item.type, item.cat);
          calculatedComponents.push({
            component_id: compId,
            component_name: item.name,
            component_code: item.code,
            component_type: item.type,
            category: item.cat,
            calculated_amount: item.amt,
            actual_amount: item.amt
          });
        }
      }

      // Fetch user account associated with employee to fetch attendance punches
      const userRes = await client.query('SELECT user_id FROM users WHERE employee_id = $1 LIMIT 1', [emp.employee_id]);
      const user = userRes.rows[0];
      let presentDays = 0;
      let unexcusedLateCount = 0;
      let lateArrivalLopDays = 0;

      if (user) {
        // Query punches inside range
        const punches = await repository.getPunchesForEmployee(user.user_id, payroll_start_date, payroll_end_date, client);
        // Note: only count punches on scheduled working days
        punches.forEach(punch => {
          const punchDateStr = formatDate(new Date(punch.attendance_date));
          if (!employeeWeekOffDateStrings.has(punchDateStr) && !employeeHolidayDateStrings.has(punchDateStr)) {
            presentDays++;
          }
        });

        // Query the employee's attendance policy
        const policyRes = await client.query(
          `SELECT p.enable_late_arrival_lop, p.late_arrivals_threshold, p.lop_days_per_threshold
           FROM employees e
           LEFT JOIN attendance_policies p ON e.attendance_policy_id = p.attendance_policy_id
           WHERE e.employee_id = $1`,
          [emp.employee_id]
        );
        const policy = policyRes.rows[0];

        if (policy && policy.enable_late_arrival_lop) {
          // Count unexcused late arrivals
          const latePunchesRes = await client.query(`
            SELECT DISTINCT p.attendance_date, p.attendance_result
            FROM attendance_punches p
            WHERE p.employee_id = $1
              AND p.attendance_date >= $2
              AND p.attendance_date <= $3
              AND p.attendance_result = 'LATE_ARRIVAL'
              AND NOT EXISTS (
                SELECT 1 FROM attendance_regularization_requests r
                WHERE r.employee_id = $4
                  AND r.attendance_date = p.attendance_date
                  AND r.approval_status = 'APPROVED'
              )
              AND NOT EXISTS (
                SELECT 1 FROM leave_requests l
                WHERE l.employee_id = $4
                  AND l.current_status = 'APPROVED'
                  AND l.start_date <= p.attendance_date
                  AND l.end_date >= p.attendance_date
              )
          `, [user.user_id, payroll_start_date, payroll_end_date, emp.employee_id]);

          latePunchesRes.rows.forEach(punch => {
            const punchDateStr = formatDate(new Date(punch.attendance_date));
            if (!employeeWeekOffDateStrings.has(punchDateStr) && !employeeHolidayDateStrings.has(punchDateStr)) {
              unexcusedLateCount++;
            }
          });

          const lateLimit = parseInt(policy.late_arrivals_threshold) || 0;
          const lopDeductionAmt = parseFloat(policy.lop_days_per_threshold) || 0.00;

          if (lateLimit > 0 && lopDeductionAmt > 0) {
            lateArrivalLopDays = Math.floor(unexcusedLateCount / lateLimit) * lopDeductionAmt;
          }
        }
      }

      // Fetch approved leaves overlapping with payroll period
      const leavesRes = await client.query('SELECT start_date, end_date, total_leave_days, session_type, lt.is_paid_leave FROM leave_requests lr JOIN leave_types lt ON lr.leave_type_id = lt.leave_type_id WHERE lr.employee_id = $1 AND lr.current_status = \'APPROVED\' AND lr.start_date <= $2 AND lr.end_date >= $3', [emp.employee_id, payroll_end_date, payroll_start_date]);

      let paidLeaveDays = 0;

      leavesRes.rows.forEach(leave => {
        if (leave.is_paid_leave) {
          const leaveDates = getDatesInRange(
            formatDate(new Date(leave.start_date)),
            formatDate(new Date(leave.end_date))
          );
          leaveDates.forEach(ld => {
            const ldStr = formatDate(ld);
            // Only count leave on days that are working days (NOT week-off and NOT holiday)
            if (!employeeWeekOffDateStrings.has(ldStr) && !employeeHolidayDateStrings.has(ldStr) && ldStr >= payroll_start_date && ldStr <= payroll_end_date) {
              const weight = leave.session_type === 'FULL_DAY' ? 1.0 : 0.5;
              paidLeaveDays += weight;
            }
          });
        }
      });

      // --- OVERTIME INTEGRATION ---
      const otSettingsRes = await client.query('SELECT * FROM overtime_settings WHERE organization_id = $1 AND is_enabled = true LIMIT 1', [organizationId]);
      const otSettings = otSettingsRes.rows[0];

      const otReqsRes = await client.query(`
        SELECT * FROM overtime_requests 
        WHERE employee_id = $1 AND organization_id = $2 
          AND approval_status = 'APPROVED' 
          AND attendance_date >= $3 AND attendance_date <= $4
      `, [emp.employee_id, organizationId, payroll_start_date, payroll_end_date]);
      const otReqs = otReqsRes.rows;

      const shiftRes = await client.query('SELECT minimum_hours FROM attendance_shifts WHERE shift_id = (SELECT shift_id FROM employees WHERE employee_id = $1)', [emp.employee_id]);
      const shiftHours = parseFloat(shiftRes.rows[0]?.minimum_hours) || 8.0;

      let totalOtAmount = 0;
      const otSnapshots = [];

      if (otSettings && otReqs.length > 0) {
        for (const req of otReqs) {
          let hourlyRate = 0;
          let multiplier = 1.0;

          if (otSettings.hourly_rate_basis === 'FIXED_RATE') {
            if (req.day_type === 'WEEKDAY') hourlyRate = parseFloat(otSettings.weekday_hourly_rate) || 0;
            else if (req.day_type === 'WEEKEND') hourlyRate = parseFloat(otSettings.weekend_hourly_rate) || 0;
            else if (req.day_type === 'HOLIDAY') hourlyRate = parseFloat(otSettings.holiday_hourly_rate) || 0;
          } else if (otSettings.hourly_rate_basis === 'GROSS_STANDARD_HOURS') {
            hourlyRate = grossSalary / (parseFloat(otSettings.standard_monthly_hours) || 208);
          } else if (otSettings.hourly_rate_basis === 'GROSS_ACTUAL_HOURS') {
            const monthlyHours = workingDays * shiftHours;
            hourlyRate = monthlyHours > 0 ? (grossSalary / monthlyHours) : 0;
          }

          if (otSettings.calculation_method === 'SALARY_MULTIPLIER') {
            if (req.day_type === 'WEEKDAY') multiplier = parseFloat(otSettings.weekday_multiplier) || 1.0;
            else if (req.day_type === 'WEEKEND') multiplier = parseFloat(otSettings.weekend_multiplier) || 1.0;
            else if (req.day_type === 'HOLIDAY') multiplier = parseFloat(otSettings.holiday_multiplier) || 1.0;
          }

          const approvedHours = parseFloat(req.approved_ot_minutes) / 60;
          const otAmt = approvedHours * hourlyRate * multiplier;
          totalOtAmount += otAmt;

          otSnapshots.push({
            employee_id: emp.employee_id,
            approved_hours: approvedHours,
            hourly_rate: hourlyRate,
            multiplier: multiplier,
            ot_amount: otAmt,
            day_type: req.day_type
          });
        }
      }

      // LOP Days breakdown
      const lopDaysAbsence = Math.max(0, workingDays - presentDays - paidLeaveDays);
      const lopDaysLate = lateArrivalLopDays;
      const lopDays = lopDaysAbsence + lopDaysLate;

      const perDaySalary = grossSalary / workingDays;
      const lopDeduction = perDaySalary * lopDays;

      // Initial Net Salary (before adjustments) incorporating overtime additions
      const totalEarnings = grossSalary + totalOtAmount;
      const totalDeductions = lopDeduction + pf + esi + pt + tax;
      const netSalary = Math.max(0, totalEarnings - totalDeductions);

      // Create Employee Payroll Record
      const epRecord = await repository.createEmployeePayroll({
        payroll_run_id: run.payroll_run_id,
        employee_id: emp.employee_id,
        salary_structure_id: salary_structure_id,
        working_days: workingDays,
        present_days: presentDays,
        paid_leave_days: paidLeaveDays,
        holiday_days: totalHolidayDays,
        week_off_days: totalWeekOffDays,
        lop_days: lopDays,
        lop_days_absence: lopDaysAbsence,
        lop_days_late: lopDaysLate,
        gross_salary: grossSalary,
        total_earnings: totalEarnings,
        total_additions: 0,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        benefits_amount: benefits,
        pf_amount: pf,
        esi_amount: esi,
        professional_tax: pt,
        income_tax: tax
      }, client);

      // Save overtime snapshots
      for (const snap of otSnapshots) {
        await client.query(`
          INSERT INTO employee_payroll_overtime (
            employee_payroll_id, employee_id, approved_hours, hourly_rate, multiplier, ot_amount, day_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [epRecord.employee_payroll_id, snap.employee_id, snap.approved_hours, snap.hourly_rate, snap.multiplier, snap.ot_amount, snap.day_type]);
      }

      // Append Overtime Earning Component snapshot
      if (totalOtAmount > 0) {
        const otCompRes = await client.query("SELECT component_id FROM payroll_components WHERE organization_id = $1 AND component_code = 'OVERTIME' LIMIT 1", [organizationId]);
        const otCompId = otCompRes.rows[0]?.component_id;
        if (otCompId) {
          calculatedComponents.push({
            component_id: otCompId,
            component_name: 'Overtime',
            component_code: 'OVERTIME',
            component_type: 'EARNING',
            category: 'ALLOWANCE',
            calculated_amount: totalOtAmount,
            actual_amount: totalOtAmount
          });
        }
      }

      // Create snapshot components
      for (const componentSnap of calculatedComponents) {
        await repository.createEmployeePayrollComponent({
          employee_payroll_id: epRecord.employee_payroll_id,
          component_id: componentSnap.component_id,
          component_name: componentSnap.component_name,
          component_code: componentSnap.component_code,
          component_type: componentSnap.component_type,
          category: componentSnap.category,
          calculated_amount: componentSnap.calculated_amount,
          actual_amount: componentSnap.actual_amount
        }, client);
      }
    }

    // 6. Write to run logs
    await repository.createRunLog(
      run.payroll_run_id,
      'GENERATE',
      userId,
      `Generated payroll run for ${payroll_month}/${payroll_year}. Total working days: ${workingDays}.`,
      client
    );

    return run;
  });
}

async function listPayrollRuns(organizationId) {
  return await repository.getPayrollRuns(organizationId);
}

async function getPayrollRunDetails(organizationId, runId) {
  const run = await repository.getPayrollRunById(organizationId, runId);
  if (!run) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Payroll run not found.');
  }

  const employeePayrolls = await repository.getEmployeePayrollsByRunId(runId);
  const adjustments = await repository.getAdjustmentsByRunId(runId);
  const logs = await repository.getRunLogs(runId);

  return {
    run,
    employeePayrolls,
    adjustments,
    logs
  };
}

// --- Helper: Recalculate specific employee payroll including adjustments ---
async function recalculateEmployeePayroll(runId, employeeId, client) {
  // Fetch active employee payroll record
  const res = await client.query('SELECT * FROM employee_payrolls WHERE payroll_run_id = $1 AND employee_id = $2', [runId, employeeId]);
  const ep = res.rows[0];
  if (!ep) return;

  const gross = parseFloat(ep.gross_salary);
  const workingDays = parseFloat(ep.working_days);
  const lopDays = parseFloat(ep.lop_days);
  const perDay = gross / workingDays;
  const lopDeduction = perDay * lopDays;

  const pf = parseFloat(ep.pf_amount) || 0;
  const esi = parseFloat(ep.esi_amount) || 0;
  const pt = parseFloat(ep.professional_tax) || 0;
  const tax = parseFloat(ep.income_tax) || 0;

  // Fetch all adjustments
  const adjustments = await repository.getAdjustmentsByRunAndEmployee(runId, employeeId, client);
  let additions = 0;
  let deductions = 0;

  adjustments.forEach(adj => {
    const amt = parseFloat(adj.amount);
    if (adj.adjustment_type === ADJUSTMENT_TYPES.ADDITION) {
      additions += amt;
    } else {
      deductions += amt;
    }
  });

  // Fetch snapshotted overtime amount
  const otRes = await client.query('SELECT SUM(ot_amount) as ot_sum FROM employee_payroll_overtime WHERE employee_payroll_id = $1', [ep.employee_payroll_id]);
  const otSum = parseFloat(otRes.rows[0]?.ot_sum) || 0;

  const totalEarnings = gross + otSum + additions;
  const totalDeductions = lopDeduction + pf + esi + pt + tax + deductions;
  const netSalary = Math.max(0, totalEarnings - totalDeductions);

  await client.query(`
    UPDATE employee_payrolls SET
      total_earnings = $1,
      total_additions = $2,
      total_deductions = $3,
      net_salary = $4,
      updated_at = NOW()
    WHERE payroll_run_id = $5 AND employee_id = $6
  `, [totalEarnings, additions, totalDeductions, netSalary, runId, employeeId]);
}

// --- Adjustments ---
async function createAdjustment(organizationId, runId, data, userId) {
  const { employee_payroll_id, employee_id, adjustment_type, adjustment_name, amount, remarks } = data;

  return await withTransaction(async (client) => {
    // Validate run exists and is not locked
    const run = await repository.getPayrollRunById(organizationId, runId, client);
    if (!run) {
      throw new ApiError(STATUS_CODES.NOT_FOUND, 'Payroll run not found.');
    }
    if (run.current_status === PAYROLL_STATUS.LOCKED) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot add adjustments to a locked payroll run.');
    }

    // Find the employee payroll record
    let ep;
    if (employee_payroll_id) {
      const epRes = await client.query(
        'SELECT employee_payroll_id, employee_id FROM employee_payrolls WHERE payroll_run_id = $1 AND employee_payroll_id = $2',
        [runId, employee_payroll_id]
      );
      ep = epRes.rows[0];
    } else if (employee_id) {
      const epRes = await client.query(
        'SELECT employee_payroll_id, employee_id FROM employee_payrolls WHERE payroll_run_id = $1 AND employee_id = $2',
        [runId, employee_id]
      );
      ep = epRes.rows[0];
    }

    if (!ep) {
      throw new ApiError(STATUS_CODES.NOT_FOUND, 'Employee payroll record not found for this run.');
    }

    const resolvedEmployeePayrollId = ep.employee_payroll_id;
    const resolvedEmployeeId = ep.employee_id;

    // Insert adjustment
    const adj = await repository.createAdjustment({
      employee_payroll_id: resolvedEmployeePayrollId,
      adjustment_type,
      adjustment_name,
      amount,
      remarks,
      created_by_admin_user_id: userId
    }, client);

    // Recalculate employee payroll
    await recalculateEmployeePayroll(runId, resolvedEmployeeId, client);

    // Log action
    await repository.createRunLog(
      runId,
      'ADJUST',
      userId,
      `Added adjustment "${adjustment_name}" (${adjustment_type}) of ${amount} for employee ${resolvedEmployeeId}.`,
      client
    );

    return adj;
  });
}

async function deleteAdjustment(organizationId, runId, adjustmentId, userId) {
  return await withTransaction(async (client) => {
    // Validate run is not locked
    const run = await repository.getPayrollRunById(organizationId, runId, client);
    if (!run) {
      throw new ApiError(STATUS_CODES.NOT_FOUND, 'Payroll run not found.');
    }
    if (run.current_status === PAYROLL_STATUS.LOCKED) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot delete adjustments from a locked payroll run.');
    }

    // Query adjustment details and employee_id
    const adjRes = await client.query(`
      SELECT a.adjustment_name, a.adjustment_type, a.amount, ep.employee_id
      FROM payroll_adjustments a
      JOIN employee_payrolls ep ON a.employee_payroll_id = ep.employee_payroll_id
      WHERE a.adjustment_id = $1
    `, [adjustmentId]);
    const record = adjRes.rows[0];
    if (!record) {
      throw new ApiError(STATUS_CODES.NOT_FOUND, 'Adjustment not found.');
    }

    // Delete adjustment
    await repository.deleteAdjustment(adjustmentId, client);

    // Recalculate employee payroll
    await recalculateEmployeePayroll(runId, record.employee_id, client);

    // Log action
    await repository.createRunLog(
      runId,
      'ADJUST',
      userId,
      `Deleted adjustment "${record.adjustment_name}" (${record.adjustment_type}) of ${record.amount} for employee ${record.employee_id}.`,
      client
    );

    return true;
  });
}

// --- Approve / Lock Run ---
async function approvePayrollRun(organizationId, runId, userId) {
  return await withTransaction(async (client) => {
    const run = await repository.getPayrollRunById(organizationId, runId, client);
    if (!run) {
      throw new ApiError(STATUS_CODES.NOT_FOUND, 'Payroll run not found.');
    }
    if (run.current_status !== PAYROLL_STATUS.DRAFT && run.current_status !== PAYROLL_STATUS.GENERATED) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only runs in DRAFT or GENERATED status can be approved.');
    }

    // Update status in run
    const updated = await repository.updatePayrollRunStatus(runId, PAYROLL_STATUS.APPROVED, userId, 'approve', client);
    // Update status in employee payrolls
    await repository.updateEmployeePayrollsStatus(runId, PAYROLL_STATUS.APPROVED, client);

    // Log action
    await repository.createRunLog(runId, 'APPROVE', userId, 'Approved payroll run.', client);

    return updated;
  });
}

async function getComponentsForPayslip(employeePayrollId, clientOrQuery) {
  const run = clientOrQuery || { query };
  const result = await run.query('SELECT * FROM employee_payroll_components WHERE employee_payroll_id = $1', [employeePayrollId]);
  if (result.rows.length > 0) {
    return result.rows;
  }
  
  // Otherwise, construct legacy virtual components
  const epRes = await run.query('SELECT * FROM employee_payrolls WHERE employee_payroll_id = $1', [employeePayrollId]);
  const ep = epRes.rows[0];
  if (!ep) return [];

  return [
    { component_name: 'Basic Salary', component_type: 'EARNING', actual_amount: ep.basic_salary || ep.gross_salary * 0.4 },
    { component_name: 'HRA', component_type: 'EARNING', actual_amount: ep.hra_amount || ep.gross_salary * 0.2 },
    { component_name: 'Special Allowance', component_type: 'EARNING', actual_amount: ep.special_allowance_amount || 0 },
    { component_name: 'Travel Allowance', component_type: 'EARNING', actual_amount: ep.travel_allowance_amount || 0 },
    { component_name: 'Medical Allowance', component_type: 'EARNING', actual_amount: ep.medical_allowance_amount || 0 },
    { component_name: 'PF Employee Contribution', component_type: 'DEDUCTION', actual_amount: ep.pf_amount || 0 },
    { component_name: 'ESI', component_type: 'DEDUCTION', actual_amount: ep.esi_amount || 0 },
    { component_name: 'Professional Tax', component_type: 'DEDUCTION', actual_amount: ep.professional_tax || 0 },
    { component_name: 'Income Tax', component_type: 'DEDUCTION', actual_amount: ep.income_tax || 0 }
  ].filter(c => parseFloat(c.actual_amount) > 0);
}

function getMonthName(monthNumber) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber - 1] || '';
}

function generatePayslipPDF(data, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Title & Header
      doc.fontSize(18).text('INSIGHT HCM', { align: 'center', bold: true });
      doc.fontSize(10).text('Performance Management System', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`PAYSLIP FOR THE MONTH OF ${getMonthName(data.payroll_month).toUpperCase()} ${data.payroll_year}`, { align: 'center', underline: true });
      doc.moveDown(1.5);

      // Helper to draw text row
      const row = (label1, val1, label2, val2, y) => {
        doc.fontSize(9).fillColor('#333333');
        doc.text(label1, 50, y, { bold: true });
        doc.text(String(val1 || '—'), 150, y);
        doc.text(label2, 300, y, { bold: true });
        doc.text(String(val2 || '—'), 400, y);
      };

      // Draw Employee Details Box
      let y = doc.y;
      doc.fillColor('#eef2f5').rect(50, y, 495, 110).fill();
      doc.fillColor('#000000');
      
      y += 8;
      row('Employee Code:', data.employee_code, 'Name:', `${data.first_name} ${data.last_name}`, y);
      y += 16;
      row('Department:', data.department_name, 'Designation:', data.designation, y);
      y += 16;
      row('Joining Date:', data.date_of_joining ? formatDate(new Date(data.date_of_joining)) : '—', "Father's Name:", data.father_name, y);
      y += 16;
      row('UAN Number:', data.uan_number, 'ESI Number:', data.esi_number, y);
      y += 16;
      row('Bank Name:', data.bank_name, 'Account No:', data.bank_account_number, y);
      y += 16;
      row('IFSC Code:', data.bank_ifsc, 'Payslip No:', data.payslip_number, y);
      doc.moveDown(2);

      // Attendance details
      doc.fontSize(11).fillColor('#0f172a').text('ATTENDANCE DETAILS', { bold: true });
      doc.moveDown(0.5);
      y = doc.y;
      doc.fillColor('#f8fafc').rect(50, y, 495, 40).fill();
      doc.fillColor('#000000');
      
      y += 8;
      doc.fontSize(8);
      doc.text('Total Days', 55, y, { bold: true, width: 75, align: 'center' });
      doc.text('Present Days', 135, y, { bold: true, width: 75, align: 'center' });
      doc.text('Paid Leaves', 215, y, { bold: true, width: 75, align: 'center' });
      doc.text('Holidays', 295, y, { bold: true, width: 75, align: 'center' });
      doc.text('Week Offs', 375, y, { bold: true, width: 75, align: 'center' });
      doc.text('LOP Days', 455, y, { bold: true, width: 75, align: 'center' });
      
      y += 14;
      const totalCalendarDays = parseFloat(data.working_days) + parseFloat(data.week_off_days) + parseFloat(data.holiday_days);
      doc.text(String(totalCalendarDays), 55, y, { width: 75, align: 'center' });
      doc.text(String(data.present_days), 135, y, { width: 75, align: 'center' });
      doc.text(String(data.paid_leave_days), 215, y, { width: 75, align: 'center' });
      doc.text(String(data.holiday_days), 295, y, { width: 75, align: 'center' });
      doc.text(String(data.week_off_days), 375, y, { width: 75, align: 'center' });
      doc.text(String(data.lop_days), 455, y, { width: 75, align: 'center' });
      doc.moveDown(2);

      // Earnings & Deductions Table
      doc.fontSize(11).fillColor('#0f172a').text('SALARY BREAKDOWN', { bold: true });
      doc.moveDown(0.5);

      const components = data.components || [];
      const earnings = components
        .filter(c => c.component_type === 'EARNING')
        .map(c => ({ label: c.component_name, val: parseFloat(c.actual_amount) || 0 }));
      if (parseFloat(data.total_additions) > 0) {
        earnings.push({ label: 'Adjustments (Additions)', val: parseFloat(data.total_additions) });
      }

      const deductions = components
        .filter(c => c.component_type === 'DEDUCTION')
        .map(c => ({ label: c.component_name, val: parseFloat(c.actual_amount) || 0 }));
      const perDay = parseFloat(data.gross_salary) / parseFloat(data.working_days);
      const lopDeduction = perDay * parseFloat(data.lop_days);
      if (lopDeduction > 0) {
        deductions.push({ label: 'Loss Of Pay (LOP)', val: lopDeduction });
      }

      const pf = parseFloat(data.pf_amount) || 0;
      const esi = parseFloat(data.esi_amount) || 0;
      const pt = parseFloat(data.professional_tax) || 0;
      const tax = parseFloat(data.income_tax) || 0;
      const manualDeductions = parseFloat(data.total_deductions) - lopDeduction - pf - esi - pt - tax;
      if (manualDeductions > 0) {
        deductions.push({ label: 'Adjustments (Deductions)', val: manualDeductions });
      }

      const maxRows = Math.max(earnings.length, deductions.length, 1);
      const rowHeight = 16;
      const tableHeight = 20 + (maxRows * rowHeight) + 10;

      y = doc.y;
      doc.strokeColor('#e2e8f0').rect(50, y, 495, tableHeight).stroke();
      doc.fillColor('#f8fafc').rect(51, y + 1, 246, 18).fill();
      doc.fillColor('#f8fafc').rect(298, y + 1, 246, 18).fill();
      
      // Table Header
      doc.fillColor('#0f172a').fontSize(8);
      doc.text('EARNINGS', 55, y + 5, { bold: true });
      doc.text('AMOUNT (INR)', 200, y + 5, { bold: true, align: 'right', width: 90 });
      doc.text('DEDUCTIONS', 302, y + 5, { bold: true });
      doc.text('AMOUNT (INR)', 450, y + 5, { bold: true, align: 'right', width: 90 });
      
      // vertical divider line
      doc.moveTo(297, y).lineTo(297, y + tableHeight).strokeColor('#e2e8f0').stroke();
      
      // horizontal line below headers
      doc.moveTo(50, y + 20).lineTo(545, y + 20).strokeColor('#e2e8f0').stroke();

      y += 24;
      for (let i = 0; i < maxRows; i++) {
        const earn = earnings[i];
        const ded = deductions[i];

        doc.fillColor('#333333').fontSize(8);
        if (earn) {
          doc.text(earn.label, 55, y);
          doc.text(parseFloat(earn.val).toFixed(2), 200, y, { align: 'right', width: 90 });
        }

        if (ded) {
          doc.text(ded.label, 302, y);
          doc.text(parseFloat(ded.val).toFixed(2), 450, y, { align: 'right', width: 90 });
        }
        y += rowHeight;
      }

      // Draw bottom divider before totals
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#e2e8f0').stroke();

      // Total Row
      y += 5;
      doc.fontSize(8).fillColor('#0f172a');
      doc.text('Total Earnings (Gross):', 55, y, { bold: true });
      doc.text(parseFloat(data.total_earnings).toFixed(2), 200, y, { bold: true, align: 'right', width: 90 });
      doc.text('Total Deductions:', 302, y, { bold: true });
      doc.text(parseFloat(data.total_deductions).toFixed(2), 450, y, { bold: true, align: 'right', width: 90 });
      doc.moveDown(1.5);

      // Net Salary Box
      y = doc.y;
      doc.fillColor('#e2e8f0').rect(50, y, 495, 45).fill();
      doc.fillColor('#0f172a').fontSize(10);
      doc.text('NET SALARY (TAKE HOME):', 60, y + 10, { bold: true });
      doc.text(`INR ${parseFloat(data.net_salary).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 400, y + 10, { bold: true, align: 'right', width: 135 });
      
      const words = numberToWords(parseFloat(data.net_salary));
      doc.fontSize(8).fillColor('#475569');
      doc.text(`In Words: ${words}`, 60, y + 28, { italic: true });
      doc.moveDown(1.5);

      // Employer Contributions / Cost to Company
      y = doc.y;
      const benefitsVal = parseFloat(data.benefits_amount) || 0;
      const ctcVal = parseFloat(data.gross_salary) + benefitsVal;
      doc.fontSize(8).fillColor('#475569');
      doc.text(`Employer Benefits: INR ${benefitsVal.toFixed(2)}  |  CTC (Cost to Company): INR ${ctcVal.toFixed(2)}`, 50, y, { bold: true });
      doc.moveDown(1.5);

      // Footer
      doc.fontSize(7).fillColor('#94a3b8');
      doc.text('This is a computer generated payslip and does not require a physical signature.', { align: 'center' });
      doc.text(`Generated By User ID: ${data.payslip_generated_by || 'System'} | Generated At: ${data.payslip_generated_at ? new Date(data.payslip_generated_at).toLocaleString() : new Date().toLocaleString()}`, { align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        resolve();
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

async function lockPayrollRun(organizationId, runId, userId) {
  return await withTransaction(async (client) => {
    const run = await repository.getPayrollRunById(organizationId, runId, client);
    if (!run) {
      throw new ApiError(STATUS_CODES.NOT_FOUND, 'Payroll run not found.');
    }
    if (run.current_status !== PAYROLL_STATUS.APPROVED) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only approved payroll runs can be locked.');
    }

    // Update status in run
    const updated = await repository.updatePayrollRunStatus(runId, PAYROLL_STATUS.LOCKED, userId, 'lock', client);
    // Update status in employee payrolls
    await repository.updateEmployeePayrollsStatus(runId, PAYROLL_STATUS.LOCKED, client);

    // Generate PDFs for all employee payrolls
    const employeePayrolls = await repository.getEmployeePayrollsByRunId(runId);
    
    // Ensure the uploads directory exists
    const uploadDir = path.join(process.cwd(), 'uploads/payslips');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    for (const ep of employeePayrolls) {
      // 1. Fetch complete details for each employee payroll
      const details = await client.query(`
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
      `, [ep.employee_payroll_id]);

      const data = details.rows[0];
      if (!data) continue;

      const components = await getComponentsForPayslip(ep.employee_payroll_id, client);
      data.components = components;

      // 2. Generate a unique payslip number
      const payslipNumber = `PAY/${run.payroll_year}/${String(run.payroll_month).padStart(2, '0')}/${data.employee_code || data.employee_id.substring(0, 8)}`;

      // 3. Save info to payslip audit fields
      const payslipGeneratedAt = new Date();
      const relativePath = `uploads/payslips/payslip_${ep.employee_payroll_id}.pdf`;
      const absolutePath = path.join(process.cwd(), relativePath);

      data.payslip_number = payslipNumber;
      data.payslip_generated_at = payslipGeneratedAt;
      data.payslip_generated_by = userId;

      // 4. Generate the PDF
      await generatePayslipPDF(data, absolutePath);

      // 5. Update the DB record with path and audit info
      await client.query(`
        UPDATE employee_payrolls
        SET payslip_url = $1,
            payslip_number = $2,
            payslip_generated_at = $3,
            payslip_generated_by = $4,
            updated_at = NOW()
        WHERE employee_payroll_id = $5
      `, [relativePath, payslipNumber, payslipGeneratedAt, userId, ep.employee_payroll_id]);
    }

    // Log action
    await repository.createRunLog(runId, 'LOCK', userId, 'Locked payroll run. Future changes disabled.', client);

    return updated;
  });

  // Fire-and-forget: notify each employee their payslip is ready (in-app + email)
  getNotifSettings().then(async ns => {
    if (!ns.payroll_processed) return;
    const runInfo = await query('SELECT payroll_month, payroll_year FROM payroll_runs WHERE payroll_run_id = $1', [runId]);
    const runMeta = runInfo.rows[0];
    if (!runMeta) return;
    const monthName = new Date(runMeta.payroll_year, runMeta.payroll_month - 1, 1)
      .toLocaleString('en-US', { month: 'long' });
    const payrolls = await repository.getEmployeePayrollsByRunId(runId);
    for (const ep of payrolls) {
      const userRow = await query(
        'SELECT u.email, e.first_name, e.last_name FROM users u JOIN employees e ON u.employee_id = e.employee_id WHERE e.employee_id = $1 LIMIT 1',
        [ep.employee_id]
      );
      const u = userRow.rows[0];
      if (!u) continue;
      const displayName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Employee';
      // in-app → employee
      notifRepo.createNotification(
        ep.employee_id,
        'payroll_processed',
        'Payslip Ready',
        `Your payslip for ${monthName} ${runMeta.payroll_year} has been processed and is available in the portal.`,
        ep.employee_payroll_id || null,
        'payroll'
      ).catch(() => {});
      // email → employee
      if (u.email) {
        sendPayrollProcessedEmail(u.email, {
          employeeName: displayName,
          payrollMonth: runMeta.payroll_month,
          payrollYear: runMeta.payroll_year,
        }).catch(e => console.error('[Notif] payroll email failed:', e.message));
      }
    }
  }).catch(() => {});
}

// --- Payslips ---
async function getEmployeePayslips(employeeId) {
  return await repository.getEmployeePayrollsForEmployee(employeeId);
}

async function getPayslipDetails(employeeId, employeePayrollId, role) {
  const payslip = await repository.getEmployeePayrollById(employeePayrollId);
  if (!payslip) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Payslip not found.');
  }

  // Restrict access: Employees can only view their own payslips
  if (role !== 'client_admin' && payslip.employee_id !== employeeId) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'Access denied. You do not have permissions to view this payslip.');
  }

  // Fetch adjustments for this run and employee
  const adjustments = await query(`
    SELECT adjustment_name, adjustment_type, amount, remarks
    FROM payroll_adjustments
    WHERE employee_payroll_id = $1
  `, [employeePayrollId]);

  const components = await getComponentsForPayslip(employeePayrollId);

  return {
    payslip,
    adjustments: adjustments.rows,
    components
  };
}

async function downloadPayslipPDF(employeeId, employeePayrollId, role) {
  const payslip = await repository.getEmployeePayrollById(employeePayrollId);
  if (!payslip) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Payslip not found.');
  }

  // Restrict access: Employees can only download their own payslips
  if (role !== 'client_admin' && payslip.employee_id !== employeeId) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'Access denied. You do not have permissions to view this payslip.');
  }

  if (payslip.current_status !== PAYROLL_STATUS.LOCKED) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Payslip is not generated or payroll is not locked yet.');
  }

  let relativePath = payslip.payslip_url;
  if (!relativePath) {
    relativePath = `uploads/payslips/payslip_${employeePayrollId}.pdf`;
  }
  const absolutePath = path.join(process.cwd(), relativePath);

  if (!fs.existsSync(absolutePath)) {
    // Generate PDF on the fly
    const details = await query(`
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
    `, [employeePayrollId]);

    const data = details.rows[0];
    if (!data) {
      throw new ApiError(STATUS_CODES.NOT_FOUND, 'Payslip details not found.');
    }

    const components = await getComponentsForPayslip(employeePayrollId);
    data.components = components;

    const payslipNumber = payslip.payslip_number || `PAY/${data.payroll_year}/${String(data.payroll_month).padStart(2, '0')}/${data.employee_code || data.employee_id.substring(0, 8)}`;
    data.payslip_number = payslipNumber;

    // Ensure the directory exists
    const uploadDir = path.dirname(absolutePath);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    await generatePayslipPDF(data, absolutePath);

    // Update database
    await query(`
      UPDATE employee_payrolls
      SET payslip_url = $1,
          payslip_number = $2,
          payslip_generated_at = COALESCE(payslip_generated_at, NOW()),
          updated_at = NOW()
      WHERE employee_payroll_id = $3
    `, [relativePath, payslipNumber, employeePayrollId]);
  }

  return absolutePath;
}

async function bulkImportAdjustments(organizationId, runId, rows, userId) {
  return await withTransaction(async (client) => {
    // 1. Validate payroll run exists and is not locked
    const run = await repository.getPayrollRunById(organizationId, runId, client);
    if (!run) {
      throw new ApiError(STATUS_CODES.NOT_FOUND, 'Payroll run not found.');
    }
    if (run.current_status === PAYROLL_STATUS.LOCKED) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot import adjustments for a locked payroll run.');
    }

    for (const row of rows) {
      const { employee_code, adjustment_type, amount, remarks } = row;
      if (!employee_code || !adjustment_type || amount === undefined) {
        throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Missing required columns in CSV row.');
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount)) {
        throw new ApiError(STATUS_CODES.BAD_REQUEST, `Invalid amount "${amount}" for employee code ${employee_code}.`);
      }

      // Find the employee payroll record
      const epRes = await client.query(`
        SELECT ep.employee_payroll_id, ep.employee_id
        FROM employee_payrolls ep
        JOIN employees e ON ep.employee_id = e.employee_id
        WHERE ep.payroll_run_id = $1 AND e.organization_id = $2 AND LOWER(e.employee_code) = LOWER($3)
      `, [runId, organizationId, employee_code.trim()]);
      
      const ep = epRes.rows[0];
      if (!ep) {
        throw new ApiError(STATUS_CODES.NOT_FOUND, `Employee payroll record not found for employee code: ${employee_code}.`);
      }

      const typeUpper = adjustment_type.trim().toUpperCase();
      if (typeUpper === 'LOP') {
        // Direct LOP Override: Update lop_days on employee_payrolls
        await repository.updateEmployeePayrollLopDays(ep.employee_payroll_id, parsedAmount, client);
      } else if (typeUpper === 'ADDITION' || typeUpper === 'DEDUCTION') {
        // Insert manual adjustment
        await repository.createAdjustment({
          employee_payroll_id: ep.employee_payroll_id,
          adjustment_type: typeUpper,
          adjustment_name: remarks ? remarks.trim() : 'Bulk Import Adjustment',
          amount: parsedAmount,
          remarks: remarks ? remarks.trim() : null,
          created_by_admin_user_id: userId
        }, client);
      } else {
        throw new ApiError(STATUS_CODES.BAD_REQUEST, `Invalid adjustment type "${adjustment_type}" for employee ${employee_code}. Expected ADDITION, DEDUCTION, or LOP.`);
      }

      // Recalculate employee payroll
      await recalculateEmployeePayroll(runId, ep.employee_id, client);
    }

    // Write to run logs
    await repository.createRunLog(
      runId,
      'ADJUST',
      userId,
      `Bulk imported ${rows.length} adjustments/LOP overrides.`,
      client
    );

    return true;
  });
}

// --- Dynamic Payroll Components Service ---
async function getPayrollComponents(orgId) {
  return await repository.getPayrollComponents(orgId);
}

async function getPayrollComponentById(orgId, id) {
  const comp = await repository.getPayrollComponentById(orgId, id);
  if (!comp) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Payroll component not found.');
  }
  return comp;
}

async function createPayrollComponent(orgId, data) {
  return await repository.createPayrollComponent(orgId, data);
}

async function updatePayrollComponent(orgId, id, data) {
  const current = await repository.getPayrollComponentById(orgId, id);
  if (!current) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Payroll component not found.');
  }
  return await repository.updatePayrollComponent(orgId, id, data);
}

async function deletePayrollComponent(orgId, id) {
  const current = await repository.getPayrollComponentById(orgId, id);
  if (!current) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Payroll component not found.');
  }
  return await repository.deletePayrollComponent(orgId, id);
}

// --- Employee Salary Configuration Service ---
async function getEmployeeSalaryConfig(orgId, employeeId, targetDate = null) {
  const date = targetDate || new Date().toISOString().split('T')[0];
  const config = await repository.getEmployeeSalaryConfigForDate(orgId, employeeId, date);
  if (!config) return null;

  const components = await repository.getEmployeeSalaryComponents(config.employee_salary_config_id);
  return {
    ...config,
    components
  };
}

async function calculateComponentsForGrossFloat(organizationId, grossSalary) {
  const orgComponents = await repository.getPayrollComponents(organizationId);

  // 1. Map components and build adjacency list for topological sorting
  const comps = orgComponents.map(c => ({
    component_id: c.component_id,
    component_name: c.component_name,
    component_code: c.component_code,
    component_type: c.component_type,
    category: c.category,
    calculation_basis: c.calculation_basis,
    reference_component_id: c.reference_component_id,
    is_balancing_component: !!c.is_balancing_component,
    percentage: parseFloat(c.default_value) || 0,
    fixed_amount: parseFloat(c.default_value) || 0,
    calculated_amount: 0
  }));

  const adj = {};
  const inDegree = {};
  comps.forEach(c => {
    adj[c.component_id] = [];
    inDegree[c.component_id] = 0;
  });

  // 2. Add edges based on calculation basis dependencies
  comps.forEach(c => {
    if (c.calculation_basis === 'BASIC') {
      const basicComp = comps.find(rc => rc.component_code === 'BASIC');
      if (basicComp) {
        adj[basicComp.component_id].push(c.component_id);
        inDegree[c.component_id]++;
      }
    } else if (c.calculation_basis === 'COMPONENT' && c.reference_component_id) {
      if (adj[c.reference_component_id]) {
        adj[c.reference_component_id].push(c.component_id);
        inDegree[c.component_id]++;
      }
    }
  });

  // 3. Perform Topological Sort (Kahn's Algorithm)
  const queue = [];
  comps.forEach(c => {
    if (inDegree[c.component_id] === 0) queue.push(c.component_id);
  });

  const sortedOrder = [];
  while (queue.length > 0) {
    const currId = queue.shift();
    sortedOrder.push(currId);
    (adj[currId] || []).forEach(nextId => {
      inDegree[nextId]--;
      if (inDegree[nextId] === 0) queue.push(nextId);
    });
  }

  if (sortedOrder.length !== comps.length) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Circular dependency detected among salary components.');
  }

  // 4. Calculate amounts in topological order (Float math)
  sortedOrder.forEach(id => {
    const c = comps.find(rc => rc.component_id === id);
    if (c.is_balancing_component) return; // Process balancing component last

    let amt = 0;
    
    // Statutory fallbacks & eligibility rules
    if (c.component_code === 'EMPLOYER_ESI' || c.component_code === 'ESI') {
      const pct = (c.component_code === 'EMPLOYER_ESI') ? (c.percentage || 3.25) : (c.percentage || 0.75);
      if (grossSalary <= 21000) {
        amt = (pct / 100) * grossSalary;
      } else {
        amt = 0;
      }
    } else if (c.component_code === 'PROFESSIONAL_TAX') {
      amt = c.fixed_amount || 200.00;
    } else {
      // Standard dynamic components
      if (c.calculation_basis === 'FIXED_AMOUNT') {
        amt = c.fixed_amount;
      } else if (c.calculation_basis === 'GROSS') {
        amt = (c.percentage / 100) * grossSalary;
      } else if (c.calculation_basis === 'BASIC') {
        const basicComp = comps.find(rc => rc.component_code === 'BASIC');
        const basicVal = basicComp ? basicComp.calculated_amount : 0;
        amt = (c.percentage / 100) * basicVal;
      } else if (c.calculation_basis === 'COMPONENT' && c.reference_component_id) {
        const refComp = comps.find(rc => rc.component_id === c.reference_component_id);
        const refVal = refComp ? refComp.calculated_amount : 0;
        amt = (c.percentage / 100) * refVal;
      }
    }

    c.calculated_amount = amt;
  });

  // 5. Balance the remaining gross salary into the balancing component
  const nonBalancingEarningsSum = comps
    .filter(c => c.component_type === 'EARNING' && !c.is_balancing_component)
    .reduce((sum, c) => sum + c.calculated_amount, 0);

  const balancingComp = comps.find(c => c.is_balancing_component);
  if (balancingComp) {
    const balancingVal = grossSalary - nonBalancingEarningsSum;
    balancingComp.calculated_amount = balancingVal;
    balancingComp.fixed_amount = balancingVal;
  }

  return comps;
}

async function calculateGrossFromCtc(organizationId, employeeId, targetMonthlyCtc, inputComponents = null) {
  let low = 0;
  let high = targetMonthlyCtc;
  let gross = targetMonthlyCtc;

  // Numerical solver (Bisection Search) - converges to < 1e-6 precision
  for (let iter = 0; iter < 50; iter++) {
    gross = (low + high) / 2;
    const comps = await calculateComponentsForGrossFloat(organizationId, gross);

    if (Array.isArray(inputComponents) && inputComponents.length > 0) {
      comps.forEach(c => {
        const ic = inputComponents.find(item => item.component_id === c.component_id);
        if (ic) {
          if (ic.percentage !== undefined && ic.percentage !== null && !isNaN(parseFloat(ic.percentage))) {
            c.percentage = parseFloat(ic.percentage);
          }
          if (ic.fixed_amount !== undefined && ic.fixed_amount !== null && !isNaN(parseFloat(ic.fixed_amount))) {
            c.fixed_amount = parseFloat(ic.fixed_amount);
          }
          if (ic.is_manual_override !== undefined) {
            c.is_manual_override = !!ic.is_manual_override;
          }
          if (ic.manual_amount !== undefined && ic.manual_amount !== null && !isNaN(parseFloat(ic.manual_amount))) {
            c.manual_amount = parseFloat(ic.manual_amount);
          }
        }
      });
    }

    const basicComp = comps.find(c => c.component_code === 'BASIC');
    let basicVal = 0;
    if (basicComp) {
      if (basicComp.is_manual_override) basicVal = basicComp.manual_amount;
      else if (basicComp.calculation_basis === 'GROSS') basicVal = (basicComp.percentage / 100) * gross;
      else if (basicComp.calculation_basis === 'FIXED_AMOUNT') basicVal = basicComp.fixed_amount;
    }

    let employerContribSum = 0;
    comps.filter(c => c.component_type === 'EMPLOYER_CONTRIBUTION').forEach(c => {
      if (c.is_manual_override) {
        employerContribSum += c.manual_amount;
      } else if (c.component_code === 'EMPLOYER_PF') {
        employerContribSum += ((c.percentage || 12) / 100) * basicVal;
      } else if (c.component_code === 'EMPLOYER_ESI') {
        // Enforce Statutory ESI Rule: ESI applies ONLY if Gross Salary <= 21,000 INR
        if (gross <= 21000) {
          employerContribSum += ((c.percentage || 3.25) / 100) * gross;
        }
      } else if (c.calculation_basis === 'BASIC') {
        employerContribSum += ((c.percentage || 0) / 100) * basicVal;
      } else if (c.calculation_basis === 'GROSS') {
        employerContribSum += ((c.percentage || 0) / 100) * gross;
      } else if (c.calculation_basis === 'FIXED_AMOUNT') {
        employerContribSum += c.fixed_amount || 0;
      }
    });

    const calculatedCtc = gross + employerContribSum;

    if (Math.abs(calculatedCtc - targetMonthlyCtc) < 0.000001) {
      break;
    }

    if (calculatedCtc > targetMonthlyCtc) {
      high = gross;
    } else {
      low = gross;
    }
  }

  return Math.round(gross * 100) / 100;
}

async function calculateComponentsForGross(organizationId, employeeId, grossSalary) {
  const comps = await calculateComponentsForGrossFloat(organizationId, grossSalary);

  // Round calculated amounts *only once* at the end of the pipeline
  comps.forEach(c => {
    c.calculated_amount = Math.round(c.calculated_amount * 100) / 100;
  });

  return comps;
}

async function getSalaryBreakdownPreview(orgId, salaryType, salaryAmount, inputComponents = null) {
  const inputAmt = parseFloat(salaryAmount) || 0;
  let gross = inputAmt;
  let targetMonthlyCtc = null;

  if (salaryType === 'ANNUAL_CTC') {
    targetMonthlyCtc = inputAmt / 12;
    gross = await calculateGrossFromCtc(orgId, null, targetMonthlyCtc, inputComponents);
  }

  const comps = await calculateComponentsForGross(orgId, null, gross);

  // Apply manual overrides or custom rates/amounts if present in input components
  if (Array.isArray(inputComponents) && inputComponents.length > 0) {
    comps.forEach(c => {
      const inputComp = inputComponents.find(ic => ic.component_id === c.component_id);
      if (inputComp) {
        if (inputComp.fixed_amount !== undefined && inputComp.fixed_amount !== null && !isNaN(parseFloat(inputComp.fixed_amount))) {
          c.fixed_amount = parseFloat(inputComp.fixed_amount);
        }
        if (inputComp.percentage !== undefined && inputComp.percentage !== null && !isNaN(parseFloat(inputComp.percentage))) {
          c.percentage = parseFloat(inputComp.percentage);
        }
        if (inputComp.is_manual_override !== undefined) {
          c.is_manual_override = !!inputComp.is_manual_override;
        }
        if (inputComp.manual_amount !== undefined && inputComp.manual_amount !== null && !isNaN(parseFloat(inputComp.manual_amount))) {
          c.manual_amount = parseFloat(inputComp.manual_amount);
        }
        if (inputComp.is_fixed_override !== undefined) {
          c.is_fixed_override = !!inputComp.is_fixed_override;
        }
      }
    });

    // Step 1: Basic component
    const basicComp = comps.find(c => c.component_code === 'BASIC');
    if (basicComp) {
      if (basicComp.is_manual_override) {
        basicComp.calculated_amount = basicComp.manual_amount;
      } else if (basicComp.calculation_basis === 'GROSS') {
        basicComp.calculated_amount = (basicComp.percentage / 100) * gross;
      } else if (basicComp.calculation_basis === 'FIXED_AMOUNT') {
        basicComp.calculated_amount = basicComp.fixed_amount;
      }
    }

    // Step 2: Non-balancing components
    comps.forEach(c => {
      if (c.is_balancing_component) return;

      if (c.is_manual_override) {
        c.calculated_amount = c.manual_amount;
      } else if (c.component_code === 'ESI' || c.component_code === 'EMPLOYER_ESI') {
        // Enforce Statutory ESI Rule: ESI applies ONLY if Gross Salary <= 21,000 INR
        if (gross <= 21000) {
          const pct = (c.component_code === 'EMPLOYER_ESI') ? (c.percentage || 3.25) : (c.percentage || 0.75);
          c.calculated_amount = (pct / 100) * gross;
        } else {
          c.calculated_amount = 0;
        }
      } else if (c.calculation_basis === 'FIXED_AMOUNT') {
        c.calculated_amount = c.fixed_amount;
      } else if (c.calculation_basis === 'GROSS') {
        c.calculated_amount = (c.percentage / 100) * gross;
      } else if (c.calculation_basis === 'BASIC') {
        const basicVal = basicComp ? basicComp.calculated_amount : 0;
        c.calculated_amount = (c.percentage / 100) * basicVal;
      } else if (c.calculation_basis === 'COMPONENT' && c.reference_component_id) {
        const refComp = comps.find(rc => rc.component_id === c.reference_component_id);
        const refVal = refComp ? refComp.calculated_amount : 0;
        c.calculated_amount = (c.percentage / 100) * refVal;
      }
    });

    // Step 3: Balancing component (Special Allowance)
    const balancingComp = comps.find(c => c.is_balancing_component);
    if (balancingComp) {
      if (balancingComp.is_manual_override) {
        balancingComp.calculated_amount = balancingComp.manual_amount;
      } else if (balancingComp.is_fixed_override) {
        balancingComp.calculated_amount = balancingComp.fixed_amount;
      } else {
        const nonBalancingEarningsSum = comps
          .filter(c => c.component_type === 'EARNING' && !c.is_balancing_component)
          .reduce((sum, c) => sum + c.calculated_amount, 0);

        const balancingVal = gross - nonBalancingEarningsSum;
        balancingComp.calculated_amount = Math.max(0, balancingVal);
        balancingComp.fixed_amount = balancingComp.calculated_amount;
      }
    }
  } else {
    // Enforce Statutory ESI Rule when inputComponents is null
    comps.forEach(c => {
      if (c.component_code === 'ESI' || c.component_code === 'EMPLOYER_ESI') {
        if (gross > 21000) {
          c.calculated_amount = 0;
        }
      }
    });
  }

  // Round calculated_amount for all components to 2 decimal places
  comps.forEach(c => {
    c.calculated_amount = Math.round(c.calculated_amount * 100) / 100;
  });

  const totalEarnings = comps
    .filter(c => c.component_type === 'EARNING')
    .reduce((sum, c) => sum + c.calculated_amount, 0);

  const totalDeductions = comps
    .filter(c => c.component_type === 'DEDUCTION')
    .reduce((sum, c) => sum + c.calculated_amount, 0);

  const totalBenefits = comps
    .filter(c => c.component_type === 'EMPLOYER_CONTRIBUTION')
    .reduce((sum, c) => sum + c.calculated_amount, 0);

  const netTakeHome = totalEarnings - totalDeductions;

  // Validation rule: Total earnings vs Gross Salary
  let isValid = true;
  let errorMessage = null;

  const roundedEarningsSum = Math.round(totalEarnings * 100) / 100;
  const roundedGrossTarget = Math.round(gross * 100) / 100;

  if (Math.abs(roundedEarningsSum - roundedGrossTarget) > 0.1) {
    isValid = false;
    errorMessage = `Configured earning components (₹${roundedEarningsSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}) exceed or do not equal Gross Salary (₹${roundedGrossTarget.toLocaleString('en-IN', { minimumFractionDigits: 2 })}). Reduce one or more earning components or adjust Gross Salary.`;
  }

  // CTC determination
  let monthlyCtc = 0;
  let annualCtc = 0;

  if (salaryType === 'ANNUAL_CTC') {
    monthlyCtc = Math.round(targetMonthlyCtc * 100) / 100;
    annualCtc = Math.round(inputAmt * 100) / 100;
  } else {
    monthlyCtc = Math.round((totalEarnings + totalBenefits) * 100) / 100;
    annualCtc = Math.round(monthlyCtc * 12 * 100) / 100;
  }

  return {
    is_valid: isValid,
    error_message: errorMessage,
    annual_ctc: annualCtc,
    monthly_ctc: monthlyCtc,
    monthly_gross: Math.round(totalEarnings * 100) / 100,
    net_salary: Math.round(netTakeHome * 100) / 100,
    gross_salary: Math.round(totalEarnings * 100) / 100,
    total_earnings: Math.round(totalEarnings * 100) / 100,
    total_deductions: Math.round(totalDeductions * 100) / 100,
    total_benefits: Math.round(totalBenefits * 100) / 100,
    components: comps
  };
}

async function generateSalaryConfigPayload(orgId, employeeId, salaryType, salaryAmount, effectiveFrom) {
  let gross = parseFloat(salaryAmount) || 0;

  if (salaryType === 'ANNUAL_CTC') {
    const targetMonthlyCtc = gross / 12;
    gross = await calculateGrossFromCtc(orgId, employeeId, targetMonthlyCtc);
  }

  const calculatedComps = await calculateComponentsForGross(orgId, employeeId, gross);

  const formattedComponents = calculatedComps.map(c => ({
    component_id: c.component_id,
    percentage: c.percentage,
    fixed_amount: c.fixed_amount,
    calculated_amount: c.calculated_amount,
    is_manual: false,
    is_manual_override: false,
    manual_amount: null
  }));

  const earningsSum = calculatedComps.filter(c => c.component_type === 'EARNING').reduce((sum, c) => sum + c.calculated_amount, 0);
  const employerContribSum = calculatedComps.filter(c => c.component_type === 'EMPLOYER_CONTRIBUTION').reduce((sum, c) => sum + c.calculated_amount, 0);
  const ctcAmount = (earningsSum + employerContribSum) * (salaryType === 'ANNUAL_CTC' ? 12 : 1);

  return {
    salary_type: salaryType,
    gross_salary: Math.round(gross * 100) / 100,
    ctc_amount: Math.round(ctcAmount * 100) / 100,
    effective_from: effectiveFrom,
    components: formattedComponents
  };
}

async function saveEmployeeSalaryConfig(orgId, employeeId, data, txClient = null) {
  // Resolve dynamically on the backend
  let gross = parseFloat(data.gross_salary) || 0;
  
  const payload = await generateSalaryConfigPayload(orgId, employeeId, data.salary_type, data.salary_type === 'ANNUAL_CTC' ? gross * 12 : gross, data.effective_from);

  // Apply manual overrides if present in input components
  if (Array.isArray(data.components)) {
    payload.components.forEach(c => {
      const inputComp = data.components.find(ic => ic.component_id === c.component_id);
      if (inputComp && inputComp.is_manual_override) {
        c.is_manual_override = true;
        c.manual_amount = parseFloat(inputComp.manual_amount) || 0;
        c.calculated_amount = c.manual_amount;
      }
    });
    // Recalculate gross and ctc based on overrides
    const calculatedComps = payload.components;
    const earningsSum = calculatedComps.filter(c => c.component_type === 'EARNING').reduce((sum, c) => sum + c.calculated_amount, 0);
    const employerContribSum = calculatedComps.filter(c => c.component_type === 'EMPLOYER_CONTRIBUTION').reduce((sum, c) => sum + c.calculated_amount, 0);
    payload.gross_salary = Math.round(earningsSum * 100) / 100;
    payload.ctc_amount = Math.round((earningsSum + employerContribSum) * (data.salary_type === 'ANNUAL_CTC' ? 12 : 1) * 100) / 100;
  }

  const run = txClient || { query };
  return await repository.saveEmployeeSalaryConfig(orgId, employeeId, payload, run);
}

module.exports = {
  createSalaryStructure,
  listSalaryStructures,
  updateSalaryStructure,
  assignSalaryStructure,
  listSalaryAssignments,
  getWeekOffToggles,
  updateWeekOffToggles,
  listWeekOffSettings,
  getWeekOffSettingById,
  upsertWeekOffSetting,
  deleteWeekOffSetting,
  resolveWeekOffRule,
  calculateWeekOffDays,
  generatePayrollRun,
  listPayrollRuns,
  getPayrollRunDetails,
  createAdjustment,
  deleteAdjustment,
  approvePayrollRun,
  lockPayrollRun,
  getEmployeePayslips,
  getPayslipDetails,
  downloadPayslipPDF,
  bulkImportAdjustments,
  getPayrollComponents,
  getPayrollComponentById,
  createPayrollComponent,
  updatePayrollComponent,
  deletePayrollComponent,
  getEmployeeSalaryConfig,
  saveEmployeeSalaryConfig,
  calculateComponentsForGross,
  calculateGrossFromCtc,
  getSalaryBreakdownPreview,
  generateSalaryConfigPayload,
};
