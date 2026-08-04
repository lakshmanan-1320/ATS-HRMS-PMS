const service = require('./feedback360.service');
const { STATUS_CODES } = require('../../constants/statusCodes');

class Feedback360Controller {

  // ─── Goal Config ────────────────────────────────────────────────────────

  async getGoalConfig(req, res, next) {
    try {
      const { goalId } = req.params;
      const orgId = req.user.organizationId;
      const data = await service.getGoalConfig(goalId, orgId);
      res.status(STATUS_CODES.OK).json({ success: true, data });
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
      next(err);
    }
  }

  async saveGoalConfig(req, res, next) {
    try {
      const { goalId } = req.params;
      const orgId = req.user.organizationId;
      const data = await service.saveGoalConfig(orgId, goalId, req.body, req.user);
      res.status(STATUS_CODES.OK).json({ success: true, message: '360° Feedback configuration saved.', data });
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
      next(err);
    }
  }

  // ─── Questionnaire Templates ──────────────────────────────────────────

  async getTemplates(req, res, next) {
    try {
      const { goalId } = req.params;
      const orgId = req.user.organizationId;
      const data = await service.getTemplates(goalId, orgId);
      res.status(STATUS_CODES.OK).json({ success: true, data });
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
      next(err);
    }
  }

  async saveTemplates(req, res, next) {
    try {
      const { goalId } = req.params;
      const { questions } = req.body;
      const orgId = req.user.organizationId;
      const data = await service.saveTemplates(orgId, goalId, questions, req.user);
      res.status(STATUS_CODES.OK).json({ success: true, message: 'Questionnaire saved.', data });
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
      next(err);
    }
  }

  // ─── Assessment Data ──────────────────────────────────────────────────

  async getAssessmentData(req, res, next) {
    try {
      const { goalId, assignmentId } = req.params;
      const orgId = req.user.organizationId;
      const data = await service.getAssessmentData(goalId, assignmentId, orgId, req.user);
      res.status(STATUS_CODES.OK).json({ success: true, data });
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
      next(err);
    }
  }

  // ─── Participant Management ───────────────────────────────────────────

  async addParticipant(req, res, next) {
    try {
      const { goalId, assignmentId } = req.params;
      const { reviewerEmployeeId, relationshipType } = req.body;
      const orgId = req.user.organizationId;
      const data = await service.addParticipant(orgId, goalId, assignmentId, reviewerEmployeeId, relationshipType, req.user);
      res.status(STATUS_CODES.OK).json({ success: true, message: 'Reviewer added.', data });
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
      next(err);
    }
  }

  async removeParticipant(req, res, next) {
    try {
      const { goalId, participantId } = req.params;
      const orgId = req.user.organizationId;
      const data = await service.removeParticipant(orgId, goalId, participantId, req.user);
      res.status(STATUS_CODES.OK).json({ success: true, message: 'Reviewer removed.', data });
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
      next(err);
    }
  }

  // ─── Reviewer Actions ────────────────────────────────────────────────

  async acceptInvitation(req, res, next) {
    try {
      const { participantId } = req.params;
      const data = await service.acceptInvitation(participantId, req.user);
      res.status(STATUS_CODES.OK).json({ success: true, message: 'Invitation accepted.', data });
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
      next(err);
    }
  }

  async saveAnswers(req, res, next) {
    try {
      const { participantId } = req.params;
      const { answers } = req.body;
      const data = await service.saveReviewerAnswers(participantId, answers, req.user);
      res.status(STATUS_CODES.OK).json({ success: true, message: 'Answers saved.', data });
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
      next(err);
    }
  }

  async submitReview(req, res, next) {
    try {
      const { participantId } = req.params;
      const data = await service.submitReview(participantId, req.user);
      res.status(STATUS_CODES.OK).json({ success: true, message: 'Review submitted.', data });
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
      next(err);
    }
  }

  async declineReview(req, res, next) {
    try {
      const { participantId } = req.params;
      const data = await service.declineReview(participantId, req.user);
      res.status(STATUS_CODES.OK).json({ success: true, message: 'Review declined.', data });
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
      next(err);
    }
  }

  // ─── Finalization ─────────────────────────────────────────────────────

  async finalizeFeedback(req, res, next) {
    try {
      const { goalId, assignmentId } = req.params;
      const orgId = req.user.organizationId;
      const data = await service.finalizeFeedback(goalId, assignmentId, orgId, req.user);
      res.status(STATUS_CODES.OK).json({ success: true, message: '360° Feedback finalized.', data });
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
      next(err);
    }
  }

  // ─── Org Config ───────────────────────────────────────────────────────

  async getOrgConfig(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const data = await service.getOrgConfig(orgId);
      res.status(STATUS_CODES.OK).json({ success: true, data });
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
      next(err);
    }
  }

  async saveOrgConfig(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const data = await service.saveOrgConfig(orgId, req.body);
      res.status(STATUS_CODES.OK).json({ success: true, message: 'Organization configuration saved.', data });
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
      next(err);
    }
  }

  // ─── Reports ──────────────────────────────────────────────────────────

  async getSummaryReport(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { cycle_id, department_id, employee_id, goal_id } = req.query;
      const data = await service.getSummaryReport(orgId, {
        cycle_id: cycle_id || null,
        department_id: department_id || null,
        employee_id: employee_id || null,
        goal_id: goal_id || null
      }, req.user);
      res.status(STATUS_CODES.OK).json({ success: true, data });
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
      next(err);
    }
  }

  // ─── View Results (Employee) ──────────────────────────────────────────

  async viewResults(req, res, next) {
    try {
      const { goalId, assignmentId } = req.params;
      const orgId = req.user.organizationId;
      const data = await service.viewResults(goalId, assignmentId, orgId, req.user);
      res.status(STATUS_CODES.OK).json({ success: true, data });
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
      next(err);
    }
  }

  // ─── Search Employees (for adding reviewers) ─────────────────────────

  async searchEmployees(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { query: db } = require('../../config/db');
      const result = await db(
        `SELECT employee_id, first_name, last_name, email,
                d.name AS department_name
         FROM employees e
         LEFT JOIN departments d ON d.department_id = e.department_id
         WHERE e.organization_id = $1 AND e.status = 'active'
         ORDER BY e.first_name, e.last_name`,
        [orgId]
      );
      res.status(STATUS_CODES.OK).json({ success: true, data: result.rows });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new Feedback360Controller();
