const { query } = require('../../config/db');

const PMS_MODULE_KEYS = [
  'goals',
  'performance',
  'kpi',
  'continuous_feedback',
  'competency_assessment',
  'self_assessment',
  '360_feedback',
  'pip',
  'bell_curve',
  'nine_box',
];

const SYSTEM_MODULES = [
  // --- Core HR & Payroll (HRMS) Modules ---
  { key: 'attendance',            name: 'Attendance Tracking',                icon: '🕐', description: 'Track check-in/out, shifts, and attendance records', category: 'HRMS' },
  { key: 'leave',                 name: 'Leave Management',                   icon: '🏖️', description: 'Manage leave requests, policies, balances, and holidays', category: 'HRMS' },
  { key: 'payroll',               name: 'Payroll',                            icon: '💰', description: 'Process salary structures, deductions, runs, and payslips', category: 'HRMS' },

  // --- Master Performance Management Suite (PMS) ---
  { key: 'pms',                   name: 'Performance Management Suite (PMS)', icon: '🏆', description: 'Master toggle for all appraisals, goals, reviews, calibration, and measurement techniques', category: 'SUITE' },

  // --- Performance Feature Modules ---
  { key: 'goals',                 name: 'Goals Management',                   icon: '🎯', description: 'Set and track employee goals with approval workflow', category: 'PMS_FEATURE' },
  { key: 'performance',           name: 'Performance Appraisal',              icon: '📊', description: 'Run appraisal cycles and review workflows', category: 'PMS_FEATURE' },

  // --- Active Performance Measurement Techniques ---
  { key: 'kpi',                   name: 'KPI (Key Performance Indicators)',   icon: '📈', description: 'Quantitative business metrics and numerical target tracking', category: 'PMS_TECHNIQUE' },
  { key: 'continuous_feedback',   name: 'Continuous Feedback',                icon: '💬', description: 'Behavior-based growth through continuous coaching, action items & reflections', category: 'PMS_TECHNIQUE' },
  { key: 'competency_assessment', name: 'Competency Assessment',              icon: '📝', description: 'Behavior-based assessment of competencies and core values', category: 'PMS_TECHNIQUE' },
  { key: 'self_assessment',       name: 'Self Assessment',                    icon: '🙋', description: 'Employee-first performance evaluation & manager review workflow', category: 'PMS_TECHNIQUE' },
  { key: '360_feedback',          name: '360° Feedback',                      icon: '🔄', description: 'Multi-rater feedback from managers, peers, direct reports & externals', category: 'PMS_TECHNIQUE' },
  { key: 'pip',                   name: 'PIP (Performance Improvement Plan)', icon: '🚨', description: 'Structured performance corrective cycles and weekly progress reviews', category: 'PMS_TECHNIQUE' },
  { key: 'bell_curve',            name: 'Bell Curve Calibration',             icon: '📉', description: 'Calibrate ratings distribution and manage forced ranking curves', category: 'PMS_TECHNIQUE' },
  { key: 'nine_box',              name: '9-Box Grid',                         icon: '🔲', description: 'Potential vs. Performance talent matrix and succession mapping', category: 'PMS_TECHNIQUE' },
];

