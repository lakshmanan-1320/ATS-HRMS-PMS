const hrmsDataService = require('./hrmsData.service');
const logger = require('../config/logger');

/**
 * employeeData.service.js
 * Aggregates live authenticated employee HRMS data using hrmsData.service.
 */

/**
 * Fetches all requested HRMS data types for an authenticated employee.
 * 
 * @param {object} employeeContext - Resolved employee context object
 * @param {object} intentResult - Detected intent result containing dataTypes and dateRange
 * @returns {Promise<object>} - Aggregated employee HRMS data
 */
async function fetchEmployeeHRMSData(employeeContext, intentResult) {
  const { employeeId, organizationId, fullName, employeeCode, designation, departmentName } = employeeContext;
  const { dataTypes = [], dateRange = null, leaveTypeFilter = null } = intentResult;

  if (!employeeId || !organizationId) {
    return {
      sourceType: 'EMPLOYEE_DATA',
      isAvailable: false,
      message: 'No active employee profile associated with this account.',
      data: {}
    };
  }

  const results = {
    sourceType: 'EMPLOYEE_DATA',
    isAvailable: true,
    employee: {
      fullName,
      employeeCode,
      designation,
      departmentName
    },
    data: {}
  };

  const tasks = [];

  // 1. Leave Balances
  if (dataTypes.includes('leave_balance')) {
    tasks.push(
      hrmsDataService.getLeaveBalances(employeeId, organizationId, leaveTypeFilter)
        .then(res => { results.data.leaveBalances = res; })
        .catch(err => {
          logger.warn('[EmployeeData] Error fetching leave balances:', err.message);
          results.data.leaveBalances = null;
        })
    );
  }

  // 2. Leave History
  if (dataTypes.includes('leave_history')) {
    tasks.push(
      hrmsDataService.getLeaveHistory(employeeId, organizationId, dateRange)
        .then(res => { results.data.leaveHistory = res; })
        .catch(err => {
          logger.warn('[EmployeeData] Error fetching leave history:', err.message);
          results.data.leaveHistory = null;
        })
    );
  }

  // 3. Attendance
  if (dataTypes.includes('attendance')) {
    tasks.push(
      hrmsDataService.getAttendanceSummary(employeeId, organizationId, dateRange)
        .then(res => { results.data.attendanceSummary = res; })
        .catch(err => {
          logger.warn('[EmployeeData] Error fetching attendance summary:', err.message);
          results.data.attendanceSummary = null;
        })
    );

    // If query is specifically about past days or specific punches
    tasks.push(
      hrmsDataService.getAttendanceHistory(employeeId, organizationId, dateRange, 10)
        .then(res => { results.data.attendanceHistory = res; })
        .catch(err => {
          logger.warn('[EmployeeData] Error fetching attendance history:', err.message);
        })
    );
  }

  // 4. Bonus & Payroll Data
  if (dataTypes.includes('bonus_data')) {
    tasks.push(
      hrmsDataService.getBonusInformation(employeeId, organizationId, dateRange)
        .then(res => { results.data.bonusData = res; })
        .catch(err => {
          logger.warn('[EmployeeData] Error fetching bonus data:', err.message);
          results.data.bonusData = null;
        })
    );
    tasks.push(
      hrmsDataService.getPayrollInformation(employeeId, organizationId, dateRange)
        .then(res => { results.data.payrollData = res; })
        .catch(err => {
          logger.warn('[EmployeeData] Error fetching payroll data:', err.message);
        })
    );
  }

  await Promise.all(tasks);

  return results;
}

/**
 * Formats aggregated employee HRMS data into a concise, structured markdown block
 * for direct injection into the LLM prompt.
 * 
 * @param {object} employeeData - Result from fetchEmployeeHRMSData
 * @returns {string} - Clean markdown text block
 */
