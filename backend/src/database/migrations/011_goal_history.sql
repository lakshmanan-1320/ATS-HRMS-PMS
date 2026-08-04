-- Goal history / activity timeline
CREATE TABLE IF NOT EXISTS goal_history (
  id         SERIAL PRIMARY KEY,
  goal_id    INTEGER      NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  action     VARCHAR(60)  NOT NULL,
  actor_id   UUID         REFERENCES employees(employee_id) ON DELETE SET NULL,
  note       TEXT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_history_goal_id    ON goal_history(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_history_created_at ON goal_history(created_at DESC);
