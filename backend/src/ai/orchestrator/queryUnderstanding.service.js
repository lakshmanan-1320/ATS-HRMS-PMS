/**
 * queryUnderstanding.service.js
 *
 * HRMS AI — Semantic Query Understanding Layer
 *
 * Architecture:
 * 1. Follow-up context resolution (handles conversational references like "his email", "can I take 10 days", "what about tomorrow")
 * 2. Greeting / conversational detection
 * 3. Parameter extraction: dates, leave types, durations, numbers
 * 4. Semantic domain scoring — weighted token bags, not hardcoded regex question lists
 * 5. Personal-intent detection (my/I/me keywords -> requiresLiveData)
 * 6. Policy-intent detection (policy/rules/eligible/can-I/how-long keywords -> requiresPolicy)
 * 7. Scope determination (self / team / organization / general)
 * 8. Intent identifier generation (backward-compatible)
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONSTANTS & UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const WEEKDAY_NAMES = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

function normalize(text = '') {
  return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function fmt(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PARAMETER EXTRACTORS
// ─────────────────────────────────────────────────────────────────────────────

function parseDateRange(text = '', refDate = new Date()) {
  const lower = normalize(text);
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const date = refDate.getDate();

  if (/\btoday\b/.test(lower)) {
    const d = fmt(refDate);
    return { startDate: d, endDate: d, label: 'Today', explicit: true };
  }
  if (/\byesterday\b/.test(lower)) {
    const d = new Date(refDate);
    d.setDate(date - 1);
    const fd = fmt(d);
    return { startDate: fd, endDate: fd, label: 'Yesterday', explicit: true };
  }
  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(refDate);
    d.setDate(date + 1);
    const fd = fmt(d);
    return { startDate: fd, endDate: fd, label: 'Tomorrow', explicit: true };
  }
  if (/\bthis\s+week\b/.test(lower)) {
    const dow = refDate.getDay();
    const start = new Date(refDate);
    start.setDate(date - (dow === 0 ? 6 : dow - 1));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { startDate: fmt(start), endDate: fmt(end), label: 'This Week', explicit: true };
  }
  if (/\blast\s+week\b/.test(lower)) {
    const dow = refDate.getDay();
    const start = new Date(refDate);
    start.setDate(date - (dow === 0 ? 6 : dow - 1) - 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { startDate: fmt(start), endDate: fmt(end), label: 'Last Week', explicit: true };
  }
  if (/\bthis\s+month\b/.test(lower)) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { startDate: fmt(start), endDate: fmt(end), label: `${MONTH_NAMES[month]} ${year}`, explicit: true };
  }
  if (/\blast\s+month\b/.test(lower)) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const prevMonth = (month - 1 + 12) % 12;
    const prevYear = month === 0 ? year - 1 : year;
    return { startDate: fmt(start), endDate: fmt(end), label: `${MONTH_NAMES[prevMonth]} ${prevYear}`, explicit: true };
  }
  for (let i = 0; i < WEEKDAY_NAMES.length; i++) {
    const wd = WEEKDAY_NAMES[i];
    if (new RegExp(`\\bnext\\s+${wd}\\b`, 'i').test(lower)) {
      const currentDay = refDate.getDay();
      let diff = (i - currentDay + 7) % 7;
      if (diff === 0) diff = 7;
      const target = new Date(refDate);
      target.setDate(date + diff);
      const fd = fmt(target);
      return { startDate: fd, endDate: fd, label: `Next ${wd.charAt(0).toUpperCase() + wd.slice(1)}`, explicit: true };
    }
  }
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (new RegExp(`\\b${MONTH_NAMES[i]}\\b`).test(lower)) {
      const targetYear = i > month ? year : year;
      const start = new Date(targetYear, i, 1);
      const end = new Date(targetYear, i + 1, 0);
      return { startDate: fmt(start), endDate: fmt(end), label: `${MONTH_NAMES[i]} ${targetYear}`, explicit: true };
    }
  }
  return null;
}

function extractLeaveType(text = '') {
  const lower = normalize(text);
  if (/\b(earned|el|privilege|pl)\b/.test(lower)) return 'earned';
  if (/\b(casual|cl)\b/.test(lower)) return 'casual';
  if (/\b(sick|sl|medical)\b/.test(lower)) return 'sick';
  if (/\b(wfh|work\s+from\s+home)\b/.test(lower)) return 'wfh';
  if (/\b(unpaid|lop|loss\s+of\s+pay|without\s+pay|lwp)\b/.test(lower)) return 'unpaid';
  if (/\b(maternity)\b/.test(lower)) return 'maternity';
  if (/\b(paternity)\b/.test(lower)) return 'paternity';
  if (/\b(compensatory|comp\s*off)\b/.test(lower)) return 'compensatory';
  if (/\b(annual)\b/.test(lower)) return 'earned';
  return null;
}

function extractRequestedDuration(text = '') {
  const lower = normalize(text);
  const numeric = lower.match(/\b(\d+(?:\.\d+)?)\s+days?\b/);
  if (numeric) return Number(numeric[1]);
  const forMatch = lower.match(/\b(?:for|take|have)\s+(\d+(?:\.\d+)?)\s+days?\b/);
  if (forMatch) return Number(forMatch[1]);
  const words = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    fifteen: 15, twenty: 20, thirty: 30,
  };
  for (const [word, value] of Object.entries(words)) {
    if (new RegExp(`\\b${word}\\s+days?\\b`, 'i').test(lower)) return value;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SEMANTIC DOMAIN SCORER
// ─────────────────────────────────────────────────────────────────────────────

const DOMAIN_BAGS = {
  bonus: [
    ['bonus', 4], ['eligible for bonus', 6], ['bonus eligibility', 6],
    ['bonus criteria', 6], ['bonus based on', 5], ['bonus policy', 5],
    ['annual bonus', 5], ['performance bonus', 5], ['incentive', 4],
    ['payout', 3], ['bonus payment', 4], ['variable pay', 3],
  ],
  leave: [
    ['leave', 3], ['casual', 3], ['earned', 3], ['sick', 3], ['el', 2],
    ['cl', 2], ['sl', 2], ['pl', 2], ['lop', 3], ['unpaid', 3],
    ['wfh', 2], ['work from home', 2], ['annual leave', 3],
    ['maternity', 3], ['paternity', 3], ['compensatory', 3], ['comp off', 3],
    ['vacation', 2], ['day off', 2], ['days off', 2], ['time off', 2],
    ['leave balance', 4], ['leave quota', 4], ['leave remaining', 4],
    ['leave history', 4], ['leave request', 3], ['leave application', 3],
    ['on leave', 4], ['days was i on leave', 5], ['leave dates', 4],
    ['leaves taken', 4], ['leaves i took', 4], ['past leave', 4],
    ['carry forward', 4], ['carry over', 4], ['carry into', 4], ['carry', 3],
    ['encash', 3], ['accumulate', 3], ['consecutive', 3],
    ['leave entitlement', 4], ['leave allocation', 3],
    ['enough cl', 4], ['enough el', 4], ['enough leave', 4],
    ['enough for', 4],
  ],
  attendance: [
    ['attendance', 3], ['check in', 3], ['check out', 3], ['checkout', 3],
    ['checkin', 3], ['punch in', 3], ['punch out', 3],
    ['punch', 2], ['absent', 3], ['present', 2], ['late', 2],
    ['late arrival', 3], ['grace period', 3], ['swipe', 2],
    ['attendance summary', 4], ['work hours', 3], ['working hours', 3],
    ['office hours', 3], ['shift timing', 3], ['incomplete punch', 4],
    ['missed punch', 4], ['forget to punch', 4], ['forgot to punch', 4],
    ['missed yesterday', 4], ['biometric', 2], ['attendance record', 3],
    ['attendance today', 4], ['yesterday attendance', 3],
    ['check-in time', 3], ['check-out time', 3],
    ['overtime', 4], ['office timing', 3],
  ],
  regularization: [
    ['regularization', 5], ['regularize', 5], ['regularisation', 5],
    ['attendance correction', 4], ['missed punch', 4], ['correct attendance', 4],
    ['forgot to punch', 4], ['punch correction', 4], ['attendance request', 3],
    ['fix punch', 4], ['fix attendance', 4], ['regularize punch', 5],
  ],
  profile: [
    ['designation', 4], ['job title', 3], ['department', 3], ['dept', 2],
    ['where do i work', 4],
    ['joining date', 4], ['date of joining', 4], ['doj', 3], ['when did i join', 4],
    ['employee code', 4], ['employee id', 4], ['emp code', 4], ['emp id', 3],
    ['my code', 3], ['my id', 3], ['my profile', 3], ['profile', 2],
    ['shift', 2], ['employment type', 3], ['role', 3], ['position', 3],
    ['what role', 4], ['what position', 4], ['job', 2],
    ['reporting manager', 4], ['my manager', 4], ['manager email', 4],
    ['manager', 3], ['who is my manager', 5], ['who do i report to', 5],
    ['supervisor', 3], ['probation status', 3], ['confirmation', 3],
  ],
  manager_team: [
    ['who reports to me', 5], ['my team', 4], ['team members', 4],
    ['direct reports', 5], ['reportees', 4], ['reporting to me', 4],
    ['my subordinates', 4], ['my reportees', 4],
    ['team attendance', 4], ['team absent', 4], ['team leave', 4],
    ['team late', 4], ['pending approvals', 4], ['leave approvals', 4],
    ['regularization approvals', 4], ['team check', 3],
    ['how many employees', 3], ['team size', 3],
    ['team incomplete', 3], ['who is absent', 5], ['who is on leave', 5],
    ['who came late', 3], ['who is late', 3],
  ],
  salary: [
    ['salary', 4], ['payslip', 4], ['pay slip', 4], ['ctc', 4],
    ['net pay', 4], ['gross salary', 4], ['payroll', 3], ['compensation', 3],
    ['earnings', 3], ['deductions', 3], ['pf', 2], ['provident fund', 3],
    ['tax deduction', 3], ['tds', 3], ['in hand', 3], ['take home', 3],
  ],
  security: [
    ['password', 3], ['vpn', 4], ['data security', 5], ['it policy', 5],
    ['security policy', 5], ['company data', 4], ['data protection', 4],
    ['confidential', 3], ['laptop', 2], ['device policy', 4],
    ['remote work', 4], ['wfh policy', 4], ['work from home policy', 4],
    ['acceptable use', 4], ['privacy', 3], ['asset', 2],
    ['email policy', 3], ['internet use', 3],
  ],
  conduct: [
    ['code of conduct', 5], ['conduct policy', 5], ['workplace ethics', 4],
    ['harassment', 4], ['discrimination', 4], ['gift policy', 4],
    ['conflict of interest', 4], ['disciplinary', 4], ['misconduct', 4],
    ['ethics', 3], ['bribe', 4], ['whistleblower', 4],
    ['dress code', 3], ['professional conduct', 4],
  ],
  probation: [
    ['probation', 5], ['probationary', 5], ['probation period', 5],
    ['confirmation period', 4], ['confirmation letter', 3],
    ['confirmed employee', 3], ['under probation', 4],
    ['during probation', 5], ['while on probation', 5],
    ['probation review', 4],
  ],
  organization: [
    ['total employees', 4], ['employee count', 4], ['organization', 2],
    ['company wide', 3], ['all employees', 3], ['across the company', 3],
    ['org level', 3], ['org attendance', 4], ['org leave', 3],
  ],
};

const PERSONAL_TOKENS = [
  'my ', ' me ', ' me?', ' me.', ' me,', ' i ', "i'm", "i've", "i'd", "i'll",
  "am i", "do i", "have i", "did i", "can i", "will i", "should i", "was i",
  'my leave', 'my attendance', 'my salary', 'my designation',
  'my department', 'my manager', 'my team', 'my shift', 'my profile',
  'my bonus', 'my payslip', 'my balance', 'my joining', 'my code',
  'for me', 'by me', 'to me', 'mine', 'myself', 'when did i',
  'who is my', 'what is my', 'show my', 'tell me', 'which department do i',
  'which days was i', 'where do i work',
];

const POLICY_TOKENS = [
  'policy', 'policies', 'rule', 'rules', 'guideline', 'guidelines',
  'allowed', 'permit', 'permitted', 'eligible', 'eligibility', 'criteria',
  'allowed to', 'can i take', 'can i apply', 'can i work', 'can i carry',
  'can i regularize', 'can i fix', 'am i allowed', 'am i permitted',
  'am i eligible', 'how many days', 'how much leave', 'how much el',
  'what is the', 'what are the', 'what does', 'what should', 'who should',
  'who to contact', 'who should i contact', 'who do i contact', 'who do i reach out to',
  'when is', 'when are', 'how long', 'how many', 'maximum', 'consecutive',
  'carry forward', 'carry over', 'carry into', 'carry', 'encash', 'accumulate',
  'probation period', 'notice period', 'working hours', 'office hours', 'office timing',
  'overtime', 'regularization policy', 'attendance policy',
  'leave policy', 'bonus policy', 'incentive policy', 'code of conduct',
  'do i need', 'is it mandatory', 'is it required', 'enough',
  'what happens', 'consequences', 'disciplinary', 'work from home', 'remote work',
  'during probation', 'on probation',
];

const GREETING_PATTERNS = [
  /^(hi|hello|hey|good\s+(morning|afternoon|evening|day))(\s+(there|assistant|bot|all|team))?[\s!.]*$/i,
  /^(thanks|thank\s+you|ok|okay|got\s+it|understood|noted|sure|great|perfect)[\s!.]*$/i,
];

function scoreDomains(lower) {
  const scores = {};
  for (const [domain, tokens] of Object.entries(DOMAIN_BAGS)) {
    let score = 0;
    for (const [token, weight] of tokens) {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = token.length <= 2
        ? new RegExp(`\\b${escaped}\\b`)
        : new RegExp(escaped.replace(/\s+/g, '\\s+'));
      if (pattern.test(lower)) {
        score += weight;
      }
    }
    scores[domain] = score;
  }
  let topDomain = 'unknown';
  let topScore = 0;
  for (const [domain, score] of Object.entries(scores)) {
    if (score > topScore) {
      topScore = score;
      topDomain = domain;
    }
  }
  return { domain: topDomain, score: topScore, allScores: scores };
}

function detectPersonalIntent(lower) {
  return PERSONAL_TOKENS.some((t) => lower.includes(t)) ||
    /\b(my|me|i|mine|myself|was\s+i)\b/i.test(lower);
}

function detectPolicyIntent(lower) {
  return POLICY_TOKENS.some((t) => lower.includes(t)) ||
    /\b(policy|rules?|guidelines?|allowed|eligible|eligibility|criteria|carry|encash|accumulate|overtime|probation|consecutive|can\s+i|am\s+i|enough)\b/i.test(lower);
}

function detectManagerScope(lower) {
  const managerTokens = [
    'who reports to me', 'my team', 'team members', 'direct reports',
    'reportees', 'reporting to me', 'pending approvals', 'leave approvals',
    'team attendance', 'team absent', 'team leave', 'team late',
    'regularization approvals', 'approve', 'who is absent', 'who is on leave',
    'how many employees', 'team size',
  ];
  return managerTokens.some((t) => lower.includes(t));
}

function buildIntent(domain, operation, isPersonal, isManagerScope, isPolicyIntent, leaveType, dateRange) {
  if (isManagerScope || domain === 'manager_team') {
    if (/\b(who\s+reports|my\s+team|team\s+members|direct\s+reports)\b/.test(operation || '')) {
      return 'MANAGER_TEAM_MEMBERS';
    }
    if (/\b(absent|who\s+is\s+absent)\b/.test(operation || '')) return 'MANAGER_TEAM_CHECKINS';
    if (/\b(on\s+leave|team\s+leave)\b/.test(operation || '')) return 'MANAGER_TEAM_LEAVE';
    if (/\b(late)\b/.test(operation || '')) return 'MANAGER_TEAM_LATE';
    if (/\b(incomplete\s+punch)\b/.test(operation || '')) return 'MANAGER_TEAM_INCOMPLETE_PUNCHES';
    if (/\b(attendance)\b/.test(operation || '')) return 'MANAGER_TEAM_ATTENDANCE';
    if (/\b(approval|approve)\b/.test(operation || '')) return 'MANAGER_PENDING_LEAVE_APPROVALS';
    if (/\b(regulariz)\b/.test(operation || '')) return 'MANAGER_REGULARIZATION_PENDING';
    return 'MANAGER_TEAM_MEMBERS';
  }

  if (domain === 'profile') {
    if (/\b(manager|report\s+to|supervisor)\b/.test(operation || '')) return 'EMPLOYEE_REPORTING_MANAGER';
    if (/\b(designation|job\s+title|role|position)\b/.test(operation || '')) return 'EMPLOYEE_DESIGNATION';
    if (/\b(department|dept|where\s+do\s+i\s+work)\b/.test(operation || '')) return 'EMPLOYEE_DEPARTMENT';
    if (/\b(joining|doj|when\s+did\s+i\s+join)\b/.test(operation || '')) return 'EMPLOYEE_JOINING_DATE';
    if (/\b(shift)\b/.test(operation || '')) return 'EMPLOYEE_SHIFT';
    if (/\b(code|employee\s+id|emp\s+id|id)\b/.test(operation || '')) return 'EMPLOYEE_PROFILE';
    return 'EMPLOYEE_PROFILE';
  }

  if (domain === 'leave') {
    if (isPersonal && (isPolicyIntent || /\b(carry|encash|consecutive|can\s+i|enough|probation|allowed|eligibility)\b/.test(operation || ''))) {
      return 'HYBRID_LEAVE_APPLICATION';
    }
    if (isPersonal && /\b(history|took|taken|which\s+days|when\s+was\s+i|dates?|past|records?)\b/.test(operation || '')) {
      return 'EMPLOYEE_LEAVE_HISTORY';
    }
    if (isPersonal && /\b(pending|status|waiting)\b/.test(operation || '')) return 'EMPLOYEE_LEAVE_PENDING';
    if (isPersonal) return 'EMPLOYEE_LEAVE_BALANCE';
    return 'POLICY_LEAVE';
  }

  if (domain === 'attendance') {
    if (isPersonal && (isPolicyIntent || /\b(regulariz|missed|fix|can\s+i|correct)\b/.test(operation || ''))) {
      return 'HYBRID_REGULARIZATION';
    }
    if (!isPersonal && !isManagerScope) return 'POLICY_ATTENDANCE';
    if (/\b(today)\b/.test(operation || '') || dateRange?.label === 'Today') return 'ATTENDANCE_TODAY';
    if (/\b(yesterday)\b/.test(operation || '') || dateRange?.label === 'Yesterday') return 'ATTENDANCE_YESTERDAY';
    if (/\b(check\s*in|punch\s+in)\b/.test(operation || '')) return 'ATTENDANCE_CHECK_IN';
    if (/\b(check\s*out|punch\s+out)\b/.test(operation || '')) return 'ATTENDANCE_CHECK_OUT';
    if (/\b(incomplete|missed|forgot)\b/.test(operation || '')) return 'ATTENDANCE_INCOMPLETE_PUNCH';
    if (/\b(month|summary)\b/.test(operation || '')) return 'ATTENDANCE_MONTH';
    return 'ATTENDANCE_TODAY';
  }

  if (domain === 'regularization') {
    if (isPersonal && (isPolicyIntent || /\b(can\s+i|missed|yesterday|fix|correct|allowed|eligibility)\b/.test(operation || ''))) {
      return 'HYBRID_REGULARIZATION';
    }
    if (!isPersonal && !isManagerScope) return 'POLICY_ATTENDANCE';
    if (/\b(pending)\b/.test(operation || '')) return 'EMPLOYEE_REGULARIZATION_PENDING';
    if (/\b(history|have\s+i\s+used|how\s+many\s+times)\b/.test(operation || '')) return 'EMPLOYEE_REGULARIZATION_HISTORY';
    return 'EMPLOYEE_REGULARIZATION_PENDING';
  }

  if (domain === 'bonus') {
    if (isPersonal && isPolicyIntent) return 'HYBRID_BONUS_ELIGIBILITY';
    return 'POLICY_BONUS';
  }

  if (domain === 'salary') return 'EMPLOYEE_SALARY';
  if (domain === 'security') return 'POLICY_SECURITY';
  if (domain === 'conduct') return 'POLICY_CONDUCT';
  if (domain === 'probation') return isPersonal ? 'HYBRID_LEAVE_APPLICATION' : 'POLICY_LEAVE';
  if (domain === 'organization') return 'ORG_EMPLOYEE_COUNT';

  return 'UNKNOWN';
}

function domainToCategory(domain, lower) {
  if (domain === 'bonus') return 'Benefits & Compensation';
  if (domain === 'security') return 'IT & Data Security';
  if (domain === 'conduct') return 'Leave & Employee Conduct';
  if (domain === 'salary') return 'Benefits & Compensation';
  if (domain === 'probation' || domain === 'leave' || domain === 'attendance' || domain === 'regularization') {
    return 'Attendance & Working Hours';
  }
  if (/\b(bonus|incentive|compensation|allowance)\b/.test(lower)) return 'Benefits & Compensation';
  if (/\b(security|vpn|password|laptop|data|remote|wfh)\b/.test(lower)) return 'IT & Data Security';
  if (/\b(conduct|ethics|harassment|gift)\b/.test(lower)) return 'Leave & Employee Conduct';
  return 'Attendance & Working Hours';
}

function isGeneralPolicyQuestion(lower) {
  const generalPolicyPhrases = [
    'what is the', 'what are the', 'how does the company', 'what does the policy',
    'does the company', 'is there a policy', 'company policy', 'our policy',
    'the policy says', 'what is company', 'tell me about the policy',
    'who should i contact', 'who to contact', 'who do i contact',
  ];
  return generalPolicyPhrases.some((p) => lower.includes(p));
}

function resolveFollowUpContext(question = '', history = []) {
  if (!Array.isArray(history) || history.length === 0) return null;

  const lower = normalize(question);
  const lastHistory = history.slice(-6);

  const prevUserMsg = [...lastHistory].reverse().find(
    (m) => m.sender === 'user' || m.role === 'user'
  ) || {};
  const prevUserText = normalize(prevUserMsg.text || prevUserMsg.content || '');

  const prevAssistantMsg = [...lastHistory].reverse().find(
    (m) => m.sender === 'assistant' || m.sender === 'bot' || m.role === 'assistant'
  ) || {};
  const prevAssistantText = normalize(prevAssistantMsg.text || prevAssistantMsg.content || '');

  if (
    /\b(what\s+is\s+)?(his|her|their|the\s+manager'?s?)\s+(email|phone|contact|designation|department|name)\b/i.test(lower) ||
    /\b(email|contact|phone)\s+(of\s+him|of\s+her|of\s+my\s+manager)\b/i.test(lower)
  ) {
    if (
      prevUserText.includes('manager') || prevUserText.includes('report') ||
      prevAssistantText.includes('manager') || prevAssistantText.includes('reporting manager')
    ) {
      return {
        domain: 'profile', operation: 'manager_email', scope: 'self',
        requiresLiveData: true, requiresPolicy: false,
        intent: 'EMPLOYEE_REPORTING_MANAGER', isFollowUp: true, confidence: 0.97,
      };
    }
  }

  if (
    /\b(can\s+i\s+(take|apply|request)|what\s+about)\s+(\d+)\s+days?\b/i.test(lower) ||
    /\b(\d+)\s+days?\s+(leave|off)?\b/i.test(lower)
  ) {
    if (
      prevUserText.includes('leave') || prevAssistantText.includes('leave') ||
      prevAssistantText.includes('earned') || prevAssistantText.includes('casual') ||
      prevAssistantText.includes('balance')
    ) {
      return {
        domain: 'leave', operation: 'eligibility', scope: 'self',
        requiresLiveData: true, requiresPolicy: true,
        policyCategory: 'Attendance & Working Hours', policyTopic: 'leave',
        requestedDuration: extractRequestedDuration(lower),
        intent: 'HYBRID_LEAVE_APPLICATION', isFollowUp: true, confidence: 0.97,
      };
    }
  }

  if (
    /\bwhat\s+does\s+(the\s+)?policy\s+(say|state|mention)(\s+about\s+(it|that|this))?\b/i.test(lower) ||
    /\bpolicy\s+rules?\s+(for|about|on)?\s*(that|this|it)?\b/i.test(lower) ||
    /\bwhat\s+(are|is)\s+(the\s+)?(rules?|regulations?|guidelines?)\b/i.test(lower)
  ) {
    if (prevUserText.includes('leave') || prevAssistantText.includes('leave')) {
      return {
        domain: 'leave', operation: 'rules', scope: 'general',
        requiresLiveData: false, requiresPolicy: true,
        policyCategory: 'Attendance & Working Hours', policyTopic: 'leave',
        intent: 'POLICY_LEAVE', isFollowUp: true, confidence: 0.97,
      };
    }
    if (prevUserText.includes('bonus') || prevAssistantText.includes('bonus')) {
      return {
        domain: 'bonus', operation: 'rules', scope: 'general',
        requiresLiveData: false, requiresPolicy: true,
        policyCategory: 'Benefits & Compensation', policyTopic: 'bonus',
        intent: 'POLICY_BONUS', isFollowUp: true, confidence: 0.97,
      };
    }
    if (prevUserText.includes('regulariz') || prevAssistantText.includes('regulariz') ||
        prevUserText.includes('punch') || prevAssistantText.includes('punch')) {
      return {
        domain: 'regularization', operation: 'rules', scope: 'general',
        requiresLiveData: false, requiresPolicy: true,
        policyCategory: 'Attendance & Working Hours', policyTopic: 'regularization',
        intent: 'POLICY_ATTENDANCE', isFollowUp: true, confidence: 0.97,
      };
    }
    if (prevUserText.includes('attendance') || prevAssistantText.includes('attendance')) {
      return {
        domain: 'attendance', operation: 'rules', scope: 'general',
        requiresLiveData: false, requiresPolicy: true,
        policyCategory: 'Attendance & Working Hours', policyTopic: 'attendance',
        intent: 'POLICY_ATTENDANCE', isFollowUp: true, confidence: 0.97,
      };
    }
    if (prevUserText.includes('security') || prevAssistantText.includes('security') ||
        prevUserText.includes('vpn') || prevAssistantText.includes('vpn')) {
      return {
        domain: 'security', operation: 'rules', scope: 'general',
        requiresLiveData: false, requiresPolicy: true,
        policyCategory: 'IT & Data Security', policyTopic: 'security',
        intent: 'POLICY_SECURITY', isFollowUp: true, confidence: 0.97,
      };
    }
    if (prevUserText.includes('wfh') || prevAssistantText.includes('wfh') ||
        prevUserText.includes('remote') || prevAssistantText.includes('remote')) {
      return {
        domain: 'security', operation: 'rules', scope: 'general',
        requiresLiveData: false, requiresPolicy: true,
        policyCategory: 'IT & Data Security', policyTopic: 'remote_work',
        intent: 'POLICY_SECURITY', isFollowUp: true, confidence: 0.97,
      };
    }
    return {
      domain: 'unknown', operation: 'rules', scope: 'general',
      requiresLiveData: false, requiresPolicy: true,
      policyCategory: null, policyTopic: null,
      intent: 'POLICY_GENERAL', isFollowUp: true, confidence: 0.85,
    };
  }

  if (/\bwhat\s+about\s+(tomorrow|next\s+week|monday|tuesday|wednesday|thursday|friday)\b/i.test(lower)) {
    if (prevUserText.includes('wfh') || prevAssistantText.includes('wfh') ||
        prevUserText.includes('remote') || prevAssistantText.includes('remote') ||
        prevUserText.includes('work from home')) {
      return {
        domain: 'security', operation: 'permission', scope: 'self',
        requiresLiveData: false, requiresPolicy: true,
        policyCategory: 'IT & Data Security', policyTopic: 'remote_work',
        intent: 'POLICY_SECURITY', isFollowUp: true, confidence: 0.92,
      };
    }
    if (prevUserText.includes('leave') || prevAssistantText.includes('leave') ||
        prevUserText.includes('attendance') || prevAssistantText.includes('attendance')) {
      return {
        domain: 'leave', operation: 'eligibility', scope: 'self',
        requiresLiveData: true, requiresPolicy: true,
        policyCategory: 'Attendance & Working Hours', policyTopic: 'leave',
        dateRange: parseDateRange('tomorrow'),
        intent: 'HYBRID_LEAVE_APPLICATION', isFollowUp: true, confidence: 0.92,
      };
    }
  }

  if (/^(it|that|this|same|the same)[\s?!.]*$/.test(lower.trim())) {
    if (prevAssistantText.includes('leave') || prevUserText.includes('leave')) {
      return {
        domain: 'leave', operation: 'balance', scope: 'self',
        requiresLiveData: true, requiresPolicy: false,
        intent: 'EMPLOYEE_LEAVE_BALANCE', isFollowUp: true, confidence: 0.88,
      };
    }
  }

  return null;
}

function extractOperationHint(lower, domain, isManagerScope) {
  if (isManagerScope || domain === 'manager_team') {
    if (/\b(who\s+reports|direct\s+reports?|reportees?|team\s+members?|my\s+team)\b/.test(lower)) return 'who reports to me';
    if (/\b(who\s+is\s+absent|absent)\b/.test(lower)) return 'who is absent';
    if (/\b(who\s+is\s+on\s+leave|team.*on\s+leave|on\s+leave)\b/.test(lower)) return 'on leave';
    if (/\b(late|who\s+came\s+late)\b/.test(lower)) return 'late';
    if (/\b(incomplete\s+punch|missed\s+punch)\b/.test(lower)) return 'incomplete punch';
    if (/\b(attendance)\b/.test(lower)) return 'team attendance';
    if (/\b(approval|approve|pending)\b/.test(lower)) return 'approval';
    if (/\b(regulariz)\b/.test(lower)) return 'regularize';
    return 'who reports to me';
  }

  if (domain === 'profile') {
    if (/\b(manager|report\s+to|supervisor)\b/.test(lower)) return 'manager';
    if (/\b(designation|job\s+title|role|position)\b/.test(lower)) return 'designation';
    if (/\b(department|dept|where\s+do\s+i\s+work)\b/.test(lower)) return 'department';
    if (/\b(joining|doj|when\s+did\s+i\s+join)\b/.test(lower)) return 'joining';
    if (/\b(shift)\b/.test(lower)) return 'shift';
    if (/\b(code|employee\s+id|emp\s+id|id)\b/.test(lower)) return 'code';
    return 'profile';
  }

  if (domain === 'leave') {
    if (/\b(which\s+days|when\s+was\s+i|dates?|history|took|taken|used|past|previous|records?|absent|applied)\b/.test(lower)) {
      return 'history';
    }
    if (/\b(pending|status|waiting)\b/.test(lower)) return 'pending';
    if (/\b(carry\s+forward|carry\s+over|carry\s+into|carry|encash|accumulate)\b/.test(lower)) return 'carry forward';
    if (/\b(can\s+i|enough|quota|eligible|permission|probation|allow)\b/.test(lower)) return 'eligibility';
    if (/\b(balance|how\s+many|how\s+much|remaining|left)\b/.test(lower)) return 'balance';
    return 'balance';
  }

  if (domain === 'attendance') {
    if (/\b(can\s+i|regulariz|fix|correct|missed)\b/.test(lower)) return 'regularize';
    if (/\b(today)\b/.test(lower)) return 'today';
    if (/\b(yesterday)\b/.test(lower)) return 'yesterday';
    if (/\b(check\s*in|punch\s+in|checkin)\b/.test(lower)) return 'check in';
    if (/\b(check\s*out|punch\s+out|checkout)\b/.test(lower)) return 'check out';
    if (/\b(incomplete|missed|forgot)\b/.test(lower)) return 'incomplete punch';
    if (/\b(month|summary|percentage)\b/.test(lower)) return 'month';
    return 'today';
  }

  if (domain === 'regularization') {
    if (/\b(can\s+i|missed|fix|correct|eligible|allowed|permission)\b/.test(lower)) return 'eligibility';
    if (/\b(history|have\s+i\s+used|how\s+many\s+times|records?)\b/.test(lower)) return 'history';
    if (/\b(pending|status)\b/.test(lower)) return 'pending';
    return 'pending';
  }

  return lower.slice(0, 40);
}

function understandQuery(question = '', history = [], _userCtx = {}) {
  const clean = String(question || '').trim();
  const lower = normalize(clean);

  if (!clean) {
    return {
      domain: 'unknown', operation: 'unknown', scope: 'general',
      requiresLiveData: false, requiresPolicy: false,
      requiresClarification: true,
      clarificationPrompt: 'Please tell me what HR information you need.',
      intent: 'CLARIFICATION', confidence: 0.99, rawQuestion: clean,
    };
  }

  if (GREETING_PATTERNS.some((p) => p.test(clean))) {
    return {
      domain: 'general_chat', operation: 'greeting', scope: 'general',
      requiresLiveData: false, requiresPolicy: false,
      intent: 'GENERAL_CHAT', confidence: 0.99, rawQuestion: clean,
    };
  }

  const followUp = resolveFollowUpContext(clean, history);
  if (followUp) {
    return {
      ...followUp,
      leaveType: extractLeaveType(clean) || followUp.leaveType || null,
      requestedDuration: extractRequestedDuration(clean) || followUp.requestedDuration || null,
      dateRange: parseDateRange(clean) || followUp.dateRange || null,
      rawQuestion: clean,
      confidence: followUp.confidence || 0.95,
    };
  }

  const dateRange = parseDateRange(clean);
  const leaveType = extractLeaveType(clean);
  const requestedDuration = extractRequestedDuration(clean);

  const { domain, score: domainScore } = scoreDomains(lower);

  const isPersonal = detectPersonalIntent(lower);
  const isPolicyIntent = detectPolicyIntent(lower);
  const isManagerScope = detectManagerScope(lower);
  const isGeneralPolicy = isGeneralPolicyQuestion(lower);

  let scope = 'self';
  if (isManagerScope) scope = 'team';
  else if (domain === 'organization') scope = 'organization';
  else if (!isPersonal && (isPolicyIntent || isGeneralPolicy)) scope = 'general';

  let requiresLiveData = isPersonal || isManagerScope;
  let requiresPolicy = isPolicyIntent || isGeneralPolicy;

  if (domain === 'profile' || domain === 'salary') {
    requiresLiveData = true;
    requiresPolicy = false;
  }
  if (domain === 'bonus') {
    requiresLiveData = isPersonal;
    requiresPolicy = true;
  }
  if (domain === 'security' || domain === 'conduct') {
    requiresLiveData = false;
    requiresPolicy = true;
  }
  if (domain === 'probation') {
    requiresLiveData = isPersonal;
    requiresPolicy = true;
  }
  if (domain === 'leave') {
    if (!isPersonal) {
      requiresLiveData = false;
      requiresPolicy = true;
    } else if (requestedDuration || /\b(carry|encash|consecutive|can\s+i|enough|quota|probation|allow|during\s+probation)\b/.test(lower) || isPolicyIntent) {
      if (/\b(which\s+days|dates?|history|took|taken|when\s+was\s+i\s+on\s+leave)\b/.test(lower) && !/\b(can\s+i|carry|allowed|eligible|enough)\b/.test(lower)) {
        requiresLiveData = true;
        requiresPolicy = false;
      } else {
        requiresLiveData = true;
        requiresPolicy = true;
      }
    } else {
      requiresLiveData = true;
      requiresPolicy = false;
    }
  }
  if (domain === 'regularization') {
    if (!isPersonal && !isManagerScope) {
      requiresLiveData = false;
      requiresPolicy = true;
    } else if (/\b(can\s+i|fix|correct|missed|allowed|deadline)\b/.test(lower) || isPolicyIntent) {
      requiresLiveData = true;
      requiresPolicy = true;
    } else {
      requiresLiveData = true;
      requiresPolicy = false;
    }
  }
  if (domain === 'attendance') {
    if (!isPersonal && !isManagerScope) {
      requiresLiveData = false;
      requiresPolicy = true;
    } else if (/\b(can\s+i|regulariz|fix|correct|missed|allowed)\b/.test(lower) || isPolicyIntent) {
      requiresLiveData = true;
      requiresPolicy = true;
    } else {
      requiresLiveData = true;
      requiresPolicy = false;
    }
  }

  const policyCategory = requiresPolicy ? domainToCategory(domain, lower) : null;
  let policyTopic = null;
  if (domain === 'leave') policyTopic = leaveType || (/\bcarry\b/.test(lower) ? 'carry_forward' : 'leave');
  else if (domain === 'bonus') policyTopic = 'bonus';
  else if (domain === 'security') policyTopic = /\bwfh\b|\bremote\b|\bwork\s+from\s+home\b/.test(lower) ? 'remote_work' : 'security';
  else if (domain === 'conduct') policyTopic = 'conduct';
  else if (domain === 'probation') policyTopic = 'probation';
  else if (domain === 'regularization') policyTopic = 'regularization';
  else if (domain === 'attendance') policyTopic = /\bovertime\b/.test(lower) ? 'overtime' : 'attendance';

  const operationHint = extractOperationHint(lower, domain, isManagerScope);
  const intent = buildIntent(domain, operationHint, isPersonal, isManagerScope, isPolicyIntent, leaveType, dateRange);

  const confidence = domainScore >= 4 ? 0.97
    : domainScore >= 2 ? 0.92
    : isPolicyIntent ? 0.75
    : 0.60;

  if (domain === 'unknown' || domainScore < 2) {
    if (isPolicyIntent || isGeneralPolicy) {
      return {
        domain: 'unknown', operation: 'rules', scope: 'general',
        requiresLiveData: false, requiresPolicy: true,
        policyCategory: domainToCategory('unknown', lower),
        policyTopic: null,
        intent: 'POLICY_GENERAL',
        confidence: 0.70,
        rawQuestion: clean,
        leaveType, dateRange, requestedDuration,
      };
    }
    if (isPersonal) {
      return {
        domain: 'profile', operation: 'profile', scope: 'self',
        requiresLiveData: true, requiresPolicy: false,
        intent: 'EMPLOYEE_PROFILE',
        confidence: 0.60,
        rawQuestion: clean,
        leaveType, dateRange, requestedDuration,
      };
    }
    return {
      domain: 'unknown', operation: 'unknown', scope: 'general',
      requiresLiveData: false, requiresPolicy: false,
      intent: 'UNKNOWN', confidence: 0.3, rawQuestion: clean,
      leaveType: null, dateRange: null, requestedDuration: null,
    };
  }

  return {
    domain,
    operation: operationHint,
    scope,
    requiresLiveData,
    requiresPolicy,
    requiresClarification: false,
    clarificationPrompt: null,
    policyCategory,
    policyTopic,
    leaveType,
    requestedDuration,
    dateRange,
    intent,
    isFollowUp: false,
    confidence,
    rawQuestion: clean,
  };
}

module.exports = {
  understandQuery,
  parseDateRange,
  extractLeaveType,
  extractRequestedDuration,
  scoreDomains,
  detectPersonalIntent,
  detectPolicyIntent,
};