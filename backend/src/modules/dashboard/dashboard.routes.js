const router = require('express').Router()
const { requireClientAdmin } = require('../../middlewares/auth.middleware')
const c = require('./dashboard.controller')

router.use(requireClientAdmin)
router.get('/stats', c.handleGetStats)
router.get('/notifications', c.handleGetNotifications)

module.exports = router
