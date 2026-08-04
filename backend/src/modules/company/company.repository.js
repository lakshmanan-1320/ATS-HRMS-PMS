const { query } = require('../../config/db');

async function getCompanyById(id) {
  const result = await query('SELECT * FROM companies WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function upsertCompany(id, data) {
  const {
    name, logo_base64, industry, company_size, founded_year,
    email, phone, website,
    address, city, state, pincode, country,
    gst_number, pan_number, cin_number, tan_number,
    fiscal_year_start, payroll_day, currency,
    work_days_per_week, work_hours_per_day,
    probation_months, notice_days, emp_code_prefix,
  } = data;

  await query(`
    INSERT INTO companies (
      id, name, logo_base64, industry, company_size, founded_year,
      email, phone, website,
      address, city, state, pincode, country,
      gst_number, pan_number, cin_number, tan_number,
      fiscal_year_start, payroll_day, currency,
      work_days_per_week, work_hours_per_day,
      probation_months, notice_days, emp_code_prefix, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name=$2, logo_base64=$3, industry=$4, company_size=$5, founded_year=$6,
      email=$7, phone=$8, website=$9,
      address=$10, city=$11, state=$12, pincode=$13, country=$14,
      gst_number=$15, pan_number=$16, cin_number=$17, tan_number=$18,
      fiscal_year_start=$19, payroll_day=$20, currency=$21,
      work_days_per_week=$22, work_hours_per_day=$23,
      probation_months=$24, notice_days=$25, emp_code_prefix=$26, updated_at=NOW()
  `, [
    id,
    name || null, logo_base64 || null, industry || null, company_size || null,
    founded_year ? parseInt(founded_year, 10) : null,
    email || null, phone || null, website || null,
    address || null, city || null, state || null, pincode || null, country || 'India',
    gst_number || null, pan_number || null, cin_number || null, tan_number || null,
    fiscal_year_start ? parseInt(fiscal_year_start, 10) : 4,
    payroll_day ? parseInt(payroll_day, 10) : 28,
    currency || 'INR',
    work_days_per_week ? parseInt(work_days_per_week, 10) : 5,
    work_hours_per_day ? parseInt(work_hours_per_day, 10) : 8,
    probation_months ? parseInt(probation_months, 10) : 6,
    notice_days ? parseInt(notice_days, 10) : 30,
    emp_code_prefix ? emp_code_prefix.trim().toUpperCase().slice(0, 10) : 'EMP',
  ]);
}

module.exports = {
  getCompanyById,
  upsertCompany,
};
