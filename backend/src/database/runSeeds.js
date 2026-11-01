const path = require('path')
const logger = require('../config/logger')

const isMainScript = require.main === module

async function run() {
  const arg = isMainScript ? process.argv[2] : undefined
  try {
    if (!arg || arg === 'all') {
      logger.info('Running all seeders...')
      // order matters: verify admin → create client admin → hierarchy → departments → sub-depts → employees
      const verifyAdmin = require('./seeders/001_verify_super_admin')
      const createClientAdmin = require('./seeders/002_default_client_admin')
      const createHierarchy = require('./seeders/003_default_hierarchy_levels')
      const createDepts = require('./seeders/004_sample_departments')
      const seedSub = require('./seeders/seedSubDepartments')
      const seedOrgEmployees = require('./seeders/006_org_employees_seeder')
      const seedHolidays = require('./seeders/005_default_holidays')
      const seedHRPolicies = require('./seeders/007_hr_policies_seeder')
      const indexPolicies = require('./seeders/008_index_policies_seeder')
      const seedAttendance = require('./seeders/008_attendance_mock_seeder')
      const seedLeave = require('./seeders/009_leave_mock_seeder')
      const seedPayroll = require('./seeders/010_payroll_mock_seeder')
      
      await verifyAdmin()
      await createClientAdmin()
      await createHierarchy()
      await createDepts()
      await seedSub()
      await seedOrgEmployees()
      await seedHolidays()
      await seedHRPolicies()
      try {
        await indexPolicies()
      } catch (err) {
        // Needs pgvector + Ollama; skip so the remaining seeders still run.
        logger.warn('Policy embedding indexing skipped:', err.message)
      }
      await seedAttendance()
      await seedLeave()
      await seedPayroll()
      
      logger.info('All seeders completed.')
      if (isMainScript) process.exit(0)
      return
    }

    // single seeder by name or level
    if (/^L\d$/i.test(arg)) {
      const seedEmp = require('./seeders/seedL1Employee')
      await seedEmp(arg)
      if (isMainScript) process.exit(0)
      return
    }

    if (arg === 'sub-depts') {
      const seedSub = require('./seeders/seedSubDepartments')
      await seedSub()
      if (isMainScript) process.exit(0)
      return
    }

    console.error('Unknown seed argument. Use `all`, `sub-depts`, or a level like `L1`.')
    if (isMainScript) process.exit(1)
  } catch (err) {
    logger.error('Seeding failed:', err)
    if (isMainScript) process.exit(1)
    throw err // Re-throw when called as module so caller can handle
  }
}

if (isMainScript) {
  run()
}

module.exports = run
