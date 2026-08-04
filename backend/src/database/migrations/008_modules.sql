-- Module management per client
CREATE TABLE IF NOT EXISTS client_modules (
    client_module_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_admin_id  UUID NOT NULL REFERENCES client_admins(client_admin_id) ON DELETE CASCADE,
    module_key       VARCHAR(50) NOT NULL,
    module_name      VARCHAR(100) NOT NULL,
    is_enabled       BOOLEAN DEFAULT true,
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_admin_id, module_key)
);

-- Seed default modules for all existing clients
INSERT INTO client_modules (client_admin_id, module_key, module_name, is_enabled)
SELECT
    ca.client_admin_id,
    m.key,
    m.name,
    true
FROM client_admins ca
CROSS JOIN (
    VALUES
        ('goals',       'Goals Management'),
        ('performance', 'Performance Appraisal'),
        ('leave',       'Leave Management'),
        ('payroll',     'Payroll'),
        ('attendance',  'Attendance Tracking'),
        ('recruitment', 'Recruitment')
) AS m(key, name)
ON CONFLICT (client_admin_id, module_key) DO NOTHING;
