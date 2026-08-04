const repository = require('./officeLocation.repository');
const { query } = require('../../config/db');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');

/**
 * Calculates the geodesic distance between two GPS coordinates in meters.
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return null;
  }
  const R = 6371000; // Radius of Earth in meters
  const phi1 = (Number(lat1) * Math.PI) / 180;
  const phi2 = (Number(lat2) * Math.PI) / 180;
  const deltaPhi = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const deltaLambda = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

/**
 * Checks if a duplicate office location exists by place_id, normalized name, or coordinates.
 */
async function checkDuplicate(organizationId, locationName, latitude, longitude, placeId, excludeOfficeLocationId = null) {
  let queryText = `
    SELECT office_location_id, location_name, latitude, longitude, place_id 
    FROM office_locations 
    WHERE organization_id = $1
  `;
  const params = [organizationId];

  if (excludeOfficeLocationId) {
    queryText += ` AND office_location_id != $2`;
    params.push(excludeOfficeLocationId);
  }

  const res = await query(queryText, params);
  const existingLocations = res.rows;

  const normalizeName = (name) => (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const searchNameNormalized = normalizeName(locationName);

  for (const loc of existingLocations) {
    // 1. Same place_id (if available on both sides)
    if (placeId && loc.place_id && placeId.trim() === loc.place_id.trim()) {
      return true;
    }

    // 2. Same location name (case-insensitive & normalized whitespace)
    if (normalizeName(loc.location_name) === searchNameNormalized) {
      return true;
    }

    // 3. Coordinates within 20 meters tolerance
    if (loc.latitude != null && loc.longitude != null && latitude != null && longitude != null) {
      const distance = calculateDistance(latitude, longitude, loc.latitude, loc.longitude);
      if (distance !== null && distance <= 20) {
        return true;
      }
    }
  }

  return false;
}

async function createOfficeLocation(organizationId, data) {
  if (!data.locationName) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Location Name is required.');
  }
  if (data.latitude == null || data.longitude == null) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Latitude and Longitude are required.');
  }
  if (!data.radiusMeters) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Radius in meters is required.');
  }

  const isDuplicate = await checkDuplicate(
    organizationId,
    data.locationName,
    data.latitude,
    data.longitude,
    data.placeId,
    null
  );
  if (isDuplicate) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      'An office location with the same name or location already exists. Please edit the existing office instead.'
    );
  }

  return await repository.create(organizationId, data);
}

async function updateOfficeLocation(organizationId, officeLocationId, data) {
  const existing = await repository.findById(officeLocationId);
  if (!existing || existing.organization_id !== organizationId) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Office location not found.');
  }

  if (!data.locationName) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Location Name is required.');
  }
  if (data.latitude == null || data.longitude == null) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Latitude and Longitude are required.');
  }
  if (!data.radiusMeters) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Radius in meters is required.');
  }

  const isDuplicate = await checkDuplicate(
    organizationId,
    data.locationName,
    data.latitude,
    data.longitude,
    data.placeId,
    officeLocationId
  );
  if (isDuplicate) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      'An office location with the same name or location already exists. Please edit the existing office instead.'
    );
  }

  return await repository.update(officeLocationId, data);
}

async function getOfficeLocationDetails(organizationId, officeLocationId) {
  const location = await repository.findById(officeLocationId);
  if (!location || location.organization_id !== organizationId) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Office location not found.');
  }

  // Count active employees assigned to this location via policy
  const countRes = await query(`
    SELECT COUNT(DISTINCT e.employee_id)::int AS count
    FROM employees e
    JOIN attendance_policy_locations apl ON e.attendance_policy_id = apl.attendance_policy_id
    WHERE apl.office_location_id = $1 AND e.status = 'active'
  `, [officeLocationId]);

  // List policies linked to this office location
  const policiesRes = await query(`
    SELECT p.attendance_policy_id, p.name, p.policy_type, p.is_active
    FROM attendance_policies p
    JOIN attendance_policy_locations apl ON p.attendance_policy_id = apl.attendance_policy_id
    WHERE apl.office_location_id = $1 AND p.is_deleted = false
    ORDER BY p.name ASC
  `, [officeLocationId]);

  return {
    ...location,
    assignedEmployeesCount: countRes.rows[0]?.count || 0,
    assignedPolicies: policiesRes.rows || [],
  };
}

async function listOfficeLocations(organizationId) {
  return await repository.list(organizationId);
}

async function deleteOfficeLocation(organizationId, officeLocationId) {
  const existing = await repository.findById(officeLocationId);
  if (!existing || existing.organization_id !== organizationId) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Office location not found.');
  }

  return await repository.deleteLocation(officeLocationId);
}

async function toggleStatus(organizationId, officeLocationId, isActive) {
  const existing = await repository.findById(officeLocationId);
  if (!existing || existing.organization_id !== organizationId) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Office location not found.');
  }

  if (isActive) {
    const isDuplicate = await checkDuplicate(
      organizationId,
      existing.location_name,
      existing.latitude,
      existing.longitude,
      existing.place_id,
      officeLocationId
    );
    if (isDuplicate) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        'An office location with the same name or location already exists. Please edit the existing office instead.'
      );
    }
  }

  return await repository.setStatus(officeLocationId, isActive);
}

module.exports = {
  calculateDistance,
  createOfficeLocation,
  updateOfficeLocation,
  getOfficeLocationDetails,
  listOfficeLocations,
  deleteOfficeLocation,
  toggleStatus,
};
