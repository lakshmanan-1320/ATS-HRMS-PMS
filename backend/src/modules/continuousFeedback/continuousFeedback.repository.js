const { query } = require('../../config/db');

class ContinuousFeedbackRepository {
  // --- Reflection Templates & Question Locking ---
  async isTemplateLocked(goalId, orgId) {
    const res = await query(
      `SELECT COUNT(*)::int AS count FROM goal_reflection_answers WHERE goal_id = $1 AND organization_id = $2`,
      [goalId, orgId]
    );
    return (res.rows[0]?.count || 0) > 0;
  }

  async saveReflectionTemplate(orgId, goalId, questions) {
    if (!Array.isArray(questions) || questions.length === 0) return [];

    const isLocked = await this.isTemplateLocked(goalId, orgId);
    if (isLocked) {
      throw new Error('Reflection template is locked because employee responses already exist.');
    }

    // Delete existing unlocked template questions for this goal
    await query(
      `DELETE FROM goal_reflection_templates WHERE goal_id = $1 AND organization_id = $2`,
      [goalId, orgId]
    );

    const saved = [];
    for (let idx = 0; idx < questions.length; idx++) {
      const q = questions[idx];
      const res = await query(
        `INSERT INTO goal_reflection_templates (organization_id, goal_id, question, input_type, display_order, is_required, choices)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          orgId,
          goalId,
          q.question || q.label || '',
          q.input_type || q.inputType || 'TEXTAREA',
          q.display_order || idx + 1,
          q.is_required !== undefined ? q.is_required : true,
          q.choices || null
        ]
      );
      saved.push(res.rows[0]);
    }
    return saved;
  }

  async getReflectionTemplate(goalId, orgId) {
    const res = await query(
      `SELECT * FROM goal_reflection_templates
       WHERE goal_id = $1 AND organization_id = $2
       ORDER BY display_order ASC, created_at ASC`,
      [goalId, orgId]
    );
    return res.rows;
  }

  async updateReflectionQuestion(templateId, orgId, data) {
    const existing = await query(
      `SELECT goal_id FROM goal_reflection_templates WHERE template_id = $1 AND organization_id = $2`,
      [templateId, orgId]
    );
    if (!existing.rows[0]) return null;

    const isLocked = await this.isTemplateLocked(existing.rows[0].goal_id, orgId);
    if (isLocked) {
      throw new Error('Reflection template is locked because employee responses already exist.');
    }

    const res = await query(
      `UPDATE goal_reflection_templates
       SET question = COALESCE($3, question),
           input_type = COALESCE($4, input_type),
           is_required = COALESCE($5, is_required),
           choices = COALESCE($6, choices),
           updated_at = NOW()
       WHERE template_id = $1 AND organization_id = $2
       RETURNING *`,
      [templateId, orgId, data.question, data.input_type, data.is_required, data.choices]
    );
    return res.rows[0];
  }

  async deleteReflectionQuestion(templateId, orgId) {
    const existing = await query(
      `SELECT goal_id FROM goal_reflection_templates WHERE template_id = $1 AND organization_id = $2`,
      [templateId, orgId]
    );
    if (!existing.rows[0]) return false;

    const isLocked = await this.isTemplateLocked(existing.rows[0].goal_id, orgId);
    if (isLocked) {
      throw new Error('Reflection template is locked because employee responses already exist.');
    }

    await query(
      `DELETE FROM goal_reflection_templates WHERE template_id = $1 AND organization_id = $2`,
      [templateId, orgId]
    );
    return true;
  }

  // --- Dynamic Reflection Answer Submission ---
  async submitReflectionAnswers({ organization_id, goal_id, employee_id, answers, summary_notes }) {
    // 1. Resolve actual employees.employee_id from user_id (users table links to employees)
    //    employees table has NO user_id column — resolution is via users.employee_id
    let empId = null;
    const userRes = await query(
      `SELECT employee_id FROM users WHERE user_id = $1 LIMIT 1`,
      [employee_id]
    );
    if (userRes.rows[0]?.employee_id) {
      empId = userRes.rows[0].employee_id;
    } else {
      // Fallback: maybe employee_id was passed directly
      const directEmpRes = await query(
        `SELECT employee_id FROM employees WHERE employee_id = $1 AND organization_id = $2 LIMIT 1`,
        [employee_id, organization_id]
      );
      if (directEmpRes.rows[0]) empId = directEmpRes.rows[0].employee_id;
    }

    // 2. Resolve assignment_id
    const assignRes = await query(
      `SELECT assignment_id FROM goal_assignments WHERE goal_id = $1 AND employee_id = $2 LIMIT 1`,
      [goal_id, empId]
    );
    const assignmentId = assignRes.rows[0]?.assignment_id || null;

    // 3. Insert parent reflection record in feedback_reflections
    // NOTE: feedback_reflections.employee_id references users(user_id) (migration 062)
    // The caller passes userId (= users.user_id) as employee_id
    if (!employee_id) {
      throw new Error('Cannot submit reflection: employee/user identity is missing.');
    }

    const summaryText = summary_notes || (Array.isArray(answers) && answers[0]?.answer ? answers[0].answer : 'Submitted self-reflection');
    const reflRes = await query(
      `INSERT INTO feedback_reflections (organization_id, goal_id, assignment_id, employee_id, what_i_learned, challenges_faced, support_needed, next_steps)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        organization_id,
        goal_id,
        assignmentId,
        employee_id, // user_id (FK references users(user_id) per migration 062)
        summaryText,
        null, null, null
      ]
    );

    const reflectionId = reflRes.rows[0].reflection_id;
    const savedAnswers = [];

    // 4. Save individual question answers in goal_reflection_answers
    // NOTE: goal_reflection_answers.employee_id references employees(employee_id) (migration 063)
    if (Array.isArray(answers) && empId) {
      for (const ans of answers) {
        if (!ans.template_id) continue;
        const aRes = await query(
          `INSERT INTO goal_reflection_answers (organization_id, goal_id, assignment_id, template_id, reflection_id, employee_id, answer)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [organization_id, goal_id, assignmentId, ans.template_id, reflectionId, empId, ans.answer || '']
        );
        savedAnswers.push(aRes.rows[0]);
      }
    }

    return {
      ...reflRes.rows[0],
      answers: savedAnswers
    };
  }

  async getReflectionsByGoalId(goalId, orgId, employeeId = null, limit = 10, offset = 0) {
    let countSql = `SELECT COUNT(DISTINCT fr.reflection_id)::int AS count
                    FROM feedback_reflections fr
                    LEFT JOIN users u ON u.user_id = fr.employee_id
                    LEFT JOIN employees e ON e.employee_id = u.employee_id
                    WHERE fr.goal_id = $1 AND fr.organization_id = $2`;
    const countParams = [goalId, orgId];
    if (employeeId) {
      countSql += ` AND (fr.employee_id = $3 OR e.employee_id = $3 OR fr.assignment_id IN (SELECT assignment_id FROM goal_assignments WHERE goal_id = $1 AND employee_id = $3))`;
      countParams.push(employeeId);
    }
    const countRes = await query(countSql, countParams);
    const totalCount = countRes.rows[0]?.count || 0;

    let sql = `SELECT fr.*,
              COALESCE(NULLIF(CONCAT(e.first_name, ' ', e.last_name), ' '), u.email) AS employee_name,
              COALESCE(
                JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'answer_id', gra.answer_id,
                    'template_id', gra.template_id,
                    'question', grt.question,
                    'answer', gra.answer,
                    'display_order', grt.display_order
                  ) ORDER BY grt.display_order ASC
                ) FILTER (WHERE gra.answer_id IS NOT NULL), '[]'
              ) AS qna_answers
       FROM feedback_reflections fr
       LEFT JOIN users u ON u.user_id = fr.employee_id
       LEFT JOIN employees e ON e.employee_id = u.employee_id
       LEFT JOIN goal_reflection_answers gra ON gra.reflection_id = fr.reflection_id
       LEFT JOIN goal_reflection_templates grt ON grt.template_id = gra.template_id
       WHERE fr.goal_id = $1 AND fr.organization_id = $2`;
    const params = [goalId, orgId];
    if (employeeId) {
      sql += ` AND (fr.employee_id = $3 OR e.employee_id = $3 OR fr.assignment_id IN (SELECT assignment_id FROM goal_assignments WHERE goal_id = $1 AND employee_id = $3))`;
      params.push(employeeId);
    }
    sql += ` GROUP BY fr.reflection_id, e.first_name, e.last_name, u.email ORDER BY fr.created_at DESC`;
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const res = await query(sql, params);
    return { rows: res.rows, totalCount };
  }

  async createReflection({ organization_id, goal_id, employee_id, what_i_learned, challenges_faced, support_needed, next_steps }) {
    const assignRes = await query(
      `SELECT assignment_id FROM goal_assignments WHERE goal_id = $1 AND employee_id = $2 LIMIT 1`,
      [goal_id, employee_id]
    );
    const assignmentId = assignRes.rows[0]?.assignment_id || null;

    const res = await query(
      `INSERT INTO feedback_reflections (organization_id, goal_id, assignment_id, employee_id, what_i_learned, challenges_faced, support_needed, next_steps)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [organization_id, goal_id, assignmentId, employee_id, what_i_learned, challenges_faced, support_needed, next_steps]
    );
    return res.rows[0];
  }

