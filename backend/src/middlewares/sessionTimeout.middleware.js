const { query } = require('../config/db');
const ApiError = require('../utils/apiError');
const { STATUS_CODES } = require('../constants/statusCodes');

async function enforceSessionTimeout(req, res, next) {
  // If user is not logged in, skip timeout checks
  if (!req.user) return next();

  try {
    const userId = req.user.userId || req.user.id;
    if (!userId) return next();
    
    // 1. Fetch user's last_activity_at and organization policy settings
    const userRes = await query(
      `SELECT u.last_activity_at, u.organization_id,
              o.idle_session_timeout_minutes, o.extend_on_activity,
              stp.idle_timeout_minutes AS global_idle_timeout,
              stp.extend_on_activity AS global_extend_on_activity
       FROM users u
       LEFT JOIN organizations o ON o.organization_id = u.organization_id
       LEFT JOIN session_timeout_policy stp ON stp.id = 1
       WHERE u.user_id = $1`,
      [userId]
    );

    const userRow = userRes.rows[0];
    if (!userRow) return next();

    // 2. Resolve target policy based on whether they are Super Admin or Organization User
    const isOrg = !!userRow.organization_id;
    const idleLimitMinutes = isOrg 
      ? (userRow.idle_session_timeout_minutes ?? 15) 
      : (userRow.global_idle_timeout ?? 15);
    const extendOnActivity = isOrg 
      ? (userRow.extend_on_activity ?? true) 
      : (userRow.global_extend_on_activity ?? true);

    const now = new Date();
    const lastActivity = userRow.last_activity_at ? new Date(userRow.last_activity_at) : now;
    const elapsedMinutes = (now - lastActivity) / (1000 * 60);

    // 3. Enforce server-side idle timeout check
    if (elapsedMinutes > idleLimitMinutes) {
      return next(new ApiError(STATUS_CODES.UNAUTHORIZED, 'Session expired due to inactivity.'));
    }

    // 4. Slide session (update last_activity_at). Write to database only if >= 1 minute has elapsed.
    if (extendOnActivity) {
      if (elapsedMinutes >= 1 || !userRow.last_activity_at) {
        await query(
          'UPDATE users SET last_activity_at = NOW() WHERE user_id = $1',
          [userId]
        );
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { enforceSessionTimeout };
