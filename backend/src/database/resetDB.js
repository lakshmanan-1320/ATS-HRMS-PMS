const { getPool } = require('../config/db');
const logger = require('../config/logger');
const runMigrations = require('./runMigrations');

async function resetDB() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    logger.info('Dropping all existing tables cascade...');

    // Drop and recreate schema in separate statements to avoid partial failures
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO public');
    await client.query('GRANT ALL ON SCHEMA public TO postgres');

    // Grant to pms_user only if the role exists (production VPS only)
    try {
      await client.query('GRANT ALL ON SCHEMA public TO pms_user');
    } catch (_) {
      // pms_user role may not exist on local dev — safe to ignore
    }

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
    await seedOrgEmployees();
    await seedHolidays();

    logger.info('Database reset and seeding completed successfully!');
  } catch (err) {
    logger.error('Failed to reset database:', err);
    throw err; // Let caller decide how to handle (don't force process.exit)
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
