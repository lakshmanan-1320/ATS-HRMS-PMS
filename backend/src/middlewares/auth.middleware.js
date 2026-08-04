const { verifyToken } = require('../utils/jwt');
const { STATUS_CODES } = require('../constants/statusCodes');
const { MESSAGES } = require('../constants/messages');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  let token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token && req.query.token) {
    token = req.query.token;
  }
  if (!token) {
    return res.status(STATUS_CODES.UNAUTHORIZED).json({ message: MESSAGES.UNAUTHORIZED });
  }

  try {
    const decoded = verifyToken(token);
    req.user = {
      ...decoded,
      id: decoded.userId,
    };
    if (req.auditContext) {
      req.auditContext.organizationId = decoded.organizationId || null;
      req.auditContext.actorUserId = decoded.userId || null;
      req.auditContext.actorEmployeeId = decoded.employeeId || null;
      req.auditContext.actorRole = decoded.role || null;
      req.auditContext.actorEmail = decoded.email || null;
      req.auditContext.sessionId = decoded.sessionId || null;
    }
    next();
  } catch (err) {
    return res.status(STATUS_CODES.UNAUTHORIZED).json({ message: MESSAGES.SESSION_EXPIRED });
  }
}

function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(STATUS_CODES.FORBIDDEN).json({ message: 'Access denied. Insufficient permissions.' });
      }
      next();
    });
  };
}

function requireSuperAdmin(req, res, next) {
  requireRoles('super_admin')(req, res, next);
}

function requireClientAdmin(req, res, next) {
  requireRoles('client_admin')(req, res, next);
}

function requireAttendance(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user.attendanceEnabled) {
      return res.status(STATUS_CODES.FORBIDDEN).json({ message: 'Attendance tracking is not enabled for your account.' });
    }
    next();
  });
}

function requireEmployee(req, res, next) {
  requireRoles('employee', 'manager', 'hr', 'client_admin', 'super_admin')(req, res, next);
}

module.exports = {
  requireAuth,
  requireRoles,
  requireSuperAdmin,
  requireClientAdmin,
  requireAttendance,
  requireEmployee,
};
