const express = require('express');
const holidayController = require('./holiday.controller');
const { requireAuth, requireClientAdmin, requireEmployee } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Enforce auth on all holiday endpoints
router.use(requireAuth);

// -------------------------------------------------------------
// EMPLOYEE APIs (Accessible to all authenticated employees)
// -------------------------------------------------------------
router.get('/upcoming', requireEmployee, holidayController.handleGetUpcomingHolidays);
router.get('/my-calendar', requireEmployee, holidayController.handleGetCalendarHolidays);

// -------------------------------------------------------------
// CLIENT_ADMIN APIs (Holiday Configuration CRUD & Recurring Templates)
// -------------------------------------------------------------

// Global Templates Opt-Out
router.get('/global', requireClientAdmin, holidayController.handleGetGlobalTemplates);
router.post('/global/opt-out', requireClientAdmin, holidayController.handleToggleGlobalHolidayOptOut);

// Custom Recurring Templates
router.get('/recurring', requireClientAdmin, holidayController.handleGetCustomRecurring);
router.post('/recurring', requireClientAdmin, holidayController.handleCreateCustomRecurring);
router.put('/recurring/:recurring_holiday_id', requireClientAdmin, holidayController.handleUpdateCustomRecurring);
router.delete('/recurring/:recurring_holiday_id', requireClientAdmin, holidayController.handleDeleteCustomRecurring);

// Concrete Overrides & One-offs
router.post('/', requireClientAdmin, holidayController.handleCreateHoliday);
router.get('/', requireClientAdmin, holidayController.handleGetAllHolidays);
router.get('/:holiday_id', requireClientAdmin, holidayController.handleGetHolidayById);
router.put('/:holiday_id', requireClientAdmin, holidayController.handleUpdateHoliday);
router.patch('/:holiday_id/status', requireClientAdmin, holidayController.handleToggleHolidayStatus);
router.delete('/:holiday_id', requireClientAdmin, holidayController.handleDeleteHoliday);

module.exports = router;
