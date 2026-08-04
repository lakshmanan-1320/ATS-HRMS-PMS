-- Create global holiday template library
CREATE TABLE IF NOT EXISTS global_holidays (
  global_holiday_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_name VARCHAR(150) NOT NULL,
  holiday_type VARCHAR(30) NOT NULL CHECK (holiday_type IN ('PUBLIC', 'OPTIONAL')),
  recurrence_month INTEGER NOT NULL CHECK (recurrence_month BETWEEN 1 AND 12),
  recurrence_day INTEGER NOT NULL CHECK (recurrence_day BETWEEN 1 AND 31),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed global national templates
INSERT INTO global_holidays (holiday_name, holiday_type, recurrence_month, recurrence_day, description) VALUES
('New Year''s Day', 'PUBLIC', 1, 1, 'New Year Celebration'),
('Republic Day', 'PUBLIC', 1, 26, 'National Celebration of Constitution'),
('Independence Day', 'PUBLIC', 8, 15, 'National Independence Day'),
('Gandhi Jayanti', 'PUBLIC', 10, 2, 'Birthday of Mahatma Gandhi'),
('Christmas Day', 'PUBLIC', 12, 25, 'Christmas Day Celebration')
ON CONFLICT DO NOTHING;

-- Create company-specific custom recurring holidays
CREATE TABLE IF NOT EXISTS recurring_holidays (
  recurring_holiday_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  holiday_name VARCHAR(150) NOT NULL,
  holiday_type VARCHAR(30) NOT NULL CHECK (holiday_type IN ('PUBLIC', 'OPTIONAL')),
  recurrence_month INTEGER NOT NULL CHECK (recurrence_month BETWEEN 1 AND 12),
  recurrence_day INTEGER NOT NULL CHECK (recurrence_day BETWEEN 1 AND 31),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organization global holiday opt-outs
CREATE TABLE IF NOT EXISTS organization_holiday_opt_outs (
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  global_holiday_id UUID NOT NULL REFERENCES global_holidays(global_holiday_id) ON DELETE CASCADE,
  PRIMARY KEY (organization_id, global_holiday_id)
);

-- Update concrete holidays (used only for overrides and one-off/custom single-year holidays)
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE;

-- Recreate index to allow identical dates across different organizations, but enforce uniqueness within one organization
DROP INDEX IF EXISTS holidays_date_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS holidays_org_date_uidx 
ON holidays (organization_id, holiday_date) 
WHERE is_deleted = false;
