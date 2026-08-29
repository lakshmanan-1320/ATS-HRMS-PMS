/**
 * responseFormatter.service.js
 *
 * Mode A — Direct Database Answer Formatter
 *
 * Converts raw HRMS data objects into clean, user-readable responses.
 * Used when the intent is a pure DB-fact question (leave history, leave balance,
 * attendance summary, employee profile, reporting manager, employee counts, etc.)
 * that does NOT require Gemma.
 *
 * Rules:
 * - Format actual database records into natural human-readable text.
 * - Never invent data.
 * - If records are empty, return explicit "no records" message.
 * - Clearly distinguish status: APPROVED / PENDING / REJECTED / CANCELLED.
 * - Use exact dates from DB.
 */

/**
 * Formats leave history records into a readable bullet list.
 *
 * @param {object} leaveHistoryData - Result from hrmsData.getLeaveHistory or leave.service
 * @param {string} [employeeName]   - Employee name for personalization
 * @returns {string}
 */
function formatLeaveHistory(leaveHistoryData, employeeName = null) {
  if (!leaveHistoryData) {
    return "I couldn't find any leave records for your account in the HRMS. Please contact HR if you believe this is incorrect.";
  }

  const { records = [], count = 0, period, error } = leaveHistoryData;

  if (error) {
    return "Your leave records could not be retrieved right now. Please try again shortly.";
  }

  if (!records || records.length === 0) {
    const periodText = period && period !== 'Recent' ? ` for ${period}` : '';
    return `I couldn't find any leave records${periodText} in the HRMS for your account.`;
  }

  const name = employeeName ? `${employeeName}'s` : 'Your';
  const periodText = period && period !== 'Recent' ? ` (${period})` : '';
  const lines = [`${name} leave history${periodText}:\n`];

  // Group by status for readability
  const approved = records.filter(r => r.status === 'APPROVED');
  const pending   = records.filter(r => r.status === 'PENDING');
  const rejected  = records.filter(r => r.status === 'REJECTED' || r.status === 'DECLINED');
  const others    = records.filter(r => !['APPROVED','PENDING','REJECTED','DECLINED'].includes(r.status));

  if (approved.length > 0) {
    lines.push('✅ **Approved Leave:**');
    approved.forEach(r => {
      const dateRange = r.startDate === r.endDate
        ? formatDate(r.startDate)
        : `${formatDate(r.startDate)} – ${formatDate(r.endDate)}`;
      const days = r.days === 1 ? '1 day' : `${r.days} days`;
      const type = r.leaveType || r.code || 'Leave';
      lines.push(`  • ${dateRange} — ${type} (${days})`);
    });
    lines.push('');
  }

  if (pending.length > 0) {
    lines.push('🕐 **Pending Approval:**');
    pending.forEach(r => {
      const dateRange = r.startDate === r.endDate
        ? formatDate(r.startDate)
        : `${formatDate(r.startDate)} – ${formatDate(r.endDate)}`;
      const days = r.days === 1 ? '1 day' : `${r.days} days`;
      const type = r.leaveType || r.code || 'Leave';
      lines.push(`  • ${dateRange} — ${type} (${days}) — Awaiting approval`);
    });
    lines.push('');
  }

  if (rejected.length > 0) {
    lines.push('❌ **Rejected / Declined:**');
    rejected.forEach(r => {
      const dateRange = r.startDate === r.endDate
        ? formatDate(r.startDate)
        : `${formatDate(r.startDate)} – ${formatDate(r.endDate)}`;
      const type = r.leaveType || r.code || 'Leave';
      lines.push(`  • ${dateRange} — ${type}`);
    });
    lines.push('');
  }

  if (others.length > 0) {
    lines.push('📋 **Other Records:**');
    others.forEach(r => {
      const dateRange = r.startDate === r.endDate
        ? formatDate(r.startDate)
        : `${formatDate(r.startDate)} – ${formatDate(r.endDate)}`;
      const days = r.days === 1 ? '1 day' : `${r.days} days`;
      const type = r.leaveType || r.code || 'Leave';
      const status = r.status ? ` — ${titleCase(r.status)}` : '';
      lines.push(`  • ${dateRange} — ${type} (${days})${status}`);
    });
    lines.push('');
  }

  const totalApproved = approved.reduce((sum, r) => sum + (r.days || 0), 0);
  if (totalApproved > 0) {
    lines.push(`Total approved leave days shown: **${totalApproved}**`);
  }

  return lines.join('\n').trim();
}

