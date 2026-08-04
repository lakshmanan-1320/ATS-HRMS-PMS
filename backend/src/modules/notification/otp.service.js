// Trigger watch reload.
const crypto = require('crypto');

const otpStore = new Map(); // tempToken -> { otp, expires, email, role, userId, attempts }
const loginAttempts = new Map(); // email -> { count, lockedUntil }

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

function storeOtp(tempToken, record) {
  otpStore.set(tempToken, record);
}

function getOtpRecord(tempToken) {
  return otpStore.get(tempToken);
}

function deleteOtpRecord(tempToken) {
  otpStore.delete(tempToken);
}

function checkLockout(email) {
  const rec = loginAttempts.get(email);
  if (!rec) return false;
  if (rec.lockedUntil && rec.lockedUntil > Date.now()) return true;
  return false;
}

function recordFailure(email, maxAttempts, lockoutMs) {
  const rec = loginAttempts.get(email) || { count: 0 };
  rec.count++;
  if (rec.count >= maxAttempts) {
    rec.lockedUntil = Date.now() + lockoutMs;
    rec.count = 0;
  }
  loginAttempts.set(email, rec);
}

function clearFailures(email) {
  loginAttempts.delete(email);
}

module.exports = {
  generateOtp,
  storeOtp,
  getOtpRecord,
  deleteOtpRecord,
  checkLockout,
  recordFailure,
  clearFailures,
};
