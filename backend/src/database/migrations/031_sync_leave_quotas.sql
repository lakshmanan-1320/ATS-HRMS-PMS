-- Migration 031: Sync leave plan types and propagate updated quotas to ledger entries & balances cache with correct year of joining check

-- 1. Sync leave plan types quota_days from standard leave types annual_quota_days
UPDATE leave_plan_types lpt
SET quota_days = lt.annual_quota_days
FROM leave_types lt
WHERE lpt.leave_type_id = lt.leave_type_id;

-- 2. Recalculate/Update employee awarded ledger entries for the current year, and rebuild balance cache
DO $$
DECLARE
    settings_pro_rata BOOLEAN;
    settings_start_month INTEGER;
    current_fy INTEGER;
    year_start DATE;
    year_end DATE;
BEGIN
    SELECT pro_rata_on_join, leave_year_start_month INTO settings_pro_rata, settings_start_month
    FROM organization_leave_settings WHERE id = 1;

    current_fy := EXTRACT(YEAR FROM NOW())::integer;
    
    -- Calculate start and end range for current financial/calendar year
    year_start := TO_DATE(current_fy || '-' || settings_start_month || '-01', 'YYYY-MM-DD');
    year_end := (year_start + INTERVAL '1 year' - INTERVAL '1 day')::date;

    -- Update AWARDED entries for the current financial year based on updated leave plan types quota
    UPDATE leave_ledger_entries lle
    SET days = CASE 
        -- If employee joined during the current leave year, calculate pro-rata days
        WHEN settings_pro_rata = true 
             AND e.date_of_joining IS NOT NULL 
             AND e.date_of_joining >= year_start 
             AND e.date_of_joining <= year_end 
        THEN
            -- Calculate pro-rata days: (quota / 12) * remainingMonths, rounded to nearest 0.5
            ROUND(
                (lpt.quota_days / 12.0 * (
                    12 - CASE 
                        WHEN EXTRACT(MONTH FROM e.date_of_joining)::integer >= settings_start_month
                        THEN EXTRACT(MONTH FROM e.date_of_joining)::integer - settings_start_month
                        ELSE 12 - settings_start_month + EXTRACT(MONTH FROM e.date_of_joining)::integer
                    END
                )) * 2.0
            ) / 2.0
        -- If employee joins in the future, set to 0.00
        WHEN e.date_of_joining IS NOT NULL AND e.date_of_joining > year_end
        THEN 0.00
        -- Otherwise (joined before the current year, or date_of_joining is null), get full quota
        ELSE
            lpt.quota_days
    END
    FROM employees e
    JOIN leave_plans lp ON (e.leave_plan_id = lp.leave_plan_id OR (e.leave_plan_id IS NULL AND lp.organization_id = e.organization_id AND lp.is_active = true))
    JOIN leave_plan_types lpt ON lpt.leave_plan_id = lp.leave_plan_id
    WHERE lle.employee_id = e.employee_id
      AND lle.leave_type_id = lpt.leave_type_id
      AND lle.financial_year = current_fy
      AND lle.transaction_type = 'AWARDED';

    -- Sync employee_leave_balances cache for the current financial year
    INSERT INTO employee_leave_balances (employee_id, leave_type_id, financial_year, allocated_days, used_days, updated_at)
    SELECT 
        employee_id, 
        leave_type_id, 
        financial_year,
        COALESCE(SUM(CASE WHEN days > 0 THEN days ELSE 0 END), 0.00) AS allocated_days,
        COALESCE(SUM(CASE WHEN days < 0 THEN -days ELSE 0 END), 0.00) AS used_days,
        NOW()
    FROM leave_ledger_entries
    WHERE financial_year = current_fy
    GROUP BY employee_id, leave_type_id, financial_year
    ON CONFLICT (employee_id, leave_type_id, financial_year)
    DO UPDATE SET 
        allocated_days = EXCLUDED.allocated_days, 
        used_days = EXCLUDED.used_days, 
        updated_at = NOW();

END $$;