/**
 * Formats leave balance data into a readable table.
 *
 * @param {object} leaveBalanceData - Result from hrmsData.getLeaveBalances
 * @param {string} [employeeName]
 * @returns {string}
 */
function formatLeaveBalance(leaveBalanceData, employeeName = null) {
  if (!leaveBalanceData) {
    return "The HRMS does not currently have a leave balance on record for your account. Please contact HR.";
  }

  const { balances = [], financialYear, totalRemaining, error } = leaveBalanceData;

  if (error) {
    return "Your leave balance could not be retrieved right now. Please try again shortly.";
  }

  if (!balances || balances.length === 0) {
    return "No leave plan is currently assigned to your account in the HRMS. Please contact HR.";
  }

  const name = employeeName ? `${employeeName}'s` : 'Your';
  const fyText = financialYear ? ` for FY ${financialYear}` : '';
  const lines = [`${name} leave balance${fyText}:\n`];

  balances.forEach(b => {
    const remaining = b.remaining !== undefined ? b.remaining : Math.max(0, b.allocated - b.used);
    const pendingText = b.pending > 0 ? ` (${b.pending} pending approval)` : '';
    const paidTag = b.isPaid === false ? ' [Unpaid]' : '';
    lines.push(`• **${b.leaveType || b.code}**${paidTag}: ${remaining} days remaining (${b.used} used / ${b.allocated} allocated)${pendingText}`);
  });

  if (typeof totalRemaining === 'number') {
    lines.push(`\n**Total remaining leave: ${totalRemaining} days**`);
  }

  return lines.join('\n').trim();
}

/**
 * Formats attendance summary into a readable text block.
 *
 * @param {object} attendanceSummary - Result from hrmsData.getAttendanceSummary
 * @returns {string}
 */
function formatAttendanceSummary(attendanceSummary) {
  if (!attendanceSummary) {
    return "Your attendance records could not be retrieved right now.";
  }

  const {
    period,
    totalWorkingDays,
    presentDays,
    absentDays,
    lateDays,
    halfDays,
    leaveDays,
    attendancePercentage,
    totalWorkHours,
    error,
  } = attendanceSummary;

  if (error) {
    return "Your attendance records could not be retrieved right now. Please try again shortly.";
  }

  const lines = [`Your attendance summary for **${period || 'this period'}**:\n`];
  if (typeof totalWorkingDays === 'number') lines.push(`• Working days: ${totalWorkingDays}`);
  if (typeof presentDays === 'number')      lines.push(`• Present: ${presentDays}`);
  if (typeof absentDays === 'number' && absentDays > 0) lines.push(`• Absent: ${absentDays}`);
  if (typeof lateDays === 'number' && lateDays > 0)     lines.push(`• Late arrivals: ${lateDays}`);
  if (typeof halfDays === 'number' && halfDays > 0)     lines.push(`• Half days: ${halfDays}`);
  if (typeof leaveDays === 'number' && leaveDays > 0)   lines.push(`• Leave days: ${leaveDays}`);
  if (typeof attendancePercentage === 'number')         lines.push(`• Attendance rate: ${attendancePercentage}%`);
  if (totalWorkHours && totalWorkHours !== '0.0')       lines.push(`• Total work hours: ${totalWorkHours} hrs`);

  return lines.join('\n').trim();
}

/**
 * Formats a single day attendance (today/yesterday) check.
 *
 * @param {object} dayRecord - Single day punch record
 * @param {string} dateLabel - "today" | "yesterday" | specific date
 * @returns {string}
 */
