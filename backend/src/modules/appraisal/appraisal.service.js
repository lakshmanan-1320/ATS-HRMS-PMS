const repo = require('./appraisal.repository')
const ApiError = require('../../utils/apiError')
const { STATUS_CODES } = require('../../constants/statusCodes')
const { query } = require('../../config/db')
const financialYearService = require('../financialYear/financialYear.service')
const { getSettings: getNotifSettings } = require('../notification/notificationSettings.repository')
const { sendAppraisalCycleOpenedEmail } = require('../notification/email.service')
const notifRepo = require('../inAppNotification/inAppNotification.repository')

async function resolveClient(orgId) {
  const id = await repo.getClientAdminIdByOrg(orgId)
  if (!id) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Organisation not found.')
  return id
}

/* ── final rating derivation ─────────────────────────────────────────── */
function deriveFinalRating(score) {
  if (score >= 90) return 'exceeds_expectations'
  if (score >= 70) return 'good'
  if (score >= 40) return 'meets_expectations'
  return 'below_expectations'
}

/* ── appraisal cycle score calculation ───────────────────────────────── */
async function calculateAppraisalSystemScores(clientAdminId, employeeId, cycleId, orgId) {
  const cycle = await repo.getCycleById(clientAdminId, cycleId);
  if (!cycle) {
    return { finalScore: 0, cycles: [] };
  }

  const { query } = require('../../config/db');

  const goalRes = await query(
    `SELECT progress, weight, title 
     FROM goals 
     WHERE organization_id = $1
       AND assigned_to_employee_id = $2
       AND financial_year_id = $3
       AND status = 'ACTIVE'
       AND parent_goal_id IS NULL
       AND goal_type = 'individual'
       AND start_date <= $4
       AND due_date >= $5`,
    [orgId, employeeId, cycle.financial_year_id, cycle.period_end, cycle.period_start]
  );
  
  const goals = goalRes.rows;
  let finalScore = 0;
  let totalWeight = 0;

  for (const g of goals) {
    totalWeight += Number(g.weight) || 0;
  }

  if (totalWeight !== 100) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      `Appraisal calculation cannot proceed: Total weight of eligible individual goals must equal 100% (currently ${totalWeight}%). Please correct your goal plan weights.`
    );
  }

  if (goals.length > 0) {
    let weightedSum = 0;
    for (const g of goals) {
      const w = Number(g.weight) || 0;
      weightedSum += (Number(g.progress) || 0) * w;
    }
    finalScore = Number((weightedSum / 100).toFixed(2));
  }

  const cycleBreakdown = [
    {
      name: cycle.name,
      score: finalScore
    }
  ];

  return {
    finalScore,
    cycles: cycleBreakdown
  };
}

/* ── admin: cycles ───────────────────────────────────────────────────── */

async function listCycles(orgId) {
  const clientAdminId = await resolveClient(orgId)
  return repo.listCycles(clientAdminId)
}

async function validateAppraisalCycleLinks(orgId, financialYearId) {
  if (!financialYearId) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Financial Year is required.');
  }
  // Validate FY exists
  await financialYearService.getFinancialYearById(financialYearId, orgId);
}

async function createCycle(orgId, data) {
  const clientAdminId = await resolveClient(orgId)
  if (!data.name?.trim()) throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cycle name is required.')
  if (!data.period_start || !data.period_end)
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'period_start and period_end are required.')
  if (new Date(data.period_start) > new Date(data.period_end))
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'period_start must be before period_end.')

  // Validate cycles and financial year
  await validateAppraisalCycleLinks(orgId, data.financial_year_id)

  return repo.createCycle(clientAdminId, data)
}

