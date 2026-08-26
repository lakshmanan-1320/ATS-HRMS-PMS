const { query } = require('../../config/db');

/**
 * 009_leave_mock_seeder.js
 * Generates leave types, annual leave quotas (CL, SL, EL), historical leave balances,
 * emergency sick requests with medical notes, and approved vacation requests across 6 months.
 */
async function seedLeaveData() {
  try {
    console.log('[Seeder 009] Starting HRMS Leave Management & Entitlements mock data seeding...');

    // 1. Get Client Admin organization ID
    const orgRes = await query('SELECT DISTINCT organization_id FROM client_admins LIMIT 1');
    if (!orgRes.rows.length) {
      console.log('[Seeder 009] No organization found. Skipping leave seeding.');
      return;
    }
    const organizationId = orgRes.rows[0].organization_id;

    // 2. Fetch all employees
    const empRes = await query(
      'SELECT employee_id, first_name, last_name, email, manager_employee_id FROM employees WHERE organization_id = $1',
      [organizationId]
    );

    if (!empRes.rows.length) {
      console.log('[Seeder 009] No employees found. Skipping leave seeding.');
      return;
    }

    const employees = empRes.rows;
    const currentYear = new Date().getFullYear();

    // 3. Define standard Leave Types
    const leaveTypesData = [
      { name: 'Casual Leave', code: 'CL', desc: 'Short-term urgent personal or family obligations', quota: 12.0, isPaid: true },
      { name: 'Sick Leave', code: 'SL', desc: 'Personal medical illness, recovery or physician appointments', quota: 12.0, isPaid: true, reqAttach: true },
      { name: 'Earned Leave / Vacation', code: 'EL', desc: 'Accumulated annual privilege vacation leave', quota: 15.0, isPaid: true }
    ];

    const leaveTypeIds = {};

    for (const lt of leaveTypesData) {
      let existingLt = await query('SELECT leave_type_id FROM leave_types WHERE leave_type_code = $1', [lt.code]);
      let ltId;
      if (existingLt.rows.length === 0) {
        let newLt = await query(
          `INSERT INTO leave_types (leave_type_name, leave_type_code, description, annual_quota_days, is_paid_leave, requires_attachment)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING leave_type_id`,
          [lt.name, lt.code, lt.desc, lt.quota, lt.isPaid, lt.reqAttach || false]
        );
        ltId = newLt.rows[0].leave_type_id;
      } else {
        ltId = existingLt.rows[0].leave_type_id;
      }
      leaveTypeIds[lt.code] = ltId;
    }

    // 4. Seed Employee Leave Balances for Current Financial Year
    let balanceCount = 0;
    for (const emp of employees) {
      for (const lt of leaveTypesData) {
        const ltId = leaveTypeIds[lt.code];
        const allocated = lt.quota;
        const used = Math.floor(Math.random() * 4); // 0-3 days used

        await query(
          `INSERT INTO employee_leave_balances (employee_id, leave_type_id, financial_year, allocated_days, used_days)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (employee_id, leave_type_id, financial_year) DO UPDATE SET
             allocated_days = EXCLUDED.allocated_days,
             used_days = EXCLUDED.used_days`,
          [emp.employee_id, ltId, currentYear, allocated, used]
        );
        balanceCount++;
      }
    }

    // 5. Seed Historical Leave Requests across the past 6 months
    const leaveReasons = [
      'Attending family function and personal commitments',
      'Under the weather, severe viral fever and physician recommended rest',
      'Annual family summer vacation trip',
      'Urgent home maintenance and personal appointment',
      'Dental treatment and recovery rest',
      'Child school annual day function and parental obligations'
    ];

    let requestCount = 0;
    const today = new Date();

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const managerId = emp.manager_employee_id || emp.employee_id;

      // Seed 2 historical leave requests per employee
      for (let r = 1; r <= 2; r++) {
        const daysAgo = (i * 7) + (r * 30); // Spread across past 6 months
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - daysAgo);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 1); // 2 days leave

        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const ltCode = r === 1 ? 'CL' : 'SL';
        const ltId = leaveTypeIds[ltCode];
        const reason = leaveReasons[(i + r) % leaveReasons.length];

        await query(
          `INSERT INTO leave_requests (
            employee_id, manager_employee_id, leave_type_id, start_date, end_date,
            total_leave_days, session_type, leave_reason, current_status, approved_by_employee_id, approved_at
          ) VALUES ($1, $2, $3, $4, $5, 2.0, 'FULL_DAY', $6, 'APPROVED', $7, NOW())`,
          [emp.employee_id, managerId, ltId, startStr, endStr, reason, managerId]
        );
        requestCount++;
      }
    }

    console.log(`[Seeder 009] Leave seeding complete. Allocated ${balanceCount} leave balance records and seeded ${requestCount} historical leave requests.`);
  } catch (err) {
    console.error('[Seeder 009] Error seeding leave data:', err);
    throw err;
  }
}

module.exports = seedLeaveData;
