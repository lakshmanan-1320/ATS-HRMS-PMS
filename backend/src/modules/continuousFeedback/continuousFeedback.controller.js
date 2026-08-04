const service = require('./continuousFeedback.service');
const { STATUS_CODES } = require('../../constants/statusCodes');

function getReqMeta(req) {
  return {
    ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent']
  };
}

function resolveEmployeeId(req) {
  const isManagerOrAdmin = ['client_admin', 'hr', 'manager'].includes(req.user.role) || req.user.isManager === true;
  if (!isManagerOrAdmin) {
    return req.user.employeeId || null;
  }
  return req.query.employee_id || null;
}

class ContinuousFeedbackController {
  // --- Dynamic Reflection Templates ---
  async saveReflectionTemplate(req, res, next) {
    try {
      const { goalId } = req.params;
      const { questions } = req.body;
      const orgId = req.user.organizationId;

      const result = await service.saveReflectionTemplate(goalId, orgId, questions, req.user);
      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Reflection template saved successfully.',
        data: result
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getReflectionTemplate(req, res, next) {
    try {
      const { goalId } = req.params;
      const orgId = req.user.organizationId;
      const result = await service.getReflectionTemplate(goalId, orgId);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: result
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async updateReflectionQuestion(req, res, next) {
    try {
      const { templateId } = req.params;
      const orgId = req.user.organizationId;
      const result = await service.updateReflectionQuestion(templateId, orgId, req.body);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Reflection question updated.',
        data: result
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async deleteReflectionQuestion(req, res, next) {
    try {
      const { templateId } = req.params;
      const orgId = req.user.organizationId;
      await service.deleteReflectionQuestion(templateId, orgId);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Reflection question deleted.'
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async submitReflectionAnswers(req, res, next) {
    try {
      const { goalId } = req.params;
      const { answers, summary_notes } = req.body;
      const orgId = req.user.organizationId;
      const userId = req.user.userId;
      const role = req.user.role;

      const result = await service.submitReflectionAnswers({
        goalId,
        orgId,
        userId,
        role,
        answers,
        summaryNotes: summary_notes,
        reqMeta: getReqMeta(req)
      });

      return res.status(STATUS_CODES.CREATED).json({
        success: true,
        message: 'Reflection answers submitted successfully.',
        data: result
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  // --- Feedback ---
  async addFeedback(req, res, next) {
    try {
      const { goalId } = req.params;
      const { feedback_type, feedback_text, employee_id } = req.body;
      const orgId = req.user.organizationId;
      const userId = req.user.userId;
      const role = req.user.role;

      if (!feedback_text || !feedback_text.trim()) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Feedback text is required.'
        });
      }

      const result = await service.addFeedback({
        goalId,
        orgId,
        userId,
        role,
        feedbackType: feedback_type,
        feedbackText: feedback_text.trim(),
        employeeId: employee_id || null,
        reqMeta: getReqMeta(req)
      });

      return res.status(STATUS_CODES.CREATED).json({
        success: true,
        message: 'Feedback entry created successfully.',
        data: result
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getGoalFeedbacks(req, res, next) {
    try {
      const { goalId } = req.params;
      const employeeId = resolveEmployeeId(req);
      const orgId = req.user.organizationId;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const result = await service.getGoalFeedbacks(goalId, orgId, employeeId, page, limit);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: result
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  // --- Reflection ---
  async addReflection(req, res, next) {
    try {
      const { goalId } = req.params;
      const { what_i_learned, challenges_faced, support_needed, next_steps } = req.body;
      const orgId = req.user.organizationId;
      const userId = req.user.userId;
      const role = req.user.role;

      const result = await service.addReflection({
        goalId,
        orgId,
        userId,
        role,
        whatILearned: what_i_learned,
        challengesFaced: challenges_faced,
        supportNeeded: support_needed,
        nextSteps: next_steps,
        reqMeta: getReqMeta(req)
      });

      return res.status(STATUS_CODES.CREATED).json({
        success: true,
        message: 'Reflection entry created successfully.',
        data: result
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getGoalReflections(req, res, next) {
    try {
      const { goalId } = req.params;
      const employeeId = resolveEmployeeId(req);
      const orgId = req.user.organizationId;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const result = await service.getGoalReflections(goalId, orgId, employeeId, page, limit);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: result
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  // --- Action Items ---
  async addActionItem(req, res, next) {
    try {
      const { goalId } = req.params;
      const { assigned_to, title, description, priority, due_date } = req.body;
      const orgId = req.user.organizationId;
      const userId = req.user.userId;
      const role = req.user.role;

      const result = await service.addActionItem({
        goalId,
        orgId,
        userId,
        role,
        assignedTo: assigned_to,
        title,
        description,
        priority,
        dueDate: due_date,
        reqMeta: getReqMeta(req)
      });

      return res.status(STATUS_CODES.CREATED).json({
        success: true,
        message: 'Action item created successfully.',
        data: result
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getGoalActionItems(req, res, next) {
    try {
      const { goalId } = req.params;
      const employeeId = resolveEmployeeId(req);
      const orgId = req.user.organizationId;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const result = await service.getGoalActionItems(goalId, orgId, employeeId, page, limit);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: result
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async markActionItemCompleted(req, res, next) {
    try {
      const { actionItemId } = req.params;
      const orgId = req.user.organizationId;
      const userId = req.user.userId;
      const role = req.user.role;

      const result = await service.markActionItemCompleted({
        actionItemId,
        orgId,
        userId,
        role,
        reqMeta: getReqMeta(req)
      });

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Action item marked as completed.',
        data: result
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async verifyActionItem(req, res, next) {
    try {
      const { actionItemId } = req.params;
      const orgId = req.user.organizationId;
      const userId = req.user.userId;
      const role = req.user.role;

      const result = await service.verifyActionItem({
        actionItemId,
        orgId,
        userId,
        role,
        reqMeta: getReqMeta(req)
      });

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Action item verified by manager.',
        data: result
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  // --- Praise ---
  async addPraise(req, res, next) {
    try {
      const { goalId } = req.params;
      const { to_user, visibility, category, message } = req.body;
      const orgId = req.user.organizationId;
      const userId = req.user.userId;
      const role = req.user.role;

      if (!category || !message || !message.trim()) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Praise category and message are required.'
        });
      }

      const result = await service.addPraise({
        goalId,
        orgId,
        userId,
        role,
        toUser: to_user,
        visibility,
        category,
        message: message.trim(),
        reqMeta: getReqMeta(req)
      });

      return res.status(STATUS_CODES.CREATED).json({
        success: true,
        message: 'Praise awarded successfully.',
        data: result
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getGoalPraises(req, res, next) {
    try {
      const { goalId } = req.params;
      const employeeId = resolveEmployeeId(req);
      const orgId = req.user.organizationId;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const result = await service.getGoalPraises(goalId, orgId, employeeId, page, limit);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: result
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getGoalCoachingTimeline(req, res, next) {
    try {
      const { goalId } = req.params;
      const employeeId = resolveEmployeeId(req);
      const orgId = req.user.organizationId;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const result = await service.getGoalCoachingTimeline(goalId, orgId, employeeId, page, limit);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: result
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getOrganizationCoachingOverview(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const result = await service.getOrganizationCoachingOverview(orgId);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: result
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getDashboardStats(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const userId = req.user.userId;
      const role = req.user.role;
      const result = await service.getDashboardStats(orgId, userId, role);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: result
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getTechniqueConfiguration(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { technique } = req.params;
      const result = await service.getTechniqueConfiguration(orgId, technique);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: result
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async saveTechniqueConfiguration(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { technique } = req.params;
      const configJson = req.body;
      const role = req.user.role;

      if (!['client_admin', 'super_admin'].includes(role)) {
        return res.status(STATUS_CODES.FORBIDDEN).json({ success: false, message: 'Only Client Admin or Super Admin can modify technique configurations.' });
      }

      const result = await service.saveTechniqueConfiguration(orgId, technique, configJson);

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: result
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }
}

module.exports = new ContinuousFeedbackController();