async function updateCycle(orgId, cycleId, data) {
  const clientAdminId = await resolveClient(orgId)
  const cycle = await repo.getCycleById(clientAdminId, cycleId)
  if (!cycle) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Appraisal cycle not found.')
  if (data.status && !['draft', 'active', 'closed'].includes(data.status))
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Invalid status.')

  // Validate cycle changes
  const targetFy = data.financial_year_id || cycle.financial_year_id
  await validateAppraisalCycleLinks(orgId, targetFy)

  const updated = await repo.updateCycle(clientAdminId, cycleId, data)

  // Fire-and-forget: notify all employees when cycle becomes active
  if (data.status === 'active' && cycle.status !== 'active') {
    getNotifSettings().then(async ns => {
      if (!ns.appraisal_cycle_opened) return;
      const empRows = await query(
        `SELECT e.employee_id, u.email, e.first_name, e.last_name
         FROM employees e
         JOIN users u ON u.employee_id = e.employee_id
         JOIN client_admins ca ON ca.organization_id = e.organization_id
         WHERE ca.client_admin_id = $1 AND e.is_active = true AND u.email IS NOT NULL`,
        [clientAdminId]
      );
      const empName = `${updated.name}`;
      for (const emp of empRows.rows) {
        const displayName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee';
        // in-app → each employee
        notifRepo.createNotification(
          emp.employee_id,
          'appraisal_cycle_opened',
          'Appraisal Cycle Opened',
          `The appraisal cycle "${empName}" is now active. Please complete your self-assessment.`,
          cycleId,
          'appraisal'
        ).catch(() => {});
        // email → each employee
        sendAppraisalCycleOpenedEmail(emp.email, {
          employeeName: displayName,
          cycleName: updated.name,
          periodStart: updated.period_start,
          periodEnd: updated.period_end,
        }).catch(e => console.error('[Notif] appraisal cycle email failed:', e.message));
      }
    }).catch(() => {});
  }

  return updated
}

async function deleteCycle(orgId, cycleId) {
  const clientAdminId = await resolveClient(orgId)
  const cycle = await repo.getCycleById(clientAdminId, cycleId)
  if (!cycle) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Appraisal cycle not found.')
  if (cycle.status !== 'draft')
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only draft cycles can be deleted.')
  return repo.deleteCycle(clientAdminId, cycleId)
}

async function getCycleEmployeeSummary(orgId, cycleId) {
  const clientAdminId = await resolveClient(orgId)
  const cycle = await repo.getCycleById(clientAdminId, cycleId)
  if (!cycle) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Appraisal cycle not found.')
  return repo.getCycleEmployeeSummary(clientAdminId, cycleId)
}

/* ── employee: active cycles ─────────────────────────────────────────── */

async function getActiveCycles(orgId) {
  const clientAdminId = await resolveClient(orgId)
  return repo.getActiveCyclesForOrg(clientAdminId)
}

/* ── employee: self-appraisal ────────────────────────────────────────── */

async function decorateGoalsWithPerformanceContext(goals, employeeId) {
  const decorated = [];
  for (const g of goals) {
    const goal = { ...g };
    goal.performanceContext = {
      kpis: [],
      competency: [],
      selfAssessment: null,
      feedback360: null,
      continuousFeedback: { praisesCount: 0, coachingNotes: [] }
    };
    
    try {
      const assignment = await repo.getGoalAssignment(g.goal_id, employeeId);
      if (assignment) {
        const assignmentId = assignment.assignment_id;
        
        // Fetch KPIs
        goal.performanceContext.kpis = await repo.getGoalKpis(g.goal_id);
        
        // Fetch Competency Assessments
        goal.performanceContext.competency = await repo.getGoalCompetencyAssessments(assignmentId);
        
        // Fetch Self Assessments
        goal.performanceContext.selfAssessment = await repo.getGoalSelfAssessment(assignmentId);
        
        // Fetch 360 Feedback
        goal.performanceContext.feedback360 = await repo.getGoal360Feedback(assignmentId);
        
        // Fetch Continuous Feedback
        goal.performanceContext.continuousFeedback = await repo.getGoalContinuousFeedback(assignmentId);
      } else {
        // Fallback for KPIs if no assignment is active yet
        goal.performanceContext.kpis = await repo.getGoalKpis(g.goal_id);
      }
    } catch (e) {
      console.error(`Error loading performance context for goal ${g.goal_id}:`, e.message);
    }
    decorated.push(goal);
  }
  return decorated;
}

