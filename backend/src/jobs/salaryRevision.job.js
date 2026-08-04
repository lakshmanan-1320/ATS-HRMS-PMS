const logger = require('../config/logger');
const { query } = require('../config/db');
const { logAudit } = require('../utils/auditLog');

function getMsUntilMidnight() {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return target.getTime() - now.getTime();
}

async function runSalaryRevisionActivation() {
  try {
    logger.info('[SalaryRevision] Checking for pending salary revisions that became effective...');
    const today = new Date().toISOString().split('T')[0];

    // Find and update pending revisions
    const pendingRes = await query(`
      SELECT revision_id, employee_id, increment_amount
      FROM salary_revisions
      WHERE status = 'PENDING' AND effective_from <= $1::date
    `, [today]);

    if (pendingRes.rows.length > 0) {
      logger.info(`[SalaryRevision] Found ${pendingRes.rows.length} pending revisions to activate.`);
      for (const row of pendingRes.rows) {
        await query(`
          UPDATE salary_revisions
          SET status = 'EFFECTIVE'
          WHERE revision_id = $1
        `, [row.revision_id]);

        await logAudit({
          action: 'ACTIVATE_SALARY_REVISION',
          target: row.employee_id,
          metadata: {
            revision_id: row.revision_id,
            increment_amount: row.increment_amount
          }
        });
      }
      logger.info(`[SalaryRevision] Successfully activated ${pendingRes.rows.length} revisions.`);
    } else {
      logger.info('[SalaryRevision] No pending salary revisions to activate today.');
    }
  } catch (err) {
    logger.error('[SalaryRevision] Job execution failed:', err.message);
  } finally {
    scheduleNext();
  }
}

function safeSetTimeout(callback, delay) {
  const MAX_TIMEOUT = 2147483647;
  if (delay > MAX_TIMEOUT) {
    setTimeout(() => {
      safeSetTimeout(callback, delay - MAX_TIMEOUT);
    }, MAX_TIMEOUT);
  } else {
    setTimeout(callback, delay);
  }
}

function scheduleNext() {
  const ms = getMsUntilMidnight();
  const target = new Date(Date.now() + ms);
  logger.info(`[SalaryRevision] Next check scheduled for ${target.toISOString()} (in ${Math.round(ms / 3600000)}h)`);
  safeSetTimeout(runSalaryRevisionActivation, ms);
}

function startSalaryRevisionJob() {
  logger.info('[SalaryRevision] Salary revision activation job initialized — runs daily at midnight.');
  scheduleNext();
}

module.exports = { startSalaryRevisionJob, runSalaryRevisionActivation };
