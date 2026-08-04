const router = require('express').Router()
const { requireEmployee } = require('../../middlewares/auth.middleware')
const {
  handleGetDirectReports,
  handleGetTeamGoals,
  handleGetCompletionRequests,
  handleApproveTeamGoal,
  handleRejectTeamGoal,
  handleApproveCompletion,
  handleRejectCompletion,
  handleCreateAssigned,
  handleActivateAssigned,
  handleGetAssigned,
  handleOverrideProgress,
} = require('./managerGoal.controller')

router.use(requireEmployee)

router.get('/direct-reports',                               handleGetDirectReports)
router.get('/team-goals',                                   handleGetTeamGoals)
router.post('/team-goals/:goalId/approve',                  handleApproveTeamGoal)
router.post('/team-goals/:goalId/reject',                   handleRejectTeamGoal)
router.get('/completion-requests',                          handleGetCompletionRequests)
router.post('/completion-requests/:requestId/approve',     handleApproveCompletion)
router.post('/completion-requests/:requestId/reject',      handleRejectCompletion)
router.post('/goals',                                       handleCreateAssigned)
router.get('/goals',                                        handleGetAssigned)
router.post('/goals/:goalId/activate',                      handleActivateAssigned)
router.post('/goals/:goalId/override-progress',             handleOverrideProgress)

module.exports = router
