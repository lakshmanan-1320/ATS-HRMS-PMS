const { query } = require('../../config/db')

async function createNotification(recipientEmployeeId, type, title, message, entityId, entityType) {
  const result = await query(
    `INSERT INTO notifications (recipient_employee_id, type, title, message, entity_id, entity_type)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [recipientEmployeeId, type, title, message || null, entityId || null, entityType || null]
  )
  return result.rows[0]?.id
}

async function getNotificationsForEmployee(employeeId, limit = 30) {
  const result = await query(
    `SELECT id, type, title, message, entity_id, entity_type, is_read, created_at
     FROM notifications
     WHERE recipient_employee_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [employeeId, limit]
  )
  return result.rows
}

async function getUnreadCount(employeeId) {
  const result = await query(
    `SELECT COUNT(*) AS cnt FROM notifications WHERE recipient_employee_id = $1 AND is_read = false`,
    [employeeId]
  )
  return Number(result.rows[0]?.cnt || 0)
}

async function markAsRead(notificationId, employeeId) {
  await query(
    `UPDATE notifications SET is_read = true WHERE id = $1 AND recipient_employee_id = $2`,
    [notificationId, employeeId]
  )
}

async function markAllAsRead(employeeId) {
  await query(
    `UPDATE notifications SET is_read = true WHERE recipient_employee_id = $1 AND is_read = false`,
    [employeeId]
  )
}

async function getManagerIdForEmployee(employeeId) {
  const result = await query(
    `SELECT manager_employee_id FROM employees WHERE employee_id = $1`,
    [employeeId]
  )
  return result.rows[0]?.manager_employee_id || null
}

async function getEmployeeName(employeeId) {
  const result = await query(
    `SELECT CONCAT(first_name, ' ', last_name) AS name FROM employees WHERE employee_id = $1`,
    [employeeId]
  )
  return result.rows[0]?.name || 'An employee'
}

async function createNotificationForMany(employeeIds, type, title, message, entityId, entityType) {
  if (!employeeIds || employeeIds.length === 0) return
  for (const empId of employeeIds) {
    try {
      await createNotification(empId, type, title, message, entityId, entityType)
    } catch (_) { /* skip individual failures */ }
  }
}

async function getOrgEmployeeIds(organizationId) {
  const result = await query(
    `SELECT employee_id FROM employees WHERE organization_id = $1 AND status = 'active'`,
    [organizationId]
  )
  return result.rows.map(r => r.employee_id).filter(Boolean)
}

async function getClientAdminEmployeeIds(organizationId) {
  const result = await query(
    `SELECT u.employee_id 
     FROM users u 
     WHERE u.organization_id = $1 AND u.role IN ('client_admin', 'hr') AND u.employee_id IS NOT NULL`,
    [organizationId]
  )
  return result.rows.map(r => r.employee_id).filter(Boolean)
}

module.exports = {
  createNotification,
  createNotificationForMany,
  getNotificationsForEmployee,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getManagerIdForEmployee,
  getEmployeeName,
  getOrgEmployeeIds,
  getClientAdminEmployeeIds,
}