function formatSingleDayAttendance(dayRecord, dateLabel = 'today') {
  if (!dayRecord) {
    return `No attendance record found for ${dateLabel}.`;
  }

  if (dayRecord.error) {
    return `Your attendance record for ${dateLabel} could not be retrieved right now.`;
  }

  const { date, status, checkIn, checkOut, workHours, isRegularized } = dayRecord;
  const dateStr = date ? `(${formatDate(date)})` : '';
  const lines = [`Your attendance for **${dateLabel}** ${dateStr}:\n`];

  const statusLabel = formatAttendanceStatus(status);
  lines.push(`• Status: ${statusLabel}`);

  if (checkIn) {
    lines.push(`• Check-in: ${checkIn}`);
  } else {
    lines.push(`• Check-in: Not recorded`);
  }

  if (checkOut) {
    lines.push(`• Check-out: ${checkOut}`);
  } else if (checkIn) {
    lines.push(`• Check-out: Not recorded`);
  }

  if (workHours && workHours !== '0.0') {
    lines.push(`• Work duration: ${workHours} hrs`);
  }

  if (isRegularized) {
    lines.push(`• This record has been regularized.`);
  }

  return lines.join('\n').trim();
}

/**
 * Formats employee profile into a clean summary.
 *
 * @param {object} profile - Employee profile from hrmsData.getEmployeeProfile
 * @returns {string}
 */
