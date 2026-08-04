function mapCompany(row) {
  if (!row) return {};
  return {
    id: row.id,
    name: row.name,
    logo_base64: row.logo_base64,
    industry: row.industry,
    company_size: row.company_size,
    founded_year: row.founded_year,
    email: row.email,
    phone: row.phone,
    website: row.website,
    address: row.address,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    country: row.country,
    gst_number: row.gst_number,
    pan_number: row.pan_number,
    cin_number: row.cin_number,
    tan_number: row.tan_number,
    fiscal_year_start: row.fiscal_year_start,
    payroll_day: row.payroll_day,
    currency: row.currency,
    work_days_per_week: row.work_days_per_week,
    work_hours_per_day: row.work_hours_per_day,
    probation_months: row.probation_months,
    notice_days: row.notice_days,
    emp_code_prefix: row.emp_code_prefix,
    updated_at: row.updated_at,
  };
}

module.exports = {
  mapCompany,
};
