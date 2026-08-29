/**
 * intentClassifier.service.js
 * Deterministic, role-aware keyword and regex-based intent & entity classifier.
 * Classifies user HRMS messages without LLM overhead.
 */

'use strict';

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];
const MONTH_ABBR = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Parses natural language date phrases into concrete YYYY-MM-DD date ranges.
 * @param {string} text
 * @param {Date} [refDate]
 * @returns {{ startDate: string, endDate: string, label: string, explicit: true } | null}
 */
function parseDateRange(text = '', refDate = new Date()) {
  const lower = text.toLowerCase();
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const date = refDate.getDate();

  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const tag = (obj) => ({ ...obj, explicit: true });

  if (/\btoday\b/.test(lower)) {
    const d = fmt(refDate);
    return tag({ startDate: d, endDate: d, label: `Today (${d})` });
  }
  if (/\byesterday\b/.test(lower)) {
    const yest = new Date(refDate);
    yest.setDate(date - 1);
    const d = fmt(yest);
    return tag({ startDate: d, endDate: d, label: `Yesterday (${d})` });
  }
  if (/\btomorrow\b/.test(lower)) {
    const tom = new Date(refDate);
    tom.setDate(date + 1);
    const d = fmt(tom);
    return tag({ startDate: d, endDate: d, label: `Tomorrow (${d})` });
  }
  if (/\bthis\s+week\b/.test(lower)) {
    const cd = refDate.getDay();
    const s = new Date(refDate);
    s.setDate(date - (cd === 0 ? 6 : cd - 1));
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    return tag({ startDate: fmt(s), endDate: fmt(e), label: 'This Week' });
  }
  if (/\blast\s+week\b/.test(lower)) {
    const cd = refDate.getDay();
    const s = new Date(refDate);
    s.setDate(date - (cd === 0 ? 6 : cd - 1) - 7);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    return tag({ startDate: fmt(s), endDate: fmt(e), label: 'Last Week' });
  }

  for (let i = 0; i < WEEKDAY_NAMES.length; i++) {
    const wd = WEEKDAY_NAMES[i];
    if (new RegExp(`\\bnext\\s+${wd}\\b`, 'i').test(lower)) {
      const cd = refDate.getDay();
      let daysTo = (i - cd + 7) % 7;
      if (daysTo === 0) daysTo = 7;
      const t = new Date(refDate);
      t.setDate(date + daysTo);
      const d = fmt(t);
      return tag({ startDate: d, endDate: d, label: `Next ${wd}` });
    }
    if (new RegExp(`\\blast\\s+${wd}\\b`, 'i').test(lower)) {
      const cd = refDate.getDay();
      let daysSub = (cd - i + 7) % 7;
      if (daysSub === 0) daysSub = 7;
      const t = new Date(refDate);
      t.setDate(date - daysSub);
      const d = fmt(t);
      return tag({ startDate: d, endDate: d, label: `Last ${wd}` });
    }
  }

  if (/\bthis\s+month\b/.test(lower)) {
    const s = new Date(year, month, 1);
    const e = new Date(year, month + 1, 0);
    return tag({ startDate: fmt(s), endDate: fmt(e), label: `${MONTH_NAMES[month]} ${year}` });
  }
  if (/\blast\s+month\b/.test(lower)) {
    const s = new Date(year, month - 1, 1);
    const e = new Date(year, month, 0);
    const pm = (month - 1 + 12) % 12;
    const py = month === 0 ? year - 1 : year;
    return tag({ startDate: fmt(s), endDate: fmt(e), label: `${MONTH_NAMES[pm]} ${py}` });
  }

  return null;
}

/**
 * Classifies user input into structured intent payload.
 * @param {string} question - Current message
 * @param {Array<object>} [history] - Conversation history
 * @param {object} [userContext] - Authenticated user context { role, employeeId, organizationId }
 * @returns {object}
 */
