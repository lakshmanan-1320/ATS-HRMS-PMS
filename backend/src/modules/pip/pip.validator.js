const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');

function validateSettings(req, res, next) {
  const {
    enable_pip,
    allow_manager_initiation,
    require_hr_approval,
    allow_manual_creation,
    enable_monitoring,
    allow_extension,
    max_extension_count,
    default_duration_days,
    default_checkin_frequency,
    reminder_frequency_days,
    enable_recommendation_engine,
    close_threshold_pct,
    extend_threshold_pct,
    escalate_threshold_pct,
    monitoring_duration_days,
    monitoring_checkin_frequency,
    monitoring_max_extension_count,
    monitoring_close_threshold_pct,
    monitoring_extend_threshold_pct,
    monitoring_convert_threshold_pct
  } = req.body;

  if (typeof enable_pip !== 'boolean') return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'enable_pip must be a boolean.'));
  if (typeof allow_manager_initiation !== 'boolean') return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'allow_manager_initiation must be a boolean.'));
  if (typeof require_hr_approval !== 'boolean') return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'require_hr_approval must be a boolean.'));
  if (typeof allow_manual_creation !== 'boolean') return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'allow_manual_creation must be a boolean.'));
  if (typeof enable_monitoring !== 'boolean') return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'enable_monitoring must be a boolean.'));
  if (typeof allow_extension !== 'boolean') return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'allow_extension must be a boolean.'));

  if (typeof max_extension_count !== 'number' || max_extension_count < 0) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'max_extension_count must be a positive number.'));
  }
  if (typeof default_duration_days !== 'number' || default_duration_days <= 0) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'default_duration_days must be greater than 0.'));
  }
  if (!['WEEKLY', 'BIWEEKLY', 'MONTHLY'].includes(default_checkin_frequency)) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'default_checkin_frequency must be WEEKLY, BIWEEKLY, or MONTHLY.'));
  }
  if (typeof reminder_frequency_days !== 'number' || reminder_frequency_days <= 0) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'reminder_frequency_days must be greater than 0.'));
  }

  if (typeof enable_recommendation_engine !== 'boolean') return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'enable_recommendation_engine must be a boolean.'));

  const closePct = parseFloat(close_threshold_pct);
  const extendPct = parseFloat(extend_threshold_pct);
  const escalatePct = parseFloat(escalate_threshold_pct);

  if (isNaN(closePct) || closePct < 0 || closePct > 100) return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'close_threshold_pct must be between 0 and 100.'));
  if (isNaN(extendPct) || extendPct < 0 || extendPct > 100) return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'extend_threshold_pct must be between 0 and 100.'));
  if (isNaN(escalatePct) || escalatePct < 0 || escalatePct > 100) return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'escalate_threshold_pct must be between 0 and 100.'));

  if (monitoring_duration_days !== undefined) {
    if (typeof monitoring_duration_days !== 'number' || monitoring_duration_days <= 0) {
      return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'monitoring_duration_days must be greater than 0.'));
    }
  }
  if (monitoring_checkin_frequency !== undefined) {
    if (!['WEEKLY', 'BIWEEKLY', 'MONTHLY'].includes(monitoring_checkin_frequency)) {
      return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'monitoring_checkin_frequency must be WEEKLY, BIWEEKLY, or MONTHLY.'));
    }
  }
  if (monitoring_max_extension_count !== undefined) {
    if (typeof monitoring_max_extension_count !== 'number' || monitoring_max_extension_count < 0) {
      return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'monitoring_max_extension_count must be a positive number.'));
    }
  }

  const monClose = parseFloat(monitoring_close_threshold_pct);
  const monExtend = parseFloat(monitoring_extend_threshold_pct);
  const monConvert = parseFloat(monitoring_convert_threshold_pct);

  if (!isNaN(monClose) && (monClose < 0 || monClose > 100)) return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'monitoring_close_threshold_pct must be between 0 and 100.'));
  if (!isNaN(monExtend) && (monExtend < 0 || monExtend > 100)) return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'monitoring_extend_threshold_pct must be between 0 and 100.'));
  if (!isNaN(monConvert) && (monConvert < 0 || monConvert > 100)) return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'monitoring_convert_threshold_pct must be between 0 and 100.'));

  next();
}

function validateConvertPip(req, res, next) {
  const { start_date, end_date, metrics } = req.body;
  if (!start_date) return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'start_date is required.'));
  if (!end_date) return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'end_date is required.'));
  if (new Date(start_date) >= new Date(end_date)) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'start_date must be before end_date.'));
  }
  if (!Array.isArray(metrics) || metrics.length === 0) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'metrics must be a non-empty array.'));
  }
  next();
}

