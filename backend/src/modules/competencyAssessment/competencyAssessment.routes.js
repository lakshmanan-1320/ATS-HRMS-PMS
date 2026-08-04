const router = require('express').Router();
const { requireAuth } = require('../../middlewares/auth.middleware');
const c = require('./competencyAssessment.controller');

router.use(requireAuth);

// Global Competency Library CRUD
router.get('/competency-library', c.getLibrary);
router.post('/competency-library', c.saveLibraryCompetency);
router.delete('/competency-library/:competencyId', c.deleteLibraryCompetency);

// Configurable Rating Scale Labels
router.get('/competency-rating-scales', c.getRatingScales);
router.put('/competency-rating-scales', c.saveRatingScales);

// Goal Competency Configuration (Template)
router.get('/goals/:goalId/competencies', c.getGoalCompetencies);
router.post('/goals/:goalId/competencies', c.saveGoalCompetencies);

// Assignment Competency Assessment workflow
router.get('/assessments', c.listAssessments);
router.get('/goals/:goalId/assignments/:assignmentId/competency-assessment', c.getCoachingDetails);
router.post('/goals/:goalId/assignments/:assignmentId/competency-assessment', c.saveRatings);
router.post('/goals/:goalId/assignments/:assignmentId/acknowledge', c.acknowledgeAssessment);

// Reporting routes
router.get('/reports/gap', c.getCompetencyGapReport);
router.get('/reports/distribution', c.getRatingDistributionReport);
router.get('/reports/average', c.getAverageRatingReport);

module.exports = { routes: router };
