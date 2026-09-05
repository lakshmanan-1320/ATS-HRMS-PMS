const service = require('./inAppNotification.service')
const { query } = require('../../config/db')

async function resolveEmployeeId(user) {
  if (user?.employeeId) return user.employeeId
  if (user?.userId) {
    const uRes = await query('SELECT employee_id, organization_id FROM users WHERE user_id = $1', [user.userId])
    if (uRes.rows[0]?.employee_id) return uRes.rows[0].employee_id
    const orgId = uRes.rows[0]?.organization_id || user.organizationId
    if (orgId) {
      const empRes = await query('SELECT employee_id FROM employees WHERE organization_id = $1 ORDER BY created_at ASC LIMIT 1', [orgId])
      return empRes.rows[0]?.employee_id || null
    }
  }
  return null
}

async function handleGetMyNotifications(req, res, next) {
  try {
    const empId = await resolveEmployeeId(req.user)
    if (!empId) return res.json({ items: [], unread: 0 })
    const data = await service.getMyNotifications(empId)
    res.json(data)
  } catch (err) { next(err) }
}

async function handleMarkRead(req, res, next) {
  try {
    const empId = await resolveEmployeeId(req.user)
    if (empId) await service.markRead(req.params.id, empId)
    res.json({ message: 'Marked as read.' })
  } catch (err) { next(err) }
}

async function handleMarkAllRead(req, res, next) {
  try {
    const empId = await resolveEmployeeId(req.user)
    if (empId) await service.markAllRead(empId)
    res.json({ message: 'All notifications marked as read.' })
  } catch (err) { next(err) }
}

module.exports = { handleGetMyNotifications, handleMarkRead, handleMarkAllRead }