  // --- Feedback Entries ---
  async createFeedback({ organization_id, goal_id, manager_id, employee_id, feedback_type, feedback_text }) {
    let assignmentId = null;
    if (employee_id) {
      const assignRes = await query(
        `SELECT assignment_id FROM goal_assignments WHERE goal_id = $1 AND employee_id = $2 LIMIT 1`,
        [goal_id, employee_id]
      );
      assignmentId = assignRes.rows[0]?.assignment_id || null;
    }

    const res = await query(
      `INSERT INTO feedback_entries (organization_id, goal_id, assignment_id, manager_id, feedback_type, feedback_text)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING feedback_id, organization_id, goal_id, assignment_id, manager_id, feedback_type, feedback_text, created_at`,
      [organization_id, goal_id, assignmentId, manager_id, feedback_type, feedback_text]
    );
    return res.rows[0];
  }

  async getFeedbackByGoalId(goalId, orgId, employeeId = null, limit = 10, offset = 0) {
    let countSql = `SELECT COUNT(*)::int AS count
                    FROM feedback_entries fe
                    LEFT JOIN users u ON u.user_id = fe.manager_id
                    LEFT JOIN employees e ON e.employee_id = u.employee_id
                    WHERE fe.goal_id = $1 AND fe.organization_id = $2`;
    const countParams = [goalId, orgId];
    if (employeeId) {
      countSql += ` AND (fe.assignment_id IN (SELECT assignment_id FROM goal_assignments WHERE goal_id = $1 AND employee_id = $3))`;
      countParams.push(employeeId);
    }
    const countRes = await query(countSql, countParams);
    const totalCount = countRes.rows[0]?.count || 0;

    let sql = `SELECT fe.*, COALESCE(NULLIF(CONCAT(e.first_name, ' ', e.last_name), ' '), u.email) AS manager_name
       FROM feedback_entries fe
       LEFT JOIN users u ON u.user_id = fe.manager_id
       LEFT JOIN employees e ON e.employee_id = u.employee_id
       WHERE fe.goal_id = $1 AND fe.organization_id = $2`;
    const params = [goalId, orgId];
    if (employeeId) {
      sql += ` AND (fe.assignment_id IN (SELECT assignment_id FROM goal_assignments WHERE goal_id = $1 AND employee_id = $3))`;
      params.push(employeeId);
    }
    sql += ` ORDER BY fe.created_at DESC`;
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const res = await query(sql, params);
    return { rows: res.rows, totalCount };
  }

