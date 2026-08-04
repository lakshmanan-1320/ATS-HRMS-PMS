const router = require('express').Router();
const { requireClientAdmin } = require('../../middlewares/auth.middleware');
const c = require('./financialYear.controller');

router.use(requireClientAdmin);

const goalSettingsController = require('../goalSettings/goalSettings.controller');

router.get('/', c.handleList);
router.get('/:financialYearId', c.handleGetById);
router.post('/', c.handleCreate);
router.put('/:financialYearId', c.handleUpdate);
router.post('/:financialYearId/activate', c.handleActivate);
router.post('/:financialYearId/close', c.handleClose);
router.post('/:financialYearId/archive', c.handleArchive);

router.get('/:financialYearId/goal-settings', goalSettingsController.handleGet);
router.put('/:financialYearId/goal-settings', goalSettingsController.handleUpdate);

module.exports = { routes: router };
