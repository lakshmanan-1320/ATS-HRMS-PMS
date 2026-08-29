/**
 * answerValidator.service.js
 * Formats, validates, and sanitizes AI chatbot answers.
 * Implements deterministic formatters for Mode A and hallucination guards for Mode B & C.
 */

'use strict';

const logger = require('../../config/logger');

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (_) {
    return String(dateStr).slice(0, 10);
  }
}

/**
 * Deterministically formats live HRMS data into clean markdown responses (Mode A).
 * @param {string} intent
 * @param {object} liveData
 * @param {object} context
 * @returns {string}
 */
function formatDeterministicAnswer(intent, liveData, context) {
  if (!liveData) {
    return 'Your requested records could not be retrieved at this time.';
  }

  // 1. Pending Regularizations (Employee Self)
  if (intent === 'EMPLOYEE_REGULARIZATION_PENDING') {
    const data = liveData.pendingRegularizations;
    if (!data || data.count === 0 || !data.requests?.length) {
      return "You don't have any pending attendance regularization requests.";
    }

    const lines = [`You have **${data.count} pending regularization request${data.count !== 1 ? 's' : ''}**:\n`];
    data.requests.forEach((r) => {
      const d = formatDate(r.attendanceDate);
      const type = r.requestType || 'Attendance Regularization';
      const reasonPart = r.reason ? ` (${r.reason})` : '';
      lines.push(`• **${d}** — ${type}${reasonPart} — **Pending**`);
    });
    return lines.join('\n').trim();
  }

  // 2. Regularization History (Employee Self)
  if (intent === 'EMPLOYEE_REGULARIZATION_HISTORY') {
    const data = liveData.regularizationHistory;
    if (!data || data.count === 0 || !data.requests?.length) {
      return "I couldn't find any attendance regularization records for your account.";
    }

    const lines = [`**Your Attendance Regularization History (${data.period}):**\n`];
    data.requests.forEach((r) => {
      const d = formatDate(r.attendanceDate);
      const statusIcon = r.status === 'APPROVED' ? '✅' : r.status === 'REJECTED' ? '❌' : '⏳';
      const reason = r.reason ? ` — *${r.reason}*` : '';
      lines.push(`${statusIcon} **${d}** — ${r.requestType} — **${r.status}**${reason}`);
      if (r.rejectionReason) {
        lines.push(`   └ Rejection reason: ${r.rejectionReason}`);
      }
    });
    return lines.join('\n').trim();
  }

  // 3. Incomplete Punches (Employee Self)
  if (intent === 'ATTENDANCE_INCOMPLETE_PUNCH') {
    const data = liveData.incompletePunches;
    if (!data || data.count === 0 || !data.records?.length) {
      return 'You have **no incomplete attendance punches** recorded in your account.';
    }

    const lines = [`You have **${data.count} incomplete punch${data.count !== 1 ? 'es' : ''}**:\n`];
    data.records.forEach((r) => {
      lines.push(`• **${formatDate(r.date)}** — Check-in: ${r.checkIn}\n  Check-out: ${r.checkOut}\n  Status: ${r.status}`);
    });
    lines.push('\nYou can submit an attendance regularization request if permitted by the attendance policy.');
    return lines.join('\n').trim();
  }

  // 4. Yesterday Attendance Punch
  if (intent === 'ATTENDANCE_YESTERDAY') {
    const r = liveData.yesterdayAttendance;
    if (!r) return 'Your attendance record for yesterday could not be retrieved.';
    const lines = [`**Your Attendance for Yesterday (${formatDate(r.date)}):**\n`];
    lines.push(`• Status: **${r.status}**`);
    lines.push(`• Check-in: ${r.checkIn ? r.checkIn : '❌ Not recorded'}`);
    lines.push(`• Check-out: ${r.checkOut ? r.checkOut : '❌ Not recorded'}`);
    if (r.workHours && r.workHours !== '0.0') lines.push(`• Work Duration: ${r.workHours} hrs`);
    if (r.isRegularized) lines.push(`• ✅ Regularized record`);
    return lines.join('\n').trim();
  }

  // 5. Today Attendance / Specific Punch
  if (intent === 'ATTENDANCE_TODAY' || intent === 'ATTENDANCE_CHECK_IN' || intent === 'ATTENDANCE_CHECK_OUT') {
    const r = liveData.todayAttendance;
    if (!r) return 'Your attendance record for today could not be retrieved.';
    if (intent === 'ATTENDANCE_CHECK_IN') {
      if (r.checkIn) {
        return `You checked in at **${r.checkIn}** today (${formatDate(r.date)}).`;
      }
      return `No check-in punch is recorded for today (${formatDate(r.date)}).`;
    }
    if (intent === 'ATTENDANCE_CHECK_OUT') {
      if (r.checkOut) {
        return `You checked out at **${r.checkOut}** on ${formatDate(r.date)}.`;
      }
      return `No check-out punch is recorded for ${formatDate(r.date)}.`;
    }
    const lines = [`**Your Attendance for Today (${formatDate(r.date)}):**\n`];
    lines.push(`• Status: **${r.status}**`);
    lines.push(`• Check-in: ${r.checkIn ? r.checkIn : '❌ Not recorded'}`);
    lines.push(`• Check-out: ${r.checkOut ? r.checkOut : r.checkIn ? '❌ Not recorded yet' : '❌ Not recorded'}`);
    if (r.workHours && r.workHours !== '0.0') lines.push(`• Work Duration: ${r.workHours} hrs`);
    if (r.isRegularized) lines.push(`• ✅ Regularized record`);
    return lines.join('\n').trim();
  }

  // 6. Current Shift
  if (intent === 'EMPLOYEE_SHIFT') {
    const s = liveData.shift;
    if (!s || !s.hasShift) {
      return 'No specific shift schedule is currently assigned to your employee profile in the HRMS.';
    }
    const lines = ['**Your Current Shift Schedule:**\n'];
    lines.push(`• Shift Name: **${s.shiftName}** (${s.shiftCode || 'N/A'})`);
    lines.push(`• Working Hours: **${s.startTime || 'N/A'} – ${s.endTime || 'N/A'}**`);
    lines.push(`• Minimum Hours: **${s.minimumHours} hrs**`);
    if (s.graceMinutes > 0) lines.push(`• Check-in Grace Time: ${s.graceMinutes} mins`);
    if (s.earlyExitGraceMinutes > 0) lines.push(`• Early Exit Grace Time: ${s.earlyExitGraceMinutes} mins`);
    return lines.join('\n').trim();
  }

  // 7. Department
  if (intent === 'EMPLOYEE_DEPARTMENT') {
    const dept = liveData.department?.departmentName;
    if (!dept) return 'No department is currently assigned to your profile in the HRMS.';
    return `You are assigned to the **${dept}** department.`;
  }

  // 8. Designation
  if (intent === 'EMPLOYEE_DESIGNATION') {
    const desig = liveData.designation?.designation;
    if (!desig) return 'No designation is currently assigned to your profile in the HRMS.';
    return `Your designation is **${desig}**.`;
  }

  // 9. Joining Date
  if (intent === 'EMPLOYEE_JOINING_DATE') {
    const doj = liveData.joiningDate?.dateOfJoining;
    if (!doj) return 'Your joining date is not recorded in the HRMS profile.';
    return `According to HRMS records, your date of joining is **${formatDate(doj)}**.`;
  }

  // 10. Salary Information (Self only)
  if (intent === 'EMPLOYEE_SALARY') {
    const sal = liveData.salaryInfo;
    if (!sal || !sal.hasSalaryInfo) {
      return 'No active salary structure or payslip records were found for your account in the HRMS.';
    }
    const lines = ['**Your Salary Information:**\n'];
    if (sal.ctcAmount) lines.push(`• Total CTC: **₹${sal.ctcAmount.toLocaleString('en-IN')}** / year`);
    if (sal.grossSalary) lines.push(`• Gross Salary: **₹${sal.grossSalary.toLocaleString('en-IN')}** (${sal.salaryType || 'Monthly'})`);
    if (sal.effectiveFrom) lines.push(`• Structure Effective Date: ${formatDate(sal.effectiveFrom)}`);

    if (sal.latestPayroll) {
      const p = sal.latestPayroll;
      lines.push(`\n**Latest Payslip (${p.month || ''} ${p.year || ''}):**`);
      lines.push(`• Net Pay: **₹${p.netSalary.toLocaleString('en-IN')}**`);
      lines.push(`• Total Earnings: ₹${p.totalEarnings.toLocaleString('en-IN')}`);
      lines.push(`• Total Deductions: ₹${p.totalDeductions.toLocaleString('en-IN')}`);
      if (p.payslipNumber) lines.push(`• Payslip Ref: ${p.payslipNumber}`);
    }
    return lines.join('\n').trim();
  }

  // 11. Reporting Manager
  if (intent === 'EMPLOYEE_REPORTING_MANAGER') {
    const m = liveData.reportingManager;
    if (!m || !m.hasManager) {
      return 'No reporting manager is currently assigned to your profile in the HRMS. Please contact HR to update your hierarchy.';
    }
    const lines = ['**Your Reporting Manager:**\n'];
    lines.push(`• Name: **${m.fullName}**`);
    if (m.designation) lines.push(`• Designation: ${m.designation}`);
    if (m.department) lines.push(`• Department: ${m.department}`);
    if (m.email) lines.push(`• Email: ${m.email}`);
    return lines.join('\n').trim();
  }

  // 12. Employee Profile
  if (intent === 'EMPLOYEE_PROFILE') {
    const p = liveData.profile;
    if (!p) return 'Your employee profile details could not be found.';
    const lines = ['**Your Employee Profile:**\n'];
    lines.push(`• Name: **${p.fullName}** (${p.employeeCode || 'N/A'})`);
    if (p.designation) lines.push(`• Designation: ${p.designation}`);
    if (p.departmentName) lines.push(`• Department: ${p.departmentName}`);
    if (p.email) lines.push(`• Email: ${p.email}`);
    if (p.shiftName) lines.push(`• Shift: ${p.shiftName} (${p.shiftStartTime || ''} - ${p.shiftEndTime || ''})`);
    return lines.join('\n').trim();
  }

  // 13. Manager: Team Members
  if (intent === 'MANAGER_TEAM_MEMBERS') {
    const data = liveData.teamMembers;
    if (!data || data.count === 0 || !data.members?.length) {
      return 'You currently have **no active employees** assigned to you as direct reports.';
    }
    const lines = [`Your team has **${data.count} active member${data.count !== 1 ? 's' : ''}:**\n`];
    data.members.forEach((m) => {
      lines.push(`• **${m.fullName}**`);
      if (m.employeeCode) lines.push(`  Employee Code: ${m.employeeCode}`);
      if (m.designation) lines.push(`  Designation: ${m.designation}`);
      if (m.department) lines.push(`  Department: ${m.department}`);
      if (m.email) lines.push(`  Email: ${m.email}`);
    });
    return lines.join('\n').trim();
  }

  // 14. Manager: Team Check-ins (Who checked in vs who has not checked in today)
  if (intent === 'MANAGER_TEAM_CHECKINS') {
    const data = liveData.teamCheckins;
    if (!data || data.total === 0) {
      return 'You currently have no active team members assigned to you.';
    }

    const lines = [`**Team Check-in Status for Today (${formatDate(data.date)}):**\n`];
    lines.push(`• Checked In: **${data.checkedInCount} / ${data.total}**`);
    lines.push(`• Not Checked In: **${data.notCheckedInCount}**\n`);

    if (data.notCheckedIn?.length > 0) {
      lines.push('❌ **Not Checked In Yet:**');
      data.notCheckedIn.forEach((e) => {
        lines.push(`• **${e.employeeName}** (${e.designation || 'Team Member'}${e.department ? `, ${e.department}` : ''})`);
      });
      lines.push('');
    }

    if (data.checkedIn?.length > 0) {
      lines.push('✅ **Checked In:**');
      data.checkedIn.forEach((e) => {
        lines.push(`• **${e.employeeName}** — Check-in: ${e.checkInTime || 'Recorded'}`);
      });
    }

    return lines.join('\n').trim();
  }

  // 15. Manager: Team Late Arrivals
  if (intent === 'MANAGER_TEAM_LATE') {
    const data = liveData.lateArrivals;
    if (!data || data.count === 0 || !data.lateEmployees?.length) {
      return `No late arrivals detected among your direct reports for ${formatDate(data?.date || new Date())}.`;
    }
    const lines = [`**${data.count} team member${data.count !== 1 ? 's' : ''} arrived late on ${formatDate(data.date)}:**\n`];
    data.lateEmployees.forEach((e) => {
      lines.push(`• **${e.employeeName}** (${e.designation || 'Team Member'}) — Check-in Time: **${e.checkInTime}**`);
    });
    return lines.join('\n').trim();
  }

  // 16. Manager: Team Incomplete Punches
  if (intent === 'MANAGER_TEAM_INCOMPLETE_PUNCHES') {
    const data = liveData.teamIncompletePunches;
    if (!data || data.count === 0 || !data.records?.length) {
      return 'No incomplete punches detected among your direct reports in the last 14 days.';
    }
    const lines = [`**${data.count} incomplete punch record${data.count !== 1 ? 's' : ''} in your team:**\n`];
    data.records.forEach((r) => {
      lines.push(`• **${r.employeeName}** (${r.employeeCode}) — ${formatDate(r.date)}: Check-in: ${r.checkIn}, Check-out: ${r.checkOut}`);
    });
    return lines.join('\n').trim();
  }

  // 17. Manager: Team Leave History / Top Leave Taker
  if (intent === 'MANAGER_TEAM_LEAVE_HISTORY') {
    const data = liveData.teamLeaveHistory;
    if (!data || !data.members?.length) {
      return 'No approved leave records found for your team members.';
    }

    const lines = ['**Team Leave Summary (Approved Leaves):**\n'];
    if (data.topLeaveTaker) {
      lines.push(`🏆 **Most Leave Taken:** **${data.topLeaveTaker.employeeName}** (${data.topLeaveTaker.totalLeaveDays} days across ${data.topLeaveTaker.leaveCount} request${data.topLeaveTaker.leaveCount !== 1 ? 's' : ''})\n`);
    }

    lines.push('| Team Member | Designation | Total Leave Days | Requests |');
    lines.push('|---|---|---|---|');
    data.members.forEach((m) => {
      lines.push(`| **${m.employeeName}** | ${m.designation || 'N/A'} | **${m.totalLeaveDays}** | ${m.leaveCount} |`);
    });
    return lines.join('\n').trim();
  }

  // 18. Manager: Pending Regularizations for Direct Reports
  if (intent === 'MANAGER_REGULARIZATION_PENDING') {
    const data = liveData.managerRegularizationPending;
    if (!data || data.count === 0 || !data.requests?.length) {
      return 'You currently have **0 pending regularization requests** from your direct reports.';
    }

    const lines = [`**You have ${data.count} pending regularization request${data.count !== 1 ? 's' : ''} to review:**\n`];
    if (data.oldestRequest) {
      lines.push(`⏳ **Oldest Request:** **${data.oldestRequest.employeeName}** for ${formatDate(data.oldestRequest.attendanceDate)} (${data.oldestRequest.requestType})\n`);
    }

    data.requests.forEach((r) => {
      const reason = r.reason ? ` — *${r.reason}*` : '';
      lines.push(`• **${r.employeeName}** — ${formatDate(r.attendanceDate)}: ${r.requestType}${reason}`);
    });
    return lines.join('\n').trim();
  }

  // 19. Manager / Org: Pending Approvals
  if (
    intent === 'PENDING_APPROVALS' ||
    intent === 'MANAGER_PENDING_APPROVALS' ||
    intent === 'MANAGER_PENDING_LEAVE_APPROVALS' ||
    intent === 'MANAGER_PENDING_REGULARIZATION_APPROVALS' ||
    intent === 'ORG_PENDING_APPROVALS'
  ) {
    const data = liveData.pendingApprovals;
    const scopeLabel = liveData.scope === 'team' ? 'from your direct reports' : 'across your organization';
    if (!data || data.totalPending === 0) {
      return `You have **0 pending approvals** ${scopeLabel}.`;
    }

    const filter = liveData.filter || 'all';
    const lines = [`**You have ${data.totalPending} pending approval request${data.totalPending !== 1 ? 's' : ''} ${scopeLabel}:**\n`];

    if ((filter === 'all' || filter === 'leave') && data.leaveRequests?.length > 0) {
      lines.push('🌴 **Pending Leave Requests:**');
      data.leaveRequests.forEach((r) => {
        const range = r.startDate === r.endDate ? formatDate(r.startDate) : `${formatDate(r.startDate)} – ${formatDate(r.endDate)}`;
        lines.push(`• **${r.employeeName}** — ${r.leaveType} (${range}, ${r.days} day${r.days !== 1 ? 's' : ''})`);
        if (r.reason) lines.push(`  *Reason: ${r.reason}*`);
      });
      lines.push('');
    }

    if ((filter === 'all' || filter === 'reg') && data.regularizationRequests?.length > 0) {
      lines.push('⏰ **Pending Attendance Regularizations:**');
      data.regularizationRequests.forEach((r) => {
        lines.push(`• **${r.employeeName}** — ${r.requestType} for ${formatDate(r.attendanceDate)}`);
        if (r.reason) lines.push(`  *Reason: ${r.reason}*`);
      });
    }

    return lines.join('\n').trim();
  }

  // 20. Organization: Employee Count
  if (intent === 'EMPLOYEE_COUNT' || intent === 'ORG_EMPLOYEE_COUNT') {
    const total = liveData.employeeCount?.total || 0;
    return `Your organization currently has **${total} active employee${total !== 1 ? 's' : ''}**.`;
  }

  // 21. Organization: Real-time Check-ins
  if (intent === 'CURRENT_CHECKINS' || intent === 'ORG_CHECKINS') {
    const count = liveData.checkinCount?.checkedInCount || 0;
    const date = liveData.checkinCount?.date ? formatDate(liveData.checkinCount.date) : 'today';
    return `As of ${date}, **${count} employee${count !== 1 ? 's have' : ' has'} checked in** across the organization.`;
  }

  // 22. Employees on Leave Today (Team / Org / Self)
  if (intent === 'EMPLOYEES_ON_LEAVE' || intent === 'MANAGER_TEAM_LEAVE' || intent === 'ORG_LEAVE') {
    const data = liveData.onLeaveToday;
    const scope = liveData.scope;
    if (!data) return 'Leave information could not be retrieved right now.';

    if (scope === 'self') {
      const isSelfOnLeave = (data.employees || []).some((e) => e.employee_id === context.employeeId);
      if (isSelfOnLeave) {
        return `According to HRMS records, you are on approved leave today (${formatDate(data.date)}).`;
      }
      return `You are not on approved leave today (${formatDate(data.date)}).`;
    }

    const scopeLabel = scope === 'team' ? 'in your team' : 'in your organization';
    if (data.count === 0 || !data.employees?.length) {
      return `No employees ${scopeLabel} are on approved leave today (${formatDate(data.date)}).`;
    }

    const lines = [`**${data.count} employee${data.count !== 1 ? 's' : ''} ${scopeLabel} on leave today (${formatDate(data.date)}):**\n`];
    data.employees.forEach((e) => {
      const range = e.from === e.to ? formatDate(e.from) : `${formatDate(e.from)} – ${formatDate(e.to)}`;
      lines.push(`• **${e.fullName}** — ${e.leaveType} (${range}${e.days > 1 ? `, ${e.days} days` : ''})`);
      if (e.designation || e.department) {
        lines.push(`  ${[e.designation, e.department].filter(Boolean).join(', ')}`);
      }
    });
    return lines.join('\n').trim();
  }

  // 23. Current Absences (Team / Org)
  if (intent === 'CURRENT_ABSENCES' || intent === 'MANAGER_TEAM_ABSENCES' || intent === 'ORG_ABSENCES') {
    const data = liveData.absentToday;
    const scopeLabel = liveData.scope === 'team' ? 'in your team' : 'in your organization';
    if (!data || data.count === 0 || !data.employees?.length) {
      return `No unrecorded absences detected ${scopeLabel} today (${formatDate(data?.date)}).`;
    }
    const lines = [`**${data.count} employee${data.count !== 1 ? 's' : ''} ${scopeLabel} not checked in today (${formatDate(data.date)}):**\n`];
    data.employees.slice(0, 15).forEach((e) => {
      lines.push(`• **${e.fullName}** — ${[e.designation, e.department].filter(Boolean).join(', ')}`);
    });
    if (data.count > 15) {
      lines.push(`  ...and ${data.count - 15} more.`);
    }
    return lines.join('\n').trim();
  }

  // 24. Leave Balances (Employee Self)
  if (intent === 'EMPLOYEE_LEAVE_BALANCE') {
    const b = liveData.leaveBalance;
    if (!b || !b.balances?.length) {
      return 'No leave balance records were found for your account in the current leave year.';
    }
    const lines = [`**Your Leave Balances (${b.financialYear}):**\n`];
    lines.push('| Leave Type | Allocated | Used | Pending | Remaining |');
    lines.push('|---|---|---|---|---|');
    b.balances.forEach((row) => {
      lines.push(`| **${row.leaveType}** | ${row.allocated} | ${row.used} | ${row.pending} | **${row.remaining}** |`);
    });
    lines.push(`\nTotal Allocated: **${b.totalAllocated}** | Total Remaining: **${b.totalRemaining}**`);
    return lines.join('\n').trim();
  }

  // 25. Leave History (Employee Self)
  if (intent === 'EMPLOYEE_LEAVE_HISTORY') {
    const h = liveData.leaveHistory;
    if (!h || !h.records?.length) {
      return "I couldn't find any leave records for your account for the requested period.";
    }
    const lines = [`**Your Leave History (${h.period}):**\n`];
    const approved = h.records.filter((r) => r.status === 'APPROVED');
    const pending = h.records.filter((r) => r.status === 'PENDING');
    const rejected = h.records.filter((r) => r.status === 'REJECTED' || r.status === 'CANCELLED');

    if (approved.length > 0) {
      lines.push('✅ **Approved Leave:**');
      approved.forEach((r) => {
        const range = r.startDate === r.endDate ? formatDate(r.startDate) : `${formatDate(r.startDate)} – ${formatDate(r.endDate)}`;
        lines.push(`  • ${range} — **${r.leaveType}** (${r.days} day${r.days !== 1 ? 's' : ''})`);
      });
      lines.push('');
    }

    if (pending.length > 0) {
      lines.push('⏳ **Pending Approval:**');
      pending.forEach((r) => {
        const range = r.startDate === r.endDate ? formatDate(r.startDate) : `${formatDate(r.startDate)} – ${formatDate(r.endDate)}`;
        lines.push(`  • ${range} — **${r.leaveType}** (${r.days} day${r.days !== 1 ? 's' : ''}) — Awaiting review`);
      });
      lines.push('');
    }

    if (rejected.length > 0) {
      lines.push('❌ **Rejected / Cancelled:**');
      rejected.forEach((r) => {
        const range = r.startDate === r.endDate ? formatDate(r.startDate) : `${formatDate(r.startDate)} – ${formatDate(r.endDate)}`;
        lines.push(`  • ${range} — **${r.leaveType}** (${r.status})`);
      });
      lines.push('');
    }

    lines.push(`Total approved leave days: **${h.totalApprovedDays}**`);
    return lines.join('\n').trim();
  }

  // 26. Pending Leaves (Employee Self)
  if (intent === 'EMPLOYEE_LEAVE_PENDING') {
    const data = liveData.pendingLeaves;
    if (!data || data.count === 0 || !data.requests?.length) {
      return "You don't have any pending leave applications.";
    }
    const lines = [`You have **${data.count} pending leave application${data.count !== 1 ? 's' : ''}**:\n`];
    data.requests.forEach((r) => {
      const range = r.startDate === r.endDate ? formatDate(r.startDate) : `${formatDate(r.startDate)} – ${formatDate(r.endDate)}`;
      lines.push(`• **${r.leaveType}** (${range}, ${r.days} day${r.days !== 1 ? 's' : ''}) — Awaiting manager approval`);
    });
    return lines.join('\n').trim();
  }

  // 27. Attendance Monthly Summary
  if (intent === 'ATTENDANCE_MONTH' || intent === 'TEAM_ATTENDANCE' || intent === 'MANAGER_TEAM_ATTENDANCE') {
    const s = liveData.attendanceSummary;
    if (!s) return 'Your attendance summary could not be retrieved.';
    const lines = [`**Attendance Summary (${s.period}):**\n`];
    lines.push(`• Working Days: **${s.workingDays}**`);
    lines.push(`• Present Days: **${s.presentDays}**`);
    lines.push(`• Absent Days: **${s.absentDays}**`);
    lines.push(`• Late Arrivals: **${s.lateDays}**`);
    if (s.halfDays) lines.push(`• Half Days: **${s.halfDays}**`);
    lines.push(`• Total Work Hours: **${s.totalWorkHours} hrs**`);
    lines.push(`• Attendance Rate: **${s.attendancePercentage}%**`);
    return lines.join('\n').trim();
  }

  return 'Information retrieved successfully.';
}

