const router = require('express').Router();
const controller = require('./nineBox.controller');

router.post('/generate', controller.generateGrid);
router.get('/grid/:cycleId', controller.getGrid);
router.put('/employee/:employeeId/potential', controller.updatePotential);
module.exports = router;