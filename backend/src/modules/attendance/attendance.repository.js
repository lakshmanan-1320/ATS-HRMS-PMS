const { query, withTransaction } = require('../../config/db');

async function getActiveGeoFenceZones(organizationId) {
  const result = await query(`
    SELECT geo_fence_zone_id, zone_name, latitude, longitude, radius_meters
    FROM geo_fence_zones
    WHERE is_active = true
      AND (organization_id = $1 OR ($1::uuid IS NULL AND organization_id IS NULL))
    ORDER BY created_at ASC
  `, [organizationId || null]);
  return result.rows;
}

async function findByEmployeeAndDate(employeeId, attendanceDate, client = null) {
  const executor = client || { query };
  const result = await executor.query(`
    SELECT *
    FROM attendance_punches
    WHERE employee_id = $1 AND attendance_date = $2
    LIMIT 1
  `, [employeeId, attendanceDate]);
  return result.rows[0] || null;
}

async function createCheckIn(data) {
  return withTransaction(async (client) => {
    const result = await client.query(`
      INSERT INTO attendance_punches (
        employee_id, attendance_date, check_in_time,
        check_in_latitude, check_in_longitude, check_in_selfie_url,
        geo_fence_zone_id, zone_name, distance_meters, is_within_fence,
        device_info, check_in_idempotency_key,
        location_status, gps_accuracy, distance_from_office,
        location_source, matched_office_location_id,
        shift_id, attendance_result
      )
      VALUES ($1,$2,NOW(),$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      ON CONFLICT (employee_id, attendance_date) DO NOTHING
      RETURNING *
    `, [
      data.employeeId,
      data.attendanceDate,
      data.latitude,
      data.longitude,
      data.selfieUrl,
      data.geoFenceZoneId,
      data.zoneName,
      data.distanceMeters,
      data.isWithinFence,
      JSON.stringify(data.deviceInfo || {}),
      data.idempotencyKey,
      data.locationStatus || 'LOCATION_NOT_VERIFIED',
      data.gpsAccuracy || null,
      data.distanceFromOffice || null,
      data.locationSource || 'UNKNOWN',
      data.matchedOfficeLocationId || null,
      data.shiftId || null,
      data.attendanceResult || null,
    ]);

    if (!result.rows[0]) {
      const existing = await findByEmployeeAndDate(data.employeeId, data.attendanceDate, client);
      return { row: existing, created: false };
    }

    return { row: result.rows[0], created: true };
  });
}

async function updateCheckOut(data) {
  return withTransaction(async (client) => {
    const existing = await findByEmployeeAndDate(data.employeeId, data.attendanceDate, client);
    if (!existing) return { row: null, status: 'missing_check_in' };
    if (existing.check_out_time) return { row: existing, status: 'already_checked_out' };

    const result = await client.query(`
      UPDATE attendance_punches
      SET check_out_time = NOW(),
          check_out_latitude = $3,
          check_out_longitude = $4,
          check_out_selfie_url = $5,
          work_duration_minutes = FLOOR(EXTRACT(EPOCH FROM (NOW() - check_in_time)) / 60)::int,
          device_info = COALESCE(device_info, '{}'::jsonb) || $6::jsonb,
          check_out_idempotency_key = $7,
          attendance_result = $8,
          updated_at = NOW()
      WHERE employee_id = $1
        AND attendance_date = $2
        AND check_out_time IS NULL
      RETURNING *
    `, [
      data.employeeId,
      data.attendanceDate,
      data.latitude,
      data.longitude,
      data.selfieUrl,
      JSON.stringify({ checkOut: data.deviceInfo || {} }),
      data.idempotencyKey,
      data.attendanceResult || null,
    ]);

    if (!result.rows[0]) {
      const current = await findByEmployeeAndDate(data.employeeId, data.attendanceDate, client);
      return { row: current, status: current?.check_out_time ? 'already_checked_out' : 'missing_check_in' };
    }

    return { row: result.rows[0], status: 'checked_out' };
  });
}

module.exports = {
  getActiveGeoFenceZones,
  findByEmployeeAndDate,
  createCheckIn,
  updateCheckOut,
};
