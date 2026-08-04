const { query, withTransaction } = require('../../config/db');

async function create(organizationId, data) {
  const result = await query(`
    INSERT INTO office_locations (
      organization_id, location_name, address, latitude, longitude, radius_meters, is_active, place_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    organizationId,
    data.locationName,
    data.address,
    data.latitude,
    data.longitude,
    data.radiusMeters,
    data.isActive !== undefined ? data.isActive : true,
    data.placeId || null
  ]);
  return result.rows[0];
}

async function update(officeLocationId, data) {
  const result = await query(`
    UPDATE office_locations
    SET location_name = $1,
        address = $2,
        latitude = $3,
        longitude = $4,
        radius_meters = $5,
        is_active = $6,
        place_id = $7,
        updated_at = NOW()
    WHERE office_location_id = $8
    RETURNING *
  `, [
    data.locationName,
    data.address,
    data.latitude,
    data.longitude,
    data.radiusMeters,
    data.isActive,
    data.placeId || null,
    officeLocationId
  ]);
  return result.rows[0] || null;
}

async function findById(officeLocationId) {
  const result = await query(`
    SELECT ol.*,
           COALESCE(COUNT(DISTINCT apl.attendance_policy_id), 0)::int AS policies_count
    FROM office_locations ol
    LEFT JOIN attendance_policy_locations apl ON ol.office_location_id = apl.office_location_id
    WHERE ol.office_location_id = $1
    GROUP BY ol.office_location_id
  `, [officeLocationId]);
  return result.rows[0] || null;
}

async function list(organizationId) {
  const result = await query(`
    SELECT ol.*,
           COALESCE(COUNT(DISTINCT apl.attendance_policy_id), 0)::int AS policies_count
    FROM office_locations ol
    LEFT JOIN attendance_policy_locations apl ON ol.office_location_id = apl.office_location_id
    WHERE ol.organization_id = $1
    GROUP BY ol.office_location_id
    ORDER BY ol.location_name ASC
  `, [organizationId]);
  return result.rows;
}

async function deleteLocation(officeLocationId) {
  const result = await query(`
    DELETE FROM office_locations WHERE office_location_id = $1 RETURNING *
  `, [officeLocationId]);
  return result.rows[0] || null;
}

async function setStatus(officeLocationId, isActive) {
  const result = await query(`
    UPDATE office_locations
    SET is_active = $1, updated_at = NOW()
    WHERE office_location_id = $2
    RETURNING *
  `, [isActive, officeLocationId]);
  return result.rows[0] || null;
}

async function getPolicyLocations(policyId) {
  const result = await query(`
    SELECT ol.* 
    FROM office_locations ol
    JOIN attendance_policy_locations apl ON ol.office_location_id = apl.office_location_id
    WHERE apl.attendance_policy_id = $1
  `, [policyId]);
  return result.rows;
}

async function setPolicyLocations(policyId, officeLocationIds) {
  return withTransaction(async (client) => {
    // Delete existing mappings
    await client.query(`
      DELETE FROM attendance_policy_locations WHERE attendance_policy_id = $1
    `, [policyId]);

    // Insert new mappings
    if (Array.isArray(officeLocationIds) && officeLocationIds.length > 0) {
      for (const locId of officeLocationIds) {
        await client.query(`
          INSERT INTO attendance_policy_locations (attendance_policy_id, office_location_id)
          VALUES ($1, $2)
        `, [policyId, locId]);
      }
    }
  });
}

module.exports = {
  create,
  update,
  findById,
  list,
  deleteLocation,
  setStatus,
  getPolicyLocations,
  setPolicyLocations,
};
