const logger = require('../config/logger');
const { query } = require('../config/db');
const { getSettings: getNotifSettings } = require('../modules/notification/notificationSettings.repository');
const { sendGoalDeadlineReminderEmail } = require('../modules/notification/email.service');
const notifRepo = require('../modules/inAppNotification/inAppNotification.repository');

const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function runGoalDeadlineReminders() {
  try {
    const ns = await getNotifSettings();
    if (!ns.goal_deadline_reminder) return;

    const result = await query(
      `SELECT g.id AS goal_id, g.title, g.due_date, e.employee_id, u.email, e.first_name, e.last_name
       FROM goals g
       JOIN employees e ON g.assigned_to_employee_id = e.employee_id
       JOIN users u ON u.employee_id = e.employee_id
       WHERE g.due_date = CURRENT_DATE + INTERVAL '3 days'
         AND g.status NOT IN ('completed', 'closed')
         AND u.email IS NOT NULL`
    );

    for (const row of result.rows) {
      const displayName = `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Employee';
      // in-app → employee
      notifRepo.createNotification(
        row.employee_id,
        'goal_deadline_reminder',
        'Goal Deadline Approaching',
        `Your goal "${row.title}" is due in 3 days (${row.due_date}).`,
        row.goal_id,
        'goal'
      ).catch(() => {});
      // email → employee
      sendGoalDeadlineReminderEmail(row.email, {
        employeeName: displayName,
        goalTitle: row.title,
        dueDate: row.due_date,
      }).catch(e => console.error('[Notif] goal deadline email failed:', e.message));
    }

    if (result.rows.length > 0) {
      logger.info(`[GoalReminder] Sent ${result.rows.length} goal deadline reminder(s).`);
    }
  } catch (err) {
    logger.error('[GoalReminder] Failed to run goal deadline reminders:', err.message);
  }
}

function startReminderEmailsJob() {
  logger.info('Reminder emails job started — goal deadline reminders will run every 24 hours.');
  // Run once at startup (catches cases where server restarts mid-day)
  runGoalDeadlineReminders();
  setInterval(runGoalDeadlineReminders, INTERVAL_MS);
}

module.exports = { startReminderEmailsJob };
