const { query } = require('../../config/db');

const SYSTEM_MODULES = [
  // --- Core HR & Payroll Feature Modules ---
  { key: 'goals',                 name: 'Goals Management',                   icon: '🎯', description: 'Set and track employee goals with approval workflow', category: 'FEATURE' },
  { key: 'performance',           name: 'Performance Appraisal',              icon: '📊', description: 'Run appraisal cycles and 360° reviews', category: 'FEATURE' },
  { key: 'leave',                 name: 'Leave Management',                   icon: '🏖️', description: 'Manage leave requests, approvals, and balances', category: 'FEATURE' },
  { key: 'payroll',               name: 'Payroll',                            icon: '💰', description: 'Process salary, deductions, and payslips', category: 'FEATURE' },
  { key: 'attendance',            name: 'Attendance Tracking',                icon: '🕐', description: 'Track check-in/out and attendance records', category: 'FEATURE' },

  // --- Active Performance Measurement Techniques ---
  { key: 'kpi',                   name: 'KPI (Key Performance Indicators)',   icon: '📈', description: 'Quantitative business metrics and numerical target tracking', category: 'TECHNIQUE' },
  { key: 'continuous_feedback',   name: 'Continuous Feedback',                icon: '💬', description: 'Behavior-based growth through continuous coaching, action items & reflections', category: 'TECHNIQUE' },
  { key: 'competency_assessment', name: 'Competency Assessment',              icon: '📝', description: 'Behavior-based assessment of competencies and core values', category: 'TECHNIQUE' },
  { key: 'self_assessment',       name: 'Self Assessment',                    icon: '🙋', description: 'Employee-first performance evaluation & manager review workflow', category: 'TECHNIQUE' },
  { key: '360_feedback',          name: '360° Feedback',                      icon: '🔄', description: 'Multi-rater feedback from managers, peers, direct reports & externals', category: 'TECHNIQUE' },
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
  return result.rows
    .filter(row => systemKeys.has(row.module_key))
    .map(row => {
      const meta = SYSTEM_MODULES.find(m => m.key === row.module_key) || {};
      return { ...meta, ...row };
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
  return result.rows
    .filter(row => systemKeys.has(row.module_key))
    .map(row => {
      const meta = SYSTEM_MODULES.find(m => m.key === row.module_key) || {};
      return { ...meta, ...row };
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
  SYSTEM_MODULES,
  getModulesForClient,
  toggleModule,
  getModulesForOrganization,
  getAllClientsWithModules,
  getAllClientModules,
};
