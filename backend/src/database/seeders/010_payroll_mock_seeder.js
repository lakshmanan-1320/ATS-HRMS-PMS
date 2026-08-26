const { query } = require('../../config/db');

/**
 * 010_payroll_mock_seeder.js
 * Generates salary structures, CTC component breakdowns (Basic, HRA, Allowances),
 * employee salary assignments, and 6 months of historical payroll runs.
 */
async function seedPayrollData() {
  try {
    console.log('[Seeder 010] Starting HRMS Payroll & Compensation mock data seeding...');

    // 1. Get Client Admin organization ID
    const orgRes = await query('SELECT DISTINCT organization_id FROM client_admins LIMIT 1');
    if (!orgRes.rows.length) {
      console.log('[Seeder 010] No organization found. Skipping payroll seeding.');
      return;
    }
    const organizationId = orgRes.rows[0].organization_id;

    // 2. Fetch all employees
    const empRes = await query(
      'SELECT employee_id, first_name, last_name, email FROM employees WHERE organization_id = $1',
      [organizationId]
    );

    if (!empRes.rows.length) {
      console.log('[Seeder 010] No employees found. Skipping payroll seeding.');
      return;
    }

    const employees = empRes.rows;

    // 3. Ensure a default Salary Structure exists
    let structRes = await query(
      'SELECT salary_structure_id FROM salary_structures WHERE organization_id = $1 LIMIT 1',
      [organizationId]
    );
    let salaryStructureId;

    if (structRes.rows.length === 0) {
      const newStruct = await query(
        `INSERT INTO salary_structures (
          organization_id, structure_name, basic_salary, hra_amount, special_allowance_amount, travel_allowance_amount, is_active
        ) VALUES ($1, 'Standard Enterprise CTC Structure', 50000.00, 22000.00, 18000.00, 5000.00, true)
        RETURNING salary_structure_id`,
        [organizationId]
      );
      salaryStructureId = newStruct.rows[0].salary_structure_id;
    } else {
      salaryStructureId = structRes.rows[0].salary_structure_id;
    }

    // 4. Assign Salary Structures to All Employees
    let assignmentCount = 0;
    for (const emp of employees) {
      const existingAssign = await query(
        'SELECT assignment_id FROM employee_salary_assignments WHERE employee_id = $1 AND salary_structure_id = $2',
        [emp.employee_id, salaryStructureId]
      );

      if (existingAssign.rows.length === 0) {
        await query(
          `INSERT INTO employee_salary_assignments (organization_id, employee_id, salary_structure_id, effective_from)
           VALUES ($1, $2, $3, '2026-01-01')`,
          [organizationId, emp.employee_id, salaryStructureId]
        );
        assignmentCount++;
      }
    }

    // 5. Seed 6 Months of Historical Payroll Runs
    const currentYear = new Date().getFullYear();
    const months = [1, 2, 3, 4, 5, 6];
    let payrollRunCount = 0;

    for (const m of months) {
      const startDate = `${currentYear}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, m, 0).getDate();
      const endDate = `${currentYear}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const existingRun = await query(
        'SELECT payroll_run_id FROM payroll_runs WHERE organization_id = $1 AND payroll_month = $2 AND payroll_year = $3',
        [organizationId, m, currentYear]
      );

      if (existingRun.rows.length === 0) {
        await query(
          `INSERT INTO payroll_runs (
            organization_id, payroll_month, payroll_year, payroll_start_date, payroll_end_date, current_status, approved_at
          ) VALUES ($1, $2, $3, $4, $5, 'APPROVED', NOW())`,
          [organizationId, m, currentYear, startDate, endDate]
        );
        payrollRunCount++;
      }
    }

    console.log(`[Seeder 010] Payroll seeding complete. Populated ${assignmentCount} employee salary assignments and ${payrollRunCount} monthly payroll runs.`);
  } catch (err) {
    console.error('[Seeder 010] Error seeding payroll data:', err);
    throw err;
  }
}

module.exports = seedPayrollData;
