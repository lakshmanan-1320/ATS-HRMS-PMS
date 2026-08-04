-- Migration 024: Monthly Paid Leave Cap
-- Adds an org-wide cap on total paid leave days an employee can take per calendar month.
-- NULL means no cap is enforced.

ALTER TABLE organization_leave_settings
  ADD COLUMN IF NOT EXISTS monthly_paid_leave_cap INTEGER DEFAULT NULL;
