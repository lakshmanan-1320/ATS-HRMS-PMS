function loginSchema(body) {
  const { email, password } = body;
  if (!email || !email.trim() || !password) {
    return { error: 'Email and password are required.' };
  }
  return { value: { email, password } };
}

function verifyOtpSchema(body) {
  const { otp, tempToken } = body;
  if (!otp || !tempToken) {
    return { error: 'OTP and token are required.' };
  }
  return { value: { otp, tempToken } };
}

function resendOtpSchema(body) {
  const { tempToken } = body;
  if (!tempToken) {
    return { error: 'Token required.' };
  }
  return { value: { tempToken } };
}

function forgotPasswordSchema(body) {
  const { email } = body;
  if (!email || !email.trim()) {
    return { error: 'Email is required.' };
  }
  return { value: { email } };
}

function resetPasswordSchema(body) {
  const { otp, tempToken, newPassword } = body;
  if (!otp || !tempToken || !newPassword) {
    return { error: 'OTP, token, and new password are required.' };
  }
  return { value: { otp, tempToken, newPassword } };
}

function changePasswordSchema(body) {
  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) {
    return { error: 'Current password and new password are required.' };
  }
  return { value: { currentPassword, newPassword } };
}

module.exports = {
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
};