function formatEmployeeDataForPrompt(employeeData) {
  if (!employeeData || !employeeData.isAvailable || !employeeData.data) {
    return 'No personal employee records found for this user in the organization.';
  }

  const { employee, data } = employeeData;
  const sections = [];

  sections.push(`EMPLOYEE PROFILE: ${employee.fullName || 'Employee'} (${employee.employeeCode || 'N/A'}) - ${employee.designation || 'Staff'}, ${employee.departmentName || 'General'}`);

  // 1. Leave Balances Table
  if (data.leaveBalances && data.leaveBalances.balances && data.leaveBalances.balances.length > 0) {
    const lines = [];
    lines.push(`LIVE LEAVE BALANCES (Financial Year ${data.leaveBalances.financialYear}):`);
    lines.push(`| Leave Type | Allocated | Used | Pending | Remaining |`);
    lines.push(`| :--- | :--- | :--- | :--- | :--- |`);
    data.leaveBalances.balances.forEach(b => {
      lines.push(`| ${b.leaveType} (${b.code}) | ${b.allocated} days | ${b.used} days | ${b.pending} days | ${b.remaining} days |`);
    });
    lines.push(`Total Remaining Leave Across All Types: ${data.leaveBalances.totalRemaining} days`);
    sections.push(lines.join('\n'));
  }

  // 2. Leave History
  if (data.leaveHistory && data.leaveHistory.records && data.leaveHistory.records.length > 0) {
    const lines = [];
    lines.push(`PAST LEAVE RECORDS (${data.leaveHistory.period}):`);
    data.leaveHistory.records.forEach((r, idx) => {
      lines.push(`${idx + 1}. ${r.leaveType} (${r.code}): ${r.startDate} to ${r.endDate} (${r.days} day(s)) — Status: ${r.status}${r.reason ? ` — Reason: "${r.reason}"` : ''}`);
    });
    lines.push(`Total Approved Leave Days in Period: ${data.leaveHistory.totalApprovedDays} days`);
    if (data.leaveHistory.unpaidLeaveDays > 0) {
      lines.push(`Recorded Unpaid / Loss of Pay (LOP) Days: ${data.leaveHistory.unpaidLeaveDays} days`);
    }
    sections.push(lines.join('\n'));
  } else if (data.leaveHistory && data.leaveHistory.records && data.leaveHistory.records.length === 0) {
    sections.push(`PAST LEAVE RECORDS: No leave requests recorded for ${data.leaveHistory.period || 'this period'}.`);
  }

  // 3. Attendance Summary
  if (data.attendanceSummary) {
    const att = data.attendanceSummary;
    const lines = [];
    lines.push(`LIVE ATTENDANCE SUMMARY (${att.period}):`);
    lines.push(`- Total Working Days: ${att.totalWorkingDays}`);
    lines.push(`- Present Days: ${att.presentDays}`);
    lines.push(`- Absent Days: ${att.absentDays}`);
    lines.push(`- Late Arrival Days: ${att.lateDays}`);
    lines.push(`- Leave Days: ${att.leaveDays}`);
    lines.push(`- Attendance Rate: ${att.attendancePercentage}%`);
    if (att.averageDailyHours && att.averageDailyHours !== '0.0') {
      lines.push(`- Average Daily Work Hours: ${att.averageDailyHours} hrs`);
    }
    sections.push(lines.join('\n'));
  }

  // 4. Attendance History (punches)
  if (data.attendanceHistory && data.attendanceHistory.records && data.attendanceHistory.records.length > 0) {
    const lines = [];
    lines.push(`RECENT PUNCH RECORDS:`);
    data.attendanceHistory.records.slice(0, 7).forEach(p => {
      lines.push(`- ${p.date}: Status: ${p.status}${p.checkIn ? ` (In: ${p.checkIn}${p.checkOut ? `, Out: ${p.checkOut}` : ''})` : ''}${p.workHours ? ` [${p.workHours} hrs]` : ''}`);
    });
    sections.push(lines.join('\n'));
  }

  // 5. Bonus / Payroll
  if (data.bonusData) {
    const b = data.bonusData;
    const lines = [];
    lines.push(`PAYROLL & BONUS RECORDS:`);
    if (b.hasBonusRecord && b.adjustments.length > 0) {
      lines.push(`Recorded Bonuses / Incentives:`);
      b.adjustments.forEach((adj, idx) => {
        lines.push(`${idx + 1}. ${adj.name}: ₹${adj.amount} (${adj.month}/${adj.year})${adj.remarks ? ` — ${adj.remarks}` : ''}`);
      });
    } else {
      lines.push(`- No special bonus adjustments currently recorded in payroll history.`);
    }
    if (data.payrollData && data.payrollData.length > 0) {
      const p = data.payrollData[0];
      lines.push(`- Latest Payroll (${p.month}/${p.year}): Gross ₹${p.grossSalary}, Net ₹${p.netSalary}, LOP Days: ${p.lopDays}, Paid Leave Days: ${p.paidLeaveDays} (Status: ${p.status})`);
    }
    sections.push(lines.join('\n'));
  }

  return sections.join('\n\n');
}

module.exports = {
  fetchEmployeeHRMSData,
  formatEmployeeDataForPrompt
};
