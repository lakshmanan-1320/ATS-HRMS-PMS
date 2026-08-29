/**
 * dataSourceRouter.service.js
 * Routes requests to data layer (live SQL) and/or RAG layer (vector search).
 * Enforces role, tenant, and policy category boundaries.
 */

'use strict';

const employeeData = require('../data/employeeData.service');
const attendanceData = require('../data/attendanceData.service');
const leaveData = require('../data/leaveData.service');
const organizationData = require('../data/organizationData.service');
const regularizationData = require('../data/regularizationData.service');
const payrollData = require('../data/payrollData.service');
const policyRetriever = require('../rag/policyRetriever.service');
const logger = require('../../config/logger');

/**
 * Maps an intent to its primary policy category filter for targeted RAG retrieval.
 */
function getTargetPolicyCategory(intent, intentResult) {
  if (intentResult?.policyCategory) return intentResult.policyCategory;

  switch (intent) {
    case 'POLICY_ATTENDANCE':
    case 'POLICY_REGULARIZATION':
    case 'POLICY_LEAVE':
    case 'POLICY_WORKING_HOURS':
    case 'HYBRID_ATTENDANCE_REGULARIZATION':
    case 'HYBRID_LEAVE_APPLICATION':
    case 'HYBRID_REGULARIZATION':
    case 'EMPLOYEE_PUNCH':
    case 'EMPLOYEE_LEAVE_APPLICATION':
    case 'HYBRID_OVERTIME':
      return 'Attendance & Working Hours';

    case 'POLICY_BONUS':
    case 'HYBRID_BONUS_ELIGIBILITY':
      return 'Benefits & Compensation';

    case 'POLICY_SECURITY':
    case 'HYBRID_REMOTE_WORK_SECURITY':
      return 'IT & Data Security';

    case 'POLICY_CONDUCT':
      return 'Leave & Employee Conduct';

    default:
      return null;
  }
}

/**
 * Executes the data retrieval stage according to the query plan.
 * @param {object} plan - Execution plan from queryPlanner
 * @param {object} params - Request context & parameters
 * @returns {Promise<object>}
 */
