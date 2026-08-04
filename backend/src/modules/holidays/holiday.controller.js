const holidayService = require('./holiday.service');
const { STATUS_CODES } = require('../../constants/statusCodes');
const ApiError = require('../../utils/apiError');

async function handleCreateHoliday(req, res, next) {
  try {
    const creatorId = req.user.id;
    const organizationId = req.user.organizationId;
    const holiday = await holidayService.createHoliday(organizationId, {
      ...req.body,
      created_by_admin_user_id: creatorId
    });
    res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: 'Holiday created successfully',
      data: holiday
    });
  } catch (err) {
    next(err);
  }
}

async function handleUpdateHoliday(req, res, next) {
  try {
    const { holiday_id } = req.params;
    const organizationId = req.user.organizationId;
    const holiday = await holidayService.updateHoliday(organizationId, holiday_id, req.body);
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Holiday updated successfully',
      data: holiday
    });
  } catch (err) {
    next(err);
  }
}

async function handleDeleteHoliday(req, res, next) {
  try {
    const { holiday_id } = req.params;
    const organizationId = req.user.organizationId;
    await holidayService.deleteHoliday(organizationId, holiday_id);
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Holiday deleted successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function handleToggleHolidayStatus(req, res, next) {
  try {
    const { holiday_id } = req.params;
    const { is_active } = req.body;
    const organizationId = req.user.organizationId;
    if (is_active === undefined) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'is_active is required.');
    }
    const holiday = await holidayService.toggleHolidayStatus(organizationId, holiday_id, is_active);
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: `Holiday status updated to ${is_active ? 'active' : 'inactive'}`,
      data: holiday
    });
  } catch (err) {
    next(err);
  }
}

async function handleGetHolidayById(req, res, next) {
  try {
    const { holiday_id } = req.params;
    const organizationId = req.user.organizationId;
    const holiday = await holidayService.getHolidayById(organizationId, holiday_id);
    res.status(STATUS_CODES.OK).json({
      success: true,
      data: holiday
    });
  } catch (err) {
    next(err);
  }
}

async function handleGetAllHolidays(req, res, next) {
  try {
    const organizationId = req.user.organizationId;
    const year = req.query.year || new Date().getFullYear();
    const type = req.query.type || null;
    const holidays = await holidayService.resolveHolidaysForPeriod(organizationId, year, type);
    res.status(STATUS_CODES.OK).json({
      success: true,
      data: holidays
    });
  } catch (err) {
    next(err);
  }
}

async function handleGetUpcomingHolidays(req, res, next) {
  try {
    // Return upcoming active resolved holidays for the current + next year period
    const organizationId = req.user.organizationId;
    const currentYear = new Date().getFullYear();
    const currentList = await holidayService.resolveHolidaysForPeriod(organizationId, currentYear);
    const nextList = await holidayService.resolveHolidaysForPeriod(organizationId, currentYear + 1);
    
    const combined = [...currentList, ...nextList];
    const todayStr = holidayService.getTodayLocalDate();
    
    const upcoming = combined.filter(h => h.holiday_date >= todayStr);
    
    res.status(STATUS_CODES.OK).json({
      success: true,
      data: upcoming
    });
  } catch (err) {
    next(err);
  }
}

async function handleGetCalendarHolidays(req, res, next) {
  try {
    const organizationId = req.user.organizationId;
    const year = req.query.year || new Date().getFullYear();
    const type = req.query.type || null;
    const holidays = await holidayService.resolveHolidaysForPeriod(organizationId, year, type);
    res.status(STATUS_CODES.OK).json({
      success: true,
      data: holidays
    });
  } catch (err) {
    next(err);
  }
}

// --- Recurring & Global Templates Controllers ---

async function handleGetGlobalTemplates(req, res, next) {
  try {
    const organizationId = req.user.organizationId;
    const data = await holidayService.getGlobalTemplates(organizationId);
    res.status(STATUS_CODES.OK).json({ success: true, data });
  } catch (err) { next(err); }
}

async function handleToggleGlobalHolidayOptOut(req, res, next) {
  try {
    const organizationId = req.user.organizationId;
    const { global_holiday_id, is_opted_out } = req.body;
    if (!global_holiday_id) throw new ApiError(STATUS_CODES.BAD_REQUEST, 'global_holiday_id is required.');
    if (is_opted_out === undefined) throw new ApiError(STATUS_CODES.BAD_REQUEST, 'is_opted_out is required.');
    
    const result = await holidayService.toggleGlobalHolidayOptOut(organizationId, global_holiday_id, is_opted_out);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) { next(err); }
}

async function handleGetCustomRecurring(req, res, next) {
  try {
    const organizationId = req.user.organizationId;
    const data = await holidayService.getCustomRecurring(organizationId);
    res.status(STATUS_CODES.OK).json({ success: true, data });
  } catch (err) { next(err); }
}

async function handleCreateCustomRecurring(req, res, next) {
  try {
    const organizationId = req.user.organizationId;
    const data = await holidayService.createCustomRecurring(organizationId, req.body);
    res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: 'Recurring holiday template created successfully.',
      data
    });
  } catch (err) { next(err); }
}

async function handleUpdateCustomRecurring(req, res, next) {
  try {
    const organizationId = req.user.organizationId;
    const { recurring_holiday_id } = req.params;
    const data = await holidayService.updateCustomRecurring(organizationId, recurring_holiday_id, req.body);
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Recurring holiday template updated successfully.',
      data
    });
  } catch (err) { next(err); }
}

async function handleDeleteCustomRecurring(req, res, next) {
  try {
    const organizationId = req.user.organizationId;
    const { recurring_holiday_id } = req.params;
    await holidayService.deleteCustomRecurring(organizationId, recurring_holiday_id);
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Recurring holiday template deleted successfully.'
    });
  } catch (err) { next(err); }
}

module.exports = {
  handleCreateHoliday,
  handleUpdateHoliday,
  handleDeleteHoliday,
  handleToggleHolidayStatus,
  handleGetHolidayById,
  handleGetAllHolidays,
  handleGetUpcomingHolidays,
  handleGetCalendarHolidays,
  handleGetGlobalTemplates,
  handleToggleGlobalHolidayOptOut,
  handleGetCustomRecurring,
  handleCreateCustomRecurring,
  handleUpdateCustomRecurring,
  handleDeleteCustomRecurring,
};
