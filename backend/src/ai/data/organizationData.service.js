/**
 * organizationData.service.js
 * Parameterized data access for organization-level metrics and statistics.
 * Enforces organization boundaries.
 */

'use strict';

const { query } = require('../../config/db');
const logger = require('../../config/logger');

/**
 * Retrieves total count of active employees in the organization.
 * @param {string} organizationId - UUID of organization
 * @returns {Promise<object>}
 */
async function getTotalEmployees(organizationId) {
  if (!organizationId) return { total: 0 };

  try {
    const res = await query(
      `SELECT COUNT(*) AS total
      FROM employees
      WHERE organization_id = $1
        AND status NOT IN ('terminated', 'inactive', 'resigned')`,
      [organizationId]
    );

    return {
      total: parseInt(res.rows[0]?.total || '0', 10),
    };
  } catch (err) {
    logger.error('[Data:Organization] Error in getTotalEmployees:', err.message);
    return { total: 0, error: err.message };
  }
}

module.exports = {
  getTotalEmployees,
};
