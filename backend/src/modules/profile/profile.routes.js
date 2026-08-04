const router = require('express').Router();
const { requireAuth } = require('../../middlewares/auth.middleware');
const { handleGetMyProfile, handleGetEmployeeProfileById } = require('./profile.controller');

router.use(requireAuth);

router.get('/me', handleGetMyProfile);
router.get('/:employeeId', handleGetEmployeeProfileById);

module.exports = {
  routes: router
};