/* ── employee: self-appraisal ────────────────────────────────────────── */

async function getSelfAppraisal(employeeId, orgId, cycleId) {
  const clientAdminId = await resolveClient(orgId)
  const cycle = await repo.getCycleById(clientAdminId, cycleId)
  if (!cycle || cycle.status === 'draft')
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Appraisal cycle not found or not yet active.')

  const goals = await repo.getAppraisalGoalsForEmployee(clientAdminId, employeeId, cycleId)
  const decoratedGoals = await decorateGoalsWithPerformanceContext(goals, employeeId)
  const appraisal = await repo.getSelfAppraisal(cycleId, employeeId)

  const systemScores = await calculateAppraisalSystemScores(clientAdminId, employeeId, cycleId, orgId)

  return { cycle, goals: decoratedGoals, appraisal: appraisal || null, systemScores }
}

async function saveSelfAppraisal(employeeId, orgId, cycleId, { overall_comment, goal_ratings, achievements, challenges, learnings, career_goals, self_rating }) {
  const clientAdminId = await resolveClient(orgId)
  const cycle = await repo.getCycleById(clientAdminId, cycleId)
  if (!cycle || cycle.status === 'draft')
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Appraisal cycle not found or not yet active.')
  if (cycle.status === 'closed')
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'This appraisal cycle is closed.')

  const existing = await repo.getSelfAppraisal(cycleId, employeeId)
  if (existing?.status === 'submitted')
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Self-appraisal already submitted and cannot be edited.')

  const appraisal = await repo.upsertSelfAppraisal(
    cycleId,
    employeeId,
    overall_comment,
    achievements,
    challenges,
    learnings,
    career_goals,
    self_rating
  )

  if (Array.isArray(goal_ratings)) {
    for (const { goal_id, achievement_pct, comment } of goal_ratings) {
      const pct = parseFloat(achievement_pct)
      if (isNaN(pct) || pct < 0 || pct > 100)
        throw new ApiError(STATUS_CODES.BAD_REQUEST, `achievement_pct for goal ${goal_id} must be 0–100.`)
      await repo.upsertSelfGoalRating(appraisal.self_appraisal_id, goal_id, pct, comment)
    }
  }

  return repo.getSelfAppraisal(cycleId, employeeId)
}