function classifyIntent(question = '', history = [], userContext = {}) {
  const cleanQ = (question || '').trim();
  const lower = cleanQ.toLowerCase();
  const role = (userContext.role || 'employee').toLowerCase();
  const isManager = role === 'manager';
  const isAdmin = ['hr', 'hr_admin', 'client_admin', 'super_admin'].includes(role);
  const isManagerOrAdmin = isManager || isAdmin;

  let effectiveQ = lower;
  let isFollowUp = false;
  if (history && history.length > 0) {
    const lastUser = [...history].reverse().find((m) => m.sender === 'user' || m.role === 'user');
    if (lastUser) {
      const lastQ = (lastUser.text || lastUser.content || '').toLowerCase();
      if (
        /^(what|how)\s+about\s+/i.test(lower) ||
        /^\b(and|or)\s+/i.test(lower) ||
        /\b(them|those|it|these|that|next\s+month)\b/i.test(lower) ||
        (/\b(my\s+team|team\s+members?)\b/i.test(lastQ) && /\b(absent|on\s+leave|present|checked\s*in|check\s*in|attendance)\b/i.test(lower)) ||
        (/\b(pending\s+regularizations?|regularization\s+approvals?)\b/i.test(lastQ) && /\b(oldest|who\s+submitted|first)\b/i.test(lower))
      ) {
        isFollowUp = true;
        effectiveQ = `${lastQ} ${lower}`;
      }
    }
  }

  const hasPersonalRef = /\b(i|my|me|mine|we|our|am i|can i|do i|did i|have i|was i|show me|tell me my|i need|i want|give me|got)\b/i.test(
    effectiveQ
  );

  let leaveTypeFilter = null;
  if (/\bcasual\b/i.test(effectiveQ) || /\bcl\b/.test(effectiveQ)) leaveTypeFilter = 'Casual Leave';
  else if (/\bsick\b/i.test(effectiveQ) || /\bsl\b/.test(effectiveQ)) leaveTypeFilter = 'Sick Leave';
  else if (/\b(earned|annual|el)\b/i.test(effectiveQ)) leaveTypeFilter = 'Earned Leave';
  else if (/\b(optional|floating)\b/i.test(effectiveQ)) leaveTypeFilter = 'Optional Holiday';
  else if (/\b(unpaid|lop)\b/i.test(effectiveQ)) leaveTypeFilter = 'Loss of Pay';

  const dateRange = parseDateRange(cleanQ);

  // ═════════════════════════════════════════════════════════════════════
  // 1. HYBRID INTENTS (DB + Policy RAG)
  // ═════════════════════════════════════════════════════════════════════

  // 1a. Remote work security rules for team / employee
  if (
    /\b(remote\s+work|wfh|work\s+from\s+home|working\s+remotely|work\s+remotely|remotely)\b/i.test(effectiveQ) &&
    /\b(security|policy|vpn|device|require|rules?)\b/i.test(effectiveQ)
  ) {
    return {
      intent: 'HYBRID_REMOTE_WORK_SECURITY',
      requiresEmployeeData: false,
      requiresPolicyData: true,
      requiresRag: true,
      requiresLiveData: false,
      policyCategory: 'IT & Data Security',
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  // 1b. Missing punch resolution / regularization guidance
  if (
    /\b(what\s+should\s+i\s+do\s+about\s+my\s+missing\s+punch|forgot\s+to\s+punch\s+out.*what\s+can\s+i\s+do|i\s+missed\s+my\s+punch.*can\s+i\s+regularize|can\s+i\s+regularize\s+my\s+missing\s+punch|regularize\s+my\s+punch)\b/i.test(
      effectiveQ
    ) ||
    (/\b(missed|forgot)\b/i.test(effectiveQ) && /\b(punch|punched)\b/i.test(effectiveQ) && /\b(what\s+can|how\s+can|can\s+i|what\s+should|regulariz|regularis)/i.test(effectiveQ))
  ) {
    return {
      intent: 'HYBRID_ATTENDANCE_REGULARIZATION',
      requiresEmployeeData: true,
      requiresPolicyData: true,
      requiresRag: true,
      requiresLiveData: true,
      policyCategory: 'Attendance & Working Hours',
      confidence: 0.98,
      dateRange,
      isFollowUp,
    };
  }

  // 1c. Bonus Eligibility (Self check)
  if (
    /\b(am\s+i\s+eligible\s+(?:for\s+)?(?:the\s+)?bonus|my\s+bonus\s+eligibility|am\s+i\s+getting\s+(?:a\s+)?bonus|check\s+my\s+bonus)\b/i.test(effectiveQ)
  ) {
    return {
      intent: 'HYBRID_BONUS_ELIGIBILITY',
      requiresEmployeeData: true,
      requiresPolicyData: true,
      requiresRag: true,
      requiresLiveData: true,
      policyCategory: 'Benefits & Compensation',
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  // 1d. Leave Application (e.g. "Can I take leave next Friday?") - Exclude general policy "after being absent"
  if (
    !/\bafter\s+(?:being\s+)?absent\b/i.test(effectiveQ) &&
    (
      /\bcan\s+i\s+(?:take|apply\s+for|get|have)\s+(?:\d+\s+days?\s+)?leave\b/i.test(effectiveQ) ||
      /\bcan\s+i\s+take\s+(?:leave|time\s+off|off)\b/i.test(effectiveQ) ||
      /\bi\s+want\s+to\s+take\s+leave\b/i.test(effectiveQ)
    )
  ) {
    return {
      intent: 'HYBRID_LEAVE_APPLICATION',
      requiresEmployeeData: true,
      requiresPolicyData: true,
      requiresRag: true,
      requiresLiveData: true,
      policyCategory: 'Attendance & Working Hours',
      confidence: 0.97,
      dateRange,
      leaveTypeFilter,
      isFollowUp,
    };
  }

  // 1e. Overtime eligibility & rules
  if (/\b(overtime|ot\s+pay|ot\s+hours)\b/i.test(effectiveQ) && hasPersonalRef) {
    return {
      intent: 'HYBRID_OVERTIME',
      requiresEmployeeData: true,
      requiresPolicyData: true,
      requiresRag: true,
      requiresLiveData: true,
      policyCategory: 'Attendance & Working Hours',
      confidence: 0.96,
      dateRange: null,
      isFollowUp,
    };
  }

  // ═════════════════════════════════════════════════════════════════════
  // 2. MANAGER TEAM & APPROVAL INTENTS (Role-Aware)
  // ═════════════════════════════════════════════════════════════════════

  // 2a. Manager: Team Member List (only if NOT asking subtopics like attendance/leave/approvals)
  const hasTeamSubtopic = /\b(attendance|punch|punches|leave|leaves|absent|absence|approval|approvals|request|requests|check[\s-]*in|checked[\s-]*in|checkin|late|tardy|overtime)\b/i.test(effectiveQ);

  if (
    isManagerOrAdmin &&
    !hasTeamSubtopic &&
    (
      /\b(list\s+my\s+team\s+members?|show\s+my\s+team|my\s+team\s+members?|who\s+reports?\s+to\s+me|who\s+are\s+my\s+(?:direct\s+)?reports?|employees?\s+reporting\s+to\s+me|show\s+my\s+employees?|list\s+employees?\s+under\s+me|my\s+direct\s+reports?|team\s+members?|my\s+reportees?|how\s+many\s+people\s+(?:are\s+in|report)\s+(?:to\s+)?(?:my\s+)?team|size\s+of\s+my\s+team|team\s+size)\b/i.test(effectiveQ) ||
      /\bmy\s+team\b/i.test(effectiveQ)
    )
  ) {
    return {
      intent: 'MANAGER_TEAM_MEMBERS',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.99,
      dateRange: null,
      isFollowUp,
    };
  }

  // 2b. Manager: Team Attendance
  if (
    isManagerOrAdmin &&
    /\b(show\s+my\s+team\s+attendance|my\s+team\s+attendance|team\s+attendance|team\s+check.?ins?)\b/i.test(effectiveQ)
  ) {
    return {
      intent: 'MANAGER_TEAM_ATTENDANCE',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange,
      isFollowUp,
    };
  }

  // 2c. Manager: Team Leave Summary / Who took most leave
  if (
    isManagerOrAdmin &&
    /\b(which\s+team\s+member\s+has\s+taken\s+the\s+most\s+leave|who\s+took\s+the\s+most\s+leave|team\s+leave\s+history|most\s+leave\s+in\s+my\s+team)\b/i.test(effectiveQ)
  ) {
    return {
      intent: 'MANAGER_TEAM_LEAVE_HISTORY',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange,
      isFollowUp,
    };
  }

  // 2d. Manager: Team Leave (Who is on leave in my team today)
  if (
    isManager &&
    /\b(who\s+is\s+on\s+leave|how\s+many\s+people\s+in\s+my\s+team\s+are\s+on\s+leave|team\s+members?\s+on\s+leave|who\s+in\s+my\s+team\s+is\s+on\s+leave)\b/i.test(effectiveQ)
  ) {
    return {
      intent: 'MANAGER_TEAM_LEAVE',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  // 2e. Manager / Admin: Who has not checked in today / Who is absent
  if (
    /\b(who\s+has\s+not\s+checked\s+in|who\s+is\s+not\s+checked\s+in|who\s+is\s+absent\s+today|who\s+is\s+absent)\b/i.test(effectiveQ)
  ) {
    if (isManager) {
      return {
        intent: 'MANAGER_TEAM_CHECKINS',
        requiresEmployeeData: true,
        requiresPolicyData: false,
        requiresRag: false,
        requiresLiveData: true,
        confidence: 0.98,
        dateRange: null,
        isFollowUp,
      };
    }
    if (isAdmin) {
      return {
        intent: 'ORG_CHECKINS',
        requiresEmployeeData: false,
        requiresPolicyData: false,
        requiresRag: false,
        requiresLiveData: true,
        confidence: 0.98,
        dateRange: null,
        isFollowUp,
      };
    }
    // For regular employee: will be caught by role scope validation and safely blocked
    return {
      intent: 'ORG_CHECKINS',
      requiresEmployeeData: false,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  // 2f. Manager: Team Late Arrivals
  if (
    isManagerOrAdmin &&
    /\b(who\s+came\s+late|who\s+was\s+late|team\s+late\s+arrivals?|who\s+is\s+late\s+today)\b/i.test(effectiveQ)
  ) {
    return {
      intent: 'MANAGER_TEAM_LATE',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  // 2g. Manager: Team Incomplete Punches
  if (
    isManagerOrAdmin &&
    /\b(team\s+incomplete\s+punches?|anyone\s+in\s+(?:my\s+)?team.*incomplete\s+punch(?:es)?|incomplete\s+punch(?:es)?\s+in\s+(?:my\s+)?team|employees?\s+with\s+missing\s+punches?)\b/i.test(effectiveQ)
  ) {
    return {
      intent: 'MANAGER_TEAM_INCOMPLETE_PUNCHES',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  // 2h. Manager: Pending Approvals & Regularization Approvals
  if (
    isManagerOrAdmin &&
    (/\b(who\s+submitted\s+the\s+oldest\s+(?:request|one)|what\s+is\s+the\s+oldest\s+pending\s+regularization|oldest\s+pending\s+regularization)\b/i.test(effectiveQ) ||
     /\b(pending\s+regularization\s+approvals?|show\s+pending\s+regularizations?|pending\s+regularizations\s+for\s+my\s+team)\b/i.test(effectiveQ))
  ) {
    return {
      intent: 'MANAGER_REGULARIZATION_PENDING',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.99,
      dateRange: null,
      isFollowUp,
    };
  }

  if (
    isManagerOrAdmin &&
    /\b(pending\s+leave\s+approvals?|pending\s+team\s+leave\s+requests?)\b/i.test(effectiveQ)
  ) {
    return {
      intent: 'MANAGER_PENDING_LEAVE_APPROVALS',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  if (
    /\b(pending\s+approvals?|approvals?\s+pending|do\s+i\s+have\s+any\s+pending\s+approvals|requests?\s+awaiting\s+(?:my\s+)?approval)\b/i.test(effectiveQ)
  ) {
    if (isManager) {
      return {
        intent: 'MANAGER_PENDING_APPROVALS',
        requiresEmployeeData: true,
        requiresPolicyData: false,
        requiresRag: false,
        requiresLiveData: true,
        confidence: 0.98,
        dateRange: null,
        isFollowUp,
      };
    }
    if (isAdmin) {
      return {
        intent: 'ORG_PENDING_APPROVALS',
        requiresEmployeeData: false,
        requiresPolicyData: false,
        requiresRag: false,
        requiresLiveData: true,
        confidence: 0.98,
        dateRange: null,
        isFollowUp,
      };
    }
    return {
      intent: 'MANAGER_PENDING_APPROVALS',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  // ═════════════════════════════════════════════════════════════════════
  // 3. ORGANIZATION LEVEL INTENTS (HR / Admin)
  // ═════════════════════════════════════════════════════════════════════

  if (
    /\b(total\s+employees?|how\s+many\s+employees?|total\s+staff\s+count|headcount|employee\s+count|number\s+of\s+employees?)\b/i.test(effectiveQ) &&
    !/\bteam\b/i.test(effectiveQ) &&
    !/\b(present|checked[\s-]*in|on\s+leave|absent)\b/i.test(effectiveQ)
  ) {
    return {
      intent: 'ORG_EMPLOYEE_COUNT',
      requiresEmployeeData: false,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.99,
      dateRange: null,
      isFollowUp,
    };
  }

  if (
    /\b(how\s+many\s+employees?\s+checked\s+in|how\s+many\s+employees\s+are\s+present\s+today|current\s+check.?in\s+count|employees?\s+checked\s+in\s+today|who\s+is\s+currently\s+checked\s+in)\b/i.test(effectiveQ)
  ) {
    return {
      intent: isManager ? 'MANAGER_TEAM_CHECKINS' : 'ORG_CHECKINS',
      requiresEmployeeData: isManager,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  if (
    /\b(show\s+employees?\s+currently\s+on\s+leave|employees?\s+on\s+leave\s+today|who\s+is\s+on\s+leave\s+today)\b/i.test(effectiveQ)
  ) {
    if (isManager) {
      return {
        intent: 'MANAGER_TEAM_LEAVE',
        requiresEmployeeData: true,
        requiresPolicyData: false,
        requiresRag: false,
        requiresLiveData: true,
        confidence: 0.97,
        dateRange: null,
        isFollowUp,
      };
    }
    return {
      intent: 'ORG_LEAVE',
      requiresEmployeeData: false,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.97,
      dateRange: null,
      isFollowUp,
    };
  }

  if (
    /\b(current\s+absences\s+across\s+company|current\s+absences|who\s+is\s+absent\s+across\s+company)\b/i.test(effectiveQ)
  ) {
    return {
      intent: 'ORG_ABSENCES',
      requiresEmployeeData: false,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.97,
      dateRange: null,
      isFollowUp,
    };
  }

  if (
    /\b(show\s+all\s+pending\s+leave\s+and\s+regularization\s+requests|all\s+pending\s+requests\s+across\s+org)\b/i.test(effectiveQ)
  ) {
    return {
      intent: 'ORG_PENDING_APPROVALS',
      requiresEmployeeData: false,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  // ═════════════════════════════════════════════════════════════════════
  // 4. EMPLOYEE SELF DATA & ATTENDANCE INTENTS
  // ═════════════════════════════════════════════════════════════════════

  // 4a. Incomplete Punches
  if (
    !/\b(team|anyone|employees?)\b/i.test(effectiveQ) &&
    /\b(do\s+i\s+have\s+any\s+incomplete\s+punches|my\s+incomplete\s+punches|incomplete\s+punches|missing\s+check.?out|did\s+i\s+miss\s+(?:a\s+)?punch)\b/i.test(
      effectiveQ
    )
  ) {
    return {
      intent: 'ATTENDANCE_INCOMPLETE_PUNCH',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.99,
      dateRange: null,
      isFollowUp,
    };
  }

  // 4b. Pending Regularization Requests
  if (
    /\b(do\s+i\s+have\s+any\s+pending\s+regularization\s+requests|my\s+pending\s+regularization\s+requests|are\s+there\s+any\s+pending\s+regularizations\s+for\s+me|status\s+of\s+my\s+regularization\s+request|pending\s+regularization\s+requests)\b/i.test(
      effectiveQ
    )
  ) {
    return {
      intent: 'EMPLOYEE_REGULARIZATION_PENDING',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.99,
      dateRange: null,
      isFollowUp,
    };
  }

  // 4c. Regularization History
  if (
    /\b(my\s+regularization\s+history|show\s+my\s+regularization\s+requests|regularization\s+history)\b/i.test(effectiveQ)
  ) {
    return {
      intent: 'EMPLOYEE_REGULARIZATION_HISTORY',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange,
      isFollowUp,
    };
  }

  // 4d. Reporting Manager & Hierarchy
  if (
    /\b(who\s+is\s+my\s+reporting\s+manager|who\s+do\s+i\s+report\s+to|my\s+reporting\s+manager|my\s+manager|my\s+supervisor|my\s+boss)\b/i.test(
      effectiveQ
    )
  ) {
    return {
      intent: 'EMPLOYEE_REPORTING_MANAGER',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.99,
      dateRange: null,
      isFollowUp,
    };
  }

  // 4e. Shift
  if (/\b(my\s+(?:current\s+)?shift|shift\s+timing|what\s+is\s+my\s+shift|shift\s+schedule|when\s+does\s+my\s+shift)\b/i.test(effectiveQ)) {
    return {
      intent: 'EMPLOYEE_SHIFT',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  // 4f. Department
  if (/\b(my\s+department|which\s+department\s+am\s+i\s+in|what\s+is\s+my\s+department)\b/i.test(effectiveQ)) {
    return {
      intent: 'EMPLOYEE_DEPARTMENT',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  // 4g. Designation
  if (/\b(my\s+designation|what\s+is\s+my\s+designation|what\s+is\s+my\s+job\s+title|my\s+role|my\s+title)\b/i.test(effectiveQ)) {
    return {
      intent: 'EMPLOYEE_DESIGNATION',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  // 4h. Joining Date
  if (/\b(my\s+joining\s+date|my\s+date\s+of\s+joining|when\s+did\s+i\s+join|date\s+i\s+joined|joining\s+date)\b/i.test(effectiveQ)) {
    return {
      intent: 'EMPLOYEE_JOINING_DATE',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  // 4i. Salary (Self)
  if (/\b(my\s+salary|my\s+pay|my\s+ctc|my\s+compensation|my\s+earnings?|my\s+payslip|what\s+is\s+my\s+salary)\b/i.test(effectiveQ)) {
    return {
      intent: 'EMPLOYEE_SALARY',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  // 4j. Profile
  if (/\b(my\s+employee\s+(?:id|code)|my\s+profile)\b/i.test(effectiveQ)) {
    return {
      intent: 'EMPLOYEE_PROFILE',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  // 4k. Check-in / Check-out Specific Times
  if (/\b(what\s+time\s+did\s+i\s+check\s+in|what\s+time\s+did\s+i\s+punch\s+in|my\s+check[\s-]*in\s+time)\b/i.test(effectiveQ)) {
    return {
      intent: 'ATTENDANCE_CHECK_IN',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange: dateRange || { startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), label: 'Today', explicit: true },
      isFollowUp,
    };
  }

  if (/\b(what\s+time\s+did\s+i\s+check\s+out|what\s+time\s+did\s+i\s+punch\s+out|my\s+check[\s-]*out\s+time)\b/i.test(effectiveQ)) {
    return {
      intent: 'ATTENDANCE_CHECK_OUT',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange: dateRange || { startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), label: 'Today', explicit: true },
      isFollowUp,
    };
  }

  // 4l. Leave History
  if (
    /\b(which\s+days?\s+(?:was|were)\s+i\s+(?:on\s+)?leave|what\s+days?\s+(?:was|were)\s+i\s+(?:on\s+)?leave|when\s+was\s+my\s+last\s+leave|my\s+leave\s+history|show\s+my\s+leave\s+history|leaves?\s+i\s+took)\b/i.test(
      effectiveQ
    )
  ) {
    return {
      intent: 'EMPLOYEE_LEAVE_HISTORY',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.99,
      dateRange,
      leaveTypeFilter,
      isFollowUp,
    };
  }

  // 4m. Pending Leave Requests
  if (/\b(do\s+i\s+have\s+any\s+pending\s+leave\s+requests|my\s+pending\s+leave\s+requests|pending\s+leave\s+status)\b/i.test(effectiveQ)) {
    return {
      intent: 'EMPLOYEE_LEAVE_PENDING',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  // 4n. Leave Balance
  if (
    /\b(my\s+leave\s+balance|how\s+many\s+leaves\s+do\s+i\s+have|what\s+is\s+my\s+casual\s+leave\s+balance|my\s+remaining\s+leaves|leave\s+quota)\b/i.test(
      effectiveQ
    )
  ) {
    return {
      intent: 'EMPLOYEE_LEAVE_BALANCE',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange,
      leaveTypeFilter,
      isFollowUp,
    };
  }

  // 4o. Yesterday Attendance Punch
  if (
    /\b(my\s+attendance\s+yesterday|attendance\s+yesterday|did\s+i\s+punch\s+in\s+yesterday|what\s+time\s+did\s+i\s+punch\s+out\s+yesterday)\b/i.test(
      effectiveQ
    ) ||
    (/\byesterday\b/i.test(effectiveQ) && /\b(attendance|punch|check.?in)\b/i.test(effectiveQ) && hasPersonalRef)
  ) {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yestStr = yest.toISOString().slice(0, 10);
    return {
      intent: 'ATTENDANCE_YESTERDAY',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange: { startDate: yestStr, endDate: yestStr, label: 'Yesterday', explicit: true },
      isFollowUp,
    };
  }

  // 4p. Today Attendance Punch
  if (
    /\b(my\s+attendance\s+today|did\s+i\s+punch\s+in\s+today|what\s+time\s+did\s+i\s+check\s+in\s+today|am\s+i\s+checked\s+in\s+today|attendance\s+today)\b/i.test(
      effectiveQ
    ) ||
    (/\b(punch|check.?in|attendance)\b/i.test(effectiveQ) &&
      /\btoday\b/i.test(effectiveQ) &&
      hasPersonalRef &&
      !/\bmissed?\b/i.test(effectiveQ))
  ) {
    const todayStr = new Date().toISOString().slice(0, 10);
    return {
      intent: 'ATTENDANCE_TODAY',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange: dateRange || { startDate: todayStr, endDate: todayStr, label: 'Today', explicit: true },
      isFollowUp,
    };
  }

  // 4q. Attendance Month Summary
  if (
    /\b(my\s+attendance\s+for\s+this\s+month|show\s+my\s+attendance\s+summary|my\s+attendance\s+percentage|my\s+attendance\s+summary)\b/i.test(
      effectiveQ
    ) ||
    (/\bmy\s+attendance\b/i.test(effectiveQ) && !/\b(today|yesterday)\b/i.test(effectiveQ))
  ) {
    return {
      intent: 'ATTENDANCE_MONTH',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange,
      isFollowUp,
    };
  }

  // ═════════════════════════════════════════════════════════════════════
  // 5. POLICY INTENTS (RAG Only)
  // ═════════════════════════════════════════════════════════════════════

  // 5a. Regularization Policy
  if (
    /\b(how\s+many\s+regularizations?\s+(?:can\s+i\s+make|are\s+allowed)|what\s+is\s+the\s+deadline\s+for\s+regularization|regularization\s+(?:limit|window|deadline|policy|rules?))\b/i.test(
      effectiveQ
    )
  ) {
    return {
      intent: 'POLICY_REGULARIZATION',
      requiresEmployeeData: false,
      requiresPolicyData: true,
      requiresRag: true,
      requiresLiveData: false,
      policyCategory: 'Attendance & Working Hours',
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  // 5b. Attendance Policy & Grace Period
  if (
    /\b(what\s+is\s+the\s+attendance\s+grace\s+period|attendance\s+grace\s+period|grace\s+time\s+policy|attendance\s+policy)\b/i.test(
      effectiveQ
    ) && !hasPersonalRef
  ) {
    return {
      intent: 'POLICY_ATTENDANCE',
      requiresEmployeeData: false,
      requiresPolicyData: true,
      requiresRag: true,
      requiresLiveData: false,
      policyCategory: 'Attendance & Working Hours',
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  // 5c. Leave Policy
  if (
    /\b(can\s+i\s+apply\s+for\s+leave\s+after\s+being\s+absent|apply\s+for\s+leave\s+after\s+being\s+absent|leave\s+after\s+absence)\b/i.test(effectiveQ) ||
    (/\b(what\s+is\s+the\s+leave\s+policy|leave\s+rules?|leave\s+policy)\b/i.test(effectiveQ) && !hasPersonalRef)
  ) {
    return {
      intent: 'POLICY_LEAVE',
      requiresEmployeeData: false,
      requiresPolicyData: true,
      requiresRag: true,
      requiresLiveData: false,
      policyCategory: 'Attendance & Working Hours',
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  // 5d. Bonus Policy
  if (
    /\b(what\s+is\s+the\s+bonus\s+policy|what\s+happens\s+to\s+bonus\s+eligibility\s+after\s+resignation|how\s+does\s+my\s+rating\s+affect\s+bonus|bonus\s+policy|bonus\s+rules?)\b/i.test(
      effectiveQ
    )
  ) {
    return {
      intent: 'POLICY_BONUS',
      requiresEmployeeData: false,
      requiresPolicyData: true,
      requiresRag: true,
      requiresLiveData: false,
      policyCategory: 'Benefits & Compensation',
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  // 5e. Security Policy
  if (
    /\b(what\s+are\s+the\s+password\s+requirements|do\s+i\s+need\s+vpn|vpn\s+security\s+rules?|security\s+policy|device\s+security|encryption\s+requirements?)\b/i.test(
      effectiveQ
    )
  ) {
    return {
      intent: 'POLICY_SECURITY',
      requiresEmployeeData: false,
      requiresPolicyData: true,
      requiresRag: true,
      requiresLiveData: false,
      policyCategory: 'IT & Data Security',
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  // 5f. Code of Conduct & Ethics Policy
  if (
    /\b(can\s+i\s+accept\s+gifts\s+from\s+clients|gift\s+policy|dress\s*code\s+policy|code\s+of\s+conduct|workplace\s+ethics\s+policy|harassment\s+policy|anti-bribery)\b/i.test(
      effectiveQ
    )
  ) {
    return {
      intent: 'POLICY_CONDUCT',
      requiresEmployeeData: false,
      requiresPolicyData: true,
      requiresRag: true,
      requiresLiveData: false,
      policyCategory: 'Leave & Employee Conduct',
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  // 5g. Working Hours Policy
  if (
    /\b(what\s+are\s+the\s+working\s+hours|office\s+timings?|minimum\s+working\s+hours|lunch\s+break\s+duration)\b/i.test(
      effectiveQ
    ) && !hasPersonalRef
  ) {
    return {
      intent: 'POLICY_WORKING_HOURS',
      requiresEmployeeData: false,
      requiresPolicyData: true,
      requiresRag: true,
      requiresLiveData: false,
      policyCategory: 'Attendance & Working Hours',
      confidence: 0.97,
      dateRange: null,
      isFollowUp,
    };
  }

  // 5h. General Policy
  if (
    /\b(what\s+policies\s+are\s+active|published\s+policies|company\s+policies|hr\s+policies)\b/i.test(effectiveQ)
  ) {
    return {
      intent: 'POLICY_GENERAL',
      requiresEmployeeData: false,
      requiresPolicyData: true,
      requiresRag: true,
      requiresLiveData: false,
      confidence: 0.95,
      dateRange: null,
      isFollowUp,
    };
  }

  // ═════════════════════════════════════════════════════════════════════
  // 6. GENERAL CHAT / CONVERSATIONAL
  // ═════════════════════════════════════════════════════════════════════

  if (/^(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening|help)\b/i.test(effectiveQ)) {
    return {
      intent: 'GENERAL_CHAT',
      requiresEmployeeData: false,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: false,
      confidence: 0.99,
      dateRange: null,
      isFollowUp,
    };
  }

  return {
    intent: 'UNKNOWN',
    requiresEmployeeData: false,
    requiresPolicyData: true,
    requiresRag: true,
    requiresLiveData: false,
    confidence: 0.5,
    dateRange: null,
    isFollowUp,
  };
}

module.exports = {
  classifyIntent,
  parseDateRange,
};
