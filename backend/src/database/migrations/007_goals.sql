-- Add goal_mode to client_admins
ALTER TABLE client_admins
  ADD COLUMN IF NOT EXISTS goal_mode VARCHAR(20) NOT NULL DEFAULT 'hybrid'
    CHECK (goal_mode IN ('top_down', 'bottom_up', 'hybrid'));

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id                  SERIAL PRIMARY KEY,
  client_admin_id     UUID NOT NULL REFERENCES client_admins(client_admin_id) ON DELETE CASCADE,

  -- Content
  title               VARCHAR(255) NOT NULL,
  description         TEXT,
  goal_type           VARCHAR(20)  NOT NULL DEFAULT 'individual'
                        CHECK (goal_type IN ('company','department','team','individual')),

  -- Hierarchy / cascade
  parent_goal_id      INTEGER REFERENCES goals(id) ON DELETE SET NULL,

  -- Assignment
  assigned_to_employee_id   UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
  assigned_to_department_id UUID REFERENCES departments(department_id) ON DELETE SET NULL,
  created_by_employee_id    UUID REFERENCES employees(employee_id) ON DELETE SET NULL,

  -- Dates & metric
  start_date          DATE,
  due_date            DATE,
  target_metric       VARCHAR(255),

  -- Weighting & progress
  weight              NUMERIC(5,2) NOT NULL DEFAULT 100.00,  -- % of parent goal
  progress            NUMERIC(5,2) NOT NULL DEFAULT 0.00,    -- auto-calculated 0-100
  override_progress   NUMERIC(5,2),                          -- manager override
  override_by         UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
  override_reason     TEXT,

  -- Priority & status
  priority            VARCHAR(10) NOT NULL DEFAULT 'medium'
                        CHECK (priority IN ('high','medium','low')),
  status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','active','in_progress','submitted','approved','completed','rejected')),

  -- Approval
  submitted_at        TIMESTAMPTZ,
  approved_by         UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
  approved_at         TIMESTAMPTZ,
  rejected_by         UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
  rejected_at         TIMESTAMPTZ,
  rejection_reason    TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goals_client      ON goals(client_admin_id);
CREATE INDEX IF NOT EXISTS idx_goals_parent      ON goals(parent_goal_id);
CREATE INDEX IF NOT EXISTS idx_goals_employee    ON goals(assigned_to_employee_id);
CREATE INDEX IF NOT EXISTS idx_goals_department  ON goals(assigned_to_department_id);
CREATE INDEX IF NOT EXISTS idx_goals_status      ON goals(status);
