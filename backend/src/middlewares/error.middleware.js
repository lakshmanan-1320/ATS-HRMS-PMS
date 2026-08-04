const ApiError = require('../utils/apiError');
const { STATUS_CODES } = require('../constants/statusCodes');
const logger = require('../config/logger');

function errorMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal server error.';
  const errors = err.errors || [];

  logger.error(`${req.method} ${req.url} - Error: ${message}`, err.stack);

  res.status(statusCode).json({
    message,
    ...(errors.length > 0 && { errors }),
  });
}

module.exports = errorMiddleware;
