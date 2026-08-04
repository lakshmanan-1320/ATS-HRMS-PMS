const hierarchyLevelService = require('./hierarchyLevel.service');
const { STATUS_CODES } = require('../../constants/statusCodes');

async function handleGetHierarchyLevels(req, res, next) {
  try {
    const list = await hierarchyLevelService.listHierarchyLevels(req.user.organizationId);
    res.status(STATUS_CODES.OK).json(list);
  } catch (err) {
    next(err);
  }
}

async function handlePatchHierarchyLevelsReorder(req, res, next) {
  const { levels } = req.body;
  try {
    await hierarchyLevelService.reorderHierarchyLevels(req.user.organizationId, levels);
    res.status(STATUS_CODES.OK).json({ message: 'Reordered successfully.' });
  } catch (err) {
    next(err);
  }
}

async function handleCreateHierarchyLevel(req, res, next) {
  try {
    const data = await hierarchyLevelService.addHierarchyLevel(req.user.organizationId, req.body);
    res.status(STATUS_CODES.CREATED).json({ message: 'Hierarchy level created.', data });
  } catch (err) {
    next(err);
  }
}

async function handleUpdateHierarchyLevel(req, res, next) {
  const { id } = req.params;
  try {
    const data = await hierarchyLevelService.editHierarchyLevel(req.user.organizationId, id, req.body);
    res.status(STATUS_CODES.OK).json({ message: 'Updated successfully.', data });
  } catch (err) {
    next(err);
  }
}

async function handleDeleteHierarchyLevel(req, res, next) {
  const { id } = req.params;
  try {
    await hierarchyLevelService.removeHierarchyLevel(req.user.organizationId, id);
    res.status(STATUS_CODES.OK).json({ message: 'Hierarchy level deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleGetHierarchyLevels,
  handlePatchHierarchyLevelsReorder,
  handleCreateHierarchyLevel,
  handleUpdateHierarchyLevel,
  handleDeleteHierarchyLevel,
};
