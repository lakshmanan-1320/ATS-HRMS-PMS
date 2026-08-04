const { Pool } = require('pg')

const db = new Pool({ host: 'localhost', port: 5432, database: 'pms_db', user: 'postgres', password: 'postgres@123' })

// 15 L4 employees spread across 6 departments (dept index 0–5)
// Dept order from DB: Tech Consulting(0), HR Recruitment(1), Digital Marketing(2),
//                     Software Development(3), Talent Acquisition(4), SEO & Content(5)
const EMPLOYEES = [
  // Tech Consulting — 3
  { firstName: 'Vikram',    lastName: 'Singh',      email: 'vikram.singh@company.com',      phone: '9876520001', gender: 'Male',   deptIndex: 0 },
  { firstName: 'Pooja',     lastName: 'Sharma',     email: 'pooja.sharma@company.com',      phone: '9876520002', gender: 'Female', deptIndex: 0 },
  { firstName: 'Rajesh',    lastName: 'Kumar',      email: 'rajesh.kumar@company.com',      phone: '9876520003', gender: 'Male',   deptIndex: 0 },
  // HR Recruitment — 3
  { firstName: 'Lakshmi',   lastName: 'Venkat',     email: 'lakshmi.venkat@company.com',    phone: '9876520004', gender: 'Female', deptIndex: 1 },
  { firstName: 'Ganesh',    lastName: 'Patel',      email: 'ganesh.patel@company.com',      phone: '9876520005', gender: 'Male',   deptIndex: 1 },
  { firstName: 'Preethi',   lastName: 'Nair',       email: 'preethi.nair@company.com',      phone: '9876520006', gender: 'Female', deptIndex: 1 },
  // Digital Marketing — 3
  { firstName: 'Arjun',     lastName: 'Menon',      email: 'arjun.menon@company.com',       phone: '9876520007', gender: 'Male',   deptIndex: 2 },
  { firstName: 'Kavitha',   lastName: 'Rajan',      email: 'kavitha.rajan@company.com',     phone: '9876520008', gender: 'Female', deptIndex: 2 },
  { firstName: 'Santhosh',  lastName: 'Iyer',       email: 'santhosh.iyer@company.com',     phone: '9876520009', gender: 'Male',   deptIndex: 2 },
  // Software Development — 2
  { firstName: 'Deepa',     lastName: 'Mohan',      email: 'deepa.mohan@company.com',       phone: '9876520010', gender: 'Female', deptIndex: 3 },
  { firstName: 'Kiran',     lastName: 'Bose',       email: 'kiran.bose@company.com',        phone: '9876520011', gender: 'Male',   deptIndex: 3 },
  // Talent Acquisition — 2
  { firstName: 'Nithya',    lastName: 'Subramanian',email: 'nithya.subramanian@company.com',phone: '9876520012', gender: 'Female', deptIndex: 4 },
  { firstName: 'Prasad',    lastName: 'Rao',        email: 'prasad.rao@company.com',        phone: '9876520013', gender: 'Male',   deptIndex: 4 },
  // SEO & Content — 2
  { firstName: 'Swathi',    lastName: 'Chandran',   email: 'swathi.chandran@company.com',   phone: '9876520014', gender: 'Female', deptIndex: 5 },
  { firstName: 'Manoj',     lastName: 'Das',        email: 'manoj.das@company.com',         phone: '9876520015', gender: 'Male',   deptIndex: 5 },
]

async function seed() {
  try {
    const caRow = await db.query('SELECT id FROM client_admins LIMIT 1')
    if (!caRow.rows.length) { console.error('No client admin found.'); process.exit(1) }
    const clientAdminId = caRow.rows[0].id

    const hlRow = await db.query(
      `SELECT id, level_code, designation FROM hierarchy_levels
       WHERE client_admin_id=$1 AND UPPER(level_code)='L4' LIMIT 1`,
      [clientAdminId]
    )
    if (!hlRow.rows.length) { console.error('L4 hierarchy level not found. Add it in Hierarchy settings first.'); process.exit(1) }
    const level = hlRow.rows[0]
    console.log(`Level: ${level.level_code} — ${level.designation}\n`)

    const prefRow = await db.query('SELECT emp_code_prefix FROM companies WHERE id=1')
    const prefix = (prefRow.rows[0]?.emp_code_prefix || 'EMP').toUpperCase()

    const depts = await db.query(
      'SELECT id, name FROM departments WHERE client_admin_id=$1 ORDER BY parent_id NULLS FIRST, id',
      [clientAdminId]
    )
    const deptList = depts.rows
    console.log(`Departments: ${deptList.map(d => d.name).join(', ')}\n`)
    console.log(`Seeding ${EMPLOYEES.length} L4 employees...\n`)

    let created = 0, skipped = 0

    for (const empData of EMPLOYEES) {
      const dept = deptList[empData.deptIndex]
      if (!dept) {
        console.log(`  Skipped: no department at index ${empData.deptIndex}`)
        skipped++
        continue
      }

      const existing = await db.query(
        'SELECT id FROM employees WHERE email=$1 AND client_admin_id=$2',
        [empData.email, clientAdminId]
      )
      if (existing.rows.length) {
        console.log(`  Skipped (exists): ${empData.firstName} ${empData.lastName}`)
        skipped++
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
        empData.gender, '2024-07-01',
        dept.id, level.designation,
        'full_time', 'active', level.id,
      ])

      const emp = r.rows[0]
      console.log(`  ${emp.employee_code} | ${emp.first_name} ${emp.last_name} → ${dept.name}`)
      created++
    }

    console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`)
  } catch (err) {
    console.error('Seed error:', err.message)
  } finally {
    await db.end()
  }
}

seed()
