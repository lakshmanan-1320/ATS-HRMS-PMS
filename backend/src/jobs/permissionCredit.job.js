const logger = require('../config/logger');
const { creditMonthlyPermissions } = require('../modules/permission/permission.service');

function getMsUntilNextFirstOfMonth() {
  const now = new Date();
  // Target: 1st of next month at 00:00:00
  const target = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return target.getTime() - now.getTime();
}

async function runPermissionCredit() {
  try {
    logger.info('[PermissionCredit] Running monthly permission credit...');
    const result = await creditMonthlyPermissions();
    logger.info(
      `[PermissionCredit] Credited ${result.credited}/${result.total} employees for ${result.month}/${result.year}` +
      (result.failed > 0 ? ` (${result.failed} failed)` : '')
    );
  } catch (err) {
    logger.error('[PermissionCredit] Job failed:', err.message);
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
  logger.info(`[PermissionCredit] Next credit scheduled for ${target.toISOString()} (in ${Math.round(ms / 3600000)}h)`);
  safeSetTimeout(runPermissionCredit, ms);
}

function startPermissionCreditJob() {
  logger.info('[PermissionCredit] Permission credit job initialized — runs at midnight on the 1st of every month.');
  scheduleNext();
}

module.exports = { startPermissionCreditJob, runPermissionCredit };
