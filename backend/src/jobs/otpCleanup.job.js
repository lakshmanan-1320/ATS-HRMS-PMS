const logger = require('../config/logger');

// Placeholder for cleaning up expired OTPs or tempTokens if persistent database storage is added later
function startOtpCleanupJob() {
  logger.info('OTP cleanup job initialized (in-memory OTP cleanup runs automatically).');
}

module.exports = { startOtpCleanupJob };
