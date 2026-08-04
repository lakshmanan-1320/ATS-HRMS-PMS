const router = require('express').Router()
const { requireEmployee } = require('../../middlewares/auth.middleware')
const { handleGetMyNotifications, handleMarkRead, handleMarkAllRead } = require('./inAppNotification.controller')

router.use(requireEmployee)

router.get('/',              handleGetMyNotifications)
router.patch('/read-all',    handleMarkAllRead)
router.patch('/:id/read',    handleMarkRead)

module.exports = router
