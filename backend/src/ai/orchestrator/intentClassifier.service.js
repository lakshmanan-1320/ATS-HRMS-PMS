/**
 * intentClassifier.service.js
 * Deterministic, keyword and regex-based intent & entity classifier.
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
 * Returns null when no explicit date was mentioned in the user query.
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
    if (
      new RegExp(`\\b(?:on\\s+|take\\s+|for\\s+)?${wd}\\b`, 'i').test(lower) &&
      /\b(take|leave|off|absent|holiday)\b/i.test(lower)
    ) {
      const cd = refDate.getDay();
      let daysTo = (i - cd + 7) % 7;
      if (daysTo === 0) daysTo = 7;
      const t = new Date(refDate);
      t.setDate(date + daysTo);
      const d = fmt(t);
      return tag({ startDate: d, endDate: d, label: wd });
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

  for (let i = 0; i < MONTH_NAMES.length; i++) {
    const mn = MONTH_NAMES[i];
    const ma = MONTH_ABBR[i];
    const dayMatch = lower.match(
      new RegExp(
        `(?:\\b(?:${mn}|${ma})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b|\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(?:${mn}|${ma})\\b)`,
        'i'
      )
    );
    if (dayMatch) {
      const dayNum = parseInt(dayMatch[1] || dayMatch[2], 10);
      if (dayNum >= 1 && dayNum <= 31) {
        const t = new Date(year, i, dayNum);
        const d = fmt(t);
        return tag({ startDate: d, endDate: d, label: `${mn} ${dayNum}, ${year}` });
      }
    }
    const mMatch = lower.match(new RegExp(`\\b(in|for|of|during)\\s+(?:${mn}|${ma})(?:\\s+(\\d{4}))?\\b`, 'i'));
    if (mMatch) {
      const ty = mMatch[2] ? parseInt(mMatch[2], 10) : year;
      const s = new Date(ty, i, 1);
      const e = new Date(ty, i + 1, 0);
      return tag({ startDate: fmt(s), endDate: fmt(e), label: `${mn} ${ty}` });
    }
  }

  if (/\b(?:past|last)\s+30\s+days\b/.test(lower)) {
    const s = new Date(refDate);
    s.setDate(date - 30);
    return tag({ startDate: fmt(s), endDate: fmt(refDate), label: 'Past 30 Days' });
  }
  if (/\bthis\s+year\b/.test(lower)) {
    const s = new Date(year, 0, 1);
    const e = new Date(year, 11, 31);
    return tag({ startDate: fmt(s), endDate: fmt(e), label: `Year ${year}` });
  }

  return null;
}

/**
 * Classifies user input into structured intent payload.
 * @param {string} question - Current message
 * @param {Array<object>} [history] - Conversation history
 * @returns {object}
 */
