const { query, withTransaction } = require('../../config/db');

/**
 * 010_payroll_mock_seeder.js
 * Comprehensive End-to-End Payroll & Compensation Seeder:
 * 1. Dynamic Payroll Components (Basic, HRA, Conveyance, Medical, Special Allowance [balancing], PF, PT, Employer PF)
 * 2. Organization Week Off Settings & Global Config (Sun + Sat)
 * 3. Dynamic Versioned Salary Configurations & Components for ALL 40 employees
 * 4. Realistic Salary Revisions & Increments (EFFECTIVE & PENDING)
 * 5. Legacy Salary Structures (Executive, Manager, Senior Executive, Standard Employee)
 * 6. Employee Salary Assignments for all 40 employees
 * 7. Overtime Settings & Requests (4 PENDING, 4 APPROVED)
 * 8. 4 Monthly Payroll Runs (Feb, Mar, Apr, May 2026) in LOCKED state
 * 9. Itemized Payslips (employee_payrolls) for all 40 employees across all 4 runs
 * 10. Payroll Run Action Audit Logs
 */
async function seedPayrollData() {
  try {
    console.log('[Seeder 010] Starting Complete HRMS Payroll & Compensation mock data seeding...');

    // 1. Get organization ID
    const caRow = await query('SELECT organization_id FROM client_admins LIMIT 1');
    if (!caRow.rows.length) {
      console.log('[Seeder 010] No organization found. Skipping payroll seeding.');
      return;
    }
    const organizationId = caRow.rows[0].organization_id;

    // Get client admin user id
    const adminUserRes = await query(
      `SELECT user_id FROM users WHERE organization_id = $1 AND role = 'client_admin' LIMIT 1`,
      [organizationId]
    );
    const adminUserId = adminUserRes.rows[0]?.user_id || null;

    // 2. Fetch all 40 employees with hierarchy levels
    const empRes = await query(`
      SELECT e.employee_id, e.employee_code, e.first_name, e.last_name, e.email,
             e.hierarchy_level_id, hl.level_code
      FROM employees e
      LEFT JOIN hierarchy_levels hl ON e.hierarchy_level_id = hl.hierarchy_level_id
      WHERE e.organization_id = $1 AND e.status = 'active'
    `, [organizationId]);

    const employees = empRes.rows;
    if (!employees.length) {
      console.log('[Seeder 010] No employees found. Skipping payroll seeding.');
      return;
    }

    const empMap = {};
    employees.forEach(e => { empMap[e.email] = e; });

    // =========================================================================
    // PART A: DYNAMIC PAYROLL COMPONENTS
    // =========================================================================
    console.log('[Seeder 010] Seeding Dynamic Payroll Components...');

    const componentsDefinition = [
      {
        name: 'Basic Salary',
        code: 'BASIC',
        type: 'EARNING',
        category: 'BASIC',
        basis: 'GROSS',
        default_val: 50.00,
        order: 1,
        is_taxable: true,
        include_ctc: true,
        include_gross: true,
        is_mandatory: true,
        is_balancing: false
      },
      {
        name: 'House Rent Allowance',
        code: 'HRA',
        type: 'EARNING',
        category: 'ALLOWANCE',
        basis: 'BASIC',
        default_val: 40.00,
        order: 2,
        is_taxable: true,
        include_ctc: true,
        include_gross: true,
        is_mandatory: true,
        is_balancing: false
      },
      {
        name: 'Conveyance Allowance',
        code: 'CONVEYANCE',
        type: 'EARNING',
        category: 'ALLOWANCE',
        basis: 'FIXED_AMOUNT',
        default_val: 1600.00,
        order: 3,
        is_taxable: false,
        include_ctc: true,
        include_gross: true,
        is_mandatory: false,
        is_balancing: false
      },
      {
        name: 'Medical Allowance',
        code: 'MEDICAL',
        type: 'EARNING',
        category: 'ALLOWANCE',
        basis: 'FIXED_AMOUNT',
        default_val: 1250.00,
        order: 4,
        is_taxable: false,
        include_ctc: true,
        include_gross: true,
        is_mandatory: false,
        is_balancing: false
      },
      {
        name: 'Special Allowance',
        code: 'SPECIAL_ALLOWANCE',
        type: 'EARNING',
        category: 'ALLOWANCE',
        basis: 'FIXED_AMOUNT',
        default_val: 0.00,
        order: 5,
        is_taxable: true,
        include_ctc: true,
        include_gross: true,
        is_mandatory: true,
        is_balancing: true // Essential for absorbing remaining gross!
      },
      {
        name: 'Provident Fund (Employee)',
        code: 'PF',
        type: 'DEDUCTION',
        category: 'DEDUCTION',
        basis: 'BASIC',
        default_val: 12.00,
        order: 6,
        is_taxable: false,
        include_ctc: false,
        include_gross: false,
        is_mandatory: true,
        is_balancing: false
      },
      {
        name: 'Professional Tax',
        code: 'PROFESSIONAL_TAX',
        type: 'DEDUCTION',
        category: 'DEDUCTION',
        basis: 'FIXED_AMOUNT',
        default_val: 200.00,
        order: 7,
        is_taxable: false,
        include_ctc: false,
        include_gross: false,
        is_mandatory: true,
        is_balancing: false
      },
      {
        name: 'Provident Fund (Employer)',
        code: 'EMPLOYER_PF',
        type: 'EMPLOYER_CONTRIBUTION',
        category: 'DEDUCTION',
        basis: 'BASIC',
        default_val: 12.00,
        order: 8,
        is_taxable: false,
        include_ctc: true,
        include_gross: false,
        is_mandatory: true,
        is_balancing: false
      }
    ];

    const dynamicComponentsMap = {};
    for (const c of componentsDefinition) {
      let compRes = await query(
        'SELECT component_id FROM payroll_components WHERE organization_id = $1 AND component_code = $2',
        [organizationId, c.code]
      );
      let compId;
      if (compRes.rows.length === 0) {
        const ins = await query(`
          INSERT INTO payroll_components (
            organization_id, component_name, component_code, component_type,
            category, calculation_basis, reference_component_id, default_value,
            display_order, is_taxable, include_in_ctc, include_in_gross,
            is_mandatory, is_active, is_balancing_component, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, null, $7,
            $8, $9, $10, $11,
            $12, true, $13, NOW(), NOW()
          ) RETURNING component_id
        `, [
          organizationId, c.name, c.code, c.type,
          c.category, c.basis, c.default_val,
          c.order, c.is_taxable, c.include_ctc, c.include_gross,
          c.is_mandatory, c.is_balancing
        ]);
        compId = ins.rows[0].component_id;
      } else {
        compId = compRes.rows[0].component_id;
        await query(`
          UPDATE payroll_components SET
            component_name = $1, component_type = $2, category = $3,
            calculation_basis = $4, default_value = $5, display_order = $6,
            is_taxable = $7, include_in_ctc = $8, include_in_gross = $9,
            is_mandatory = $10, is_active = true, is_balancing_component = $11, updated_at = NOW()
          WHERE component_id = $12
        `, [
          c.name, c.type, c.category,
          c.basis, c.default_val, c.order,
          c.is_taxable, c.include_ctc, c.include_gross,
          c.is_mandatory, c.is_balancing, compId
        ]);
      }
      dynamicComponentsMap[c.code] = { id: compId, ...c };
    }
    console.log(`[Seeder 010] Seeded ${componentsDefinition.length} dynamic payroll components.`);

    // =========================================================================
    // PART B: WEEK OFF SETTINGS & GLOBAL CONFIG
    // =========================================================================
    console.log('[Seeder 010] Seeding Week Off Settings...');
    await query(`
      INSERT INTO week_off_global_configs (organization_id, enable_generic_week_off, enable_department_week_off, updated_at)
      VALUES ($1, true, false, NOW())
      ON CONFLICT (organization_id) DO UPDATE SET
        enable_generic_week_off = true,
        enable_department_week_off = false,
        updated_at = NOW()
    `, [organizationId]);

    let weekOffSettingId;
    const woRes = await query(`
      SELECT week_off_setting_id FROM week_off_settings
      WHERE organization_id = $1 AND scope = 'ORGANIZATION'
      LIMIT 1
    `, [organizationId]);

    if (woRes.rows.length === 0) {
      const insWo = await query(`
        INSERT INTO week_off_settings (
          organization_id, rule_name, scope, scope_id, effective_from, effective_to, is_enabled, created_at, updated_at
        ) VALUES (
          $1, 'Standard Corporate Week-Off', 'ORGANIZATION', null, '2026-01-01', null, true, NOW(), NOW()
        ) RETURNING week_off_setting_id
      `, [organizationId]);
      weekOffSettingId = insWo.rows[0].week_off_setting_id;
    } else {
      weekOffSettingId = woRes.rows[0].week_off_setting_id;
      await query(`
        UPDATE week_off_settings
        SET rule_name = 'Standard Corporate Week-Off', is_enabled = true, updated_at = NOW()
        WHERE week_off_setting_id = $1
      `, [weekOffSettingId]);
    }

    // Set Sunday (0) and Saturday (6) as weekly off days
    await query('DELETE FROM week_off_days WHERE week_off_setting_id = $1', [weekOffSettingId]);
    await query(`
      INSERT INTO week_off_days (week_off_setting_id, weekday, week_number, off_type, created_at)
      VALUES
        ($1, 0, 'ALL', 'FULL', NOW()),
        ($1, 6, 'ALL', 'FULL', NOW())
    `, [weekOffSettingId]);
    console.log('[Seeder 010] Configured Organization Week Offs (Saturday & Sunday).');

    // =========================================================================
    // PART C: DYNAMIC EMPLOYEE SALARY CONFIGS & BREAKDOWN COMPONENTS
    // =========================================================================
    console.log('[Seeder 010] Seeding Dynamic Salary Configurations for all 40 employees...');

    // Clear existing salary configurations and revisions to re-seed cleanly
    await query(`
      DELETE FROM salary_revisions WHERE organization_id = $1
    `, [organizationId]);
    await query(`
      DELETE FROM employee_salary_components
      WHERE employee_salary_config_id IN (
        SELECT employee_salary_config_id FROM employee_salary_configs WHERE organization_id = $1
      )
    `, [organizationId]);
    await query(`
      DELETE FROM employee_salary_configs WHERE organization_id = $1
    `, [organizationId]);

    // Level salary brackets (Annual CTC and Monthly Gross)
    const levelSalaries = {
      'L1': { ctc: 2400000.00, gross: 185000.00 },
      'L2': { ctc: 2400000.00, gross: 185000.00 },
      'L3': { ctc: 1440000.00, gross: 110000.00 },
      'L4': { ctc: 960000.00,  gross: 73000.00 },
      'L5': { ctc: 600000.00,  gross: 46000.00 }
    };

    // Helper to calculate components for a given gross salary
    function calculateComponentValues(gross) {
      const basic = Math.round(gross * 0.50);
      const hra = Math.round(basic * 0.40);
      const conveyance = 1600.00;
      const medical = 1250.00;
      const special = Math.max(0, gross - (basic + hra + conveyance + medical));
      const pfEmp = Math.min(1800.00, Math.round(basic * 0.12));
      const pt = 200.00;
      const pfEmployer = Math.min(1800.00, Math.round(basic * 0.12));

      return [
        { code: 'BASIC', pct: 50.00, fixed: 0, calc: basic },
        { code: 'HRA', pct: 40.00, fixed: 0, calc: hra },
        { code: 'CONVEYANCE', pct: 0, fixed: conveyance, calc: conveyance },
        { code: 'MEDICAL', pct: 0, fixed: medical, calc: medical },
        { code: 'SPECIAL_ALLOWANCE', pct: 0, fixed: special, calc: special },
        { code: 'PF', pct: 12.00, fixed: 0, calc: pfEmp },
        { code: 'PROFESSIONAL_TAX', pct: 0, fixed: pt, calc: pt },
        { code: 'EMPLOYER_PF', pct: 12.00, fixed: 0, calc: pfEmployer }
      ];
    }

    const employeeActiveConfigMap = {};

    for (const emp of employees) {
      const lvl = (emp.level_code || 'L5').toUpperCase();
      const bracket = levelSalaries[lvl] || levelSalaries['L5'];

      const configRes = await query(`
        INSERT INTO employee_salary_configs (
          employee_id, organization_id, salary_type, gross_salary, ctc_amount, effective_from, effective_to, created_at, updated_at
        ) VALUES ($1, $2, 'ANNUAL_CTC', $3, $4, '2026-01-01', null, NOW(), NOW())
        RETURNING employee_salary_config_id
      `, [emp.employee_id, organizationId, bracket.gross, bracket.ctc]);

      const configId = configRes.rows[0].employee_salary_config_id;
      employeeActiveConfigMap[emp.email] = {
        configId,
        gross: bracket.gross,
        ctc: bracket.ctc,
        employee_id: emp.employee_id
      };

      const compValues = calculateComponentValues(bracket.gross);
      for (const cv of compValues) {
        const compDef = dynamicComponentsMap[cv.code];
        if (!compDef) continue;
        await query(`
          INSERT INTO employee_salary_components (
            employee_salary_config_id, component_id, percentage, fixed_amount,
            calculated_amount, is_manual, is_manual_override, manual_amount, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, false, false, null, NOW(), NOW())
        `, [configId, compDef.id, cv.pct, cv.fixed, cv.calc]);
      }
    }
    console.log(`[Seeder 010] Seeded active salary configs for all ${employees.length} employees.`);

    // =========================================================================
    // PART D: REALISTIC SALARY REVISIONS & INCREMENTS
    // =========================================================================
    console.log('[Seeder 010] Seeding Salary Revisions & History...');

    const revisionsPlan = [
      // 1. John Doe (L4 Senior Exec) - Promoted in April 2026
      {
        email: 'john@example.com',
        oldCtc: 800000.00,
        oldGross: 61000.00,
        newCtc: 960000.00,
        newGross: 73000.00,
        incAmt: 160000.00,
        incPct: 20.00,
        effectiveFrom: '2026-04-01',
        status: 'EFFECTIVE',
        reason: 'Annual Performance Appraisal',
        remarks: 'Promoted to Senior Executive level for exceptional delivery on core platform modules.'
      },
      // 2. Meera Reddy (L4 Senior Exec) - Benchmarking alignment
      {
        email: 'meera.reddy@company.com',
        oldCtc: 820000.00,
        oldGross: 62500.00,
        newCtc: 960000.00,
        newGross: 73000.00,
        incAmt: 140000.00,
        incPct: 17.07,
        effectiveFrom: '2026-04-01',
        status: 'EFFECTIVE',
        reason: 'Market Correction',
        remarks: 'Compensation benchmarking alignment with market standards.'
      },
      // 3. Arjun Sharma (L2 Director) - Appointed Director Jan 2026
      {
        email: 'arjun.sharma@company.com',
        oldCtc: 2000000.00,
        oldGross: 154000.00,
        newCtc: 2400000.00,
        newGross: 185000.00,
        incAmt: 400000.00,
        incPct: 20.00,
        effectiveFrom: '2026-01-01',
        status: 'EFFECTIVE',
        reason: 'Promotion',
        remarks: 'Appointed Director of Tech Consulting & Software Development.'
      },
      // 4. Anand Kumar (L4 Senior Exec) - Upcoming retention increment in Oct 2026
      {
        email: 'anand.kumar@company.com',
        oldCtc: 960000.00,
        oldGross: 73000.00,
        newCtc: 1100000.00,
        newGross: 84000.00,
        incAmt: 140000.00,
        incPct: 14.58,
        effectiveFrom: '2026-10-01',
        status: 'PENDING',
        reason: 'Retention Increment',
        remarks: 'Proposed mid-year retention increment for critical project leadership.'
      },
      // 5. Sneha Joshi (L5 Standard) - Upcoming annual appraisal in Oct 2026
      {
        email: 'sneha.joshi@company.com',
        oldCtc: 600000.00,
        oldGross: 46000.00,
        newCtc: 700000.00,
        newGross: 53500.00,
        incAmt: 100000.00,
        incPct: 16.67,
        effectiveFrom: '2026-10-01',
        status: 'PENDING',
        reason: 'Annual Appraisal',
        remarks: 'Eligible for annual cycle increment pending leadership sign-off.'
      }
    ];

    for (const rev of revisionsPlan) {
      const activeData = employeeActiveConfigMap[rev.email];
      if (!activeData) continue;

      let oldConfigId = null;
      let newConfigId = activeData.configId;

      if (rev.status === 'EFFECTIVE') {
        // Create the historical baseline config (effective up to rev.effectiveFrom)
        const oldIns = await query(`
          INSERT INTO employee_salary_configs (
            employee_id, organization_id, salary_type, gross_salary, ctc_amount,
            effective_from, effective_to, created_at, updated_at
          ) VALUES ($1, $2, 'ANNUAL_CTC', $3, $4, '2025-04-01', ($5::date - INTERVAL '1 day')::date, NOW(), NOW())
          RETURNING employee_salary_config_id
        `, [activeData.employee_id, organizationId, rev.oldGross, rev.oldCtc, rev.effectiveFrom]);
        oldConfigId = oldIns.rows[0].employee_salary_config_id;

        // Populate components for the old config
        const oldComps = calculateComponentValues(rev.oldGross);
        for (const oc of oldComps) {
          const compDef = dynamicComponentsMap[oc.code];
          if (!compDef) continue;
          await query(`
            INSERT INTO employee_salary_components (
              employee_salary_config_id, component_id, percentage, fixed_amount,
              calculated_amount, is_manual, is_manual_override, manual_amount, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, false, false, null, NOW(), NOW())
          `, [oldConfigId, compDef.id, oc.pct, oc.fixed, oc.calc]);
        }

        // Update active config's effective_from to revision's date
        await query(`
          UPDATE employee_salary_configs
          SET effective_from = $1
          WHERE employee_salary_config_id = $2
        `, [rev.effectiveFrom, activeData.configId]);
      } else if (rev.status === 'PENDING') {
        // Old config is current active config
        oldConfigId = activeData.configId;

        // Proposed new config
        const pendingIns = await query(`
          INSERT INTO employee_salary_configs (
            employee_id, organization_id, salary_type, gross_salary, ctc_amount,
            effective_from, effective_to, created_at, updated_at
          ) VALUES ($1, $2, 'ANNUAL_CTC', $3, $4, $5, null, NOW(), NOW())
          RETURNING employee_salary_config_id
        `, [activeData.employee_id, organizationId, rev.newGross, rev.newCtc, rev.effectiveFrom]);
        newConfigId = pendingIns.rows[0].employee_salary_config_id;

        const newComps = calculateComponentValues(rev.newGross);
        for (const nc of newComps) {
          const compDef = dynamicComponentsMap[nc.code];
          if (!compDef) continue;
          await query(`
            INSERT INTO employee_salary_components (
              employee_salary_config_id, component_id, percentage, fixed_amount,
              calculated_amount, is_manual, is_manual_override, manual_amount, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, false, false, null, NOW(), NOW())
          `, [newConfigId, compDef.id, nc.pct, nc.fixed, nc.calc]);
        }
      }

      await query(`
        INSERT INTO salary_revisions (
          organization_id, employee_id, old_salary_config_id, new_salary_config_id,
          increment_amount, increment_percentage, effective_from, reason,
          remarks, status, created_by, created_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, NOW()
        )
      `, [
        organizationId, activeData.employee_id, oldConfigId, newConfigId,
        rev.incAmt, rev.incPct, rev.effectiveFrom, rev.reason,
        rev.remarks, rev.status, adminUserId
      ]);
    }
    console.log(`[Seeder 010] Seeded ${revisionsPlan.length} salary revisions (3 EFFECTIVE, 2 PENDING upcoming).`);

    // =========================================================================
    // PART E: LEGACY SALARY STRUCTURES & ASSIGNMENTS (backward compatibility)
    // =========================================================================
    console.log('[Seeder 010] Seeding Legacy Salary Structures...');
    const structureDefs = [
      {
        name: 'Executive Structure',
        basic: 120000.00, hra: 48000.00, special: 24000.00, travel: 8000.00, medical: 5000.00
      },
      {
        name: 'Manager Structure',
        basic: 65000.00, hra: 26000.00, special: 13000.00, travel: 5000.00, medical: 3000.00
      },
      {
        name: 'Senior Executive Structure',
        basic: 45000.00, hra: 18000.00, special: 9000.00, travel: 3000.00, medical: 2000.00
      },
      {
        name: 'Standard Employee Structure',
        basic: 25000.00, hra: 10000.00, special: 5000.00, travel: 2000.00, medical: 1500.00
      }
    ];

    const structMap = {};
    for (const sd of structureDefs) {
      let structRes = await query(
        'SELECT salary_structure_id FROM salary_structures WHERE organization_id = $1 AND structure_name = $2',
        [organizationId, sd.name]
      );
      let structId;
      if (structRes.rows.length === 0) {
        const ins = await query(`
          INSERT INTO salary_structures (
            organization_id, structure_name, basic_salary, hra_amount,
            special_allowance_amount, travel_allowance_amount, medical_allowance_amount,
            is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
          RETURNING salary_structure_id
        `, [organizationId, sd.name, sd.basic, sd.hra, sd.special, sd.travel, sd.medical]);
        structId = ins.rows[0].salary_structure_id;
      } else {
        structId = structRes.rows[0].salary_structure_id;
        await query(`
          UPDATE salary_structures SET
            basic_salary = $1, hra_amount = $2, special_allowance_amount = $3,
            travel_allowance_amount = $4, medical_allowance_amount = $5,
            is_active = true, updated_at = NOW()
          WHERE salary_structure_id = $6
        `, [sd.basic, sd.hra, sd.special, sd.travel, sd.medical, structId]);
      }
      structMap[sd.name] = { id: structId, ...sd };
    }

    // Assign legacy salary structures to all employees
    for (const emp of employees) {
      const lvl = (emp.level_code || 'L5').toUpperCase();
      let sName = 'Standard Employee Structure';
      if (lvl === 'L1' || lvl === 'L2') sName = 'Executive Structure';
      else if (lvl === 'L3') sName = 'Manager Structure';
      else if (lvl === 'L4') sName = 'Senior Executive Structure';

      const structInfo = structMap[sName];
      const existingAssign = await query(
        'SELECT assignment_id FROM employee_salary_assignments WHERE employee_id = $1 AND organization_id = $2',
        [emp.employee_id, organizationId]
      );

      if (existingAssign.rows.length === 0) {
        await query(`
          INSERT INTO employee_salary_assignments (
            organization_id, employee_id, salary_structure_id, effective_from, created_at, updated_at
          ) VALUES ($1, $2, $3, '2026-01-01', NOW(), NOW())
        `, [organizationId, emp.employee_id, structInfo.id]);
      } else {
        await query(`
          UPDATE employee_salary_assignments SET
            salary_structure_id = $1, effective_from = '2026-01-01', updated_at = NOW()
          WHERE assignment_id = $2
        `, [structInfo.id, existingAssign.rows[0].assignment_id]);
      }
    }
    console.log(`[Seeder 010] Assigned legacy structures to all ${employees.length} employees.`);

    // =========================================================================
    // PART F: OVERTIME SETTINGS & REQUESTS (4 PENDING, 4 APPROVED)
    // =========================================================================
    console.log('[Seeder 010] Seeding Overtime Settings & Requests...');
    const otSettingRes = await query(
      'SELECT overtime_setting_id FROM overtime_settings WHERE organization_id = $1 LIMIT 1',
      [organizationId]
    );
    if (otSettingRes.rows.length === 0) {
      await query(`
        INSERT INTO overtime_settings (
          organization_id, is_enabled, requires_approval, calculation_method,
          hourly_rate_basis, standard_monthly_hours, weekday_multiplier,
          weekend_multiplier, holiday_multiplier, weekday_hourly_rate,
          weekend_hourly_rate, holiday_hourly_rate, minimum_ot_minutes,
          rounding_rule, is_active, created_at, updated_at
        ) VALUES (
          $1, true, true, 'MULTIPLIER',
          'GROSS', 160, 1.5,
          2.0, 2.0, 350.00,
          500.00, 500.00, 30,
          'NEAREST_15', true, NOW(), NOW()
        )
      `, [organizationId]);
    }

    await query(`
      DELETE FROM overtime_requests
      WHERE employee_id = ANY(SELECT employee_id FROM employees WHERE organization_id = $1)
    `, [organizationId]);

    const otRequestsData = [
      { empEmail: 'john@example.com', daysAgo: 2, minutes: 120, dayType: 'WEEKDAY', reason: 'Emergency database migration support after business hours.' },
      { empEmail: 'meera.reddy@company.com', daysAgo: 3, minutes: 180, dayType: 'WEEKDAY', reason: 'Critical bug fixes deployment for enterprise tenant.' },
      { empEmail: 'anand.kumar@company.com', daysAgo: 4, minutes: 150, dayType: 'WEEKDAY', reason: 'UI redesign responsiveness patch for mobile viewport.' },
      { empEmail: 'karthik.pillai@company.com', daysAgo: 5, minutes: 240, dayType: 'WEEKEND', reason: 'Weekend customer support incident triage.' },
      { empEmail: 'deepak.joshi@company.com', daysAgo: 10, minutes: 120, dayType: 'WEEKDAY', reason: 'API microservice performance optimization.' },
      { empEmail: 'kavita.patil@company.com', daysAgo: 12, minutes: 180, dayType: 'WEEKDAY', reason: 'Backend payment gateway webhook integration.' },
      { empEmail: 'rohit.sharma@company.com', daysAgo: 15, minutes: 120, dayType: 'WEEKDAY', reason: 'Automated regression test suite execution.' },
      { empEmail: 'pooja.deshmukh@company.com', daysAgo: 18, minutes: 240, dayType: 'WEEKEND', reason: 'Kubernetes cluster maintenance & SSL rotation.' }
    ];

    const today = new Date();
    for (let i = 0; i < otRequestsData.length; i++) {
      const ot = otRequestsData[i];
      const emp = empMap[ot.empEmail];
      if (!emp) continue;

      const otDate = new Date(today);
      otDate.setDate(today.getDate() - ot.daysAgo);
      const otDateStr = otDate.toISOString().split('T')[0];

      const clockOut = new Date(otDate);
      clockOut.setHours(20, 30, 0, 0);

      const isApproved = i >= 4;
      const status = isApproved ? 'APPROVED' : 'PENDING';

      await query(`
        INSERT INTO overtime_requests (
          organization_id, employee_id, attendance_date, clock_out_time,
          requested_ot_minutes, approved_ot_minutes, day_type, reason,
          approval_status, approved_by, approved_at, remarks, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, $12, NOW(), NOW()
        )
      `, [
        organizationId, emp.employee_id, otDateStr, clockOut,
        ot.minutes, isApproved ? ot.minutes : null, ot.dayType, ot.reason,
        status, isApproved ? adminUserId : null, isApproved ? new Date() : null,
        isApproved ? 'Approved by line manager' : null
      ]);
    }
    console.log(`[Seeder 010] Seeded ${otRequestsData.length} overtime requests (4 PENDING).`);

    // =========================================================================
    // PART G: 4 LOCKED MONTHLY PAYROLL RUNS & 160 ITEMIZED PAYSLIPS
    // =========================================================================
    console.log('[Seeder 010] Seeding 4 Monthly Payroll Runs (Feb - May 2026)...');
    const payrollMonths = [
      { month: 2, year: 2026, start: '2026-02-01', end: '2026-02-28', workDays: 20 },
      { month: 3, year: 2026, start: '2026-03-01', end: '2026-03-31', workDays: 22 },
      { month: 4, year: 2026, start: '2026-04-01', end: '2026-04-30', workDays: 21 },
      { month: 5, year: 2026, start: '2026-05-01', end: '2026-05-31', workDays: 21 }
    ];

    for (const pr of payrollMonths) {
      let runCheck = await query(
        'SELECT payroll_run_id FROM payroll_runs WHERE organization_id = $1 AND payroll_month = $2 AND payroll_year = $3',
        [organizationId, pr.month, pr.year]
      );
      let runId;
      if (runCheck.rows.length === 0) {
        const newRun = await query(`
          INSERT INTO payroll_runs (
            organization_id, payroll_month, payroll_year, payroll_start_date, payroll_end_date,
            current_status, generated_by_admin_user_id, generated_at,
            approved_by_admin_user_id, approved_at,
            locked_by_admin_user_id, locked_at, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5,
            'LOCKED', $6, NOW(),
            $6, NOW(),
            $6, NOW(), NOW(), NOW()
          ) RETURNING payroll_run_id
        `, [organizationId, pr.month, pr.year, pr.start, pr.end, adminUserId]);
        runId = newRun.rows[0].payroll_run_id;

        await query(`
          INSERT INTO payroll_run_logs (payroll_run_id, action, action_taken_by, remarks, created_at)
          VALUES ($1, 'GENERATE', $2, 'Generated monthly payroll run.', NOW()),
                 ($1, 'APPROVE', $2, 'Approved monthly payroll calculation.', NOW()),
                 ($1, 'LOCK', $2, 'Locked and finalized payslips.', NOW())
        `, [runId, adminUserId]);
      } else {
        runId = runCheck.rows[0].payroll_run_id;
      }

      // Payslip records for ALL 40 employees
      for (const emp of employees) {
        const lvl = (emp.level_code || 'L5').toUpperCase();
        let sName = 'Standard Employee Structure';
        if (lvl === 'L1' || lvl === 'L2') sName = 'Executive Structure';
        else if (lvl === 'L3') sName = 'Manager Structure';
        else if (lvl === 'L4') sName = 'Senior Executive Structure';

        const struct = structMap[sName];
        const gross = struct.basic + struct.hra + struct.special + struct.travel + struct.medical;

        const lopDays = Math.random() < 0.15 ? 1 : 0;
        const presentDays = pr.workDays - lopDays;
        const lopDeduction = (gross / pr.workDays) * lopDays;
        const pfDeduction = Math.min(1800.00, struct.basic * 0.12);
        const taxDeduction = gross > 100000 ? gross * 0.10 : (gross > 50000 ? gross * 0.05 : 0);
        const totalDeductions = Math.round(lopDeduction + pfDeduction + taxDeduction);
        const netSalary = Math.round(gross - totalDeductions);

        const payslipNumber = `PAY/${pr.year}/${String(pr.month).padStart(2, '0')}/${emp.employee_code}`;

        await query(`
          INSERT INTO employee_payrolls (
            payroll_run_id, employee_id, salary_structure_id,
            working_days, present_days, paid_leave_days, holiday_days, week_off_days,
            lop_days, gross_salary, total_earnings, total_additions, total_deductions,
            net_salary, current_status, payslip_number,
            payslip_generated_at, payslip_generated_by, created_at, updated_at
          ) VALUES (
            $1, $2, $3,
            $4, $5, 0, 2, 8,
            $6, $7, $7, 0, $8,
            $9, 'LOCKED', $10,
            NOW(), $11, NOW(), NOW()
          ) ON CONFLICT (payroll_run_id, employee_id) DO UPDATE SET
            gross_salary = EXCLUDED.gross_salary,
            net_salary = EXCLUDED.net_salary,
            total_deductions = EXCLUDED.total_deductions,
            current_status = 'LOCKED'
        `, [
          runId, emp.employee_id, struct.id,
          pr.workDays, presentDays, lopDays,
          gross, totalDeductions, netSalary,
          payslipNumber, adminUserId
        ]);
      }
    }
    console.log(`[Seeder 010] Seeded 160 payslips across 4 locked runs.`);

    console.log('[Seeder 010] Complete HRMS Payroll & Compensation seeding successfully finished!');

  } catch (err) {
    console.error('[Seeder 010] Error seeding payroll data:', err);
    throw err;
  }
}

module.exports = seedPayrollData;
