const service = require('./competencyAssessment.service');
const { STATUS_CODES } = require('../../constants/statusCodes');

class CompetencyAssessmentController {
  // --- Global Competency Library ---
  async getLibrary(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const data = await service.getLibrary(orgId);
      res.status(STATUS_CODES.OK).json({ success: true, data });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async saveLibraryCompetency(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const data = await service.saveLibraryCompetency(orgId, req.body, req.user);
      res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Library competency saved successfully.',
        data
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async deleteLibraryCompetency(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { competencyId } = req.params;
      await service.deleteLibraryCompetency(orgId, competencyId, req.user);
      res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Competency removed from library.'
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  // --- Rating Scales ---
  async getRatingScales(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const data = await service.getRatingScales(orgId);
      res.status(STATUS_CODES.OK).json({ success: true, data });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async saveRatingScales(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const data = await service.saveRatingScales(orgId, req.body, req.user);
      res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Rating scale configurations saved.',
        data
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  // --- Goal Competency Template ---
  async getGoalCompetencies(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { goalId } = req.params;
      const data = await service.getGoalCompetencies(goalId, orgId);
      res.status(STATUS_CODES.OK).json({ success: true, data });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async saveGoalCompetencies(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { goalId } = req.params;
      const data = await service.saveGoalCompetencies(goalId, orgId, req.body, req.user);
      res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Goal competency templates saved.',
        data
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  // --- Assessments & Rating Workflow ---
  async getCoachingDetails(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { goalId, assignmentId } = req.params;
      const data = await service.getCoachingDetails(goalId, assignmentId, orgId);
      res.status(STATUS_CODES.OK).json({ success: true, data });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async saveRatings(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { goalId, assignmentId } = req.params;
      const data = await service.saveRatings(goalId, assignmentId, orgId, req.body, req.user);
      res.status(STATUS_CODES.OK).json({
        success: true,
        message: req.body.isSubmit ? 'Assessment completed successfully.' : 'Ratings saved as draft.',
        data
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async acknowledgeAssessment(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { goalId, assignmentId } = req.params;
      const data = await service.acknowledgeAssessment(goalId, assignmentId, orgId, req.user);
      res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Assessment results acknowledged successfully.',
        data
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getCompetencyGapReport(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const data = await service.getCompetencyGapReport(orgId, req.query);
      res.status(STATUS_CODES.OK).json({ success: true, data });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getRatingDistributionReport(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const data = await service.getRatingDistributionReport(orgId, req.query);
      res.status(STATUS_CODES.OK).json({ success: true, data });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getAverageRatingReport(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const data = await service.getAverageRatingReport(orgId, req.query);
      res.status(STATUS_CODES.OK).json({ success: true, data });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async listAssessments(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const data = await service.listAssessments(orgId, req.query);
      res.status(STATUS_CODES.OK).json({ success: true, data });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }
}

module.exports = new CompetencyAssessmentController();
