-- KPI Library: master templates defined by client admin
CREATE TABLE IF NOT EXISTS kpi_library (
  id                       SERIAL PRIMARY KEY,
  client_admin_id          UUID NOT NULL REFERENCES client_admins(client_admin_id) ON DELETE CASCADE,

  name                     VARCHAR(255) NOT NULL,
  code                     VARCHAR(50)  NOT NULL,
  category                 VARCHAR(30)  NOT NULL
                             CHECK (category IN ('financial','operational','customer','people','quality')),
  measurement_unit         VARCHAR(20)  NOT NULL
                             CHECK (measurement_unit IN ('percentage','number','currency','rating','yes_no')),
  data_source              VARCHAR(30)  NOT NULL
                             CHECK (data_source IN ('manual_employee','manual_manager','auto_attendance','auto_leave')),
  scoring_method           VARCHAR(20)  NOT NULL DEFAULT 'linear'
                             CHECK (scoring_method IN ('linear','threshold','custom')),
  review_frequency         VARCHAR(20)  NOT NULL DEFAULT 'annual'
                             CHECK (review_frequency IN ('monthly','quarterly','half_yearly','annual')),
  over_achievement_allowed BOOLEAN      NOT NULL DEFAULT FALSE,
  description              TEXT,
  is_active                BOOLEAN      NOT NULL DEFAULT TRUE,

  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (client_admin_id, code)
);

CREATE INDEX IF NOT EXISTS idx_kpi_library_client ON kpi_library(client_admin_id);

-- KPI Assignments: KPIs assigned to specific goals with target/actual values
CREATE TABLE IF NOT EXISTS kpi_assignments (
  id                       SERIAL PRIMARY KEY,
  client_admin_id          UUID         NOT NULL REFERENCES client_admins(client_admin_id) ON DELETE CASCADE,
  goal_id                  INTEGER      NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  kpi_library_id           INTEGER      NOT NULL REFERENCES kpi_library(id) ON DELETE RESTRICT,

  -- Per-assignment overrides
  name                     VARCHAR(255),          -- override display name (falls back to library name)
  target_value             NUMERIC(12,2) NOT NULL,
  achieved_value           NUMERIC(12,2),
  weight                   NUMERIC(5,2)  NOT NULL DEFAULT 100.00,
  over_achievement_allowed BOOLEAN       NOT NULL DEFAULT FALSE,
  data_source              VARCHAR(30)   NOT NULL
                             CHECK (data_source IN ('manual_employee','manual_manager','auto_attendance','auto_leave')),

  -- Actual value entry
  entered_by_employee_id   UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
  entered_at               TIMESTAMPTZ,

  -- Approval (required when data_source = manual_employee)
  status                   VARCHAR(20)  NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','submitted','approved','rejected')),
  approved_by              UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
  approved_at              TIMESTAMPTZ,
  rejection_reason         TEXT,

  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kpi_assignments_client ON kpi_assignments(client_admin_id);
CREATE INDEX IF NOT EXISTS idx_kpi_assignments_goal   ON kpi_assignments(goal_id);
CREATE INDEX IF NOT EXISTS idx_kpi_assignments_lib    ON kpi_assignments(kpi_library_id);
