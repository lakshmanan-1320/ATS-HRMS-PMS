const router = require('express').Router();
const { requireEmployee } = require('../../middlewares/auth.middleware');
const { requireModule } = require('../../middlewares/module.middleware');
const { handleGetMe, handleGetMyTeam, handleGetMyGoals } = require('./employeePortal.controller');

router.use(requireEmployee);

router.get('/me', handleGetMe);
router.get('/my-team', handleGetMyTeam);
router.get('/my-goals', requireModule('goals'), handleGetMyGoals);

module.exports = router;
