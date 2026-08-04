const repo = require('./inAppNotification.repository')

async function notifyManager(employeeId, type, title, message, entityId, entityType) {
  try {
    const managerId = await repo.getManagerIdForEmployee(employeeId)
    if (!managerId) return
    await repo.createNotification(managerId, type, title, message, entityId, entityType)
  } catch (_) { /* non-fatal */ }
}

async function getMyNotifications(employeeId) {
  const [items, unread] = await Promise.all([
    repo.getNotificationsForEmployee(employeeId),
    repo.getUnreadCount(employeeId),
  ])
  return { items, unread }
}

async function markRead(notificationId, employeeId) {
  await repo.markAsRead(notificationId, employeeId)
}

async function markAllRead(employeeId) {
  await repo.markAllAsRead(employeeId)
}

module.exports = { notifyManager, getMyNotifications, markRead, markAllRead }
