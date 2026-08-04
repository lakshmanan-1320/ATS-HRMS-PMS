const { query } = require('../../config/db');

class GoalAssignmentService {
  getAssignmentStatus(goalStatus) {
    if (['ACTIVE', 'IN_PROGRESS'].includes(goalStatus)) return 'ACTIVE';
    if (['COMPLETED', 'ON_HOLD', 'CANCELLED', 'PENDING'].includes(goalStatus)) return goalStatus;
    return 'PENDING';
  }

  /**
   * Main entry point for goal assignment logic across all goal types
   */
  async assignGoal(orgId, parentGoal, options = {}) {
    if (!parentGoal || !parentGoal.goal_id) return [];

    const goalType = (parentGoal.goal_type || '').toUpperCase();

    switch (goalType) {
      case 'DEPARTMENT':
        return await this.assignDepartmentGoal(orgId, parentGoal, options);
      case 'COMPANY':
        return await this.assignCompanyGoal(orgId, parentGoal, options);
      case 'INDIVIDUAL':
      case 'PERSONAL':
      default:
        if (parentGoal.assigned_to_employee_id) {
          const assStatus = this.getAssignmentStatus(parentGoal.status);
          await query(`
            INSERT INTO goal_assignments (organization_id, goal_id, employee_id, assigned_by, status)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (goal_id, employee_id) DO NOTHING
          `, [orgId, parentGoal.goal_id, parentGoal.assigned_to_employee_id, parentGoal.assigned_by || parentGoal.created_by, assStatus]);
        }
        return [parentGoal];
    }
  }

  /**
   * Assigns a Department Goal to all ACTIVE employees in the department (via goal_assignments table)
   */
  async assignDepartmentGoal(orgId, parentGoal, options = {}) {
    const departmentId = parentGoal.assigned_to_department_id;
    if (!departmentId) return [];

    const empRes = await query(
      `SELECT employee_id FROM employees WHERE organization_id = $1 AND department_id = $2 AND status = 'active'`,
      [orgId, departmentId]
    );

    const createdAssignments = [];
    const assStatus = this.getAssignmentStatus(parentGoal.status);
    for (const emp of empRes.rows) {
      const res = await query(`
        INSERT INTO goal_assignments (organization_id, goal_id, employee_id, assigned_by, status)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (goal_id, employee_id) 
        DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
        RETURNING *
      `, [orgId, parentGoal.goal_id, emp.employee_id, parentGoal.assigned_by || parentGoal.created_by, assStatus]);

      if (res.rows[0]) createdAssignments.push(res.rows[0]);
    }

    return createdAssignments;
  }

  /**
   * Assigns a Company Goal to all ACTIVE employees in the organization (via goal_assignments table)
   */
  async assignCompanyGoal(orgId, parentGoal, options = {}) {
    const empRes = await query(
      `SELECT employee_id FROM employees WHERE organization_id = $1 AND status = 'active'`,
      [orgId]
    );

    const createdAssignments = [];
    const assStatus = this.getAssignmentStatus(parentGoal.status);
    for (const emp of empRes.rows) {
      const res = await query(`
        INSERT INTO goal_assignments (organization_id, goal_id, employee_id, assigned_by, status)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (goal_id, employee_id)
        DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
        RETURNING *
      `, [orgId, parentGoal.goal_id, emp.employee_id, parentGoal.assigned_by || parentGoal.created_by, assStatus]);

      if (res.rows[0]) createdAssignments.push(res.rows[0]);
    }

    return createdAssignments;
  }

  /**
   * Fetch all assigned employees for a goal with employee names, status, and progress
   */
  async getAssignmentsForGoal(orgId, goalId) {
    const res = await query(`
      SELECT 
        ga.assignment_id,
        ga.goal_id,
        ga.employee_id,
        ga.status,
        ga.progress,
        ga.completion_outcome,
        ga.assigned_at,
        ga.completed_at,
        e.first_name,
        e.last_name,
        e.email,
        e.department_id,
        d.name AS department_name,
        TRIM(CONCAT(e.first_name, ' ', e.last_name)) AS employee_name
      FROM goal_assignments ga
      JOIN employees e ON e.employee_id = ga.employee_id
      LEFT JOIN departments d ON d.department_id = e.department_id
      WHERE ga.organization_id = $1 AND ga.goal_id = $2
      ORDER BY e.first_name ASC, e.last_name ASC
    `, [orgId, goalId]);

    return res.rows;
  }

