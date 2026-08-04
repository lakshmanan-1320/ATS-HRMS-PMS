const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');

function validateConfiguration(req, res, next) {
  const { name, tie_strategy } = req.body;
  if (!name || !name.trim()) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'Configuration name is required.'));
  }
  if (tie_strategy && !['INCLUDE_ALL', 'MANUAL_REVIEW'].includes(tie_strategy)) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'Invalid tie strategy option.'));
  }
  next();
}

function validateBuckets(req, res, next) {
  const { buckets } = req.body;
  if (!Array.isArray(buckets)) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'Buckets must be provided as an array.'));
  }
  if (buckets.length < 2 || buckets.length > 10) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'You must configure between 2 and 10 buckets.'));
  }

  let totalPct = 0;
  for (let i = 0; i < buckets.length; i++) {
    const b = buckets[i];
    if (!b.bucket_name || !b.bucket_name.trim()) {
      return next(new ApiError(STATUS_CODES.BAD_REQUEST, `Bucket name is required at index ${i}.`));
    }
    if (typeof b.bucket_order !== 'number') {
      return next(new ApiError(STATUS_CODES.BAD_REQUEST, `Bucket order number is required at index ${i}.`));
    }
    const pct = parseFloat(b.percentage);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      return next(new ApiError(STATUS_CODES.BAD_REQUEST, `Invalid percentage value at index ${i}.`));
    }
    if (!b.color || !b.color.trim()) {
      return next(new ApiError(STATUS_CODES.BAD_REQUEST, `Color style is required at index ${i}.`));
    }
    totalPct += pct;
  }

  if (Math.abs(totalPct - 100.0) > 0.01) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'Total bucket percentages must equal exactly 100%.'));
  }

  next();
}

function validateOverride(req, res, next) {
  const { currentBucketId, reason } = req.body;
  if (!currentBucketId) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'Target performance bucket is required for calibration override.'));
  }
  if (!reason || !reason.trim()) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'Calibration override justification reason is mandatory.'));
  }
  next();
}

function validateStatus(req, res, next) {
  const { status } = req.body;
  if (!status || !['DRAFT', 'FROZEN', 'PUBLISHED'].includes(status)) {
    return next(new ApiError(STATUS_CODES.BAD_REQUEST, 'Invalid run status transition.'));
  }
  next();
}

module.exports = {
  validateConfiguration,
  validateBuckets,
  validateOverride,
  validateStatus
};
