const { getPool } = require('../config/db');
const logger = require('../config/logger');
const runMigrations = require('./runMigrations');

async function resetDB() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    logger.info('Dropping all existing tables cascade...');
    await client.query(`
      DROP TABLE IF EXISTS payroll_run_logs CASCADE;
      DROP TABLE IF EXISTS payroll_adjustments CASCADE;
      DROP TABLE IF EXISTS employee_payrolls CASCADE;
      DROP TABLE IF EXISTS payroll_runs CASCADE;
      DROP TABLE IF EXISTS week_off_settings CASCADE;
      DROP TABLE IF EXISTS employee_salary_assignments CASCADE;
      DROP TABLE IF EXISTS salary_structures CASCADE;
      DROP TABLE IF EXISTS attendance_regularization_logs CASCADE;
      DROP TABLE IF EXISTS attendance_regularizations CASCADE;
      DROP TABLE IF EXISTS system_settings CASCADE;
      DROP TABLE IF EXISTS leave_request_audit_logs CASCADE;
      DROP TABLE IF EXISTS leave_requests CASCADE;
      DROP TABLE IF EXISTS employee_leave_balances CASCADE;
      DROP TABLE IF EXISTS leave_types CASCADE;
      DROP TABLE IF EXISTS holidays CASCADE;
      DROP TABLE IF EXISTS attendance_punches CASCADE;
      DROP TABLE IF EXISTS geo_fence_zones CASCADE;
      DROP TABLE IF EXISTS user_otps CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TYPE IF EXISTS user_role CASCADE;
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS manager_appraisal_goal_ratings CASCADE;
      DROP TABLE IF EXISTS self_appraisal_goal_ratings CASCADE;
      DROP TABLE IF EXISTS manager_appraisals CASCADE;
      DROP TABLE IF EXISTS self_appraisals CASCADE;
      DROP TABLE IF EXISTS appraisal_cycles CASCADE;
      DROP TABLE IF EXISTS goal_history CASCADE;
      DROP TABLE IF EXISTS goals CASCADE;
      DROP TABLE IF EXISTS client_modules CASCADE;
      DROP TABLE IF EXISTS employees CASCADE;
      DROP TABLE IF EXISTS hierarchy_levels CASCADE;
      DROP TABLE IF EXISTS departments CASCADE;
      DROP TABLE IF EXISTS client_admins CASCADE;
      DROP TABLE IF EXISTS organizations CASCADE;
      DROP TABLE IF EXISTS companies CASCADE;
      DROP TABLE IF EXISTS smtp_settings CASCADE;
      DROP TABLE IF EXISTS super_admins CASCADE;
      DROP TABLE IF EXISTS schema_migrations CASCADE;
    `);
    logger.info('All tables dropped successfully.');
    
    // Release connection
    client.release();

    logger.info('Running migrations...');
    await runMigrations();

    logger.info('Running seeders directly...');
    const verifyAdmin = require('./seeders/001_verify_super_admin');
    const createClientAdmin = require('./seeders/002_default_client_admin');
    const createHierarchy = require('./seeders/003_default_hierarchy_levels');
    const createDepts = require('./seeders/004_sample_departments');
    const seedSub = require('./seeders/seedSubDepartments');
    const seedOrgEmployees = require('./seeders/006_org_employees_seeder');
    const seedHolidays = require('./seeders/005_default_holidays');

    await verifyAdmin();
    await createClientAdmin();
    await createHierarchy();
    await createDepts();
    await seedSub();
    await seedEmp('L1');
    await seedEmp('L2');
    await seedEmp('L3');
    await seedEmp('L4');
    await seedEmp('L5');

    logger.info('Database reset and seeding completed successfully!');
  } catch (err) {
    logger.error('Failed to reset database:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  resetDB().then(() => {
    process.exit(0);
  }).catch((err) => {
    process.exit(1);
  });
}

module.exports = resetDB;
