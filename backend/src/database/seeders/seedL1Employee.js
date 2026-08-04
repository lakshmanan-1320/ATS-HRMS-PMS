const { query, withTransaction } = require('../../config/db')
const bcrypt = require('bcryptjs')

const LEVEL_EMPLOYEES = {
  L1: { firstName: 'Arjun',   lastName: 'Sharma',  email: 'arjun.sharma@company.com',  phone: '9876500001', gender: 'Male',   doj: '2024-01-15' },
  L2: { firstName: 'Priya',   lastName: 'Nair',    email: 'priya.nair@company.com',    phone: '9876500002', gender: 'Female', doj: '2024-02-01' },
  L3: { firstName: 'Rahul',   lastName: 'Verma',   email: 'rahul.verma@company.com',   phone: '9876500003', gender: 'Male',   doj: '2024-03-01' },
  L4: { firstName: 'Sneha',   lastName: 'Iyer',    email: 'sneha.iyer@company.com',    phone: '9876500004', gender: 'Female', doj: '2024-04-01' },
  L5: { firstName: 'Karthik', lastName: 'Pillai',  email: 'karthik.pillai@company.com',phone: '9876500005', gender: 'Male',   doj: '2024-05-01' },
}

async function seed(levelCode = 'L1') {
  const code = levelCode.toUpperCase()
  const empData = LEVEL_EMPLOYEES[code]
  if (!empData) {
    console.error(`No seed data defined for level "${code}". Add it to LEVEL_EMPLOYEES in the script.`)
    process.exit(1)
  }

  try {
    const caRow = await query('SELECT client_admin_id, organization_id FROM client_admins LIMIT 1')
    if (!caRow.rows.length) {
      console.error('No client admin found. Please create one first.')
      process.exit(1)
    }
    const organizationId = caRow.rows[0].organization_id
    console.log(`Using organization_id: ${organizationId}`)

    const hlRow = await query(
      `SELECT hierarchy_level_id, level_code, designation FROM hierarchy_levels
       WHERE organization_id=$1 AND UPPER(level_code)=$2 LIMIT 1`,
      [organizationId, code]
    )
    if (!hlRow.rows.length) {
      console.error(`${code} hierarchy level not found. Please add it in Hierarchy settings first.`)
      process.exit(1)
    }
    const level = hlRow.rows[0]
    console.log(`Found level: ${level.level_code} — ${level.designation}`)

    const prefRow = await query('SELECT emp_code_prefix FROM companies WHERE id=1')
    const prefix = (prefRow.rows[0]?.emp_code_prefix || 'EMP').toUpperCase()

    const mx = await query('SELECT COUNT(employee_id) AS mx FROM employees WHERE organization_id=$1', [organizationId])
    const seq = parseInt(mx.rows[0].mx) + 1
    const employeeCode = `${prefix}${String(seq).padStart(4, '0')}`

    const deptRow = await query('SELECT department_id FROM departments WHERE organization_id=$1 LIMIT 1', [organizationId])
    const departmentId = deptRow.rows[0]?.department_id || null

    await withTransaction(async (client) => {
      const result = await client.query(`
        INSERT INTO employees
          (organization_id, employee_code, first_name, last_name, email, phone,
           gender, date_of_joining, department_id, designation,
           employment_type, status, hierarchy_level_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING employee_id, employee_code, first_name, last_name, email, designation, status
      `, [
        organizationId,
        employeeCode,
        empData.firstName,
        empData.lastName,
        empData.email,
        empData.phone,
        empData.gender,
        empData.doj,
        departmentId,
        level.designation,
        'full_time',
        'active',
        level.hierarchy_level_id,
      ])

      const emp = result.rows[0]

      if (emp.email) {
        const passwordHash = await bcrypt.hash('Password123', 12)
        const userRole = code === 'L1' ? 'super_admin' : (code === 'L3' ? 'manager' : 'employee');
        // Let's seed employee roles. Priya L2 can log in as 'employee' or we can map L1 to client_admin / employee. Wait, L1 Arjun is employee but CEO designation. Let's make all of them 'employee' role (or manager/hr depending on designation, let's keep role as 'employee' or 'manager' or 'hr' to test different dashboards). L3 Rahul Verma can be 'manager', L1 Arjun CEO can be 'employee', L2 Priya Nair can be 'employee'.
        await client.query(`
          INSERT INTO users (
            organization_id, employee_id, email, password_hash, role, is_active, attendance_enabled, password_reset_required
          ) VALUES ($1, $2, $3, $4, $5, true, true, false)
          ON CONFLICT (organization_id, email) DO UPDATE
            SET password_hash = EXCLUDED.password_hash,
                password_reset_required = false,
                is_active = true
        `, [
          organizationId,
          emp.employee_id,
          emp.email,
          passwordHash,
          userRole === 'super_admin' ? 'employee' : userRole, // arjun sharma L1 is employee role, not super_admin (which is global admin)
        ])
      }

      console.log(`\n${code} employee seeded successfully:`)
      console.log(`  Code        : ${emp.employee_code}`)
      console.log(`  Name        : ${emp.first_name} ${emp.last_name}`)
      console.log(`  Designation : ${emp.designation}`)
      console.log(`  Level       : ${level.level_code}`)
      console.log(`  Status      : ${emp.status}`)
    })
  } catch (err) {
    console.error('Seed error:', err.message)
    process.exit(1)
  }
}

module.exports = seed
