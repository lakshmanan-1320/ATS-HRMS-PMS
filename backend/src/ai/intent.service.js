/**
 * intent.service.js
 * Deterministic intent router for the HRMS AI chatbot.
 *
 * DESIGN PRINCIPLES:
 * - NO vector search or LLM for intent detection — pure keyword/rule routing.
 * - The router classifies what data is needed before any DB or AI call.
 * - Each intent has: dataTypes (what DB to query), policyRequired, employeeDataRequired.
 * - dateRange is ONLY set to { explicit: true } when the user explicitly mentions a period.
 *   Without explicit date mention, leave history returns ALL recent records (no month filter).
 */

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];
const MONTH_ABBR = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Parses natural language date phrases into concrete YYYY-MM-DD date ranges.
 * Returns null when no specific date was mentioned (caller should NOT apply a date filter).
 *
 * @param {string} text - User query text
 * @param {Date} [refDate] - Reference date
 * @returns {{ startDate, endDate, label, explicit: true } | null}
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
    const yest = new Date(refDate); yest.setDate(date - 1);
    const d = fmt(yest);
    return tag({ startDate: d, endDate: d, label: `Yesterday (${d})` });
  }
  if (/\btomorrow\b/.test(lower)) {
    const tom = new Date(refDate); tom.setDate(date + 1);
    const d = fmt(tom);
    return tag({ startDate: d, endDate: d, label: `Tomorrow (${d})` });
  }
  if (/\bthis\s+week\b/.test(lower)) {
    const cd = refDate.getDay();
    const s = new Date(refDate); s.setDate(date - (cd === 0 ? 6 : cd - 1));
    const e = new Date(s); e.setDate(s.getDate() + 6);
    return tag({ startDate: fmt(s), endDate: fmt(e), label: `This Week` });
  }
  if (/\blast\s+week\b/.test(lower)) {
    const cd = refDate.getDay();
    const s = new Date(refDate); s.setDate(date - (cd === 0 ? 6 : cd - 1) - 7);
    const e = new Date(s); e.setDate(s.getDate() + 6);
    return tag({ startDate: fmt(s), endDate: fmt(e), label: `Last Week` });
  }
  // last/next [weekday]
  for (let i = 0; i < WEEKDAY_NAMES.length; i++) {
    const wd = WEEKDAY_NAMES[i];
    if (new RegExp(`\\bnext\\s+${wd}\\b`, 'i').test(lower)) {
      const cd = refDate.getDay();
      let daysTo = (i - cd + 7) % 7; if (daysTo === 0) daysTo = 7;
      const t = new Date(refDate); t.setDate(date + daysTo);
      const d = fmt(t);
      return tag({ startDate: d, endDate: d, label: `Next ${wd}` });
    }
    if (new RegExp(`\\blast\\s+${wd}\\b`, 'i').test(lower)) {
      const cd = refDate.getDay();
      let daysSub = (cd - i + 7) % 7; if (daysSub === 0) daysSub = 7;
      const t = new Date(refDate); t.setDate(date - daysSub);
      const d = fmt(t);
      return tag({ startDate: d, endDate: d, label: `Last ${wd}` });
    }
    if (new RegExp(`\\b(?:on\\s+|take\\s+|for\\s+)?${wd}\\b`, 'i').test(lower) && /\b(take|leave|off|absent|holiday)\b/i.test(lower)) {
      const cd = refDate.getDay();
      let daysTo = (i - cd + 7) % 7; if (daysTo === 0) daysTo = 7;
      const t = new Date(refDate); t.setDate(date + daysTo);
      const d = fmt(t);
      return tag({ startDate: d, endDate: d, label: wd });
    }
  }
  if (/\bthis\s+month\b/.test(lower)) {
    const s = new Date(year, month, 1); const e = new Date(year, month + 1, 0);
    return tag({ startDate: fmt(s), endDate: fmt(e), label: `${MONTH_NAMES[month]} ${year}` });
  }
  if (/\blast\s+month\b/.test(lower)) {
    const s = new Date(year, month - 1, 1); const e = new Date(year, month, 0);
    const pm = (month - 1 + 12) % 12; const py = month === 0 ? year - 1 : year;
    return tag({ startDate: fmt(s), endDate: fmt(e), label: `${MONTH_NAMES[pm]} ${py}` });
  }
  // Specific month name in query (e.g. "in August", "August 15", "15th August")
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    const mn = MONTH_NAMES[i]; const ma = MONTH_ABBR[i];
    const dayMatch = lower.match(new RegExp(`(?:\\b(?:${mn}|${ma})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b|\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(?:${mn}|${ma})\\b)`, 'i'));
    if (dayMatch) {
      const dayNum = parseInt(dayMatch[1] || dayMatch[2], 10);
      if (dayNum >= 1 && dayNum <= 31) {
        const t = new Date(year, i, dayNum); const d = fmt(t);
        return tag({ startDate: d, endDate: d, label: `${mn} ${dayNum}, ${year}` });
      }
    }
    const mMatch = lower.match(new RegExp(`\\b(in|for|of|during)\\s+(?:${mn}|${ma})(?:\\s+(\\d{4}))?\\b`, 'i'));
    if (mMatch) {
      const ty = mMatch[2] ? parseInt(mMatch[2], 10) : year;
      const s = new Date(ty, i, 1); const e = new Date(ty, i + 1, 0);
      return tag({ startDate: fmt(s), endDate: fmt(e), label: `${mn} ${ty}` });
    }
  }
  if (/\b(?:past|last)\s+30\s+days\b/.test(lower)) {
    const s = new Date(refDate); s.setDate(date - 30);
    return tag({ startDate: fmt(s), endDate: fmt(refDate), label: 'Past 30 Days' });
  }
  if (/\bthis\s+year\b/.test(lower)) {
    const s = new Date(year, 0, 1); const e = new Date(year, 11, 31);
    return tag({ startDate: fmt(s), endDate: fmt(e), label: `Year ${year}` });
  }
  // No date mentioned → return null so callers do NOT add a date filter
  return null;
}

