const { Pool } = require('pg')

const db = new Pool({ host: 'localhost', port: 5432, database: 'pms_db', user: 'postgres', password: 'postgres@123' })

const EMPLOYEES = [
  { firstName: 'Aditya',   lastName: 'Mehta',    email: 'aditya.mehta@company.com',    phone: '9876510001', gender: 'Male'   },
  { firstName: 'Divya',    lastName: 'Krishnan',  email: 'divya.krishnan@company.com',  phone: '9876510002', gender: 'Female' },
  { firstName: 'Nikhil',   lastName: 'Reddy',     email: 'nikhil.reddy@company.com',    phone: '9876510003', gender: 'Male'   },
  { firstName: 'Meera',    lastName: 'Pillai',    email: 'meera.pillai@company.com',    phone: '9876510004', gender: 'Female' },
  { firstName: 'Suresh',   lastName: 'Babu',      email: 'suresh.babu@company.com',     phone: '9876510005', gender: 'Male'   },
  { firstName: 'Ananya',   lastName: 'Gupta',     email: 'ananya.gupta@company.com',    phone: '9876510006', gender: 'Female' },
]

async function seed() {
  try {
    const caRow = await db.query('SELECT id FROM client_admins LIMIT 1')
    if (!caRow.rows.length) { console.error('No client admin found.'); process.exit(1) }
    const clientAdminId = caRow.rows[0].id

    const hlRow = await db.query(
      `SELECT id, level_code, designation FROM hierarchy_levels
       WHERE client_admin_id=$1 AND UPPER(level_code)='L3' LIMIT 1`,
      [clientAdminId]
    )
    if (!hlRow.rows.length) { console.error('L3 hierarchy level not found. Add it in Hierarchy settings first.'); process.exit(1) }
    const level = hlRow.rows[0]
    console.log(`Level: ${level.level_code} — ${level.designation}\n`)

    const prefRow = await db.query('SELECT emp_code_prefix FROM companies WHERE id=1')
    const prefix = (prefRow.rows[0]?.emp_code_prefix || 'EMP').toUpperCase()

    const depts = await db.query(
      'SELECT id, name FROM departments WHERE client_admin_id=$1 ORDER BY parent_id NULLS FIRST, id',
      [clientAdminId]
    )
    console.log(`Seeding L3 employees for ${depts.rows.length} department(s)...\n`)

    for (let i = 0; i < depts.rows.length; i++) {
      const dept = depts.rows[i]
      const empData = EMPLOYEES[i]

      const existing = await db.query(
        'SELECT id FROM employees WHERE email=$1 AND client_admin_id=$2',
        [empData.email, clientAdminId]
      )
      if (existing.rows.length) {
        console.log(`  Skipped (already exists): ${empData.firstName} ${empData.lastName} → ${dept.name}`)
        continue
      }

      const mx = await db.query(
        'SELECT COALESCE(MAX(id), 0) AS mx FROM employees WHERE client_admin_id=$1',
        [clientAdminId]
      )
      const seq = parseInt(mx.rows[0].mx) + 1
      const employeeCode = `${prefix}${String(seq).padStart(4, '0')}`

      const r = await db.query(`
        INSERT INTO employees
          (client_admin_id, employee_code, first_name, last_name, email, phone,
           gender, date_of_joining, department_id, designation,
           employment_type, status, hierarchy_level_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING id, employee_code, first_name, last_name
      `, [
        clientAdminId, employeeCode,
        empData.firstName, empData.lastName, empData.email, empData.phone,
        empData.gender, '2024-06-01',
        dept.id, level.designation,
        'full_time', 'active', level.id,
      ])

      const emp = r.rows[0]
      console.log(`  Created: ${emp.employee_code} | ${emp.first_name} ${emp.last_name} → ${dept.name}`)
    }

    console.log('\nDone.')
  } catch (err) {
    console.error('Seed error:', err.message)
  } finally {
    await db.end()
  }
}

seed()
