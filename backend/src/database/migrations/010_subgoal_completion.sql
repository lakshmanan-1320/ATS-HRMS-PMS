-- Sub-goal completion workflow columns
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS pending_completion          BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completion_note             TEXT,
  ADD COLUMN IF NOT EXISTS completion_submitted_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_approved_by      UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completion_approved_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_rejected_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_rejection_reason TEXT;

-- Auto-recalculate parent goal progress when a sub-goal status changes to/from 'completed'
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
    AND  status = 'completed';

  UPDATE goals
  SET    progress   = v_total,
         status     = CASE WHEN v_total >= 100 THEN 'completed' ELSE status END,
         updated_at = NOW()
  WHERE  id = NEW.parent_goal_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_parent_goal_progress ON goals;
CREATE TRIGGER trg_parent_goal_progress
  AFTER UPDATE OF status ON goals
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.parent_goal_id IS NOT NULL)
  EXECUTE FUNCTION fn_update_parent_goal_progress();
