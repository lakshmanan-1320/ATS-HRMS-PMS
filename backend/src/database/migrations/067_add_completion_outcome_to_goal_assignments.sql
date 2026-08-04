ALTER TABLE goal_assignments ADD COLUMN IF NOT EXISTS completion_outcome VARCHAR(50);

ALTER TABLE goal_assignments DROP CONSTRAINT IF EXISTS goal_assignments_completion_outcome_check;
ALTER TABLE goal_assignments ADD CONSTRAINT goal_assignments_completion_outcome_check 
  CHECK (completion_outcome IN ('ACHIEVED', 'NEEDS_DEVELOPMENT'));

ALTER TABLE goal_assignments DROP CONSTRAINT IF EXISTS goal_assignments_status_outcome_check;
ALTER TABLE goal_assignments ADD CONSTRAINT goal_assignments_status_outcome_check
  CHECK (status = 'COMPLETED' OR completion_outcome IS NULL);
