CREATE TABLE IF NOT EXISTS password_policy (
  id                  INTEGER PRIMARY KEY DEFAULT 1,
  min_length          INTEGER NOT NULL DEFAULT 8,
  require_uppercase   BOOLEAN NOT NULL DEFAULT false,
  require_lowercase   BOOLEAN NOT NULL DEFAULT false,
  require_numbers     BOOLEAN NOT NULL DEFAULT false,
  require_special_chars BOOLEAN NOT NULL DEFAULT false,
  max_age_days        INTEGER NOT NULL DEFAULT 0,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT password_policy_single_row CHECK (id = 1)
);

INSERT INTO password_policy (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
