const path = require('path');

const seeder001 = require('./001_verify_super_admin');
const seeder002 = require('./002_default_client_admin');
const seeder003 = require('./003_default_hierarchy_levels');
const seeder004 = require('./004_sample_departments');
const seeder005 = require('./005_default_holidays');
const seeder006 = require('./006_org_employees_seeder');
const seeder007 = require('./007_hr_policies_seeder');
const seeder008 = require('./008_attendance_mock_seeder');
const seeder009 = require('./009_leave_mock_seeder');
const seeder010 = require('./010_payroll_mock_seeder');

async function runAllHRMSSeeders() {
  console.log('===============================================================');
  console.log('🚀 UNIFIED HRMS MOCK DATA SEEDER SUITE FOR ENTERPRISE AI');
  console.log('===============================================================\n');

  try {
    console.log('1/10 Executing Super Admin Seeder (001)...');
    await seeder001();

    console.log('\n2/10 Executing Client Admin Seeder (002)...');
    await seeder002();

    console.log('\n3/10 Executing Hierarchy Levels Seeder (003)...');
    await seeder003();

    console.log('\n4/10 Executing Sample Departments Seeder (004)...');
    await seeder004();

    console.log('\n5/10 Executing Default Holidays Seeder (005)...');
    await seeder005();

    console.log('\n6/10 Executing Employee Directory & Reporting Hierarchy Seeder (006)...');
    await seeder006();

    console.log('\n7/10 Executing Acas HR Policies & RAG Seeder (007)...');
    await seeder007();

    console.log('\n8/10 Executing 6-Month Attendance & Geofencing Seeder (008)...');
    await seeder008();

    console.log('\n9/10 Executing Leave Quotas & Entitlements Seeder (009)...');
    await seeder009();

    console.log('\n10/10 Executing Payroll & CTC Compensation Seeder (010)...');
    await seeder010();

    console.log('\n===============================================================');
    console.log('✨ ALL HRMS MOCK SEEDERS EXECUTED SUCCESSFULLY!');
    console.log('   All Core HRMS modules are now populated with multi-month data for AI features.');
    console.log('===============================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error running HRMS seeders:', err);
    process.exit(1);
  }
}

runAllHRMSSeeders();
