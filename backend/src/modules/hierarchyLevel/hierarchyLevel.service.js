const hierarchyLevelRepository = require('./hierarchyLevel.repository');
const { mapHierarchyLevel } = require('./hierarchyLevel.mapper');
const { withTransaction } = require('../../config/db');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');

async function listHierarchyLevels(organizationId) {
  const rows = await hierarchyLevelRepository.getHierarchyLevels(organizationId);
  return rows.map(mapHierarchyLevel);
}

async function reorderHierarchyLevels(organizationId, levels) {
  if (!Array.isArray(levels) || !levels.length) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Levels array is required.');
  }

  await withTransaction(async (client) => {
    for (const { hierarchy_level_id, sort_order } of levels) {
      await client.query(
        'UPDATE hierarchy_levels SET sort_order=$1, updated_at=NOW() WHERE hierarchy_level_id=$2 AND organization_id=$3',
        [sort_order, hierarchy_level_id, organizationId]
      );
    }
  });
}

async function addHierarchyLevel(organizationId, data) {
  const { level_code, designation, description } = data;
  if (!level_code || !level_code.trim()) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Level code is required.');
  }
  if (!designation || !designation.trim()) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Designation is required.');
  }

  const exists = await hierarchyLevelRepository.getHierarchyLevelByCode(organizationId, level_code.trim());
  if (exists) {
    throw new ApiError(STATUS_CODES.CONFLICT, 'A level with this code already exists.');
  }

  const max = await hierarchyLevelRepository.getMaxSortOrder(organizationId);
  const nextOrder = max + 1;

  const row = await hierarchyLevelRepository.createHierarchyLevel(organizationId, {
    sort_order: nextOrder,
    level_code: level_code.trim(),
    designation: designation.trim(),
    description: description || null,
  });

  return mapHierarchyLevel(row);
}

async function editHierarchyLevel(organizationId, id, data) {
  const { level_code, designation, description } = data;
  if (!level_code || !level_code.trim()) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Level code is required.');
  }
  if (!designation || !designation.trim()) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Designation is required.');
  }

  const current = await hierarchyLevelRepository.getHierarchyLevelById(organizationId, id);
  if (!current) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Hierarchy level not found.');
  }

  const exists = await hierarchyLevelRepository.getDuplicateHierarchyLevelCode(organizationId, level_code.trim(), id);
  if (exists) {
    throw new ApiError(STATUS_CODES.CONFLICT, 'A level with this code already exists.');
  }

  const row = await withTransaction(async (client) => {
    // 1. Update hierarchy level
    const updated = await hierarchyLevelRepository.updateHierarchyLevel(organizationId, id, {
      level_code: level_code.trim(),
      designation: designation.trim(),
      description: description || null,
    }, client);

    // 2. Propagate to users table for all employees associated with this hierarchy level
    const empsRes = await client.query(
      'SELECT employee_id, designation FROM employees WHERE organization_id = $1 AND hierarchy_level_id = $2',
      [organizationId, id]
    );

    for (const emp of empsRes.rows) {
      let role = 'employee';
      const checkDesignation = emp.designation || '';
      const levelDesignation = designation.trim();
      const lowerDes = checkDesignation.toLowerCase();
      const lowerLvlDes = levelDesignation.toLowerCase();
      const lowerCode = level_code.trim().toLowerCase();

      if (lowerDes.includes('hr') || lowerDes.includes('human resource') || lowerLvlDes.includes('hr') || /\bhr\b/i.test(level_code.trim())) {
        role = 'hr';
      } else if (
        lowerDes.includes('manager') ||
        lowerDes.includes('director') ||
        lowerDes.includes('ceo') ||
        lowerDes.includes('vp') ||
        lowerDes.includes('chief') ||
        lowerDes.includes('lead') ||
        lowerDes.includes('head') ||
        lowerLvlDes.includes('manager') ||
        lowerLvlDes.includes('director') ||
        lowerLvlDes.includes('ceo') ||
        lowerLvlDes.includes('vp') ||
        lowerLvlDes.includes('chief') ||
        lowerLvlDes.includes('lead') ||
        lowerLvlDes.includes('head') ||
        /\b(l1|l2|l3)\b/i.test(level_code.trim()) ||
        lowerCode.includes('manager') ||
        lowerCode.includes('director') ||
        lowerCode.includes('ceo') ||
        lowerCode.includes('vp') ||
        lowerCode.includes('lead')
      ) {
        role = 'manager';
      }

      await client.query(
        'UPDATE users SET role = $1 WHERE organization_id = $2 AND employee_id = $3',
        [role, organizationId, emp.employee_id]
      );
    }

    return updated;
  });

  return mapHierarchyLevel(row);
}

async function removeHierarchyLevel(organizationId, id) {
  const row = await hierarchyLevelRepository.deleteHierarchyLevel(organizationId, id);
  if (!row) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Hierarchy level not found.');
  }
  return true;
}

module.exports = {
  listHierarchyLevels,
  reorderHierarchyLevels,
  addHierarchyLevel,
  editHierarchyLevel,
  removeHierarchyLevel,
};
