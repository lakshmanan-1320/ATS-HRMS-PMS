const router = require('express').Router();
const {
  handleLogin,
  handleVerifyOtp,
  handleResendOtp,
  handleForgotPassword,
  handleResetPassword,
  handleChangePassword,
  handleGetMe,
  handleGetBranding,
  handleGetPasswordPolicy,
} = require('./auth.controller');
const validate = require('../../middlewares/validate.middleware');
const { requireAuth } = require('../../middlewares/auth.middleware');
const {
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require('./auth.validation');

router.get('/branding', handleGetBranding);
router.post('/login', validate(loginSchema), handleLogin);
router.post('/verify-otp', validate(verifyOtpSchema), handleVerifyOtp);
router.post('/resend-otp', validate(resendOtpSchema), handleResendOtp);
router.post('/forgot-password', validate(forgotPasswordSchema), handleForgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), handleResetPassword);
router.post('/change-password', requireAuth, validate(changePasswordSchema), handleChangePassword);
router.get('/password-policy', requireAuth, handleGetPasswordPolicy);
router.get('/me', requireAuth, handleGetMe);

module.exports = router;
