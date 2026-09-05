const { query } = require('../config/db');
const { STATUS_CODES } = require('../constants/statusCodes');
const { PMS_MODULE_KEYS } = require('../modules/clientModule/clientModule.repository');

function requireModule(moduleKey) {
  return async (req, res, next) => {
    const orgId = req.user?.organizationId;
    if (!orgId) return next(); // super_admin has no org — bypass

    try {
      const keysToCheck = PMS_MODULE_KEYS.includes(moduleKey)
        ? ['pms', moduleKey]
        : [moduleKey];

      const result = await query(
        `SELECT cm.module_key, cm.is_enabled
         FROM client_modules cm
         JOIN client_admins ca ON ca.client_admin_id = cm.client_admin_id
         WHERE ca.organization_id = $1 AND cm.module_key = ANY($2::text[])`,
        [orgId, keysToCheck]
      );

      const rows = result.rows;
      const pmsRow = rows.find(r => r.module_key === 'pms');
      if (pmsRow && !pmsRow.is_enabled && PMS_MODULE_KEYS.includes(moduleKey)) {
        return res.status(STATUS_CODES.FORBIDDEN).json({
          message: 'The Performance Management System (PMS) is disabled for your organization.',
          module: 'pms',
        });
      }

      const row = rows.find(r => r.module_key === moduleKey);
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
