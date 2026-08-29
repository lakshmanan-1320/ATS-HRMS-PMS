const { query } = require('../config/db');
const logger = require('../config/logger');

/**
 * bonus.service.js
 * Queries live payroll, bonus adjustments, and incentive allocations for authenticated employees.
 */

/**
 * Retrieves payroll and bonus data for an authenticated employee.
 * 
 * @param {string} employeeId - Employee UUID
 * @param {string} organizationId - Organization UUID
 * @returns {Promise<object>} - Structured payroll & bonus information
 */
async function getEmployeeBonusData(employeeId, organizationId) {
  if (!employeeId || !organizationId) {
    return {
      type: 'employee_bonus_data',
      employeeId,
      hasBonusRecord: false,
      adjustments: []
    };
  }

  try {
    // 1. Fetch any bonus or incentive adjustments in payroll_adjustments
    const adjSql = `
      SELECT 
        a.adjustment_id,
        a.adjustment_type,
        a.adjustment_name,
        a.amount,
        a.remarks,
        r.payroll_month,
        r.payroll_year
      FROM payroll_adjustments a
      JOIN employee_payrolls ep ON ep.employee_payroll_id = a.employee_payroll_id
      JOIN payroll_runs r ON ep.payroll_run_id = r.payroll_run_id
      WHERE ep.employee_id = $1
        AND r.organization_id = $2
        AND (a.adjustment_name ILIKE '%bonus%' OR a.adjustment_name ILIKE '%incentive%' OR a.adjustment_type = 'ADDITION')
      ORDER BY r.payroll_year DESC, r.payroll_month DESC
      LIMIT 10
    `;
    const adjRes = await query(adjSql, [employeeId, organizationId]);

    // 2. Fetch latest employee_payrolls record
    const paySql = `
      SELECT 
        ep.employee_payroll_id,
        ep.gross_salary,
        ep.net_salary,
        ep.total_earnings,
        ep.paid_leave_days,
        ep.lop_days,
        ep.present_days,
        pr.payroll_month,
        pr.payroll_year,
        pr.current_status
      FROM employee_payrolls ep
      JOIN payroll_runs pr ON ep.payroll_run_id = pr.payroll_run_id
      WHERE ep.employee_id = $1
        AND pr.organization_id = $2
      ORDER BY pr.payroll_year DESC, pr.payroll_month DESC
      LIMIT 1
    `;
    const payRes = await query(paySql, [employeeId, organizationId]);
    const latestPayroll = payRes.rows[0] || null;

    const adjustments = adjRes.rows.map(a => ({
      name: a.adjustment_name,
      type: a.adjustment_type,
      amount: parseFloat(a.amount) || 0,
      remarks: a.remarks || null,
      month: a.payroll_month,
      year: a.payroll_year
    }));

    return {
      type: 'employee_bonus_data',
      employeeId,
      hasBonusRecord: adjustments.length > 0,
      adjustments,
      latestPayroll: latestPayroll ? {
        month: latestPayroll.payroll_month,
        year: latestPayroll.payroll_year,
        grossSalary: parseFloat(latestPayroll.gross_salary) || 0,
        netSalary: parseFloat(latestPayroll.net_salary) || 0,
        paidLeaveDays: parseFloat(latestPayroll.paid_leave_days) || 0,
        lopDays: parseFloat(latestPayroll.lop_days) || 0,
        presentDays: parseFloat(latestPayroll.present_days) || 0,
        status: latestPayroll.current_status
      } : null
    };
  } catch (err) {
    logger.error('[BonusService] Error querying employee bonus data:', err.message);
    return {
      type: 'employee_bonus_data',
      employeeId,
      hasBonusRecord: false,
      adjustments: [],
      error: err.message
    };
  }
}

module.exports = {
  getEmployeeBonusData
};
