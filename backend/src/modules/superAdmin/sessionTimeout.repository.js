const { query } = require('../../config/db');
const { companyRowId } = require('../../config/env');

const DEFAULTS = {
  idleTimeoutMinutes: 30,
  absoluteTimeoutHours: 8,
  warnBeforeExpiryMinutes: 5,
  extendOnActivity: true,
};

async function getSessionTimeout() {
  const { rows } = await query('SELECT * FROM session_timeout_policy WHERE id = $1', [companyRowId]);
  if (!rows.length) return DEFAULTS;
  const r = rows[0];
  return {
    idleTimeoutMinutes: r.idle_timeout_minutes,
    absoluteTimeoutHours: r.absolute_timeout_hours,
    warnBeforeExpiryMinutes: r.warn_before_expiry_minutes,
    extendOnActivity: r.extend_on_activity,
  };
}

async function saveSessionTimeout({ idleTimeoutMinutes, absoluteTimeoutHours, warnBeforeExpiryMinutes, extendOnActivity }) {
  await query(
    `INSERT INTO session_timeout_policy (id, idle_timeout_minutes, absolute_timeout_hours, warn_before_expiry_minutes, extend_on_activity, updated_at)
     VALUES ($5, $1, $2, $3, $4, NOW())
     ON CONFLICT (id) DO UPDATE SET
       idle_timeout_minutes = $1,
       absolute_timeout_hours = $2,
       warn_before_expiry_minutes = $3,
       extend_on_activity = $4,
       updated_at = NOW()`,
    [idleTimeoutMinutes, absoluteTimeoutHours, warnBeforeExpiryMinutes, extendOnActivity, companyRowId]
  );
}

module.exports = { getSessionTimeout, saveSessionTimeout };
