-- Today's attendance for one authenticated user.
SELECT *
FROM attendance_punches
WHERE employee_id = :user_id
  AND attendance_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date;

-- Attendance summary by date.
SELECT attendance_date,
       COUNT(*) AS total_check_ins,
       COUNT(check_out_time) AS total_check_outs,
       AVG(work_duration_minutes)::int AS avg_work_minutes
FROM attendance_punches
GROUP BY attendance_date
ORDER BY attendance_date DESC;

-- Punches outside configured geo-fence.
SELECT employee_id, attendance_date, zone_name, distance_meters
FROM attendance_punches
WHERE is_within_fence = false
ORDER BY attendance_date DESC, distance_meters DESC;

-- Example geo-fence zone.
INSERT INTO geo_fence_zones (organization_id, zone_name, latitude, longitude, radius_meters)
VALUES (:organization_id, 'HQ Chennai', 13.0827, 80.2707, 500);
