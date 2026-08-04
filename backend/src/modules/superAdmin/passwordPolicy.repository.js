const { query } = require('../../config/db');
const { companyRowId } = require('../../config/env');

const DEFAULTS = {
  minLength: 8,
  requireUppercase: false,
  requireLowercase: false,
  requireNumbers: false,
  requireSpecialChars: false,
  maxAgeDays: 0,
};

async function getPasswordPolicy() {
  const { rows } = await query('SELECT * FROM password_policy WHERE id = $1', [companyRowId]);
  if (!rows.length) return DEFAULTS;
  const r = rows[0];
  return {
    minLength: r.min_length,
    requireUppercase: r.require_uppercase,
    requireLowercase: r.require_lowercase,
    requireNumbers: r.require_numbers,
    requireSpecialChars: r.require_special_chars,
    maxAgeDays: r.max_age_days,
  };
}

async function savePasswordPolicy({ minLength, requireUppercase, requireLowercase, requireNumbers, requireSpecialChars, maxAgeDays }) {
  await query(
    `INSERT INTO password_policy (id, min_length, require_uppercase, require_lowercase, require_numbers, require_special_chars, max_age_days, updated_at)
     VALUES ($7, $1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (id) DO UPDATE SET
       min_length = $1,
       require_uppercase = $2,
       require_lowercase = $3,
       require_numbers = $4,
       require_special_chars = $5,
       max_age_days = $6,
       updated_at = NOW()`,
    [minLength, requireUppercase, requireLowercase, requireNumbers, requireSpecialChars, maxAgeDays, companyRowId]
  );
}

module.exports = { getPasswordPolicy, savePasswordPolicy };
