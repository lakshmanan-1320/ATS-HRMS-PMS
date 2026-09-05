const { query, withTransaction } = require('../../config/db');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    console.log('[Seeder 006] Starting 40-Employee Directory & Reporting Hierarchy Seeder...');

    // 1. Get client admin organization_id
    const caRow = await query('SELECT organization_id FROM client_admins LIMIT 1');
    if (!caRow.rows.length) {
      throw new Error('No client admin found. Run 002_default_client_admin.js first.');
    }
    const organizationId = caRow.rows[0].organization_id;

    // 2. Fetch hierarchy levels
    const levelsRes = await query(
      'SELECT hierarchy_level_id, level_code FROM hierarchy_levels WHERE organization_id = $1',
      [organizationId]
    );
    const levelsMap = {};
    levelsRes.rows.forEach(row => {
      levelsMap[row.level_code.toUpperCase()] = row.hierarchy_level_id;
    });

    for (const code of ['L1', 'L2', 'L3', 'L4', 'L5']) {
      if (!levelsMap[code]) {
        throw new Error(`Hierarchy level ${code} not found. Run 003_default_hierarchy_levels.js first.`);
      }
    }

    // 3. Fetch departments
    const deptsRes = await query(
      'SELECT department_id, name FROM departments WHERE organization_id = $1',
      [organizationId]
    );
    const deptsMap = {};
    deptsRes.rows.forEach(row => {
      deptsMap[row.name] = row.department_id;
    });

    const requiredDepts = [
      'Tech Consulting',
      'HR Recruitment',
      'Digital Marketing',
      'Finance & Accounts',
      'Customer Operations'
    ];
    for (const dName of requiredDepts) {
      if (!deptsMap[dName]) {
        throw new Error(`Department "${dName}" not found. Run 004_sample_departments.js first.`);
      }
    }

    // 4. Define exactly 40 employees (~8 per department, 5 managers, 2-3 HR/Admins)
    // Topological order: L2 Directors/Managers first, then reports
    const employeeData = [
      // ══════════════════════════════════════════════════════════════════
      // 1. TECH CONSULTING (8 Employees) — Sub-Dept: Software Development
      // ══════════════════════════════════════════════════════════════════
      {
        email: 'arjun.sharma@company.com',
        firstName: 'Arjun',
        lastName: 'Sharma',
        code: 'EMP0002',
        gender: 'Male',
        designation: 'Director',
        levelCode: 'L2',
        deptName: 'Tech Consulting',
        role: 'manager',
        managerEmail: null
      },
      {
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        code: 'EMP0003',
        gender: 'Male',
        designation: 'Senior Executive',
        levelCode: 'L4',
        deptName: 'Tech Consulting',
        role: 'employee',
        managerEmail: 'arjun.sharma@company.com'
      },
      {
        email: 'meera.reddy@company.com',
        firstName: 'Meera',
        lastName: 'Reddy',
        code: 'EMP0004',
        gender: 'Female',
        designation: 'Team Lead',
        levelCode: 'L4',
        deptName: 'Tech Consulting',
        role: 'manager',
        managerEmail: 'arjun.sharma@company.com'
      },
      {
        email: 'deepak.joshi@company.com',
        firstName: 'Deepak',
        lastName: 'Joshi',
        code: 'EMP0005',
        gender: 'Male',
        designation: 'Senior Developer',
        levelCode: 'L4',
        deptName: 'Tech Consulting',
        role: 'employee',
        managerEmail: 'arjun.sharma@company.com'
      },
      {
        email: 'anand.kumar@company.com',
        firstName: 'Anand',
        lastName: 'Kumar',
        code: 'EMP0006',
        gender: 'Male',
        designation: 'Frontend Engineer',
        levelCode: 'L5',
        deptName: 'Tech Consulting',
        role: 'employee',
        managerEmail: 'meera.reddy@company.com'
      },
      {
        email: 'kavita.patil@company.com',
        firstName: 'Kavita',
        lastName: 'Patil',
        code: 'EMP0007',
        gender: 'Female',
        designation: 'Backend Engineer',
        levelCode: 'L5',
        deptName: 'Tech Consulting',
        role: 'employee',
        managerEmail: 'meera.reddy@company.com'
      },
      {
        email: 'rohit.sharma@company.com',
        firstName: 'Rohit',
        lastName: 'Sharma',
        code: 'EMP0008',
        gender: 'Male',
        designation: 'QA Automation Engineer',
        levelCode: 'L5',
        deptName: 'Tech Consulting',
        role: 'employee',
        managerEmail: 'arjun.sharma@company.com'
      },
      {
        email: 'pooja.deshmukh@company.com',
        firstName: 'Pooja',
        lastName: 'Deshmukh',
        code: 'EMP0009',
        gender: 'Female',
        designation: 'DevOps Associate',
        levelCode: 'L5',
        deptName: 'Tech Consulting',
        role: 'employee',
        managerEmail: 'arjun.sharma@company.com'
      },

      // ══════════════════════════════════════════════════════════════════
      // 2. HR RECRUITMENT (8 Employees) — Sub-Dept: Talent Acquisition
      // ══════════════════════════════════════════════════════════════════
      {
        email: 'rahul.verma@company.com',
        firstName: 'Rahul',
        lastName: 'Verma',
        code: 'EMP0010',
        gender: 'Male',
        designation: 'Manager',
        levelCode: 'L3',
        deptName: 'HR Recruitment',
        role: 'manager',
        managerEmail: 'arjun.sharma@company.com'
      },
      {
        email: 'ananya.sen@company.com',
        firstName: 'Ananya',
        lastName: 'Sen',
        code: 'EMP0011',
        gender: 'Female',
        designation: 'Senior HR Specialist',
        levelCode: 'L4',
        deptName: 'HR Recruitment',
        role: 'employee',
        managerEmail: 'rahul.verma@company.com'
      },
      {
        email: 'amit.shah@company.com',
        firstName: 'Amit',
        lastName: 'Shah',
        code: 'EMP0012',
        gender: 'Male',
        designation: 'Talent Acquisition Lead',
        levelCode: 'L4',
        deptName: 'HR Recruitment',
        role: 'employee',
        managerEmail: 'rahul.verma@company.com'
      },
      {
        email: 'swati.mishra@company.com',
        firstName: 'Swati',
        lastName: 'Mishra',
        code: 'EMP0013',
        gender: 'Female',
        designation: 'HR Operations Lead',
        levelCode: 'L4',
        deptName: 'HR Recruitment',
        role: 'employee',
        managerEmail: 'rahul.verma@company.com'
      },
      {
        email: 'tanvi.sharma@company.com',
        firstName: 'Tanvi',
        lastName: 'Sharma',
        code: 'EMP0014',
        gender: 'Female',
        designation: 'Onboarding Associate',
        levelCode: 'L5',
        deptName: 'HR Recruitment',
        role: 'employee',
        managerEmail: 'ananya.sen@company.com'
      },
      {
        email: 'kunal.saxena@company.com',
        firstName: 'Kunal',
        lastName: 'Saxena',
        code: 'EMP0015',
        gender: 'Male',
        designation: 'Technical Recruiter',
        levelCode: 'L5',
        deptName: 'HR Recruitment',
        role: 'employee',
        managerEmail: 'amit.shah@company.com'
      },
      {
        email: 'divya.nair@company.com',
        firstName: 'Divya',
        lastName: 'Nair',
        code: 'EMP0016',
        gender: 'Female',
        designation: 'HR Coordinator',
        levelCode: 'L5',
        deptName: 'HR Recruitment',
        role: 'employee',
        managerEmail: 'swati.mishra@company.com'
      },
      {
        email: 'prateek.jain@company.com',
        firstName: 'Prateek',
        lastName: 'Jain',
        code: 'EMP0017',
        gender: 'Male',
        designation: 'Campus Recruiter',
        levelCode: 'L5',
        deptName: 'HR Recruitment',
        role: 'employee',
        managerEmail: 'amit.shah@company.com'
      },

      // ══════════════════════════════════════════════════════════════════
      // 3. DIGITAL MARKETING (8 Employees) — Sub-Dept: SEO & Content
      // ══════════════════════════════════════════════════════════════════
      {
        email: 'vikram.aditya@company.com',
        firstName: 'Vikram',
        lastName: 'Aditya',
        code: 'EMP0018',
        gender: 'Male',
        designation: 'Manager',
        levelCode: 'L3',
        deptName: 'Digital Marketing',
        role: 'manager',
        managerEmail: 'arjun.sharma@company.com'
      },
      {
        email: 'priya.nair@company.com',
        firstName: 'Priya',
        lastName: 'Nair',
        code: 'EMP0019',
        gender: 'Female',
        designation: 'Lead Marketing Strategist',
        levelCode: 'L4',
        deptName: 'Digital Marketing',
        role: 'employee',
        managerEmail: 'vikram.aditya@company.com'
      },
      {
        email: 'rohan@example.com',
        firstName: 'Rohan',
        lastName: 'Mehta',
        code: 'EMP0020',
        gender: 'Male',
        designation: 'Digital Campaign Specialist',
        levelCode: 'L4',
        deptName: 'Digital Marketing',
        role: 'employee',
        managerEmail: 'vikram.aditya@company.com'
      },
      {
        email: 'priyanka.goyal@company.com',
        firstName: 'Priyanka',
        lastName: 'Goyal',
        code: 'EMP0021',
        gender: 'Female',
        designation: 'SEO Lead',
        levelCode: 'L4',
        deptName: 'Digital Marketing',
        role: 'employee',
        managerEmail: 'priya.nair@company.com'
      },
      {
        email: 'manish.tiwari@company.com',
        firstName: 'Manish',
        lastName: 'Tiwari',
        code: 'EMP0022',
        gender: 'Male',
        designation: 'Content Marketing Associate',
        levelCode: 'L5',
        deptName: 'Digital Marketing',
        role: 'employee',
        managerEmail: 'priya.nair@company.com'
      },
      {
        email: 'neil.fernandes@company.com',
        firstName: 'Neil',
        lastName: 'Fernandes',
        code: 'EMP0023',
        gender: 'Male',
        designation: 'Performance Ads Associate',
        levelCode: 'L5',
        deptName: 'Digital Marketing',
        role: 'employee',
        managerEmail: 'vikram.aditya@company.com'
      },
      {
        email: 'aisha.khan@company.com',
        firstName: 'Aisha',
        lastName: 'Khan',
        code: 'EMP0024',
        gender: 'Female',
        designation: 'Social Media Associate',
        levelCode: 'L5',
        deptName: 'Digital Marketing',
        role: 'employee',
        managerEmail: 'rohan@example.com'
      },
      {
        email: 'tarun.verma@company.com',
        firstName: 'Tarun',
        lastName: 'Verma',
        code: 'EMP0025',
        gender: 'Male',
        designation: 'Creative Graphic Designer',
        levelCode: 'L5',
        deptName: 'Digital Marketing',
        role: 'employee',
        managerEmail: 'priyanka.goyal@company.com'
      },

      // ══════════════════════════════════════════════════════════════════
      // 4. FINANCE & ACCOUNTS (8 Employees) — Sub-Dept: Auditing & Compliance
      // ══════════════════════════════════════════════════════════════════
      {
        email: 'deepa.krishnan@company.com',
        firstName: 'Deepa',
        lastName: 'Krishnan',
        code: 'EMP0026',
        gender: 'Female',
        designation: 'Director',
        levelCode: 'L2',
        deptName: 'Finance & Accounts',
        role: 'manager',
        managerEmail: null
      },
      {
        email: 'suresh.patel@company.com',
        firstName: 'Suresh',
        lastName: 'Patel',
        code: 'EMP0027',
        gender: 'Male',
        designation: 'Manager',
        levelCode: 'L3',
        deptName: 'Finance & Accounts',
        role: 'manager',
        managerEmail: 'deepa.krishnan@company.com'
      },
      {
        email: 'rajesh.kumar@company.com',
        firstName: 'Rajesh',
        lastName: 'Kumar',
        code: 'EMP0028',
        gender: 'Male',
        designation: 'Senior Tax Consultant',
        levelCode: 'L4',
        deptName: 'Finance & Accounts',
        role: 'employee',
        managerEmail: 'suresh.patel@company.com'
      },
      {
        email: 'sanjay.mishra@company.com',
        firstName: 'Sanjay',
        lastName: 'Mishra',
        code: 'EMP0029',
        gender: 'Male',
        designation: 'Senior Auditor',
        levelCode: 'L4',
        deptName: 'Finance & Accounts',
        role: 'employee',
        managerEmail: 'suresh.patel@company.com'
      },
      {
        email: 'neha@example.com',
        firstName: 'Neha',
        lastName: 'Gupta',
        code: 'EMP0030',
        gender: 'Female',
        designation: 'Accounts Executive',
        levelCode: 'L5',
        deptName: 'Finance & Accounts',
        role: 'employee',
        managerEmail: 'rajesh.kumar@company.com'
      },
      {
        email: 'alok.ranjan@company.com',
        firstName: 'Alok',
        lastName: 'Ranjan',
        code: 'EMP0031',
        gender: 'Male',
        designation: 'Payroll Analyst',
        levelCode: 'L5',
        deptName: 'Finance & Accounts',
        role: 'employee',
        managerEmail: 'suresh.patel@company.com'
      },
      {
        email: 'shilpa.shetty@company.com',
        firstName: 'Shilpa',
        lastName: 'Shetty',
        code: 'EMP0032',
        gender: 'Female',
        designation: 'Billing Associate',
        levelCode: 'L5',
        deptName: 'Finance & Accounts',
        role: 'employee',
        managerEmail: 'rajesh.kumar@company.com'
      },
      {
        email: 'varun.chopra@company.com',
        firstName: 'Varun',
        lastName: 'Chopra',
        code: 'EMP0033',
        gender: 'Male',
        designation: 'Accounts Payable Specialist',
        levelCode: 'L5',
        deptName: 'Finance & Accounts',
        role: 'employee',
        managerEmail: 'sanjay.mishra@company.com'
      },

      // ══════════════════════════════════════════════════════════════════
      // 5. CUSTOMER OPERATIONS (8 Employees) — Sub-Dept: Support Operations
      // ══════════════════════════════════════════════════════════════════
      {
        email: 'meera.nair@company.com',
        firstName: 'Meera',
        lastName: 'Nair',
        code: 'EMP0034',
        gender: 'Female',
        designation: 'Manager',
        levelCode: 'L3',
        deptName: 'Customer Operations',
        role: 'manager',
        managerEmail: 'arjun.sharma@company.com'
      },
      {
        email: 'sneha.iyer@company.com',
        firstName: 'Sneha',
        lastName: 'Iyer',
        code: 'EMP0035',
        gender: 'Female',
        designation: 'Operations Team Lead',
        levelCode: 'L4',
        deptName: 'Customer Operations',
        role: 'employee',
        managerEmail: 'meera.nair@company.com'
      },
      {
        email: 'anita.desai@company.com',
        firstName: 'Anita',
        lastName: 'Desai',
        code: 'EMP0036',
        gender: 'Female',
        designation: 'Escalations Lead',
        levelCode: 'L4',
        deptName: 'Customer Operations',
        role: 'employee',
        managerEmail: 'meera.nair@company.com'
      },
      {
        email: 'karthik.pillai@company.com',
        firstName: 'Karthik',
        lastName: 'Pillai',
        code: 'EMP0037',
        gender: 'Male',
        designation: 'Customer Operations Specialist',
        levelCode: 'L4',
        deptName: 'Customer Operations',
        role: 'employee',
        managerEmail: 'sneha.iyer@company.com'
      },
      {
        email: 'vikram@example.com',
        firstName: 'Vikram',
        lastName: 'Singh',
        code: 'EMP0038',
        gender: 'Male',
        designation: 'Technical Support Associate',
        levelCode: 'L5',
        deptName: 'Customer Operations',
        role: 'employee',
        managerEmail: 'sneha.iyer@company.com'
      },
      {
        email: 'nisha.verma@company.com',
        firstName: 'Nisha',
        lastName: 'Verma',
        code: 'EMP0039',
        gender: 'Female',
        designation: 'Client Service Associate',
        levelCode: 'L5',
        deptName: 'Customer Operations',
        role: 'employee',
        managerEmail: 'anita.desai@company.com'
      },
      {
        email: 'raghav.bhatia@company.com',
        firstName: 'Raghav',
        lastName: 'Bhatia',
        code: 'EMP0040',
        gender: 'Male',
        designation: 'Support Operations Associate',
        levelCode: 'L5',
        deptName: 'Customer Operations',
        role: 'employee',
        managerEmail: 'sneha.iyer@company.com'
      },
      {
        email: 'ritika.sen@company.com',
        firstName: 'Ritika',
        lastName: 'Sen',
        code: 'EMP0041',
        gender: 'Female',
        designation: 'Quality Assurance Associate',
        levelCode: 'L5',
        deptName: 'Customer Operations',
        role: 'employee',
        managerEmail: 'anita.desai@company.com'
      }
    ];

    // Standard password hash for all demo users: Password12345
    const passwordHash = await bcrypt.hash('Password12345', 10);

    await withTransaction(async (client) => {
      // 5. Build lookup maps for existing employees and users
      const allEmails = employeeData.map(e => e.email);
      const existingEmpRes = await client.query(
        'SELECT employee_id, email, employee_code FROM employees WHERE organization_id = $1',
        [organizationId]
      );
      const empMapByEmail = {};
      const empMapByCode = {};
      existingEmpRes.rows.forEach(r => {
        empMapByEmail[r.email] = r.employee_id;
        empMapByCode[r.employee_code] = r.employee_id;
      });

      const existingUsersRes = await client.query(
        'SELECT user_id, email, employee_id, role FROM users WHERE organization_id = $1',
        [organizationId]
      );
      const userMapByEmail = {};
      existingUsersRes.rows.forEach(r => {
        userMapByEmail[r.email] = r;
      });

      const emailToEmpId = { ...empMapByEmail };
      let createdEmpCount = 0;
      let updatedEmpCount = 0;

      // Pass 1: Upsert all employees (without manager FK first to avoid circular ref)
      for (const emp of employeeData) {
        const hierarchyLevelId = levelsMap[emp.levelCode];
        const departmentId = deptsMap[emp.deptName];
        const uan = '10000000' + emp.code.replace('EMP', '').padStart(4, '0');
        const esi = '3100000000' + emp.code.replace('EMP', '').padStart(4, '0');
        const father = 'S/o ' + emp.firstName + ' Senior';
        const acct = '50100223344' + emp.code.replace('EMP', '').padStart(4, '0');

        if (emailToEmpId[emp.email]) {
          // Update existing employee attributes
          const empId = emailToEmpId[emp.email];
          await client.query(`
            UPDATE employees SET
              employee_code = $1,
              first_name = $2,
              last_name = $3,
              designation = $4,
              department_id = $5,
              hierarchy_level_id = $6,
              status = 'active',
              father_name = COALESCE(father_name, $7),
              bank_name = COALESCE(bank_name, 'HDFC Bank'),
              bank_account_number = COALESCE(bank_account_number, $8),
              bank_ifsc = COALESCE(bank_ifsc, 'HDFC0000123'),
              bank_account_holder = COALESCE(bank_account_holder, $9),
              uan_number = COALESCE(uan_number, $10),
              esi_number = COALESCE(esi_number, $11),
              updated_at = NOW()
            WHERE employee_id = $12
          `, [
            emp.code, emp.firstName, emp.lastName, emp.designation,
            departmentId, hierarchyLevelId, father, acct,
            `${emp.firstName} ${emp.lastName}`, uan, esi, empId
          ]);
          updatedEmpCount++;
        } else {
          // Check if code is already taken by another email
          const codeToUse = empMapByCode[emp.code]
            ? `EMP${Math.floor(1000 + Math.random() * 9000)}`
            : emp.code;

          const insRes = await client.query(`
            INSERT INTO employees (
              organization_id, employee_code, first_name, last_name, email,
              phone, gender, date_of_joining, department_id, designation,
              employment_type, status, hierarchy_level_id, father_name,
              bank_name, bank_account_number, bank_ifsc, bank_account_holder,
              uan_number, esi_number
            ) VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, '2026-01-01'::DATE, $8, $9,
              'full_time', 'active', $10, $11,
              'HDFC Bank', $12, 'HDFC0000123', $13,
              $14, $15
            ) RETURNING employee_id
          `, [
            organizationId, codeToUse, emp.firstName, emp.lastName, emp.email,
            '98765' + String(Math.floor(10000 + Math.random() * 90000)), emp.gender,
            departmentId, emp.designation, hierarchyLevelId, father, acct,
            `${emp.firstName} ${emp.lastName}`, uan, esi
          ]);

          emailToEmpId[emp.email] = insRes.rows[0].employee_id;
          createdEmpCount++;
        }
      }

      // Pass 2: Update reporting manager relationships
      for (const emp of employeeData) {
        const empId = emailToEmpId[emp.email];
        const managerEmpId = emp.managerEmail ? emailToEmpId[emp.managerEmail] || null : null;
        await client.query(
          'UPDATE employees SET manager_employee_id = $1 WHERE employee_id = $2',
          [managerEmpId, empId]
        );
      }

      // Pass 3: Upsert User logins with Password12345 (DO NOT touch client_admin or super_admin)
      let userCount = 0;
      for (const emp of employeeData) {
        const empId = emailToEmpId[emp.email];
        const existingUser = userMapByEmail[emp.email];

        if (existingUser) {
          // Never overwrite client_admin or super_admin roles or passwords
          if (existingUser.role !== 'client_admin' && existingUser.role !== 'super_admin') {
            await client.query(`
              UPDATE users SET
                employee_id = $1,
                role = $2,
                password_hash = $3,
                is_active = true,
                attendance_enabled = true,
                updated_at = NOW()
              WHERE user_id = $4
            `, [empId, emp.role, passwordHash, existingUser.user_id]);
          }
        } else {
          await client.query(`
            INSERT INTO users (
              organization_id, employee_id, email, password_hash, role,
              is_active, attendance_enabled, password_reset_required, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5,
              true, true, false, NOW(), NOW()
            )
          `, [organizationId, empId, emp.email, passwordHash, emp.role]);
          userCount++;
        }
      }

      console.log(`[Seeder 006] Employee sync complete. Created: ${createdEmpCount}, Updated: ${updatedEmpCount}, New Logins: ${userCount}`);
      console.log(`[Seeder 006] Total Target Workforce: ${employeeData.length} employees (8 per department).`);
    });

  } catch (err) {
    console.error('[Seeder 006] Error seeding employees:', err);
    throw err;
  }
}

module.exports = seed;