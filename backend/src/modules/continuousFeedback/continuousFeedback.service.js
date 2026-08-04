const repo = require('./continuousFeedback.repository');
const goalRepo = require('../goal/goal.repository');
const { logActivity } = require('../auditLog/auditLog.service');

class ContinuousFeedbackService {
  async _assertContinuousFeedbackEnabled(orgId) {
    const { query } = require('../../config/db');
    const modulesRes = await query(
      `SELECT cm.is_enabled 
       FROM client_modules cm
       JOIN client_admins ca ON ca.client_admin_id = cm.client_admin_id
       WHERE ca.organization_id = $1 AND cm.module_key = 'continuous_feedback'`,
      [orgId]
    );
    if (modulesRes.rows.length > 0 && !modulesRes.rows[0].is_enabled) {
      const err = new Error('Continuous Feedback has been disabled for your organization.');
      err.statusCode = 403;
      throw err;
    }
  }

  async _assertContinuousFeedbackGoal(goalId, orgId) {
    const goal = await goalRepo.getGoalById(orgId, goalId);
    if (!goal) {
      const err = new Error('Goal not found.');
      err.statusCode = 404;
      throw err;
    }
    if (goal.performance_technique !== 'CONTINUOUS_FEEDBACK') {
      const err = new Error(`Goal technique is '${goal.performance_technique}'. Continuous feedback is only available for goals with technique 'CONTINUOUS_FEEDBACK'.`);
      err.statusCode = 400;
      throw err;
    }
    return goal;
  }

  // --- Dynamic Reflection Template & Locking ---
  async saveReflectionTemplate(goalId, orgId, questions, userContext = {}) {
    await this._assertContinuousFeedbackEnabled(orgId);
    await this._assertContinuousFeedbackGoal(goalId, orgId);

    const isLocked = await repo.isTemplateLocked(goalId, orgId);
    if (isLocked) {
      const err = new Error('Reflection template is locked because employee responses already exist.');
      err.statusCode = 400;
      throw err;
    }

    return await repo.saveReflectionTemplate(orgId, goalId, questions);
  }

  async getReflectionTemplate(goalId, orgId) {
    await this._assertContinuousFeedbackGoal(goalId, orgId);
    const questions = await repo.getReflectionTemplate(goalId, orgId);
    const isLocked = await repo.isTemplateLocked(goalId, orgId);
    return {
      is_locked: isLocked,
      questions: questions
    };
  }

  async updateReflectionQuestion(templateId, orgId, questionData) {
    try {
      const updated = await repo.updateReflectionQuestion(templateId, orgId, questionData);
      if (!updated) {
        const err = new Error('Template question not found.');
        err.statusCode = 404;
        throw err;
      }
      return updated;
    } catch (err) {
      if (err.message.includes('locked')) {
        err.statusCode = 400;
      }
      throw err;
    }
  }

  async deleteReflectionQuestion(templateId, orgId) {
    try {
      const deleted = await repo.deleteReflectionQuestion(templateId, orgId);
      if (!deleted) {
        const err = new Error('Template question not found.');
        err.statusCode = 404;
        throw err;
      }
      return { success: true };
    } catch (err) {
      if (err.message.includes('locked')) {
        err.statusCode = 400;
      }
      throw err;
    }
  }

