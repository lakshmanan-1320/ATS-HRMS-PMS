CREATE TABLE IF NOT EXISTS optional_holiday_requests (
  optional_holiday_request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  manager_employee_id UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
  holiday_id UUID NOT NULL REFERENCES holidays(holiday_id) ON DELETE CASCADE,
  leave_year INTEGER NOT NULL,
  status VARCHAR(30) DEFAULT 'PENDING',
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
