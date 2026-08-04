function validatePasswordStrength(password, policy) {
  const errors = [];

  if (typeof password !== 'string' || password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long.`);
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.');
  }
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.');
  }
  if (policy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number.');
  }
  if (policy.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character.');
  }

  return errors;
}

function isPasswordExpired(passwordChangedAt, maxAgeDays) {
  if (!maxAgeDays || maxAgeDays <= 0) return false;
  if (!passwordChangedAt) return true;
  const ageMs = Date.now() - new Date(passwordChangedAt).getTime();
  return ageMs > maxAgeDays * 24 * 60 * 60 * 1000;
}

module.exports = { validatePasswordStrength, isPasswordExpired };
