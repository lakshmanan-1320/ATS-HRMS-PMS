const holidayRepository = require('./holiday.repository');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');
const env = require('../../config/env');
const { HOLIDAY_TYPES } = require('./holiday.constants');
const { query } = require('../../config/db');

function getTodayLocalDate(timeZone = env.timezone || 'Asia/Kolkata') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatDateString(dateVal) {
  if (dateVal instanceof Date) {
    const y = dateVal.getFullYear();
    const m = String(dateVal.getMonth() + 1).padStart(2, '0');
    const d = String(dateVal.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(dateVal).split('T')[0];
}

function isPastHoliday(holidayDateStr) {
  const todayStr = getTodayLocalDate();
  const formattedHolidayDate = formatDateString(holidayDateStr);
  return formattedHolidayDate < todayStr;
}

// --- Concrete Holidays (Overrides / One-off custom holidays) ---

async function createHoliday(organizationId, data) {
  if (!data.holiday_name?.trim()) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Holiday name is required.');
  }
  if (!data.holiday_date) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Holiday date is required.');
  }
  if (!data.holiday_type || !Object.values(HOLIDAY_TYPES).includes(data.holiday_type)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Invalid holiday type. Must be PUBLIC or OPTIONAL.');
  }

  const formattedDate = formatDateString(data.holiday_date);

  const existing = await holidayRepository.findByDate(organizationId, formattedDate);
  if (existing) {
    throw new ApiError(STATUS_CODES.CONFLICT, `A holiday already exists on date ${formattedDate}.`);
  }

  return await holidayRepository.create(organizationId, {
    ...data,
    holiday_date: formattedDate
  });
}

async function updateHoliday(organizationId, id, data) {
  const existing = await holidayRepository.findById(organizationId, id);
  if (!existing) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Holiday not found.');
  }

  if (isPastHoliday(existing.holiday_date)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot modify past holidays.');
  }

  const updateData = {};
  if (data.holiday_name !== undefined) {
    if (!data.holiday_name?.trim()) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Holiday name cannot be empty.');
    }
    updateData.holiday_name = data.holiday_name;
  }

  if (data.holiday_type !== undefined) {
    if (!Object.values(HOLIDAY_TYPES).includes(data.holiday_type)) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Invalid holiday type. Must be PUBLIC or OPTIONAL.');
    }
    updateData.holiday_type = data.holiday_type;
  }

  if (data.description !== undefined) {
    updateData.description = data.description;
  }

  if (data.holiday_date !== undefined) {
    const newFormattedDate = formatDateString(data.holiday_date);
    if (newFormattedDate !== formatDateString(existing.holiday_date)) {
      if (isPastHoliday(newFormattedDate)) {
        throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot set a holiday date to a past date.');
      }
      const duplicate = await holidayRepository.findByDate(organizationId, newFormattedDate);
      if (duplicate && duplicate.holiday_id !== id) {
        throw new ApiError(STATUS_CODES.CONFLICT, `A holiday already exists on date ${newFormattedDate}.`);
      }
      updateData.holiday_date = newFormattedDate;
    }
  }

  return await holidayRepository.update(organizationId, id, updateData);
}

async function deleteHoliday(organizationId, id) {
  const existing = await holidayRepository.findById(organizationId, id);
  if (!existing) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Holiday not found.');
  }

  if (isPastHoliday(existing.holiday_date)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot delete past holidays.');
  }

  return await holidayRepository.softDelete(organizationId, id);
}

async function toggleHolidayStatus(organizationId, id, isActive) {
  const existing = await holidayRepository.findById(organizationId, id);
  if (!existing) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Holiday not found.');
  }

  if (isPastHoliday(existing.holiday_date)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot toggle status of past holidays.');
  }

  if (isActive === true) {
    const duplicate = await holidayRepository.findByDate(organizationId, formatDateString(existing.holiday_date));
    if (duplicate && duplicate.holiday_id !== id) {
      throw new ApiError(STATUS_CODES.CONFLICT, `Cannot activate. Another holiday is already active on date ${formatDateString(existing.holiday_date)}.`);
    }
  }

  return await holidayRepository.toggleStatus(organizationId, id, isActive);
}

async function getHolidayById(organizationId, id) {
  const holiday = await holidayRepository.findById(organizationId, id);
  if (!holiday) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Holiday not found.');
  }
  return holiday;
}

// --- Recurring & Global Holidays ---

async function getGlobalTemplates(organizationId) {
  const globals = await holidayRepository.getGlobalTemplates();
  const optOutIds = await holidayRepository.getOrgOptOutIds(organizationId);
  return globals.map(g => ({
    ...g,
    is_opted_out: optOutIds.includes(g.global_holiday_id)
  }));
}

async function toggleGlobalHolidayOptOut(organizationId, globalHolidayId, isOptedOut) {
  await holidayRepository.saveOrgOptOut(organizationId, globalHolidayId, isOptedOut);
  return { success: true };
}

async function getCustomRecurring(organizationId) {
  return await holidayRepository.getCustomRecurring(organizationId);
}

async function createCustomRecurring(organizationId, data) {
  if (!data.holiday_name?.trim()) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Holiday name is required.');
  }
  if (!data.holiday_type || !Object.values(HOLIDAY_TYPES).includes(data.holiday_type)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Invalid holiday type. Must be PUBLIC or OPTIONAL.');
  }
  if (!data.recurrence_month || data.recurrence_month < 1 || data.recurrence_month > 12) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'recurrence_month must be between 1 and 12.');
  }
  if (!data.recurrence_day || data.recurrence_day < 1 || data.recurrence_day > 31) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'recurrence_day must be between 1 and 31.');
  }

  return await holidayRepository.createCustomRecurring(organizationId, data);
}

