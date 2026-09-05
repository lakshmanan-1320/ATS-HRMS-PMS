/**
 * hrmsDataRetriever.service.js
 *
 * Centralized, parameterized HRMS Data Retrieval Service.
 * Fetches verified factual data directly from PostgreSQL for the authenticated user/tenant.
 *
 * Enforces:
 * - Strict tenant isolation (organization_id on every query)
 * - Strict employee isolation (employee_id for self queries)
 * - Strict manager hierarchy (manager_employee_id for team queries)
 * - Role authorization checked BEFORE this layer is called
 *
 * SEMANTIC FALLBACK:
 * When domain/operation from semantic scoring doesn't map to a specific handler,
 * this service fetches the most relevant context (profile + leave balance) for
 * hybrid reasoning by the LLM. This ensures questions never previously seen still
 * get factual employee data rather than an empty context.
 */

'use strict';

const employeeData = require('./employeeData.service');
const attendanceData = require('./attendanceData.service');
const leaveData = require('./leaveData.service');
const regularizationData = require('./regularizationData.service');
const payrollData = require('./payrollData.service');
const organizationData = require('./organizationData.service');
const logger = require('../../config/logger');

/**
 * Retrieves live HRMS database records required by the query understanding.
 *
 * @param {object} understanding - Output from queryUnderstanding / intentClassifier
 * @param {object} context - Authenticated employee context
 * @returns {Promise<object|null>}
 */