function validateTemplate(req, res, next) {
  const { name, duration_days, checkin_frequency, completion_threshold_pct, metrics } = req.body;

  if (!name || !name.trim()) return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'Template name is required.'));
  if (typeof duration_days !== 'number' || duration_days <= 0) return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'duration_days must be greater than 0.'));
  if (!['WEEKLY', 'BIWEEKLY', 'MONTHLY'].includes(checkin_frequency)) return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'checkin_frequency must be WEEKLY, BIWEEKLY, or MONTHLY.'));
  
  const pct = parseFloat(completion_threshold_pct);
  if (isNaN(pct) || pct < 0 || pct > 100) return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'completion_threshold_pct must be between 0 and 100.'));

  if (!Array.isArray(metrics) || metrics.length === 0) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'Template must contain at least one metric.'));
  }

  let totalWeight = 0;
  for (let i = 0; i < metrics.length; i++) {
    const m = metrics[i];
    if (!m.metric_name || !m.metric_name.trim()) return next(new ApiError(STATUS_CODES.BAD_REQUEST, `Metric name is required at index ${i}.`));
    if (!['ATTENDANCE', 'GOAL', 'KPI', 'COMPETENCY', 'CONTINUOUS_REVIEW', 'SELF_ASSESSMENT', 'FEEDBACK_360', 'MANUAL', 'CUSTOM'].includes(m.metric_source)) {
      return next(new ApiError(STATUS_CODES.BAD_REQUEST, `Invalid metric source option at index ${i}.`));
    }
    const weight = parseFloat(m.weight);
    if (isNaN(weight) || weight < 0 || weight > 100) return next(new ApiError(STATUS_CODES.BAD_REQUEST, `Invalid weight percentage at index ${i}.`));
    totalWeight += weight;

    const target = parseFloat(m.default_target);
    if (isNaN(target) || target < 0) return next(new ApiError(STATUS_CODES.BAD_REQUEST, `Invalid default_target value at index ${i}.`));
  }

  if (Math.abs(totalWeight - 100.0) > 0.01) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'Total metric weights must sum to exactly 100%.'));
  }

  next();
}

function validateCreateCandidate(req, res, next) {
  const { employee_id, source, recommendation_reason } = req.body;
  if (!employee_id) return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'employee_id is required.'));
  if (source && !['BELL_CURVE', 'APPRAISAL', 'MANUAL', 'MANAGER_RECOMMENDATION'].includes(source)) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'Invalid source value.'));
  }
  if (!recommendation_reason || !recommendation_reason.trim()) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'Recommendation reason is required.'));
  }
  next();
}

function validateCandidateAction(req, res, next) {
  const { status, remarks, start_date, end_date, checkin_frequency, reason, metrics } = req.body;
  if (!['MONITORING', 'APPROVED_PIP', 'REJECTED'].includes(status)) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'Invalid candidate review status. Choose MONITORING, APPROVED_PIP, or REJECTED.'));
  }
  if (status === 'REJECTED') {
    if (!remarks || !remarks.trim()) {
      return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'Rejection remarks are mandatory when declining a PIP candidate.'));
    }
    return next();
  }

  // If status is APPROVED_PIP or MONITORING, validate PIP launch payload details
  if (!start_date || !end_date) return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'start_date and end_date are required.'));
  if (new Date(start_date) > new Date(end_date)) return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'start_date must be on or before end_date.'));
  if (!['WEEKLY', 'BIWEEKLY', 'MONTHLY'].includes(checkin_frequency)) return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'checkin_frequency must be WEEKLY, BIWEEKLY, or MONTHLY.'));
  if (!reason || !reason.trim()) return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'reason justification is required.'));

  if (!Array.isArray(metrics) || metrics.length === 0) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'PIP must contain at least one metric.'));
  }

  let totalWeight = 0;
  for (let i = 0; i < metrics.length; i++) {
    const m = metrics[i];
    if (!m.metric_name || !m.metric_name.trim()) return next(new ApiError(STATUS_CODES.BAD_REQUEST, `Metric name is required at index ${i}.`));
    if (typeof m.weight !== 'number' || m.weight < 0 || m.weight > 100) return next(new ApiError(STATUS_CODES.BAD_REQUEST, `Invalid weight at index ${i}.`));
    totalWeight += m.weight;

    if (typeof m.target_value !== 'number' || m.target_value < 0) return next(new ApiError(STATUS_CODES.BAD_REQUEST, `Invalid target_value at index ${i}.`));
  }

  if (Math.abs(totalWeight - 100.0) > 0.01) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'Total metric weights must sum to exactly 100%.'));
  }

  next();
}

function validateCheckin(req, res, next) {
  const { overall_progress_at_checkin, manager_progress_rating, manager_notes, metric_values } = req.body;

  if (typeof overall_progress_at_checkin !== 'number' || overall_progress_at_checkin < 0 || overall_progress_at_checkin > 100) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'overall_progress_at_checkin must be between 0 and 100.'));
  }
  if (typeof manager_progress_rating !== 'number' || manager_progress_rating < 0 || manager_progress_rating > 5) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'manager_progress_rating must be between 0 and 5.'));
  }
  if (!manager_notes || !manager_notes.trim()) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'manager_notes progress update is required.'));
  }

  if (metric_values && !Array.isArray(metric_values)) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'metric_values must be provided as an array.'));
  }

  next();
}

module.exports = {
  validateSettings,
  validateTemplate,
  validateCandidateAction,
  validateCreateCandidate,
  validateCheckin,
  validateConvertPip
};