function classifyIntent(question = '', history = []) {
  const cleanQ = (question || '').trim();
  const lower = cleanQ.toLowerCase();

  let effectiveQ = lower;
  let isFollowUp = false;
  if (history && history.length > 0) {
    const lastUser = [...history].reverse().find((m) => m.sender === 'user');
    if (lastUser) {
      const lastQ = lastUser.text.toLowerCase();
      if (
        /^(what|how)\s+about\s+/i.test(lower) ||
        /^\b(and|or)\s+/i.test(lower) ||
        /\b(them|those|it|these|that|next\s+month)\b/i.test(lower)
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

  let requestedDays = null;
  const dur =
    effectiveQ.match(/\b(\d+)\s*(?:days?|d)\s*(?:off|leave)?\b/i) ||
    effectiveQ.match(/\b(?:a|one)\s*day\s*(?:off|leave)?\b/i);
  if (dur) requestedDays = dur[1] ? parseInt(dur[1], 10) : 1;

  const dateRange = parseDateRange(cleanQ);

  // ── 1. Reporting Manager & Profile ──────────────────────────────────────────
  if (
    /\b(who\s+is\s+(?:my|the)\s+(?:reporting\s+)?manager|who\s+do\s+i\s+report\s+to|my\s+reporting\s+manager|my\s+manager|my\s+supervisor|my\s+boss)\b/i.test(
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

  if (/\b(my\s+employee\s+(?:id|code)|my\s+profile|my\s+designation|my\s+department)\b/i.test(effectiveQ)) {
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

  // ── 2. Live Counts (Check-ins, Employees, Absences) ──────────────────────────
  if (
    /\b(how\s+many\s+(?:employees?\s+)?(?:checked?[\s-]*in|punched[\s-]*in|present\s+(?:now|today))|employees?\s+(?:checked?[\s-]*in|present)\s+(?:now|today)|current\s+check.?in|live\s+attendance|checked?\s*in\s+today|who\s+is\s+currently\s+checked\s+in)\b/i.test(
      effectiveQ
    )
  ) {
    return {
      intent: 'CURRENT_CHECKINS',
      requiresEmployeeData: false,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  if (
    /\b(total\s+employees?|how\s+many\s+employees?|how\s+many\s+employees\s+do\s+we\s+have|employee\s+count|staff\s+count|headcount|total\s+staff|number\s+of\s+employees?)\b/i.test(
      effectiveQ
    )
  ) {
    return {
      intent: 'EMPLOYEE_COUNT',
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
    /\b(who\s+is\s+on\s+leave\s*(?:today|now|currently)?|show\s+employees?\s+(?:on\s+leave|currently\s+on\s+leave)|employees?\s+on\s+leave\s*(?:today|now|currently)|which\s+employees?\s+(?:are\s+on\s+leave|took\s+leave\s+today)|who\s+in\s+my\s+team\s+is\s+on\s+leave|how\s+many\s+employees?\s+are\s+on\s+leave\s+today|how\s+many\s+people\s+in\s+my\s+team\s+are\s+on\s+leave)\b/i.test(
      effectiveQ
    )
  ) {
    return {
      intent: 'EMPLOYEES_ON_LEAVE',
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
    /\b(who\s+is\s+absent\s*(?:today|now|currently)?|how\s+many\s+people\s+in\s+my\s+team\s+are\s+absent|how\s+many\s+people\s+are\s+absent\s+today|current\s+absences|who\s+is\s+not\s+checked\s+in|employees?\s+absent\s*(?:today|now|currently)?)\b/i.test(
      effectiveQ
    )
  ) {
    return {
      intent: 'CURRENT_ABSENCES',
      requiresEmployeeData: false,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.97,
      dateRange: null,
      isFollowUp,
    };
  }

  // ── 3. Team Attendance ───────────────────────────────────────────────────────
  if (
    /\b(show\s+my\s+team.?s?\s+attendance|my\s+team\s+attendance|team\s+attendance|team\s+check.?ins?)\b/i.test(
      effectiveQ
    )
  ) {
    return {
      intent: 'TEAM_ATTENDANCE',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.96,
      dateRange,
      isFollowUp,
    };
  }

  // ── 4. Leave Policy questions (Non-personal, or Policy rules) ───────────────
  if (
    /\b(apply\s+(?:for\s+)?leave\s+after\s+(?:being\s+)?absent|take\s+leave\s+after\s+(?:an?\s+)?absence|leave\s+after\s+absence|apply\s+leave\s+following\s+absent)\b/i.test(
      effectiveQ
    )
  ) {
    return {
      intent: 'POLICY_LEAVE',
      requiresEmployeeData: false,
      requiresPolicyData: true,
      requiresRag: true,
      requiresLiveData: false,
      confidence: 0.97,
      dateRange: null,
      isFollowUp,
    };
  }

  // ── 5. Leave Application / Request (Hybrid or Live) ──────────────────────────
  const isLeaveRequest =
    /\b(can\s+i\s+(?:get|take|have|apply\s+for)|i\s+need|i\s+want\s+to\s+take|taking\s+(?:tomorrow|monday|friday|leave)|how\s+many\s+leaves\s+can\s+i\s+take)\b/i.test(
      effectiveQ
    ) &&
    /\b(off|leave|vacation|time\s+off|days?|tomorrow|monday|friday)\b/i.test(effectiveQ) &&
    !/\b(after\s+(?:being\s+)?absent|following\s+absence)\b/i.test(effectiveQ);

  if (isLeaveRequest) {
    return {
      intent: 'EMPLOYEE_LEAVE_APPLICATION',
      requiresEmployeeData: true,
      requiresPolicyData: true,
      requiresRag: true,
      requiresLiveData: true,
      confidence: 0.95,
      dateRange,
      leaveTypeFilter,
      requestedDays,
      isFollowUp,
    };
  }

  // ── 6. Leave Balance ─────────────────────────────────────────────────────────
  if (
    (/\b(how\s+(?:many|much)|remaining|balance|left|available|quota|allocated|leaves?\s+do\s+i\s+(?:have|got)|my\s+leaves?)\b/i.test(
      effectiveQ
    ) &&
      /\b(leave|leaves|cl|sl|el|vacation|time\s*off)\b/i.test(effectiveQ)) ||
    /\bmy\s+leave\s+balance\b/i.test(effectiveQ)
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

  // ── 7. Leave History ─────────────────────────────────────────────────────────
  if (
    /\b(which\s+days?\s+(?:was|were)\s+i\s+(?:on\s+)?leave|what\s+days?\s+(?:was|were)\s+i\s+(?:on\s+)?leave)\b/i.test(
      effectiveQ
    ) ||
    /\b(when\s+(?:was|were)\s+(?:my|i)\s+(?:last\s+)?(?:on\s+)?leave|when\s+was\s+my\s+last\s+leave)\b/i.test(
      effectiveQ
    ) ||
    /\b(show\s+(?:me\s+)?(?:my\s+)?leave\s+(?:history|records?)|leave\s+history|my\s+leave\s+history)\b/i.test(
      effectiveQ
    ) ||
    /\b(what\s+leave\s+(?:did\s+i\s+take|have\s+i\s+taken)|which\s+leaves?\s+did\s+i\s+take)\b/i.test(effectiveQ) ||
    (/\b(when\s+did\s+i\s+(?:take|use)|which\s+dates?\s+did\s+i\s+(?:take|use)|leaves?\s+(?:i\s+)?(?:took|taken|used)|did\s+i\s+take\s+leave)\b/i.test(
      effectiveQ
    ) &&
      /\b(leave|leaves|off|vacation)\b/i.test(effectiveQ)) ||
    (/\b(past\s+leaves?|previous\s+leaves?|leaves?\s+(?:in|for|taken|used|this\s+month|last\s+month|this\s+year))\b/i.test(
      effectiveQ
    ) &&
      /\b(leave|leaves)\b/i.test(effectiveQ))
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

  // ── 8. Single Day / Today Attendance Punch ──────────────────────────────────
  if (
    /\b(did\s+i\s+(?:punch|check[\s-]*in)|what\s+time\s+did\s+i\s+(?:punch|check[\s-]*in)|my\s+punch\s+(?:in|time)|check[\s-]*in\s+time|punch[\s-]*in\s+time|am\s+i\s+(?:checked\s+in|marked\s+present)\s+today)\b/i.test(
      effectiveQ
    ) ||
    (/\b(punch|check.?in)\b/i.test(effectiveQ) &&
      /\btoday\b/i.test(effectiveQ) &&
      hasPersonalRef &&
      !/\bmissed?\b/i.test(effectiveQ))
  ) {
    return {
      intent: 'ATTENDANCE_TODAY',
      requiresEmployeeData: true,
      requiresPolicyData: false,
      requiresRag: false,
      requiresLiveData: true,
      confidence: 0.98,
      dateRange: dateRange || {
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        label: 'Today',
        explicit: true,
      },
      isFollowUp,
    };
  }

  // ── 9. Missed Punch / Punch Problem (Hybrid) ────────────────────────────────
  if (
    /\b(missed?\s+(?:my\s+)?punch|missed?\s+punch[\s-]*(?:in|out)|forgot\s+to\s+punch|didn'?t\s+punch|missing\s+punch|no\s+punch|punch\s+(?:not\s+)?(?:recorded|marked)|incorrect\s+punch)\b/i.test(
      effectiveQ
    )
  ) {
    return {
      intent: 'EMPLOYEE_PUNCH',
      requiresEmployeeData: true,
      requiresPolicyData: true,
      requiresRag: true,
      requiresLiveData: true,
      confidence: 0.97,
      dateRange,
      isFollowUp,
    };
  }

  // ── 10. Late Arrival & Absence Analysis ─────────────────────────────────────
  if (/\b(late|tardy|tardiness|late\s+arrival|came\s+late|punched\s+late|i\s+was\s+late)\b/i.test(effectiveQ) && hasPersonalRef) {
    return {
      intent: 'EMPLOYEE_ATTENDANCE',
      requiresEmployeeData: true,
      requiresPolicyData: true,
      requiresRag: true,
      requiresLiveData: true,
      confidence: 0.95,
      dateRange,
      isFollowUp,
    };
  }

  if (
    /\b(absent|absence|absences|unmarked|marked\s+absent|missing\s+punches?|employees?\s+with\s+missing|who\s+(?:has|have)\s+missing\s+punch)\b/i.test(
      effectiveQ
    ) &&
    (hasPersonalRef || /\b(employees?|who|which)\b/i.test(effectiveQ))
  ) {
    return {
      intent: 'EMPLOYEE_ABSENCE',
      requiresEmployeeData: true,
      requiresPolicyData: true,
      requiresRag: true,
      requiresLiveData: true,
      confidence: 0.95,
      dateRange,
      isFollowUp,
    };
  }

  // ── 11. Attendance Monthly / Summary ─────────────────────────────────────────
  if (
    /\b(attendance\s+(?:percentage|rate|summary|records?|history|for|in)|my\s+attendance|show\s+my\s+attendance)\b/i.test(
      effectiveQ
    ) &&
    hasPersonalRef
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

  // ── 12. Specific Policy Queries ─────────────────────────────────────────────
  if (/\b(password|security|device|encryption|vpn|mfa|credential)\b/i.test(effectiveQ)) {
    return {
      intent: 'POLICY_SECURITY',
      requiresEmployeeData: false,
      requiresPolicyData: true,
      requiresRag: true,
      requiresLiveData: false,
      confidence: 0.98,
      dateRange: null,
      isFollowUp,
    };
  }

  if (
    /\b(working\s*hours|shift\s*timings?|shift\s*hours|office\s*timings?|minimum\s*hours|lunch\s*break|work\s*schedule)\b/i.test(
      effectiveQ
    )
  ) {
    return {
      intent: 'POLICY_WORKING_HOURS',
      requiresEmployeeData: false,
      requiresPolicyData: true,
      requiresRag: true,
      requiresLiveData: false,
      confidence: 0.97,
      dateRange: null,
      isFollowUp,
    };
  }

  if (/\b(bonus|incentive|appraisal\s+bonus)\b/i.test(effectiveQ)) {
    return {
      intent: 'POLICY_BONUS',
      requiresEmployeeData: hasPersonalRef,
      requiresPolicyData: true,
      requiresRag: true,
      requiresLiveData: hasPersonalRef,
      confidence: 0.96,
      dateRange: null,
      isFollowUp,
    };
  }

  if (/\b(conduct|ethics|harassment|anti-bribery|gift|dress\s*code|remote\s*work|wfh)\b/i.test(effectiveQ)) {
    return {
      intent: 'POLICY_CONDUCT',
      requiresEmployeeData: false,
      requiresPolicyData: true,
      requiresRag: true,
      requiresLiveData: false,
      confidence: 0.97,
      dateRange: null,
      isFollowUp,
    };
  }

  if (
    /\b(policy|policies|rules?|active\s+polic|published\s+polic|what\s+policies\s+are\s+active|attendance\s+policy|leave\s+policy|regularization\s+policy|late\s+arrival\s+policy|how\s+many\s+regularizations?\s+are\s+allowed)\b/i.test(
      effectiveQ
    )
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

  // ── 13. General Conversational / Unknown ─────────────────────────────────────
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
