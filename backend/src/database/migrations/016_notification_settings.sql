CREATE TABLE IF NOT EXISTS notification_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  leave_submitted BOOLEAN NOT NULL DEFAULT true,
  leave_decision BOOLEAN NOT NULL DEFAULT true,
  regularization_submitted BOOLEAN NOT NULL DEFAULT true,
  regularization_decision BOOLEAN NOT NULL DEFAULT true,
  appraisal_cycle_opened BOOLEAN NOT NULL DEFAULT true,
  goal_deadline_reminder BOOLEAN NOT NULL DEFAULT true,
  payroll_processed BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO notification_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
