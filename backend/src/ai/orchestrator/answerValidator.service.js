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
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
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

  // 1. Reporting Manager
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

  // 2. Employee Profile
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

  // 3. Employee Count
  if (intent === 'EMPLOYEE_COUNT') {
    const total = liveData.employeeCount?.total || 0;
    return `Your organization currently has **${total} active employee${total !== 1 ? 's' : ''}**.`;
  }

  // 4. Real-time Check-ins
  if (intent === 'CURRENT_CHECKINS') {
    const count = liveData.checkinCount?.checkedInCount || 0;
    const date = liveData.checkinCount?.date ? formatDate(liveData.checkinCount.date) : 'today';
    return `As of ${date}, **${count} employee${count !== 1 ? 's have' : ' has'} checked in**.`;
  }

  // 5. Employees on Leave Today
  if (intent === 'EMPLOYEES_ON_LEAVE') {
    const data = liveData.onLeaveToday;
    const scope = liveData.scope;
    if (!data) return 'Leave information could not be retrieved right now.';

    if (scope === 'self') {
      const isSelfOnLeave = (data.employees || []).some(e => e.employee_id === context.employeeId);
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

  // 6. Current Absences
  if (intent === 'CURRENT_ABSENCES') {
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

  // 7. Leave Balances
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

  // 8. Leave History
  if (intent === 'EMPLOYEE_LEAVE_HISTORY') {
    const h = liveData.leaveHistory;
    if (!h || !h.records?.length) {
      return 'I couldn\'t find any leave records for your account for the requested period.';
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
        lines.push(`  • ${range} — **${r.leaveType}** (${r.days} day${r.days !== 1 ? 's' : ''}) — Awaiting manager review`);
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

  // 9. Today's Attendance
  if (intent === 'ATTENDANCE_TODAY') {
    const r = liveData.todayAttendance;
    if (!r) return 'Your attendance record for today could not be retrieved.';
    const lines = [`**Your Attendance for Today (${formatDate(r.date)}):**\n`];
    lines.push(`• Status: **${r.status}**`);
    lines.push(`• Check-in: ${r.checkIn ? r.checkIn : '❌ Not recorded'}`);
    lines.push(`• Check-out: ${r.checkOut ? r.checkOut : r.checkIn ? '❌ Not recorded yet' : '❌ Not recorded'}`);
    if (r.workHours && r.workHours !== '0.0') lines.push(`• Work Duration: ${r.workHours} hrs`);
    if (r.isRegularized) lines.push(`• ✅ Regularized record`);
    return lines.join('\n').trim();
  }

  // 10. Attendance Monthly Summary
  if (intent === 'ATTENDANCE_MONTH' || intent === 'TEAM_ATTENDANCE') {
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
  return 'Hello! I am your HRMS AI Assistant. I can help you check your leave balances, leave history, today\'s attendance, reporting hierarchy, and company HR policies. How can I assist you today?';
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
    case 'EMPLOYEE_REPORTING_MANAGER':
    case 'EMPLOYEE_PROFILE':
      return ['What is my leave balance?', 'Show my attendance for this month.', 'What is the leave policy?'];
    case 'EMPLOYEE_LEAVE_HISTORY':
    case 'EMPLOYEE_LEAVE_BALANCE':
    case 'EMPLOYEE_LEAVE_APPLICATION':
      return ['Which days was I on leave?', 'Can I apply for leave after being absent?', 'What is the leave policy?'];
    case 'ATTENDANCE_TODAY':
    case 'ATTENDANCE_MONTH':
    case 'EMPLOYEE_PUNCH':
      return ['I forgot to punch out. What can I do?', 'How many regularizations are allowed?', 'What is the attendance policy?'];
    case 'EMPLOYEE_COUNT':
    case 'CURRENT_CHECKINS':
    case 'EMPLOYEES_ON_LEAVE':
    case 'CURRENT_ABSENCES':
      return ['How many employees checked in today?', 'Show employees currently on leave.', 'Total employees.'];
    case 'POLICY_LEAVE':
    case 'POLICY_SECURITY':
    case 'POLICY_WORKING_HOURS':
    case 'POLICY_CONDUCT':
    case 'POLICY_GENERAL':
    default:
      return ['What is the leave policy?', 'What are the password requirements?', 'How many leaves do I have?'];
  }
}

module.exports = {
  formatDeterministicAnswer,
  formatConversationalAnswer,
  sanitizeLlmAnswer,
  getSuggestedQuestions,
  formatDate,
};
