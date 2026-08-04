-- Configurable permission policy settings (singleton row, id = 1)
CREATE TABLE IF NOT EXISTS permission_settings (
  id                   INTEGER     PRIMARY KEY DEFAULT 1,
  monthly_count        INTEGER     NOT NULL DEFAULT 2,
  hours_per_permission NUMERIC(4,2) NOT NULL DEFAULT 2.00,
  pro_rata_on_join     BOOLEAN     NOT NULL DEFAULT true,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT perm_settings_singleton CHECK (id = 1)
);

INSERT INTO permission_settings (id, monthly_count, hours_per_permission, pro_rata_on_join)
VALUES (1, 2, 2.00, true)
ON CONFLICT (id) DO NOTHING;
