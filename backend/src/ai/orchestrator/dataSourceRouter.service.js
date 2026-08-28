/**
 * dataSourceRouter.service.js
 * Routes requests to data layer (live SQL) and/or RAG layer (vector search).
 */

'use strict';

const employeeData = require('../data/employeeData.service');
const attendanceData = require('../data/attendanceData.service');
const leaveData = require('../data/leaveData.service');
const organizationData = require('../data/organizationData.service');
const policyRetriever = require('../rag/policyRetriever.service');
const logger = require('../../config/logger');

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
            case 'EMPLOYEE_REPORTING_MANAGER':
              if (isEmployee) {
                liveData = { reportingManager: await employeeData.getReportingManager(employeeId, organizationId) };
              }
              break;

            case 'EMPLOYEE_PROFILE':
              if (isEmployee) {
                liveData = { profile: await employeeData.getEmployeeProfile(employeeId, organizationId) };
              }
              break;

            case 'EMPLOYEE_COUNT':
              liveData = { employeeCount: await organizationData.getTotalEmployees(organizationId) };
              break;

            case 'CURRENT_CHECKINS':
              liveData = { checkinCount: await attendanceData.getCurrentCheckins(organizationId) };
              break;

            case 'EMPLOYEES_ON_LEAVE':
              if (role === 'manager') {
                liveData = { onLeaveToday: await leaveData.getEmployeesCurrentlyOnLeave(organizationId, employeeId), scope: 'team' };
              } else if (role === 'employee') {
                liveData = { onLeaveToday: await leaveData.getEmployeesCurrentlyOnLeave(organizationId), scope: 'self' };
              } else {
                liveData = { onLeaveToday: await leaveData.getEmployeesCurrentlyOnLeave(organizationId), scope: 'org' };
              }
              break;

            case 'CURRENT_ABSENCES':
              if (role === 'manager') {
                liveData = { absentToday: await attendanceData.getEmployeesAbsentToday(organizationId, employeeId), scope: 'team' };
              } else {
                liveData = { absentToday: await attendanceData.getEmployeesAbsentToday(organizationId), scope: 'org' };
              }
              break;

            case 'EMPLOYEE_LEAVE_BALANCE':
            case 'EMPLOYEE_LEAVE_APPLICATION':
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

            case 'ATTENDANCE_TODAY':
            case 'EMPLOYEE_PUNCH':
              if (isEmployee) {
                liveData = { todayAttendance: await attendanceData.getTodayAttendance(employeeId, organizationId) };
              }
              break;

            case 'ATTENDANCE_MONTH':
            case 'EMPLOYEE_ATTENDANCE':
            case 'EMPLOYEE_ABSENCE':
            case 'TEAM_ATTENDANCE':
              if (isEmployee) {
                const effectiveRange = dateRange && dateRange.explicit ? dateRange : null;
                liveData = { attendanceSummary: await attendanceData.getAttendanceSummary(employeeId, organizationId, effectiveRange) };
              }
              break;

            case 'POLICY_BONUS':
              if (isEmployee) {
                const [bal, att] = await Promise.all([
                  leaveData.getEmployeeLeaveBalance(employeeId, organizationId),
                  attendanceData.getAttendanceSummary(employeeId, organizationId, dateRange && dateRange.explicit ? dateRange : null),
                ]);
                liveData = { leaveBalance: bal, attendanceSummary: att };
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
          policyChunks = (await policyRetriever.retrievePolicies(organizationId, message, 6, { category })) || [];
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
};
