-- Add per-role OTP settings and account lockout configuration
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS otp_super_admin_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS otp_client_admin_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS otp_employee_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS max_login_attempts INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS lockout_duration_minutes INTEGER NOT NULL DEFAULT 30;