/**
 * Builds conversational greeting.
 */
function formatConversationalAnswer() {
  return "Hello! I am your HRMS AI Assistant. I can help you check your pending regularizations, leave balances, leave history, today's attendance, shift details, reporting hierarchy, and company HR policies. How can I assist you today?";
}

/**
 * Hallucination patterns check.
 */
const HALLUCINATION_PATTERNS = [
  { re: /your leave (?:has been|was) approved/i, label: 'FABRICATED_APPROVAL' },
  { re: /your request (?:has been|was) (?:submitted|approved|processed)/i, label: 'FABRICATED_ACTION' },
  { re: /your manager (?:has|has already) approved/i, label: 'FABRICATED_MANAGER_ACTION' },
  { re: /your attendance (?:has been|was) marked/i, label: 'FABRICATED_ATTENDANCE' },
];

function sanitizeLlmAnswer(rawAnswer, hasVerifiedData) {
  if (!rawAnswer) return rawAnswer;
  for (const { re, label } of HALLUCINATION_PATTERNS) {
    if (re.test(rawAnswer) && !hasVerifiedData) {
      logger.warn(`[AnswerValidator] Sanitized unverified LLM claim: ${label}`);
      return 'The available HRMS data does not contain confirmation of this action. Please verify in the HRMS portal or contact HR.';
    }
  }
  return rawAnswer;
}

