-- Drop the FK constraint that limited actor_id to super_admins only.
-- audit_logs now stores users.user_id for all roles (super_admin, client_admin, employee, etc.)
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey;

-- Track which role performed the action
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_role VARCHAR(20);
