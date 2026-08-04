const service = require('./goalCategory.service');
const { STATUS_CODES } = require('../../constants/statusCodes');
const { logAudit } = require('../../utils/auditLog');

async function handleList(req, res, next) {
  try {
    const data = await service.listCategories(req.user.organizationId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleListActive(req, res, next) {
  try {
    const data = await service.listActiveCategories(req.user.organizationId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleCreate(req, res, next) {
  try {
    const data = await service.addCategory(req.user.organizationId, req.body);

    logAudit({
      organizationId: req.user.organizationId,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'goal_category_created',
      target: `Category ${data.category_id}`,
      entityId: data.category_id,
      module: 'goals',
      metadata: { name: data.name },
      ip: req.ip,
    });

    res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: 'Goal category created successfully.',
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function handleUpdate(req, res, next) {
  try {
    const { id } = req.params;
    const data = await service.editCategory(req.user.organizationId, id, req.body);

    logAudit({
      organizationId: req.user.organizationId,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'goal_category_updated',
      target: `Category ${id}`,
      entityId: id,
      module: 'goals',
      metadata: { name: data.name, is_active: data.is_active },
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Goal category updated successfully.',
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function handleDelete(req, res, next) {
  try {
    const { id } = req.params;
    await service.removeCategory(req.user.organizationId, id);

    logAudit({
      organizationId: req.user.organizationId,
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'goal_category_deleted',
      target: `Category ${id}`,
      entityId: id,
      module: 'goals',
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Goal category deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleList,
  handleListActive,
  handleCreate,
  handleUpdate,
  handleDelete,
};
