CREATE TABLE IF NOT EXISTS goal_types (
  goal_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  description TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS goal_priorities (
  priority_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS goal_visibilities (
  visibility_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- Seed initial data
INSERT INTO goal_types (code, name, icon, description, display_order)
VALUES
  ('PERSONAL', 'Personal Goal', '👤', 'Individual performance target', 1),
  ('DEPARTMENT', 'Department Goal', '🏢', 'Shared across your department', 2),
  ('COMPANY', 'Company Goal', '🌐', 'Organization-wide objective', 3)
ON CONFLICT (code) DO NOTHING;

INSERT INTO goal_priorities (code, name, display_order)
VALUES
  ('LOW', 'Low', 1),
  ('MEDIUM', 'Medium', 2),
  ('HIGH', 'High', 3),
  ('CRITICAL', 'Critical', 4)
ON CONFLICT (code) DO NOTHING;

INSERT INTO goal_visibilities (code, name, display_order)
VALUES
  ('PRIVATE', 'Private', 1),
  ('TEAM', 'Team', 2),
  ('DEPARTMENT', 'Department', 3),
  ('ORGANIZATION', 'Organization', 4)
ON CONFLICT (code) DO NOTHING;
