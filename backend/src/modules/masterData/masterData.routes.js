const express = require('express');
const router = express.Router();
const controller = require('./masterData.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');

router.get('/', requireAuth, controller.handleGetMasterData);

module.exports = router;
