const { CATEGORIES, PRIORITIES, VISIBILITIES } = require('./goal.schema');

function validateGoal(body) {
  const {
    title,
    description,
    goal_category,
    weight,
    priority,
    start_date,
    due_date,
    visibility,
    performance_technique
  } = body;

  if (!title || !title.trim()) {
    return { error: 'Goal title is required.' };
  }
  if (!description || !description.trim()) {
    return { error: 'Goal description is required.' };
  }

  // Dynamic goal categories are loaded and selected from the DB, so we bypass static enum validation here.

  if (priority && !Object.values(PRIORITIES).includes(priority)) {
    return { error: `Priority must be one of: ${Object.values(PRIORITIES).join(', ')}.` };
  }

  if (visibility && !Object.values(VISIBILITIES).includes(visibility)) {
    return { error: `Visibility must be one of: ${Object.values(VISIBILITIES).join(', ')}.` };
  }

  if (weight !== undefined) {
    const w = parseFloat(weight);
    if (isNaN(w) || w < 0 || w > 100) {
      return { error: 'Weight must be a decimal between 0.00 and 100.00.' };
    }
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

module.exports = {
  validateGoal
};
