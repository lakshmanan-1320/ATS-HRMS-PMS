const router = require('express').Router();
const { requireSuperAdmin } = require('../../middlewares/auth.middleware');
const { handleGetModules, handleToggleModule, handleGetAllClientsModules } = require('./clientModule.controller');

router.use(requireSuperAdmin);

router.get('/', handleGetAllClientsModules);
router.get('/:clientId', handleGetModules);
router.patch('/:clientId/:moduleKey', handleToggleModule);

module.exports = router;
