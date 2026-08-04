const { query } = require('../config/db');
const logger = require('../config/logger');
const leaveService = require('../modules/leave/leave.service');

function getMsUntilNextFirstOfMonth() {
  const now = new Date();
  // Target: 1st of next month at 00:01:00 (1 minute past midnight to avoid timezone edge issues)
  const target = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 1, 0, 0);
  return target.getTime() - now.getTime();
}

async function runLeaveAccrualsJob() {
  try {
    logger.info('[LeaveAccrual] Running monthly leave accrual job...');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const period = `${year}-${month}`;

    // Get all unique active organizations
    const orgsRes = await query(`
      SELECT DISTINCT organization_id 
      FROM employees 
      WHERE status = 'active' 
        AND leave_plan_id IS NOT NULL 
        AND organization_id IS NOT NULL
    `);

    logger.info(`[LeaveAccrual] Found ${orgsRes.rows.length} organizations to process for ${period}.`);

    let succeeded = 0;
    let failed = 0;

    for (const row of orgsRes.rows) {
      const orgId = row.organization_id;
      try {
        await leaveService.runLeaveAccruals(orgId, period);
        succeeded++;
      } catch (err) {
        if (err.message && err.message.includes('already been processed')) {
          // If already processed, log as success (no operation needed)
          succeeded++;
        } else {
          logger.error(`[LeaveAccrual] Failed for organization ${orgId}:`, err.message);
          failed++;
        }
      }
    }

    logger.info(`[LeaveAccrual] Finished: ${succeeded} organizations completed, ${failed} failed.`);
  } catch (err) {
    logger.error('[LeaveAccrual] Job failed:', err.message);
  } finally {
    scheduleNext();
  }
}

function safeSetTimeout(callback, delay) {
  const MAX_TIMEOUT = 2147483647; // Max 32-bit signed int
  if (delay > MAX_TIMEOUT) {
    setTimeout(() => {
      safeSetTimeout(callback, delay - MAX_TIMEOUT);
    }, MAX_TIMEOUT);
  } else {
    setTimeout(callback, delay);
  }
}

function scheduleNext() {
  const ms = getMsUntilNextFirstOfMonth();
  const target = new Date(Date.now() + ms);
  logger.info(`[LeaveAccrual] Next leave accrual scheduled for ${target.toISOString()} (in ${Math.round(ms / 3600000)}h)`);
  safeSetTimeout(runLeaveAccrualsJob, ms);
}

function startLeaveAccrualJob() {
  logger.info('[LeaveAccrual] Leave accrual job initialized — runs on the 1st of every month.');
  scheduleNext();
}

module.exports = { startLeaveAccrualJob, runLeaveAccrualsJob };