async function routeAndFetch(plan, params) {
  const { context, intentResult, message, category, perf = {} } = params;
  const { employeeId, organizationId, isEmployee, role } = context;
  const { intent, dateRange, leaveTypeFilter } = intentResult;

  let liveData = null;
  let policyChunks = [];

  const tasks = [];

  // 1. Fetch Live HRMS DB Data if planned
  if (plan.useDb) {
    tasks.push(
      (async () => {
        const tDb = performance.now();
        try {
          switch (intent) {
            // ── Employee Self: Regularization ──
            case 'EMPLOYEE_REGULARIZATION_PENDING':
              if (isEmployee) {
                liveData = { pendingRegularizations: await regularizationData.getPendingRegularizationRequests(employeeId, organizationId) };
              }
              break;

            case 'EMPLOYEE_REGULARIZATION_HISTORY':
              if (isEmployee) {
                const effectiveRange = dateRange && dateRange.explicit ? dateRange : null;
                liveData = { regularizationHistory: await regularizationData.getRegularizationHistory(employeeId, organizationId, effectiveRange) };
              }
              break;

            // ── Employee Self: Attendance Punches ──
            case 'ATTENDANCE_INCOMPLETE_PUNCH':
              if (isEmployee) {
                liveData = { incompletePunches: await attendanceData.getIncompletePunches(employeeId, organizationId) };
              }
              break;

            case 'ATTENDANCE_CHECK_IN':
            case 'ATTENDANCE_CHECK_OUT':
            case 'ATTENDANCE_TODAY':
            case 'EMPLOYEE_PUNCH':
              if (isEmployee) {
                const targetDate = dateRange?.startDate || null;
                const label = dateRange?.label || 'Today';
                liveData = { todayAttendance: await attendanceData.getDayAttendance(employeeId, organizationId, targetDate, label) };
              }
              break;

            case 'ATTENDANCE_YESTERDAY':
              if (isEmployee) {
                liveData = { yesterdayAttendance: await attendanceData.getYesterdayAttendance(employeeId, organizationId) };
              }
              break;

            case 'ATTENDANCE_MONTH':
            case 'EMPLOYEE_ATTENDANCE':
            case 'EMPLOYEE_ABSENCE':
              if (isEmployee) {
                const effectiveRange = dateRange && dateRange.explicit ? dateRange : null;
                liveData = { attendanceSummary: await attendanceData.getAttendanceSummary(employeeId, organizationId, effectiveRange) };
              }
              break;

            // ── Employee Self: Leave ──
            case 'EMPLOYEE_LEAVE_BALANCE':
              if (isEmployee) {
                liveData = { leaveBalance: await leaveData.getEmployeeLeaveBalance(employeeId, organizationId, leaveTypeFilter) };
              }
              break;

            case 'EMPLOYEE_LEAVE_HISTORY':
              if (isEmployee) {
                const effectiveRange = dateRange && dateRange.explicit ? dateRange : null;
                liveData = { leaveHistory: await leaveData.getEmployeeLeaveHistory(employeeId, organizationId, effectiveRange, 20) };
              }
              break;

            case 'EMPLOYEE_LEAVE_PENDING':
              if (isEmployee) {
                liveData = { pendingLeaves: await leaveData.getEmployeePendingLeaveRequests(employeeId, organizationId) };
              }
              break;

            // ── Employee Self: Attributes & Profile ──
            case 'EMPLOYEE_REPORTING_MANAGER':
              if (isEmployee) {
                liveData = { reportingManager: await employeeData.getReportingManager(employeeId, organizationId) };
              }
              break;

            case 'EMPLOYEE_SHIFT':
              if (isEmployee) {
                liveData = { shift: await employeeData.getCurrentShift(employeeId, organizationId) };
              }
              break;

            case 'EMPLOYEE_DEPARTMENT':
              if (isEmployee) {
                liveData = { department: await employeeData.getDepartment(employeeId, organizationId) };
              }
              break;

            case 'EMPLOYEE_DESIGNATION':
              if (isEmployee) {
                liveData = { designation: await employeeData.getDesignation(employeeId, organizationId) };
              }
              break;

            case 'EMPLOYEE_JOINING_DATE':
              if (isEmployee) {
                liveData = { joiningDate: await employeeData.getJoiningDate(employeeId, organizationId) };
              }
              break;

            case 'EMPLOYEE_SALARY':
              if (isEmployee) {
                liveData = { salaryInfo: await payrollData.getMySalaryInfo(employeeId, organizationId) };
              }
              break;

            case 'EMPLOYEE_PROFILE':
              if (isEmployee) {
                liveData = { profile: await employeeData.getEmployeeProfile(employeeId, organizationId) };
              }
              break;

            // ── Manager: Team Members & Hierarchy ──
            case 'MANAGER_TEAM_MEMBERS':
              logger.info(`[AI ROUTER] Question: "${message}" | Role: ${role} | Intent: MANAGER_TEAM_MEMBERS | Mode: LIVE_DB`);
              logger.info(`[Team Data] Manager employee ID: ${employeeId} | org: ${organizationId}`);
              liveData = { teamMembers: await employeeData.getTeamMembers(employeeId, organizationId) };
              break;

            // ── Manager: Team Attendance, Checkins, Absences & Punches ──
            case 'MANAGER_TEAM_ATTENDANCE':
            case 'TEAM_ATTENDANCE':
              if (role === 'manager') {
                liveData = {
                  attendanceSummary: await attendanceData.getAttendanceSummary(employeeId, organizationId, dateRange && dateRange.explicit ? dateRange : null),
                  teamCheckins: await attendanceData.getTeamCheckinStatus(employeeId, organizationId),
                  scope: 'team',
                };
              } else {
                liveData = { attendanceSummary: await attendanceData.getAttendanceSummary(employeeId, organizationId, dateRange && dateRange.explicit ? dateRange : null), scope: 'self' };
              }
              break;

            case 'MANAGER_TEAM_CHECKINS':
              liveData = { teamCheckins: await attendanceData.getTeamCheckinStatus(employeeId, organizationId) };
              break;

            case 'MANAGER_TEAM_ABSENCES':
            case 'CURRENT_ABSENCES':
              if (role === 'manager') {
                liveData = { absentToday: await attendanceData.getEmployeesAbsentToday(organizationId, employeeId), scope: 'team' };
              } else {
                liveData = { absentToday: await attendanceData.getEmployeesAbsentToday(organizationId), scope: 'org' };
              }
              break;

            case 'MANAGER_TEAM_LATE':
              liveData = { lateArrivals: await attendanceData.getTeamLateArrivals(employeeId, organizationId) };
              break;

            case 'MANAGER_TEAM_INCOMPLETE_PUNCHES':
              liveData = { teamIncompletePunches: await attendanceData.getTeamIncompletePunches(employeeId, organizationId) };
              break;

            // ── Manager: Team Leave & Leave History ──
            case 'MANAGER_TEAM_LEAVE':
            case 'EMPLOYEES_ON_LEAVE':
              if (role === 'manager') {
                liveData = { onLeaveToday: await leaveData.getEmployeesCurrentlyOnLeave(organizationId, employeeId), scope: 'team' };
              } else if (role === 'employee') {
                liveData = { onLeaveToday: await leaveData.getEmployeesCurrentlyOnLeave(organizationId), scope: 'self' };
              } else {
                liveData = { onLeaveToday: await leaveData.getEmployeesCurrentlyOnLeave(organizationId), scope: 'org' };
              }
              break;

            case 'MANAGER_TEAM_LEAVE_HISTORY':
              liveData = { teamLeaveHistory: await leaveData.getTeamLeaveHistory(employeeId, organizationId) };
              break;

            // ── Manager: Regularization & Approvals ──
            case 'MANAGER_REGULARIZATION_PENDING':
              liveData = { managerRegularizationPending: await regularizationData.getManagerRegularizationPending(employeeId, organizationId) };
              break;

            case 'MANAGER_REGULARIZATION_HISTORY':
              liveData = { managerRegularizationHistory: await regularizationData.getManagerRegularizationHistory(employeeId, organizationId) };
              break;

            case 'MANAGER_PENDING_APPROVALS':
            case 'MANAGER_PENDING_LEAVE_APPROVALS':
            case 'MANAGER_PENDING_REGULARIZATION_APPROVALS':
            case 'PENDING_APPROVALS':
              liveData = {
                pendingApprovals: await regularizationData.getPendingApprovals(
                  organizationId,
                  role === 'manager' ? employeeId : null
                ),
                scope: role === 'manager' ? 'team' : 'org',
                filter: intent === 'MANAGER_PENDING_LEAVE_APPROVALS' ? 'leave' : intent === 'MANAGER_PENDING_REGULARIZATION_APPROVALS' ? 'reg' : 'all',
              };
              break;

            // ── Organization Level: HR / Admin ──
            case 'ORG_EMPLOYEE_COUNT':
            case 'EMPLOYEE_COUNT':
              liveData = { employeeCount: await organizationData.getTotalEmployees(organizationId) };
              break;

            case 'ORG_CHECKINS':
            case 'CURRENT_CHECKINS':
              liveData = { checkinCount: await attendanceData.getCurrentCheckins(organizationId) };
              break;

            case 'ORG_ABSENCES':
              liveData = { absentToday: await attendanceData.getEmployeesAbsentToday(organizationId), scope: 'org' };
              break;

            case 'ORG_LEAVE':
              liveData = { onLeaveToday: await leaveData.getEmployeesCurrentlyOnLeave(organizationId), scope: 'org' };
              break;

            case 'ORG_PENDING_APPROVALS':
              liveData = {
                pendingApprovals: await regularizationData.getPendingApprovals(organizationId, null),
                scope: 'org',
                filter: 'all',
              };
              break;

            // ── Hybrid Data Aggregation ──
            case 'HYBRID_ATTENDANCE_REGULARIZATION':
            case 'HYBRID_REGULARIZATION':
              if (isEmployee) {
                const [pending, yestPunch, incomplete] = await Promise.all([
                  regularizationData.getPendingRegularizationRequests(employeeId, organizationId),
                  attendanceData.getYesterdayAttendance(employeeId, organizationId),
                  attendanceData.getIncompletePunches(employeeId, organizationId),
                ]);
                liveData = { pendingRegularizations: pending, yesterdayAttendance: yestPunch, incompletePunches: incomplete };
              }
              break;

            case 'HYBRID_LEAVE_APPLICATION':
            case 'EMPLOYEE_LEAVE_APPLICATION':
              if (isEmployee) {
                const [balance, pending] = await Promise.all([
                  leaveData.getEmployeeLeaveBalance(employeeId, organizationId, leaveTypeFilter),
                  leaveData.getEmployeePendingLeaveRequests(employeeId, organizationId),
                ]);
                liveData = { leaveBalance: balance, pendingLeaves: pending };
              }
              break;

            case 'HYBRID_BONUS_ELIGIBILITY':
            case 'POLICY_BONUS':
              if (isEmployee) {
                const [joining, salary, att] = await Promise.all([
                  employeeData.getJoiningDate(employeeId, organizationId),
                  payrollData.getMySalaryInfo(employeeId, organizationId),
                  attendanceData.getAttendanceSummary(employeeId, organizationId),
                ]);
                liveData = { joiningDate: joining, salaryInfo: salary, attendanceSummary: att };
              }
              break;

            case 'HYBRID_OVERTIME':
              if (isEmployee) {
                const [shift, todayPunch] = await Promise.all([
                  employeeData.getCurrentShift(employeeId, organizationId),
                  attendanceData.getTodayAttendance(employeeId, organizationId),
                ]);
                liveData = { shift, todayAttendance: todayPunch };
              }
              break;

            default:
              break;
          }
          perf.employeeQueryMs = Math.round(performance.now() - tDb);
        } catch (err) {
          perf.employeeQueryMs = Math.round(performance.now() - tDb);
          logger.error(`[Router:DB] Error fetching data for intent=${intent}:`, err.message);
        }
      })()
    );
  }

  // 2. Fetch Policy Chunks if planned
  if (plan.useRag) {
    tasks.push(
      (async () => {
        const tEmbed = performance.now();
        try {
          const targetCat = getTargetPolicyCategory(intent, intentResult) || category;
          const options = { category: targetCat };
          if (targetCat) {
            options.categories = [targetCat];
          }
          policyChunks = (await policyRetriever.retrievePolicies(organizationId, message, 3, options)) || [];
          perf.embeddingMs = Math.round(performance.now() - tEmbed);
          perf.chunksRetrieved = policyChunks.length;
        } catch (err) {
          perf.embeddingMs = Math.round(performance.now() - tEmbed);
          logger.error(`[Router:RAG] Policy retrieval error for intent=${intent}:`, err.message);
          policyChunks = [];
        }
      })()
    );
  }

  await Promise.all(tasks);

  return {
    liveData,
    policyChunks,
  };
}

module.exports = {
  routeAndFetch,
  getTargetPolicyCategory,
};
