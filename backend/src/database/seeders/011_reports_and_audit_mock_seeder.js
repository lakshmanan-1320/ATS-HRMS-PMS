const { query } = require('../../config/db');

/**
 * 011_reports_and_audit_mock_seeder.js
 * Comprehensive Reports & Audit Log Seeder:
 * 1. Audit Logs (35+ realistic events: Login, Create, Update, Delete across 14 days)
 * 2. Financial Years (FY 2026-2027 ACTIVE, FY 2025-2026 CLOSED)
 * 3. Goal Categories (Engineering, Customer Success, Revenue Growth, People & Culture, Operational Rigor)
 * 4. Goals (15 realistic organizational, departmental & employee goals across 5 departments)
 * 5. Goal Assignments (assigning goals to key employees)
 * 6. KPI Library & Goal KPIs (linked to goals with metrics and progress)
 * 7. Appraisal Cycles (Annual Appraisal Cycle 2025-26) with Self & Manager Appraisals
 * 8. Goal Competencies & Competency Assessments
 */
async function seedReportsAndAuditData() {
  try {
    console.log('[Seeder 011] Starting Reports & Audit Log mock data seeding...');

    // 1. Get organization ID
    const caRow = await query('SELECT organization_id, client_admin_id FROM client_admins LIMIT 1');
    if (!caRow.rows.length) {
      console.log('[Seeder 011] No organization found. Skipping reports/audit seeding.');
      return;
    }
    const organizationId = caRow.rows[0].organization_id;
    const clientAdminId = caRow.rows[0].client_admin_id;

    // Get client admin user id
    const adminUserRes = await query(
      `SELECT user_id, email FROM users WHERE organization_id = $1 AND role = 'client_admin' LIMIT 1`,
      [organizationId]
    );
    const adminUserId = adminUserRes.rows[0]?.user_id || null;

    // 2. Fetch departments and employees
    const depts = (await query('SELECT department_id, name FROM departments WHERE organization_id = $1', [organizationId])).rows;
    const deptMap = {};
    depts.forEach(d => { deptMap[d.name] = d.department_id; });

    const emps = (await query('SELECT employee_id, employee_code, first_name, last_name, email, department_id FROM employees WHERE organization_id = $1', [organizationId])).rows;
    const empEmailMap = {};
    emps.forEach(e => { empEmailMap[e.email] = e; });

    // =========================================================================
    // PART A: SEED 35+ REALISTIC AUDIT LOGS
    // =========================================================================
    console.log('[Seeder 011] Seeding Audit Logs...');
    await query('DELETE FROM audit_logs WHERE organization_id = $1', [organizationId]);

    const auditEvents = [
      // 1-8: Login events
      { actor: 'demo@insight.local', role: 'client_admin', action: 'login', target: 'session', module: 'authentication', daysAgo: 0, ip: '192.168.1.101', status: 'SUCCESS' },
      { actor: 'arjun.sharma@company.com', role: 'manager', action: 'login', target: 'session', module: 'authentication', daysAgo: 0, ip: '192.168.1.142', status: 'SUCCESS' },
      { actor: 'john@example.com', role: 'employee', action: 'login', target: 'session', module: 'authentication', daysAgo: 0, ip: '192.168.1.155', status: 'SUCCESS' },
      { actor: 'meera.reddy@company.com', role: 'manager', action: 'login', target: 'session', module: 'authentication', daysAgo: 1, ip: '192.168.1.112', status: 'SUCCESS' },
      { actor: 'priyesh.shah@company.com', role: 'manager', action: 'login', target: 'session', module: 'authentication', daysAgo: 1, ip: '192.168.1.119', status: 'SUCCESS' },
      { actor: 'demo@insight.local', role: 'client_admin', action: 'login', target: 'session', module: 'authentication', daysAgo: 2, ip: '192.168.1.101', status: 'SUCCESS' },
      { actor: 'anand.kumar@company.com', role: 'employee', action: 'login', target: 'session', module: 'authentication', daysAgo: 2, ip: '192.168.1.168', status: 'SUCCESS' },
      { actor: 'sneha.joshi@company.com', role: 'manager', action: 'login', target: 'session', module: 'authentication', daysAgo: 3, ip: '192.168.1.134', status: 'SUCCESS' },

      // 9-16: Create / Import events
      { actor: 'demo@insight.local', role: 'client_admin', action: 'create_employee', target: 'EMP-040 (Vikram Singhania)', module: 'employee_management', daysAgo: 1, ip: '192.168.1.101', status: 'SUCCESS' },
      { actor: 'demo@insight.local', role: 'client_admin', action: 'create_payroll_component', target: 'Special Allowance (SPECIAL_ALLOWANCE)', module: 'payroll', daysAgo: 2, ip: '192.168.1.101', status: 'SUCCESS' },
      { actor: 'demo@insight.local', role: 'client_admin', action: 'create_leave_plan', target: 'Standard Enterprise Leave Plan 2026', module: 'leave', daysAgo: 3, ip: '192.168.1.101', status: 'SUCCESS' },
      { actor: 'demo@insight.local', role: 'client_admin', action: 'create_salary_revision', target: 'Revision for John Doe (+20%)', module: 'payroll', daysAgo: 4, ip: '192.168.1.101', status: 'SUCCESS' },
      { actor: 'john@example.com', role: 'employee', action: 'create_overtime_request', target: 'Emergency Database Migration (120 min)', module: 'payroll', daysAgo: 2, ip: '192.168.1.155', status: 'SUCCESS' },
      { actor: 'meera.reddy@company.com', role: 'manager', action: 'create_leave_request', target: 'Casual Leave (2 days)', module: 'leave', daysAgo: 4, ip: '192.168.1.112', status: 'SUCCESS' },
      { actor: 'demo@insight.local', role: 'client_admin', action: 'assign_shift', target: 'General Day Shift -> 40 employees', module: 'attendance', daysAgo: 5, ip: '192.168.1.101', status: 'SUCCESS' },
      { actor: 'demo@insight.local', role: 'client_admin', action: 'create_office_location', target: 'insightHCM Chennai (Mangadu)', module: 'attendance', daysAgo: 6, ip: '192.168.1.101', status: 'SUCCESS' },

      // 17-26: Update / Edit events
      { actor: 'demo@insight.local', role: 'client_admin', action: 'update_salary_config', target: 'Salary Config for Arjun Sharma (CTC ₹24,00,000)', module: 'payroll', daysAgo: 1, ip: '192.168.1.101', status: 'SUCCESS' },
      { actor: 'arjun.sharma@company.com', role: 'manager', action: 'approve_leave_request', target: 'Leave Request LR-2026-004', module: 'leave', daysAgo: 2, ip: '192.168.1.142', status: 'SUCCESS' },
      { actor: 'arjun.sharma@company.com', role: 'manager', action: 'approve_regularization', target: 'Regularization for John Doe (09:00 - 18:00)', module: 'attendance', daysAgo: 2, ip: '192.168.1.142', status: 'SUCCESS' },
      { actor: 'demo@insight.local', role: 'client_admin', action: 'update_week_off', target: 'Weekly Off Settings (Saturday & Sunday)', module: 'payroll', daysAgo: 3, ip: '192.168.1.101', status: 'SUCCESS' },
      { actor: 'arjun.sharma@company.com', role: 'manager', action: 'approve_overtime', target: 'Overtime for Meera Reddy (180 min)', module: 'payroll', daysAgo: 3, ip: '192.168.1.142', status: 'SUCCESS' },
      { actor: 'demo@insight.local', role: 'client_admin', action: 'lock_payroll_run', target: 'Payroll Run May 2026 (40 payslips finalized)', module: 'payroll', daysAgo: 4, ip: '192.168.1.101', status: 'SUCCESS' },
      { actor: 'demo@insight.local', role: 'client_admin', action: 'approve_payroll_run', target: 'Payroll Run May 2026 (Calculation Verified)', module: 'payroll', daysAgo: 5, ip: '192.168.1.101', status: 'SUCCESS' },
      { actor: 'demo@insight.local', role: 'client_admin', action: 'generate_payroll_run', target: 'Payroll Run May 2026', module: 'payroll', daysAgo: 5, ip: '192.168.1.101', status: 'SUCCESS' },
      { actor: 'demo@insight.local', role: 'client_admin', action: 'update_attendance_policy', target: 'Standard Shift Policy (Grace: 15 mins)', module: 'attendance', daysAgo: 6, ip: '192.168.1.101', status: 'SUCCESS' },
      { actor: 'demo@insight.local', role: 'client_admin', action: 'update_overtime_settings', target: 'Overtime Multiplier (1.5x / 2.0x)', module: 'payroll', daysAgo: 7, ip: '192.168.1.101', status: 'SUCCESS' },

      // 27-32: Delete / Security events
      { actor: 'demo@insight.local', role: 'client_admin', action: 'delete_adjustment', target: 'Manual deduction adjustment ADJ-904', module: 'payroll', daysAgo: 3, ip: '192.168.1.101', status: 'SUCCESS' },
      { actor: 'demo@insight.local', role: 'client_admin', action: 'revoke_permission', target: 'Emergency Leave Override for Staff', module: 'permission', daysAgo: 4, ip: '192.168.1.101', status: 'SUCCESS' },
      { actor: 'system@insight.local', role: 'system', action: 'session_timeout', target: 'Inactivity logout for demo@insight.local', module: 'security', daysAgo: 5, ip: '192.168.1.101', status: 'SUCCESS' },
      { actor: 'unknown@external.net', role: 'anonymous', action: 'failed_login_attempt', target: 'Invalid password threshold reached', module: 'security', daysAgo: 6, ip: '203.0.113.42', status: 'FAILED' },
      { actor: 'demo@insight.local', role: 'client_admin', action: 'delete_holiday', target: 'Deprecated regional holiday entry', module: 'leave', daysAgo: 7, ip: '192.168.1.101', status: 'SUCCESS' },
      { actor: 'system@insight.local', role: 'system', action: 'security_token_refresh', target: 'Automated JWT rotation for client_admin', module: 'security', daysAgo: 8, ip: '192.168.1.101', status: 'SUCCESS' }
    ];

    const today = new Date();
    for (const evt of auditEvents) {
      const logDate = new Date(today);
      logDate.setDate(today.getDate() - evt.daysAgo);
      logDate.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);

      const emp = empEmailMap[evt.actor];
      const actorName = emp ? `${emp.first_name} ${emp.last_name}` : (evt.actor.includes('demo') ? 'Demo Client Admin' : 'System');

      await query(`
        INSERT INTO audit_logs (
          organization_id, actor_user_id, actor_name, actor_email, actor_role,
          action_name, entity_name, entity_display_name, module_name,
          ip_address, user_agent, browser_name, operating_system, device_type,
          http_method, request_status, new_data, created_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Chrome 128', 'Windows 11', 'DESKTOP',
          'POST', $11, $12, $13
        )
      `, [
        organizationId,
        adminUserId,
        actorName,
        evt.actor,
        evt.role,
        evt.action,
        evt.target,
        evt.target,
        evt.module,
        evt.ip,
        evt.status,
        JSON.stringify({
          action: evt.action,
          target: evt.target,
          status: evt.status,
          module: evt.module,
          timestamp: logDate.toISOString()
        }),
        logDate
      ]);
    }
    console.log(`[Seeder 011] Seeded ${auditEvents.length} realistic audit logs.`);

    // =========================================================================
    // PART B: FINANCIAL YEARS
    // =========================================================================
    console.log('[Seeder 011] Seeding Financial Years...');
    await query('DELETE FROM financial_years WHERE organization_id = $1', [organizationId]);

    const fyActiveIns = await query(`
      INSERT INTO financial_years (organization_id, name, start_date, end_date, status, created_at, updated_at)
      VALUES ($1, 'FY 2026-2027', '2026-04-01', '2027-03-31', 'ACTIVE', NOW(), NOW())
      RETURNING financial_year_id
    `, [organizationId]);
    const activeFyId = fyActiveIns.rows[0].financial_year_id;

    const fyPastIns = await query(`
      INSERT INTO financial_years (organization_id, name, start_date, end_date, status, created_at, updated_at)
      VALUES ($1, 'FY 2025-2026', '2025-04-01', '2026-03-31', 'CLOSED', NOW(), NOW())
      RETURNING financial_year_id
    `, [organizationId]);
    const pastFyId = fyPastIns.rows[0].financial_year_id;

    // =========================================================================
    // PART C: GOAL CATEGORIES
    // =========================================================================
    console.log('[Seeder 011] Seeding Goal Categories...');
    await query('DELETE FROM goal_categories WHERE organization_id = $1', [organizationId]);

    const categoriesList = [
      'Engineering & Product Excellence',
      'Customer Success & SLA Delivery',
      'Enterprise Revenue & Growth',
      'People, Culture & Talent Retention',
      'Operational Rigor & Compliance'
    ];

    const categoryMap = {};
    for (const cName of categoriesList) {
      const catRes = await query(`
        INSERT INTO goal_categories (organization_id, name, is_active, created_at, updated_at)
        VALUES ($1, $2, true, NOW(), NOW())
        RETURNING category_id
      `, [organizationId, cName]);
      categoryMap[cName] = catRes.rows[0].category_id;
    }

    // =========================================================================
    // PART D: GOALS & ASSIGNMENTS ACROSS 5 DEPARTMENTS
    // =========================================================================
    console.log('[Seeder 011] Seeding 15 Realistic Goals across departments...');
    await query('DELETE FROM goal_assignments WHERE organization_id = $1', [organizationId]);
    await query('DELETE FROM goals WHERE organization_id = $1', [organizationId]);

    const goalsPlan = [
      // Tech Consulting
      {
        title: 'Core Platform Cloud Architecture Migration Phase 2',
        desc: 'Migrate legacy microservices to high-availability Kubernetes cluster with zero-downtime rolling updates.',
        dept: 'Tech Consulting',
        empEmail: 'arjun.sharma@company.com',
        type: 'department',
        status: 'COMPLETED',
        priority: 'HIGH',
        progress: 100,
        weight: 30,
        startDate: '2026-04-01',
        dueDate: '2026-06-30',
        cat: 'Engineering & Product Excellence'
      },
      {
        title: 'Implement Real-time Biometric Attendance Webhook Ingestion',
        desc: 'Build high-throughput event listener for hardware biometric clocks with automatic reconciliation fallback.',
        dept: 'Tech Consulting',
        empEmail: 'john@example.com',
        type: 'individual',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        progress: 80,
        weight: 25,
        startDate: '2026-05-01',
        dueDate: '2026-09-30',
        cat: 'Engineering & Product Excellence'
      },
      {
        title: 'Achieve 99.95% API SLA and Sub-150ms P95 Latency',
        desc: 'Profile Redis cache layers, optimize SQL index hot-spots, and eliminate connection contention.',
        dept: 'Tech Consulting',
        empEmail: 'meera.reddy@company.com',
        type: 'individual',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        progress: 85,
        weight: 25,
        startDate: '2026-04-15',
        dueDate: '2026-09-30',
        cat: 'Engineering & Product Excellence'
      },
      {
        title: 'Complete Comprehensive End-to-End Automated Regression Suite',
        desc: 'Implement Playwright smoke tests for payroll calculation, leave approval workflows, and tenant onboarding.',
        dept: 'Tech Consulting',
        empEmail: 'anand.kumar@company.com',
        type: 'individual',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        progress: 65,
        weight: 20,
        startDate: '2026-05-01',
        dueDate: '2026-10-31',
        cat: 'Engineering & Product Excellence'
      },

      // Customer Operations
      {
        title: 'Reduce Mean Time to Resolution (MTTR) Below 4 Hours',
        desc: 'Streamline Tier-2 escalation pipelines and institute customer callback protocol within 30 minutes.',
        dept: 'Customer Operations',
        empEmail: 'priyesh.shah@company.com',
        type: 'department',
        status: 'COMPLETED',
        priority: 'HIGH',
        progress: 100,
        weight: 30,
        startDate: '2026-04-01',
        dueDate: '2026-06-30',
        cat: 'Customer Success & SLA Delivery'
      },
      {
        title: 'Achieve CSAT Rating of 4.8+ on Enterprise Accounts',
        desc: 'Conduct weekly service reviews and quarterly business reviews with top 10 enterprise tenants.',
        dept: 'Customer Operations',
        empEmail: 'deepak.joshi@company.com',
        type: 'individual',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        progress: 90,
        weight: 25,
        startDate: '2026-04-01',
        dueDate: '2026-09-30',
        cat: 'Customer Success & SLA Delivery'
      },
      {
        title: 'Roll Out Interactive Customer Help Center & Knowledge Base',
        desc: 'Author 50 illustrated runbooks and self-service video guides for standard HR workflows.',
        dept: 'Customer Operations',
        empEmail: 'kavita.patil@company.com',
        type: 'individual',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        progress: 70,
        weight: 25,
        startDate: '2026-05-15',
        dueDate: '2026-11-30',
        cat: 'Customer Success & SLA Delivery'
      },

      // Digital Marketing
      {
        title: 'Generate 500 Qualified Enterprise Inbound Demos in Q2',
        desc: 'Launch multi-channel performance campaign targeting HR heads and CFOs in BFSI and IT sectors.',
        dept: 'Digital Marketing',
        empEmail: 'sneha.joshi@company.com',
        type: 'department',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        progress: 75,
        weight: 35,
        startDate: '2026-04-01',
        dueDate: '2026-09-30',
        cat: 'Enterprise Revenue & Growth'
      },
      {
        title: 'Increase Organic Search Visibility by 60% via SEO Thought Leadership',
        desc: 'Publish comprehensive state-of-compliance reports and statutory payroll deduction guides.',
        dept: 'Digital Marketing',
        empEmail: 'rohit.sharma@company.com',
        type: 'individual',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        progress: 60,
        weight: 30,
        startDate: '2026-04-15',
        dueDate: '2026-10-31',
        cat: 'Enterprise Revenue & Growth'
      },
      {
        title: 'Execute Annual HCM Industry Summit 2026',
        desc: 'Coordinate virtual conference hosting 1,200 HR leaders and 8 industry keynote panels.',
        dept: 'Digital Marketing',
        empEmail: 'pooja.deshmukh@company.com',
        type: 'individual',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        progress: 45,
        weight: 35,
        startDate: '2026-06-01',
        dueDate: '2026-12-15',
        cat: 'Enterprise Revenue & Growth'
      },

      // Finance & Accounts
      {
        title: 'Automate Monthly Payroll Reconciliation & Multi-State GST Filing',
        desc: 'Integrate automated ledger reconciliation with ERP and statutory compliance portals.',
        dept: 'Finance & Accounts',
        empEmail: 'manish.tiwari@company.com',
        type: 'department',
        status: 'COMPLETED',
        priority: 'HIGH',
        progress: 100,
        weight: 35,
        startDate: '2026-04-01',
        dueDate: '2026-06-30',
        cat: 'Operational Rigor & Compliance'
      },
      {
        title: 'Implement Stringent Vendor Cost Audit & Contract Renegotiations',
        desc: 'Audit SaaS and cloud vendor expenses to achieve 12% recurring cost savings.',
        dept: 'Finance & Accounts',
        empEmail: 'rekha.nair@company.com',
        type: 'individual',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        progress: 80,
        weight: 35,
        startDate: '2026-04-01',
        dueDate: '2026-09-30',
        cat: 'Operational Rigor & Compliance'
      },

      // HR Recruitment
      {
        title: 'Reduce Average Time-to-Hire to Under 21 Days',
        desc: 'Streamline hiring pipeline from resume shortlisting to final leadership rounds.',
        dept: 'HR Recruitment',
        empEmail: 'ananya.iyer@company.com',
        type: 'department',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        progress: 70,
        weight: 35,
        startDate: '2026-04-01',
        dueDate: '2026-09-30',
        cat: 'People, Culture & Talent Retention'
      },
      {
        title: 'Achieve 95% New Hire Onboarding Satisfaction Rating',
        desc: 'Digitize Day-1 asset provisioning, welcome kits, and mentor pairing program.',
        dept: 'HR Recruitment',
        empEmail: 'karthik.pillai@company.com',
        type: 'individual',
        status: 'COMPLETED',
        priority: 'MEDIUM',
        progress: 100,
        weight: 35,
        startDate: '2026-04-01',
        dueDate: '2026-07-31',
        cat: 'People, Culture & Talent Retention'
      },
      {
        title: 'Launch Annual Leadership Mentorship Program across Tech & Ops',
        desc: 'Pair 20 high-potential senior executives with executive mentors for quarterly growth tracks.',
        dept: 'HR Recruitment',
        empEmail: 'divya.menon@company.com',
        type: 'individual',
        status: 'IN_PROGRESS',
        priority: 'LOW',
        progress: 50,
        weight: 30,
        startDate: '2026-05-01',
        dueDate: '2026-11-30',
        cat: 'People, Culture & Talent Retention'
      }
    ];

    const seededGoals = [];
    for (let idx = 0; idx < goalsPlan.length; idx++) {
      const g = goalsPlan[idx];
      const deptId = deptMap[g.dept] || null;
      const emp = empEmailMap[g.empEmail];
      const catId = categoryMap[g.cat] || null;

      const goalRes = await query(`
        INSERT INTO goals (
          organization_id, client_admin_id, financial_year_id, goal_category_id,
          goal_category, title, description, goal_type, parent_goal_id,
          assigned_to_employee_id, assigned_to_department_id, start_date, due_date,
          weight, progress, priority, status, pending_completion,
          goal_code, performance_technique, visibility,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, null,
          $9, $10, $11, $12,
          $13, $14, $15, $16, false,
          $17, 'KPI', $18,
          NOW(), NOW()
        ) RETURNING goal_id
      `, [
        organizationId, clientAdminId, activeFyId, catId,
        g.cat, g.title, g.desc, g.type,
        emp?.employee_id || null, deptId, g.startDate, g.dueDate,
        g.weight, g.progress, g.priority, g.status,
        `GOAL-${String(idx + 1).padStart(3, '0')}`,
        g.type === 'department' ? 'DEPARTMENT' : 'ORGANIZATION'
      ]);

      const goalId = goalRes.rows[0].goal_id;
      seededGoals.push({ goalId, ...g, employee_id: emp?.employee_id });

      // Create goal assignment record
      if (emp) {
        await query(`
          INSERT INTO goal_assignments (
            organization_id, goal_id, employee_id, status, progress,
            assigned_at, created_at, updated_at, employee_acknowledged, acknowledged_at, completion_outcome
          ) VALUES (
            $1, $2, $3, $4, $5,
            NOW(), NOW(), NOW(), true, NOW(), $6
          )
        `, [organizationId, goalId, emp.employee_id, g.status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE', g.progress, g.status === 'COMPLETED' ? 'ACHIEVED' : null]);
      }
    }
    console.log(`[Seeder 011] Seeded ${seededGoals.length} goals with assignments.`);

    // =========================================================================
    // PART E: KPI LIBRARY & GOAL KPIS
    // =========================================================================
    console.log('[Seeder 011] Seeding KPI Library & Goal KPIs...');
    await query('DELETE FROM goal_kpis WHERE organization_id = $1', [organizationId]);
    await query('DELETE FROM kpi_library WHERE organization_id = $1', [organizationId]);

    const kpiLibraryEntries = [
      { title: 'API Availability & SLA', desc: 'Uptime percentage for platform gateway', type: 'OUTCOME', target: 99.95, unit: '%' },
      { title: 'Code Review Turnaround Time', desc: 'Average hours from PR creation to first review', type: 'OUTPUT', target: 4.0, unit: 'Hours' },
      { title: 'Ticket First Contact Resolution', desc: 'Percentage of customer tickets resolved in initial response', type: 'OUTCOME', target: 85.0, unit: '%' },
      { title: 'Customer CSAT Score', desc: 'Average survey rating from enterprise client contacts', type: 'LEADING', target: 4.8, unit: 'Stars' },
      { title: 'Enterprise Inbound MQLs', desc: 'Marketing qualified leads per quarter', type: 'OUTPUT', target: 500.0, unit: 'Leads' },
      { title: 'Payroll Accuracy Rate', desc: 'Zero error monthly payroll disbursements percentage', type: 'OUTCOME', target: 100.0, unit: '%' },
      { title: 'Time to Hire Critical Roles', desc: 'Calendar days from job requisition approval to offer acceptance', type: 'LAGGING', target: 21.0, unit: 'Days' }
    ];

    for (const kl of kpiLibraryEntries) {
      await query(`
        INSERT INTO kpi_library (
          organization_id, title, description, measurement_type,
          target_value, unit, frequency, kpi_type, priority, is_active, created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'NUMBER',
          $4, $5, 'MONTHLY', $6, 'HIGH', true, NOW(), NOW()
        )
      `, [organizationId, kl.title, kl.desc, kl.target, kl.unit, kl.type]);
    }

    // Attach KPIs to seeded goals
    for (let i = 0; i < Math.min(seededGoals.length, 8); i++) {
      const g = seededGoals[i];
      const kl = kpiLibraryEntries[i % kpiLibraryEntries.length];
      const achVal = Math.round(kl.target * (g.progress / 100) * 10) / 10;

      await query(`
        INSERT INTO goal_kpis (
          organization_id, goal_id, kpi_code, title, description,
          measurement_type, target_value, approved_value, weight_percentage,
          completion_percentage, status, kpi_type, frequency, priority, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          'NUMBER', $6, $7, 25.00,
          $8, $9, $10, 'MONTHLY', 'HIGH', NOW(), NOW()
        )
      `, [
        organizationId, g.goalId, `KPI-${String(i + 1).padStart(6, '0')}`, kl.title, kl.desc,
        kl.target, achVal, g.progress, g.status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE', kl.type
      ]);
    }
    console.log('[Seeder 011] Seeded KPI library and goal KPIs.');

    // =========================================================================
    // PART F: APPRAISAL CYCLE & DETAILED APPRAISALS
    // =========================================================================
    console.log('[Seeder 011] Seeding Appraisal Cycles & Appraisals...');
    await query('DELETE FROM manager_appraisals WHERE cycle_id IN (SELECT appraisal_cycle_id FROM appraisal_cycles WHERE client_admin_id = $1)', [clientAdminId]);
    await query('DELETE FROM self_appraisals WHERE cycle_id IN (SELECT appraisal_cycle_id FROM appraisal_cycles WHERE client_admin_id = $1)', [clientAdminId]);
    await query('DELETE FROM appraisal_cycles WHERE client_admin_id = $1', [clientAdminId]);

    const cycleRes = await query(`
      INSERT INTO appraisal_cycles (
        client_admin_id, financial_year_id, name, period_start, period_end,
        self_appraisal_deadline, manager_review_deadline, status, created_at, updated_at
      ) VALUES (
        $1, $2, 'Annual Appraisal Cycle 2025-26', '2025-04-01', '2026-03-31',
        '2026-04-15', '2026-04-30', 'active', NOW(), NOW()
      ) RETURNING appraisal_cycle_id
    `, [clientAdminId, pastFyId]);

    const cycleId = cycleRes.rows[0].appraisal_cycle_id;

    // Seed self and manager appraisals for top employees
    const appraisalSample = [
      { email: 'john@example.com', mgrEmail: 'arjun.sharma@company.com', selfRating: 5, mgrRating: '4.80', score: 92.5, comment: 'Exceptional ownership and system architecture work.' },
      { email: 'meera.reddy@company.com', mgrEmail: 'arjun.sharma@company.com', selfRating: 4, mgrRating: '4.50', score: 88.0, comment: 'Strong leadership on backend reliability.' },
      { email: 'anand.kumar@company.com', mgrEmail: 'arjun.sharma@company.com', selfRating: 4, mgrRating: '4.20', score: 84.0, comment: 'Consistent testing automation contributor.' },
      { email: 'deepak.joshi@company.com', mgrEmail: 'priyesh.shah@company.com', selfRating: 5, mgrRating: '4.60', score: 90.0, comment: 'Top performer in customer satisfaction.' },
      { email: 'kavita.patil@company.com', mgrEmail: 'priyesh.shah@company.com', selfRating: 4, mgrRating: '4.10', score: 82.0, comment: 'Excellent execution on documentation.' },
      { email: 'rohit.sharma@company.com', mgrEmail: 'sneha.joshi@company.com', selfRating: 4, mgrRating: '4.40', score: 86.5, comment: 'Key driver of SEO traffic expansion.' }
    ];

    for (const ap of appraisalSample) {
      const emp = empEmailMap[ap.email];
      const mgr = empEmailMap[ap.mgrEmail];
      if (!emp) continue;

      await query(`
        INSERT INTO self_appraisals (
          employee_id, cycle_id, overall_comment, status, submitted_at,
          self_rating, achievements, challenges, learnings, created_at, updated_at
        ) VALUES (
          $1, $2, 'Met all core targets for the fiscal cycle with timely module deliveries.',
          'submitted', '2026-04-12 14:30:00+00', $3,
          'Spearheaded core workflow modularization and zero-downtime database scripts.',
          'Cross-timezone dependency management during peak sprint cycle.',
          'Learned advanced PostgreSQL tuning and distributed transaction isolation.',
          NOW(), NOW()
        )
      `, [emp.employee_id, cycleId, ap.selfRating]);

      if (mgr) {
        await query(`
          INSERT INTO manager_appraisals (
            employee_id, manager_id, cycle_id, overall_comment, final_rating,
            final_score, status, submitted_at, promotion_recommendation, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, 'submitted', '2026-04-28 17:00:00+00', 'RECOMMENDED', NOW(), NOW()
          )
        `, [emp.employee_id, mgr.employee_id, cycleId, ap.comment, ap.mgrRating, ap.score]);
      }
    }
    console.log(`[Seeder 011] Seeded appraisal cycle and ${appraisalSample.length} appraisal records.`);

    // =========================================================================
    // PART G: COMPETENCY ASSESSMENTS
    // =========================================================================
    console.log('[Seeder 011] Seeding Competency Assessments...');
    await query('DELETE FROM competency_assessments WHERE organization_id = $1', [organizationId]);
    await query('DELETE FROM goal_competencies WHERE goal_id IN (SELECT goal_id FROM goals WHERE organization_id = $1)', [organizationId]);

    const compLibraryItems = (await query('SELECT competency_id, name FROM competency_library WHERE organization_id = $1 LIMIT 5', [organizationId])).rows;
    
    if (compLibraryItems.length > 0 && seededGoals.length > 0) {
      const ratingsSample = [4, 5, 4, 3, 5];
      for (let gIdx = 0; gIdx < Math.min(seededGoals.length, 3); gIdx++) {
        const goal = seededGoals[gIdx];
        const gaRes = await query('SELECT assignment_id FROM goal_assignments WHERE goal_id = $1 LIMIT 1', [goal.goalId]);
        const assignmentId = gaRes.rows[0]?.assignment_id;

        if (assignmentId) {
          for (let cIdx = 0; cIdx < compLibraryItems.length; cIdx++) {
            const item = compLibraryItems[cIdx];
            const gcRes = await query(`
              INSERT INTO goal_competencies (
                goal_id, competency_library_id, name, description, weight, display_order, created_at
              ) VALUES ($1, $2, $3, 'Behavioral indicator rating', 20.00, $4, NOW())
              RETURNING goal_competency_id
            `, [goal.goalId, item.competency_id, item.name, cIdx + 1]);

            const gcId = gcRes.rows[0].goal_competency_id;
            const ratingVal = ratingsSample[(gIdx + cIdx) % ratingsSample.length];

            await query(`
              INSERT INTO competency_assessments (
                organization_id, goal_id, assignment_id, goal_competency_id,
                rating, comment, rated_by, rated_at, created_at, updated_at
              ) VALUES (
                $1, $2, $3, $4,
                $5, 'Consistently demonstrates exceptional proficiency.', $6, NOW(), NOW(), NOW()
              )
            `, [organizationId, goal.goalId, assignmentId, gcId, ratingVal, adminUserId]);
          }
        }
      }
      console.log(`[Seeder 011] Seeded competency assessments across goals.`);
    }

    console.log('[Seeder 011] Complete Reports & Audit Log seeding successfully finished!');

  } catch (err) {
    console.error('[Seeder 011] Error seeding reports and audit data:', err);
    throw err;
  }
}

module.exports = seedReportsAndAuditData;