async function getModulesForClient(clientAdminId) {
  // Ensure rows exist for all system modules
  const placeholders = SYSTEM_MODULES.map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3}, true)`).join(', ');
  const values = [clientAdminId];
  SYSTEM_MODULES.forEach(m => values.push(m.key, m.name));

  await query(
    `INSERT INTO client_modules (client_admin_id, module_key, module_name, is_enabled)
     VALUES ${placeholders}
     ON CONFLICT (client_admin_id, module_key) DO NOTHING`,
    values
  );

  const result = await query(
    `SELECT module_key, module_name, is_enabled, updated_at
     FROM client_modules WHERE client_admin_id = $1 ORDER BY module_key`,
    [clientAdminId]
  );

  const systemKeys = new Set(SYSTEM_MODULES.map(m => m.key));
  const rows = result.rows.filter(row => systemKeys.has(row.module_key));
  const pmsModule = rows.find(r => r.module_key === 'pms');
  const isPmsEnabled = pmsModule ? Boolean(pmsModule.is_enabled) : true;

  return rows.map(row => {
    const meta = SYSTEM_MODULES.find(m => m.key === row.module_key) || {};
    const effectiveEnabled = (PMS_MODULE_KEYS.includes(row.module_key) && !isPmsEnabled)
      ? false
      : row.is_enabled;
    return { ...meta, ...row, is_enabled: effectiveEnabled };
  });
}

async function toggleModule(clientAdminId, moduleKey, isEnabled) {
  const meta = SYSTEM_MODULES.find(m => m.key === moduleKey);
  const moduleName = meta ? meta.name : moduleKey;
  const result = await query(
    `INSERT INTO client_modules (client_admin_id, module_key, module_name, is_enabled, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (client_admin_id, module_key)
     DO UPDATE SET is_enabled=$4, updated_at=NOW()
     RETURNING client_admin_id, module_key, is_enabled, updated_at`,
    [clientAdminId, moduleKey, moduleName, isEnabled]
  );

  // If Master PMS suite is toggled, also cascade is_enabled to all PMS sub-modules
  if (moduleKey === 'pms') {
    await query(
      `UPDATE client_modules
       SET is_enabled = $1, updated_at = NOW()
       WHERE client_admin_id = $2 AND module_key = ANY($3::text[])`,
      [isEnabled, clientAdminId, PMS_MODULE_KEYS]
    );
  }

  return result.rows[0] || null;
}

async function getModulesForOrganization(organizationId) {
  const clientRes = await query(
    `SELECT client_admin_id FROM client_admins WHERE organization_id = $1`,
    [organizationId]
  );
  if (!clientRes.rows[0]) return [];

  const clientAdminId = clientRes.rows[0].client_admin_id;

  // Auto-seed all SYSTEM_MODULES so newly added techniques appear automatically
  const placeholders = SYSTEM_MODULES.map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3}, true)`).join(', ');
  const values = [clientAdminId];
  SYSTEM_MODULES.forEach(m => values.push(m.key, m.name));

  await query(
    `INSERT INTO client_modules (client_admin_id, module_key, module_name, is_enabled)
     VALUES ${placeholders}
     ON CONFLICT (client_admin_id, module_key) DO NOTHING`,
    values
  );

  const result = await query(
    `SELECT module_key, module_name, is_enabled
     FROM client_modules WHERE client_admin_id = $1`,
    [clientAdminId]
  );

  const systemKeys = new Set(SYSTEM_MODULES.map(m => m.key));
  const rows = result.rows.filter(row => systemKeys.has(row.module_key));
  const pmsModule = rows.find(r => r.module_key === 'pms');
  const isPmsEnabled = pmsModule ? Boolean(pmsModule.is_enabled) : true;

  return rows.map(row => {
    const meta = SYSTEM_MODULES.find(m => m.key === row.module_key) || {};
    const effectiveEnabled = (PMS_MODULE_KEYS.includes(row.module_key) && !isPmsEnabled)
      ? false
      : row.is_enabled;
    return { ...meta, ...row, is_enabled: effectiveEnabled };
  });
}

async function getAllClientsWithModules() {
  const clientsRes = await query(
    `SELECT client_admin_id AS id, full_name, email, status
     FROM client_admins
     ORDER BY created_at DESC`
  );
  return { clients: clientsRes.rows };
}

async function getAllClientModules() {
  const result = await query(
    `SELECT client_admin_id, module_key, is_enabled FROM client_modules`
  );
  return result.rows;
}

module.exports = {
  PMS_MODULE_KEYS,
  SYSTEM_MODULES,
  getModulesForClient,
  toggleModule,
  getModulesForOrganization,
  getAllClientsWithModules,
  getAllClientModules,
};
