/**
 * aiAuthorization.service.js
 * Pre-retrieval role-based access control and prompt security guard.
 *
 * Enforces:
 * 1. Prompt Injection detection (jailbreaks, rule-overrides, system prompt leakage).
 * 2. Sensitive Field Access Guard (e.g. cross-employee salary/compensation queries).
 * 3. Role-Based Scope Authorization (determines whether a role can query org/team data).
 * 4. Tenant boundaries (always parameterized by authenticated organization ID).
 */

'use strict';

const ORG_ADMIN_ROLES = new Set(['hr', 'hr_admin', 'client_admin', 'super_admin']);
const MANAGER_ROLES = new Set(['manager', 'hr', 'hr_admin', 'client_admin', 'super_admin']);

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|rules?|prompts?)/i,
  /reveal\s+(your\s+)?(system\s+prompt|instructions?|rules?|database|password|credentials?)/i,
  /show\s+me\s+(everyone|all\s+employees?|all\s+salaries|database|credentials)/i,
  /you\s+are\s+now\s+(a\s+)?(different|another|new)\s+(ai|assistant|bot)/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /act\s+as\s+(if\s+you\s+(are|were)\s+)?/i,
  /bypass\s+(security|permissions?|rules?|policies)/i,
  /drop\s+table|delete\s+from|insert\s+into|update\s+\w+\s+set/i,
];

const SENSITIVE_FIELD_PATTERNS = [
  /\b(salary|payroll|compensation|gross salary|net salary|bonus amount|pay slip|bank account)\b/i,
];

/**
 * Checks if query contains potential prompt injection or jailbreak attempts.
 * @param {string} text
 * @returns {boolean}
 */
function isPotentialPromptInjection(text = '') {
  const clean = text.trim();
  return INJECTION_PATTERNS.some((pattern) => pattern.test(clean));
}

/**
 * Checks if a user is querying sensitive personal data (e.g., someone else's salary).
 * @param {string} text - User message
 * @param {string} role - Authenticated user role
 * @returns {boolean}
 */
function isUnauthorizedSensitiveQuery(text = '', role = 'employee') {
  const lower = text.toLowerCase();

  // Querying another employee's / manager's salary
  const asksOtherSalary =
    /\b(manager|team|colleague|other\s+employee|someone|another|everyone|all)\b/i.test(lower) &&
    SENSITIVE_FIELD_PATTERNS.some((p) => p.test(lower));

  const asksManagerSalaryDirectly =
    /\bmy\s+manager\b.*\bsalary\b|\bmanager\b.*\bsalary\b/i.test(lower);

  // Cross-tenant queries
  const asksOtherOrg =
    /\b(other\s+organization|another\s+organization|different\s+company|other\s+tenant)\b/i.test(lower);

  // Regular employee asking for unnamed sensitive compensation data
  const isEmployee = role === 'employee';
  const asksGenericSensitive =
    isEmployee &&
    SENSITIVE_FIELD_PATTERNS.some((p) => p.test(lower)) &&
    !/\b(my\s+(salary|payroll|bonus|pay)|me|mine|myself)\b/i.test(lower);

  return asksOtherSalary || asksManagerSalaryDirectly || asksOtherOrg || asksGenericSensitive;
}

/**
 * Validates if the authenticated role is authorized to perform the requested intent.
 * @param {object} context - Authenticated employee context
 * @param {string} intent - Detected intent
 * @returns {{ allowed: boolean, reason?: string }}
 */
function validateRoleAccess(context, intent) {
  const role = (context.role || 'employee').toLowerCase();
  const isAdmin = context.isAdmin || ORG_ADMIN_ROLES.has(role);
  const isManager = MANAGER_ROLES.has(role);

  switch (intent) {
    case 'EMPLOYEE_COUNT':
      if (!isAdmin) {
        return {
          allowed: false,
          reason: 'Employee count is accessible to HR and Administrators.',
        };
      }
      return { allowed: true };

    case 'CURRENT_CHECKINS':
      if (!isManager && !isAdmin) {
        return {
          allowed: false,
          reason: 'Real-time check-in counts are accessible to Managers and HR.',
        };
      }
      return { allowed: true };

    case 'EMPLOYEES_ON_LEAVE':
      // Employees only see their own status; Managers see team; HR/Admin see org
      return { allowed: true };

    case 'TEAM_ATTENDANCE':
    case 'TEAM_LEAVE':
    case 'CURRENT_ABSENCES':
      if (!isManager && !isAdmin) {
        return {
          allowed: false,
          reason: 'Team attendance and leave information are accessible to Managers and HR.',
        };
      }
      return { allowed: true };

    default:
      return { allowed: true };
  }
}

module.exports = {
  isPotentialPromptInjection,
  isUnauthorizedSensitiveQuery,
  validateRoleAccess,
  ORG_ADMIN_ROLES,
  MANAGER_ROLES,
};
