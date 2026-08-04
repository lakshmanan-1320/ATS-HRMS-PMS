const request = require('supertest');
const app = require('../../src/app');
const { query } = require('../../src/config/db');
const { signToken } = require('../../src/utils/jwt');
const crypto = require('crypto');

describe('Competency Assessment Performance Technique E2E Integration Tests', () => {
  let orgId;
  let clientAdminUser;
  let managerUser;
  let employeeUser;
  let adminToken;
  let managerToken;
  let employeeToken;

  let libraryCompetencyId;
  let goalId;
  let assignmentId;
  let goalCompetencyId;

  beforeAll(async () => {
    // 1. Create a test organization
    const orgRes = await query(
      `INSERT INTO organizations (name) 
       VALUES ($1) RETURNING organization_id`,
      ['Test Org Competencies']
    );
    orgId = orgRes.rows[0].organization_id;

    // Create a mock active performance configuration for this organization
    const configRes = await query(
      `INSERT INTO performance_configurations (
        organization_id, cycle_name, cycle_type, start_date, end_date, 
        goal_setting_direction, review_frequency, goal_approval_required, 
        allow_goal_edit_after_approval, allow_employee_goal_creation, 
        allow_manager_goal_creation, require_goal_weight_validation, 
        max_goals_per_employee, status
      ) VALUES ($1, 'Active 2026', 'ANNUAL', CURRENT_DATE, CURRENT_DATE + 30, 'HYBRID', 'QUARTERLY', FALSE, TRUE, TRUE, TRUE, FALSE, 10, 'ACTIVE') RETURNING performance_configuration_id`,
      [orgId]
    );
    const configId = configRes.rows[0].performance_configuration_id;

    // Create default rating scales for the org (normally handled in migration/registration, let's seed here)
    for (let i = 1; i <= 5; i++) {
      const labels = ['', 'Below', 'Developing', 'Meets', 'Exceeds', 'Outstanding'];
      await query(
        `INSERT INTO competency_rating_scales (organization_id, rating_level, label)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [orgId, i, labels[i]]
      );
    }

    // 2. Create test employees (client_admin, manager, employee)
    const clientAdminEmpRes = await query(
      `INSERT INTO employees (organization_id, first_name, last_name, email, designation, employee_code)
       VALUES ($1, 'Admin', 'User', 'admin@testcomp.com', 'Admin', 'T_EMP_ADMIN') RETURNING employee_id`,
      [orgId]
    );
    const clientAdminEmpId = clientAdminEmpRes.rows[0].employee_id;

    const managerEmpRes = await query(
      `INSERT INTO employees (organization_id, first_name, last_name, email, designation, employee_code)
       VALUES ($1, 'Manager', 'User', 'manager@testcomp.com', 'Manager', 'T_EMP_MGR') RETURNING employee_id`,
      [orgId]
    );
    const managerEmpId = managerEmpRes.rows[0].employee_id;

    const employeeEmpRes = await query(
      `INSERT INTO employees (organization_id, first_name, last_name, email, designation, employee_code, manager_employee_id)
       VALUES ($1, 'Employee', 'User', 'employee@testcomp.com', 'Developer', 'T_EMP_DEV', $2) RETURNING employee_id`,
      [orgId, managerEmpId]
    );
    const employeeEmpId = employeeEmpRes.rows[0].employee_id;

    // 3. Create users
    const adminUserRes = await query(
      `INSERT INTO users (organization_id, employee_id, email, password_hash, role)
       VALUES ($1, $2, 'admin@testcomp.com', 'dummyhash', 'client_admin') RETURNING user_id`,
      [orgId, clientAdminEmpId]
    );
    clientAdminUser = adminUserRes.rows[0];

    const managerUserRes = await query(
      `INSERT INTO users (organization_id, employee_id, email, password_hash, role)
       VALUES ($1, $2, 'manager@testcomp.com', 'dummyhash', 'manager') RETURNING user_id`,
      [orgId, managerEmpId]
    );
    managerUser = managerUserRes.rows[0];

    const employeeUserRes = await query(
      `INSERT INTO users (organization_id, employee_id, email, password_hash, role)
       VALUES ($1, $2, 'employee@testcomp.com', 'dummyhash', 'employee') RETURNING user_id`,
      [orgId, employeeEmpId]
    );
    employeeUser = employeeUserRes.rows[0];

    // Enable competency_assessment module for the organization
    const clientAdminRes = await query(
      `INSERT INTO client_admins (organization_id, full_name, email, company_name)
       VALUES ($1, 'Admin User', 'admin@testcomp.com', 'Test Org Competencies') RETURNING client_admin_id`,
      [orgId]
    );
    const clientAdminId = clientAdminRes.rows[0].client_admin_id;

    await query(
      `INSERT INTO client_modules (client_admin_id, module_key, module_name, is_enabled)
       VALUES ($1, 'competency_assessment', 'Competency Assessment', TRUE) ON CONFLICT (client_admin_id, module_key) DO UPDATE SET is_enabled = TRUE`,
      [clientAdminId]
    );

    // 4. Generate JWT tokens
    adminToken = signToken({
      userId: clientAdminUser.user_id,
      employeeId: clientAdminEmpId,
      role: 'client_admin',
      email: 'admin@testcomp.com',
      organizationId: orgId,
      sessionId: crypto.randomUUID()
    });

    managerToken = signToken({
      userId: managerUser.user_id,
      employeeId: managerEmpId,
      role: 'manager',
      email: 'manager@testcomp.com',
      organizationId: orgId,
      sessionId: crypto.randomUUID()
    });

    employeeToken = signToken({
      userId: employeeUser.user_id,
      employeeId: employeeEmpId,
      role: 'employee',
      email: 'employee@testcomp.com',
      organizationId: orgId,
      sessionId: crypto.randomUUID()
    });
  });

  afterAll(async () => {
    // Cleanup everything
    if (orgId) {
      await query(`DELETE FROM organizations WHERE organization_id = $1`, [orgId]);
    }
  });

  // --- Tests ---

  test('1. Client Admin can create and retrieve library competency', async () => {
    // Create competency in the library
    const createRes = await request(app)
      .post('/api/client-admin/competency-assessment/competency-library')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Technical Mastery',
        description: 'Demonstrating deep expertise in core technologies',
        indicators: [
          { rating_level: 1, behavioral_indicator: 'Struggles with basic concepts' },
          { rating_level: 2, behavioral_indicator: 'Requires supervision on routine tasks' },
          { rating_level: 3, behavioral_indicator: 'Independently designs and delivers standard solutions' },
          { rating_level: 4, behavioral_indicator: 'Mentors others and defines code quality standards' },
          { rating_level: 5, behavioral_indicator: 'Recognized industry/org expert driving engineering vision' }
        ]
      });

    expect(createRes.statusCode).toBe(200);
    expect(createRes.body.data).toHaveProperty('competency_id');
    libraryCompetencyId = createRes.body.data.competency_id;

    // Retrieve library list
    const getListRes = await request(app)
      .get('/api/client-admin/competency-assessment/competency-library')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getListRes.statusCode).toBe(200);
    expect(getListRes.body.data.length).toBeGreaterThanOrEqual(1);
    const techMastery = getListRes.body.data.find(c => c.name === 'Technical Mastery');
    expect(techMastery).toBeDefined();
    expect(techMastery.indicators.length).toBe(5);
  });

  test('2. Client Admin can update and fetch 5-point rating scales', async () => {
    const getScalesRes = await request(app)
      .get('/api/client-admin/competency-assessment/competency-rating-scales')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getScalesRes.statusCode).toBe(200);
    expect(getScalesRes.body.data.length).toBe(5);

    // Save customized scales labels
    const saveScalesRes = await request(app)
      .put('/api/client-admin/competency-assessment/competency-rating-scales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send([
        { rating_level: 1, label: 'Unsatisfactory' },
        { rating_level: 2, label: 'Inconsistent' },
        { rating_level: 3, label: 'Competent' },
        { rating_level: 4, label: 'Highly Commendable' },
        { rating_level: 5, label: 'Mastery Level' }
      ]);

    expect(saveScalesRes.statusCode).toBe(200);
  });

  test('3. Client Admin can create Goal using COMPETENCY_ASSESSMENT technique', async () => {
    // Create goal
    const goalRes = await request(app)
      .post('/api/client-admin/goals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Core Development Goals & Technical Competencies',
        description: 'Goal to evaluate software engineering competencies for 2026',
        goal_type: 'individual',
        performance_technique: 'COMPETENCY_ASSESSMENT',
        weight: 20,
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        assigned_to_employee_id: employeeUser.employee_id,
        competencies: [
          {
            competency_library_id: libraryCompetencyId,
            name: 'Technical Mastery',
            description: 'Demonstrating deep expertise in core technologies',
            weight: 100
          }
        ]
      });

    expect(goalRes.statusCode).toBe(200);
    expect(goalRes.body).toHaveProperty('goal_id');
    goalId = goalRes.body.goal_id;

    // Verify template competencies were saved
    const getGoalRes = await request(app)
      .get(`/api/client-admin/goals/${goalId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getGoalRes.statusCode).toBe(200);
    expect(getGoalRes.body.performance_technique).toBe('COMPETENCY_ASSESSMENT');
    expect(getGoalRes.body.competencies.length).toBe(1);
    goalCompetencyId = getGoalRes.body.competencies[0].goal_competency_id;
  });

  test('4. Manager can retrieve employee assessment form and submit rating evaluation', async () => {
    // Find assignment ID
    const assignQuery = await query(
      `SELECT assignment_id FROM goal_assignments WHERE goal_id = $1 AND employee_id = $2`,
      [goalId, employeeUser.employee_id]
    );
    expect(assignQuery.rows.length).toBe(1);
    assignmentId = assignQuery.rows[0].assignment_id;

    // Retrieve assessment template details via getCoachingDetails
    const formRes = await request(app)
      .get(`/api/client-admin/competency-assessment/goals/${goalId}/assignments/${assignmentId}/competency-assessment`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(formRes.statusCode).toBe(200);
    expect(formRes.body.data.competencies.length).toBe(1);
    expect(formRes.body.data.scales.length).toBe(5);

    // Manager saves evaluation and completes it
    const saveEvalRes = await request(app)
      .post(`/api/client-admin/competency-assessment/goals/${goalId}/assignments/${assignmentId}/competency-assessment`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        ratings: [
          {
            goal_competency_id: goalCompetencyId,
            rating: 4,
            comment: 'Consistently provides high-quality coding mentoring'
          }
        ],
        isSubmit: true,
        outcome: 'ACHIEVED'
      });

    expect(saveEvalRes.statusCode).toBe(200);
    expect(parseFloat(saveEvalRes.body.data.assignment.weighted_score)).toBe(80.00); // 4/5 * 100
    expect(saveEvalRes.body.data.assignment.status).toBe('COMPLETED');
    expect(saveEvalRes.body.data.assignment.completion_outcome).toBe('ACHIEVED');
  });

  test('5. Employee can view results and acknowledge assessment', async () => {
    // Acknowledge assessment
    const ackRes = await request(app)
      .post(`/api/client-admin/competency-assessment/goals/${goalId}/assignments/${assignmentId}/acknowledge`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(ackRes.statusCode).toBe(200);
    expect(ackRes.body.data.assignment.employee_acknowledged).toBe(true);
    expect(ackRes.body.data.assignment.acknowledged_at).not.toBeNull();
  });

  test('6. Client Admin can query reporting endpoints', async () => {
    // Gap analysis report
    const gapRes = await request(app)
      .get('/api/client-admin/competency-assessment/reports/gap')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(gapRes.statusCode).toBe(200);
    expect(gapRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(parseFloat(gapRes.body.data[0].actual_rating)).toBe(4.00);
    expect(parseFloat(gapRes.body.data[0].gap_score)).toBe(-1.00); // 4 - 5 target

    // Distribution report
    const distRes = await request(app)
      .get('/api/client-admin/competency-assessment/reports/distribution')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(distRes.statusCode).toBe(200);
    expect(distRes.body.data.length).toBeGreaterThanOrEqual(1);

    // Average ratings report
    const avgRes = await request(app)
      .get('/api/client-admin/competency-assessment/reports/average')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(avgRes.statusCode).toBe(200);
    expect(avgRes.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
