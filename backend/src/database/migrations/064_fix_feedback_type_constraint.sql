-- 064_fix_feedback_entries_type_constraint.sql
-- Fix feedback_entries.feedback_type CHECK constraint to include all supported types

ALTER TABLE feedback_entries
  DROP CONSTRAINT IF EXISTS feedback_entries_feedback_type_check;

ALTER TABLE feedback_entries
  ADD CONSTRAINT feedback_entries_feedback_type_check
  CHECK (feedback_type IN ('COACHING', 'CONSTRUCTIVE', 'GENERAL', 'PRAISE', 'CORRECTIVE', 'CHECKIN'));

-- Also fix feedback_praises.visibility to include TEAM visibility option
ALTER TABLE feedback_praises
  DROP CONSTRAINT IF EXISTS feedback_praises_visibility_check;

ALTER TABLE feedback_praises
  ADD CONSTRAINT feedback_praises_visibility_check
  CHECK (visibility IN ('PRIVATE', 'PUBLIC', 'TEAM'));
