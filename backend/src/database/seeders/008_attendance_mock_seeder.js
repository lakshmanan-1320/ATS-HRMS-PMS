const { query } = require('../../config/db');

/**
 * 008_attendance_mock_seeder.js
 * Generates 6 months (180 days) of realistic attendance logs, biometric/geofenced punches,
 * late arrivals, grace periods, incomplete punches, and regularization requests.
 */
async function seedAttendanceData() {
  try {
    console.log('[Seeder 008] Starting 6-Month HRMS Attendance & Geofencing mock data seeding...');

    // 1. Get Client Admin organization ID
    const orgRes = await query('SELECT DISTINCT organization_id FROM client_admins LIMIT 1');
    if (!orgRes.rows.length) {
      console.log('[Seeder 008] No organization found. Skipping attendance seeding.');
      return;
    }
    const organizationId = orgRes.rows[0].organization_id;

    // 2. Fetch all employees in org that exist in users table
    const empRes = await query(
      'SELECT e.employee_id, e.first_name, e.last_name, e.email, e.manager_employee_id FROM employees e JOIN users u ON e.employee_id = u.user_id WHERE e.organization_id = $1',
      [organizationId]
    );

    if (!empRes.rows.length) {
      console.log('[Seeder 008] No employees found. Skipping attendance seeding.');
      return;
    }

    const employees = empRes.rows;
    console.log(`[Seeder 008] Found ${employees.length} employees for attendance seeding.`);

    // 3. Ensure a default Geofence Zone exists
    let zoneRes = await query(
      'SELECT geo_fence_zone_id FROM geo_fence_zones WHERE organization_id = $1 LIMIT 1',
      [organizationId]
    );
    let zoneId;
    if (zoneRes.rows.length === 0) {
      const newZone = await query(
        `INSERT INTO geo_fence_zones (organization_id, zone_name, latitude, longitude, radius_meters, is_active)
         VALUES ($1, 'Corporate HQ Geofence Zone', 12.9715987, 77.5945627, 100, true)
         RETURNING geo_fence_zone_id`,
        [organizationId]
      );
      zoneId = newZone.rows[0].geo_fence_zone_id;
    } else {
      zoneId = zoneRes.rows[0].geo_fence_zone_id;
    }

    // 4. Calculate 180 days date range (from 180 days ago to today)
    const today = new Date();
    const daysToSeed = 180;

    let punchInsertCount = 0;
    let regRequestCount = 0;

    for (let d = daysToSeed; d >= 0; d--) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() - d);

      const dayOfWeek = currentDate.getDay(); // 0 = Sun, 6 = Sat
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Skip weekend punches
        continue;
      }

      const dateStr = currentDate.toISOString().split('T')[0];

      for (const emp of employees) {
        const userId = emp.employee_id;
        const randVal = Math.random();

        // 85% Punctual On-Time Punch
        if (randVal < 0.85) {
          const checkInHour = 9;
          const checkInMin = Math.floor(Math.random() * 25); // 09:00 - 09:24 AM
          const checkIn = new Date(currentDate);
          checkIn.setHours(checkInHour, checkInMin, 0, 0);

          const checkOutHour = 18;
          const checkOutMin = 30 + Math.floor(Math.random() * 25); // 18:30 - 18:55 PM
          const checkOut = new Date(currentDate);
          checkOut.setHours(checkOutHour, checkOutMin, 0, 0);

          const durationMins = Math.floor((checkOut - checkIn) / 60000);

          await query(
            `INSERT INTO attendance_punches (
              employee_id, attendance_date, check_in_time, check_out_time,
              check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude,
              geo_fence_zone_id, zone_name, distance_meters, is_within_fence, work_duration_minutes
            ) VALUES ($1, $2, $3, $4, 12.9715987, 77.5945627, 12.9715987, 77.5945627, $5, 'Corporate HQ Geofence Zone', 15, true, $6)
            ON CONFLICT (employee_id, attendance_date) DO UPDATE SET
              check_in_time = EXCLUDED.check_in_time,
              check_out_time = EXCLUDED.check_out_time,
              work_duration_minutes = EXCLUDED.work_duration_minutes`,
            [userId, dateStr, checkIn, checkOut, zoneId, durationMins]
          );
          punchInsertCount++;
        } 
        // 10% Late Arrival / Grace Period Punch
        else if (randVal < 0.95) {
          const checkInHour = 9;
          const checkInMin = 35 + Math.floor(Math.random() * 30); // 09:35 - 10:05 AM (Late)
          const checkIn = new Date(currentDate);
          checkIn.setHours(checkInHour, checkInMin, 0, 0);

          const checkOutHour = 18;
          const checkOutMin = 30 + Math.floor(Math.random() * 15);
          const checkOut = new Date(currentDate);
          checkOut.setHours(checkOutHour, checkOutMin, 0, 0);

          const durationMins = Math.floor((checkOut - checkIn) / 60000);

          await query(
            `INSERT INTO attendance_punches (
              employee_id, attendance_date, check_in_time, check_out_time,
              check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude,
              geo_fence_zone_id, zone_name, distance_meters, is_within_fence, work_duration_minutes
            ) VALUES ($1, $2, $3, $4, 12.9715987, 77.5945627, 12.9715987, 77.5945627, $5, 'Corporate HQ Geofence Zone', 25, true, $6)
            ON CONFLICT (employee_id, attendance_date) DO UPDATE SET
              check_in_time = EXCLUDED.check_in_time,
              check_out_time = EXCLUDED.check_out_time,
              work_duration_minutes = EXCLUDED.work_duration_minutes`,
            [userId, dateStr, checkIn, checkOut, zoneId, durationMins]
          );
          punchInsertCount++;
        }
        // 5% Incomplete Punch / Attendance Regularization
        else {
          const checkInHour = 9;
          const checkInMin = 15;
          const checkIn = new Date(currentDate);
          checkIn.setHours(checkInHour, checkInMin, 0, 0);

          // Incomplete punch (no check out)
          await query(
            `INSERT INTO attendance_punches (
              employee_id, attendance_date, check_in_time, check_out_time,
              check_in_latitude, check_in_longitude, geo_fence_zone_id, zone_name, distance_meters, is_within_fence, work_duration_minutes
            ) VALUES ($1, $2, $3, NULL, 12.9715987, 77.5945627, $4, 'Corporate HQ Geofence Zone', 18, true, NULL)
            ON CONFLICT (employee_id, attendance_date) DO NOTHING`,
            [userId, dateStr, checkIn, zoneId]
          );
          punchInsertCount++;

          // Log Attendance Regularization Request for this missing punch out
          const managerId = emp.manager_employee_id || emp.employee_id;
          const reqCheckOut = new Date(currentDate);
          reqCheckOut.setHours(18, 30, 0, 0);

          await query(
            `INSERT INTO attendance_regularization_requests (
              organization_id, employee_id, attendance_date, request_category, request_type,
              requested_check_in, requested_check_out, reason, approval_status, approved_by, approved_at, manager_comments
            ) VALUES ($1, $2, $3, 'REGULARIZATION', 'MISSING_PUNCH_OUT', $4, $5, 'Biometric scanner hardware connection timeout on exit', 'APPROVED', $6, NOW(), 'Approved by line manager')
            ON CONFLICT (employee_id, attendance_date) WHERE approval_status = 'PENDING' DO NOTHING`,
            [organizationId, emp.employee_id, dateStr, checkIn, reqCheckOut, managerId]
          );
          regRequestCount++;
        }
      }
    }

    console.log(`[Seeder 008] Attendance seeding complete. Populated ${punchInsertCount} punch logs and ${regRequestCount} regularization requests over 180 days.`);
  } catch (err) {
    console.error('[Seeder 008] Error seeding attendance data:', err);
    throw err;
  }
}

module.exports = seedAttendanceData;
