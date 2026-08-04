const { query } = require('../config/db');
const { STATUS_CODES } = require('../constants/statusCodes');

function requireModule(moduleKey) {
  return async (req, res, next) => {
    const orgId = req.user?.organizationId;
    if (!orgId) return next(); // super_admin has no org — bypass
    try {
      const result = await query(
        `SELECT cm.is_enabled
         FROM client_modules cm
         JOIN client_admins ca ON ca.client_admin_id = cm.client_admin_id
         WHERE ca.organization_id = $1 AND cm.module_key = $2`,
        [orgId, moduleKey]
      );
      const row = result.rows[0];
      if (row && !row.is_enabled) {
        return res.status(STATUS_CODES.FORBIDDEN).json({
          message: `The ${moduleKey} module is not enabled for your organization.`,
          module: moduleKey,
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireModule };
