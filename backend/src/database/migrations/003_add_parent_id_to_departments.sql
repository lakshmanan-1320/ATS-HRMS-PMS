ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES departments(department_id) ON DELETE CASCADE;
