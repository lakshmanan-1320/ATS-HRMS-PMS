/**
 * answerValidator.service.js
 *
 * Formats, validates, and sanitizes AI chatbot answers.
 * Implements deterministic formatters for Mode A (Live DB) and hallucination guards for Mode B & C.
 */

'use strict';

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
 *
 * @param {string} intent - Intent identifier
 * @param {object} liveData - Data from hrmsDataRetriever
 * @param {object} context - Authenticated employee context
 * @returns {string} Clean, factual markdown response
 */
function formatDeterministicAnswer(intent, liveData, context) {
  if (!liveData) {
    return 'Your requested HRMS records could not be retrieved at this time.';
  }

  if (liveData.noEmployeeRecord) {
    return 'Your user account is not linked to a personal employee profile in this organization.';
  }

  // ── 1. EMPLOYEE PROFILE & HIERARCHY ────────────────────────────────────────
  if (intent === 'EMPLOYEE_DESIGNATION') {
    const desig = liveData.designationInfo?.designation || liveData.profile?.designation;
    if (desig) return `Your designation is **${desig}**.`;
    return 'Your designation is not recorded in the HRMS.';
  }

  if (intent === 'EMPLOYEE_DEPARTMENT') {
    const dept = liveData.departmentInfo?.departmentName || liveData.profile?.departmentName;
    if (dept) return `You are in the **${dept}** department.`;
    return 'Your department is not recorded in the HRMS.';
  }

  if (intent === 'EMPLOYEE_REPORTING_MANAGER') {
    const mgr = liveData.managerInfo;
    if (!mgr || !mgr.hasManager) {
      return 'You do not have a reporting manager assigned in your HRMS record.';
    }
    const desigPart = mgr.designation ? `, ${mgr.designation}` : '';
    const deptPart = mgr.department ? ` (${mgr.department})` : '';
    const emailPart = mgr.email ? `\n• Email: **${mgr.email}**` : '';
    return `Your reporting manager is **${mgr.fullName}**${desigPart}${deptPart}.${emailPart}`;
  }

  if (intent === 'EMPLOYEE_JOINING_DATE') {
    const doj = liveData.joiningDateInfo?.dateOfJoining || liveData.profile?.dateOfJoining;
    if (doj) return `Your date of joining is **${formatDate(doj)}**.`;
    return 'Your date of joining is not recorded in the HRMS.';
  }

  if (intent === 'EMPLOYEE_PROFILE') {
    const prof = liveData.profile;
    if (!prof) return 'Your employee profile could not be retrieved.';
    const lines = [`**Your Employee Profile:**`];
    lines.push(`• Name: **${prof.fullName}**`);
    lines.push(`• Employee Code: **${prof.employeeCode}**`);
    if (prof.designation) lines.push(`• Designation: **${prof.designation}**`);
    if (prof.departmentName) lines.push(`• Department: **${prof.departmentName}**`);
    if (prof.email) lines.push(`• Email: **${prof.email}**`);
    if (prof.dateOfJoining) lines.push(`• Date of Joining: **${formatDate(prof.dateOfJoining)}**`);
    if (prof.status) lines.push(`• Status: **${prof.status}**`);
    return lines.join('\n');
  }

  if (intent === 'EMPLOYEE_SHIFT') {
    const shift = liveData.shiftInfo;
    if (!shift || !shift.hasShift) {
      return 'You do not have an active shift assigned in the system.';
    }
    const gracePart = shift.graceMinutes ? ` (Grace: ${shift.graceMinutes} mins)` : '';
    return `Your current shift is **${shift.shiftName}** (${shift.startTime} – ${shift.endTime})${gracePart}.`;
  }

  if (intent === 'EMPLOYEE_SALARY') {
    const sal = liveData.salaryInfo;
    if (!sal || !sal.hasSalaryInfo) {
      return 'Your salary information is not available in the payroll system.';
    }
    const lines = [`**Your Salary Summary:**`];
    if (sal.grossSalary) lines.push(`• Gross Salary: **₹${sal.grossSalary.toLocaleString('en-IN')}**`);
    if (sal.ctcAmount) lines.push(`• Annual CTC: **₹${sal.ctcAmount.toLocaleString('en-IN')}**`);
    if (sal.latestPayroll) {
      const lp = sal.latestPayroll;
      lines.push(`\n**Latest Payslip (${lp.month || ''} ${lp.year || ''}):**`);
      lines.push(`• Net Pay: **₹${lp.netSalary.toLocaleString('en-IN')}**`);
      lines.push(`• Total Earnings: **₹${lp.totalEarnings.toLocaleString('en-IN')}**`);
      lines.push(`• Total Deductions: **₹${lp.totalDeductions.toLocaleString('en-IN')}** (PF: ₹${lp.pf}, Tax: ₹${lp.tax})`);
    }
    return lines.join('\n');
  }

  // ── 2. LEAVE BALANCES & HISTORY ────────────────────────────────────────────
  if (intent === 'EMPLOYEE_LEAVE_BALANCE') {
    const data = liveData.leaveBalance;
    if (!data || !data.balances || data.balances.length === 0) {
      return "I don't have a current leave balance recorded for your account.";
    }

    const lines = [`You currently have the following leave balances:\n`];
    data.balances.forEach((b) => {
      lines.push(`• **${b.leaveType}**: **${b.remaining}** days remaining (Allocated: ${b.allocated}, Used: ${b.used}${b.pending > 0 ? `, Pending: ${b.pending}` : ''})`);
    });
    lines.push(`\n**Total Remaining Leave:** **${data.totalRemaining} days**.`);
    return lines.join('\n');
  }

  if (intent === 'HYBRID_LEAVE_APPLICATION') {
    const balance = liveData.leaveBalance;
    const profile = liveData.profile;
    const lines = [];
    if (profile) {
      lines.push(`Employee status: ${profile.status || 'Not recorded'}.`);
      if (profile.dateOfJoining) lines.push(`Date of joining: ${formatDate(profile.dateOfJoining)}.`);
    }
    if (!balance || !balance.balances || balance.balances.length === 0) {
      lines.push("Current leave balance: I don't have a current leave balance recorded for this account.");
    } else {
      lines.push(`Current total leave balance: ${balance.totalRemaining} days remaining.`);
      balance.balances.forEach((b) => {
        lines.push(`${b.leaveType}: ${b.remaining} days remaining; ${b.used} used; ${b.pending || 0} pending.`);
      });
    }
    return lines.join('\n');
  }

  if (intent === 'HYBRID_BONUS_ELIGIBILITY' || intent === 'HYBRID_REMOTE_WORK_SECURITY') {
    const profile = liveData.profile;
    if (!profile) return 'The authenticated employee profile is unavailable.';
    const lines = [
      `Employee status: ${profile.status || 'active'}.`,
      `Designation: ${profile.designation || 'Not recorded'}.`,
      `Department: ${profile.departmentName || 'Not recorded'}.`,
    ];
    if (profile.dateOfJoining) lines.push(`Date of joining: ${formatDate(profile.dateOfJoining)}.`);
    if (profile.employmentType) lines.push(`Employment type: ${profile.employmentType}.`);
    return lines.join('\n');
  }

  if (intent === 'HYBRID_PROBATION') {
    const profile = liveData.profile;
    const balance = liveData.leaveBalance;
    const lines = [];
    if (profile) {
      lines.push(`Employee status: ${profile.status || 'active'}.`);
      if (profile.dateOfJoining) lines.push(`Date of joining: ${formatDate(profile.dateOfJoining)}.`);
      if (profile.employmentType) lines.push(`Employment type: ${profile.employmentType}.`);
    }
    if (balance && balance.balances && balance.balances.length > 0) {
      lines.push(`Current total leave balance: ${balance.totalRemaining} days.`);
      balance.balances.forEach((b) => {
        lines.push(`${b.leaveType}: ${b.remaining} remaining (Allocated: ${b.allocated}, Used: ${b.used}).`);
      });
    }
    return lines.join('\n');
  }

  if (intent === 'HYBRID_REGULARIZATION' || intent === 'HYBRID_ATTENDANCE_REGULARIZATION') {
    const lines = [];
    const yesterday = liveData.yesterdayAttendance;
    const pending = liveData.pendingRegularizations;
    const incomplete = liveData.incompletePunches;
    const profile = liveData.profile;

    if (profile) {
      lines.push(`Employee status: ${profile.status || 'active'}.`);
    }
    if (yesterday) {
      lines.push(`Yesterday's attendance (${formatDate(yesterday.date)}): Status: ${yesterday.status}, Check-in: ${yesterday.checkIn || 'not recorded'}, Check-out: ${yesterday.checkOut || 'not recorded'}.`);
    }
    if (incomplete && incomplete.records && incomplete.records.length > 0) {
      lines.push(`Incomplete punch records: ${incomplete.count} found.`);
      incomplete.records.slice(0, 3).forEach((r) => {
        lines.push(`• Date ${formatDate(r.date)}: check-in ${r.checkIn || 'none'}, check-out ${r.checkOut || 'none'}.`);
      });
    } else {
      lines.push('Incomplete punch records: none currently flagged.');
    }
    if (pending && pending.requests && pending.requests.length > 0) {
      lines.push(`Pending regularization requests: ${pending.count}.`);
    } else {
      lines.push('Pending regularization requests: 0 pending.');
    }
    return lines.join('\n');
  }

  if (intent === 'EMPLOYEE_LEAVE_HISTORY') {
    const data = liveData.leaveHistory;
    if (!data || !data.records || data.records.length === 0) {
      return 'You do not have any recorded leave history.';
    }

    const lines = [`**Your Leave History (${data.period || 'Recent'}):**\n`];
    data.records.forEach((r) => {
      const statusIcon = r.status === 'APPROVED' ? '✅' : r.status === 'REJECTED' ? '❌' : '⏳';
      const reasonPart = r.reason ? ` — *${r.reason}*` : '';
      lines.push(`${statusIcon} **${formatDate(r.startDate)} to ${formatDate(r.endDate)}** (${r.days} day${r.days !== 1 ? 's' : ''}) — ${r.leaveType} — **${r.status}**${reasonPart}`);
    });
    lines.push(`\nTotal Approved Leave Days: **${data.totalApprovedDays} days**.`);
    return lines.join('\n');
  }

  if (intent === 'EMPLOYEE_LEAVE_PENDING') {
    const data = liveData.pendingLeaves;
    if (!data || data.count === 0 || !data.requests?.length) {
      return 'You have no pending leave requests.';
    }

    const lines = [`You have **${data.count} pending leave request${data.count !== 1 ? 's' : ''}**:\n`];
    data.requests.forEach((r) => {
      const reasonPart = r.reason ? ` (${r.reason})` : '';
      lines.push(`• **${formatDate(r.startDate)} to ${formatDate(r.endDate)}** — ${r.leaveType} (${r.days} day${r.days !== 1 ? 's' : ''})${reasonPart} — **Pending**`);
    });
    return lines.join('\n');
  }

  // ── 3. ATTENDANCE & PUNCHES ───────────────────────────────────────────────
  if (intent === 'ATTENDANCE_TODAY' || intent === 'ATTENDANCE_CHECK_IN' || intent === 'ATTENDANCE_CHECK_OUT') {
    const r = liveData.todayAttendance || liveData.dayAttendance;
    if (!r) return 'Your attendance record for today could not be retrieved.';

    if (intent === 'ATTENDANCE_CHECK_IN') {
      if (r.checkIn) return `You checked in at **${r.checkIn}** today (${formatDate(r.date)}).`;
      return `No check-in punch is recorded for today (${formatDate(r.date)}).`;
    }

    if (intent === 'ATTENDANCE_CHECK_OUT') {
      if (r.checkOut) return `You checked out at **${r.checkOut}** today (${formatDate(r.date)}).`;
      return `No check-out punch is recorded for today (${formatDate(r.date)}).`;
    }

    const lines = [`**Your Attendance for Today (${formatDate(r.date)}):**\n`];
    lines.push(`• Status: **${r.status}**`);
    lines.push(`• Check-in: ${r.checkIn ? `**${r.checkIn}**` : '❌ Not recorded'}`);
    lines.push(`• Check-out: ${r.checkOut ? `**${r.checkOut}**` : r.checkIn ? '⏳ Not checked out yet' : '❌ Not recorded'}`);
    if (r.workHours && r.workHours !== '0.0') lines.push(`• Work Duration: **${r.workHours} hrs**`);
    if (r.isRegularized) lines.push(`• ✅ Regularized record`);
    return lines.join('\n');
  }

  if (intent === 'ATTENDANCE_YESTERDAY') {
    const r = liveData.yesterdayAttendance;
    if (!r) return 'Your attendance record for yesterday could not be retrieved.';

    const lines = [`**Your Attendance for Yesterday (${formatDate(r.date)}):**\n`];
    lines.push(`• Status: **${r.status}**`);
    lines.push(`• Check-in: ${r.checkIn ? `**${r.checkIn}**` : '❌ Not recorded'}`);
    lines.push(`• Check-out: ${r.checkOut ? `**${r.checkOut}**` : '❌ Not recorded'}`);
    if (r.workHours && r.workHours !== '0.0') lines.push(`• Work Duration: **${r.workHours} hrs**`);
    if (r.isRegularized) lines.push(`• ✅ Regularized record`);
    return lines.join('\n');
  }

  if (intent === 'ATTENDANCE_INCOMPLETE_PUNCH') {
    const data = liveData.incompletePunches;
    if (!data || data.count === 0 || !data.records?.length) {
      return 'You have **no incomplete attendance punches** recorded in your account.';
    }

    const lines = [`You have **${data.count} incomplete attendance punch${data.count !== 1 ? 'es' : ''}**:\n`];
    data.records.forEach((r) => {
      lines.push(`• **${formatDate(r.date)}** — Check-in: ${r.checkIn} | Check-out: ${r.checkOut}`);
    });
    lines.push('\nYou can submit an attendance regularization request if permitted by the company attendance policy.');
    return lines.join('\n');
  }

  if (intent === 'ATTENDANCE_MONTH') {
    const data = liveData.attendanceSummary;
    if (!data) return 'Your monthly attendance summary could not be retrieved.';

    const lines = [`**Attendance Summary (${data.period}):**\n`];
    lines.push(`• Working Days: **${data.workingDays}**`);
    lines.push(`• Present Days: **${data.presentDays}**`);
    lines.push(`• Absent Days: **${data.absentDays}**`);
    if (data.lateDays > 0) lines.push(`• Late Arrivals: **${data.lateDays}**`);
    if (data.halfDays > 0) lines.push(`• Half Days: **${data.halfDays}**`);
    lines.push(`• Attendance Rate: **${data.attendancePercentage}%**`);
    lines.push(`• Total Work Hours: **${data.totalWorkHours} hrs**`);
    return lines.join('\n');
  }

  // ── 4. REGULARIZATION ─────────────────────────────────────────────────────
  if (intent === 'EMPLOYEE_REGULARIZATION_PENDING') {
    const data = liveData.pendingRegularizations;
    if (!data || data.count === 0 || !data.requests?.length) {
      return "You don't have any pending attendance regularization requests.";
    }

    const lines = [`You have **${data.count} pending regularization request${data.count !== 1 ? 's' : ''}**:\n`];
    data.requests.forEach((r) => {
      const reasonPart = r.reason ? ` (${r.reason})` : '';
      lines.push(`• **${formatDate(r.attendanceDate)}** — ${r.requestType}${reasonPart} — **Pending**`);
    });
    return lines.join('\n');
  }

  if (intent === 'EMPLOYEE_REGULARIZATION_HISTORY') {
    const data = liveData.regularizationHistory;
    if (!data || data.count === 0 || !data.requests?.length) {
      return "I couldn't find any attendance regularization records for your account.";
    }

    const lines = [`**Your Attendance Regularization History (${data.period || 'Recent'}):**\n`];
    data.requests.forEach((r) => {
      const statusIcon = r.status === 'APPROVED' ? '✅' : r.status === 'REJECTED' ? '❌' : '⏳';
      const reason = r.reason ? ` — *${r.reason}*` : '';
      lines.push(`${statusIcon} **${formatDate(r.attendanceDate)}** — ${r.requestType} — **${r.status}**${reason}`);
      if (r.rejectionReason) lines.push(`   └ Rejection Reason: ${r.rejectionReason}`);
    });
    return lines.join('\n');
  }

  // ── 5. MANAGER & TEAM INTENTS ─────────────────────────────────────────────
  if (intent === 'MANAGER_TEAM_MEMBERS') {
    const data = liveData.teamMembers;
    if (!data || data.count === 0 || !data.members?.length) {
      return 'You currently have no direct reports assigned to you in the HRMS.';
    }

    const lines = [`You have **${data.count} direct report${data.count !== 1 ? 's' : ''}**:\n`];
    data.members.forEach((m) => {
      const desigPart = m.designation ? ` - ${m.designation}` : '';
      const deptPart = m.department ? ` (${m.department})` : '';
      lines.push(`• **${m.fullName}** (${m.employeeCode})${desigPart}${deptPart}`);
    });
    return lines.join('\n');
  }

  if (intent === 'MANAGER_TEAM_CHECKINS') {
    const data = liveData.checkinStatus;
    if (!data) return 'Team attendance status is currently unavailable.';

    const lines = [`**Team Attendance for Today (${formatDate(data.date)}):**\n`];
    lines.push(`• **Checked In (${data.checkedInCount}/${data.total}):**`);
    if (data.checkedIn.length > 0) {
      data.checkedIn.forEach((e) => lines.push(`  - ${e.employeeName} (${e.employeeCode}) at ${e.checkInTime}`));
    } else {
      lines.push(`  *(None)*`);
    }

    lines.push(`\n• **Not Checked In / Absent (${data.notCheckedInCount}/${data.total}):**`);
    if (data.notCheckedIn.length > 0) {
      data.notCheckedIn.forEach((e) => lines.push(`  - ${e.employeeName} (${e.employeeCode})`));
    } else {
      lines.push(`  *(Everyone has checked in!)*`);
    }

    return lines.join('\n');
  }

  if (intent === 'MANAGER_TEAM_LEAVE') {
    const data = liveData.teamOnLeave;
    if (!data || data.count === 0) {
      return 'None of your team members are on leave today.';
    }

    const lines = [`**${data.count} team member${data.count !== 1 ? 's' : ''} on leave today (${formatDate(data.date)}):**\n`];
    data.employees.forEach((e) => {
      lines.push(`• **${e.fullName}** — ${e.leaveType} (${formatDate(e.from)} to ${formatDate(e.to)})`);
    });
    return lines.join('\n');
  }

  if (intent === 'MANAGER_TEAM_LATE') {
    const data = liveData.lateArrivals;
    if (!data || data.count === 0) {
      return 'No late arrivals recorded for your team today.';
    }

    const lines = [`**${data.count} late arrival${data.count !== 1 ? 's' : ''} in your team today:**\n`];
    data.lateEmployees.forEach((e) => {
      lines.push(`• **${e.employeeName}** — Check-in: ${e.checkInTime} (${e.lateByMinutes} mins late)`);
    });
    return lines.join('\n');
  }

  if (intent === 'MANAGER_TEAM_INCOMPLETE_PUNCHES') {
    const data = liveData.teamIncompletePunches;
    if (!data || data.count === 0) {
      return 'No incomplete attendance punches found across your direct reports.';
    }

    const lines = [`Found **${data.count} incomplete punch${data.count !== 1 ? 'es' : ''}** across your direct reports:\n`];
    data.records.forEach((r) => {
      lines.push(`• **${r.employeeName}** (${formatDate(r.date)}) — In: ${r.checkIn} | Out: ${r.checkOut}`);
    });
    return lines.join('\n');
  }

  if (intent === 'MANAGER_TEAM_ATTENDANCE') {
    const data = liveData.teamAttendance;
    if (!data) return 'Team attendance is currently unavailable.';
    return `Team attendance for today: **${data.checkedInCount} of ${data.total}** employees have checked in.`;
  }

  if (intent === 'MANAGER_TEAM_LEAVE_HISTORY') {
    const data = liveData.teamLeaveHistory;
    if (!data || !data.members?.length) {
      return 'No team leave history is recorded.';
    }

    const lines = [`**Team Leave Summary:**\n`];
    if (data.topLeaveTaker) {
      lines.push(`• **Most Leave Taken:** ${data.topLeaveTaker.employeeName} (${data.topLeaveTaker.totalLeaveDays} days across ${data.topLeaveTaker.leaveCount} requests)\n`);
    }
    data.members.forEach((m) => {
      lines.push(`• **${m.employeeName}**: ${m.totalLeaveDays} total leave days (${m.leaveCount} requests)`);
    });
    return lines.join('\n');
  }

  if (intent === 'MANAGER_REGULARIZATION_PENDING') {
    const data = liveData.pendingRegularizations;
    if (!data || data.count === 0) {
      return 'You have no pending regularization requests from your team.';
    }

    const lines = [`You have **${data.count} pending regularization request${data.count !== 1 ? 's' : ''}**:\n`];
    data.requests.forEach((r) => {
      const reasonPart = r.reason ? ` (${r.reason})` : '';
      lines.push(`• **${r.employeeName}** — ${formatDate(r.attendanceDate)}: ${r.requestType}${reasonPart}`);
    });
    if (data.oldestRequest) {
      lines.push(`\n*Oldest pending request:* Submitted by **${data.oldestRequest.employeeName}** on ${formatDate(data.oldestRequest.createdAt)}.`);
    }
    return lines.join('\n');
  }

  if (intent === 'MANAGER_PENDING_LEAVE_APPROVALS') {
    const data = liveData.pendingApprovals;
    if (!data || data.leaveCount === 0) {
      return 'You have no pending leave requests to approve.';
    }

    const lines = [`You have **${data.leaveCount} pending leave request${data.leaveCount !== 1 ? 's' : ''}**:\n`];
    data.leaveRequests.forEach((r) => {
      const reasonPart = r.reason ? ` (${r.reason})` : '';
      lines.push(`• **${r.employeeName}** — ${r.leaveType} (${formatDate(r.startDate)} to ${formatDate(r.endDate)}, ${r.days} days)${reasonPart}`);
    });
    return lines.join('\n');
  }

  if (intent === 'MANAGER_PENDING_APPROVALS') {
    const data = liveData.pendingApprovals;
    if (!data || data.totalPending === 0) {
      return 'You have no pending approvals for your team.';
    }

    const lines = [`You have **${data.totalPending} pending approval${data.totalPending !== 1 ? 's' : ''}** (${data.leaveCount} leave, ${data.regularizationCount} regularization):\n`];
    if (data.leaveRequests.length > 0) {
      lines.push(`**Leave Requests:**`);
      data.leaveRequests.forEach((r) => {
        lines.push(`• **${r.employeeName}** — ${r.leaveType} (${formatDate(r.startDate)} to ${formatDate(r.endDate)}, ${r.days} days)`);
      });
    }
    if (data.regularizationRequests.length > 0) {
      lines.push(`\n**Attendance Regularizations:**`);
      data.regularizationRequests.forEach((r) => {
        lines.push(`• **${r.employeeName}** — ${formatDate(r.attendanceDate)} (${r.requestType})`);
      });
    }
    return lines.join('\n');
  }

  // ── 6. ORGANIZATION-LEVEL (HR / Admin) ────────────────────────────────────
  if (intent === 'ORG_EMPLOYEE_COUNT') {
    const total = liveData.totalEmployees?.total || 0;
    return `There are currently **${total} active employees** across the organization.`;
  }

  if (intent === 'ORG_LEAVE') {
    const data = liveData.orgLeave;
    if (!data || data.count === 0) {
      return 'No employees are on approved leave today across the organization.';
    }
    const lines = [`There are **${data.count} employee${data.count !== 1 ? 's' : ''} on leave today** across the company:\n`];
    data.employees.forEach((e) => {
      lines.push(`• **${e.fullName}** (${e.department || 'General'}) — ${e.leaveType} (${formatDate(e.from)} to ${formatDate(e.to)})`);
    });
    return lines.join('\n');
  }

  if (intent === 'ORG_CHECKINS') {
    const count = liveData.orgCheckins?.checkedInCount || 0;
    return `**${count} employees** have checked in today across the organization.`;
  }

  if (intent === 'ORG_ABSENCES') {
    const data = liveData.orgAbsences;
    if (!data || data.count === 0) {
      return 'All active employees have checked in today.';
    }
    const lines = [`**${data.count} employee${data.count !== 1 ? 's' : ''} have not checked in today:**\n`];
    data.employees.slice(0, 15).forEach((e) => {
      lines.push(`• ${e.fullName} (${e.department || 'Staff'})`);
    });
    if (data.count > 15) lines.push(`*...and ${data.count - 15} more employees.*`);
    return lines.join('\n');
  }

  if (intent === 'ORG_PENDING_APPROVALS') {
    const data = liveData.pendingApprovals;
    if (!data || data.totalPending === 0) {
      return 'There are no pending approvals across the organization.';
    }
    return `There are currently **${data.totalPending} pending requests** across the company (${data.leaveCount} leave requests, ${data.regularizationCount} regularization requests).`;
  }

  return 'Your requested HRMS data was retrieved successfully.';
}

