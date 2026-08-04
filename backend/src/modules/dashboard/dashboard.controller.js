const service = require('./dashboard.service')

async function handleGetStats(req, res, next) {
  try {
    const range = ['week', 'month', 'quarter'].includes(req.query.range) ? req.query.range : 'all'
    res.json(await service.getDashboardStats(req.user.organizationId, range))
  } catch (err) { next(err) }
}

async function handleGetNotifications(req, res, next) {
  try {
    const notifications = await service.getNotifications(req.user.organizationId)
    res.json(notifications)
  } catch (err) { next(err) }
}

module.exports = { handleGetStats, handleGetNotifications }
