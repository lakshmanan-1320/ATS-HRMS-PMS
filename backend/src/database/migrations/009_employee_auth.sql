-- Add auth fields to employees
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
