/**
 * payrollData.service.js
 * Parameterized data access for authenticated employee's own salary & payroll records.
 * Enforces organization and user boundaries. Never exposes other employees' salary.
 */

'use strict';

const { query } = require('../../config/db');
const logger = require('../../config/logger');

/**
 * Retrieves salary and latest payroll breakdown for the authenticated employee only.
 * @param {string} employeeId - UUID of employee
 * @param {string} organizationId - UUID of organization
 * @returns {Promise<object>}
 */
async function getMySalaryInfo(employeeId, organizationId) {
  if (!employeeId || !organizationId) {
    return { hasSalaryInfo: false };
  }

  try {
    // 1. Fetch Salary Structure / CTC Config
    const configRes = await query(
      `SELECT
        salary_type,
        gross_salary,
        ctc_amount,
        effective_from,
        effective_to
      FROM employee_salary_configs
      WHERE employee_id = $1 AND organization_id = $2
      ORDER BY effective_from DESC NULLS LAST, created_at DESC
      LIMIT 1`,
      [employeeId, organizationId]
    );

    // 2. Fetch Latest Generated Payslip / Payroll
    const payrollRes = await query(
      `SELECT
        ep.gross_salary,
        ep.net_salary,
        ep.total_earnings,
        ep.total_deductions,
        ep.pf_amount,
        ep.esi_amount,
        ep.professional_tax,
        ep.income_tax,
        ep.payslip_number,
        ep.current_status,
        pr.payroll_month AS month,
        pr.payroll_year AS year
      FROM employee_payrolls ep
      LEFT JOIN payroll_runs pr ON pr.payroll_run_id = ep.payroll_run_id
      WHERE ep.employee_id = $1
      ORDER BY ep.created_at DESC
      LIMIT 1`,
      [employeeId]
    );

    const config = configRes.rows[0];
    const latestPayroll = payrollRes.rows[0];

    if (!config && !latestPayroll) {
      return {
        hasSalaryInfo: false,
      };
    }

    return {
      hasSalaryInfo: true,
      salaryType: config?.salary_type || 'Monthly',
      ctcAmount: config?.ctc_amount ? parseFloat(config.ctc_amount) : null,
      grossSalary: config?.gross_salary ? parseFloat(config.gross_salary) : latestPayroll?.gross_salary ? parseFloat(latestPayroll.gross_salary) : null,
      effectiveFrom: config?.effective_from ? String(config.effective_from).slice(0, 10) : null,
      latestPayroll: latestPayroll
        ? {
            month: latestPayroll.month,
            year: latestPayroll.year,
            netSalary: parseFloat(latestPayroll.net_salary) || 0,
            grossSalary: parseFloat(latestPayroll.gross_salary) || 0,
            totalEarnings: parseFloat(latestPayroll.total_earnings) || 0,
            totalDeductions: parseFloat(latestPayroll.total_deductions) || 0,
            pf: parseFloat(latestPayroll.pf_amount) || 0,
            esi: parseFloat(latestPayroll.esi_amount) || 0,
            tax: parseFloat(latestPayroll.income_tax) || 0,
            status: latestPayroll.current_status,
            payslipNumber: latestPayroll.payslip_number,
          }
        : null,
    };
  } catch (err) {
    logger.error('[Data:Payroll] Error in getMySalaryInfo:', err.message);
    return { hasSalaryInfo: false, error: err.message };
  }
}

module.exports = {
  getMySalaryInfo,
};
