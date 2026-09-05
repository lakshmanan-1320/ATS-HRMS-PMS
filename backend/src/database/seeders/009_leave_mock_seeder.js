const { query } = require('../../config/db');

/**
 * 009_leave_mock_seeder.js
 * Comprehensive Leave Management & Permissions Seeder:
 * - Leave Types: Casual Leave (CL), Sick Leave (SL), Earned Leave (EL)
 * - Leave Plans & Leave Plan Types: Standard Enterprise Leave Plan assigned to all 40 employees
 * - Organization Leave Settings (calendar_year, monthly cap)
 * - Employee Leave Balances for 2026
 * - Leave Requests: 15+ requests (5 PENDING including John Doe & Meera Reddy to Arjun Sharma, 8 APPROVED including 5 on leave today, 2 REJECTED)
 * - Permission Settings, Employee Monthly Balances, and Permission Requests (4 PENDING)
 */
async function seedLeaveData() {
  try {
    console.log('[Seeder 009] Starting Complete HRMS Leave & Permissions mock data seeding...');

    // 1. Get organization ID
    const caRow = await query('SELECT organization_id FROM client_admins LIMIT 1');
    if (!caRow.rows.length) {
      console.log('[Seeder 009] No organization found. Skipping leave seeding.');
      return;
    }
    const organizationId = caRow.rows[0].organization_id;

    // 2. Fetch all employees
    const empRes = await query(`
      SELECT employee_id, employee_code, first_name, last_name, email, manager_employee_id
      FROM employees
      WHERE organization_id = $1 AND status = 'active'
    `, [organizationId]);

    const employees = empRes.rows;
    if (!employees.length) {
      console.log('[Seeder 009] No employees found. Skipping leave seeding.');
      return;
    }
    const empMap = {};
    employees.forEach(e => { empMap[e.email] = e; });

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // 3. Upsert Leave Types (CL, SL, EL)
    const leaveTypesData = [
      { name: 'Casual Leave', code: 'CL', desc: 'Short-term urgent personal or family obligations', quota: 12.0, isPaid: true, reqAttach: false, halfDay: true },
      { name: 'Sick Leave', code: 'SL', desc: 'Personal medical illness, physician appointments and recuperation', quota: 12.0, isPaid: true, reqAttach: true, halfDay: true },
      { name: 'Earned Leave / Vacation', code: 'EL', desc: 'Accumulated annual privilege vacation leave', quota: 15.0, isPaid: true, reqAttach: false, halfDay: false }
    ];

    const leaveTypeIds = {};
    for (const lt of leaveTypesData) {
      let existingLt = await query('SELECT leave_type_id FROM leave_types WHERE leave_type_code = $1', [lt.code]);
      let ltId;
      if (existingLt.rows.length === 0) {
        let newLt = await query(`
          INSERT INTO leave_types (
            leave_type_name, leave_type_code, description, annual_quota_days,
            is_paid_leave, requires_attachment, allows_half_day, is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
          RETURNING leave_type_id
        `, [lt.name, lt.code, lt.desc, lt.quota, lt.isPaid, lt.reqAttach, lt.halfDay]);
        ltId = newLt.rows[0].leave_type_id;
        console.log(`[Seeder 009] Created Leave Type: ${lt.code} - ${lt.name}`);
      } else {
        ltId = existingLt.rows[0].leave_type_id;
        await query(`
          UPDATE leave_types SET
            leave_type_name = $1,
            annual_quota_days = $2,
            is_paid_leave = $3,
            requires_attachment = $4,
            allows_half_day = $5,
            is_active = true,
            updated_at = NOW()
          WHERE leave_type_id = $6
        `, [lt.name, lt.quota, lt.isPaid, lt.reqAttach, lt.halfDay, ltId]);
      }
      leaveTypeIds[lt.code] = ltId;
    }

    // 4. Upsert Organization Leave Settings
    const orgLeaveSettingCheck = await query('SELECT id FROM organization_leave_settings WHERE id = 1');
    if (orgLeaveSettingCheck.rows.length === 0) {
      await query(`
        INSERT INTO organization_leave_settings (
          id, leave_year_type, leave_year_start_month, pro_rata_on_join,
          auto_credit_on_join, monthly_paid_leave_cap, created_at, updated_at
        ) VALUES (1, 'calendar_year', 1, true, true, 3, NOW(), NOW())
      `);
      console.log('[Seeder 009] Created Organization Leave Settings (Calendar Year).');
    }

    // 5. Upsert Leave Plan: Standard Enterprise Leave Plan
    let planRes = await query(
      `SELECT leave_plan_id FROM leave_plans WHERE organization_id = $1 AND name = 'Standard Enterprise Leave Plan'`,
      [organizationId]
    );
    let planId;
    if (planRes.rows.length === 0) {
      const newPlan = await query(`
        INSERT INTO leave_plans (
          organization_id, name, description, leave_year_type, start_month, is_active, created_at, updated_at
        ) VALUES (
          $1, 'Standard Enterprise Leave Plan',
          'Standard full-time employee leave plan covering CL, SL, and EL quotas.',
          'calendar_year', 1, true, NOW(), NOW()
        ) RETURNING leave_plan_id
      `, [organizationId]);
      planId = newPlan.rows[0].leave_plan_id;
      console.log(`[Seeder 009] Created Leave Plan: Standard Enterprise Leave Plan (${planId})`);
    } else {
      planId = planRes.rows[0].leave_plan_id;
    }

    // Link leave types into leave_plan_types
    for (const lt of leaveTypesData) {
      const ltId = leaveTypeIds[lt.code];
      const planTypeCheck = await query(`
        SELECT leave_plan_type_id FROM leave_plan_types
        WHERE leave_plan_id = $1 AND leave_type_id = $2
      `, [planId, ltId]);

      if (planTypeCheck.rows.length === 0) {
        await query(`
          INSERT INTO leave_plan_types (
            leave_plan_id, leave_type_id, quota_days, accrual_type,
            carry_forward_rule, max_carry_forward_days, encashment_rule, max_encash_days, created_at, updated_at
          ) VALUES (
            $1, $2, $3, 'annual_upfront',
            'limited', 5.0, 'allowed', 10.0, NOW(), NOW()
          )
        `, [planId, ltId, lt.quota]);
      }
    }

    // Assign leave_plan_id to all 40 employees
    await query(`
      UPDATE employees SET leave_plan_id = $1, updated_at = NOW()
      WHERE organization_id = $2
    `, [planId, organizationId]);
    console.log(`[Seeder 009] Assigned Standard Enterprise Leave Plan to all ${employees.length} employees.`);

    // 6. Seed Employee Leave Balances for 2026
    let balanceCount = 0;
    for (const emp of employees) {
      for (const lt of leaveTypesData) {
        const ltId = leaveTypeIds[lt.code];
        const allocated = lt.quota;
        const used = Math.floor(Math.random() * 3); // 0-2 days used

        await query(`
          INSERT INTO employee_leave_balances (employee_id, leave_type_id, financial_year, allocated_days, used_days, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          ON CONFLICT (employee_id, leave_type_id, financial_year) DO UPDATE SET
            allocated_days = EXCLUDED.allocated_days,
            used_days = EXCLUDED.used_days,
            updated_at = NOW()
        `, [emp.employee_id, ltId, currentYear, allocated, used]);
        balanceCount++;
      }
    }
    console.log(`[Seeder 009] Populated ${balanceCount} leave balance records for year ${currentYear}.`);

    // 7. Seed Leave Requests (Clean existing requests for org employees first)
    await query(`
      DELETE FROM leave_requests
      WHERE employee_id = ANY(SELECT employee_id FROM employees WHERE organization_id = $1)
    `, [organizationId]);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Helper to calculate future / past dates
    const getDateOffset = (offsetDays) => {
      const d = new Date(today);
      d.setDate(today.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    };

    const leaveRequestsData = [
      // ── 5 PENDING REQUESTS (Ready for demo approvals) ────────────────
      {
        empEmail: 'john@example.com',
        mgrEmail: 'arjun.sharma@company.com',
        ltCode: 'CL',
        startDate: getDateOffset(3),
        endDate: getDateOffset(4),
        days: 2.0,
        reason: 'Attending family cousin wedding ceremony out of town.',
        status: 'PENDING'
      },
      {
        empEmail: 'meera.reddy@company.com',
        mgrEmail: 'arjun.sharma@company.com',
        ltCode: 'EL',
        startDate: getDateOffset(7),
        endDate: getDateOffset(8),
        days: 2.0,
        reason: 'Planned family vacation and travel.',
        status: 'PENDING'
      },
      {
        empEmail: 'rohan@example.com',
        mgrEmail: 'vikram.aditya@company.com',
        ltCode: 'SL',
        startDate: getDateOffset(1),
        endDate: getDateOffset(1),
        days: 1.0,
        reason: 'Scheduled diagnostic health tests & physician consultation.',
        status: 'PENDING'
      },
      {
        empEmail: 'neha@example.com',
        mgrEmail: 'suresh.patel@company.com',
        ltCode: 'CL',
        startDate: getDateOffset(5),
        endDate: getDateOffset(6),
        days: 2.0,
        reason: 'Personal urgent obligations and home relocation.',
        status: 'PENDING'
      },
      {
        empEmail: 'karthik.pillai@company.com',
        mgrEmail: 'sneha.iyer@company.com',
        ltCode: 'CL',
        startDate: getDateOffset(2),
        endDate: getDateOffset(2),
        days: 1.0,
        reason: 'Personal errands and bank documentation.',
        status: 'PENDING'
      },

      // ── 5 APPROVED REQUESTS FOR TODAY (Matching 5 on leave today) ───
      {
        empEmail: 'alok.ranjan@company.com',
        mgrEmail: 'suresh.patel@company.com',
        ltCode: 'CL',
        startDate: todayStr,
        endDate: todayStr,
        days: 1.0,
        reason: 'Personal family emergency.',
        status: 'APPROVED'
      },
      {
        empEmail: 'shilpa.shetty@company.com',
        mgrEmail: 'rajesh.kumar@company.com',
        ltCode: 'SL',
        startDate: todayStr,
        endDate: todayStr,
        days: 1.0,
        reason: 'High fever and doctor prescribed rest.',
        status: 'APPROVED'
      },
      {
        empEmail: 'varun.chopra@company.com',
        mgrEmail: 'sanjay.mishra@company.com',
        ltCode: 'EL',
        startDate: todayStr,
        endDate: getDateOffset(1),
        days: 2.0,
        reason: 'Annual planned vacation leave.',
        status: 'APPROVED'
      },
      {
        empEmail: 'raghav.bhatia@company.com',
        mgrEmail: 'sneha.iyer@company.com',
        ltCode: 'CL',
        startDate: todayStr,
        endDate: todayStr,
        days: 1.0,
        reason: 'Personal domestic obligations.',
        status: 'APPROVED'
      },
      {
        empEmail: 'ritika.sen@company.com',
        mgrEmail: 'anita.desai@company.com',
        ltCode: 'SL',
        startDate: todayStr,
        endDate: todayStr,
        days: 1.0,
        reason: 'Severe migraine recovery.',
        status: 'APPROVED'
      },

      // ── 3 APPROVED HISTORICAL REQUESTS ──────────────────────────────
      {
        empEmail: 'deepak.joshi@company.com',
        mgrEmail: 'arjun.sharma@company.com',
        ltCode: 'CL',
        startDate: getDateOffset(-15),
        endDate: getDateOffset(-14),
        days: 2.0,
        reason: 'Attending home renovation works.',
        status: 'APPROVED'
      },
      {
        empEmail: 'ananya.sen@company.com',
        mgrEmail: 'rahul.verma@company.com',
        ltCode: 'SL',
        startDate: getDateOffset(-20),
        endDate: getDateOffset(-19),
        days: 2.0,
        reason: 'Dental wisdom tooth surgery & recuperation.',
        status: 'APPROVED'
      },
      {
        empEmail: 'priya.nair@company.com',
        mgrEmail: 'vikram.aditya@company.com',
        ltCode: 'EL',
        startDate: getDateOffset(-30),
        endDate: getDateOffset(-28),
        days: 3.0,
        reason: 'Family summer holiday trip.',
        status: 'APPROVED'
      },

      // ── 2 REJECTED REQUESTS ─────────────────────────────────────────
      {
        empEmail: 'vikram@example.com',
        mgrEmail: 'sneha.iyer@company.com',
        ltCode: 'CL',
        startDate: getDateOffset(-10),
        endDate: getDateOffset(-9),
        days: 2.0,
        reason: 'Short notice leave during critical client shift handover.',
        status: 'REJECTED'
      },
      {
        empEmail: 'tanvi.sharma@company.com',
        mgrEmail: 'ananya.sen@company.com',
        ltCode: 'EL',
        startDate: getDateOffset(-8),
        endDate: getDateOffset(-6),
        days: 3.0,
        reason: 'Team already at minimum staffing threshold for batch induction.',
        status: 'REJECTED'
      }
    ];

    let leaveReqCount = 0;
    for (const lr of leaveRequestsData) {
      const emp = empMap[lr.empEmail];
      const mgr = empMap[lr.mgrEmail] || emp;
      const ltId = leaveTypeIds[lr.ltCode];
      if (!emp || !ltId) continue;

      await query(`
        INSERT INTO leave_requests (
          employee_id, manager_employee_id, leave_type_id, start_date, end_date,
          total_leave_days, session_type, leave_reason, current_status,
          approved_by_employee_id, approved_at, rejection_reason, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, 'FULL_DAY', $7, $8,
          $9, $10, $11, NOW(), NOW()
        )
      `, [
        emp.employee_id, mgr.employee_id, ltId, lr.startDate, lr.endDate,
        lr.days, lr.reason, lr.status,
        lr.status === 'APPROVED' ? mgr.employee_id : null,
        lr.status === 'APPROVED' ? new Date() : null,
        lr.status === 'REJECTED' ? 'Business workload and minimum department staffing requirements.' : null
      ]);
      leaveReqCount++;
    }
    console.log(`[Seeder 009] Seeded ${leaveReqCount} leave requests (5 PENDING including John Doe & Meera Reddy).`);

    // 8. Upsert Permission Settings (id = 1)
    const permSettingsCheck = await query('SELECT id FROM permission_settings WHERE id = 1');
    if (permSettingsCheck.rows.length === 0) {
      await query(`
        INSERT INTO permission_settings (id, monthly_count, hours_per_permission, pro_rata_on_join, created_at, updated_at)
        VALUES (1, 2, 2.00, true, NOW(), NOW())
      `);
      console.log('[Seeder 009] Created Permission Settings (2 passes/month, 2 hours each).');
    } else {
      await query(`
        UPDATE permission_settings SET
          monthly_count = 2,
          hours_per_permission = 2.00,
          pro_rata_on_join = true,
          updated_at = NOW()
        WHERE id = 1
      `);
    }

    // 9. Seed Employee Permission Balances for current and previous month
    let permBalCount = 0;
    for (const emp of employees) {
      for (const m of [currentMonth, currentMonth > 1 ? currentMonth - 1 : 12]) {
        const yr = (m === 12 && currentMonth === 1) ? currentYear - 1 : currentYear;
        const used = Math.floor(Math.random() * 2); // 0 or 1 used

        await query(`
          INSERT INTO employee_permission_balances (
            employee_id, month, year, allocated_count, used_count, created_at, updated_at
          ) VALUES ($1, $2, $3, 2, $4, NOW(), NOW())
          ON CONFLICT (employee_id, month, year) DO UPDATE SET
            allocated_count = 2,
            used_count = EXCLUDED.used_count,
            updated_at = NOW()
        `, [emp.employee_id, m, yr, used]);
        permBalCount++;
      }
    }
    console.log(`[Seeder 009] Seeded ${permBalCount} employee permission balance records.`);

    // 10. Seed Permission Requests (8 requests: 4 PENDING, 3 APPROVED, 1 REJECTED)
    await query(`
      DELETE FROM permission_requests
      WHERE employee_id = ANY(SELECT employee_id FROM employees WHERE organization_id = $1)
    `, [organizationId]);

    const permRequestsData = [
      // 4 PENDING
      {
        empEmail: 'john@example.com',
        mgrEmail: 'arjun.sharma@company.com',
        daysOffset: 1,
        startTime: '10:00:00',
        endTime: '12:00:00',
        hours: 2.0,
        reason: 'Medical checkup and diagnostic blood tests.',
        status: 'PENDING'
      },
      {
        empEmail: 'meera.reddy@company.com',
        mgrEmail: 'arjun.sharma@company.com',
        daysOffset: 2,
        startTime: '16:00:00',
        endTime: '18:00:00',
        hours: 2.0,
        reason: 'Bank branch visit for mortgage paperwork.',
        status: 'PENDING'
      },
      {
        empEmail: 'anand.kumar@company.com',
        mgrEmail: 'meera.reddy@company.com',
        daysOffset: 3,
        startTime: '09:00:00',
        endTime: '11:00:00',
        hours: 2.0,
        reason: 'Personal domestic repair work at residence.',
        status: 'PENDING'
      },
      {
        empEmail: 'divya.nair@company.com',
        mgrEmail: 'swati.mishra@company.com',
        daysOffset: 4,
        startTime: '14:00:00',
        endTime: '16:00:00',
        hours: 2.0,
        reason: 'Attending child school annual parent-teacher consultation.',
        status: 'PENDING'
      },
      // 3 APPROVED
      {
        empEmail: 'deepak.joshi@company.com',
        mgrEmail: 'arjun.sharma@company.com',
        daysOffset: -5,
        startTime: '10:00:00',
        endTime: '12:00:00',
        hours: 2.0,
        reason: 'Passport biometric verification appointment.',
        status: 'APPROVED'
      },
      {
        empEmail: 'swati.mishra@company.com',
        mgrEmail: 'rahul.verma@company.com',
        daysOffset: -8,
        startTime: '16:00:00',
        endTime: '18:00:00',
        hours: 2.0,
        reason: 'Physiotherapy rehabilitation session.',
        status: 'APPROVED'
      },
      {
        empEmail: 'priyanka.goyal@company.com',
        mgrEmail: 'priya.nair@company.com',
        daysOffset: -12,
        startTime: '09:00:00',
        endTime: '11:00:00',
        hours: 2.0,
        reason: 'Emergency vehicle maintenance and inspection.',
        status: 'APPROVED'
      },
      // 1 REJECTED
      {
        empEmail: 'vikram@example.com',
        mgrEmail: 'sneha.iyer@company.com',
        daysOffset: -15,
        startTime: '14:00:00',
        endTime: '16:00:00',
        hours: 2.0,
        reason: 'Permission requested during mandatory client status briefing.',
        status: 'REJECTED'
      }
    ];

    let permReqCount = 0;
    for (const pr of permRequestsData) {
      const emp = empMap[pr.empEmail];
      const mgr = empMap[pr.mgrEmail] || emp;
      if (!emp) continue;

      const permDate = getDateOffset(pr.daysOffset);
      const permDateObj = new Date(permDate);
      const pMonth = permDateObj.getMonth() + 1;
      const pYear = permDateObj.getFullYear();

      await query(`
        INSERT INTO permission_requests (
          employee_id, manager_employee_id, permission_date, start_time, end_time,
          duration_hours, reason, status, month, year, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, NOW(), NOW()
        )
      `, [
        emp.employee_id, mgr.employee_id, permDate, pr.startTime, pr.endTime,
        pr.hours, pr.reason, pr.status, pMonth, pYear
      ]);
      permReqCount++;
    }
    console.log(`[Seeder 009] Seeded ${permReqCount} permission requests (4 PENDING).`);
    console.log('[Seeder 009] Leave & Permissions seeding complete.');

  } catch (err) {
    console.error('[Seeder 009] Error seeding leave and permissions:', err);
    throw err;
  }
}

module.exports = seedLeaveData;