async function submitSelfAppraisal(employeeId, orgId, cycleId) {
  const clientAdminId = await resolveClient(orgId)
  const cycle = await repo.getCycleById(clientAdminId, cycleId)
  if (!cycle || cycle.status === 'draft')
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Appraisal cycle not found or not yet active.')
  if (cycle.status === 'closed')
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'This appraisal cycle is closed.')
  const appraisal = await repo.getSelfAppraisal(cycleId, employeeId)
  if (!appraisal)
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Please save your appraisal before submitting.')
  if (appraisal.status === 'submitted')
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Self-appraisal already submitted.')

  const goals = await repo.getAppraisalGoalsForEmployee(clientAdminId, employeeId, cycleId)

  // Validate that all assigned goals are completed and performance techniques are finalized
  for (const goal of goals) {
    const statusLower = (goal.status || '').toLowerCase()
    if (statusLower !== 'completed') {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, `Goal "${goal.title}" is currently in ${goal.status} status. All assigned goals must be completed before submitting your appraisal.`)
    }

    const technique = goal.performance_technique
    const assignment = await repo.getGoalAssignment(goal.goal_id, employeeId)

    if (technique === 'KPI') {
      const kpis = await repo.getGoalKpis(goal.goal_id)
      if (kpis.length === 0) {
        throw new ApiError(STATUS_CODES.BAD_REQUEST, `Goal "${goal.title}" uses KPI technique but has no KPIs assigned.`)
      }
      for (const kpi of kpis) {
        if (kpi.status === 'DRAFT') {
          throw new ApiError(STATUS_CODES.BAD_REQUEST, `KPI "${kpi.title}" under goal "${goal.title}" is still in DRAFT status. All KPIs must be active and finalized.`)
        }
        const pendingCount = await repo.getPendingKpiSubmissionsCount(kpi.kpi_id)
        if (pendingCount > 0) {
          throw new ApiError(STATUS_CODES.BAD_REQUEST, `KPI "${kpi.title}" under goal "${goal.title}" has pending progress submissions awaiting manager review.`)
        }
      }
    } else if (technique === 'COMPETENCY_ASSESSMENT' || technique === 'COMPETENCY') {
      if (!assignment) {
        throw new ApiError(STATUS_CODES.BAD_REQUEST, `Goal "${goal.title}" uses competency assessment but has no active assignment.`)
      }
      const comps = await repo.getGoalCompetencyAssessments(assignment.assignment_id)
      if (comps.length === 0) {
        throw new ApiError(STATUS_CODES.BAD_REQUEST, `Goal "${goal.title}" uses competency assessment but no competency metrics have been assessed.`)
      }
      if (comps.some(c => c.rating === null)) {
        throw new ApiError(STATUS_CODES.BAD_REQUEST, `Goal "${goal.title}" competency metrics have pending assessments that are not yet rated.`)
      }
    } else if (technique === 'SELF_ASSESSMENT') {
      if (!assignment) {
        throw new ApiError(STATUS_CODES.BAD_REQUEST, `Goal "${goal.title}" uses self assessment but has no active assignment.`)
      }
      const selfAss = await repo.getGoalSelfAssessment(assignment.assignment_id)
      if (!selfAss || (selfAss.status !== 'SUBMITTED' && selfAss.status !== 'APPROVED')) {
        throw new ApiError(STATUS_CODES.BAD_REQUEST, `Goal "${goal.title}" self-assessment has not been submitted or finalized.`)
      }
    } else if (technique === '360_FEEDBACK') {
      if (!assignment) {
        throw new ApiError(STATUS_CODES.BAD_REQUEST, `Goal "${goal.title}" uses 360° feedback but has no active assignment.`)
      }
      const feed360 = await repo.getGoal360Feedback(assignment.assignment_id)
      if (!feed360 || feed360.final_score === null) {
        throw new ApiError(STATUS_CODES.BAD_REQUEST, `Goal "${goal.title}" 360° feedback has not been finalized or published.`)
      }
    }
  }

  return repo.submitSelfAppraisal(cycleId, employeeId)
}

/* ── manager: appraisal ──────────────────────────────────────────────── */

async function validateManagerDepartmentMatch(managerId, employeeId) {
  const empRes = await query(`SELECT department_id FROM employees WHERE employee_id = $1`, [employeeId])
  const mgrRes = await query(`SELECT department_id FROM employees WHERE employee_id = $1`, [managerId])
  const empDept = empRes.rows[0]?.department_id
  const mgrDept = mgrRes.rows[0]?.department_id
  
  if (!empDept || !mgrDept || empDept !== mgrDept) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'Managers must only be able to review employees who belong to their own department.')
  }
}

async function getManagerTeamStatus(managerId, orgId, cycleId) {
  const clientAdminId = await resolveClient(orgId)
  const cycle = await repo.getCycleById(clientAdminId, cycleId)
  if (!cycle) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Appraisal cycle not found.')
  const team = await repo.getManagerTeamAppraisalStatus(managerId, cycleId)
  return { cycle, team }
}

async function getManagerAppraisalForEmployee(managerId, orgId, cycleId, employeeId) {
  await validateManagerDepartmentMatch(managerId, employeeId)
  const clientAdminId = await resolveClient(orgId)
  const cycle = await repo.getCycleById(clientAdminId, cycleId)
  if (!cycle) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Appraisal cycle not found.')

  const goals = await repo.getAppraisalGoalsForEmployee(clientAdminId, employeeId, cycleId)
  const decoratedGoals = await decorateGoalsWithPerformanceContext(goals, employeeId)
  const selfAppraisal = await repo.getSelfAppraisal(cycleId, employeeId)
  const managerAppraisal = await repo.getManagerAppraisal(cycleId, employeeId)

  const systemScores = await calculateAppraisalSystemScores(clientAdminId, employeeId, cycleId, orgId)

  return { cycle, goals: decoratedGoals, selfAppraisal: selfAppraisal || null, managerAppraisal: managerAppraisal || null, systemScores }
}