/**
 * Deterministic HRMS intent router.
 *
 * @param {string} question - Current user input
 * @param {Array<object>} [history] - Conversation history
 * @returns {object} Intent payload
 */
function detectIntent(question = '', history = []) {
  const cleanQ = (question || '').trim();
  const lower = cleanQ.toLowerCase();

  // Resolve follow-up context
  let effectiveQ = lower;
  let isFollowUp = false;
  if (history && history.length > 0) {
    const lastUser = [...history].reverse().find(m => m.sender === 'user');
    if (lastUser) {
      const lastQ = lastUser.text.toLowerCase();
      if (/^(what|how)\s+about\s+/i.test(lower) || /^\b(and|or)\s+/i.test(lower) || /\b(them|those|it|these|that|next\s+month)\b/i.test(lower)) {
        isFollowUp = true;
        effectiveQ = `${lastQ} ${lower}`;
      }
    }
  }

  const hasPersonalRef = /\b(i|my|me|mine|we|our|am i|can i|do i|did i|have i|was i|show me|tell me my|i need|i want|give me|got)\b/i.test(effectiveQ);

  // Leave type filter
  let leaveTypeFilter = null;
  if (/\bcasual\b/i.test(effectiveQ) || /\bcl\b/.test(effectiveQ)) leaveTypeFilter = 'Casual Leave';
  else if (/\bsick\b/i.test(effectiveQ) || /\bsl\b/.test(effectiveQ)) leaveTypeFilter = 'Sick Leave';
  else if (/\b(earned|annual|el)\b/i.test(effectiveQ)) leaveTypeFilter = 'Earned Leave';
  else if (/\b(optional|floating)\b/i.test(effectiveQ)) leaveTypeFilter = 'Optional Holiday';
  else if (/\b(unpaid|lop)\b/i.test(effectiveQ)) leaveTypeFilter = 'Loss of Pay';

  // Requested duration
  let requestedDays = null;
  const dur = effectiveQ.match(/\b(\d+)\s*(?:days?|d)\s*(?:off|leave)?\b/i) || effectiveQ.match(/\b(?:a|one)\s*day\s*(?:off|leave)?\b/i);
  if (dur) requestedDays = dur[1] ? parseInt(dur[1], 10) : 1;

  // Parse date range — null means no explicit date mentioned
  const dateRange = parseDateRange(cleanQ);

  // ============================================================
  // 0. ADMINISTRATIVE / ORG-WIDE DATA QUERIES (no Gemma needed)
  // These must come BEFORE leave/attendance intents to avoid mis-routing.
  // ============================================================

  // REPORTING_MANAGER: "Who is my reporting manager?", "Who is my manager?", "Who do I report to?"
  if (/\b(who\s+is\s+(?:my|the)\s+(?:reporting\s+)?manager|who\s+do\s+i\s+report\s+to|my\s+reporting\s+manager|my\s+manager|my\s+supervisor|my\s+boss)\b/i.test(effectiveQ)) {
    return { intent: 'REPORTING_MANAGER', dataTypes: ['manager'], policyRequired: false, employeeDataRequired: true, dateRange: null, isFollowUp };
  }

  // CURRENT_CHECKIN_COUNT: "how many checked in", "employees checked in now/today"
  // MUST be before EMPLOYEE_COUNT to avoid "how many employees" capturing this first.
  // Handles: "checked-in" (hyphen), "checked in now/today", "present now/today"
  if (/\b(how\s+many\s+(?:employees?\s+)?(?:checked?[\s-]*in|punched[\s-]*in|present\s+(?:now|today))|employees?\s+(?:checked?[\s-]*in|present)\s+(?:now|today)|current\s+check.?in|live\s+attendance|checked?\s*in\s+today|how\s+many\s+(?:are\s+)?(?:checked?[\s-]*in|present)\s+(?:now|today))\b/i.test(effectiveQ)) {
    return { intent: 'CURRENT_CHECKIN_COUNT', dataTypes: ['checkin_count'], policyRequired: false, employeeDataRequired: false, dateRange: null, isFollowUp };
  }

  // EMPLOYEE_COUNT: "total employees", "how many employees", "employee count"
  if (/\b(total\s+employees?|how\s+many\s+employees?|employee\s+count|staff\s+count|headcount|total\s+staff|number\s+of\s+employees?)\b/i.test(effectiveQ)) {
    return { intent: 'EMPLOYEE_COUNT', dataTypes: ['employee_count'], policyRequired: false, employeeDataRequired: false, dateRange: null, isFollowUp };
  }

  // EMPLOYEES_ON_LEAVE_NOW: "who is on leave today", "show employees on leave", "who in my team is on leave"
  if (/\b(who\s+is\s+(?:on\s+leave|absent)\s*(?:today|now|currently)?|show\s+employees?\s+(?:on\s+leave|currently\s+on\s+leave)|employees?\s+(?:on\s+leave|absent)\s*(?:today|now|currently)|which\s+employees?\s+(?:are\s+on\s+leave|took\s+leave\s+today)|who\s+in\s+my\s+team\s+is\s+(?:on\s+leave|absent)|who\s+from\s+my\s+team\s+is\s+(?:on\s+leave|absent))\b/i.test(effectiveQ)) {
    return { intent: 'EMPLOYEES_ON_LEAVE_NOW', dataTypes: ['employees_on_leave'], policyRequired: false, employeeDataRequired: false, dateRange: null, isFollowUp };
  }

  // ============================================================
  // 1. LEAVE INTENTS
  // ============================================================

  // LEAVE_AFTER_ABSENCE — pure policy question, NOT a DB query
  // "Can I apply for leave after being absent?", "Can I take leave after an absence?"
  if (/\b(apply\s+(?:for\s+)?leave\s+after\s+(?:being\s+)?absent|take\s+leave\s+after\s+(?:an?\s+)?absence|leave\s+after\s+absence|apply\s+leave\s+following\s+absent)\b/i.test(effectiveQ)) {
    return { intent: 'LEAVE_AFTER_ABSENCE', dataTypes: [], policyRequired: true, employeeDataRequired: false, dateRange: null, isFollowUp };
  }

  // LEAVE_REQUEST: "Can I get 3 days off?", "Can I take leave tomorrow?", "I need 3 days off"
  const isLeaveRequest = /\b(can\s+i\s+(?:get|take|have|apply\s+for)|i\s+need|i\s+want\s+to\s+take|taking\s+(?:tomorrow|monday|friday|leave))\b/i.test(effectiveQ) &&
    /\b(off|leave|vacation|time\s+off|days?|tomorrow|monday|friday)\b/i.test(effectiveQ) &&
    !/\b(after\s+(?:being\s+)?absent|following\s+absence)\b/i.test(effectiveQ);

  if (isLeaveRequest) {
    return { intent: 'LEAVE_REQUEST', dataTypes: ['leave_balance', 'leave_history'], policyRequired: true, employeeDataRequired: true, dateRange, leaveTypeFilter, requestedDays, isFollowUp };
  }

  // LEAVE_BALANCE: "How many leaves do I have?", "What is my leave balance?", "CL balance"
  if ((/\b(how\s+(?:many|much)|remaining|balance|left|available|quota|allocated|leaves?\s+do\s+i\s+(?:have|got)|my\s+leaves?)\b/i.test(effectiveQ) &&
    /\b(leave|leaves|cl|sl|el|vacation|time\s*off)\b/i.test(effectiveQ)) ||
    /\bmy\s+leave\s+balance\b/i.test(effectiveQ)) {
    return { intent: 'LEAVE_BALANCE', dataTypes: ['leave_balance'], policyRequired: false, employeeDataRequired: true, dateRange, leaveTypeFilter, isFollowUp };
  }

  // LEAVE_HISTORY: "Which days was I on leave?", "Show my leave history", "When was my last leave?",
  // "What leave did I take this month?", "What leave did I take?"
  if (
    /\b(which\s+days?\s+(?:was|were)\s+i\s+(?:on\s+)?leave|what\s+days?\s+(?:was|were)\s+i\s+(?:on\s+)?leave)\b/i.test(effectiveQ) ||
    /\b(when\s+(?:was|were)\s+(?:my|i)\s+(?:last\s+)?(?:on\s+)?leave|when\s+was\s+my\s+last\s+leave)\b/i.test(effectiveQ) ||
    /\b(show\s+(?:me\s+)?(?:my\s+)?leave\s+(?:history|records?)|leave\s+history|my\s+leave\s+history)\b/i.test(effectiveQ) ||
    /\b(what\s+leave\s+(?:did\s+i\s+take|have\s+i\s+taken)|which\s+leaves?\s+did\s+i\s+take)\b/i.test(effectiveQ) ||
    (/\b(when\s+did\s+i\s+(?:take|use)|which\s+dates?\s+did\s+i\s+(?:take|use)|leaves?\s+(?:i\s+)?(?:took|taken|used)|did\s+i\s+take\s+leave)\b/i.test(effectiveQ) &&
      /\b(leave|leaves|off|vacation)\b/i.test(effectiveQ)) ||
    (/\b(past\s+leaves?|previous\s+leaves?|leaves?\s+(?:in|for|taken|used|this\s+month|last\s+month|this\s+year))\b/i.test(effectiveQ) &&
      /\b(leave|leaves)\b/i.test(effectiveQ))
  ) {
    return { intent: 'LEAVE_HISTORY', dataTypes: ['leave_history'], policyRequired: false, employeeDataRequired: true, dateRange, leaveTypeFilter, isFollowUp };
  }

  // LEAVE_ELIGIBILITY: "Am I eligible for maternity leave?", "How many days can I take?"
  if (/\b(eligible\s+for\s+leave|leave\s+eligibility|how\s+many\s+days\s+can\s+i\s+take|maternity\s+leave|paternity\s+leave)\b/i.test(effectiveQ)) {
    return { intent: 'LEAVE_ELIGIBILITY', dataTypes: ['leave_balance'], policyRequired: true, employeeDataRequired: hasPersonalRef, dateRange, leaveTypeFilter, isFollowUp };
  }

  // ============================================================
  // 2. ATTENDANCE INTENTS
  // ============================================================

  // ATTENDANCE_TODAY: "Did I punch in today?", "What time did I check in?", "Did I check in today?"
  if (/\b(did\s+i\s+(?:punch|check[\s-]*in)|what\s+time\s+did\s+i\s+(?:punch|check[\s-]*in)|my\s+punch\s+(?:in|time)|check[\s-]*in\s+time|punch[\s-]*in\s+time|am\s+i\s+(?:checked\s+in|marked\s+present)\s+today)\b/i.test(effectiveQ) ||
    (/\b(punch|check.?in)\b/i.test(effectiveQ) && /\btoday\b/i.test(effectiveQ) && hasPersonalRef && !/\bmissed?\b/i.test(effectiveQ))) {
    return { intent: 'ATTENDANCE_TODAY', dataTypes: ['attendance_today'], policyRequired: false, employeeDataRequired: true, dateRange: dateRange || { startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), label: 'Today', explicit: true }, isFollowUp };
  }

  // MISSING_PUNCH: "I missed punch-in", "I forgot to punch out", "I didn't punch", "missed punch-in today"
  // Note: hyphen in "punch-in" requires [\s-]* between punch and in
  if (/\b(missed?\s+(?:my\s+)?punch|missed?\s+punch[\s-]*(?:in|out)|forgot\s+to\s+punch|didn'?t\s+punch|missing\s+punch|no\s+punch|punch\s+(?:not\s+)?(?:recorded|marked)|incorrect\s+punch)\b/i.test(effectiveQ)) {
    return { intent: 'MISSING_PUNCH', dataTypes: ['attendance_today'], policyRequired: true, employeeDataRequired: true, dateRange, isFollowUp };
  }

  // REGULARIZATION: "Can I regularize?", "regularization deadline", "how many regularizations"
  if (/\b(regulari[sz]ation|regulari[sz]e|regulari[sz]ed|regulari[sz]ation\s+(?:limit|count|used|left|remaining|status|deadline|window))\b/i.test(effectiveQ)) {
    return { intent: 'REGULARIZATION', dataTypes: ['attendance_today'], policyRequired: true, employeeDataRequired: true, dateRange, isFollowUp };
  }

  // LATE_ARRIVAL: "Was I late this month?", "How many times was I late?"
  if (/\b(late|tardy|tardiness|late\s+arrival|came\s+late|punched\s+late)\b/i.test(effectiveQ) && hasPersonalRef) {
    return { intent: 'LATE_ARRIVAL', dataTypes: ['attendance'], policyRequired: true, employeeDataRequired: true, dateRange, isFollowUp };
  }

  // ABSENCE_ANALYSIS: "Which days was I absent?", "Which employees have missing punches?", "missing attendance"
  if (/\b(absent|absence|absences|unmarked|marked\s+absent|missing\s+punches?|employees?\s+with\s+missing|who\s+(?:has|have)\s+missing\s+punch)\b/i.test(effectiveQ) &&
    (hasPersonalRef || /\b(employees?|who|which)\b/i.test(effectiveQ))) {
    return { intent: 'ABSENCE_ANALYSIS', dataTypes: ['attendance', 'leave_history'], policyRequired: true, employeeDataRequired: true, dateRange, isFollowUp };
  }

  // ATTENDANCE_STATUS: "Was I present on August 15?"
  if (/\b(was\s+i\s+present|my\s+attendance\s+(?:on|for))\b/i.test(effectiveQ)) {
    return { intent: 'ATTENDANCE_STATUS', dataTypes: ['attendance'], policyRequired: false, employeeDataRequired: true, dateRange, isFollowUp };
  }

  // ATTENDANCE_HISTORY: "Show my attendance for August", "Show my team's attendance", "What was my attendance this month?"
  if (/\b(attendance\s+(?:percentage|rate|summary|records?|history|for|in)|my\s+(?:team.?s?\s+)?attendance|show\s+my\s+team.?s?\s+attendance|team\s+attendance)\b/i.test(effectiveQ) &&
    (hasPersonalRef || /\b(team|my\s+team)\b/i.test(effectiveQ))) {
    return { intent: 'ATTENDANCE_HISTORY', dataTypes: ['attendance'], policyRequired: false, employeeDataRequired: true, dateRange, isFollowUp };
  }

  // WORKING_HOURS: "What are the working hours?", "What is the shift timing?"
  if (/\b(working\s*hours|shift\s*timings?|shift\s*hours|office\s*timings?|minimum\s*hours|lunch\s*break|work\s*schedule)\b/i.test(effectiveQ)) {
    return { intent: 'WORKING_HOURS', dataTypes: ['attendance'], policyRequired: true, employeeDataRequired: hasPersonalRef, dateRange: null, isFollowUp };
  }

  // ============================================================
  // 3. BONUS & PAYROLL INTENTS
  // ============================================================

  if (/\b(bonus|incentive)\b/i.test(effectiveQ) && /\b(affect|impact|reduce|cut|lose|deduct|unpaid|lop|attendance|leave|absent)\b/i.test(effectiveQ)) {
    return { intent: 'BONUS_IMPACT', dataTypes: ['attendance', 'leave_history', 'bonus_data'], policyRequired: true, employeeDataRequired: hasPersonalRef, dateRange, isFollowUp };
  }
  if (/\b(bonus\s+eligibility|eligible\s+for\s+bonus|qualify\s+for\s+bonus|who\s+gets\s+bonus)\b/i.test(effectiveQ)) {
    return { intent: 'BONUS_ELIGIBILITY', dataTypes: ['bonus_data'], policyRequired: true, employeeDataRequired: hasPersonalRef, dateRange: null, isFollowUp };
  }
  if (/\b(how\s+is\s+(?:my\s+)?bonus\s+calculated|bonus\s+calculation|bonus\s+formula)\b/i.test(effectiveQ)) {
    return { intent: 'BONUS_CALCULATION', dataTypes: ['bonus_data'], policyRequired: true, employeeDataRequired: hasPersonalRef, dateRange: null, isFollowUp };
  }
  if (/\b(how\s+much\s+bonus|my\s+bonus|did\s+i\s+get\s+(?:a\s+)?bonus|bonus\s+payout|bonus\s+amount)\b/i.test(effectiveQ) && hasPersonalRef) {
    return { intent: 'BONUS_HISTORY', dataTypes: ['bonus_data', 'attendance'], policyRequired: true, employeeDataRequired: true, dateRange, isFollowUp };
  }
  if (/\b(salary|payroll|payslip|deductions?|gross\s*pay|net\s*pay|pay\s*cut|lower\s*salary)\b/i.test(effectiveQ)) {
    return { intent: 'PAYROLL_INFORMATION', dataTypes: ['bonus_data', 'attendance'], policyRequired: true, employeeDataRequired: true, dateRange, isFollowUp };
  }

  // ============================================================
  // 4. POLICY INTENTS — pure RAG, no DB needed
  // ============================================================

  // CROSS_POLICY
  if ((/\b(bonus|incentive)\b/i.test(effectiveQ) && /\b(attendance|leave|lop|unpaid|ethics|security)\b/i.test(effectiveQ)) ||
    (/\b(security|password|device)\b/i.test(effectiveQ) && /\b(conduct|ethics|remote\s*work)\b/i.test(effectiveQ))) {
    return { intent: 'CROSS_POLICY', dataTypes: hasPersonalRef ? ['attendance', 'leave_history', 'bonus_data'] : [], policyRequired: true, employeeDataRequired: hasPersonalRef, dateRange, isFollowUp };
  }

  // POLICY_INFORMATION: specific policy keywords or admin queries about policies
  if (/\b(policy|policies|rules?|conduct|ethics|security|password|confidential|harassment|anti-bribery|gift|notice\s*period|resignation|probation|allowance|code\s+of\s+conduct|work\s+from\s+home|wfh|remote\s+work|dress\s+code|active\s+polic|policies\s+are\s+active|published\s+polic)\b/i.test(effectiveQ)) {
    return { intent: 'POLICY_INFORMATION', dataTypes: [], policyRequired: true, employeeDataRequired: false, dateRange: null, isFollowUp };
  }

  // General leave/attendance POLICY questions that are NOT personal
  // "What is the leave policy?", "What is the attendance policy?", "Can I apply for leave after being absent?"
  if (!hasPersonalRef && /\b(leave|attendance)\b/i.test(effectiveQ) && /\b(policy|rule|what|how|when|can|allowed|allowed|permitted|apply)\b/i.test(effectiveQ)) {
    return { intent: 'POLICY_INFORMATION', dataTypes: [], policyRequired: true, employeeDataRequired: false, dateRange: null, isFollowUp };
  }

  // GENERAL_HR fallback — has some HR keywords but nothing specific matched
  if (/\b(hr|human\s*resources|holiday|leave|attendance|appraisal|review|bonus)\b/i.test(effectiveQ)) {
    return { intent: 'GENERAL_HR', dataTypes: hasPersonalRef ? ['leave_balance'] : [], policyRequired: true, employeeDataRequired: hasPersonalRef, dateRange: null, isFollowUp };
  }

  // OUT_OF_SCOPE
  return { intent: 'OUT_OF_SCOPE', dataTypes: [], policyRequired: false, employeeDataRequired: false, dateRange: null, isFollowUp };
}

