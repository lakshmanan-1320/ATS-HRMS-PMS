function isValidCoordinate(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function punchSchema(body) {
  const { latitude, longitude, selfieUrl, deviceInfo, accuracy, locationSource } = body;

  if (latitude !== undefined && latitude !== null) {
    if (!isValidCoordinate(latitude, -90, 90)) {
      return { error: 'Valid latitude is required.' };
    }
  }

  if (longitude !== undefined && longitude !== null) {
    if (!isValidCoordinate(longitude, -180, 180)) {
      return { error: 'Valid longitude is required.' };
    }
  }

  if (selfieUrl !== undefined && selfieUrl !== null && typeof selfieUrl !== 'string') {
    return { error: 'Selfie URL must be a string.' };
  }

  if (deviceInfo !== undefined && deviceInfo !== null && (typeof deviceInfo !== 'object' || Array.isArray(deviceInfo))) {
    return { error: 'Device info must be an object.' };
  }

  return {
    value: {
      latitude: latitude !== undefined && latitude !== null ? latitude : null,
      longitude: longitude !== undefined && longitude !== null ? longitude : null,
      selfieUrl: selfieUrl || null,
      deviceInfo: deviceInfo || {},
      accuracy: accuracy !== undefined && accuracy !== null ? accuracy : null,
      locationSource: locationSource || 'UNKNOWN',
    },
  };
}

function validatePunch(req, res, next) {
  const { error, value } = punchSchema(req.body || {});
  if (error) {
    return res.status(400).json({ message: error });
  }

  const idempotencyKey = req.get('Idempotency-Key') || req.get('X-Idempotency-Key') || null;
  req.validatedBody = value;
  req.idempotencyKey = idempotencyKey ? idempotencyKey.trim().slice(0, 120) : null;
  next();
}

function policySchema(body) {
  const { name, description, policy_type, enable_location_validation, enable_shift_validation, is_active, office_location_ids, enable_late_arrival_lop, late_arrivals_threshold, lop_days_per_threshold } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return { error: 'Policy name is required.' };
  }

  const VALID_TYPES = ['OFFICE', 'REMOTE', 'HYBRID'];
  if (!policy_type || !VALID_TYPES.includes(policy_type)) {
    return { error: 'Policy type must be OFFICE, REMOTE, or HYBRID.' };
  }

  if (office_location_ids !== undefined) {
    if (!Array.isArray(office_location_ids)) {
      return { error: 'Office location IDs must be an array.' };
    }
    const uuidRegex = /^[0-9a-fA-F-]{36}$/;
    for (const id of office_location_ids) {
      if (!uuidRegex.test(id)) {
        return { error: `Invalid office location ID: ${id}` };
      }
    }
  }

  return {
    value: {
      name: name.trim(),
      description: description ? description.trim() : null,
      policy_type,
      enable_location_validation: !!enable_location_validation,
      enable_shift_validation: !!enable_shift_validation,
      is_active: is_active !== undefined ? !!is_active : true,
      office_location_ids: office_location_ids || [],
      enable_late_arrival_lop: enable_late_arrival_lop !== undefined ? !!enable_late_arrival_lop : false,
      late_arrivals_threshold: late_arrivals_threshold !== undefined ? parseInt(late_arrivals_threshold) || 0 : 0,
      lop_days_per_threshold: lop_days_per_threshold !== undefined ? parseFloat(lop_days_per_threshold) || 0.00 : 0.00,
    },
  };
}

function validatePolicy(req, res, next) {
  const { error, value } = policySchema(req.body || {});
  if (error) {
    return res.status(400).json({ message: error });
  }
  req.validatedBody = value;
  next();
}

function assignPolicySchema(body) {
  const { department_id, employee_ids, effective_from } = body;

  const uuidRegex = /^[0-9a-fA-F-]{36}$/;
  
  if (department_id && !uuidRegex.test(department_id)) {
    return { error: 'Invalid department ID.' };
  }

  if (employee_ids !== undefined) {
    if (!Array.isArray(employee_ids)) {
      return { error: 'Employee IDs must be an array.' };
    }
    for (const id of employee_ids) {
      if (!uuidRegex.test(id)) {
        return { error: `Invalid employee ID: ${id}` };
      }
    }
  }

  if (!department_id && (!employee_ids || employee_ids.length === 0)) {
    return { error: 'Either department ID or employee IDs are required for assignment.' };
  }

  if (effective_from && !/^\d{4}-\d{2}-\d{2}$/.test(effective_from)) {
    return { error: 'Effective from date must be in YYYY-MM-DD format.' };
  }

  return {
    value: {
      department_id: department_id || null,
      employee_ids: employee_ids || [],
      effective_from: effective_from || new Date().toISOString().split('T')[0],
    },
  };
}

function validateAssignPolicy(req, res, next) {
  const { error, value } = assignPolicySchema(req.body || {});
  if (error) {
    return res.status(400).json({ message: error });
  }
  req.validatedBody = value;
  next();
}

module.exports = {
  punchSchema,
  validatePunch,
  validatePolicy,
  validateAssignPolicy,
};
