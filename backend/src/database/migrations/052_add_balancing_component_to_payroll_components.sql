-- Migration: Add is_balancing_component to payroll_components
ALTER TABLE payroll_components ADD COLUMN IF NOT EXISTS is_balancing_component BOOLEAN DEFAULT FALSE;

-- Set SPECIAL_ALLOWANCE as the default balancing component for all organizations
UPDATE payroll_components 
SET is_balancing_component = TRUE 
WHERE component_code = 'SPECIAL_ALLOWANCE';
