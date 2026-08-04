const { query, withTransaction } = require('../../config/db');

async function create(organizationId, data) {
  const result = await query(`
    INSERT INTO attendance_shifts (
      organization_id, shift_name, shift_code, start_time, end_time,
      grace_minutes, early_exit_grace_minutes, minimum_hours, color_code, is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [
    organizationId,
    data.shiftName,
    data.shiftCode,
    data.startTime,
    data.endTime,
    data.graceMinutes !== undefined ? data.graceMinutes : 15,
    data.earlyExitGraceMinutes !== undefined ? data.earlyExitGraceMinutes : 5,
    data.minimumHours !== undefined ? data.minimumHours : 8.00,
    data.colorCode || '#3b82f6',
    data.isActive !== undefined ? data.isActive : true
  ]);
  return result.rows[0];
}

async function update(shiftId, data) {
  const result = await query(`
    UPDATE attendance_shifts
    SET shift_name = $1,
        shift_code = $2,
        start_time = $3,
        end_time = $4,
        grace_minutes = $5,
        early_exit_grace_minutes = $6,
        minimum_hours = $7,
        color_code = $8,
        is_active = $9,
        updated_at = NOW()
    WHERE shift_id = $10
    RETURNING *
  `, [
    data.shiftName,
    data.shiftCode,
    data.startTime,
    data.endTime,
    data.graceMinutes,
    data.earlyExitGraceMinutes,
    data.minimumHours,
    data.colorCode,
    data.isActive,
    shiftId
  ]);
  return result.rows[0] || null;
}

async function findById(shiftId) {
  const result = await query(`
    SELECT s.*,
           COALESCE(COUNT(DISTINCT sa.employee_id), 0)::int AS assigned_employees_count
    FROM attendance_shifts s
    LEFT JOIN shift_assignments sa ON s.shift_id = sa.shift_id
    LEFT JOIN employees e ON sa.employee_id = e.employee_id AND e.status = 'active'
    WHERE s.shift_id = $1
    GROUP BY s.shift_id
  `, [shiftId]);
  return result.rows[0] || null;
}

async function list(organizationId) {
  const result = await query(`
    SELECT s.*,
           COALESCE(COUNT(DISTINCT e.employee_id), 0)::int AS assigned_employees_count
    FROM attendance_shifts s
    LEFT JOIN employees e ON s.shift_id = e.shift_id AND e.status = 'active'
    WHERE s.organization_id = $1
    GROUP BY s.shift_id
    ORDER BY s.shift_name ASC
  `, [organizationId]);
  return result.rows;
}

async function deleteShift(shiftId) {
  const result = await query(`
    DELETE FROM attendance_shifts WHERE shift_id = $1 RETURNING *
  `, [shiftId]);
  return result.rows[0] || null;
}

async function setStatus(shiftId, isActive) {
  const result = await query(`
    UPDATE attendance_shifts
    SET is_active = $1, updated_at = NOW()
    WHERE shift_id = $2
    RETURNING *
  `, [isActive, shiftId]);
  return result.rows[0] || null;
}

async function assignEmployeesShift(shiftId, employeeIds, effectiveFrom, effectiveTo = null, isTemporary = false) {
  return withTransaction(async (client) => {
    const prevEffectiveTo = new Date(new Date(effectiveFrom).getTime() - 86400000).toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    for (const empId of employeeIds) {
      if (!isTemporary) {
        // PERMANENT ASSIGNMENT:
        // 1. Delete any existing permanent assignments starting on or after effectiveFrom
        await client.query(`
          DELETE FROM shift_assignments
          WHERE employee_id = $1 
            AND (is_temporary IS FALSE OR is_temporary IS NULL)
            AND effective_from >= $2::date
        `, [empId, effectiveFrom]);

        // 2. Close active permanent assignment starting before effectiveFrom
        await client.query(`
          UPDATE shift_assignments
          SET effective_to = $1::date
          WHERE employee_id = $2
            AND (is_temporary IS FALSE OR is_temporary IS NULL)
            AND effective_from < $3::date
            AND (effective_to IS NULL OR effective_to >= $3::date)
        `, [prevEffectiveTo, empId, effectiveFrom]);

        // 3. Insert new permanent assignment with effective_to = NULL
        await client.query(`
          INSERT INTO shift_assignments (shift_id, employee_id, effective_from, effective_to, is_temporary)
          VALUES ($1, $2, $3::date, NULL, FALSE)
        `, [shiftId, empId, effectiveFrom]);

        // 4. Update fallback shift_id in employees table if currently active
        if (effectiveFrom <= todayStr) {
          await client.query(`
            UPDATE employees
            SET shift_id = $1, updated_at = NOW()
            WHERE employee_id = $2
          `, [shiftId, empId]);
        }
      } else {
        // TEMPORARY ASSIGNMENT:
        // 1. Remove existing temporary assignment for same employee with exact date range
        await client.query(`
          DELETE FROM shift_assignments
          WHERE employee_id = $1 AND is_temporary = TRUE AND effective_from = $2::date AND effective_to = $3::date
        `, [empId, effectiveFrom, effectiveTo]);

        // 2. Insert temporary assignment (does NOT close permanent assignment!)
        await client.query(`
          INSERT INTO shift_assignments (shift_id, employee_id, effective_from, effective_to, is_temporary)
          VALUES ($1, $2, $3::date, $4::date, TRUE)
        `, [shiftId, empId, effectiveFrom, effectiveTo]);

        // 3. Update fallback shift_id if currently active in date range
        if (effectiveFrom <= todayStr && (effectiveTo === null || effectiveTo >= todayStr)) {
          await client.query(`
            UPDATE employees
            SET shift_id = $1, updated_at = NOW()
            WHERE employee_id = $2
          `, [shiftId, empId]);
        }
      }
    }
  });
}

async function getEmployeeShiftHistory(organizationId, employeeId) {
  const result = await query(`
    SELECT sa.shift_assignment_id, sa.shift_id, sa.effective_from::text as effective_from, sa.effective_to::text as effective_to,
           COALESCE(sa.is_temporary, false) AS is_temporary,
           CASE WHEN sa.is_temporary THEN 'TEMPORARY' ELSE 'PERMANENT' END AS assignment_type,
           sa.created_at,
           s.shift_name, s.shift_code, s.start_time, s.end_time, s.color_code, s.minimum_hours,
           CASE 
             WHEN sa.effective_from > CURRENT_DATE THEN 'SCHEDULED'
             WHEN sa.effective_from <= CURRENT_DATE AND (sa.effective_to IS NULL OR sa.effective_to >= CURRENT_DATE) THEN 'ACTIVE'
             ELSE 'PREVIOUS'
           END AS status
    FROM shift_assignments sa
    JOIN attendance_shifts s ON sa.shift_id = s.shift_id
    JOIN employees e ON sa.employee_id = e.employee_id
    WHERE sa.employee_id = $1 AND e.organization_id = $2
    ORDER BY sa.is_temporary DESC, sa.effective_from DESC, sa.created_at DESC
  `, [employeeId, organizationId]);
  return result.rows;
}

module.exports = {
  create,
  update,
  findById,
  list,
  deleteShift,
  setStatus,
  assignEmployeesShift,
  getEmployeeShiftHistory,
};
