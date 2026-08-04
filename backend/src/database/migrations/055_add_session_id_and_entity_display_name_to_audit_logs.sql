-- Migration 055: Add session_id and entity_display_name to audit_logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_display_name VARCHAR(255) NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS session_id UUID NULL;