  // --- Dynamic Reflection Answer Submission ---
  async submitReflectionAnswers({ goalId, orgId, userId, role, answers, summaryNotes, reqMeta }) {
    await this._assertContinuousFeedbackEnabled(orgId);
    const goal = await this._assertContinuousFeedbackGoal(goalId, orgId);

    // Validate required questions
    const template = await repo.getReflectionTemplate(goalId, orgId);
    if (template && template.length > 0) {
      for (const q of template) {
        if (q.is_required) {
          const provided = (answers || []).find(a => a.template_id === q.template_id);
          if (!provided || !provided.answer || !provided.answer.trim()) {
            const err = new Error(`Required question missing answer: "${q.question}"`);
            err.statusCode = 400;
            throw err;
          }
        }
      }
    }

    const reflection = await repo.submitReflectionAnswers({
      organization_id: orgId,
      goal_id: goalId,
      employee_id: userId,
      answers: answers || [],
      summary_notes: summaryNotes
    });

    await logActivity({
      organizationId: orgId,
      actorUserId: userId,
      actorRole: role,
      moduleName: 'continuous_feedback',
      actionName: 'SUBMIT_REFLECTION_ANSWERS',
      entityName: 'feedback_reflection',
      entityId: reflection.reflection_id,
      entityDisplayName: `Employee Reflection: ${goal.title}`,
      reqContext: reqMeta
    });

    try {
      const goalAssignmentService = require('../goal/goalAssignment.service');
      await goalAssignmentService.recalculateGoalProgress(orgId, goalId, userId);
    } catch (e) {
      console.error('Failed to recalculate progress in submitReflectionAnswers:', e);
    }

    return reflection;
  }

  // --- Feedback ---
  async addFeedback({ goalId, orgId, userId, role, feedbackType, feedbackText, employeeId, reqMeta }) {
    await this._assertContinuousFeedbackEnabled(orgId);
    const goal = await this._assertContinuousFeedbackGoal(goalId, orgId);

    const feedback = await repo.createFeedback({
      organization_id: orgId,
      goal_id: goalId,
      manager_id: userId,
      employee_id: employeeId,
      feedback_type: feedbackType || 'COACHING',
      feedback_text: feedbackText
    });

    await logActivity({
      organizationId: orgId,
      actorUserId: userId,
      actorRole: role,
      moduleName: 'continuous_feedback',
      actionName: 'CREATE_FEEDBACK',
      entityName: 'feedback_entry',
      entityId: feedback.feedback_id,
      entityDisplayName: `Coaching Feedback: ${goal.title}`,
      reqContext: reqMeta
    });

    try {
      const goalAssignmentService = require('../goal/goalAssignment.service');
      await goalAssignmentService.recalculateGoalProgress(orgId, goalId, employeeId);
    } catch (e) {
      console.error('Failed to recalculate progress in addFeedback:', e);
    }

    return feedback;
  }

