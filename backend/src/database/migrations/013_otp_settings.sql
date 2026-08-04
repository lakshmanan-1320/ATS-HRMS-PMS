-- Add OTP login toggle to companies table (system-wide security setting)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS otp_login_enabled BOOLEAN NOT NULL DEFAULT TRUE;