/**
 * Suggested follow-up questions per intent.
 */
function getSuggestedQuestions(intent) {
  switch (intent) {
    case 'REPORTING_MANAGER':
      return ['Who is in my team?', 'What is the leave policy?', 'What is my attendance this month?'];
    case 'EMPLOYEE_COUNT':
      return ['How many employees checked in today?', 'Who is on leave today?', 'What is the leave policy?'];
    case 'CURRENT_CHECKIN_COUNT':
      return ['Who is on leave today?', 'Total employees?', 'What is my attendance this month?'];
    case 'EMPLOYEES_ON_LEAVE_NOW':
      return ['How many employees checked in today?', 'Total employees?', 'What is the attendance policy?'];
    case 'LEAVE_HISTORY':
      return ['How many leaves do I have left?', 'Was I marked absent this month?', 'What are the Casual Leave rules?'];
    case 'LEAVE_BALANCE':
    case 'LEAVE_REQUEST':
    case 'LEAVE_ELIGIBILITY':
    case 'LEAVE_AFTER_ABSENCE':
      return ['Which days did I take leave?', 'Can I take 3 days off next week?', 'What is the notice period for Earned Leave?'];
    case 'ATTENDANCE_TODAY':
    case 'MISSING_PUNCH':
    case 'REGULARIZATION':
      return ['What is the attendance regularization deadline?', 'What is my attendance this month?', 'What are the attendance policy rules?'];
    case 'ATTENDANCE_HISTORY':
    case 'ATTENDANCE_STATUS':
    case 'LATE_ARRIVAL':
    case 'ABSENCE_ANALYSIS':
      return ['How many days was I absent?', 'Was I late this month?', 'Does my attendance affect my bonus?'];
    case 'WORKING_HOURS':
      return ['What is my shift timing?', 'How many hours do I need to work?', 'What is the attendance policy?'];
    case 'BONUS_IMPACT':
    case 'BONUS_ELIGIBILITY':
    case 'BONUS_CALCULATION':
    case 'BONUS_HISTORY':
    case 'PAYROLL_INFORMATION':
      return ['Will unpaid leave affect my bonus?', 'How is my bonus calculated?', 'How many leaves do I have left?'];
    default:
      return ['How many leaves do I have?', 'What was my attendance this month?', 'What is the leave policy?', 'Who is my reporting manager?'];
  }
}

module.exports = { parseDateRange, detectIntent, getSuggestedQuestions };