  async getGoalFeedbacks(goalId, orgId, employeeId = null, page = 1, limit = 10) {
    await this._assertContinuousFeedbackGoal(goalId, orgId);
    const offset = (page - 1) * limit;
    const { rows, totalCount } = await repo.getFeedbackByGoalId(goalId, orgId, employeeId, limit, offset);
    return {
      rows,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit
      }
    };
  }

  // --- Reflection ---
  async addReflection({ goalId, orgId, userId, role, whatILearned, challengesFaced, supportNeeded, nextSteps, reqMeta }) {
    await this._assertContinuousFeedbackEnabled(orgId);
    const goal = await this._assertContinuousFeedbackGoal(goalId, orgId);

    const reflection = await repo.createReflection({
      organization_id: orgId,
      goal_id: goalId,
      employee_id: userId,
      what_i_learned: whatILearned,
      challenges_faced: challengesFaced,
      support_needed: supportNeeded,
      next_steps: nextSteps
    });

    await logActivity({
      organizationId: orgId,
      actorUserId: userId,
      actorRole: role,
      moduleName: 'continuous_feedback',
      actionName: 'SUBMIT_REFLECTION',
      entityName: 'feedback_reflection',
      entityId: reflection.reflection_id,
      entityDisplayName: `Employee Reflection: ${goal.title}`,
      reqContext: reqMeta
    });

    try {
      const goalAssignmentService = require('../goal/goalAssignment.service');
      await goalAssignmentService.recalculateGoalProgress(orgId, goalId, userId);
    } catch (e) {
      console.error('Failed to recalculate progress in addReflection:', e);
    }

    return reflection;
  }

  async getGoalReflections(goalId, orgId, employeeId = null, page = 1, limit = 10) {
    await this._assertContinuousFeedbackGoal(goalId, orgId);
    const offset = (page - 1) * limit;
    const { rows, totalCount } = await repo.getReflectionsByGoalId(goalId, orgId, employeeId, limit, offset);
    return {
      rows,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit
      }
    };
  }

  // --- Action Items ---
  async addActionItem({ goalId, orgId, userId, role, assignedTo, title, description, priority, dueDate, reqMeta }) {
    await this._assertContinuousFeedbackEnabled(orgId);
    const goal = await this._assertContinuousFeedbackGoal(goalId, orgId);

    const targetAssignee = assignedTo || goal.assigned_to_employee_id;
    if (!targetAssignee) {
      const err = new Error('Action item must be assigned to an employee. Please select an assignee.');
      err.statusCode = 400;
      throw err;
    }

    const actionItem = await repo.createActionItem({
      organization_id: orgId,
      goal_id: goalId,
      assigned_by: userId,
      assigned_to: targetAssignee,
      title: title,
      description: description,
      priority: priority,
      due_date: dueDate
    });

    await logActivity({
      organizationId: orgId,
      actorUserId: userId,
      actorRole: role,
      moduleName: 'continuous_feedback',
      actionName: 'ASSIGN_ACTION_ITEM',
      entityName: 'feedback_action_item',
      entityId: actionItem.action_item_id,
      entityDisplayName: `Action Item: ${title}`,
      reqContext: reqMeta
    });

    try {
      const goalAssignmentService = require('../goal/goalAssignment.service');
      await goalAssignmentService.recalculateGoalProgress(orgId, goalId, targetAssignee);
    } catch (e) {
      console.error('Failed to recalculate progress in addActionItem:', e);
    }

    return actionItem;
  }

  async getGoalActionItems(goalId, orgId, employeeId = null, page = 1, limit = 10) {
    await this._assertContinuousFeedbackGoal(goalId, orgId);
    const offset = (page - 1) * limit;
    const { rows, totalCount } = await repo.getActionItemsByGoalId(goalId, orgId, employeeId, limit, offset);
    return {
      rows,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit
      }
    };
  }

  async markActionItemCompleted({ actionItemId, orgId, userId, role, reqMeta }) {
    await this._assertContinuousFeedbackEnabled(orgId);
    const existing = await repo.getActionItemById(actionItemId, orgId);
    if (!existing) {
      const err = new Error('Action item not found.');
      err.statusCode = 404;
      throw err;
    }

    const updated = await repo.markActionItemCompleted(actionItemId, orgId);

    await logActivity({
      organizationId: orgId,
      actorUserId: userId,
      actorRole: role,
      moduleName: 'continuous_feedback',
      actionName: 'COMPLETE_ACTION_ITEM',
      entityName: 'feedback_action_item',
      entityId: actionItemId,
      entityDisplayName: `Action Item: ${existing.title}`,
      reqContext: reqMeta
    });

    try {
      const goalAssignmentService = require('../goal/goalAssignment.service');
      await goalAssignmentService.recalculateGoalProgress(orgId, goalId, existing.assigned_to);
    } catch (e) {
      console.error('Failed to recalculate progress in markActionItemCompleted:', e);
    }

    return updated;
  }

  async verifyActionItem({ actionItemId, orgId, userId, role, reqMeta }) {
    await this._assertContinuousFeedbackEnabled(orgId);
    const existing = await repo.getActionItemById(actionItemId, orgId);
    if (!existing) {
      const err = new Error('Action item not found.');
      err.statusCode = 404;
      throw err;
    }

    const updated = await repo.verifyActionItem(actionItemId, orgId);

    await logActivity({
      organizationId: orgId,
      actorUserId: userId,
      actorRole: role,
      moduleName: 'continuous_feedback',
      actionName: 'VERIFY_ACTION_ITEM',
      entityName: 'feedback_action_item',
      entityId: actionItemId,
      entityDisplayName: `Action Item: ${existing.title}`,
      reqContext: reqMeta
    });

    try {
      const goalAssignmentService = require('../goal/goalAssignment.service');
      await goalAssignmentService.recalculateGoalProgress(orgId, goalId, existing.assigned_to);
    } catch (e) {
      console.error('Failed to recalculate progress in verifyActionItem:', e);
    }

    return updated;
  }

  // --- Praise ---
  async addPraise({ goalId, orgId, userId, role, toUser, visibility, category, message, reqMeta }) {
    await this._assertContinuousFeedbackEnabled(orgId);
    const goal = await this._assertContinuousFeedbackGoal(goalId, orgId);

    const praise = await repo.createPraise({
      organization_id: orgId,
      goal_id: goalId,
      from_user: userId,
      to_user: toUser || goal.assigned_to_employee_id,
      visibility: visibility,
      category: category,
      message: message
    });

    await logActivity({
      organizationId: orgId,
      actorUserId: userId,
      actorRole: role,
      moduleName: 'continuous_feedback',
      actionName: 'SEND_PRAISE',
      entityName: 'feedback_praise',
      entityId: praise.praise_id,
      entityDisplayName: `Praise Badge: ${category}`,
      reqContext: reqMeta
    });

    return praise;
  }

  async getGoalPraises(goalId, orgId, employeeId = null, page = 1, limit = 10) {
    await this._assertContinuousFeedbackGoal(goalId, orgId);
    const offset = (page - 1) * limit;
    const { rows, totalCount } = await repo.getPraisesByGoalId(goalId, orgId, employeeId, limit, offset);
    return {
      rows,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit
      }
    };
  }

  async getGoalCoachingTimeline(goalId, orgId, employeeId = null, page = 1, limit = 10) {
    await this._assertContinuousFeedbackGoal(goalId, orgId);
    const offset = (page - 1) * limit;
    const { rows, totalCount } = await repo.getGoalCoachingTimeline(goalId, orgId, employeeId, limit, offset);
    return {
      rows,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit
      }
    };
  }

  async getOrganizationCoachingOverview(orgId) {
    return repo.getOrganizationCoachingOverview(orgId);
  }

  async getDashboardStats(orgId, userId, role) {
    return repo.getDashboardStats(orgId, userId, role);
  }

  async getTechniqueConfiguration(orgId, technique) {
    return repo.getTechniqueConfiguration(orgId, technique);
  }

  async saveTechniqueConfiguration(orgId, technique, configJson) {
    if (technique === '360_FEEDBACK') {
      let totalWeight = 0;
      if (configJson.allow_manager) totalWeight += Number(configJson.manager_weight || 0);
      if (configJson.allow_peers) totalWeight += Number(configJson.peer_weight || 0);
      if (configJson.allow_direct_reports) totalWeight += Number(configJson.direct_report_weight || 0);

      if (totalWeight !== 100) {
        throw { statusCode: 400, message: 'Total weight of enabled configurations must sum to exactly 100%.' };
      }
    } else if (technique === 'KPI') {
      if (!configJson.measurement_types || configJson.measurement_types.length === 0) {
        throw { statusCode: 400, message: 'At least one Allowed Measurement Type must be defined.' };
      }
    } else {
      await this._assertContinuousFeedbackEnabled(orgId);
      // Validate config sums to 100
      let totalWeight = 0;
      for (const key of Object.keys(configJson)) {
        if (configJson[key] && configJson[key].enabled) {
          totalWeight += Number(configJson[key].weight || 0);
        }
      }
      if (totalWeight !== 100) {
        throw { statusCode: 400, message: 'Total weight of enabled configurations must sum to exactly 100%.' };
      }
    }
    return repo.saveTechniqueConfiguration(orgId, technique, configJson);
  }
}

module.exports = new ContinuousFeedbackService();
