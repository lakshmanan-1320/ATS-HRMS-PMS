const service = require('./inAppNotification.service')

async function handleGetMyNotifications(req, res, next) {
  try {
    const data = await service.getMyNotifications(req.user.employeeId)
    res.json(data)
  } catch (err) { next(err) }
}

async function handleMarkRead(req, res, next) {
  try {
    await service.markRead(req.params.id, req.user.employeeId)
    res.json({ message: 'Marked as read.' })
  } catch (err) { next(err) }
}

async function handleMarkAllRead(req, res, next) {
  try {
    await service.markAllRead(req.user.employeeId)
    res.json({ message: 'All notifications marked as read.' })
  } catch (err) { next(err) }
}

module.exports = { handleGetMyNotifications, handleMarkRead, handleMarkAllRead }