  /**
   * Fetch or auto-create single assignment for goal & employee
   */
  async getOrCreateAssignment(orgId, goalId, employeeId, assignedBy = null) {
    if (!goalId || !employeeId) return null;

    let res = await query(`
      SELECT ga.*, TRIM(CONCAT(e.first_name, ' ', e.last_name)) AS employee_name
      FROM goal_assignments ga
      JOIN employees e ON e.employee_id = ga.employee_id
      WHERE ga.organization_id = $1 AND ga.goal_id = $2 AND ga.employee_id = $3
    `, [orgId, goalId, employeeId]);

    if (res.rows.length === 0) {
      await query(`
        INSERT INTO goal_assignments (organization_id, goal_id, employee_id, assigned_by, status)
        VALUES ($1, $2, $3, $4, 'ACTIVE')
        ON CONFLICT (goal_id, employee_id) DO NOTHING
      `, [orgId, goalId, employeeId, assignedBy]);

      res = await query(`
        SELECT ga.*, TRIM(CONCAT(e.first_name, ' ', e.last_name)) AS employee_name
        FROM goal_assignments ga
        JOIN employees e ON e.employee_id = ga.employee_id
        WHERE ga.organization_id = $1 AND ga.goal_id = $2 AND ga.employee_id = $3
      `, [orgId, goalId, employeeId]);
    }

    return res.rows[0] || null;
  }

