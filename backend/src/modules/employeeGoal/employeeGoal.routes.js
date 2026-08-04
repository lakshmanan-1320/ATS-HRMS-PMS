const router = require('express').Router()
const { requireEmployee } = require('../../middlewares/auth.middleware')
const {
  handleGetConfig,
  handleCreate,
  handleGetCreated,
  handleUpdate,
  handleDelete,
  handleSubmit,
  handleMarkComplete,
  handleWithdrawCompletion,
  handleGetGoalHistory,
} = require('./employeeGoal.controller')

router.use(requireEmployee)

router.get('/goal-config',                     handleGetConfig)
router.post('/',                               handleCreate)
router.get('/created',                         handleGetCreated)
router.put('/created/:goalId',                 handleUpdate)
router.delete('/created/:goalId',              handleDelete)
router.post('/created/:goalId/submit',         handleSubmit)
router.post('/:goalId/mark-complete',          handleMarkComplete)
router.delete('/:goalId/withdraw-completion',  handleWithdrawCompletion)
router.get('/:goalId/history',                 handleGetGoalHistory)

module.exports = router
