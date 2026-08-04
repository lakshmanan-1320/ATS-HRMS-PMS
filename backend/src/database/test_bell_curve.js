const { query } = require('../config/db');
const service = require('../modules/bellCurve/bellCurve.service');

async function runVerification() {
  console.log('--- Starting Bell Curve Calculation Verification ---\n');
  
  try {
    // 1. Get mock entities
    const orgRes = await query('SELECT organization_id FROM organizations LIMIT 1');
    if (!orgRes.rows.length) {
      console.log('FAIL: No organization found in DB.');
      process.exit(1);
    }
    const orgId = orgRes.rows[0].organization_id;
    console.log(`- Found Organization ID: ${orgId}`);

    const userRes = await query(
      `SELECT u.user_id, u.email, u.role
       FROM users u
       JOIN client_admins ca ON u.email = ca.email
       WHERE ca.organization_id = $1 AND u.role = 'client_admin'
       LIMIT 1`,
      [orgId]
    );
    if (!userRes.rows.length) {
      console.log('FAIL: No client admin user found for this organization.');
      process.exit(1);
    }
    const userContext = {
      id: userRes.rows[0].user_id,
      email: userRes.rows[0].email,
      role: 'client_admin'
    };
    console.log(`- Operating under user email: ${userContext.email}`);

    // Fetch a valid manager employee ID to satisfy database foreign keys
    const managerRes = await query('SELECT employee_id FROM employees LIMIT 1');
    const managerId = managerRes.rows[0].employee_id;

    // Create a mock closed appraisal cycle for testing if none exists
    let cycleRes = await query('SELECT appraisal_cycle_id FROM appraisal_cycles WHERE status = \'closed\' LIMIT 1');
    let cycleId;
    if (!cycleRes.rows.length) {
      console.log('- No closed cycle found, creating mock cycle for testing...');
      const adminRes = await query('SELECT client_admin_id FROM client_admins WHERE organization_id = $1 LIMIT 1', [orgId]);
      const clientAdminId = adminRes.rows[0].client_admin_id;

      const fyRes = await query('SELECT financial_year_id FROM financial_years LIMIT 1');
      const fyId = fyRes.rows[0].financial_year_id;

      const newCycle = await query(
        `INSERT INTO appraisal_cycles (client_admin_id, name, period_start, period_end, status, financial_year_id)
         VALUES ($1, 'Mock Cycle Test', NOW(), NOW() + interval '1 month', 'closed', $2)
         RETURNING appraisal_cycle_id`,
        [clientAdminId, fyId]
      );
      cycleId = newCycle.rows[0].appraisal_cycle_id;
      console.log(`- Created mock closed cycle: ${cycleId}`);
    } else {
      cycleId = cycleRes.rows[0].appraisal_cycle_id;
      console.log(`- Using existing closed cycle: ${cycleId}`);
    }

    // 2. Validate configurations creation
    console.log('\nTesting Configuration Validations...');
    const config = await service.createConfiguration(orgId, {
      name: 'Verification Config Unit Test',
      is_default: true,
      tie_strategy: 'INCLUDE_ALL'
    }, userContext);
    console.log(`- Created Configuration: ${config.name} (${config.configuration_id})`);

    // Verify bucket validation sum checks
    try {
      console.log('- Attempting to save invalid bucket sizes (summing to 90%)...');
      await service.saveBuckets(orgId, config.configuration_id, [
        { bucket_name: 'High', bucket_order: 1, percentage: 30, color: 'green' },
        { bucket_name: 'Low', bucket_order: 2, percentage: 60, color: 'red' }
      ], userContext);
      console.log('FAIL: Expected error for bucket percentage sum != 100%');
      process.exit(1);
    } catch (err) {
      console.log(`- SUCCESS: Caught expected error: "${err.message}"`);
    }

    // Save valid buckets (Top 20%, Avg 60%, Low 20%)
    const validBuckets = [
      { bucket_name: 'High Performers', bucket_order: 1, percentage: 20, color: 'green', suggested_action: 'Promotion' },
      { bucket_name: 'Average Performers', bucket_order: 2, percentage: 60, color: 'yellow', suggested_action: 'Increment' },
      { bucket_name: 'Low Performers', bucket_order: 3, percentage: 20, color: 'red', suggested_action: 'PIP' }
    ];
    const savedBuckets = await service.saveBuckets(orgId, config.configuration_id, validBuckets, userContext);
    console.log(`- SUCCESS: Saved ${savedBuckets.length} valid buckets.`);

    // 3. Setup mock employee appraisals
    console.log('\nSeeding mock appraisal scores...');
    // Fetch 5 active employees to inject mock manager appraisal scores
    const empRes = await query('SELECT employee_id FROM employees WHERE organization_id = $1 LIMIT 5', [orgId]);
    if (empRes.rows.length < 5) {
      console.log('FAIL: Test requires at least 5 active employees in the DB.');
      process.exit(1);
    }
    const emps = empRes.rows;

    // Clean old appraisals for these employees on this cycle
    const empIds = emps.map(e => e.employee_id);
    await query('DELETE FROM manager_appraisals WHERE cycle_id = $1 AND employee_id = ANY($2)', [cycleId, empIds]);

    // Insert scores with ties at boundary (scores: 95, 95, 80, 80, 60)
    // Boundary cutoffs: N = 5.
    // Cutoff 1 (20% of 5 = 1 rank). Index 0 (High), Index 1-3 (Avg), Index 4 (Low)
    // Here: Index 0 (95) and Index 1 (95) are tied!
    const mockScores = [95.0, 95.0, 80.0, 80.0, 60.0];
    for (let i = 0; i < emps.length; i++) {
      await query(
        `INSERT INTO manager_appraisals (cycle_id, employee_id, manager_id, status, final_score, created_at, updated_at)
         VALUES ($1, $2, $3, 'submitted', $4, NOW(), NOW())`,
        [cycleId, emps[i].employee_id, managerId, mockScores[i]]
      );
    }
    console.log('- Seeded 5 manager appraisals with boundary ties [95, 95, 80, 80, 60].');

    // 4. Test Generation under INCLUDE_ALL strategy
    console.log('\nGenerating run under INCLUDE_ALL strategy...');
    await service.updateConfiguration(orgId, config.configuration_id, {
      name: 'Verification Config Unit Test',
      is_default: true,
      tie_strategy: 'INCLUDE_ALL'
    }, userContext);

    const run1 = await service.generateBellCurve(orgId, cycleId, config.configuration_id, userContext);
    console.log(`- Created Run Run #${run1.run_number} (${run1.status})`);

    const results1 = await service.getResultsByRun(orgId, run1.run_id);
    console.log(`- Retreived ${results1.length} calibration results.`);

    // Under INCLUDE_ALL, E1 and E2 (both 95) should both get High Performers bucket
    const highBucketId = savedBuckets.find(b => b.bucket_name === 'High Performers').bucket_id;
    const actualHighCount = results1.filter(r => r.current_bucket_id === highBucketId).length;
    console.log(`- Count of employees in High Performers bucket (target 20% = 1 employee): ${actualHighCount}`);
    if (actualHighCount === 2) {
      console.log('- SUCCESS: Tie strategy INCLUDE_ALL successfully included both tied employees in the higher bucket!');
    } else {
      console.log('FAIL: Expected 2 employees in high bucket due to INCLUDE_ALL strategy.');
      process.exit(1);
    }

    // 5. Test Generation under MANUAL_REVIEW strategy
    console.log('\nGenerating run under MANUAL_REVIEW strategy...');
    await service.updateConfiguration(orgId, config.configuration_id, {
      name: 'Verification Config Unit Test',
      is_default: true,
      tie_strategy: 'MANUAL_REVIEW'
    }, userContext);

    const run2 = await service.generateBellCurve(orgId, cycleId, config.configuration_id, userContext);
    const results2 = await service.getResultsByRun(orgId, run2.run_id);

    // Under MANUAL_REVIEW, E1 and E2 should have current_bucket_id = null
    const manualReviewCount = results2.filter(r => r.current_bucket_id === null).length;
    console.log(`- Count of unresolved tied employees (current_bucket_id = null): ${manualReviewCount}`);
    if (manualReviewCount === 2) {
      console.log('- SUCCESS: Tie strategy MANUAL_REVIEW successfully flagged boundary ties for manual review!');
    } else {
      console.log('FAIL: Expected 2 unresolved employees under MANUAL_REVIEW strategy.');
      process.exit(1);
    }

    // 6. Test Override Calibration
    console.log('\nTesting Manual Override Calibration...');
    const tiedResult = results2.find(r => r.current_bucket_id === null);
    const avgBucketId = savedBuckets.find(b => b.bucket_name === 'Average Performers').bucket_id;
    
    console.log(`- Calibrating tied employee ${tiedResult.first_name || 'E'} to Average Performers...`);
    const calibrated = await service.updateResultOverride(orgId, tiedResult.result_id, avgBucketId, 'Resolving boundary tie manually.', userContext);
    console.log(`- Calibration Success. Current Bucket: ${calibrated.current_bucket_id}, Overridden: ${calibrated.is_override}`);
    
    // 7. Test Freeze constraints
    console.log('\nTesting Freeze status controls...');
    await service.updateRunStatus(orgId, run2.run_id, 'FROZEN', userContext);
    console.log('- Transitioned run status to FROZEN.');

    try {
      console.log('- Attempting override calibration on FROZEN run...');
      await service.updateResultOverride(orgId, tiedResult.result_id, highBucketId, 'Attempting to change frozen record', userContext);
      console.log('FAIL: Expected validation error on frozen run override.');
      process.exit(1);
    } catch (err) {
      console.log(`- SUCCESS: Blocked frozen override with error: "${err.message}"`);
    }

    // Cleanup mock data
    console.log('\nCleaning up verification records...');
    await query('DELETE FROM bell_curve_configurations WHERE configuration_id = $1', [config.configuration_id]);
    await query('DELETE FROM manager_appraisals WHERE cycle_id = $1 AND employee_id = ANY($2)', [cycleId, empIds]);
    console.log('- Mock configuration and appraisal cycle test data cleared.');

    console.log('\nALL VERIFICATIONS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('FAIL: Verification execution encountered error:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runVerification();
