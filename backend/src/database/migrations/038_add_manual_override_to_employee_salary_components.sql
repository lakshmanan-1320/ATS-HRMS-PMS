-- Migration: 038_add_manual_override_to_employee_salary_components.sql
-- Add manual override columns to employee_salary_components table

ALTER TABLE employee_salary_components ADD COLUMN IF NOT EXISTS is_manual_override BOOLEAN DEFAULT FALSE;
ALTER TABLE employee_salary_components ADD COLUMN IF NOT EXISTS manual_amount DECIMAL(12,2) DEFAULT NULL;