async function updateCustomRecurring(organizationId, recurringHolidayId, data) {
  const result = await holidayRepository.updateCustomRecurring(recurringHolidayId, data);
  if (!result) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Recurring holiday template not found.');
  }
  return result;
}

async function deleteCustomRecurring(organizationId, recurringHolidayId) {
  const result = await holidayRepository.deleteCustomRecurring(recurringHolidayId);
  if (!result) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Recurring holiday template not found.');
  }
  return result;
}

async function resolveHolidaysForPeriod(organizationId, yearLabel, typeFilter = null) {
  const settingsRes = await query(
    `SELECT leave_year_type, leave_year_start_month FROM organization_leave_settings WHERE id = 1 LIMIT 1`
  );
  const settings = settingsRes.rows[0] || { leave_year_type: 'financial_year', leave_year_start_month: 4 };

  const startMonth = settings.leave_year_start_month || 4;
  const yearInt = parseInt(yearLabel, 10);

  let startDate, endDate;
  if (settings.leave_year_type === 'financial_year') {
    const startMonthStr = String(startMonth).padStart(2, '0');
    startDate = `${yearInt}-${startMonthStr}-01`;
    const endMonth = startMonth === 1 ? 12 : startMonth - 1;
    const endMonthStr = String(endMonth).padStart(2, '0');
    const lastDay = new Date(yearInt + 1, endMonth, 0).getDate();
    endDate = `${yearInt + 1}-${endMonthStr}-${lastDay}`;
  } else {
    startDate = `${yearInt}-01-01`;
    endDate = `${yearInt}-12-31`;
  }

  const allConcreteRes = await query(
    `SELECT * FROM holidays 
     WHERE organization_id = $1 AND holiday_date BETWEEN $2 AND $3`,
    [organizationId, startDate, endDate]
  );
  const allConcrete = allConcreteRes.rows;

  const overridesMap = new Map();
  const deletedDates = new Set();

  for (const h of allConcrete) {
    const dateStr = formatDateString(h.holiday_date);
    if (h.is_deleted || !h.is_active) {
      deletedDates.add(dateStr);
    } else {
      overridesMap.set(dateStr, {
        holiday_id: h.holiday_id,
        holiday_name: h.holiday_name,
        holiday_date: dateStr,
        holiday_type: h.holiday_type,
        description: h.description,
        is_override: true,
      });
    }
  }

  const globalTemplates = await holidayRepository.getGlobalTemplates();
  const optOutIds = await holidayRepository.getOrgOptOutIds(organizationId);
  const activeGlobals = globalTemplates.filter(gt => !optOutIds.includes(gt.global_holiday_id));

  const customRecurring = await holidayRepository.getCustomRecurring(organizationId);

  const calculateConcreteDate = (month, day) => {
    let dateStr;
    if (settings.leave_year_type === 'financial_year') {
      if (month >= startMonth) {
        dateStr = `${yearInt}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      } else {
        dateStr = `${yearInt + 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    } else {
      dateStr = `${yearInt}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return dateStr;
  };

  const resolved = [];

  for (const gt of activeGlobals) {
    const dateStr = calculateConcreteDate(gt.recurrence_month, gt.recurrence_day);
    if (deletedDates.has(dateStr)) continue;
    if (overridesMap.has(dateStr)) continue;
    resolved.push({
      holiday_id: `global-${gt.global_holiday_id}`,
      holiday_name: gt.holiday_name,
      holiday_date: dateStr,
      holiday_type: gt.holiday_type,
      description: gt.description,
      is_recurring: true,
    });
  }

  for (const cr of customRecurring) {
    const dateStr = calculateConcreteDate(cr.recurrence_month, cr.recurrence_day);
    if (deletedDates.has(dateStr)) continue;
    if (overridesMap.has(dateStr)) continue;
    resolved.push({
      holiday_id: `recurring-${cr.recurring_holiday_id}`,
      holiday_name: cr.holiday_name,
      holiday_date: dateStr,
      holiday_type: cr.holiday_type,
      description: cr.description,
      is_recurring: true,
    });
  }

  for (const override of overridesMap.values()) {
    resolved.push(override);
  }

  let filtered = resolved;
  if (typeFilter) {
    filtered = resolved.filter(h => h.holiday_type === typeFilter);
  }

  filtered.sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
  return filtered;
}

async function isHoliday(organizationId, dateStr) {
  const dateObj = new Date(dateStr);
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();

  const settingsRes = await query(
    `SELECT leave_year_type, leave_year_start_month FROM organization_leave_settings WHERE id = 1 LIMIT 1`
  );
  const settings = settingsRes.rows[0] || { leave_year_type: 'financial_year', leave_year_start_month: 4 };

  const startMonth = settings.leave_year_start_month || 4;
  let yearLabel = year;
  if (settings.leave_year_type === 'financial_year') {
    if (month < startMonth) {
      yearLabel = year - 1;
    }
  }

  const holidays = await resolveHolidaysForPeriod(organizationId, yearLabel);
  return holidays.find(h => h.holiday_date === dateStr) || null;
}

module.exports = {
  createHoliday,
  updateHoliday,
  deleteHoliday,
  toggleHolidayStatus,
  getHolidayById,
  getGlobalTemplates,
  toggleGlobalHolidayOptOut,
  getCustomRecurring,
  createCustomRecurring,
  updateCustomRecurring,
  deleteCustomRecurring,
  resolveHolidaysForPeriod,
  isHoliday,
  getTodayLocalDate,
  formatDateString,
};
