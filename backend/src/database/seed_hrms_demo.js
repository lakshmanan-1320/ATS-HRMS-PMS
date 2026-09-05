const { query } = require('../config/db');

const seeder003 = require('./seeders/003_default_hierarchy_levels');
const seeder004 = require('./seeders/004_sample_departments');
const seedSubDepts = require('./seeders/seedSubDepartments');
const seeder005 = require('./seeders/005_default_holidays');
const seeder006 = require('./seeders/006_org_employees_seeder');
const seeder008 = require('./seeders/008_attendance_mock_seeder');
const seeder009 = require('./seeders/009_leave_mock_seeder');
const seeder010 = require('./seeders/010_payroll_mock_seeder');
const seeder011 = require('./seeders/011_reports_and_audit_mock_seeder');

async function runHRMSDemoSeeder() {
  console.log('================================================================');
  console.log('🚀 UNIFIED HRMS DEMO SEEDER SUITE (CLIENT PRESENTATION READY)');
  console.log('================================================================\n');

  try {
    console.log('Step 1/9: Ensuring Default Hierarchy Levels (L1-L5)...');
    await seeder003();

    console.log('\nStep 2/9: Ensuring Root Departments (5 Departments)...');
    await seeder004();

    console.log('\nStep 3/9: Ensuring Sub-Departments...');
    await seedSubDepts();

    console.log('\nStep 4/9: Ensuring Holiday Calendar (2026)...');
    await seeder005();

    console.log('\nStep 5/9: Seeding 40 Employees Across 5 Departments (~8 per Dept)...');
    await seeder006();

    console.log('\nStep 6/9: Seeding Attendance, insightHCM Chennai Location, Shifts & Regularizations...');
    await seeder008();

    console.log('\nStep 7/9: Seeding Leave Management, Leave Plans, Balances & Permissions...');
    await seeder009();

    console.log('\nStep 8/9: Seeding Payroll, Salary Structures, Overtime & Processed Payslips...');
    await seeder010();

    console.log('\nStep 9/9: Seeding Audit Logs, Goals, KPIs, Appraisal Cycles & Competencies for Reports...');
    await seeder011();

    // ── Database Verification Summary ──────────────────────────────
    console.log('\n================================================================');
    console.log('📊 DATABASE VERIFICATION SUMMARY');
    console.log('================================================================');

    const caRow = await query('SELECT organization_id FROM client_admins LIMIT 1');
    const orgId = caRow.rows[0].organization_id;

    // Headcount
    const empCount = await query('SELECT COUNT(*) FROM employees WHERE organization_id = $1 AND status = \'active\'', [orgId]);
    console.log(`✅ Total Active Employees: ${empCount.rows[0].count}`);

    // Department Breakdown
    const deptBreakdown = await query(`
      SELECT d.name, COUNT(e.employee_id) as count
      FROM departments d
      LEFT JOIN employees e ON d.department_id = e.department_id AND e.status = 'active'
      WHERE d.organization_id = $1 AND d.parent_id IS NULL
      GROUP BY d.name
      ORDER BY d.name
    `, [orgId]);
    console.log('\n📂 Department Distribution:');
    deptBreakdown.rows.forEach(r => {
      console.log(`   • ${r.name}: ${r.count} employees`);
    });

    // Key Accounts
    const targetUsers = await query(`
      SELECT u.email, u.role, CONCAT(e.first_name, ' ', e.last_name) as name, e.designation,
             (SELECT CONCAT(m.first_name, ' ', m.last_name) FROM employees m WHERE m.employee_id = e.manager_employee_id) as manager_name
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.employee_id
      WHERE u.email IN ('demo@insight.local', 'admin@insighttechnology.in', 'arjun.sharma@company.com', 'john@example.com', 'meera.reddy@company.com')
      ORDER BY u.role
    `);
    console.log('\n🔑 Target Accounts Verification:');
    targetUsers.rows.forEach(u => {
      console.log(`   • ${u.email} [${u.role}] | ${u.name || 'System User'} (${u.designation || 'N/A'}) | Manager: ${u.manager_name || 'None'}`);
    });

    // Office Location
    const locRes = await query(`
      SELECT location_name, address, latitude, longitude, radius_meters, is_active,
             (SELECT COUNT(*) FROM attendance_policy_locations pl WHERE pl.office_location_id = ol.office_location_id) as policy_count
      FROM office_locations ol
      WHERE ol.organization_id = $1
    `, [orgId]);
    console.log('\n📍 Office Locations:');
    locRes.rows.forEach(l => {
      console.log(`   • ${l.location_name} | Lat: ${l.latitude}, Lng: ${l.longitude} | Radius: ${l.radius_meters}m | Policies Linked: ${l.policy_count} | Active: ${l.is_active}`);
    });

    // Attendance Punches
    const punchCount = await query('SELECT COUNT(*) FROM attendance_punches');
    const today = new Date().toISOString().split('T')[0];
    const todayPunches = await query('SELECT COUNT(*) FROM attendance_punches WHERE attendance_date = $1', [today]);
    console.log(`\n⏱️ Attendance Punches: ${punchCount.rows[0].count} total logs (~90 days), ${todayPunches.rows[0].count} checked-in today.`);

    // Shift Assignments
    const shiftAssign = await query('SELECT COUNT(*) FROM employees WHERE organization_id = $1 AND shift_id IS NOT NULL', [orgId]);
    console.log(`⏱️ Shift Assignments: ${shiftAssign.rows[0].count} / ${empCount.rows[0].count} employees assigned to General Day Shift.`);

    // Leave Requests
    const leaveReqs = await query('SELECT current_status, COUNT(*) FROM leave_requests GROUP BY current_status');
    console.log('\n🌴 Leave Requests:');
    leaveReqs.rows.forEach(r => {
      console.log(`   • ${r.current_status}: ${r.count}`);
    });

    // Regularizations
    const regReqs = await query('SELECT current_status, COUNT(*) FROM attendance_regularizations GROUP BY current_status');
    console.log('\n📋 Attendance Regularizations:');
    regReqs.rows.forEach(r => {
      console.log(`   • ${r.current_status}: ${r.count}`);
    });

    // Permissions
    const permReqs = await query('SELECT status, COUNT(*) FROM permission_requests GROUP BY status');
    console.log('\n🛡️ Permissions:');
    permReqs.rows.forEach(r => {
      console.log(`   • ${r.status}: ${r.count}`);
    });

    // Payroll Verification (Dynamic & Legacy)
    const compCount = await query('SELECT COUNT(*) FROM payroll_components WHERE organization_id = $1', [orgId]);
    const configCount = await query('SELECT COUNT(*) FROM employee_salary_configs WHERE organization_id = $1', [orgId]);
    const revisionCount = await query('SELECT status, COUNT(*) FROM salary_revisions WHERE organization_id = $1 GROUP BY status', [orgId]);
    const woDaysCount = await query('SELECT COUNT(*) FROM week_off_days');
    const runCount = await query('SELECT COUNT(*) FROM payroll_runs WHERE organization_id = $1', [orgId]);
    const payslipCount = await query('SELECT COUNT(*) FROM employee_payrolls');

    console.log(`\n💰 Payroll Subsystem:`);
    console.log(`   • Dynamic Components: ${compCount.rows[0].count} defined (Basic, HRA, Conveyance, Medical, Special Allowance [balancing], PF, PT, Employer PF)`);
    console.log(`   • Salary Configurations: ${configCount.rows[0].count} versioned configurations`);
    console.log(`   • Salary Revisions: ${revisionCount.rows.map(r => `${r.status}: ${r.count}`).join(', ')}`);
    console.log(`   • Week-off Days: ${woDaysCount.rows[0].count} configured (Sat/Sun)`);
    console.log(`   • Monthly Runs: ${runCount.rows[0].count} locked runs, ${payslipCount.rows[0].count} payslips generated.`);

    // Audit Logs & Reports Verification
    const auditCount = await query('SELECT COUNT(*) FROM audit_logs WHERE organization_id = $1', [orgId]);
    const goalCount = await query('SELECT COUNT(*) FROM goals WHERE organization_id = $1', [orgId]);
    const kpiCount = await query('SELECT COUNT(*) FROM goal_kpis');
    const cycleCount = await query('SELECT COUNT(*) FROM appraisal_cycles WHERE client_admin_id IN (SELECT client_admin_id FROM client_admins WHERE organization_id = $1)', [orgId]);
    const selfAppCount = await query('SELECT COUNT(*) FROM self_appraisals');
    const mgrAppCount = await query('SELECT COUNT(*) FROM manager_appraisals');
    const compAssCount = await query('SELECT COUNT(*) FROM competency_assessments WHERE organization_id = $1', [orgId]);

    console.log(`\n🔍 Audit Logs & Reports System:`);
    console.log(`   • Audit Log Events: ${auditCount.rows[0].count} security and administrative actions`);
    console.log(`   • Goals: ${goalCount.rows[0].count} strategic & departmental goals`);
    console.log(`   • Goal KPIs: ${kpiCount.rows[0].count} measurable KPIs linked to goals`);
    console.log(`   • Appraisal Cycles: ${cycleCount.rows[0].count} active cycles (${selfAppCount.rows[0].count} self-evals, ${mgrAppCount.rows[0].count} manager reviews)`);
    console.log(`   • Competency Assessments: ${compAssCount.rows[0].count} behavioral ratings recorded`);

    console.log('\n================================================================');
    console.log('✨ ALL 15 HRMS MODULES & REPORTS ARE FULLY SEEDED & DEMO-READY!');
    console.log('================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error running HRMS demo seeder suite:', err);
    process.exit(1);
  }
}

runHRMSDemoSeeder();
