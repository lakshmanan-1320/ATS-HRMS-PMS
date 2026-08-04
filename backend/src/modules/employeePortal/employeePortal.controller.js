const repo = require('./employeePortal.repository');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');
const db = require('../../config/db');

async function handleGetMe(req, res, next) {
  try {
    if (!req.user.employeeId) {
      let name = 'Admin';
      let designation = 'Super Administrator';
      let organization_name = null;
      if (req.user.role === 'client_admin') {
        const adminRes = await db.query(
          `SELECT ca.full_name, o.name AS organization_name
           FROM client_admins ca
           LEFT JOIN organizations o ON o.organization_id = ca.organization_id
           WHERE ca.email = $1`,
          [req.user.email]
        );
        if (adminRes.rows.length) {
          name = adminRes.rows[0].full_name;
          organization_name = adminRes.rows[0].organization_name || null;
        }
        designation = 'Client Administrator';
      }
      const parts = name.split(' ');
      const firstName = parts[0] || 'Admin';
      const lastName = parts.slice(1).join(' ') || '';

      const fallback = {
        id: req.user.userId,
        employee_code: req.user.role === 'client_admin' ? 'CLIENT_ADMIN' : 'SUPER_ADMIN',
        first_name: firstName,
        last_name: lastName,
        email: req.user.email,
        phone: '',
        designation,
        employment_type: 'full_time',
        date_of_joining: new Date().toISOString(),
        gender: 'Male',
        status: 'active',
        hierarchy_level_id: null,
        department_name: 'Administration',
        department_id: null,
        level_name: 'L0',
        level_number: 0,
        level_designation: 'Admin',
        manager_id: null,
        manager_first_name: null,
        manager_last_name: null,
        manager_email: null,
        manager_designation: null,
        is_manager: true,
        direct_reports_count: 0,
        organization_name,
      };
      return res.status(STATUS_CODES.OK).json(fallback);
    }
    const data = await repo.getMyProfile(req.user.employeeId, req.user.organizationId);
    if (!data) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Employee not found.');
    res.status(STATUS_CODES.OK).json(data);
  } catch (err) { next(err); }
}

async function handleGetMyTeam(req, res, next) {
  try {
    if (!req.user.employeeId) {
      return res.status(STATUS_CODES.OK).json([]);
    }
    const data = await repo.getMyTeam(req.user.employeeId, req.user.organizationId);
    res.status(STATUS_CODES.OK).json(data);
  } catch (err) { next(err); }
}

async function handleGetMyGoals(req, res, next) {
  try {
    if (!req.user.employeeId) {
      return res.status(STATUS_CODES.OK).json([]);
    }
    const data = await repo.getMyGoals(req.user.employeeId, req.user.organizationId);
    res.status(STATUS_CODES.OK).json(data);
  } catch (err) { next(err); }
}

module.exports = { handleGetMe, handleGetMyTeam, handleGetMyGoals };
