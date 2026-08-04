CREATE TABLE IF NOT EXISTS session_timeout_policy (
  id                          INTEGER PRIMARY KEY DEFAULT 1,
  idle_timeout_minutes        INTEGER NOT NULL DEFAULT 30,
  absolute_timeout_hours      INTEGER NOT NULL DEFAULT 8,
  warn_before_expiry_minutes  INTEGER NOT NULL DEFAULT 5,
  extend_on_activity          BOOLEAN NOT NULL DEFAULT true,
  updated_at                  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT session_timeout_policy_single_row CHECK (id = 1)
);

INSERT INTO session_timeout_policy (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
