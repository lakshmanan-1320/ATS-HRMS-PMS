const smtpRepository = require('./smtp.repository');
const emailService = require('./email.service');
const otpService = require('./otp.service');

module.exports = {
  smtpRepository,
  emailService,
  otpService,
};
