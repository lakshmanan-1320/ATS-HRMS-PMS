const { MEASUREMENT_TYPES, PRIORITIES, FREQUENCIES, KPI_TYPES } = require('./kpi.schema');

function validateKpi(body) {
  const {
    title, measurement_type,
    target_value, target_text, target_boolean,
    weight_percentage, priority, frequency, kpi_type,
    start_date, due_date
  } = body;

  if (!title || !title.trim()) {
    return { error: 'KPI title is required.' };
  }

  if (!measurement_type || !Object.values(MEASUREMENT_TYPES).includes(measurement_type)) {
    return { error: `Measurement type must be one of: ${Object.values(MEASUREMENT_TYPES).join(', ')}.` };
  }

  // Type-specific target value checks
  if (measurement_type === MEASUREMENT_TYPES.CHECKLIST) {
    // Checklist type targets are determined by the number of sub-tasks
    if (body.tasks && !Array.isArray(body.tasks)) {
      return { error: 'Tasks must be an array.' };
    }
  } else if (measurement_type === MEASUREMENT_TYPES.BOOLEAN) {
    if (target_boolean === undefined || target_boolean === null) {
      return { error: 'Target boolean is required.' };
    }
  } else if (measurement_type === MEASUREMENT_TYPES.TEXT) {
    if (target_text === undefined || target_text === null || target_text.trim() === '') {
      return { error: 'Target text is required.' };
    }
  } else {
    // NUMBER, PERCENTAGE, CURRENCY
    if (target_value === undefined || target_value === null) {
      return { error: 'Target value is required.' };
    }
    const val = parseFloat(target_value);
    if (isNaN(val)) {
      return { error: 'Target value must be numeric.' };
    }
  }

  if (weight_percentage === undefined || weight_percentage === null) {
    return { error: 'Weight percentage is required.' };
  }
  const weight = parseFloat(weight_percentage);
  if (isNaN(weight) || weight <= 0 || weight > 100) {
    return { error: 'Weight must be a decimal between 0.01 and 100.00.' };
  }

  if (priority && !Object.values(PRIORITIES).includes(priority)) {
    return { error: `Priority must be one of: ${Object.values(PRIORITIES).join(', ')}.` };
  }

  if (frequency && !Object.values(FREQUENCIES).includes(frequency)) {
    return { error: `Frequency must be one of: ${Object.values(FREQUENCIES).join(', ')}.` };
  }

  if (kpi_type && !Object.values(KPI_TYPES).includes(kpi_type)) {
    return { error: `KPI Type must be one of: ${Object.values(KPI_TYPES).join(', ')}.` };
  }

  if (start_date && due_date) {
    const start = new Date(start_date);
    const due = new Date(due_date);
    if (isNaN(start.getTime())) {
      return { error: 'Invalid start date format.' };
    }
    if (isNaN(due.getTime())) {
      return { error: 'Invalid due date format.' };
    }
    if (start > due) {
      return { error: 'Start date must be before or equal to due date.' };
    }
  }

  return { value: body };
}

function validateSubmission(body, measurementType) {
  const { submitted_value, submitted_text, submitted_boolean, comment, attachments, links } = body;

  if (measurementType === MEASUREMENT_TYPES.CHECKLIST) {
    if (body.tasks && !Array.isArray(body.tasks)) {
      return { error: 'Tasks completion checklist must be an array.' };
    }
  } else if (measurementType === MEASUREMENT_TYPES.BOOLEAN) {
    if (submitted_boolean === undefined || submitted_boolean === null) {
      return { error: 'submitted_boolean is required.' };
    }
  } else if (measurementType === MEASUREMENT_TYPES.TEXT) {
    // Text KPIs rely primarily on uploads and comments
  } else {
    // NUMBER, PERCENTAGE, CURRENCY
    if (submitted_value === undefined || submitted_value === null) {
      return { error: 'submitted_value is required.' };
    }
    const val = parseFloat(submitted_value);
    if (isNaN(val)) {
      return { error: 'submitted_value must be numeric.' };
    }
  }

  if (attachments && !Array.isArray(attachments)) {
    return { error: 'Attachments must be an array.' };
  }
  if (links && !Array.isArray(links)) {
    return { error: 'Links must be an array.' };
  }

  return { value: body };
}

module.exports = {
  validateKpi,
  validateSubmission
};
