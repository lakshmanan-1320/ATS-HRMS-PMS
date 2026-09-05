const leaveRepository = require('./leave.repository');
const leavePlansRepo = require('./leavePlans.repository');
const employeeRepository = require('../employee/employee.repository');
const { withTransaction, query } = require('../../config/db');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');
const { getSettings: getNotifSettings } = require('../notification/notificationSettings.repository');
const {
  sendLeaveSubmittedEmail,
  sendLeaveDecisionEmail,
  sendOptionalHolidaySubmittedEmail,
  sendOptionalHolidayDecisionEmail
} = require('../notification/email.service');
const notifRepo = require('../inAppNotification/inAppNotification.repository');

async function getEmailForEmployee(employeeId) {
  const r = await query('SELECT email FROM users WHERE employee_id = $1 LIMIT 1', [employeeId]);
  return r.rows[0]?.email || null;
}

async function getLeaveEmailRecipients(organizationId, managerEmployeeId) {
  // 1. Fetch HR users from users table
  const hrResult = await query(
    `SELECT email FROM users WHERE role = 'hr' AND organization_id = $1 AND is_active = true`,
    [organizationId]
  );
  const hrEmails = hrResult.rows.map(r => r.email).filter(Boolean);

  // 2. Fetch Client Admins
  const adminResult = await query(
    `SELECT email FROM client_admins WHERE organization_id = $1 AND status = 'active'`,
    [organizationId]
  );
  const adminEmails = adminResult.rows.map(r => r.email).filter(Boolean);

  // 3. Fetch Reporting Manager
  let managerEmail = null;
  if (managerEmployeeId) {
    const mgrResult = await query(
      `SELECT email FROM employees WHERE employee_id = $1`,
      [managerEmployeeId]
    );
    if (mgrResult.rows[0]) {
      managerEmail = mgrResult.rows[0].email;
    }
  }

  return {
    hrEmails,
    adminEmails,
    managerEmail
  };
}

async function sendLeaveDecisionEmails(req, status, remarks) {
  try {
    const recipients = await getLeaveEmailRecipients(req.organization_id, null);
    const empEmail = await getEmailForEmployee(req.employee_id);

    const mailPayload = {
      employeeName: req.employee_name || 'Employee',
      leaveType: req.leave_type_name || '',
      startDate: req.start_date,
      endDate: req.end_date,
      status,
      remarks: remarks || '',
    };

    // 1. Send to employee
    if (empEmail) {
      sendLeaveDecisionEmail(empEmail, mailPayload).catch(e =>
        console.error('[Notif] leave decision email to employee failed:', e.message)
      );
    }

    // 2. Send to Client Admins
    recipients.adminEmails.forEach(adminEmail => {
      sendLeaveDecisionEmail(adminEmail, mailPayload).catch(e =>
        console.error('[Notif] leave decision email to admin failed:', e.message)
      );
    });

    // 3. Send to HR users
    recipients.hrEmails.forEach(hrEmail => {
      sendLeaveDecisionEmail(hrEmail, mailPayload).catch(e =>
        console.error('[Notif] leave decision email to HR failed:', e.message)
      );
    });
  } catch (e) {
    console.error('[Notif] sendLeaveDecisionEmails failed:', e.message);
  }
}

// -------------------------------------------------------------
// Leave Settings Cache
// -------------------------------------------------------------

let _cachedSettings = null;

async function getLeaveSettings() {
  if (!_cachedSettings) {
    _cachedSettings = await leaveRepository.getLeavePolicySettings();
  }
  return _cachedSettings;
}

function invalidateSettingsCache() {
  _cachedSettings = null;
}

// -------------------------------------------------------------
// Leave Ledger Summary Cache Synchronizer
// -------------------------------------------------------------

async function syncBalanceCache(employeeId, leaveTypeId, financialYear, txClient = null) {
  const run = txClient || { query };

  // Reconcile approved, pending, rejected, and cancelled leave requests with ledger entries
  try {
    const settings = await getLeaveSettings();
    const requestsRes = await run.query(
      `SELECT leave_request_id, start_date, end_date, total_leave_days, current_status 
       FROM leave_requests 
       WHERE employee_id = $1 AND leave_type_id = $2`,
      [employeeId, leaveTypeId]
    );

    for (const r of requestsRes.rows) {
      const requestFY = computeLeaveYear(r.start_date, settings);
      if (requestFY !== financialYear) continue;

      const reqDays = parseFloat(r.total_leave_days);
      const ledgerRes = await run.query(
        `SELECT ledger_entry_id, transaction_type, days 
         FROM leave_ledger_entries 
         WHERE reference_id = $1`,
        [r.leave_request_id]
      );

      const usedEntry = ledgerRes.rows.find(e => e.transaction_type === 'USED');
      const adjEntry = ledgerRes.rows.find(e => e.transaction_type === 'ADJUSTMENT');

      if (r.current_status === 'APPROVED') {
        if (!usedEntry) {
          await run.query(
            `INSERT INTO leave_ledger_entries (employee_id, leave_type_id, financial_year, transaction_type, days, reference_id, remarks, created_at)
             VALUES ($1, $2, $3, 'USED', $4, $5, 'Reconciliation: Auto-provisioned missing USED entry', NOW())`,
            [employeeId, leaveTypeId, financialYear, -reqDays, r.leave_request_id]
          );
        } else if (parseFloat(usedEntry.days) !== -reqDays) {
          await run.query(
            `UPDATE leave_ledger_entries SET days = $1, updated_at = NOW() WHERE ledger_entry_id = $2`,
            [-reqDays, usedEntry.ledger_entry_id]
          );
        }
        if (adjEntry) {
          await run.query(`DELETE FROM leave_ledger_entries WHERE ledger_entry_id = $1`, [adjEntry.ledger_entry_id]);
        }
      } else if (r.current_status === 'PENDING' || r.current_status === 'REJECTED') {
        if (usedEntry || adjEntry) {
          await run.query(`DELETE FROM leave_ledger_entries WHERE reference_id = $1`, [r.leave_request_id]);
        }
      } else if (r.current_status === 'CANCELLED') {
        if (usedEntry) {
          if (!adjEntry) {
            await run.query(
              `INSERT INTO leave_ledger_entries (employee_id, leave_type_id, financial_year, transaction_type, days, reference_id, remarks, created_at)
               VALUES ($1, $2, $3, 'ADJUSTMENT', $4, $5, 'Reconciliation: Auto-provisioned missing cancellation adjustment', NOW())`,
              [employeeId, leaveTypeId, financialYear, reqDays, r.leave_request_id]
            );
          } else if (parseFloat(adjEntry.days) !== reqDays) {
            await run.query(
              `UPDATE leave_ledger_entries SET days = $1, updated_at = NOW() WHERE ledger_entry_id = $2`,
              [reqDays, adjEntry.ledger_entry_id]
            );
          }
        } else {
          if (adjEntry) {
            await run.query(`DELETE FROM leave_ledger_entries WHERE ledger_entry_id = $1`, [adjEntry.ledger_entry_id]);
          }
        }
      }
    }
  } catch (reconcileErr) {
    console.error('[Reconciliation] Error during syncBalanceCache reconciliation:', reconcileErr.message);
  }

  const res = await run.query(
    `SELECT 
       COALESCE(SUM(CASE WHEN days > 0 THEN days ELSE 0 END), 0.00)::numeric AS allocated_days,
       COALESCE(SUM(CASE WHEN days < 0 THEN -days ELSE 0 END), 0.00)::numeric AS used_days
     FROM leave_ledger_entries
     WHERE employee_id = $1 AND leave_type_id = $2 AND financial_year = $3`,
    [employeeId, leaveTypeId, financialYear]
  );
  const { allocated_days, used_days } = res.rows[0];

  await run.query(
    `INSERT INTO employee_leave_balances (employee_id, leave_type_id, financial_year, allocated_days, used_days)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (employee_id, leave_type_id, financial_year)
     DO UPDATE SET allocated_days = EXCLUDED.allocated_days, used_days = EXCLUDED.used_days, updated_at = NOW()`,
    [employeeId, leaveTypeId, financialYear, allocated_days, used_days]
  );
}

// -------------------------------------------------------------
// Leave Year Helpers
// -------------------------------------------------------------

/**
 * Compute the leave year number for a given date.
 */
function computeLeaveYear(dateInput, settings) {
  const d = new Date(dateInput);
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  const startMonth = settings.leave_year_start_month || 4;
  return month >= startMonth ? year : year - 1;
}

/**
 * Returns ISO date strings for the start and end of a leave year.
 */
