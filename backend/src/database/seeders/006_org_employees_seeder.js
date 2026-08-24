const { query, withTransaction } = require('../../config/db')
const bcrypt = require('bcryptjs')

async function seed() {
  try {
    // 1. Get client admin organization_id
    const caRow = await query('SELECT organization_id FROM client_admins LIMIT 1')
    if (!caRow.rows.length) {
      throw new Error('No client admin found. Run 002_default_client_admin.js first.')
    }
    const organizationId = caRow.rows[0].organization_id

    // 2. Fetch hierarchy levels
    const levelsRes = await query('SELECT hierarchy_level_id, level_code FROM hierarchy_levels WHERE organization_id = $1', [organizationId])
    const levelsMap = {}
    levelsRes.rows.forEach(row => {
      levelsMap[row.level_code.toUpperCase()] = row.hierarchy_level_id
    })

    // Validate that we have L1-L5 levels
    for (const code of ['L1', 'L2', 'L3', 'L4', 'L5']) {
      if (!levelsMap[code]) {
        throw new Error(`Hierarchy level ${code} not found. Run 003_default_hierarchy_levels.js first.`)
      }
    }

    // 3. Fetch departments
    const deptsRes = await query('SELECT department_id, name FROM departments WHERE organization_id = $1', [organizationId])
    const deptsMap = {}
    deptsRes.rows.forEach(row => {
      deptsMap[row.name] = row.department_id
    })

    // Validate that we have the 5 required departments
    const requiredDepts = [
      'Tech Consulting',
      'HR Recruitment',
      'Digital Marketing',
      'Finance & Accounts',
      'Customer Operations'
    ]
    for (const dName of requiredDepts) {
      if (!deptsMap[dName]) {
        throw new Error(`Department "${dName}" not found. Run 004_sample_departments.js first.`)
      }
    }

    // Define the 20 employees to seed with manager relationships
    const employeeData = [
      // L1 - CEO
      {
        email: 'kumar@example.com',
        firstName: 'Kumar',
        lastName: 'Sanjeev',
        code: 'EMP0001',
        gender: 'Male',
        designation: 'CEO',
        levelCode: 'L1',
        deptName: 'Tech Consulting',
        role: 'manager',
        managerEmail: null
      },
      // L2 - Directors
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
        managerEmail: 'kumar@example.com'
      },
      {
        email: 'deepa.krishnan@company.com',
        firstName: 'Deepa',
        lastName: 'Krishnan',
        code: 'EMP0011',
        gender: 'Female',
        designation: 'Director',
        levelCode: 'L2',
        deptName: 'Finance & Accounts',
        role: 'manager',
        managerEmail: 'kumar@example.com'
      },
      // L3 - Managers
      {
        email: 'rahul.verma@company.com',
        firstName: 'Rahul',
        lastName: 'Verma',
        code: 'EMP0003',
        gender: 'Male',
        designation: 'Manager',
        levelCode: 'L3',
        deptName: 'HR Recruitment',
        role: 'manager',
        managerEmail: 'arjun.sharma@company.com'
      },
      {
        email: 'priya.nair@company.com',
        firstName: 'Priya',
        lastName: 'Nair',
        code: 'EMP0004',
        gender: 'Female',
        designation: 'Manager',
        levelCode: 'L3',
        deptName: 'Digital Marketing',
        role: 'manager',
        managerEmail: 'arjun.sharma@company.com'
      },
      {
        email: 'suresh.patel@company.com',
        firstName: 'Suresh',
        lastName: 'Patel',
        code: 'EMP0012',
        gender: 'Male',
        designation: 'Manager',
        levelCode: 'L3',
        deptName: 'Finance & Accounts',
        role: 'manager',
        managerEmail: 'deepa.krishnan@company.com'
      },
      {
        email: 'anita.desai@company.com',
        firstName: 'Anita',
        lastName: 'Desai',
        code: 'EMP0013',
        gender: 'Female',
        designation: 'Manager',
        levelCode: 'L3',
        deptName: 'Customer Operations',
        role: 'manager',
        managerEmail: 'arjun.sharma@company.com'
      },
      // L4 - Team Leads / Senior Executives
      {
        email: 'sneha.iyer@company.com',
        firstName: 'Sneha',
        lastName: 'Iyer',
        code: 'EMP0005',
        gender: 'Female',
        designation: 'Team Lead',
        levelCode: 'L4',
        deptName: 'Customer Operations',
        role: 'manager',
        managerEmail: 'rahul.verma@company.com'
      },
      {
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        code: 'EMP1001',
        gender: 'Male',
        designation: 'Senior Executive',
        levelCode: 'L4',
        deptName: 'Tech Consulting',
        role: 'employee',
        managerEmail: 'arjun.sharma@company.com'
      },
      {
        email: 'rohan@example.com',
        firstName: 'Rohan',
        lastName: 'Mehta',
        code: 'EMP0006',
        gender: 'Male',
        designation: 'Marketing Executive',
        levelCode: 'L4',
        deptName: 'Digital Marketing',
        role: 'employee',
        managerEmail: 'priya.nair@company.com'
      },
      {
        email: 'rajesh.kumar@company.com',
        firstName: 'Rajesh',
        lastName: 'Kumar',
        code: 'EMP0014',
        gender: 'Male',
        designation: 'Senior Accountant',
        levelCode: 'L4',
        deptName: 'Finance & Accounts',
        role: 'employee',
        managerEmail: 'suresh.patel@company.com'
      },
      {
        email: 'meera.reddy@company.com',
        firstName: 'Meera',
        lastName: 'Reddy',
        code: 'EMP0015',
        gender: 'Female',
        designation: 'Team Lead',
        levelCode: 'L4',
        deptName: 'Tech Consulting',
        role: 'manager',
        managerEmail: 'arjun.sharma@company.com'
      },
      // L5 - Associates / Junior Staff
      {
        email: 'karthik.pillai@company.com',
        firstName: 'Karthik',
        lastName: 'Pillai',
        code: 'EMP0007',
        gender: 'Male',
        designation: 'Customer Associate',
        levelCode: 'L5',
        deptName: 'Customer Operations',
        role: 'employee',
        managerEmail: 'sneha.iyer@company.com'
      },
      {
        email: 'vikram@example.com',
        firstName: 'Vikram',
        lastName: 'Singh',
        code: 'EMP0008',
        gender: 'Male',
        designation: 'Customer Associate',
        levelCode: 'L5',
        deptName: 'Customer Operations',
        role: 'employee',
        managerEmail: 'sneha.iyer@company.com'
      },
      {
        email: 'neha@example.com',
        firstName: 'Neha',
        lastName: 'Gupta',
        code: 'EMP0009',
        gender: 'Female',
        designation: 'Finance Associate',
        levelCode: 'L5',
        deptName: 'Finance & Accounts',
        role: 'employee',
        managerEmail: 'rahul.verma@company.com'
      },
      {
        email: 'amit.shah@company.com',
        firstName: 'Amit',
        lastName: 'Shah',
        code: 'EMP0016',
        gender: 'Male',
        designation: 'Recruitment Associate',
        levelCode: 'L5',
        deptName: 'HR Recruitment',
        role: 'employee',
        managerEmail: 'rahul.verma@company.com'
      },
      {
        email: 'priyanka.goyal@company.com',
        firstName: 'Priyanka',
        lastName: 'Goyal',
        code: 'EMP0017',
        gender: 'Female',
        designation: 'Marketing Associate',
        levelCode: 'L5',
        deptName: 'Digital Marketing',
        role: 'employee',
        managerEmail: 'priya.nair@company.com'
      },
      {
        email: 'sanjay.mishra@company.com',
        firstName: 'Sanjay',
        lastName: 'Mishra',
        code: 'EMP0018',
        gender: 'Male',
        designation: 'Accounts Executive',
        levelCode: 'L5',
        deptName: 'Finance & Accounts',
        role: 'employee',
        managerEmail: 'rajesh.kumar@company.com'
      },
      {
        email: 'nisha.verma@company.com',
        firstName: 'Nisha',
        lastName: 'Verma',
        code: 'EMP0019',
        gender: 'Female',
        designation: 'Customer Associate',
        levelCode: 'L5',
        deptName: 'Customer Operations',
        role: 'employee',
        managerEmail: 'anita.desai@company.com'
      },
      {
        email: 'deepak.joshi@company.com',
        firstName: 'Deepak',
        lastName: 'Joshi',
        code: 'EMP0020',
        gender: 'Male',
        designation: 'Junior Developer',
        levelCode: 'L5',
        deptName: 'Tech Consulting',
        role: 'employee',
        managerEmail: 'meera.reddy@company.com'
      }
    ]

    const passwordHash = await bcrypt.hash('Password12345', 12)

    await withTransaction(async (client) => {
      // Build a map of email -> employee_id for existing employees
      const emails = employeeData.map(e => e.email)
      const existingEmpRes = await client.query(
        'SELECT employee_id, email FROM employees WHERE email = ANY($1) AND organization_id = $2',
        [emails, organizationId]
      )
      const existingEmpMap = {}
      existingEmpRes.rows.forEach(row => {
        existingEmpMap[row.email] = row.employee_id
      })

      // Also check existing users
      const existingUserRes = await client.query(
        'SELECT user_id, email, employee_id FROM users WHERE email = ANY($1) AND organization_id = $2',
        [emails, organizationId]
      )
      const existingUserMap = {}
      existingUserRes.rows.forEach(row => {
        existingUserMap[row.email] = { user_id: row.user_id, employee_id: row.employee_id }
      })

      const emailToEmpIdMap = { ...existingEmpMap }
      const emailToUserIdMap = {}
      existingUserRes.rows.forEach(row => {
        emailToUserIdMap[row.email] = row.user_id
      })

      let createdCount = 0
      let skippedCount = 0

      // Insert employees in topological order (managers first, then reports)
      for (const emp of employeeData) {
        const hierarchyLevelId = levelsMap[emp.levelCode]
        const departmentId = deptsMap[emp.deptName]
        const managerId = emp.managerEmail ? emailToEmpIdMap[emp.managerEmail] : null

        // Check if employee already exists
        if (existingEmpMap[emp.email]) {
          skippedCount++
          console.log(`  ⏭️  Already exists: ${emp.firstName} ${emp.lastName} (${emp.code})`)

          // Ensure user login also exists
          if (!existingUserMap[emp.email]) {
            const userRes = await client.query(`
              INSERT INTO users (
                organization_id, employee_id, email, password_hash, role, is_active, attendance_enabled, password_reset_required
              ) VALUES ($1, $2, $3, $4, $5, true, true, false)
              ON CONFLICT (organization_id, email) DO NOTHING
              RETURNING user_id
            `, [
              organizationId,
              existingEmpMap[emp.email],
              emp.email,
              passwordHash,
              emp.role
            ])
            if (userRes.rows.length) {
              emailToUserIdMap[emp.email] = userRes.rows[0].user_id
              console.log(`   🔑 Created missing user login for ${emp.email}`)
            }
          }
          continue
        }

        // Create new employee
        const empRes = await client.query(`
          INSERT INTO employees (
            organization_id, employee_code, first_name, last_name, email,
            phone, gender, date_of_joining, department_id, designation,
            employment_type, status, hierarchy_level_id, manager_employee_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, '2026-01-01'::DATE, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (organization_id, employee_code) DO NOTHING
          RETURNING employee_id, employee_code, first_name, last_name, email
        `, [
          organizationId,
          emp.code,
          emp.firstName,
          emp.lastName,
          emp.email,
          '98765' + String(Math.floor(10000 + Math.random() * 90000)),
          emp.gender,
          departmentId,
          emp.designation,
          'full_time',
          'active',
          hierarchyLevelId,
          managerId
        ])

        if (!empRes.rows.length) {
          // Employee code conflict but different email - skip
          console.log(`  ⏭️  Employee code ${emp.code} already in use, skipping`)
          skippedCount++
          continue
        }

        const createdEmp = empRes.rows[0]
        emailToEmpIdMap[emp.email] = createdEmp.employee_id
        createdCount++
        console.log(`✅ Created Employee: ${createdEmp.first_name} ${createdEmp.last_name} (${createdEmp.employee_code})`)

        // Create User Login
        const userRes = await client.query(`
          INSERT INTO users (
            organization_id, employee_id, email, password_hash, role, is_active, attendance_enabled, password_reset_required
          ) VALUES ($1, $2, $3, $4, $5, true, true, false)
          ON CONFLICT (organization_id, email) DO NOTHING
          RETURNING user_id
        `, [
          organizationId,
          createdEmp.employee_id,
          emp.email,
          passwordHash,
          emp.role
        ])
        
        if (userRes.rows.length) {
          emailToUserIdMap[emp.email] = userRes.rows[0].user_id
          console.log(`   🔑 User Login created with password: Password12345 (Role: ${emp.role})`)
        }
      }

      // 4. Insert mock attendance punches for the past 3 days for NEW employees only
      // Check if punches already exist before inserting
      const existingPunchCheck = await client.query(
        'SELECT DISTINCT employee_id FROM attendance_punches WHERE employee_id = ANY(SELECT user_id FROM users WHERE email = ANY($1))',
        [emails]
      )
      const existingPunchUserIds = new Set(existingPunchCheck.rows.map(r => r.employee_id))

      let punchCount = 0
      for (const email of emails) {
        const uId = emailToUserIdMap[email]
        if (!uId) continue
        if (existingPunchUserIds.has(uId)) continue // Skip if punches already exist

        // Generate random check-in/out times for 3 days
        const today = new Date()
        const dates = []
        for (let i = 1; i <= 3; i++) {
          const d = new Date(today)
          d.setDate(d.getDate() - i)
          dates.push(d.toISOString().split('T')[0])
        }

        for (const date of dates) {
          // Random check-in between 8:30 AM and 10:00 AM
          const checkInHour = 8 + Math.floor(Math.random() * 2)
          const checkInMin = Math.floor(Math.random() * 60)
          const checkIn = new Date(`${date}T${String(checkInHour).padStart(2, '0')}:${String(checkInMin).padStart(2, '0')}:00Z`)
          
          // Random check-out between 5:00 PM and 7:30 PM (80% chance of check-out)
          let checkOut = null
          let workMins = null
          if (Math.random() > 0.2) { // 80% chance of checking out
            const checkOutHour = 17 + Math.floor(Math.random() * 3)
            const checkOutMin = Math.floor(Math.random() * 60)
            checkOut = new Date(`${date}T${String(checkOutHour).padStart(2, '0')}:${String(checkOutMin).padStart(2, '0')}:00Z`)
            workMins = Math.round((checkOut - checkIn) / (1000 * 60))
            workMins = Math.max(workMins, 480) // Minimum 8 hours
          }

          await client.query(`
            INSERT INTO attendance_punches (
              employee_id, attendance_date, check_in_time, check_out_time,
              check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude,
              zone_name, distance_meters, is_within_fence, work_duration_minutes, device_info
            )
            VALUES ($1, $2, $3, $4, 8.109034, 77.43338, 8.109034, 77.43338, 'Headquarters', 12, true, $5, $6)
            ON CONFLICT (employee_id, attendance_date) DO NOTHING
          `, [
            uId,
            date,
            checkIn.toISOString(),
            checkOut ? checkOut.toISOString() : null,
            workMins,
            JSON.stringify({ platform: 'Web', browser: 'Chrome' })
          ])
          punchCount++
        }
      }
      if (punchCount > 0) {
        console.log(`\n📊 Seeded ${punchCount} attendance punch records for new employees`)
      }

      // 5. Seed Salary Structures if not exists
      const structCheck = await client.query('SELECT salary_structure_id, structure_name FROM salary_structures WHERE organization_id = $1', [organizationId])
      const existingStructs = {}
      structCheck.rows.forEach(r => {
        existingStructs[r.structure_name] = r.salary_structure_id
      })

      const structureDefs = [
        { name: 'Executive Structure', basic: 150000.00, hra: 60000.00, special: 30000.00, travel: 10000.00, medical: 5000.00 },
        { name: 'Manager Structure', basic: 60000.00, hra: 24000.00, special: 12000.00, travel: 5000.00, medical: 3000.00 },
        { name: 'Standard Employee Structure', basic: 30000.00, hra: 12000.00, special: 6000.00, travel: 3000.00, medical: 2000.00 }
      ]

      const structIds = {}
      for (const sd of structureDefs) {
        if (existingStructs[sd.name]) {
          structIds[sd.name] = existingStructs[sd.name]
        } else {
          const res = await client.query(`
            INSERT INTO salary_structures (
              organization_id, structure_name, basic_salary, hra_amount,
              special_allowance_amount, travel_allowance_amount, medical_allowance_amount,
              is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
            RETURNING salary_structure_id
          `, [organizationId, sd.name, sd.basic, sd.hra, sd.special, sd.travel, sd.medical])
          structIds[sd.name] = res.rows[0].salary_structure_id
          console.log(`   💰 Created salary structure: ${sd.name}`)
        }
      }

      // 6. Seed Salary Assignments for all employees, backfill father_name, bank info, UAN, ESI
      const allEmpRes = await client.query('SELECT employee_id, first_name, last_name, employee_code, date_of_joining, hierarchy_level_id FROM employees WHERE organization_id = $1', [organizationId])
      
      const levelIdToCode = {}
      const allLevels = await client.query('SELECT hierarchy_level_id, level_code FROM hierarchy_levels WHERE organization_id = $1', [organizationId])
      allLevels.rows.forEach(l => {
        levelIdToCode[l.hierarchy_level_id] = l.level_code.toUpperCase()
      })

      for (const e of allEmpRes.rows) {
        const uan = '10000000' + e.employee_code.replace('EMP', '').padStart(4, '0')
        const esi = '3100000000' + e.employee_code.replace('EMP', '').padStart(4, '0')
        const father = 'S/o ' + e.first_name + ' Senior'
        const acct = '50100223344' + e.employee_code.replace('EMP', '').padStart(4, '0')

        await client.query(`
          UPDATE employees SET
            father_name = COALESCE(father_name, $1),
            bank_name = COALESCE(bank_name, 'HDFC Bank'),
            bank_account_number = COALESCE(bank_account_number, $2),
            bank_ifsc = COALESCE(bank_ifsc, 'HDFC0000123'),
            bank_account_holder = COALESCE(bank_account_holder, $3),
            uan_number = COALESCE(uan_number, $4),
            esi_number = COALESCE(esi_number, $5),
            date_of_joining = COALESCE(date_of_joining, '2026-01-01'::DATE)
          WHERE employee_id = $6
        `, [father, acct, `${e.first_name} ${e.last_name}`, uan, esi, e.employee_id])

        const lvlCode = levelIdToCode[e.hierarchy_level_id] || 'L5'
        let sName = 'Standard Employee Structure'
        if (lvlCode === 'L1') sName = 'Executive Structure'
        else if (lvlCode === 'L2' || lvlCode === 'L3') sName = 'Manager Structure'

        const structId = structIds[sName]

        const assignCheck = await client.query('SELECT assignment_id FROM employee_salary_assignments WHERE employee_id = $1 LIMIT 1', [e.employee_id])
        if (!assignCheck.rows.length) {
          await client.query(`
            INSERT INTO employee_salary_assignments (
              organization_id, employee_id, salary_structure_id, effective_from, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, NOW(), NOW())
          `, [organizationId, e.employee_id, structId, e.date_of_joining || '2026-01-01'])
          console.log(`   🔗 Assigned structure "${sName}" to ${e.first_name} ${e.last_name}`)
        }
      }

      // ─── 7. Seed Payroll Data for 5 employees (idempotent) ───
      // Employees: Kumar Sanjeev, Arjun Sharma, John Doe, Sneha Iyer, Karthik Pillai
      const payrollEmpEmails = [
        'kumar@example.com',
        'arjun.sharma@company.com',
        'john@example.com',
        'sneha.iyer@company.com',
        'karthik.pillai@company.com'
      ]

      // Check if seed payroll run already exists for May 2026
      const seedRunCheck = await client.query(
        `SELECT payroll_run_id FROM payroll_runs
         WHERE organization_id = $1 AND payroll_month = 5 AND payroll_year = 2026`,
        [organizationId]
      )

      if (seedRunCheck.rows.length) {
        console.log('  ⏭️  Payroll run for May 2026 already exists, skipping payroll seeding.')
      } else {
        // Get the client admin user id to use as the generated_by / locked_by user
        const adminUserRes = await client.query(
          `SELECT u.user_id FROM users u
           JOIN client_admins ca ON u.organization_id = ca.organization_id
           WHERE u.role = 'client_admin' LIMIT 1`
        )
        const adminUserId = adminUserRes.rows[0]?.user_id

        if (!adminUserId) {
          console.log('  ⚠️  No client admin user found, skipping payroll seeding.')
        } else {
          // Fetch week-off settings from the week_off_days table
          const woRes = await client.query(
            `SELECT DISTINCT wod.weekday FROM week_off_days wod
             JOIN week_off_settings wos ON wod.week_off_setting_id = wos.week_off_setting_id
             WHERE wos.organization_id = $1 AND wos.is_enabled = true
               AND wod.off_type = 'FULL' AND wod.week_number = 'ALL'`,
            [organizationId]
          )
          const weekOffs = woRes.rows.length > 0 ? woRes.rows.map(r => r.weekday) : [0, 6]

          // Holidays in May 2026
          const mayHolidays = await client.query(
            `SELECT holiday_date FROM holidays
             WHERE is_active = true AND is_deleted = false
               AND holiday_date >= '2026-05-01' AND holiday_date <= '2026-05-31'`
          )
          const holidaySet = new Set(mayHolidays.rows.map(h => {
            const d = new Date(h.holiday_date)
            return d.toISOString().split('T')[0]
          }))

          // Calculate working days in May 2026
          const mayDates = []
          const start = new Date('2026-05-01T00:00:00Z')
          const end = new Date('2026-05-31T00:00:00Z')
          for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
            mayDates.push(new Date(d))
          }
          let totalWeekOff = 0, totalHoliday = 0
          const woSet = new Set(), hdSet = new Set()
          mayDates.forEach(d => {
            const ds = d.toISOString().split('T')[0]
            if (weekOffs.includes(d.getUTCDay())) {
              totalWeekOff++
              woSet.add(ds)
            } else if (holidaySet.has(ds)) {
              totalHoliday++
              hdSet.add(ds)
            }
          })
          const workingDays = mayDates.length - totalWeekOff - totalHoliday

          // Create the payroll run for May 2026
          const runRes = await client.query(`
            INSERT INTO payroll_runs (
              organization_id, payroll_month, payroll_year, payroll_start_date, payroll_end_date,
              current_status, generated_by_admin_user_id, generated_at,
              approved_by_admin_user_id, approved_at,
              locked_by_admin_user_id, locked_at,
              created_at, updated_at
            ) VALUES (
              $1, 5, 2026, '2026-05-01', '2026-05-31',
              'LOCKED', $2, NOW(), $2, NOW(), $2, NOW(),
              NOW(), NOW()
            ) RETURNING payroll_run_id
          `, [organizationId, adminUserId])
          const payrollRunId = runRes.rows[0].payroll_run_id
          console.log(`\n💰 Created LOCKED payroll run for May 2026 (ID: ${payrollRunId})`)

          // For each of the 5 employees, create payroll records
          for (const peEmail of payrollEmpEmails) {
            const empId = emailToEmpIdMap[peEmail]
            if (!empId) {
              console.log(`  ⚠️  Employee ${peEmail} not found in map, skipping payroll.`)
              continue
            }

            // Get their salary assignment
            const assignRes = await client.query(`
              SELECT sa.salary_structure_id, ss.basic_salary, ss.hra_amount,
                     ss.special_allowance_amount, ss.travel_allowance_amount, ss.medical_allowance_amount
              FROM employee_salary_assignments sa
              JOIN salary_structures ss ON sa.salary_structure_id = ss.salary_structure_id
              WHERE sa.employee_id = $1
                AND sa.effective_from <= '2026-05-31'
                AND (sa.effective_to IS NULL OR sa.effective_to >= '2026-05-31')
              LIMIT 1
            `, [empId])

            if (!assignRes.rows.length) {
              console.log(`  ⚠️  No salary assignment for ${peEmail}, skipping.`)
              continue
            }

            const sa = assignRes.rows[0]
            const basic = parseFloat(sa.basic_salary) || 0
            const hra = parseFloat(sa.hra_amount) || 0
            const special = parseFloat(sa.special_allowance_amount) || 0
            const travel = parseFloat(sa.travel_allowance_amount) || 0
            const medical = parseFloat(sa.medical_allowance_amount) || 0
            const gross = basic + hra + special + travel + medical

            // Simulate realistic present days (90-100% attendance)
            const presentDays = Math.max(1, workingDays - Math.floor(Math.random() * 3))
            const lopDays = Math.max(0, workingDays - presentDays)
            const perDay = gross / workingDays
            const lopDeduction = perDay * lopDays
            const netSalary = Math.max(0, gross - lopDeduction)

            // Generate payslip number
            const empCodeRes = await client.query('SELECT employee_code FROM employees WHERE employee_id = $1', [empId])
            const empCode = empCodeRes.rows[0]?.employee_code || empId.substring(0, 8)
            const payslipNumber = `PAY/2026/05/${empCode}`

            await client.query(`
              INSERT INTO employee_payrolls (
                payroll_run_id, employee_id, salary_structure_id,
                working_days, present_days, paid_leave_days, holiday_days, week_off_days,
                lop_days, gross_salary, total_earnings, total_additions, total_deductions,
                net_salary, current_status, payslip_number,
                payslip_generated_at, payslip_generated_by,
                created_at, updated_at
              ) VALUES (
                $1, $2, $3,
                $4, $5, 0, $6, $7,
                $8, $9, $9, 0, $10,
                $11, 'LOCKED', $12,
                NOW(), $13,
                NOW(), NOW()
              ) ON CONFLICT (payroll_run_id, employee_id) DO NOTHING
            `, [
              payrollRunId, empId, sa.salary_structure_id,
              workingDays, presentDays, totalHoliday, totalWeekOff,
              lopDays, gross, lopDeduction,
              netSalary, payslipNumber, adminUserId
            ])
            console.log(`   📄 Payroll record seeded for ${peEmail} — Net: ₹${netSalary.toFixed(2)}`)
          }

          // Create run logs
          await client.query(`
            INSERT INTO payroll_run_logs (payroll_run_id, action, action_taken_by, remarks, created_at)
            VALUES ($1, 'GENERATE', $2, 'Seeded payroll run for May 2026.', NOW()),
                   ($1, 'APPROVE', $2, 'Auto-approved during seed.', NOW()),
                   ($1, 'LOCK', $2, 'Auto-locked during seed.', NOW())
          `, [payrollRunId, adminUserId])
          console.log('   📝 Payroll run logs created (GENERATE → APPROVE → LOCK)')
        }
      }

      console.log(`\n✅ Employee seeding complete. Created: ${createdCount}, Skipped (already exist): ${skippedCount}`)
    })

    console.log(`📊 Total employees in seed list: ${employeeData.length}`)
    console.log('🔑 All new users have password: Password12345')
    
    // Print organizational structure summary
    console.log('\n📋 Organizational Structure:')
    console.log('L1 - CEO: Kumar Sanjeev')
    console.log('L2 - Directors: Arjun Sharma, Deepa Krishnan')
    console.log('L3 - Managers: Rahul Verma, Priya Nair, Suresh Patel, Anita Desai')
    console.log('L4 - Team Leads: Sneha Iyer, Meera Reddy | Employees: John Doe, Rohan Mehta, Rajesh Kumar')
    console.log('L5 - Associates: 8 employees across all departments')
    
  } catch (err) {
    console.error('❌ Seed organizational employees error:', err.message)
    throw err
  }
}

module.exports = seed