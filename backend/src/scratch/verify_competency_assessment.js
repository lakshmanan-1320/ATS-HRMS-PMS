const { query } = require('../src/config/db');
const competencyService = require('../src/modules/competencyAssessment/competencyAssessment.service');
const competencyRepo = require('../src/modules/competencyAssessment/competencyAssessment.repository');
const goalService = require('../src/modules/goal/goal.service');
const goalRepo = require('../src/modules/goal/goal.repository');
const crypto = require('crypto');

async function run() {
  console.log('Starting Competency Assessment E2E verification...');

  let orgId;
  let clientAdminUser;
  let managerUser;
  let employeeUser;
  let activeConfigId;

  let libraryCompetencyId;
  let goalId;
  let assignmentId;
  let goalCompetencyId;

  try {
    // 1. Create a test organization
    const orgRes = await query(
      `INSERT INTO organizations (name) 
       VALUES ($1) RETURNING organization_id`,
      ['Test Org Verify']
    );
    orgId = orgRes.rows[0].organization_id;
    console.log(`- Created test organization: ${orgId}`);

    // Create a mock active performance configuration for this organization
    const configRes = await query(
      `INSERT INTO performance_configurations (
        organization_id, cycle_name, cycle_type, start_date, end_date, 
        goal_setting_direction, review_frequency, goal_approval_required, 
        allow_goal_edit_after_approval, allow_employee_goal_creation, 
        allow_manager_goal_creation, require_goal_weight_validation, 
        max_goals_per_employee, status
      ) VALUES ($1, 'Verify Config 2026', 'ANNUAL', CURRENT_DATE, CURRENT_DATE + 30, 'HYBRID', 'QUARTERLY', FALSE, TRUE, TRUE, TRUE, FALSE, 10, 'ACTIVE') RETURNING performance_configuration_id`,
      [orgId]
    );
    activeConfigId = configRes.rows[0].performance_configuration_id;

    // Create default rating scales for the org
    for (let i = 1; i <= 5; i++) {
      const labels = ['', 'Below', 'Developing', 'Meets', 'Exceeds', 'Outstanding'];
      await query(
        `INSERT INTO competency_rating_scales (organization_id, rating_level, label)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [orgId, i, labels[i]]
      );
    }

    // 2. Create test employees with unique emails
    const suffix = Date.now();
    const adminEmail = `admin-${suffix}@verify.com`;
    const managerEmail = `manager-${suffix}@verify.com`;
    const employeeEmail = `employee-${suffix}@verify.com`;

    const clientAdminEmpRes = await query(
      `INSERT INTO employees (organization_id, first_name, last_name, email, designation, employee_code)
       VALUES ($1, 'Admin', 'User', $2, 'Admin', 'V_EMP_ADMIN') RETURNING employee_id`,
      [orgId, adminEmail]
    );
    const clientAdminEmpId = clientAdminEmpRes.rows[0].employee_id;

    const managerEmpRes = await query(
      `INSERT INTO employees (organization_id, first_name, last_name, email, designation, employee_code)
       VALUES ($1, 'Manager', 'User', $2, 'Manager', 'V_EMP_MGR') RETURNING employee_id`,
      [orgId, managerEmail]
    );
    const managerEmpId = managerEmpRes.rows[0].employee_id;

    const employeeEmpRes = await query(
      `INSERT INTO employees (organization_id, first_name, last_name, email, designation, employee_code, manager_employee_id)
       VALUES ($1, 'Employee', 'User', $2, 'Developer', 'V_EMP_DEV', $3) RETURNING employee_id`,
      [orgId, employeeEmail, managerEmpId]
    );
    const employeeEmpId = employeeEmpRes.rows[0].employee_id;

    // 3. Create users
    const adminUserRes = await query(
      `INSERT INTO users (organization_id, employee_id, email, password_hash, role)
       VALUES ($1, $2, $3, 'dummyhash', 'client_admin') RETURNING user_id`,
      [orgId, clientAdminEmpId, adminEmail]
    );
    clientAdminUser = { id: adminUserRes.rows[0].user_id, role: 'client_admin', employeeId: clientAdminEmpId };

    const managerUserRes = await query(
      `INSERT INTO users (organization_id, employee_id, email, password_hash, role)
       VALUES ($1, $2, $3, 'dummyhash', 'manager') RETURNING user_id`,
      [orgId, managerEmpId, managerEmail]
    );
    managerUser = { id: managerUserRes.rows[0].user_id, role: 'manager', employeeId: managerEmpId, userId: managerUserRes.rows[0].user_id };

    const employeeUserRes = await query(
      `INSERT INTO users (organization_id, employee_id, email, password_hash, role)
       VALUES ($1, $2, $3, 'dummyhash', 'employee') RETURNING user_id`,
      [orgId, employeeEmpId, employeeEmail]
    );
    employeeUser = { id: employeeUserRes.rows[0].user_id, role: 'employee', employeeId: employeeEmpId, userId: employeeUserRes.rows[0].user_id };

    // Enable competency_assessment module for the organization
    const clientAdminRes = await query(
      `INSERT INTO client_admins (organization_id, full_name, email, company_name)
       VALUES ($1, 'Admin User', $2, 'Test Org Verify') RETURNING client_admin_id`,
      [orgId, adminEmail]
    );
    const clientAdminId = clientAdminRes.rows[0].client_admin_id;

    await query(
      `INSERT INTO client_modules (client_admin_id, module_key, module_name, is_enabled)
       VALUES ($1, 'competency_assessment', 'Competency Assessment', TRUE) ON CONFLICT (client_admin_id, module_key) DO UPDATE SET is_enabled = TRUE`,
      [clientAdminId]
    );

    // --- Assertions ---

    // 1. Save Library Competency
    console.log('Testing saveLibraryCompetency...');
    const savedComp = await competencyService.saveLibraryCompetency(
      orgId,
      {
        competency_id: null,
        name: 'Adaptability & Flexibility',
        description: 'Thriving under changing business landscapes',
        indicators: [
          { rating_level: 1, behavioral_indicator: 'Resists change completely' },
          { rating_level: 2, behavioral_indicator: 'Adapts reluctantly when monitored' },
          { rating_level: 3, behavioral_indicator: 'Adapts quickly to project changes' },
          { rating_level: 4, behavioral_indicator: 'Helps peers navigate team transitions' },
          { rating_level: 5, behavioral_indicator: 'Pioneers process improvements during pivot shifts' }
        ]
      },
      clientAdminUser
    );
    libraryCompetencyId = savedComp.competency_id;
    console.log(`- Created global competency: ${libraryCompetencyId}`);

    // 2. Fetch library list
    const library = await competencyService.getLibrary(orgId);
    if (!library || library.length === 0 || !library.some(c => c.name === 'Adaptability & Flexibility')) {
      throw new Error('Verification failed: Global library competency was not successfully saved/fetched');
    }
    console.log('- Global library list fetched successfully');

    // 3. Save modified rating scales
    console.log('Testing saveRatingScales...');
    await competencyService.saveRatingScales(
      orgId,
      [
        { rating_level: 1, label: 'Unacceptable' },
        { rating_level: 2, label: 'Needs Improvement' },
        { rating_level: 3, label: 'Successfully Meets' },
        { rating_level: 4, label: 'Frequently Exceeds' },
        { rating_level: 5, label: 'Exemplary Mastery' }
      ],
      clientAdminUser
    );
    const updatedScales = await competencyService.getRatingScales(orgId);
    if (updatedScales.find(s => s.rating_level === 5).label !== 'Exemplary Mastery') {
      throw new Error('Verification failed: Customized rating scales labels were not updated correctly.');
    }
    console.log('- Saved and fetched customized rating scales successfully');

    // 4. Create Goal using Goal Service (which triggers saveGoalCompetencies)
    console.log('Testing createGoal with COMPETENCY_ASSESSMENT performance_technique...');
    const goalPayload = {
      title: 'Adaptive Development & Core Skills Assessment 2026',
      description: 'Goal to evaluate software adaptability and ownership',
      goal_type: 'individual',
      performance_technique: 'COMPETENCY_ASSESSMENT',
      weight: 30,
      start_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      assigned_to_employee_id: employeeUser.employeeId,
      competencies: [
        {
          competency_library_id: libraryCompetencyId,
          name: 'Adaptability & Flexibility',
          description: 'Thriving under changing business landscapes',
          weight: 100
        }
      ]
    };

    const createdGoal = await goalService.createGoal(orgId, goalPayload, clientAdminUser);
    goalId = createdGoal.goal_id;

    // Verify goal details loaded
    const loadedGoalDetails = await goalService.getGoal(orgId, goalId);
    if (loadedGoalDetails.performance_technique !== 'COMPETENCY_ASSESSMENT' || loadedGoalDetails.competencies.length !== 1) {
      throw new Error('Verification failed: Goal competencies template was not successfully created or read.');
    }
    goalCompetencyId = loadedGoalDetails.competencies[0].goal_competency_id;
    console.log(`- Created goal ID: ${goalId} and mapped competency: ${goalCompetencyId}`);

    // 5. Manager Evaluation
    console.log('Testing submitEvaluation & ratings...');
    // Find assignment ID
    const assignQuery = await query(
      `SELECT assignment_id FROM goal_assignments WHERE goal_id = $1 AND employee_id = $2`,
      [goalId, employeeUser.employeeId]
    );
    assignmentId = assignQuery.rows[0].assignment_id;

    // Retrieve assessment details form
    const assessmentForm = await competencyService.getCoachingDetails(goalId, assignmentId, orgId);
    if (assessmentForm.competencies.length !== 1 || assessmentForm.scales.length !== 5) {
      throw new Error('Verification failed: Assessment coaching details form was invalid.');
    }

    // Manager rates and completes evaluation
    const ratingsPayload = [
      {
        goal_competency_id: goalCompetencyId,
        rating: 5,
        comment: 'Exceeded all expectations during core server pivot changes'
      }
    ];

    const evaluationResult = await competencyService.saveRatings(
      goalId,
      assignmentId,
      orgId,
      {
        ratings: ratingsPayload,
        isSubmit: true,
        outcome: 'ACHIEVED'
      },
      managerUser
    );

    console.log('- Evaluation assignment result:', evaluationResult.assignment);
    if (parseFloat(evaluationResult.assignment.weighted_score || 0) !== 100.00 || evaluationResult.assignment.status !== 'COMPLETED' || evaluationResult.assignment.completion_outcome !== 'ACHIEVED') {
      throw new Error(`Verification failed: Evaluation score (${evaluationResult.assignment.weighted_score}), status (${evaluationResult.assignment.status}), or outcome (${evaluationResult.assignment.completion_outcome}) not correctly calculated/updated.`);
    }
    console.log(`- Manager evaluated results successfully. Final Score: ${evaluationResult.assignment.weighted_score}%, Status: ${evaluationResult.assignment.status}`);

    // 6. Employee acknowledgement
    console.log('Testing acknowledgeAssessment...');
    const ackResult = await competencyService.acknowledgeAssessment(goalId, assignmentId, orgId, employeeUser);
    if (!ackResult.assignment.employee_acknowledged || !ackResult.assignment.acknowledged_at) {
      throw new Error('Verification failed: Acknowledgement was not flagged properly.');
    }
    console.log('- Employee acknowledged assessment successfully');

    // 7. Verify reports data
    console.log('Testing reporting SQL aggregates...');
    const gapReport = await competencyService.getCompetencyGapReport(orgId, {});
    const distReport = await competencyService.getRatingDistributionReport(orgId, {});
    const avgReport = await competencyService.getAverageRatingReport(orgId, {});

    if (gapReport.length === 0 || distReport.length === 0 || avgReport.length === 0) {
      throw new Error('Verification failed: Competency reporting queries returned empty results.');
    }
    console.log(`- Competency Gap Report count: ${gapReport.length}. Distribution Count: ${distReport.length}. Average Rating: ${avgReport[0].avg_rating}`);

    console.log('\n=========================================');
    console.log('🎉 SUCCESS: All PMS Competency Assessment tests passed!');
    console.log('=========================================');

  } catch (err) {
    console.error('❌ Verification script failed with error:', err);
    process.exit(1);
  } finally {
    if (orgId) {
      console.log('Cleaning up test data...');
      await query(`DELETE FROM organizations WHERE organization_id = $1`, [orgId]);
    }
  }
}

run();