function formatEmployeeProfile(profile) {
  if (!profile) {
    return "No employee profile found for your account in the HRMS. Please contact HR.";
  }

  const lines = [`**Employee Profile:**\n`];
  if (profile.fullName)        lines.push(`• Name: ${profile.fullName}`);
  if (profile.employeeCode)    lines.push(`• Employee ID: ${profile.employeeCode}`);
  if (profile.designation)     lines.push(`• Designation: ${profile.designation}`);
  if (profile.departmentName)  lines.push(`• Department: ${profile.departmentName}`);
  if (profile.employmentType)  lines.push(`• Employment Type: ${profile.employmentType}`);
  if (profile.dateOfJoining)   lines.push(`• Date of Joining: ${formatDate(profile.dateOfJoining)}`);
  if (profile.status)          lines.push(`• Status: ${titleCase(profile.status)}`);
  if (profile.shiftName)       lines.push(`• Shift: ${profile.shiftName}${profile.shiftStartTime ? ` (${profile.shiftStartTime} – ${profile.shiftEndTime})` : ''}`);

  return lines.join('\n').trim();
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

/**
 * Formats an ISO date string (YYYY-MM-DD) into a human-readable form.
 * e.g. "2026-08-10" → "August 10, 2026"
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(String(dateStr).slice(0, 10) + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return String(dateStr).slice(0, 10);
  }
}

function titleCase(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatAttendanceStatus(status) {
  const map = {
    PRESENT: '✅ Present',
    ABSENT: '❌ Absent',
    LATE: '🕐 Late Arrival',
    LATE_ARRIVAL: '🕐 Late Arrival',
    LATE_PRESENT: '🕐 Late (Present)',
    HALF_DAY: '½ Half Day',
    APPROVED_LEAVE: '🏖️ On Approved Leave',
    PENDING_LEAVE: '⏳ Leave Pending Approval',
    HOLIDAY: '🎉 Holiday',
    WEEK_OFF: '📅 Week Off',
    INCOMPLETE_PUNCH: '⚠️ Incomplete Punch (check-out missing)',
  };
  return map[status] || (status ? titleCase(status) : 'Unknown');
}

// ──────────────────────────────────────────────────────────────────────
// Additional Mode A formatters
// ──────────────────────────────────────────────────────────────────────

/**
 * Formats reporting manager data.
 * @param {object} managerData - From hrmsData.getReportingManager()
 * @returns {string}
 */
function formatReportingManager(managerData) {
  if (!managerData) {
    return 'Your reporting manager information could not be retrieved right now.';
  }
  if (!managerData.hasManager) {
    return 'No reporting manager is currently assigned to your profile in the HRMS. Please contact HR to update your reporting hierarchy.';
  }
  const lines = ['**Your Reporting Manager:**\n'];
  lines.push(`• Name: ${managerData.fullName}`);
  if (managerData.designation) lines.push(`• Designation: ${managerData.designation}`);
  if (managerData.department)  lines.push(`• Department: ${managerData.department}`);
  if (managerData.email)       lines.push(`• Email: ${managerData.email}`);
  return lines.join('\n').trim();
}

/**
 * Formats active employee count.
 * @param {object} countData - From hrmsData.getActiveEmployeeCount()
 * @returns {string}
 */
function formatEmployeeCount(countData) {
  if (!countData) {
    return 'The employee count could not be retrieved right now.';
  }
  return `Your organization currently has **${countData.total} active employee${countData.total !== 1 ? 's' : ''}**.`;
}

/**
 * Formats current check-in count.
 * @param {object} countData - From hrmsData.getCurrentCheckinCount()
 * @returns {string}
 */
function formatCheckinCount(countData) {
  if (!countData) {
    return 'The current check-in count could not be retrieved right now.';
  }
  return `As of today (${formatDate(countData.date)}), **${countData.checkedInCount} employee${countData.checkedInCount !== 1 ? 's have' : ' has'} checked in**.`;
}

/**
 * Formats today's attendance for a single employee.
 * @param {object} record - From hrmsData.getTodayAttendance()
 * @returns {string}
 */
function formatTodayAttendance(record) {
  if (!record) return "Your attendance for today could not be retrieved right now.";
  if (record.error) return "Your attendance record for today could not be retrieved right now. Please try again.";

  const lines = [`**Your attendance for today (${formatDate(record.date)}):**\n`];
  const statusLabel = formatAttendanceStatus(record.status);
  lines.push(`• Status: ${statusLabel}`);
  if (record.checkIn)  lines.push(`• Check-in: ${record.checkIn}`);
  else                 lines.push(`• Check-in: ❌ Not recorded`);
  if (record.checkOut) lines.push(`• Check-out: ${record.checkOut}`);
  else if (record.checkIn) lines.push(`• Check-out: ❌ Not recorded yet`);
  if (record.workHours && record.workHours !== '0.0') lines.push(`• Work duration: ${record.workHours} hrs`);
  if (record.isRegularized) lines.push(`• ✅ This record has been regularized.`);
  return lines.join('\n').trim();
}

/**
 * Formats list of employees currently on leave (for managers/HR/admin).
 * @param {object} data - From hrmsData.getEmployeesOnLeaveToday()
 * @param {string} [scopeLabel] - E.g. "in your team" or "in your organization"
 * @returns {string}
 */
function formatEmployeesOnLeave(data, scopeLabel = 'in your organization') {
  if (!data) return 'Leave data could not be retrieved right now.';
  const { date, count, employees = [] } = data;
  if (count === 0 || employees.length === 0) {
    return `No employees ${scopeLabel} are on approved leave today (${formatDate(date)}).`;
  }
  const lines = [`**${count} employee${count !== 1 ? 's' : ''} ${scopeLabel} on leave today (${formatDate(date)}):**\n`];
  employees.forEach(e => {
    const dateRange = e.from === e.to ? formatDate(e.from) : `${formatDate(e.from)} – ${formatDate(e.to)}`;
    lines.push(`• **${e.fullName}** — ${e.leaveType} (${dateRange}${e.days > 1 ? `, ${e.days} days` : ''})`);
    if (e.designation || e.department) {
      const detail = [e.designation, e.department].filter(Boolean).join(', ');
      lines.push(`  ${detail}`);
    }
  });
  return lines.join('\n').trim();
}

module.exports = {
  formatLeaveHistory,
  formatLeaveBalance,
  formatAttendanceSummary,
  formatSingleDayAttendance,
  formatTodayAttendance,
  formatEmployeeProfile,
  formatReportingManager,
  formatEmployeeCount,
  formatCheckinCount,
  formatEmployeesOnLeave,
  formatDate,
};
