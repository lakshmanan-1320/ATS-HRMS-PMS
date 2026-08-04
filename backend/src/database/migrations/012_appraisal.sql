-- Appraisal cycles (admin-created periods for performance review)
CREATE TABLE IF NOT EXISTS appraisal_cycles (
  appraisal_cycle_id       SERIAL        PRIMARY KEY,
  client_admin_id          UUID          NOT NULL REFERENCES client_admins(client_admin_id) ON DELETE CASCADE,
  name                     VARCHAR(255)  NOT NULL,
  period_start             DATE          NOT NULL,
  period_end               DATE          NOT NULL,
  self_appraisal_deadline  DATE,
  manager_review_deadline  DATE,
  status                   VARCHAR(30)   NOT NULL DEFAULT 'draft', -- draft | active | closed
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appraisal_cycles_client ON appraisal_cycles(client_admin_id);

-- Employee self-appraisals (one per employee per cycle)
CREATE TABLE IF NOT EXISTS self_appraisals (
  self_appraisal_id SERIAL       PRIMARY KEY,
  cycle_id         INTEGER      NOT NULL REFERENCES appraisal_cycles(appraisal_cycle_id) ON DELETE CASCADE,
  employee_id      UUID         NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  overall_comment  TEXT,
  status           VARCHAR(30)  NOT NULL DEFAULT 'draft', -- draft | submitted
  submitted_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  achievements     TEXT,
  challenges       TEXT,
  learnings        TEXT,
  career_goals     TEXT,
  self_rating      INTEGER      DEFAULT 0,
  UNIQUE (cycle_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_self_appraisals_cycle    ON self_appraisals(cycle_id);
CREATE INDEX IF NOT EXISTS idx_self_appraisals_employee ON self_appraisals(employee_id);

-- Per-goal ratings inside a self-appraisal
CREATE TABLE IF NOT EXISTS self_appraisal_goal_ratings (
  self_appraisal_goal_rating_id SERIAL          PRIMARY KEY,
  self_appraisal_id  INTEGER         NOT NULL REFERENCES self_appraisals(self_appraisal_id) ON DELETE CASCADE,
  goal_id            INTEGER         NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  achievement_pct    NUMERIC(5,2)    NOT NULL DEFAULT 0 CHECK (achievement_pct >= 0 AND achievement_pct <= 100),
  comment            TEXT,
  created_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE (self_appraisal_id, goal_id)
);

-- Manager appraisals (one per employee per cycle)
CREATE TABLE IF NOT EXISTS manager_appraisals (
  manager_appraisal_id SERIAL       PRIMARY KEY,
  cycle_id         INTEGER      NOT NULL REFERENCES appraisal_cycles(appraisal_cycle_id) ON DELETE CASCADE,
  employee_id      UUID         NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  manager_id       UUID         NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  overall_comment  TEXT,
  final_rating     VARCHAR(50),  -- below_expectations | meets_expectations | good | exceeds_expectations
  status           VARCHAR(30)  NOT NULL DEFAULT 'draft', -- draft | submitted
  submitted_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (cycle_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_manager_appraisals_cycle    ON manager_appraisals(cycle_id);
CREATE INDEX IF NOT EXISTS idx_manager_appraisals_employee ON manager_appraisals(employee_id);
CREATE INDEX IF NOT EXISTS idx_manager_appraisals_manager  ON manager_appraisals(manager_id);

-- Per-goal ratings inside a manager appraisal
CREATE TABLE IF NOT EXISTS manager_appraisal_goal_ratings (
  manager_appraisal_goal_rating_id SERIAL          PRIMARY KEY,
  manager_appraisal_id  INTEGER         NOT NULL REFERENCES manager_appraisals(manager_appraisal_id) ON DELETE CASCADE,
  goal_id               INTEGER         NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  achievement_pct       NUMERIC(5,2)    NOT NULL DEFAULT 0 CHECK (achievement_pct >= 0 AND achievement_pct <= 100),
  comment               TEXT,
  created_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE (manager_appraisal_id, goal_id)
);