  // --- Action Items ---
  async createActionItem({ organization_id, goal_id, assigned_by, assigned_to, title, description, priority, due_date }) {
    let resolvedAssignedTo = assigned_to;
    let employeeId = assigned_to;
    if (assigned_to) {
      const userRes = await query(
        `SELECT user_id, employee_id FROM users WHERE employee_id = $1 OR user_id = $1 LIMIT 1`,
        [assigned_to]
      );
      if (userRes.rows[0]) {
        resolvedAssignedTo = userRes.rows[0].user_id;
        employeeId = userRes.rows[0].employee_id || assigned_to;
      }
    }

    const assignRes = await query(
      `SELECT assignment_id FROM goal_assignments WHERE goal_id = $1 AND employee_id = $2 LIMIT 1`,
      [goal_id, employeeId]
    );
    const assignmentId = assignRes.rows[0]?.assignment_id || null;

    const res = await query(
      `INSERT INTO feedback_action_items (organization_id, goal_id, assignment_id, assigned_by, assigned_to, title, description, priority, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [organization_id, goal_id, assignmentId, assigned_by, resolvedAssignedTo, title, description, priority || 'MEDIUM', due_date || null]
    );
    return res.rows[0];
  }

  async getActionItemsByGoalId(goalId, orgId, employeeId = null, limit = 10, offset = 0) {
    let countSql = `SELECT COUNT(*)::int AS count
                    FROM feedback_action_items fai
                    LEFT JOIN users ut ON ut.user_id = fai.assigned_to
                    LEFT JOIN employees et ON et.employee_id = ut.employee_id
                    WHERE fai.goal_id = $1 AND fai.organization_id = $2`;
    const countParams = [goalId, orgId];
    if (employeeId) {
      countSql += ` AND (fai.assigned_to = $3 OR et.employee_id = $3 OR fai.assignment_id IN (SELECT assignment_id FROM goal_assignments WHERE goal_id = $1 AND employee_id = $3))`;
      countParams.push(employeeId);
    }
    const countRes = await query(countSql, countParams);
    const totalCount = countRes.rows[0]?.count || 0;

    let sql = `SELECT fai.*,
               COALESCE(NULLIF(CONCAT(eb.first_name, ' ', eb.last_name), ' '), ub.email) AS assigned_by_name,
               COALESCE(NULLIF(CONCAT(et.first_name, ' ', et.last_name), ' '), ut.email) AS assigned_to_name
        FROM feedback_action_items fai
        LEFT JOIN users ub ON ub.user_id = fai.assigned_by
        LEFT JOIN employees eb ON eb.employee_id = ub.employee_id
        LEFT JOIN users ut ON ut.user_id = fai.assigned_to
        LEFT JOIN employees et ON et.employee_id = ut.employee_id
        WHERE fai.goal_id = $1 AND fai.organization_id = $2`;
    const params = [goalId, orgId];
    if (employeeId) {
      sql += ` AND (fai.assigned_to = $3 OR et.employee_id = $3 OR fai.assignment_id IN (SELECT assignment_id FROM goal_assignments WHERE goal_id = $1 AND employee_id = $3))`;
      params.push(employeeId);
    }
    sql += ` ORDER BY fai.created_at DESC`;
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const res = await query(sql, params);
    return { rows: res.rows, totalCount };
  }

  async getActionItemById(actionItemId, orgId) {
    const res = await query(
      `SELECT * FROM feedback_action_items WHERE action_item_id = $1 AND organization_id = $2`,
      [actionItemId, orgId]
    );
    return res.rows[0] || null;
  }

  async markActionItemCompleted(actionItemId, orgId) {
    const res = await query(
      `UPDATE feedback_action_items
       SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW()
       WHERE action_item_id = $1 AND organization_id = $2
       RETURNING *`,
      [actionItemId, orgId]
    );
    return res.rows[0];
  }

  async verifyActionItem(actionItemId, orgId) {
    const res = await query(
      `UPDATE feedback_action_items
       SET verified_by_manager = TRUE, updated_at = NOW()
       WHERE action_item_id = $1 AND organization_id = $2
       RETURNING *`,
      [actionItemId, orgId]
    );
    return res.rows[0];
  }

  // --- Praises ---
  async createPraise({ organization_id, goal_id, from_user, to_user, visibility, category, message }) {
    let resolvedToUser = to_user;
    let employeeId = to_user;
    if (to_user) {
      const userRes = await query(
        `SELECT user_id, employee_id FROM users WHERE employee_id = $1 OR user_id = $1 LIMIT 1`,
        [to_user]
      );
      if (userRes.rows[0]) {
        resolvedToUser = userRes.rows[0].user_id;
        employeeId = userRes.rows[0].employee_id || to_user;
      }
    }

    const assignRes = await query(
      `SELECT assignment_id FROM goal_assignments WHERE goal_id = $1 AND employee_id = $2 LIMIT 1`,
      [goal_id, employeeId]
    );
    const assignmentId = assignRes.rows[0]?.assignment_id || null;

    const res = await query(
      `INSERT INTO feedback_praises (organization_id, goal_id, assignment_id, from_user, to_user, visibility, category, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [organization_id, goal_id, assignmentId, from_user, resolvedToUser, visibility || 'PUBLIC', category, message]
    );
    return res.rows[0];
  }

  async getPraisesByGoalId(goalId, orgId, employeeId = null, limit = 10, offset = 0) {
    let countSql = `SELECT COUNT(*)::int AS count
                    FROM feedback_praises fp
                    LEFT JOIN users ut ON ut.user_id = fp.to_user
                    LEFT JOIN employees et ON et.employee_id = ut.employee_id
                    WHERE fp.goal_id = $1 AND fp.organization_id = $2`;
    const countParams = [goalId, orgId];
    if (employeeId) {
      countSql += ` AND (fp.to_user = $3 OR et.employee_id = $3 OR fp.assignment_id IN (SELECT assignment_id FROM goal_assignments WHERE goal_id = $1 AND employee_id = $3))`;
      countParams.push(employeeId);
    }
    const countRes = await query(countSql, countParams);
    const totalCount = countRes.rows[0]?.count || 0;

    let sql = `SELECT fp.*,
              COALESCE(NULLIF(CONCAT(ef.first_name, ' ', ef.last_name), ' '), uf.email) AS from_user_name,
              COALESCE(NULLIF(CONCAT(et.first_name, ' ', et.last_name), ' '), ut.email) AS to_user_name
       FROM feedback_praises fp
       LEFT JOIN users uf ON uf.user_id = fp.from_user
       LEFT JOIN employees ef ON ef.employee_id = uf.employee_id
       LEFT JOIN users ut ON ut.user_id = fp.to_user
       LEFT JOIN employees et ON et.employee_id = ut.employee_id
       WHERE fp.goal_id = $1 AND fp.organization_id = $2`;
    const params = [goalId, orgId];
    if (employeeId) {
      sql += ` AND (fp.to_user = $3 OR et.employee_id = $3 OR fp.assignment_id IN (SELECT assignment_id FROM goal_assignments WHERE goal_id = $1 AND employee_id = $3))`;
      params.push(employeeId);
    }
    sql += ` ORDER BY fp.created_at DESC`;
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const res = await query(sql, params);
    return { rows: res.rows, totalCount };
  }

  // --- Unified Coaching Timeline ---
  async getGoalCoachingTimeline(goalId, orgId, employeeId = null, limit = 10, offset = 0) {
    let empClauseFe = '';
    let empClauseFr = '';
    let empClauseFai = '';
    let empClauseFp = '';
    let empClauseGa = '';
    let empClauseCa = '';
    const params = [goalId, orgId];
    if (employeeId) {
      empClauseFe = ` AND (fe.assignment_id IN (SELECT assignment_id FROM goal_assignments WHERE goal_id = $1 AND employee_id = $3))`;
      empClauseFr = ` AND (fr.assignment_id IN (SELECT assignment_id FROM goal_assignments WHERE goal_id = $1 AND employee_id = $3) OR e.employee_id = $3)`;
      empClauseFai = ` AND (fai.assignment_id IN (SELECT assignment_id FROM goal_assignments WHERE goal_id = $1 AND employee_id = $3))`;
      empClauseFp = ` AND (fp.assignment_id IN (SELECT assignment_id FROM goal_assignments WHERE goal_id = $1 AND employee_id = $3))`;
      empClauseGa = ` AND ga.employee_id = $3`;
      empClauseCa = ` AND (ca.assignment_id IN (SELECT assignment_id FROM goal_assignments WHERE goal_id = $1 AND employee_id = $3))`;
      params.push(employeeId);
    }

    const countSql = `
      SELECT COUNT(*)::int AS count FROM (
        SELECT fe.feedback_id FROM feedback_entries fe
        WHERE fe.goal_id = $1 AND fe.organization_id = $2 ${empClauseFe}
        UNION ALL
        SELECT fr.reflection_id FROM feedback_reflections fr
        LEFT JOIN users u ON u.user_id = fr.employee_id
        LEFT JOIN employees e ON e.employee_id = u.employee_id
        WHERE fr.goal_id = $1 AND fr.organization_id = $2 ${empClauseFr}
        UNION ALL
        SELECT fai.action_item_id FROM feedback_action_items fai
        WHERE fai.goal_id = $1 AND fai.organization_id = $2 ${empClauseFai}
        UNION ALL
        SELECT fai.action_item_id FROM feedback_action_items fai
        WHERE fai.goal_id = $1 AND fai.organization_id = $2 AND fai.completed_at IS NOT NULL ${empClauseFai}
        UNION ALL
        SELECT fai.action_item_id FROM feedback_action_items fai
        WHERE fai.goal_id = $1 AND fai.organization_id = $2 AND fai.verified_by_manager = TRUE ${empClauseFai}
        UNION ALL
        SELECT fp.praise_id FROM feedback_praises fp
        WHERE fp.goal_id = $1 AND fp.organization_id = $2 ${empClauseFp}
        UNION ALL
        SELECT g.goal_id FROM goals g
        WHERE g.goal_id = $1 AND g.organization_id = $2
        UNION ALL
        SELECT ga.assignment_id FROM goal_assignments ga
        WHERE ga.goal_id = $1 AND ga.organization_id = $2 AND ga.status = 'COMPLETED' AND ga.completed_at IS NOT NULL ${empClauseGa}
        UNION ALL
        SELECT ca.assessment_id FROM competency_assessments ca
        WHERE ca.goal_id = $1 AND ca.organization_id = $2 ${empClauseCa}
        UNION ALL
        SELECT ga.assignment_id FROM goal_assignments ga
        WHERE ga.goal_id = $1 AND ga.organization_id = $2 AND ga.employee_acknowledged = TRUE AND ga.acknowledged_at IS NOT NULL ${empClauseGa}
      ) AS total
    `;
    const countRes = await query(countSql, params);
    const totalCount = countRes.rows[0]?.count || 0;

    let sql = `
      SELECT 'FEEDBACK' AS item_type, fe.feedback_id AS entity_id, fe.created_at, fe.feedback_type AS sub_type, fe.feedback_text AS details, fe.manager_id AS actor_id, COALESCE(NULLIF(CONCAT(e.first_name, ' ', e.last_name), ' '), u.email) AS actor_name
      FROM feedback_entries fe
      LEFT JOIN users u ON u.user_id = fe.manager_id
      LEFT JOIN employees e ON e.employee_id = u.employee_id
      WHERE fe.goal_id = $1 AND fe.organization_id = $2 ${empClauseFe}

      UNION ALL

      SELECT 'REFLECTION' AS item_type, fr.reflection_id AS entity_id, fr.created_at, 'REFLECTION' AS sub_type, COALESCE(fr.what_i_learned, fr.next_steps, 'Submitted reflection') AS details, fr.employee_id AS actor_id, COALESCE(NULLIF(CONCAT(e.first_name, ' ', e.last_name), ' '), u.email) AS actor_name
      FROM feedback_reflections fr
      LEFT JOIN users u ON u.user_id = fr.employee_id
      LEFT JOIN employees e ON e.employee_id = u.employee_id
      WHERE fr.goal_id = $1 AND fr.organization_id = $2 ${empClauseFr}

      UNION ALL

      SELECT 'ACTION_ITEM_ASSIGNED' AS item_type, fai.action_item_id AS entity_id, fai.created_at, fai.status AS sub_type, fai.title AS details, fai.assigned_by AS actor_id, COALESCE(NULLIF(CONCAT(e.first_name, ' ', e.last_name), ' '), u.email) AS actor_name
      FROM feedback_action_items fai
      LEFT JOIN users u ON u.user_id = fai.assigned_by
      LEFT JOIN employees e ON e.employee_id = u.employee_id
      WHERE fai.goal_id = $1 AND fai.organization_id = $2 ${empClauseFai}

      UNION ALL

      SELECT 'ACTION_ITEM_COMPLETED' AS item_type, fai.action_item_id AS entity_id, fai.completed_at AS created_at, fai.status AS sub_type, fai.title AS details, ut.user_id AS actor_id, COALESCE(NULLIF(CONCAT(et.first_name, ' ', et.last_name), ' '), ut.email) AS actor_name
      FROM feedback_action_items fai
      LEFT JOIN users ut ON ut.user_id = fai.assigned_to
      LEFT JOIN employees et ON et.employee_id = ut.employee_id
      WHERE fai.goal_id = $1 AND fai.organization_id = $2 AND fai.completed_at IS NOT NULL ${empClauseFai}

      UNION ALL

      SELECT 'ACTION_ITEM_VERIFIED' AS item_type, fai.action_item_id AS entity_id, fai.updated_at AS created_at, fai.status AS sub_type, fai.title AS details, fai.assigned_by AS actor_id, COALESCE(NULLIF(CONCAT(e.first_name, ' ', e.last_name), ' '), u.email) AS actor_name
      FROM feedback_action_items fai
      LEFT JOIN users u ON u.user_id = fai.assigned_by
      LEFT JOIN employees e ON e.employee_id = u.employee_id
      WHERE fai.goal_id = $1 AND fai.organization_id = $2 AND fai.verified_by_manager = TRUE ${empClauseFai}

      UNION ALL

      SELECT 'PRAISE' AS item_type, fp.praise_id AS entity_id, fp.created_at, fp.category AS sub_type, fp.message AS details, fp.from_user AS actor_id, COALESCE(NULLIF(CONCAT(e.first_name, ' ', e.last_name), ' '), u.email) AS actor_name
      FROM feedback_praises fp
      LEFT JOIN users u ON u.user_id = fp.from_user
      LEFT JOIN employees e ON e.employee_id = u.employee_id
      WHERE fp.goal_id = $1 AND fp.organization_id = $2 ${empClauseFp}

      UNION ALL

      SELECT 'GOAL_CREATED' AS item_type, g.goal_id AS entity_id, g.created_at, 'CREATED' AS sub_type, g.title AS details, g.created_by AS actor_id, COALESCE(NULLIF(CONCAT(e.first_name, ' ', e.last_name), ' '), u.email) AS actor_name
      FROM goals g
      LEFT JOIN users u ON u.user_id = g.created_by
      LEFT JOIN employees e ON e.employee_id = u.employee_id
      WHERE g.goal_id = $1 AND g.organization_id = $2

      UNION ALL

      SELECT 'GOAL_COMPLETED' AS item_type, ga.assignment_id AS entity_id, ga.completed_at AS created_at, 'COMPLETED' AS sub_type, g.title AS details, ga.assigned_by AS actor_id, COALESCE(NULLIF(CONCAT(e.first_name, ' ', e.last_name), ' '), u.email) AS actor_name
      FROM goal_assignments ga
      JOIN goals g ON g.goal_id = ga.goal_id
      LEFT JOIN users u ON u.user_id = ga.assigned_by
      LEFT JOIN employees e ON e.employee_id = u.employee_id
      WHERE ga.goal_id = $1 AND ga.organization_id = $2 AND ga.status = 'COMPLETED' AND ga.completed_at IS NOT NULL ${empClauseGa}

      UNION ALL

      SELECT 'COMPETENCY_RATED' AS item_type, ca.assessment_id AS entity_id, ca.rated_at AS created_at, gc.name AS sub_type, CONCAT('Rated: ', ca.rating, ' ★') AS details, ca.rated_by AS actor_id, COALESCE(NULLIF(CONCAT(e.first_name, ' ', e.last_name), ' '), u.email) AS actor_name
      FROM competency_assessments ca
      JOIN goal_competencies gc ON gc.goal_competency_id = ca.goal_competency_id
      LEFT JOIN users u ON u.user_id = ca.rated_by
      LEFT JOIN employees e ON e.employee_id = u.employee_id
      WHERE ca.goal_id = $1 AND ca.organization_id = $2 ${empClauseCa}

      UNION ALL

      SELECT 'COMPETENCY_ACKNOWLEDGED' AS item_type, ga.assignment_id AS entity_id, ga.acknowledged_at AS created_at, 'ACKNOWLEDGED' AS sub_type, 'Employee acknowledged competency assessment' AS details, u.user_id AS actor_id, COALESCE(NULLIF(CONCAT(e.first_name, ' ', e.last_name), ' '), u.email) AS actor_name
      FROM goal_assignments ga
      JOIN employees emp ON emp.employee_id = ga.employee_id
      LEFT JOIN users u ON u.employee_id = emp.employee_id
      LEFT JOIN employees e ON e.employee_id = u.employee_id
      WHERE ga.goal_id = $1 AND ga.organization_id = $2 AND ga.employee_acknowledged = TRUE AND ga.acknowledged_at IS NOT NULL ${empClauseGa}

      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const res = await query(sql, params);
    return { rows: res.rows, totalCount };
  }

  // --- Organization Coaching Overview ---
  async getOrganizationCoachingOverview(orgId) {
    const res = await query(
      `SELECT ga.assignment_id, g.goal_id, g.title, g.description, ga.status, ga.progress, ga.employee_id AS assigned_to_employee_id,
              TRIM(CONCAT(e.first_name, ' ', e.last_name)) AS employee_name,
              e.designation AS employee_designation,
              (SELECT COUNT(*)::int FROM feedback_action_items fai WHERE fai.assignment_id = ga.assignment_id AND fai.status = 'PENDING') AS pending_actions_count,
              (SELECT COUNT(*)::int FROM feedback_action_items fai WHERE fai.assignment_id = ga.assignment_id AND fai.status = 'COMPLETED' AND fai.verified_by_manager = FALSE) AS unverified_actions_count,
              (SELECT COUNT(*)::int FROM feedback_praises fp WHERE fp.assignment_id = ga.assignment_id) AS praise_count,
              (SELECT COUNT(*)::int FROM feedback_reflections fr WHERE fr.assignment_id = ga.assignment_id) AS reflection_count
       FROM goal_assignments ga
       JOIN goals g ON g.goal_id = ga.goal_id
       JOIN employees e ON e.employee_id = ga.employee_id
       WHERE ga.organization_id = $1 AND g.performance_technique = 'CONTINUOUS_FEEDBACK'
       ORDER BY ga.created_at DESC`,
      [orgId]
    );
    return res.rows;
  }

  // --- Performance Dashboard Stats ---
  async getDashboardStats(orgId, userId = null, role = null) {
    const totalGoalsRes = await query(
      `SELECT COUNT(*)::int AS count FROM goals WHERE organization_id = $1 AND performance_technique = 'CONTINUOUS_FEEDBACK'`,
      [orgId]
    );

    const activeGoalsRes = await query(
      `SELECT COUNT(*)::int AS count FROM goals WHERE organization_id = $1 AND performance_technique = 'CONTINUOUS_FEEDBACK' AND status IN ('ACTIVE', 'IN_PROGRESS')`,
      [orgId]
    );

    const completedGoalsRes = await query(
      `SELECT COUNT(*)::int AS count FROM goals WHERE organization_id = $1 AND performance_technique = 'CONTINUOUS_FEEDBACK' AND status = 'COMPLETED'`,
      [orgId]
    );

    const pendingActionsRes = await query(
      `SELECT COUNT(*)::int AS count FROM feedback_action_items WHERE organization_id = $1 AND status = 'PENDING'`,
      [orgId]
    );

    const completedActionsRes = await query(
      `SELECT COUNT(*)::int AS count FROM feedback_action_items WHERE organization_id = $1 AND status = 'COMPLETED'`,
      [orgId]
    );

    const praiseSentRes = await query(
      `SELECT COUNT(*)::int AS count FROM feedback_praises WHERE organization_id = $1`,
      [orgId]
    );

    const feedbackCountRes = await query(
      `SELECT COUNT(*)::int AS count FROM feedback_entries WHERE organization_id = $1`,
      [orgId]
    );

    return {
      total_development_goals: totalGoalsRes.rows[0].count,
      active_goals: activeGoalsRes.rows[0].count,
      completed_goals: completedGoalsRes.rows[0].count,
      pending_action_items: pendingActionsRes.rows[0].count,
      completed_action_items: completedActionsRes.rows[0].count,
      praise_sent: praiseSentRes.rows[0].count,
      feedback_given: feedbackCountRes.rows[0].count
    };
  }

  async getTechniqueConfiguration(orgId, technique) {
    const res = await query(
      `SELECT configuration_json FROM performance_technique_configurations 
       WHERE organization_id = $1 AND technique = $2`,
      [orgId, technique]
    );
    if (res.rows.length === 0) {
      if (technique === '360_FEEDBACK') {
        return {
          allow_manager: true, manager_count: 1, manager_weight: 40,
          allow_peers: true, peer_count: 2, peer_weight: 40,
          allow_direct_reports: true, direct_report_count: 1, direct_report_weight: 20,
          anonymous_enabled: false,
          minimum_completion_percentage: 100,
          reminder_interval_days: 3,
          late_submission_policy: 'BLOCK'
        };
      }
      return {
        reflection: { enabled: true, weight: 20 },
        manager_feedback: { enabled: true, weight: 20 },
        verified_action_items: { enabled: true, weight: 40 },
        goal_closure: { enabled: true, weight: 20 }
      };
    }
    return res.rows[0].configuration_json;
  }

  async saveTechniqueConfiguration(orgId, technique, configJson) {
    const res = await query(
      `INSERT INTO performance_technique_configurations (organization_id, technique, configuration_json, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (organization_id, technique) 
       DO UPDATE SET configuration_json = EXCLUDED.configuration_json, updated_at = NOW()
       RETURNING configuration_json`,
      [orgId, technique, JSON.stringify(configJson)]
    );
    return res.rows[0].configuration_json;
  }
}

module.exports = new ContinuousFeedbackRepository();
