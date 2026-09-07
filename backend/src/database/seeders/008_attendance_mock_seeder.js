const { query, withTransaction } = require('../../config/db');

/**
 * 008_attendance_mock_seeder.js
 * End-to-end Attendance Seeder:
 * - Office Location: insightHCM Chennai (13.0207, 80.1031, 100m radius)
 * - Attendance Policies: Standard Geofence & Shift Policy
 * - Link Policy to Location in attendance_policy_locations (shows POLICIES: 1 on card)
 * - Shifts: General Day Shift (09:00 - 18:00) assigned to all 40 employees
 * - Regularization settings and requests
 * - 90-day geofenced attendance history + Today's live check-ins (32 present, 5 leave, 3 absent)
 */
async function seedAttendanceData() {
  try {
    console.log('[Seeder 008] Starting Complete HRMS Attendance & Geofencing mock data seeding...');

    // 1. Get organization ID
    const caRow = await query('SELECT organization_id FROM client_admins LIMIT 1');
    if (!caRow.rows.length) {
      console.log('[Seeder 008] No organization found. Skipping attendance seeding.');
      return;
    }
    const organizationId = caRow.rows[0].organization_id;

    // 2. Fetch all 40 employees and their corresponding users
    const empUserRes = await query(`
      SELECT e.employee_id, e.employee_code, e.first_name, e.last_name, e.email,
             e.manager_employee_id, u.user_id, e.department_id
      FROM employees e
      JOIN users u ON e.employee_id = u.employee_id
      WHERE e.organization_id = $1 AND e.status = 'active'
    `, [organizationId]);

    const employees = empUserRes.rows;
    if (!employees.length) {
      console.log('[Seeder 008] No active employees found. Run 006_org_employees_seeder.js first.');
      return;
    }
    console.log(`[Seeder 008] Found ${employees.length} employees with user accounts.`);

    // 3. Upsert Office Location: insightHCM Chennai
    let locRes = await query(
      `SELECT office_location_id FROM office_locations WHERE organization_id = $1 AND location_name = 'insightHCM Chennai' LIMIT 1`,
      [organizationId]
    );
    let officeLocationId;
    if (locRes.rows.length === 0) {
      const newLoc = await query(`
        INSERT INTO office_locations (
          organization_id, location_name, address, latitude, longitude, radius_meters, is_active, created_at, updated_at
        ) VALUES (
          $1, 'insightHCM Chennai',
          '1-119, Kamarajar Street, Leelavathi Nagar, Mangadu, Chennai, Tamil Nadu 600122, India',
          13.0207, 80.1031, 100, true, NOW(), NOW()
        ) RETURNING office_location_id
      `, [organizationId]);
      officeLocationId = newLoc.rows[0].office_location_id;
      console.log(`[Seeder 008] Created Office Location: insightHCM Chennai (${officeLocationId})`);
    } else {
      officeLocationId = locRes.rows[0].office_location_id;
      await query(`
        UPDATE office_locations SET
          address = '1-119, Kamarajar Street, Leelavathi Nagar, Mangadu, Chennai, Tamil Nadu 600122, India',
          latitude = 13.0207,
          longitude = 80.1031,
          radius_meters = 100,
          is_active = true,
          updated_at = NOW()
        WHERE office_location_id = $1
      `, [officeLocationId]);
      console.log(`[Seeder 008] Preserved Office Location: insightHCM Chennai (${officeLocationId})`);
    }

    // 4. Upsert Attendance Policy: Standard Geofence & Shift Policy
    let polRes = await query(
      `SELECT attendance_policy_id FROM attendance_policies WHERE organization_id = $1 LIMIT 1`,
      [organizationId]
    );
    let policyId;
    if (polRes.rows.length === 0) {
      const newPol = await query(`
        INSERT INTO attendance_policies (
          organization_id, name, description, policy_type,
          enable_location_validation, enable_shift_validation, is_active,
          enable_late_arrival_lop, late_arrivals_threshold, lop_days_per_threshold,
          created_at, updated_at
        ) VALUES (
          $1, 'Standard Geofence & Shift Policy',
          'Geofenced attendance policy with shift grace periods and LOP tracking.',
          'STANDARD', true, true, true, true, 3, 1.0, NOW(), NOW()
        ) RETURNING attendance_policy_id
      `, [organizationId]);
      policyId = newPol.rows[0].attendance_policy_id;
      console.log(`[Seeder 008] Created Attendance Policy: Standard Geofence & Shift Policy (${policyId})`);
    } else {
      policyId = polRes.rows[0].attendance_policy_id;
      await query(`
        UPDATE attendance_policies SET
          enable_location_validation = true,
          enable_shift_validation = true,
          is_active = true,
          updated_at = NOW()
        WHERE attendance_policy_id = $1
      `, [policyId]);
      console.log(`[Seeder 008] Preserved Attendance Policy (${policyId})`);
    }

    // 5. Link Policy to Office Location in attendance_policy_locations
    const linkCheck = await query(`
      SELECT attendance_policy_location_id FROM attendance_policy_locations
      WHERE attendance_policy_id = $1 AND office_location_id = $2 LIMIT 1
    `, [policyId, officeLocationId]);

    if (linkCheck.rows.length === 0) {
      await query(`
        INSERT INTO attendance_policy_locations (attendance_policy_id, office_location_id, created_at)
        VALUES ($1, $2, NOW())
      `, [policyId, officeLocationId]);
      console.log(`[Seeder 008] Linked Policy (${policyId}) to Location (${officeLocationId}) - Card now displays POLICIES: 1`);
    }

    // 6. Upsert Attendance Shift: General Day Shift (09:00 - 18:00)
    let shiftRes = await query(
      `SELECT shift_id FROM attendance_shifts WHERE organization_id = $1 LIMIT 1`,
      [organizationId]
    );
    let shiftId;
    if (shiftRes.rows.length === 0) {
      const newShift = await query(`
        INSERT INTO attendance_shifts (
          organization_id, shift_name, shift_code, start_time, end_time,
          grace_minutes, early_exit_grace_minutes, minimum_hours, color_code, is_active,
          created_at, updated_at
        ) VALUES (
          $1, 'General Day Shift', 'GEN-01', '09:00:00', '18:00:00',
          15, 15, 8.0, '#C2071A', true, NOW(), NOW()
        ) RETURNING shift_id
      `, [organizationId]);
      shiftId = newShift.rows[0].shift_id;
      console.log(`[Seeder 008] Created Shift: General Day Shift (${shiftId})`);
    } else {
      shiftId = shiftRes.rows[0].shift_id;
      await query(`
        UPDATE attendance_shifts SET
          shift_name = 'General Day Shift',
          start_time = '09:00:00',
          end_time = '18:00:00',
          grace_minutes = 15,
          minimum_hours = 8.0,
          is_active = true,
          updated_at = NOW()
        WHERE shift_id = $1
      `, [shiftId]);
      console.log(`[Seeder 008] Preserved Shift: General Day Shift (${shiftId})`);
    }

    // 7. Assign shift_id and attendance_policy_id to ALL 40 employees
    await query(`
      UPDATE employees SET
        shift_id = $1,
        attendance_policy_id = $2,
        updated_at = NOW()
      WHERE organization_id = $3
    `, [shiftId, policyId, organizationId]);
    console.log(`[Seeder 008] Assigned General Day Shift and Policy to all ${employees.length} employees (eliminates 'No Shift Assigned' banner).`);

    // 8. Upsert Regularization Policy Settings
    const regSettingRes = await query(
      `SELECT regularization_setting_id FROM attendance_regularization_settings WHERE organization_id = $1 LIMIT 1`,
      [organizationId]
    );
    if (regSettingRes.rows.length === 0) {
      await query(`
        INSERT INTO attendance_regularization_settings (
          organization_id, max_requests_allowed, request_period, regularization_window_days,
          reason_required, enable_partial_day_permissions, allow_future_regularization,
          allow_missed_punch, allow_attendance_correction, allow_late_coming_permission,
          allow_early_exit_permission, allow_temporary_exit_permission, is_active, created_at, updated_at
        ) VALUES (
          $1, 3, 'MONTH', 7, true, true, false, true, true, true, true, true, true, NOW(), NOW()
        )
      `, [organizationId]);
      console.log('[Seeder 008] Created Attendance Regularization Settings.');
    }

    // 9. Seed 90 Days of Historical Attendance Punches
    const today = new Date();
    const daysToSeed = 90;
    let punchCount = 0;

    // Remove legacy punches to ensure clean consistent data
    await query(`
      DELETE FROM attendance_punches
      WHERE employee_id = ANY(SELECT user_id FROM users WHERE organization_id = $1)
    `, [organizationId]);

    for (let d = daysToSeed; d >= 1; d--) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() - d);

      const dayOfWeek = currentDate.getDay(); // 0 = Sun, 6 = Sat
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

      const dateStr = currentDate.toISOString().split('T')[0];

      for (const emp of employees) {
        const userId = emp.user_id;
        const rand = Math.random();

        // 85% On-Time Present
        if (rand < 0.85) {
          const checkIn = new Date(currentDate);
          checkIn.setHours(8, 50 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 60), 0);

          const checkOut = new Date(currentDate);
          checkOut.setHours(18, 5 + Math.floor(Math.random() * 35), Math.floor(Math.random() * 60), 0);

          const durationMins = Math.round((checkOut - checkIn) / 60000);

          await query(`
            INSERT INTO attendance_punches (
              employee_id, attendance_date, check_in_time, check_out_time,
              check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude,
              matched_office_location_id, shift_id, location_status, gps_accuracy,
              distance_from_office, distance_meters, is_within_fence, zone_name,
              work_duration_minutes, attendance_result, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4,
              13.0207, 80.1031, 13.0207, 80.1031,
              $5, $6, 'VERIFIED', 8.5,
              14.2, 14, true, 'insightHCM Chennai',
              $7, 'PRESENT', NOW(), NOW()
            ) ON CONFLICT (employee_id, attendance_date) DO NOTHING
          `, [userId, dateStr, checkIn, checkOut, officeLocationId, shiftId, durationMins]);
          punchCount++;
        }
        // 10% Late Entry
        else if (rand < 0.95) {
          const checkIn = new Date(currentDate);
          checkIn.setHours(9, 20 + Math.floor(Math.random() * 25), 0, 0); // 09:20 - 09:45 AM (Late)

          const checkOut = new Date(currentDate);
          checkOut.setHours(18, 30, 0, 0);

          const durationMins = Math.round((checkOut - checkIn) / 60000);

          await query(`
            INSERT INTO attendance_punches (
              employee_id, attendance_date, check_in_time, check_out_time,
              check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude,
              matched_office_location_id, shift_id, location_status, gps_accuracy,
              distance_from_office, distance_meters, is_within_fence, zone_name,
              work_duration_minutes, attendance_result, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4,
              13.0207, 80.1031, 13.0207, 80.1031,
              $5, $6, 'VERIFIED', 12.0,
              22.4, 22, true, 'insightHCM Chennai',
              $7, 'LATE_ENTRY', NOW(), NOW()
            ) ON CONFLICT (employee_id, attendance_date) DO NOTHING
          `, [userId, dateStr, checkIn, checkOut, officeLocationId, shiftId, durationMins]);
          punchCount++;
        }
        // 5% Incomplete Punch (Missing punch out)
        else {
          const checkIn = new Date(currentDate);
          checkIn.setHours(9, 5, 0, 0);

          await query(`
            INSERT INTO attendance_punches (
              employee_id, attendance_date, check_in_time, check_out_time,
              check_in_latitude, check_in_longitude,
              matched_office_location_id, shift_id, location_status, gps_accuracy,
              distance_from_office, distance_meters, is_within_fence, zone_name,
              work_duration_minutes, attendance_result, created_at, updated_at
            ) VALUES (
              $1, $2, $3, NULL,
              13.0207, 80.1031,
              $4, $5, 'VERIFIED', 10.0,
              18.0, 18, true, 'insightHCM Chennai',
              NULL, 'HALF_DAY', NOW(), NOW()
            ) ON CONFLICT (employee_id, attendance_date) DO NOTHING
          `, [userId, dateStr, checkIn, officeLocationId, shiftId]);
          punchCount++;
        }
      }
    }
    console.log(`[Seeder 008] Populated ${punchCount} historical attendance punches over past 90 days.`);

    // 10. Seed Today's Live Attendance: 32 Present, 5 on Leave, 3 Absent
    const todayStr = today.toISOString().split('T')[0];
    let todayPunches = 0;

    // First 32 employees are checked in today (including Arjun Sharma, John Doe, Meera Reddy)
    const checkedInEmployees = employees.slice(0, 32);
    for (const emp of checkedInEmployees) {
      const checkIn = new Date(today);
      checkIn.setHours(8, 45 + Math.floor(Math.random() * 25), Math.floor(Math.random() * 60), 0);

      await query(`
        INSERT INTO attendance_punches (
          employee_id, attendance_date, check_in_time, check_out_time,
          check_in_latitude, check_in_longitude,
          matched_office_location_id, shift_id, location_status, gps_accuracy,
          distance_from_office, distance_meters, is_within_fence, zone_name,
          work_duration_minutes, attendance_result, created_at, updated_at
        ) VALUES (
          $1, $2, $3, NULL,
          13.0207, 80.1031,
          $4, $5, 'VERIFIED', 6.5,
          10.5, 10, true, 'insightHCM Chennai',
          NULL, 'PRESENT', NOW(), NOW()
        ) ON CONFLICT (employee_id, attendance_date) DO UPDATE SET
          check_in_time = EXCLUDED.check_in_time,
          location_status = 'VERIFIED',
          matched_office_location_id = EXCLUDED.matched_office_location_id
      `, [emp.user_id, todayStr, checkIn, officeLocationId, shiftId]);
      todayPunches++;
    }
    console.log(`[Seeder 008] Seeded today's live check-ins: ${todayPunches} employees checked in at insightHCM Chennai.`);

    // 11. Seed Attendance Regularizations (8 requests: 4 PENDING, 3 APPROVED, 1 REJECTED)
    const regData = [
      // 4 PENDING
      {
        empEmail: 'john@example.com',
        mgrEmail: 'arjun.sharma@company.com',
        daysAgo: 2,
        status: 'PENDING',
        reason: 'Biometric fingerprint scanner timeout at reception exit gate.'
      },
      {
        empEmail: 'meera.reddy@company.com',
        mgrEmail: 'arjun.sharma@company.com',
        daysAgo: 3,
        status: 'PENDING',
        reason: 'Extended late night deployment support for client release v2.4.'
      },
      {
        empEmail: 'rohan@example.com',
        mgrEmail: 'vikram.aditya@company.com',
        daysAgo: 4,
        status: 'PENDING',
        reason: 'Offsite marketing campaign launch at expo center.'
      },
      {
        empEmail: 'neha@example.com',
        mgrEmail: 'suresh.patel@company.com',
        daysAgo: 5,
        status: 'PENDING',
        reason: 'Network connectivity glitch during biometric punch synchronization.'
      },
      // 3 APPROVED
      {
        empEmail: 'deepak.joshi@company.com',
        mgrEmail: 'arjun.sharma@company.com',
        daysAgo: 10,
        status: 'APPROVED',
        reason: 'Worked from client facility during architectural review.'
      },
      {
        empEmail: 'ananya.sen@company.com',
        mgrEmail: 'rahul.verma@company.com',
        daysAgo: 12,
        status: 'APPROVED',
        reason: 'Campus recruitment drive at Anna University.'
      },
      {
        empEmail: 'karthik.pillai@company.com',
        mgrEmail: 'meera.nair@company.com',
        daysAgo: 15,
        status: 'APPROVED',
        reason: 'Emergency client escalation handling on-site.'
      },
      // 1 REJECTED
      {
        empEmail: 'vikram@example.com',
        mgrEmail: 'meera.nair@company.com',
        daysAgo: 20,
        status: 'REJECTED',
        reason: 'Unregistered early departure without prior supervisor notice.'
      }
    ];

    // Clean existing regularizations for org before inserting
    await query(`
      DELETE FROM attendance_regularizations
      WHERE employee_id = ANY(SELECT employee_id FROM employees WHERE organization_id = $1)
    `, [organizationId]);
    await query(`
      DELETE FROM attendance_regularization_requests
      WHERE organization_id = $1
    `, [organizationId]);

    const empMap = {};
    employees.forEach(e => { empMap[e.email] = e; });

    let regCount = 0;
    for (const r of regData) {
      const emp = empMap[r.empEmail];
      const mgr = empMap[r.mgrEmail] || emp;
      if (!emp) continue;

      const reqDate = new Date(today);
      reqDate.setDate(today.getDate() - r.daysAgo);
      const reqDateStr = reqDate.toISOString().split('T')[0];

      const chkIn = new Date(reqDate); chkIn.setHours(9, 0, 0, 0);
      const chkOut = new Date(reqDate); chkOut.setHours(18, 30, 0, 0);

      // Insert into attendance_regularizations
      await query(`
        INSERT INTO attendance_regularizations (
          employee_id, manager_employee_id, attendance_date, regularization_type,
          requested_checkin_time, requested_checkout_time, reason, current_status,
          approved_by_employee_id, approved_at, rejection_reason, created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'MISSING_OUT_PUNCH',
          $4, $5, $6, $7,
          $8, $9, $10, NOW(), NOW()
        )
      `, [
        emp.employee_id, mgr.employee_id, reqDateStr,
        chkIn, chkOut, r.reason, r.status,
        r.status === 'APPROVED' ? mgr.employee_id : null,
        r.status === 'APPROVED' ? new Date() : null,
        r.status === 'REJECTED' ? 'Insufficient justification provided.' : null
      ]);

      // Also insert into attendance_regularization_requests
      await query(`
        INSERT INTO attendance_regularization_requests (
          organization_id, employee_id, attendance_date, request_category, request_type,
          requested_check_in, requested_check_out, reason, approval_status,
          approved_by, approved_at, manager_comments, rejection_reason, created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'REGULARIZATION', 'MISSING_PUNCH_OUT',
          $4, $5, $6, $7,
          $8, $9, $10, $11, NOW(), NOW()
        )
      `, [
        organizationId, emp.employee_id, reqDateStr,
        chkIn, chkOut, r.reason, r.status,
        r.status === 'APPROVED' ? mgr.employee_id : null,
        r.status === 'APPROVED' ? new Date() : null,
        r.status === 'APPROVED' ? 'Approved by line manager' : null,
        r.status === 'REJECTED' ? 'Insufficient justification provided.' : null
      ]);

      regCount++;
    }
    console.log(`[Seeder 008] Seeded ${regCount} attendance regularization requests (4 PENDING including John Doe).`);
    console.log('[Seeder 008] Attendance seeding complete.');

  } catch (err) {
    console.error('[Seeder 008] Error seeding attendance data:', err);
    throw err;
  }
}

module.exports = seedAttendanceData;