async function fetchHrmsData(understanding, context) {
  if (!context || !context.organizationId) return null;

  const { organizationId, employeeId, isEmployee, role } = context;
  const { domain, operation, scope, dateRange, leaveType, intent } = understanding;

  try {
    // ── 1. SELF-SCOPED QUERIES ───────────────────────────────────────────────
    if (scope === 'self' || (!scope && isEmployee)) {
      if (!isEmployee || !employeeId) {
        return {
          noEmployeeRecord: true,
          message: 'No personal employee profile is associated with this account.',
        };
      }

      // ── Profile & Hierarchy ──────────────────────────────────────────────
      if (domain === 'profile') {
        const op = String(operation || '').toLowerCase();
        if (op.includes('manager') || op.includes('report') || op.includes('supervisor') ||
            intent === 'EMPLOYEE_REPORTING_MANAGER') {
          const managerInfo = await employeeData.getReportingManager(employeeId, organizationId);
          return { managerInfo };
        }
        if (op.includes('designation') || op.includes('job title') ||
            intent === 'EMPLOYEE_DESIGNATION') {
          const designationInfo = await employeeData.getDesignation(employeeId, organizationId);
          return { designationInfo };
        }
        if (op.includes('department') || intent === 'EMPLOYEE_DEPARTMENT') {
          const departmentInfo = await employeeData.getDepartment(employeeId, organizationId);
          return { departmentInfo };
        }
        if (op.includes('joining') || op.includes('doj') || intent === 'EMPLOYEE_JOINING_DATE') {
          const joiningDateInfo = await employeeData.getJoiningDate(employeeId, organizationId);
          return { joiningDateInfo };
        }
        if (op.includes('shift') || intent === 'EMPLOYEE_SHIFT') {
          const shiftInfo = await employeeData.getCurrentShift(employeeId, organizationId);
          return { shiftInfo };
        }
        // Default: full profile (employee code, email, status, etc.)
        const profile = await employeeData.getEmployeeProfile(employeeId, organizationId);
        return { profile };
      }

      // ── Leave ────────────────────────────────────────────────────────────
      if (domain === 'leave') {
        const op = String(operation || '').toLowerCase();
        if (op.includes('history') || op.includes('took') || op.includes('taken') ||
            intent === 'EMPLOYEE_LEAVE_HISTORY') {
          const leaveHistory = await leaveData.getEmployeeLeaveHistory(employeeId, organizationId, dateRange);
          return { leaveHistory };
        }
        if (op.includes('pending') || op.includes('status') || op.includes('waiting') ||
            intent === 'EMPLOYEE_LEAVE_PENDING') {
          const pendingLeaves = await leaveData.getEmployeePendingLeaveRequests(employeeId, organizationId);
          return { pendingLeaves };
        }
        // For eligibility (hybrid) fetch both balance + profile
        if (intent === 'HYBRID_LEAVE_APPLICATION' || op.includes('eligibility') || op.includes('carry')) {
          const [leaveBalance, profile] = await Promise.all([
            leaveData.getEmployeeLeaveBalance(employeeId, organizationId, leaveType),
            employeeData.getEmployeeProfile(employeeId, organizationId),
          ]);
          return { leaveBalance, profile };
        }
        // Default: leave balance
        const leaveBalance = await leaveData.getEmployeeLeaveBalance(employeeId, organizationId, leaveType);
        return { leaveBalance };
      }

      // ── Attendance ────────────────────────────────────────────────────────
      if (domain === 'attendance') {
        const op = String(operation || '').toLowerCase();
        if (op.includes('yesterday') || intent === 'ATTENDANCE_YESTERDAY') {
          const yesterdayAttendance = await attendanceData.getYesterdayAttendance(employeeId, organizationId);
          return { yesterdayAttendance };
        }
        if (op.includes('check in') || op.includes('punch in') || intent === 'ATTENDANCE_CHECK_IN') {
          const targetDate = dateRange?.startDate || null;
          const label = dateRange?.label || 'Today';
          const dayAttendance = await attendanceData.getDayAttendance(employeeId, organizationId, targetDate, label);
          return { dayAttendance, todayAttendance: dayAttendance };
        }
        if (op.includes('check out') || op.includes('punch out') || intent === 'ATTENDANCE_CHECK_OUT') {
          const targetDate = dateRange?.startDate || null;
          const label = dateRange?.label || 'Today';
          const dayAttendance = await attendanceData.getDayAttendance(employeeId, organizationId, targetDate, label);
          return { dayAttendance, todayAttendance: dayAttendance };
        }
        if (op.includes('incomplete') || op.includes('missed') || op.includes('forgot') ||
            intent === 'ATTENDANCE_INCOMPLETE_PUNCH') {
          const incompletePunches = await attendanceData.getIncompletePunches(employeeId, organizationId);
          return { incompletePunches };
        }
        if (op.includes('month') || op.includes('summary') || intent === 'ATTENDANCE_MONTH') {
          const attendanceSummary = await attendanceData.getAttendanceSummary(employeeId, organizationId, dateRange);
          return { attendanceSummary };
        }
        // Default: today
        const todayAttendance = await attendanceData.getTodayAttendance(employeeId, organizationId);
        return { todayAttendance };
      }

      // ── Regularization ────────────────────────────────────────────────────
      if (domain === 'regularization' || intent === 'HYBRID_REGULARIZATION') {
        const op = String(operation || '').toLowerCase();
        if (op.includes('history') || op.includes('used') || op.includes('how many times') ||
            intent === 'EMPLOYEE_REGULARIZATION_HISTORY') {
          const regularizationHistory = await regularizationData.getRegularizationHistory(employeeId, organizationId, dateRange);
          return { regularizationHistory };
        }
        // Hybrid regularization eligibility
        if (intent === 'HYBRID_REGULARIZATION' || op.includes('eligibility') || op.includes('regularize')) {
          const [yesterdayAttendance, pendingRegularizations, incompletePunches, profile] = await Promise.all([
            attendanceData.getYesterdayAttendance(employeeId, organizationId),
            regularizationData.getPendingRegularizationRequests(employeeId, organizationId),
            attendanceData.getIncompletePunches(employeeId, organizationId),
            employeeData.getEmployeeProfile(employeeId, organizationId),
          ]);
          return { yesterdayAttendance, pendingRegularizations, incompletePunches, profile };
        }
        // Default: pending
        const pendingRegularizations = await regularizationData.getPendingRegularizationRequests(employeeId, organizationId);
        return { pendingRegularizations };
      }

      // ── Salary ────────────────────────────────────────────────────────────
      if (domain === 'salary' || intent === 'EMPLOYEE_SALARY') {
        const salaryInfo = await payrollData.getMySalaryInfo(employeeId, organizationId);
        return { salaryInfo };
      }

      // ── Bonus Eligibility (Hybrid) ────────────────────────────────────────
      if (domain === 'bonus' || intent === 'HYBRID_BONUS_ELIGIBILITY') {
        const profile = await employeeData.getEmployeeProfile(employeeId, organizationId);
        return { profile };
      }

      // ── Probation (Hybrid) ────────────────────────────────────────────────
      if (domain === 'probation' || intent === 'HYBRID_PROBATION') {
        const [profile, leaveBalance] = await Promise.all([
          employeeData.getEmployeeProfile(employeeId, organizationId),
          leaveData.getEmployeeLeaveBalance(employeeId, organizationId, null),
        ]);
        return { profile, leaveBalance };
      }

      // ── Security / Remote Work (Hybrid) ───────────────────────────────────
      if (domain === 'security' && understanding.requiresLiveData) {
        const profile = await employeeData.getEmployeeProfile(employeeId, organizationId);
        return { profile };
      }

      // ── SEMANTIC FALLBACK: Any unrecognized self-scoped query ─────────────
      // Fetch the most broadly useful context: profile + leave balance.
      // This ensures novel questions the system has never seen still get
      // factual employee data for the LLM to reason with.
      logger.info(`[HrmsDataRetriever] Semantic fallback fetch for domain=${domain}, operation=${operation}, intent=${intent}`);
      const [profile, leaveBalance] = await Promise.all([
        employeeData.getEmployeeProfile(employeeId, organizationId),
        leaveData.getEmployeeLeaveBalance(employeeId, organizationId, null),
      ]);
      return { profile, leaveBalance };
    }

    // ── 2. MANAGER TEAM-SCOPED QUERIES ──────────────────────────────────────
    if (scope === 'team') {
      // Must have an employee record (manager's employee ID is used for team scoping)
      if (!employeeId) {
        return {
          noEmployeeRecord: true,
          message: 'No manager employee profile is associated with this account.',
        };
      }

      const op = String(operation || '').toLowerCase();
      const intentStr = String(intent || '').toLowerCase();

      if (op.includes('who reports to me') || op.includes('team members') || op.includes('direct reports') ||
          intentStr.includes('team_members') || intentStr === 'manager_team_members') {
        const teamMembers = await employeeData.getTeamMembers(employeeId, organizationId);
        return { teamMembers };
      }
      if (op.includes('who is absent') || op.includes('absent') ||
          intentStr.includes('team_checkins') || intentStr.includes('team_absences')) {
        const [checkinStatus, absentList] = await Promise.all([
          attendanceData.getTeamCheckinStatus(employeeId, organizationId),
          attendanceData.getEmployeesAbsentToday(organizationId, employeeId),
        ]);
        return { checkinStatus, absentList };
      }
      if (op.includes('on leave') || op.includes('team leave') ||
          intentStr.includes('team_leave')) {
        const teamOnLeave = await leaveData.getEmployeesCurrentlyOnLeave(organizationId, employeeId);
        return { teamOnLeave };
      }
      if (op.includes('late') || intentStr.includes('team_late')) {
        const lateArrivals = await attendanceData.getTeamLateArrivals(employeeId, organizationId);
        return { lateArrivals };
      }
      if (op.includes('incomplete punch') || intentStr.includes('incomplete_punches')) {
        const teamIncompletePunches = await attendanceData.getTeamIncompletePunches(employeeId, organizationId);
        return { teamIncompletePunches };
      }
      if (op.includes('team attendance') || intentStr.includes('team_attendance')) {
        const teamAttendance = await attendanceData.getTeamCheckinStatus(employeeId, organizationId);
        return { teamAttendance };
      }
      if (op.includes('regularize') || intentStr.includes('regularization_pending')) {
        const pendingRegularizations = await regularizationData.getManagerRegularizationPending(employeeId, organizationId);
        return { pendingRegularizations };
      }
      if (op.includes('approval') || op.includes('approve') || op.includes('pending') ||
          intentStr.includes('leave_approvals') || intentStr.includes('pending_approvals')) {
        const pendingApprovals = await regularizationData.getPendingApprovals(organizationId, employeeId);
        return { pendingApprovals };
      }
      if (intentStr.includes('leave_history')) {
        const teamLeaveHistory = await leaveData.getTeamLeaveHistory(employeeId, organizationId);
        return { teamLeaveHistory };
      }

      // Semantic fallback for team scope — return team members + check-in status
      const [teamMembers, checkinStatus] = await Promise.all([
        employeeData.getTeamMembers(employeeId, organizationId),
        attendanceData.getTeamCheckinStatus(employeeId, organizationId),
      ]);
      return { teamMembers, checkinStatus };
    }

    // ── 3. ORGANIZATION-SCOPED QUERIES ──────────────────────────────────────
    if (scope === 'organization') {
      const op = String(operation || intent || '').toLowerCase();
      if (op.includes('employee_count') || op.includes('total')) {
        const totalEmployees = await organizationData.getTotalEmployees(organizationId);
        return { totalEmployees };
      }
      if (op.includes('org_leave') || op.includes('on leave')) {
        const orgLeave = await leaveData.getEmployeesCurrentlyOnLeave(organizationId);
        return { orgLeave };
      }
      if (op.includes('org_checkins') || op.includes('check in')) {
        const orgCheckins = await attendanceData.getCurrentCheckins(organizationId);
        return { orgCheckins };
      }
      if (op.includes('org_absences') || op.includes('absent')) {
        const orgAbsences = await attendanceData.getEmployeesAbsentToday(organizationId);
        return { orgAbsences };
      }
      if (op.includes('pending_approvals') || op.includes('approval')) {
        const pendingApprovals = await regularizationData.getPendingApprovals(organizationId);
        return { pendingApprovals };
      }
      const totalEmployees = await organizationData.getTotalEmployees(organizationId);
      return { totalEmployees };
    }

    return null;
  } catch (err) {
    logger.error('[HrmsDataRetriever] Error fetching data:', err.message);
    return { error: err.message };
  }
}

module.exports = {
  fetchHrmsData,
};
