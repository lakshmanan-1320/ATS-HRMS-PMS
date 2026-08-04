-- Migration: Add session timeout config to organizations and last_activity to users
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS idle_session_timeout_minutes INTEGER DEFAULT 15;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS warn_before_expiry_minutes INTEGER DEFAULT 2;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS absolute_timeout_hours INTEGER DEFAULT 8;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS extend_on_activity BOOLEAN DEFAULT TRUE;

-- Add last activity tracking to users for server-side verification
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update super admin / global session timeout policy settings to default to 15 minutes
UPDATE session_timeout_policy 
SET idle_timeout_minutes = 15,
    warn_before_expiry_minutes = 2;