async function saveManagerAppraisal(managerId, orgId, cycleId, employeeId, { overall_comment, goal_ratings, final_rating, promotion_recommendation, training_recommendation }) {
  await validateManagerDepartmentMatch(managerId, employeeId)
  const clientAdminId = await resolveClient(orgId)
  const cycle = await repo.getCycleById(clientAdminId, cycleId)
  if (!cycle || cycle.status === 'draft')
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Appraisal cycle not found or not yet active.')
  if (cycle.status === 'closed')
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'This appraisal cycle is closed.')

  const existing = await repo.getManagerAppraisal(cycleId, employeeId)
  if (existing?.status === 'submitted')
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Manager appraisal already submitted.')

  const goals = await repo.getAppraisalGoalsForEmployee(clientAdminId, employeeId, cycleId)
  const decoratedGoals = await decorateGoalsWithPerformanceContext(goals, employeeId)

  const { finalScore } = await calculateAppraisalSystemScores(clientAdminId, employeeId, cycleId, orgId)
  const computedRating = deriveFinalRating(finalScore)

  const appraisal = await repo.upsertManagerAppraisal(
    cycleId,
    employeeId,
    managerId,
    overall_comment,
    computedRating,
    finalScore,
    promotion_recommendation,
    training_recommendation
  )

  if (Array.isArray(goal_ratings)) {
    for (const { goal_id, achievement_pct, comment } of goal_ratings) {
      const pct = parseFloat(achievement_pct)
      if (isNaN(pct) || pct < 0 || pct > 100)
        throw new ApiError(STATUS_CODES.BAD_REQUEST, `achievement_pct for goal ${goal_id} must be 0–100.`)
      await repo.upsertManagerGoalRating(appraisal.manager_appraisal_id, goal_id, pct, comment)
    }
  }

  return repo.getManagerAppraisal(cycleId, employeeId)
}

async function submitManagerAppraisal(managerId, orgId, cycleId, employeeId) {
  await validateManagerDepartmentMatch(managerId, employeeId)
  const clientAdminId = await resolveClient(orgId)
  const cycle = await repo.getCycleById(clientAdminId, cycleId)
  if (!cycle || cycle.status === 'draft')
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Appraisal cycle not found or not yet active.')
  if (cycle.status === 'closed')
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'This appraisal cycle is closed.')

  const appraisal = await repo.getManagerAppraisal(cycleId, employeeId)
  if (!appraisal)
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Please save the appraisal before submitting.')
  if (appraisal.status === 'submitted')
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Manager appraisal already submitted.')
  if (appraisal.manager_id !== managerId)
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'You are not the reviewing manager for this appraisal.')

  const goals = await repo.getAppraisalGoalsForEmployee(clientAdminId, employeeId, cycleId)
  const decoratedGoals = await decorateGoalsWithPerformanceContext(goals, employeeId)
  const { finalScore } = await calculateAppraisalSystemScores(clientAdminId, employeeId, cycleId, orgId)
  const computedRating = deriveFinalRating(finalScore)

  await repo.upsertManagerAppraisal(
    cycleId,
    employeeId,
    managerId,
    appraisal.overall_comment,
    computedRating,
    finalScore,
    appraisal.promotion_recommendation,
    appraisal.training_recommendation
  )

  return repo.submitManagerAppraisal(cycleId, employeeId, managerId)
}

module.exports = {
  listCycles,
  createCycle,
  updateCycle,
  deleteCycle,
  getCycleEmployeeSummary,
  getActiveCycles,
  getSelfAppraisal,
  saveSelfAppraisal,
  submitSelfAppraisal,
  getManagerTeamStatus,
  getManagerAppraisalForEmployee,
  saveManagerAppraisal,
  submitManagerAppraisal,
}
