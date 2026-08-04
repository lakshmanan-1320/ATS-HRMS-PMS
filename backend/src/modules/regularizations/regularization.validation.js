const { REGULARIZATION_TYPES } = require('./regularization.constants');

function createRegularizationSchema(body) {
  const {
    attendance_date,
    regularization_type,
    requested_checkin_time,
    requested_checkout_time,
    reason
  } = body;

  if (!attendance_date || !/^\d{4}-\d{2}-\d{2}$/.test(attendance_date)) {
    return { error: 'Valid attendance date (YYYY-MM-DD) is required.' };
  }

  if (!regularization_type || !Object.values(REGULARIZATION_TYPES).includes(regularization_type)) {
    return { error: 'Invalid or missing regularization type.' };
  }

  if (!reason || !reason.trim()) {
    return { error: 'Reason for regularization is required.' };
  }

  // Type-specific timing requirements
  if (regularization_type === REGULARIZATION_TYPES.MISSED_CHECKIN || regularization_type === REGULARIZATION_TYPES.WRONG_PUNCH_TIME) {
    if (!requested_checkin_time) {
      return { error: 'Requested check-in time is required for this request type.' };
    }
  }

  if (regularization_type === REGULARIZATION_TYPES.MISSED_CHECKOUT || regularization_type === REGULARIZATION_TYPES.WRONG_PUNCH_TIME) {
    if (!requested_checkout_time) {
      return { error: 'Requested check-out time is required for this request type.' };
    }
  }

  if (regularization_type === REGULARIZATION_TYPES.MARK_AS_PRESENT) {
    if (!requested_checkin_time || !requested_checkout_time) {
      return { error: 'Both check-in and check-out times are required to mark as present.' };
    }
  }

  return { value: body };
}

function reviewRegularizationSchema(body) {
  const { rejection_reason, action } = body; // action is 'approve' or 'reject'
  
  if (action === 'reject') {
    if (!rejection_reason || !rejection_reason.trim()) {
      return { error: 'Rejection reason is required when rejecting a request.' };
    }
  }

  return { value: body };
}

function updateSettingsSchema(body) {
  const { regularization_monthly_limit, regularization_cutoff_day, allow_holiday_regularization } = body;

  if (regularization_monthly_limit !== undefined) {
    const val = parseInt(regularization_monthly_limit);
    if (isNaN(val) || val < 0) {
      return { error: 'Monthly limit must be a non-negative number.' };
    }
  }

  if (regularization_cutoff_day !== undefined) {
    const val = parseInt(regularization_cutoff_day);
    if (isNaN(val) || val < 1 || val > 28) {
      return { error: 'Cutoff day must be between 1 and 28.' };
    }
  }

  return { value: body };
}

module.exports = {
  createRegularizationSchema,
  reviewRegularizationSchema,
  updateSettingsSchema
};
