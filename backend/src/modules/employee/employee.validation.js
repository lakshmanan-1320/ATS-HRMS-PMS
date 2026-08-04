function createEmployeeSchema(body) {
  const { first_name, last_name, email, login_password, salary_structure_id, uan_number, esi_number } = body;
  if (!first_name || !first_name.trim()) {
    return { error: 'First name is required.' };
  }
  if (!last_name || !last_name.trim()) {
    return { error: 'Last name is required.' };
  }
  if (email?.trim() && login_password && login_password.length < 8) {
    return { error: 'Login password must be at least 8 characters long.' };
  }
  if (salary_structure_id && !/^[0-9a-fA-F-]{36}$/.test(salary_structure_id)) {
    return { error: 'A valid Salary Structure is required for onboarding.' };
  }
  if (uan_number && (uan_number.length < 3 || uan_number.length > 30)) {
    return { error: 'UAN must be between 3 and 30 characters.' };
  }
  if (esi_number && (esi_number.length < 3 || esi_number.length > 30)) {
    return { error: 'ESI must be between 3 and 30 characters.' };
  }
  return { value: body };
}

function updateEmployeeSchema(body) {
  const { first_name, last_name, employee_code, uan_number, esi_number } = body;
  if (!first_name || !first_name.trim()) {
    return { error: 'First name is required.' };
  }
  if (!last_name || !last_name.trim()) {
    return { error: 'Last name is required.' };
  }
  if (!employee_code || !employee_code.trim()) {
    return { error: 'Employee code is required.' };
  }
  if (uan_number && (uan_number.length < 3 || uan_number.length > 30)) {
    return { error: 'UAN must be between 3 and 30 characters.' };
  }
  if (esi_number && (esi_number.length < 3 || esi_number.length > 30)) {
    return { error: 'ESI must be between 3 and 30 characters.' };
  }
  return { value: body };
}

module.exports = {
  createEmployeeSchema,
  updateEmployeeSchema,
};