function getLeaveYearDateRange(leaveYear, settings) {
  const startMonth = settings.leave_year_start_month || 4;
  const startStr = `${leaveYear}-${String(startMonth).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(leaveYear + 1, startMonth - 1, 0));
  const endStr = lastDay.toISOString().split('T')[0];
  return { start: startStr, end: endStr };
}

/**
 * Pro-rata allocation
 */
function calculateProRataDays(annualDays, joiningDateStr, leaveYearStartMonth) {
  if (!joiningDateStr) return annualDays;
  const joining = new Date(joiningDateStr + 'T00:00:00Z');
  const joinMonth = joining.getUTCMonth() + 1;
  const startMonth = leaveYearStartMonth || 4;

  const monthsOffset = joinMonth >= startMonth
    ? joinMonth - startMonth
    : 12 - startMonth + joinMonth;

  const remainingMonths = 12 - monthsOffset;
  const raw = (annualDays / 12) * remainingMonths;
  return Math.round(raw * 2) / 2;
}

async function getFinancialYear(dateInput) {
  const settings = await getLeaveSettings();
  return computeLeaveYear(dateInput, settings);
}

// -------------------------------------------------------------
// Leave Day Calculation
// -------------------------------------------------------------

async function calculateLeaveDays(startDateStr, endDateStr, sessionType) {
  const start = new Date(startDateStr + 'T00:00:00Z');
  const end = new Date(endDateStr + 'T00:00:00Z');

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Invalid start or end date.');
  }
  if (start > end) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Start date must be before or equal to end date.');
  }

  const holidayRes = await query(
    `SELECT holiday_date FROM holidays
     WHERE is_active = true AND is_deleted = false
       AND holiday_date BETWEEN $1 AND $2`,
    [startDateStr, endDateStr]
  );
  const holidayDates = new Set(holidayRes.rows.map(r => r.holiday_date));

  let totalDays = 0;
  let current = new Date(start);
  while (current <= end) {
    if (!holidayDates.has(current.toISOString().split('T')[0])) totalDays += 1;
    current.setUTCDate(current.getUTCDate() + 1);
  }

  if (totalDays === 0) return 0;

  if (totalDays === 1) {
    if (sessionType === 'FIRST_HALF' || sessionType === 'SECOND_HALF') return 0.5;
  } else {
    if (sessionType && sessionType !== 'FULL_DAY') {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Half-day requests are only allowed for single-day leaves.');
    }
  }

  return totalDays;
}

// -------------------------------------------------------------
// Leave Types Configuration (CLIENT_ADMIN)
// -------------------------------------------------------------

async function addLeaveType(data) {
  if (!data.leave_type_name?.trim()) throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Leave type name is required.');
  if (!data.leave_type_code?.trim()) throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Leave type code is required.');

  const existing = await leaveRepository.getLeaveTypeByCode(data.leave_type_code);
  if (existing) throw new ApiError(STATUS_CODES.CONFLICT, `Leave type code "${data.leave_type_code}" already exists.`);

  return await leaveRepository.createLeaveType(data);
}

async function propagateLeaveTypeQuotaUpdate(leaveTypeId, newQuota) {
  const settings = await getLeaveSettings();
  const fy = computeLeaveYear(new Date(), settings);

  await withTransaction(async (client) => {
    // 1. Update the leave_plan_types quota
    await client.query(
      'UPDATE leave_plan_types SET quota_days = $1 WHERE leave_type_id = $2',
      [newQuota, leaveTypeId]
    );

    // 2. Find all employees assigned to plans mapping this leave type
    const empRes = await client.query(
      `SELECT DISTINCT e.employee_id, e.date_of_joining, e.leave_plan_id, e.organization_id
       FROM employees e
       JOIN leave_plans lp ON (e.leave_plan_id = lp.leave_plan_id OR (e.leave_plan_id IS NULL AND lp.organization_id = e.organization_id AND lp.is_active = true))
       JOIN leave_plan_types lpt ON lpt.leave_plan_id = lp.leave_plan_id
       WHERE lpt.leave_type_id = $1`,
      [leaveTypeId]
    );

    for (const emp of empRes.rows) {
      let finalCredit = parseFloat(newQuota);
      if (settings.pro_rata_on_join) {
        const joinDate = emp.date_of_joining;
        if (joinDate) {
          const joinDateStr = joinDate instanceof Date ? joinDate.toISOString().slice(0, 10) : new Date(joinDate).toISOString().slice(0, 10);
          finalCredit = calculateProRataDays(finalCredit, joinDateStr, settings.leave_year_start_month);
        }
      }

      // 3. Find if they have an AWARDED entry for this year
      const entryRes = await client.query(
        `SELECT ledger_entry_id FROM leave_ledger_entries 
         WHERE employee_id = $1 AND leave_type_id = $2 AND financial_year = $3 AND transaction_type = 'AWARDED'
         LIMIT 1`,
        [emp.employee_id, leaveTypeId, fy]
      );

      if (entryRes.rows.length > 0) {
        // Update existing AWARDED entry
        await client.query(
          `UPDATE leave_ledger_entries SET days = $1 WHERE ledger_entry_id = $2`,
          [finalCredit, entryRes.rows[0].ledger_entry_id]
        );
      } else {
        // Check if they have any other entries for this leave type and financial year
        const anyEntryRes = await client.query(
          `SELECT ledger_entry_id FROM leave_ledger_entries 
           WHERE employee_id = $1 AND leave_type_id = $2 AND financial_year = $3
           LIMIT 1`,
          [emp.employee_id, leaveTypeId, fy]
        );
        if (anyEntryRes.rows.length === 0) {
          await leavePlansRepo.createLedgerEntry({
            employee_id: emp.employee_id,
            leave_type_id: leaveTypeId,
            financial_year: fy,
            transaction_type: 'AWARDED',
            days: finalCredit,
            remarks: 'Plan quota updated'
          }, client);
        }
      }

      // 4. Sync the balance cache
      await syncBalanceCache(emp.employee_id, leaveTypeId, fy, client);
    }
  });
}

async function propagatePlanTypeQuotaUpdate(planId, leaveTypeId, newQuota) {
  const settings = await getLeaveSettings();
  const fy = computeLeaveYear(new Date(), settings);

  await withTransaction(async (client) => {
    // Find all employees assigned to this plan (directly or via organization default)
    const empRes = await client.query(
      `SELECT employee_id, date_of_joining, leave_plan_id, organization_id
       FROM employees
       WHERE leave_plan_id = $1 OR (leave_plan_id IS NULL AND (
         SELECT leave_plan_id FROM leave_plans 
         WHERE organization_id = employees.organization_id AND is_active = true 
         ORDER BY created_at ASC LIMIT 1
       ) = $1)`,
      [planId]
    );

    for (const emp of empRes.rows) {
      let finalCredit = parseFloat(newQuota);
      if (settings.pro_rata_on_join) {
        const joinDate = emp.date_of_joining;
        if (joinDate) {
          const joinDateStr = joinDate instanceof Date ? joinDate.toISOString().slice(0, 10) : new Date(joinDate).toISOString().slice(0, 10);
          finalCredit = calculateProRataDays(finalCredit, joinDateStr, settings.leave_year_start_month);
        }
      }

      const entryRes = await client.query(
        `SELECT ledger_entry_id FROM leave_ledger_entries 
         WHERE employee_id = $1 AND leave_type_id = $2 AND financial_year = $3 AND transaction_type = 'AWARDED'
         LIMIT 1`,
        [emp.employee_id, leaveTypeId, fy]
      );

      if (entryRes.rows.length > 0) {
        await client.query(
          `UPDATE leave_ledger_entries SET days = $1 WHERE ledger_entry_id = $2`,
          [finalCredit, entryRes.rows[0].ledger_entry_id]
        );
      } else {
        const anyEntryRes = await client.query(
          `SELECT ledger_entry_id FROM leave_ledger_entries 
           WHERE employee_id = $1 AND leave_type_id = $2 AND financial_year = $3
           LIMIT 1`,
          [emp.employee_id, leaveTypeId, fy]
        );
        if (anyEntryRes.rows.length === 0) {
          await leavePlansRepo.createLedgerEntry({
            employee_id: emp.employee_id,
            leave_type_id: leaveTypeId,
            financial_year: fy,
            transaction_type: 'AWARDED',
            days: finalCredit,
            remarks: 'Plan quota updated'
          }, client);
        }
      }

      await syncBalanceCache(emp.employee_id, leaveTypeId, fy, client);
    }
  });
}

async function editLeaveType(leaveTypeId, data) {
  const existing = await leaveRepository.getLeaveTypeById(leaveTypeId);
  if (!existing) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Leave type not found.');
  const updated = await leaveRepository.updateLeaveType(leaveTypeId, data);

  const newQuota = parseFloat(data.annual_quota_days);
  const oldQuota = parseFloat(existing.annual_quota_days);
  if (!isNaN(newQuota) && newQuota !== oldQuota) {
    await propagateLeaveTypeQuotaUpdate(leaveTypeId, newQuota);
  }

  return updated;
}

async function listLeaveTypes(onlyActive = false) {
  return await leaveRepository.getLeaveTypes(onlyActive);
}

// -------------------------------------------------------------
// Leave Policy Settings
// -------------------------------------------------------------

async function getLeavePolicySettings() {
  return await leaveRepository.getLeavePolicySettings();
}

async function saveLeavePolicySettings(data) {
  if (data.leave_year_type === 'calendar_year' && !data.leave_year_start_month) {
    data.leave_year_start_month = 1;
  }
  const result = await leaveRepository.saveLeavePolicySettings(data);
  invalidateSettingsCache();
  return result;
}

// -------------------------------------------------------------
// Leave Balance Provisioning (called on new employee creation)
// -------------------------------------------------------------

async function provisionLeaveBalancesForNewEmployee(employeeId, joiningDate, txClient) {
  const settings = await getLeaveSettings();
  if (!settings.auto_credit_on_join) return;

  const joiningDateStr = joiningDate
    ? new Date(joiningDate).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const leaveYear = computeLeaveYear(new Date(joiningDateStr + 'T00:00:00Z'), settings);

  // Resolve employee's organization
  const empRes = await txClient.query('SELECT organization_id, leave_plan_id FROM employees WHERE employee_id = $1', [employeeId]);
  const emp = empRes.rows[0];
  if (!emp) return;

  let leavePlanId = emp.leave_plan_id;
  if (!leavePlanId) {
    const defaultPlanRes = await txClient.query(
      'SELECT leave_plan_id FROM leave_plans WHERE organization_id = $1 AND is_active = true ORDER BY created_at ASC LIMIT 1',
      [emp.organization_id]
    );
    leavePlanId = defaultPlanRes.rows[0]?.leave_plan_id;
    if (leavePlanId) {
      await txClient.query('UPDATE employees SET leave_plan_id = $1 WHERE employee_id = $2', [leavePlanId, employeeId]);
    }
  }

  if (!leavePlanId) return;

  const planTypesRes = await txClient.query(
    'SELECT * FROM leave_plan_types WHERE leave_plan_id = $1',
    [leavePlanId]
  );

  for (const pt of planTypesRes.rows) {
    let allocatedDays = parseFloat(pt.quota_days);
    if (settings.pro_rata_on_join && pt.accrual_type === 'ANNUAL') {
      allocatedDays = calculateProRataDays(allocatedDays, joiningDateStr, settings.leave_year_start_month);
    }

    await leavePlansRepo.createLedgerEntry({
      employee_id: employeeId,
      leave_type_id: pt.leave_type_id,
      financial_year: leaveYear,
      transaction_type: 'AWARDED',
      days: allocatedDays,
      remarks: 'Initial plan quota allocation on join'
    }, txClient);

    await syncBalanceCache(employeeId, pt.leave_type_id, leaveYear, txClient);
  }

  // Provision optional holiday balance
  const maxDays = parseInt(settings.optional_holiday_max_days, 10) || 2;
  let ohAllocated = maxDays;
  if (settings.optional_holiday_pro_rata) {
    ohAllocated = calculateProRataDays(maxDays, joiningDateStr, settings.leave_year_start_month);
  }
  await leaveRepository.upsertOptionalHolidayBalance({
    employee_id: employeeId,
    leave_year: leaveYear,
    allocated_days: ohAllocated,
    used_days: 0,
  }, txClient);
}

// -------------------------------------------------------------
// Optional Holiday Eligibility
// -------------------------------------------------------------

async function getOptionalHolidayEligibility(employeeId) {
  const settings = await getLeaveSettings();
  const now = new Date();
  const leaveYear = computeLeaveYear(now, settings);
  const { start: yearStart, end: yearEnd } = getLeaveYearDateRange(leaveYear, settings);

  let balance = await leaveRepository.getOptionalHolidayBalance(employeeId, leaveYear);
  if (!balance) {
    const empRes = await query(
      'SELECT date_of_joining FROM employees WHERE employee_id = $1',
      [employeeId]
    );
    const joiningDate = empRes.rows[0]?.date_of_joining || now.toISOString().split('T')[0];
    const joiningDateStr = new Date(joiningDate).toISOString().split('T')[0];

    const maxDays = parseInt(settings.optional_holiday_max_days, 10) || 2;
    let allocated = maxDays;
    if (settings.optional_holiday_pro_rata) {
      const joinFY = computeLeaveYear(new Date(joiningDateStr + 'T00:00:00Z'), settings);
      if (joinFY === leaveYear) {
        allocated = Math.ceil(calculateProRataDays(maxDays, joiningDateStr, settings.leave_year_start_month));
      } else if (joinFY > leaveYear) {
        allocated = 0;
      }
    }
    balance = await leaveRepository.upsertOptionalHolidayBalance({
      employee_id: employeeId,
      leave_year: leaveYear,
      allocated_days: allocated,
      used_days: 0,
    });
  } else {
    const wholeDays = Math.ceil(parseFloat(balance.allocated_days));
    if (wholeDays !== parseFloat(balance.allocated_days)) {
      await query(
        'UPDATE employee_optional_holiday_balances SET allocated_days = $1, updated_at = NOW() WHERE employee_id = $2 AND leave_year = $3',
        [wholeDays, employeeId, leaveYear]
      );
      balance = { ...balance, allocated_days: wholeDays };
    }
  }

  const availed = await leaveRepository.getAvailedOptionalHolidays(employeeId, leaveYear);
  const allOptHolidays = await leaveRepository.getOptionalHolidaysForYear(yearStart, yearEnd);
  const availedIds = new Set(availed.map(a => a.holiday_id));
  const requests = await leaveRepository.getOptionalHolidayRequestsByEmployee(employeeId, leaveYear);
  const requestMap = new Map(requests.map(r => [r.holiday_id, r]));

  const configuredMax = parseFloat(balance.allocated_days);
  const calendarCount = allOptHolidays.length;
  const effectiveQuota = Math.min(configuredMax, calendarCount);
  const usedDays = availed.length;
  const remainingDays = Math.max(0, effectiveQuota - usedDays);

  if (parseFloat(balance.used_days) !== usedDays) {
    await query(
      'UPDATE employee_optional_holiday_balances SET used_days = $1, updated_at = NOW() WHERE employee_id = $2 AND leave_year = $3',
      [usedDays, employeeId, leaveYear]
    );
  }

  return {
    leave_year: leaveYear,
    leave_year_start: yearStart,
    leave_year_end: yearEnd,
    configured_max: configuredMax,
    calendar_count: calendarCount,
    allocated_days: effectiveQuota,
    used_days: usedDays,
    remaining_days: remainingDays,
    availed_holidays: availed,
    available_optional_holidays: allOptHolidays.map(h => {
      const req = requestMap.get(h.holiday_id);
      return {
        ...h,
        is_availed: availedIds.has(h.holiday_id),
        status: req ? req.status : null,
        optional_holiday_request_id: req ? req.optional_holiday_request_id : null,
      };
    }),
  };
}

async function toggleOptionalHolidayAvail(employeeId, holidayId) {
  const settings = await getLeaveSettings();
  const now = new Date();
  const leaveYear = computeLeaveYear(now, settings);
  const { start: yearStart, end: yearEnd } = getLeaveYearDateRange(leaveYear, settings);

  const allOptHolidays = await leaveRepository.getOptionalHolidaysForYear(yearStart, yearEnd);
  const targetHoliday = allOptHolidays.find(h => h.holiday_id === holidayId);
  if (!targetHoliday) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      'This holiday is not available as an optional holiday for the current leave year.'
    );
  }

  const empRes = await query(
    `SELECT organization_id, manager_employee_id, date_of_joining, CONCAT(first_name, ' ', last_name) AS full_name 
     FROM employees WHERE employee_id = $1`,
    [employeeId]
  );
  const emp = empRes.rows[0];
  if (!emp) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Employee profile not found.');

  const existingReq = await leaveRepository.getOptionalHolidayRequest(employeeId, holidayId);

  if (existingReq && existingReq.status === 'PENDING') {
    // Cancel the pending request
    await leaveRepository.updateOptionalHolidayRequest(existingReq.optional_holiday_request_id, 'CANCELLED', 'Cancelled by employee');
    return getOptionalHolidayEligibility(employeeId);
  }

  if (existingReq && existingReq.status === 'APPROVED') {
    // Cancel the approved request
    await withTransaction(async (client) => {
      await leaveRepository.updateOptionalHolidayRequest(existingReq.optional_holiday_request_id, 'CANCELLED', 'Cancelled by employee', client);
      await leaveRepository.unavailOptionalHoliday(employeeId, holidayId, leaveYear, client);
    });
    return getOptionalHolidayEligibility(employeeId);
  }

  // Submit request (or re-submit a previously rejected/cancelled request)
  let balance = await leaveRepository.getOptionalHolidayBalance(employeeId, leaveYear);
  if (!balance) {
    const joiningDate = emp.date_of_joining || now.toISOString().split('T')[0];
    const maxDays = parseInt(settings.optional_holiday_max_days, 10) || 2;
    let allocated = maxDays;
    if (settings.optional_holiday_pro_rata) {
      allocated = Math.ceil(calculateProRataDays(maxDays, new Date(joiningDate).toISOString().split('T')[0], settings.leave_year_start_month));
    }
    balance = await leaveRepository.upsertOptionalHolidayBalance({ employee_id: employeeId, leave_year: leaveYear, allocated_days: allocated, used_days: 0 });
  }

  const effectiveQuota = Math.min(parseFloat(balance.allocated_days), allOptHolidays.length);

  // Count active requests (PENDING or APPROVED)
  const allRequests = await leaveRepository.getOptionalHolidayRequestsByEmployee(employeeId, leaveYear);
  const activeRequests = allRequests.filter(r => r.status === 'PENDING' || r.status === 'APPROVED');

  if (activeRequests.length >= effectiveQuota) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      `You can request at most ${effectiveQuota} optional holiday${effectiveQuota !== 1 ? 's' : ''} this year.`
    );
  }

  // Create or re-apply request
  let req;
  if (existingReq) {
    req = await leaveRepository.updateOptionalHolidayRequest(existingReq.optional_holiday_request_id, 'PENDING', 'Re-applied');
  } else {
    req = await leaveRepository.createOptionalHolidayRequest({
      organization_id: emp.organization_id,
      employee_id: employeeId,
      manager_employee_id: emp.manager_employee_id,
      holiday_id: holidayId,
      leave_year: leaveYear,
      status: 'PENDING'
    });
  }

  // Notify manager
  if (emp.manager_employee_id) {
    const mgrRes = await query('SELECT email FROM employees WHERE employee_id = $1', [emp.manager_employee_id]);
    const mgrEmail = mgrRes.rows[0]?.email;

    notifRepo.createNotification(
      emp.manager_employee_id,
      'optional_holiday_submitted',
      'Optional Holiday Requested',
      `${emp.full_name} requested an optional holiday for ${targetHoliday.holiday_name} (${targetHoliday.holiday_date}).`,
      req.optional_holiday_request_id,
      'leave'
    ).catch(() => { });

    if (mgrEmail) {
      sendOptionalHolidaySubmittedEmail(mgrEmail, {
        employeeName: emp.full_name,
        holidayName: targetHoliday.holiday_name,
        holidayDate: targetHoliday.holiday_date,
      }).catch(e => console.error('[Notif] optional holiday email to manager failed:', e.message));
    }
  }

  return getOptionalHolidayEligibility(employeeId);
}

// -------------------------------------------------------------
// Leave Balances (Ledger & Plan mapping)
// -------------------------------------------------------------

async function getEmployeeBalances(employeeId, dateInput = new Date()) {
  const settings = await getLeaveSettings();
  const fy = computeLeaveYear(dateInput, settings);
  const { start: fyStart, end: fyEnd } = getLeaveYearDateRange(fy, settings);

  // 1. Resolve employee's assigned leave plan or organization default
  const empRes = await query('SELECT leave_plan_id, organization_id FROM employees WHERE employee_id = $1', [employeeId]);
  const emp = empRes.rows[0];
  if (!emp) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Employee profile not found.');

  let leavePlanId = emp.leave_plan_id;
  if (!leavePlanId) {
    const defaultPlanRes = await query(
      'SELECT leave_plan_id FROM leave_plans WHERE organization_id = $1 AND is_active = true ORDER BY created_at ASC LIMIT 1',
      [emp.organization_id]
    );
    leavePlanId = defaultPlanRes.rows[0]?.leave_plan_id;
  }

  if (!leavePlanId) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Employee has no assigned leave plan and no organization default plan is configured.');
  }

  // 2. Fetch mapped types for this plan
  const planTypes = await leavePlansRepo.getPlanTypes(leavePlanId);
  const balances = [];

  for (const pt of planTypes) {
    // Check if ledger entries exist for this type, employee and year
    let entries = await leavePlansRepo.getLedgerEntries(employeeId, pt.leave_type_id, fy);

    // Auto-provision if missing
    if (entries.length === 0) {
      let initialCredit = parseFloat(pt.quota_days);
      if (settings.pro_rata_on_join && pt.accrual_type === 'ANNUAL') {
        const empDetails = await query('SELECT date_of_joining FROM employees WHERE employee_id = $1', [employeeId]);
        const joinDate = empDetails.rows[0]?.date_of_joining;
        if (joinDate) {
          const joinDateStr = joinDate instanceof Date ? joinDate.toISOString().slice(0, 10) : new Date(joinDate).toISOString().slice(0, 10);
          const joinFY = computeLeaveYear(new Date(joinDateStr + 'T00:00:00Z'), settings);
          if (joinFY === fy) {
            initialCredit = calculateProRataDays(initialCredit, joinDateStr, settings.leave_year_start_month);
          } else if (joinFY > fy) {
            initialCredit = 0.00;
          }
        }
      }

      await leavePlansRepo.createLedgerEntry({
        employee_id: employeeId,
        leave_type_id: pt.leave_type_id,
        financial_year: fy,
        transaction_type: 'AWARDED',
        days: initialCredit,
        remarks: 'Auto-provisioned plan quota'
      });

      // reload entries
      entries = await leavePlansRepo.getLedgerEntries(employeeId, pt.leave_type_id, fy);
    }

    // Sync database cache to employee_leave_balances
    await syncBalanceCache(employeeId, pt.leave_type_id, fy);

    // Get current balance values from cache
    const balCached = await leaveRepository.getBalance(employeeId, pt.leave_type_id, fy);

    if (balCached) {
      balCached.leave_type_name = pt.leave_type_name;
      balCached.leave_type_code = pt.leave_type_code;
      balCached.is_paid_leave = pt.is_paid_leave;
      balCached.allows_half_day = true;
      balCached.allows_negative_balance = false;
      balCached.available_days = parseFloat((balCached.allocated_days - balCached.used_days).toFixed(2));
      const pendingSum = await leaveRepository.getPendingRequestsSum(employeeId, pt.leave_type_id, fyStart, fyEnd);
      balCached.pending_days = pendingSum;
      balCached.effective_available_days = parseFloat((balCached.available_days - pendingSum).toFixed(2));
      balances.push(balCached);
    }
  }

  return balances;
}

// -------------------------------------------------------------
// Apply Leave
// -------------------------------------------------------------

async function applyLeave(employeeId, organizationId, data) {
  const { leave_type_id, start_date, end_date, session_type, leave_reason, attachment_url } = data;

  if (!leave_type_id || !start_date || !end_date) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Missing required leave fields.');
  }

  // Auto-generate/sync balance cache before validation
  await getEmployeeBalances(employeeId, new Date(start_date + 'T00:00:00Z'));

  const emp = await employeeRepository.getEmployees(organizationId, {});
  const currentEmp = emp.find(e => e.employee_id === employeeId);
  if (!currentEmp) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Employee profile not found.');
  if (!currentEmp.manager_id) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'You cannot apply for leave because you do not have an assigned manager.');
  }

  const leaveType = await leaveRepository.getLeaveTypeById(leave_type_id);
  if (!leaveType || !leaveType.is_active) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Selected leave type is inactive or invalid.');
  }

  const totalDays = await calculateLeaveDays(start_date, end_date, session_type);

  if (totalDays <= 0) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Selected date range consists only of holidays. Leave cannot be applied.');
  }
  if (!leaveType.allows_half_day && totalDays % 1 !== 0) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Half-day requests are not allowed for this leave type.');
  }
  if (leaveType.max_consecutive_days && totalDays > leaveType.max_consecutive_days) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `This leave type allows a maximum of ${leaveType.max_consecutive_days} consecutive days.`);
  }

  // Monthly limit check
  if (leaveType.monthly_limit_days) {
    const startDate = new Date(start_date + 'T00:00:00Z');
    const year = startDate.getUTCFullYear();
    const month = startDate.getUTCMonth() + 1;
    const existingMonthUsage = await leaveRepository.getMonthlyLeaveUsage(employeeId, leave_type_id, year, month);

    if (existingMonthUsage + totalDays > parseFloat(leaveType.monthly_limit_days)) {
      const remaining = Math.max(0, parseFloat(leaveType.monthly_limit_days) - existingMonthUsage);
      const monthLabel = startDate.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      const lopHint = leaveType.lop_leave_type_name
        ? ` Apply the excess as "${leaveType.lop_leave_type_name}" (Loss of Pay).`
        : ' Apply the excess as Loss of Pay (LOP).';
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        `Monthly limit exceeded for ${leaveType.leave_type_name} in ${monthLabel}. ` +
        `Limit: ${leaveType.monthly_limit_days} days/month. ` +
        `Already used: ${existingMonthUsage} day(s). ` +
        `Remaining: ${remaining} day(s).${lopHint}`
      );
    }
  }

  // Org-wide monthly paid leave cap check
  const policySettings = await getLeaveSettings();
  if (leaveType.is_paid_leave && policySettings.monthly_paid_leave_cap != null) {
    const cap = parseInt(policySettings.monthly_paid_leave_cap, 10);
    const capDate = new Date(start_date + 'T00:00:00Z');
    const capYear = capDate.getUTCFullYear();
    const capMonth = capDate.getUTCMonth() + 1;
    const monthlyPaidUsed = await leaveRepository.getMonthlyPaidLeaveUsage(employeeId, capYear, capMonth);
    if (monthlyPaidUsed + totalDays > cap) {
      const remaining = Math.max(0, cap - monthlyPaidUsed);
      const monthLabel = capDate.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        `Monthly paid leave cap exceeded for ${monthLabel}. ` +
        `Cap: ${cap} paid leave day(s)/month. ` +
        `Already used: ${monthlyPaidUsed} day(s). ` +
        `Remaining: ${remaining} day(s).`
      );
    }
  }

  const hasOverlap = await leaveRepository.hasOverlappingRequest(employeeId, start_date, end_date);
  if (hasOverlap) {
    throw new ApiError(STATUS_CODES.CONFLICT, 'You already have an active or pending leave request overlapping with these dates.');
  }

  const settings = await getLeaveSettings();
  const fy = computeLeaveYear(new Date(start_date + 'T00:00:00Z'), settings);
  const { start: fyStart, end: fyEnd } = getLeaveYearDateRange(fy, settings);

  let balance = await leaveRepository.getBalance(employeeId, leave_type_id, fy);
  if (!balance) {
    throw new ApiError(STATUS_CODES.INTERNAL_SERVER_ERROR, 'Leave balance record not found.');
  }

  const available = balance.allocated_days - balance.used_days;
  const pending = await leaveRepository.getPendingRequestsSum(employeeId, leave_type_id, fyStart, fyEnd);
  const effectiveAvailable = available - pending;

  if (!leaveType.allows_negative_balance && totalDays > effectiveAvailable) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      `Insufficient leave balance. Requested: ${totalDays} day(s), Available: ${effectiveAvailable.toFixed(2)} day(s).`
    );
  }

  const result = await withTransaction(async (client) => {
    const request = await leaveRepository.createLeaveRequest({
      employee_id: employeeId,
      manager_employee_id: currentEmp.manager_id,
      leave_type_id,
      start_date,
      end_date,
      total_leave_days: totalDays,
      session_type,
      leave_reason,
      attachment_url,
      current_status: 'PENDING',
    }, client);

    await leaveRepository.createAuditLog({
      leave_request_id: request.leave_request_id,
      previous_status: null,
      new_status: 'PENDING',
      action_taken_by_employee_id: employeeId,
      action_remarks: 'Leave applied successfully',
    }, client);

    return request;
  });

  getNotifSettings().then(async ns => {
    if (!ns.leave_submitted) return;
    const empName = `${currentEmp.first_name || ''} ${currentEmp.last_name || ''}`.trim() || 'An employee';
    const leaveTypeName = leaveType.leave_type_name || leaveType.leave_type_code;
    const managerId = currentEmp.manager_id || currentEmp.manager_employee_id;
    const recipients = new Set();
    if (managerId) recipients.add(managerId);
    const adminEmpIds = await notifRepo.getClientAdminEmployeeIds(organizationId).catch(() => []);
    adminEmpIds.forEach(id => recipients.add(id));
    recipients.delete(employeeId);

    for (const rId of recipients) {
      notifRepo.createNotification(
        rId,
        'leave_submitted',
        'Leave Request Submitted',
        `${empName} submitted a ${leaveTypeName} request (${start_date} – ${end_date}).`,
        result.leave_request_id,
        'leave'
      ).catch(() => { });
    }

    getLeaveEmailRecipients(organizationId, currentEmp.manager_id).then(recipients => {
      const emailPayload = {
        employeeName: empName,
        leaveType: leaveTypeName,
        startDate: start_date,
        endDate: end_date,
        totalDays,
        reason: leave_reason || '',
      };

      // 1. Send to manager
      if (recipients.managerEmail) {
        sendLeaveSubmittedEmail(recipients.managerEmail, emailPayload).catch(e =>
          console.error('[Notif] leave submitted email to manager failed:', e.message)
        );
      }

      // 2. Send to Client Admins
      recipients.adminEmails.forEach(adminEmail => {
        sendLeaveSubmittedEmail(adminEmail, emailPayload).catch(e =>
          console.error('[Notif] leave submitted email to admin failed:', e.message)
        );
      });

      // 3. Send to HR users
      recipients.hrEmails.forEach(hrEmail => {
        sendLeaveSubmittedEmail(hrEmail, emailPayload).catch(e =>
          console.error('[Notif] leave submitted email to HR failed:', e.message)
        );
      });
    }).catch(e => console.error('[Notif] getLeaveEmailRecipients failed:', e.message));
  }).catch(() => { });

  return result;
}

// -------------------------------------------------------------
// Leave Queries
// -------------------------------------------------------------

async function getMyLeaves(employeeId) {
  return await leaveRepository.getMyLeaveRequests(employeeId);
}

async function getManagerLeaves(managerEmployeeId) {
  return await leaveRepository.getManagerLeaveRequests(managerEmployeeId);
}

async function getAdminLeaves(filters = {}) {
  return await leaveRepository.getAdminLeaveRequests(filters);
}

async function getAdminEmployeeBalances(employeeId) {
  return await getEmployeeBalances(employeeId, new Date());
}

async function getLeaveRequestDetails(id) {
  const details = await leaveRepository.getLeaveRequestById(id);
  if (!details) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Leave request not found.');
  const auditLogs = await leaveRepository.getAuditLogsForRequest(id);
  return { ...details, auditLogs };
}

// -------------------------------------------------------------
// Approval State Machine
// -------------------------------------------------------------

async function cancelLeave(employeeId, leaveRequestId, remarks) {
  const req = await leaveRepository.getLeaveRequestById(leaveRequestId);
  if (!req) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Leave request not found.');
  if (req.employee_id !== employeeId) throw new ApiError(STATUS_CODES.FORBIDDEN, 'You can only cancel your own leave requests.');
  if (req.current_status !== 'PENDING') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `You cannot cancel a leave request that is already ${req.current_status}. Contact your manager or HR.`);
  }

  return await withTransaction(async (client) => {
    const updated = await leaveRepository.updateLeaveRequest(leaveRequestId, { current_status: 'CANCELLED' }, client);
    await leaveRepository.createAuditLog({
      leave_request_id: leaveRequestId,
      previous_status: 'PENDING',
      new_status: 'CANCELLED',
      action_taken_by_employee_id: employeeId,
      action_remarks: remarks || 'Cancelled by employee',
    }, client);
    return updated;
  });
}

async function approveLeave(managerEmployeeId, leaveRequestId, remarks) {
  const req = await leaveRepository.getLeaveRequestById(leaveRequestId);
  if (!req) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Leave request not found.');
  if (req.manager_employee_id !== managerEmployeeId) throw new ApiError(STATUS_CODES.FORBIDDEN, 'Only the assigned manager can approve this request.');
  if (req.current_status !== 'PENDING') throw new ApiError(STATUS_CODES.BAD_REQUEST, `Leave request is already in ${req.current_status} state.`);

  const settings = await getLeaveSettings();
  const fy = computeLeaveYear(new Date(req.start_date), settings);

  const approveResult = await withTransaction(async (client) => {
    const balance = await leaveRepository.lockBalance(req.employee_id, req.leave_type_id, fy, client);
    if (!balance) throw new ApiError(STATUS_CODES.INTERNAL_SERVER_ERROR, 'Employee leave balance record not initialized.');

    const leaveType = await leaveRepository.getLeaveTypeById(req.leave_type_id);
    const newUsedDays = parseFloat(balance.used_days) + parseFloat(req.total_leave_days);
    if (!leaveType.allows_negative_balance && (newUsedDays > parseFloat(balance.allocated_days))) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Approval failed: Approved leaves exceed employee allocated balance limit.');
    }

    // Insert debit ledger transaction
    await leavePlansRepo.createLedgerEntry({
      employee_id: req.employee_id,
      leave_type_id: req.leave_type_id,
      financial_year: fy,
      transaction_type: 'USED',
      days: -parseFloat(req.total_leave_days),
      reference_id: leaveRequestId,
      remarks: `Leave request approved by manager: ${remarks || ''}`
    }, client);

    // Sync database cache
    await syncBalanceCache(req.employee_id, req.leave_type_id, fy, client);

    const updated = await leaveRepository.updateLeaveRequest(leaveRequestId, {
      current_status: 'APPROVED',
      approved_by_employee_id: managerEmployeeId,
      approved_at: new Date(),
    }, client);

    await leaveRepository.createAuditLog({
      leave_request_id: leaveRequestId,
      previous_status: 'PENDING',
      new_status: 'APPROVED',
      action_taken_by_employee_id: managerEmployeeId,
      action_remarks: remarks || 'Approved by Manager',
    }, client);
    return updated;
  });

  getNotifSettings().then(ns => {
    if (!ns.leave_decision) return;
    notifRepo.createNotification(
      req.employee_id,
      'leave_approved',
      'Leave Request Approved',
      `Your ${req.leave_type_name || 'leave'} request (${req.start_date} – ${req.end_date}) has been approved.`,
      req.leave_request_id,
      'leave'
    ).catch(() => { });
    sendLeaveDecisionEmails(req, 'APPROVED', remarks);
  }).catch(() => { });

  return approveResult;
}

async function rejectLeave(managerEmployeeId, leaveRequestId, remarks) {
  const req = await leaveRepository.getLeaveRequestById(leaveRequestId);
  if (!req) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Leave request not found.');
  if (req.manager_employee_id !== managerEmployeeId) throw new ApiError(STATUS_CODES.FORBIDDEN, 'Only the assigned manager can reject this request.');
  if (req.current_status !== 'PENDING') throw new ApiError(STATUS_CODES.BAD_REQUEST, `Leave request is already in ${req.current_status} state.`);

  const rejectResult = await withTransaction(async (client) => {
    const updated = await leaveRepository.updateLeaveRequest(leaveRequestId, {
      current_status: 'REJECTED',
      rejection_reason: remarks || 'Rejected by Manager',
    }, client);
    await leaveRepository.createAuditLog({
      leave_request_id: leaveRequestId,
      previous_status: 'PENDING',
      new_status: 'REJECTED',
      action_taken_by_employee_id: managerEmployeeId,
      action_remarks: remarks || 'Rejected by Manager',
    }, client);
    return updated;
  });

  getNotifSettings().then(ns => {
    if (!ns.leave_decision) return;
    notifRepo.createNotification(
      req.employee_id,
      'leave_rejected',
      'Leave Request Rejected',
      `Your ${req.leave_type_name || 'leave'} request (${req.start_date} – ${req.end_date}) has been rejected.${remarks ? ' Reason: ' + remarks : ''}`,
      req.leave_request_id,
      'leave'
    ).catch(() => { });
    sendLeaveDecisionEmails(req, 'REJECTED', remarks);
  }).catch(() => { });

  return rejectResult;
}

async function cancelApprovedLeaveOverride(actorEmployeeId, role, leaveRequestId, remarks) {
  const req = await leaveRepository.getLeaveRequestById(leaveRequestId);
  if (!req) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Leave request not found.');

  const isManager = req.manager_employee_id === actorEmployeeId;
  const isHrOrAdmin = role === 'client_admin' || role === 'hr';
  if (!isManager && !isHrOrAdmin) throw new ApiError(STATUS_CODES.FORBIDDEN, 'Only manager or HR/Client Admin can cancel approved leaves.');
  if (req.current_status !== 'APPROVED') throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only approved leaves can be cancelled using this override.');

  const settings = await getLeaveSettings();
  const fy = computeLeaveYear(new Date(req.start_date), settings);

  return await withTransaction(async (client) => {
    const balance = await leaveRepository.lockBalance(req.employee_id, req.leave_type_id, fy, client);

    // Insert positive credit adjustment ledger transaction
    await leavePlansRepo.createLedgerEntry({
      employee_id: req.employee_id,
      leave_type_id: req.leave_type_id,
      financial_year: fy,
      transaction_type: 'ADJUSTMENT',
      days: parseFloat(req.total_leave_days),
      reference_id: leaveRequestId,
      remarks: `Approved leave cancelled by override: ${remarks || ''}`
    }, client);

    // Sync database cache
    await syncBalanceCache(req.employee_id, req.leave_type_id, fy, client);

    const updated = await leaveRepository.updateLeaveRequest(leaveRequestId, { current_status: 'CANCELLED' }, client);
    await leaveRepository.createAuditLog({
      leave_request_id: leaveRequestId,
      previous_status: 'APPROVED',
      new_status: 'CANCELLED',
      action_taken_by_employee_id: actorEmployeeId,
      action_remarks: remarks || 'Approved leave cancelled by manager/admin override',
    }, client);
    return updated;
  });
}

async function adminApproveLeave(leaveRequestId, remarks) {
  const req = await leaveRepository.getLeaveRequestById(leaveRequestId);
  if (!req) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Leave request not found.');
  if (req.current_status !== 'PENDING') throw new ApiError(STATUS_CODES.BAD_REQUEST, `Leave request is already ${req.current_status}.`);

  const settings = await getLeaveSettings();
  const fy = computeLeaveYear(new Date(req.start_date), settings);

  const result = await withTransaction(async (client) => {
    const balance = await leaveRepository.lockBalance(req.employee_id, req.leave_type_id, fy, client);
    if (!balance) throw new ApiError(STATUS_CODES.INTERNAL_SERVER_ERROR, 'Leave balance record not found.');

    const leaveType = await leaveRepository.getLeaveTypeById(req.leave_type_id);
    const newUsed = parseFloat(balance.used_days) + parseFloat(req.total_leave_days);
    if (!leaveType.allows_negative_balance && newUsed > parseFloat(balance.allocated_days)) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Approval would exceed employee leave balance.');
    }

    // Insert debit ledger transaction
    await leavePlansRepo.createLedgerEntry({
      employee_id: req.employee_id,
      leave_type_id: req.leave_type_id,
      financial_year: fy,
      transaction_type: 'USED',
      days: -parseFloat(req.total_leave_days),
      reference_id: leaveRequestId,
      remarks: `Leave request approved by admin: ${remarks || ''}`
    }, client);

    // Sync database cache
    await syncBalanceCache(req.employee_id, req.leave_type_id, fy, client);

    const updated = await leaveRepository.updateLeaveRequest(leaveRequestId, {
      current_status: 'APPROVED',
      approved_at: new Date(),
    }, client);
    await leaveRepository.createAuditLog({
      leave_request_id: leaveRequestId,
      previous_status: 'PENDING',
      new_status: 'APPROVED',
      action_taken_by_employee_id: null,
      action_remarks: remarks || 'Approved by Admin',
    }, client);
    return updated;
  });

  getNotifSettings().then(ns => {
    if (!ns.leave_decision) return;
    notifRepo.createNotification(
      req.employee_id,
      'leave_approved',
      'Leave Request Approved',
      `Your ${req.leave_type_name || 'leave'} request (${req.start_date} – ${req.end_date}) has been approved by admin.`,
      req.leave_request_id,
      'leave'
    ).catch(() => { });
    sendLeaveDecisionEmails(req, 'APPROVED', remarks);
  }).catch(() => { });

  return result;
}

async function adminRejectLeave(leaveRequestId, remarks) {
  const req = await leaveRepository.getLeaveRequestById(leaveRequestId);
  if (!req) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Leave request not found.');
  if (req.current_status !== 'PENDING') throw new ApiError(STATUS_CODES.BAD_REQUEST, `Leave request is already ${req.current_status}.`);

  const result = await withTransaction(async (client) => {
    const updated = await leaveRepository.updateLeaveRequest(leaveRequestId, {
      current_status: 'REJECTED',
      rejection_reason: remarks || 'Rejected by Admin',
    }, client);
    await leaveRepository.createAuditLog({
      leave_request_id: leaveRequestId,
      previous_status: 'PENDING',
      new_status: 'REJECTED',
      action_taken_by_employee_id: null,
      action_remarks: remarks || 'Rejected by Admin',
    }, client);
    return updated;
  });

  getNotifSettings().then(ns => {
    if (!ns.leave_decision) return;
    notifRepo.createNotification(
      req.employee_id,
      'leave_rejected',
      'Leave Request Rejected',
      `Your ${req.leave_type_name || 'leave'} request (${req.start_date} – ${req.end_date}) has been rejected by admin.${remarks ? ' Reason: ' + remarks : ''}`,
      req.leave_request_id,
      'leave'
    ).catch(() => { });
    sendLeaveDecisionEmails(req, 'REJECTED', remarks);
  }).catch(() => { });

  return result;
}

async function getTeamOptionalHolidays(managerEmployeeId) {
  return await leaveRepository.getTeamOptionalHolidays(managerEmployeeId);
}

async function calculateLeavePreview(employeeId, { leave_type_id, start_date, end_date, session_type }) {
  if (!leave_type_id || !start_date || !end_date) {
    return { total_days: 0, paid_days: 0, lop_days: 0 };
  }

  const leaveType = await leaveRepository.getLeaveTypeById(leave_type_id);
  if (!leaveType || !leaveType.is_active) {
    return { total_days: 0, paid_days: 0, lop_days: 0 };
  }

  let totalDays;
  try {
    totalDays = await calculateLeaveDays(start_date, end_date, session_type || 'FULL_DAY');
  } catch {
    return { total_days: 0, paid_days: 0, lop_days: 0 };
  }

  if (totalDays <= 0) return { total_days: 0, paid_days: 0, lop_days: 0 };

  let paidDays = totalDays;
  let lopDays = 0;

  if (leaveType.is_paid_leave) {
    const policySettings = await getLeaveSettings();
    if (policySettings.monthly_paid_leave_cap != null) {
      const cap = parseInt(policySettings.monthly_paid_leave_cap, 10);
      const capDate = new Date(start_date + 'T00:00:00Z');
      const monthlyPaidUsed = await leaveRepository.getMonthlyPaidLeaveUsage(
        employeeId, capDate.getUTCFullYear(), capDate.getUTCMonth() + 1
      );
      const remaining = Math.max(0, cap - monthlyPaidUsed);
      paidDays = Math.min(totalDays, remaining);
      lopDays = totalDays - paidDays;
    }
  } else {
    paidDays = 0;
    lopDays = totalDays;
  }

  return { total_days: totalDays, paid_days: paidDays, lop_days: lopDays };
}

// -------------------------------------------------------------
// Leave Accrual Engine
// -------------------------------------------------------------

async function runLeaveAccruals(organizationId, periodYearMonth) {
  const isProcessed = await leavePlansRepo.isAccrualPeriodProcessed(organizationId, periodYearMonth);
  if (isProcessed) {
    throw new ApiError(STATUS_CODES.CONFLICT, `Leave accruals for ${periodYearMonth} have already been processed.`);
  }

  const runLog = await leavePlansRepo.createAccrualRun(organizationId, periodYearMonth, 'RUNNING');

  try {
    const [year, month] = periodYearMonth.split('-').map(Number);
    const periodStartDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const employeesRes = await query(
      `SELECT employee_id, leave_plan_id, date_of_joining FROM employees
       WHERE organization_id = $1 
         AND leave_plan_id IS NOT NULL 
         AND status = 'active'
         AND date_of_joining <= $2`,
      [organizationId, periodStartDate]
    );

    const settings = await getLeaveSettings();

    await withTransaction(async (client) => {
      for (const emp of employeesRes.rows) {
        const periodDate = new Date(Date.UTC(year, month - 1, 1));
        const fy = computeLeaveYear(periodDate, settings);
        const planTypes = await leavePlansRepo.getPlanTypes(emp.leave_plan_id);

        for (const pt of planTypes) {
          let creditAmount = 0;
          let remarks = '';

          if (pt.accrual_type === 'MONTHLY') {
            creditAmount = parseFloat((pt.quota_days / 12).toFixed(2));
            remarks = `Monthly leave accrual for ${periodYearMonth}`;
          } else if (pt.accrual_type === 'QUARTERLY') {
            const quarterStartMonths = [1, 4, 7, 10];
            if (quarterStartMonths.includes(month)) {
              creditAmount = parseFloat((pt.quota_days / 4).toFixed(2));
              remarks = `Quarterly leave accrual for ${periodYearMonth}`;
            }
          }

          if (creditAmount > 0) {
            const dupCheck = await client.query(
              `SELECT 1 FROM leave_ledger_entries
               WHERE employee_id = $1 AND leave_type_id = $2
                 AND transaction_type = 'ACCRUAL' AND remarks = $3`,
              [emp.employee_id, pt.leave_type_id, remarks]
            );

            if (dupCheck.rows.length === 0) {
              await leavePlansRepo.createLedgerEntry({
                employee_id: emp.employee_id,
                leave_type_id: pt.leave_type_id,
                financial_year: fy,
                transaction_type: 'ACCRUAL',
                days: creditAmount,
                remarks: remarks
              }, client);

              await syncBalanceCache(emp.employee_id, pt.leave_type_id, fy, client);
            }
          }
        }
      }
    });

    await leavePlansRepo.updateAccrualRunStatus(runLog.run_id, 'COMPLETED');
    return { success: true, message: `Accrual runs for ${periodYearMonth} completed successfully.` };
  } catch (err) {
    await leavePlansRepo.updateAccrualRunStatus(runLog.run_id, 'FAILED');
    throw err;
  }
}

// -------------------------------------------------------------
// Year-End Processing & Encashment calculation helpers
// -------------------------------------------------------------

async function getEmployeeDailyPayRate(employeeId) {
  const res = await query(
    `SELECT ss.basic_salary, ss.hra_amount, ss.special_allowance_amount, ss.travel_allowance_amount, ss.medical_allowance_amount
     FROM employee_salary_assignments sa
     JOIN salary_structures ss ON sa.salary_structure_id = ss.salary_structure_id
     WHERE sa.employee_id = $1
     ORDER BY sa.effective_from DESC LIMIT 1`,
    [employeeId]
  );
  if (res.rows.length === 0) {
    return 1000.00; // default standard fallback daily rate
  }
  const row = res.rows[0];
  const gross = parseFloat(row.basic_salary || 0) +
    parseFloat(row.hra_amount || 0) +
    parseFloat(row.special_allowance_amount || 0) +
    parseFloat(row.travel_allowance_amount || 0) +
    parseFloat(row.medical_allowance_amount || 0);
  return parseFloat((gross / 30.0).toFixed(2));
}

async function processPlanYearEnd(adminUserId, planId, year) {
  const log = await leavePlansRepo.getYearEndStatus(planId, year);
  if (log && log.status === 'COMPLETED') {
    throw new ApiError(STATUS_CODES.CONFLICT, `Year-end processing for this plan and year ${year} has already been completed.`);
  }

  let logId = log?.log_id || null;
  await leavePlansRepo.upsertYearEndLog(logId, planId, year, 'RUNNING', adminUserId, 'Executing Year-End chunk processing.');

  try {
    const planTypes = await leavePlansRepo.getPlanTypes(planId);
    let limit = 50;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const empRes = await query(
        `SELECT employee_id FROM employees
         WHERE leave_plan_id = $1 AND status = 'active'
         ORDER BY employee_id LIMIT $2 OFFSET $3`,
        [planId, limit, offset]
      );

      const employees = empRes.rows;
      if (employees.length === 0) {
        hasMore = false;
        break;
      }

      await withTransaction(async (client) => {
        for (const emp of employees) {
          const dailyRate = await getEmployeeDailyPayRate(emp.employee_id);

          for (const pt of planTypes) {
            const ledgerSumRes = await client.query(
              `SELECT COALESCE(SUM(days), 0.00) AS balance
               FROM leave_ledger_entries
               WHERE employee_id = $1 AND leave_type_id = $2 AND financial_year = $3`,
              [emp.employee_id, pt.leave_type_id, year]
            );
            const remaining = parseFloat(ledgerSumRes.rows[0].balance || 0.00);

            let carryForwardDays = 0;
            let encashDays = 0;
            let lapsedDays = 0;

            if (remaining > 0) {
              if (pt.carry_forward_rule === 'CARRY_FORWARD_ALL') {
                carryForwardDays = remaining;
              } else if (pt.carry_forward_rule === 'CARRY_FORWARD_LIMIT') {
                carryForwardDays = Math.min(remaining, parseFloat(pt.max_carry_forward_days));
              }

              const poolForEncash = remaining - carryForwardDays;
              if (poolForEncash > 0) {
                if (pt.encashment_rule === 'ENCASH_ALL') {
                  encashDays = poolForEncash;
                } else if (pt.encashment_rule === 'ENCASH_LIMIT') {
                  encashDays = Math.min(poolForEncash, parseFloat(pt.max_encash_days));
                }
              }

              lapsedDays = remaining - carryForwardDays - encashDays;
            }

            if (carryForwardDays > 0) {
              await leavePlansRepo.createLedgerEntry({
                employee_id: emp.employee_id,
                leave_type_id: pt.leave_type_id,
                financial_year: year,
                transaction_type: 'CARRY_FORWARD',
                days: -carryForwardDays,
                remarks: `Carried forward ${carryForwardDays} days to next year`
              }, client);
            }
            if (encashDays > 0) {
              await leavePlansRepo.createLedgerEntry({
                employee_id: emp.employee_id,
                leave_type_id: pt.leave_type_id,
                financial_year: year,
                transaction_type: 'ENCASHMENT',
                days: -encashDays,
                remarks: `Encashed ${encashDays} days`
              }, client);

              const encashAmount = encashDays * dailyRate;
              await leavePlansRepo.createEncashment({
                employee_id: emp.employee_id,
                leave_type_id: pt.leave_type_id,
                financial_year: year,
                encashed_days: encashDays,
                encash_rate: dailyRate,
                amount: encashAmount
              }, client);
            }
            if (lapsedDays > 0) {
              await leavePlansRepo.createLedgerEntry({
                employee_id: emp.employee_id,
                leave_type_id: pt.leave_type_id,
                financial_year: year,
                transaction_type: 'LAPSE',
                days: -lapsedDays,
                remarks: `Lapsed ${lapsedDays} remaining days at year end`
              }, client);
            }

            await syncBalanceCache(emp.employee_id, pt.leave_type_id, year, client);

            const nextYear = year + 1;
            const newYearQuota = pt.accrual_type === 'ANNUAL' ? parseFloat(pt.quota_days) : 0.00;
            const totalNextYearAllocated = newYearQuota + carryForwardDays;

            if (totalNextYearAllocated > 0) {
              await leavePlansRepo.createLedgerEntry({
                employee_id: emp.employee_id,
                leave_type_id: pt.leave_type_id,
                financial_year: nextYear,
                transaction_type: 'AWARDED',
                days: totalNextYearAllocated,
                remarks: `New year balance initialization (Quota: ${newYearQuota} + Carried: ${carryForwardDays})`
              }, client);

              await syncBalanceCache(emp.employee_id, pt.leave_type_id, nextYear, client);
            }
          }
        }
      });

      offset += limit;
      if (employees.length < limit) {
        hasMore = false;
      }
    }

    await leavePlansRepo.upsertYearEndLog(logId, planId, year, 'COMPLETED', adminUserId, 'Year-End processing completed successfully.');
    return { success: true, message: `Year-End processing for year ${year} completed.` };
  } catch (err) {
    await leavePlansRepo.upsertYearEndLog(logId, planId, year, 'FAILED', adminUserId, `Execution failed: ${err.message}`);
    throw err;
  }
}

// -------------------------------------------------------------
// Initial adjustments
// -------------------------------------------------------------

async function adjustBalance(adminUserId, employeeId, leaveTypeId, financialYear, newAllocated, newUsed, remarks) {
  let bal = await leaveRepository.getBalance(employeeId, leaveTypeId, financialYear);
  if (!bal) {
    bal = await leaveRepository.createBalance({
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      financial_year: financialYear,
      allocated_days: 0.00,
      used_days: 0.00
    });
  }

  const currentAllocated = parseFloat(bal.allocated_days);
  const currentUsed = parseFloat(bal.used_days);

  const diffAllocated = parseFloat(newAllocated) - currentAllocated;
  const diffUsed = parseFloat(newUsed) - currentUsed;

  await withTransaction(async (client) => {
    if (diffAllocated !== 0) {
      await leavePlansRepo.createLedgerEntry({
        employee_id: employeeId,
        leave_type_id: leaveTypeId,
        financial_year: financialYear,
        transaction_type: 'ADJUSTMENT',
        days: diffAllocated,
        remarks: remarks || 'Manual allocation adjustment',
        created_by: adminUserId
      }, client);
    }

    if (diffUsed !== 0) {
      await leavePlansRepo.createLedgerEntry({
        employee_id: employeeId,
        leave_type_id: leaveTypeId,
        financial_year: financialYear,
        transaction_type: 'USED',
        days: -diffUsed,
        remarks: remarks || 'Manual usage adjustment',
        created_by: adminUserId
      }, client);
    }

    await syncBalanceCache(employeeId, leaveTypeId, financialYear, client);
  });

  return await leaveRepository.getBalance(employeeId, leaveTypeId, financialYear);
}

module.exports = {
  getFinancialYear,
  calculateLeaveDays,
  addLeaveType,
  editLeaveType,
  listLeaveTypes,
  getLeavePolicySettings,
  saveLeavePolicySettings,
  provisionLeaveBalancesForNewEmployee,
  getEmployeeBalances,
  applyLeave,
  getMyLeaves,
  getManagerLeaves,
  getAdminLeaves,
  getAdminEmployeeBalances,
  getLeaveRequestDetails,
  cancelLeave,
  approveLeave,
  rejectLeave,
  cancelApprovedLeaveOverride,
  adminApproveLeave,
  adminRejectLeave,
  getOptionalHolidayEligibility,
  toggleOptionalHolidayAvail,
  getTeamOptionalHolidays,
  calculateLeavePreview,
  runLeaveAccruals,
  processPlanYearEnd,
  adjustBalance,
  propagatePlanTypeQuotaUpdate,
  getPendingOptionalHolidaysForManager,
  decideOptionalHoliday,
};

async function getPendingOptionalHolidaysForManager(managerEmployeeId) {
  return await leaveRepository.getPendingOptionalHolidaysForManager(managerEmployeeId);
}

async function decideOptionalHoliday(managerEmployeeId, requestId, status, remarks) {
  if (status !== 'APPROVED' && status !== 'REJECTED') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Invalid decision status.');
  }

  const req = await leaveRepository.getOptionalHolidayRequestById(requestId);
  if (!req) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Optional holiday request not found.');
  if (req.manager_employee_id !== managerEmployeeId) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'You are not authorized to decide on this request.');
  }
  if (req.status !== 'PENDING') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Request is already ${req.status}.`);
  }

  const result = await withTransaction(async (client) => {
    const updated = await leaveRepository.updateOptionalHolidayRequest(requestId, status, remarks, client);
    if (status === 'APPROVED') {
      await leaveRepository.availOptionalHoliday(req.employee_id, req.holiday_id, req.leave_year, client);
    }
    return updated;
  });

  // Notify employee
  const empRes = await query('SELECT email, CONCAT(first_name, \' \', last_name) AS full_name FROM employees WHERE employee_id = $1', [req.employee_id]);
  const emp = empRes.rows[0];

  notifRepo.createNotification(
    req.employee_id,
    status === 'APPROVED' ? 'optional_holiday_approved' : 'optional_holiday_rejected',
    status === 'APPROVED' ? 'Optional Holiday Approved' : 'Optional Holiday Rejected',
    `Your request for ${req.holiday_name} on ${req.holiday_date} has been ${status.toLowerCase()}.${remarks ? ' Remarks: ' + remarks : ''}`,
    requestId,
    'leave'
  ).catch(() => { });

  if (emp && emp.email) {
    sendOptionalHolidayDecisionEmail(emp.email, {
      employeeName: emp.full_name,
      holidayName: req.holiday_name,
      holidayDate: req.holiday_date,
      status,
      remarks,
    }).catch(e => console.error('[Notif] optional holiday decision email failed:', e.message));
  }

  return result;
}