/**
 * Standard conversational response.
 */
function formatConversationalAnswer() {
  return 'Hello! I am your HR Assistant. I can help you with your leave balances, attendance records, manager hierarchy, and company HR policies. How can I assist you today?';
}

/**
 * Standard clarification question response.
 */
function formatClarificationAnswer(prompt) {
  return prompt || 'Could you please clarify your question so I can provide the exact information?';
}

/**
 * Standard safe fallback response when inquiry is out of HR scope.
 */
function formatSafeFallbackAnswer() {
  return 'I can assist you with your personalized HRMS records (leave balances, attendance, manager hierarchy, payslips) and official company HR policies. Please ask a specific HR inquiry.';
}

/**
 * Sanitizes LLM output to prevent leaks or unwanted artifacts.
 *
 * Also detects generic business knowledge hallucinations — phrases like
 * "typically", "in most companies", "standard practice" etc. that indicate
 * the LLM supplemented missing policy with general knowledge.
 * These are replaced with a clear "policy not found" message.
 */
function sanitizeLlmAnswer(text = '') {
  let clean = String(text || '').trim();

  // Remove markdown code blocks wrapping full text
  if (clean.startsWith('```') && clean.endsWith('```')) {
    clean = clean.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();
  }

  // Strip echoed prompt section headers
  clean = clean.replace(/^ASSISTANT ANSWER:\s*/i, '');
  clean = clean.replace(/--- (AUTHENTICATED USER|VERIFIED HRMS DATA|APPROVED COMPANY POLICY|RECENT CONVERSATION|ROLE CONTEXT|USER QUESTION) ---/gi, '');

  // Detect generic business knowledge hallucinations
  // These patterns indicate the LLM answered from general knowledge, not the policy
  const GENERIC_KNOWLEDGE_PATTERNS = [
    /\b(typically|in most companies|in general|generally speaking|standard (general |business )?practice|common(ly)? in (most |the )?industry|most (organizations|employers|companies))\b/i,
    /\bstandard\s+general\s+business\s+(hours|practice|rule)\b/i,
    /\bin\s+(many|most)\s+(organizations|workplaces|companies|industries)\b/i,
    /\bwhile\s+policies\s+vary\b/i,
    /\baccording\s+to\s+best\s+practice\b/i,
    /\bit\s+is\s+(common|typical|normal|standard)\s+(for|to|in)\b/i,
  ];

  if (GENERIC_KNOWLEDGE_PATTERNS.some((p) => p.test(clean))) {
    // The LLM supplemented with generic knowledge — return honest "not found"
    return 'The available company policy documents do not contain this specific information. Please contact HR directly for clarification.';
  }

  return clean.trim();
}

