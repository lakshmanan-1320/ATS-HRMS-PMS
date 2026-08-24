-- Migration 057: Update goals table columns and check constraints

-- 1. Create sequence for human-readable goal code
CREATE SEQUENCE IF NOT EXISTS goals_goal_code_seq;

-- 2. Add new columns
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS goal_code VARCHAR(50) UNIQUE DEFAULT 'GOAL-' || lpad(nextval('goals_goal_code_seq')::text, 6, '0'),
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'ORGANIZATION' CHECK (visibility IN ('PRIVATE', 'TEAM', 'DEPARTMENT', 'ORGANIZATION')),
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS performance_configuration_id UUID REFERENCES performance_configurations(performance_configuration_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS goal_category VARCHAR(50) CHECK (goal_category IN ('BUSINESS', 'PERFORMANCE', 'LEARNING', 'PERSONAL_DEVELOPMENT')),
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id) ON DELETE SET NULL;

-- Make client_admin_id nullable as organization_id handles multi-tenancy isolation now
ALTER TABLE goals ALTER COLUMN client_admin_id DROP NOT NULL;

-- 3. Update existing FK constraints to map to users(user_id)
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_approved_by_fkey;
ALTER TABLE goals ALTER COLUMN approved_by SET DATA TYPE UUID;
UPDATE goals SET approved_by = NULL WHERE approved_by NOT IN (SELECT user_id FROM users);
ALTER TABLE goals ADD CONSTRAINT goals_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL;

-- 4. Alter priority and status constraints
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_priority_check;
ALTER TABLE goals ADD CONSTRAINT goals_priority_check CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));

ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_status_check;
ALTER TABLE goals ADD CONSTRAINT goals_status_check CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'CHANGES_REQUESTED', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'));

-- 5. Recreate parent goal progress trigger function using goal_id instead of id
CREATE OR REPLACE FUNCTION fn_update_parent_goal_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  IF NEW.parent_goal_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(weight), 0)
  INTO   v_total
  FROM   goals
  WHERE  parent_goal_id = NEW.parent_goal_id
    AND  status = 'COMPLETED';

  UPDATE goals
  SET    progress   = v_total,
         status     = CASE WHEN v_total >= 100 THEN 'COMPLETED' ELSE status END,
         updated_at = NOW()
  WHERE  goal_id = NEW.parent_goal_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_parent_goal_progress ON goals;
CREATE TRIGGER trg_parent_goal_progress
  AFTER UPDATE OF status ON goals
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.parent_goal_id IS NOT NULL)
  EXECUTE FUNCTION fn_update_parent_goal_progress();
