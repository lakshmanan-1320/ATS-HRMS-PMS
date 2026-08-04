const router = require('express').Router();
const { requireSuperAdmin } = require('../../middlewares/auth.middleware');
const { handleGetCompany, handleUpdateCompany } = require('./company.controller');

router.use(requireSuperAdmin);

router.get('/', handleGetCompany);
router.put('/', handleUpdateCompany);

module.exports = router;