/**
 * Suggested follow-up questions based on domain.
 */
function getSuggestedQuestions(intent = '') {
  switch (intent) {
    case 'EMPLOYEE_LEAVE_BALANCE':
    case 'EMPLOYEE_LEAVE_HISTORY':
      return [
        'What is the company leave policy?',
        'Can I take 20 days of unpaid leave?',
        'Do I have any pending leave requests?',
      ];
    case 'EMPLOYEE_REPORTING_MANAGER':
      return [
        'What is his email?',
        'What is my designation?',
        'What department am I in?',
      ];
    case 'ATTENDANCE_TODAY':
    case 'ATTENDANCE_YESTERDAY':
    case 'ATTENDANCE_INCOMPLETE_PUNCH':
      return [
        'What is the regularization policy?',
        'Can I regularize my missing punch?',
        'What are the working hours?',
      ];
    case 'POLICY_BONUS':
    case 'HYBRID_BONUS_ELIGIBILITY':
      return [
        'When is the annual bonus paid?',
        'Am I eligible for the annual bonus?',
        'What is the probation period?',
      ];
    case 'POLICY_LEAVE':
      return [
        'How many days of leave do I have?',
        'What is the probation period?',
        'Can I take leave during probation?',
      ];
    case 'MANAGER_TEAM_MEMBERS':
    case 'MANAGER_TEAM_CHECKINS':
      return [
        'Who is on leave today?',
        'Do I have pending leave approvals?',
        'Show pending regularizations',
      ];
    default:
      return [
        'How many days of leave do I have?',
        'Who is my manager?',
        'What is the leave policy?',
      ];
  }
}

module.exports = {
  formatDeterministicAnswer,
  formatConversationalAnswer,
  formatClarificationAnswer,
  formatSafeFallbackAnswer,
  sanitizeLlmAnswer,
  getSuggestedQuestions,
  formatDate,
};