  async updateAssignmentStatus(orgId, goalId, assignmentId, status, completionOutcome = null) {
    const validStatuses = ['PENDING', 'ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    const completedAtClause = status === 'COMPLETED' ? ', completed_at = NOW()' : ', completed_at = NULL';
    const finalOutcome = status === 'COMPLETED' ? completionOutcome : null;

    const res = await query(
      `UPDATE goal_assignments
       SET status = $1, completion_outcome = $2 ${completedAtClause}, updated_at = NOW()
       WHERE organization_id = $3 AND goal_id = $4 AND assignment_id = $5
       RETURNING *`,
      [status, finalOutcome, orgId, goalId, assignmentId]
    );

    // Recalculate progress for this assignment now that status changed (closure condition)
    await this.recalculateGoalProgress(orgId, goalId, res.rows[0].employee_id);

    return res.rows[0];
  }

  async recalculateGoalProgress(orgId, goalId, employeeId = null) {
    const goalRes = await query(`SELECT performance_technique FROM goals WHERE goal_id = $1`, [goalId]);
    if (goalRes.rows.length === 0) return;
    const technique = goalRes.rows[0].performance_technique;

    if (technique === 'SELF_ASSESSMENT') {
      let assignmentsSql = `SELECT assignment_id, employee_id, status FROM goal_assignments WHERE goal_id = $1`;
      const assignmentsParams = [goalId];
      if (employeeId) {
        assignmentsSql += ` AND employee_id = $2`;
        assignmentsParams.push(employeeId);
      }
      const assignments = await query(assignmentsSql, assignmentsParams);

      for (const ga of assignments.rows) {
        const subRes = await query(
          `SELECT submission_id, status FROM self_assessment_submissions WHERE assignment_id = $1`,
          [ga.assignment_id]
        );
        let progress = 0;
        if (subRes.rows.length > 0) {
          const sub = subRes.rows[0];
          if (sub.status === 'SUBMITTED') {
            progress = 70;
          } else if (sub.status === 'APPROVED') {
            progress = 100;
          } else {
            const ansCountRes = await query(
              `SELECT COUNT(*)::int AS total, 
                      COUNT(*) FILTER (WHERE answer IS NOT NULL AND TRIM(answer) != '' OR employee_rating IS NOT NULL)::int AS answered 
               FROM self_assessment_answers WHERE submission_id = $1`,
              [sub.submission_id]
            );
            const total = ansCountRes.rows[0].total || 1;
            const answered = ansCountRes.rows[0].answered || 0;
            progress = Math.min(70, Math.round((answered / total) * 70));
          }
        }
        await query(
          `UPDATE goal_assignments 
           SET progress = $1, updated_at = NOW() 
           WHERE assignment_id = $2`,
          [progress, ga.assignment_id]
        );
      }

      const avgRes = await query(
        `SELECT COALESCE(AVG(progress), 0.00)::numeric(5,2) AS avg_progress FROM goal_assignments WHERE goal_id = $1`,
        [goalId]
      );
      const avgProgress = avgRes.rows[0].avg_progress;
      await query(`UPDATE goals SET progress = $1, updated_at = NOW() WHERE goal_id = $2`, [avgProgress, goalId]);
      return;
    }

    if (technique === '360_FEEDBACK') {
      let assignmentsSql = `SELECT assignment_id, employee_id, status FROM goal_assignments WHERE goal_id = $1`;
      const assignmentsParams = [goalId];
      if (employeeId) {
        assignmentsSql += ` AND employee_id = $2`;
        assignmentsParams.push(employeeId);
      }
      const assignments = await query(assignmentsSql, assignmentsParams);

      for (const ga of assignments.rows) {
        // Check if finalized (has final_score in feedback_summary)
        const summaryRes = await query(
          `SELECT final_score, completion_percentage FROM feedback_summary WHERE assignment_id = $1`,
          [ga.assignment_id]
        );
        let progress = 0;
        if (summaryRes.rows.length > 0 && summaryRes.rows[0].final_score !== null) {
          progress = 100;
        } else {
          // Progress based on submitted/total participants
          const partRes = await query(
            `SELECT COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE status = 'SUBMITTED')::int AS submitted
             FROM feedback_participants WHERE assignment_id = $1`,
            [ga.assignment_id]
          );
          const total = partRes.rows[0].total || 0;
          const submitted = partRes.rows[0].submitted || 0;
          if (total > 0) {
            progress = Math.min(90, Math.round((submitted / total) * 90));
          }
        }
        await query(
          `UPDATE goal_assignments SET progress = $1, updated_at = NOW() WHERE assignment_id = $2`,
          [progress, ga.assignment_id]
        );
      }

      const avgRes = await query(
        `SELECT COALESCE(AVG(progress), 0.00)::numeric(5,2) AS avg_progress FROM goal_assignments WHERE goal_id = $1`,
        [goalId]
      );
      const avgProgress = avgRes.rows[0].avg_progress;
      await query(`UPDATE goals SET progress = $1, updated_at = NOW() WHERE goal_id = $2`, [avgProgress, goalId]);
      return;
    }

    if (technique !== 'CONTINUOUS_FEEDBACK') return;

    const configRes = await query(
      `SELECT configuration_json FROM performance_technique_configurations 
       WHERE organization_id = $1 AND technique = $2`,
      [orgId, 'CONTINUOUS_FEEDBACK']
    );
    const config = configRes.rows.length > 0 ? configRes.rows[0].configuration_json : {
      reflection: { enabled: true, weight: 20 },
      manager_feedback: { enabled: true, weight: 20 },
      verified_action_items: { enabled: true, weight: 40 },
      goal_closure: { enabled: true, weight: 20 }
    };

    let assignmentsSql = `SELECT assignment_id, employee_id, status FROM goal_assignments WHERE goal_id = $1`;
    const assignmentsParams = [goalId];
    if (employeeId) {
      assignmentsSql += ` AND employee_id = $2`;
      assignmentsParams.push(employeeId);
    }
    const assignments = await query(assignmentsSql, assignmentsParams);

    for (const ga of assignments.rows) {
      let reflectionScore = 0;
      let feedbackScore = 0;
      let actionScore = 0;
      let closureScore = 0;

      if (config.reflection?.enabled) {
        const refl = await query(`SELECT 1 FROM feedback_reflections WHERE assignment_id = $1 LIMIT 1`, [ga.assignment_id]);
        if (refl.rows.length > 0) {
          reflectionScore = Number(config.reflection.weight || 0);
        }
      }

      if (config.manager_feedback?.enabled) {
        const feed = await query(`SELECT 1 FROM feedback_entries WHERE assignment_id = $1 LIMIT 1`, [ga.assignment_id]);
        if (feed.rows.length > 0) {
          feedbackScore = Number(config.manager_feedback.weight || 0);
        }
      }

      if (config.verified_action_items?.enabled) {
        const totalActionsRes = await query(`SELECT COUNT(*)::int AS count FROM feedback_action_items WHERE assignment_id = $1`, [ga.assignment_id]);
        const verifiedActionsRes = await query(`SELECT COUNT(*)::int AS count FROM feedback_action_items WHERE assignment_id = $1 AND verified_by_manager = TRUE`, [ga.assignment_id]);
        const total = totalActionsRes.rows[0].count;
        const verified = verifiedActionsRes.rows[0].count;
        if (total > 0) {
          actionScore = (verified / total) * Number(config.verified_action_items.weight || 0);
        }
      }

      if (config.goal_closure?.enabled) {
        if (ga.status === 'COMPLETED') {
          closureScore = Number(config.goal_closure.weight || 0);
        }
      }

      const totalProgress = Math.min(100, Math.round(reflectionScore + feedbackScore + actionScore + closureScore));
      const newStatus = totalProgress >= 100 ? 'COMPLETED' : (ga.status === 'COMPLETED' && config.goal_closure?.enabled && closureScore === 0 ? 'ACTIVE' : ga.status);
      const completedAtClause = newStatus === 'COMPLETED' ? ', completed_at = NOW()' : ', completed_at = NULL';
      const outcomeClause = newStatus === 'COMPLETED' ? '' : ', completion_outcome = NULL';

      await query(
        `UPDATE goal_assignments 
         SET progress = $1, status = $2${completedAtClause}${outcomeClause}, updated_at = NOW() 
         WHERE assignment_id = $3`,
        [totalProgress, newStatus, ga.assignment_id]
      );
    }

    const avgRes = await query(
      `SELECT COALESCE(AVG(progress), 0.00)::numeric(5,2) AS avg_progress FROM goal_assignments WHERE goal_id = $1`,
      [goalId]
    );
    const avgProgress = avgRes.rows[0].avg_progress;
    await query(`UPDATE goals SET progress = $1, updated_at = NOW() WHERE goal_id = $2`, [avgProgress, goalId]);
  }
}

module.exports = new GoalAssignmentService();