/**
 * Contextual follow-up suggestions.
 */
function getSuggestedQuestions(intent) {
  switch (intent) {
    case 'EMPLOYEE_REGULARIZATION_PENDING':
    case 'EMPLOYEE_REGULARIZATION_HISTORY':
    case 'HYBRID_ATTENDANCE_REGULARIZATION':
    case 'HYBRID_REGULARIZATION':
    case 'ATTENDANCE_INCOMPLETE_PUNCH':
      return ['What is the deadline for regularization?', 'How many regularizations are allowed?', 'Show my attendance for this month.'];
    case 'EMPLOYEE_REPORTING_MANAGER':
    case 'EMPLOYEE_PROFILE':
    case 'EMPLOYEE_SHIFT':
    case 'EMPLOYEE_DEPARTMENT':
    case 'EMPLOYEE_DESIGNATION':
    case 'EMPLOYEE_JOINING_DATE':
    case 'EMPLOYEE_SALARY':
      return ['Do I have any pending regularization requests?', 'What is my leave balance?', 'Show my attendance for this month.'];
    case 'EMPLOYEE_LEAVE_HISTORY':
    case 'EMPLOYEE_LEAVE_BALANCE':
    case 'EMPLOYEE_LEAVE_PENDING':
    case 'HYBRID_LEAVE_APPLICATION':
      return ['Which days was I on leave?', 'Can I apply for leave after being absent?', 'What is the leave policy?'];
    case 'ATTENDANCE_TODAY':
    case 'ATTENDANCE_YESTERDAY':
    case 'ATTENDANCE_MONTH':
    case 'ATTENDANCE_CHECK_IN':
    case 'ATTENDANCE_CHECK_OUT':
      return ['Do I have any incomplete punches?', 'I forgot to punch out. What can I do?', 'What is the attendance policy?'];
    case 'MANAGER_TEAM_MEMBERS':
    case 'MANAGER_TEAM_ATTENDANCE':
    case 'MANAGER_TEAM_ABSENCES':
    case 'MANAGER_TEAM_CHECKINS':
    case 'MANAGER_TEAM_LATE':
    case 'MANAGER_TEAM_INCOMPLETE_PUNCHES':
    case 'MANAGER_TEAM_LEAVE':
    case 'MANAGER_TEAM_LEAVE_HISTORY':
    case 'MANAGER_REGULARIZATION_PENDING':
    case 'MANAGER_PENDING_APPROVALS':
      return ['Pending approvals.', 'Who has not checked in today?', 'Who is on leave today?', 'Which team member has taken the most leave?'];
    case 'ORG_EMPLOYEE_COUNT':
    case 'ORG_CHECKINS':
    case 'ORG_ABSENCES':
    case 'ORG_LEAVE':
    case 'ORG_PENDING_APPROVALS':
      return ['Total employees.', 'Current check-in count.', 'Current absences across company.', 'Show all pending leave and regularization requests.'];
    case 'POLICY_REGULARIZATION':
    case 'POLICY_LEAVE':
    case 'POLICY_SECURITY':
    case 'POLICY_WORKING_HOURS':
    case 'POLICY_CONDUCT':
    case 'POLICY_BONUS':
    case 'HYBRID_BONUS_ELIGIBILITY':
    case 'HYBRID_REMOTE_WORK_SECURITY':
    default:
      return ['Do I have any pending regularization requests?', 'What is the leave policy?', 'What are the password requirements?'];
  }
}

module.exports = {
  formatDeterministicAnswer,
  formatConversationalAnswer,
  sanitizeLlmAnswer,
  getSuggestedQuestions,
  formatDate,
};
