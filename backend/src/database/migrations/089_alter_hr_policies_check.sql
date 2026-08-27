-- Migration: Alter HR Policies Check Constraint
-- Adds 'Benefits & Compensation' to the allowed categories in hr_policies constraint.

ALTER TABLE hr_policies DROP CONSTRAINT IF EXISTS hr_policies_category_check;
ALTER TABLE hr_policies ADD CONSTRAINT hr_policies_category_check CHECK (category IN (
    'Attendance & Working Hours',
    'Leave & Employee Conduct',
    'IT & Data Security',
    'Benefits & Compensation',
    'General'
));
