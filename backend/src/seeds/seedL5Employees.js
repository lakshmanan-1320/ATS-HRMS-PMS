const { Pool } = require('pg')

const db = new Pool({ host: 'localhost', port: 5432, database: 'pms_db', user: 'postgres', password: 'postgres@123' })

// 21 L5 employees spread across 6 departments
// Dept order: Tech Consulting(0), HR Recruitment(1), Digital Marketing(2),
//             Software Development(3), Talent Acquisition(4), SEO & Content(5)
const EMPLOYEES = [
  // Tech Consulting — 4
  { firstName: 'Harish',     lastName: 'Nambiar',    email: 'harish.nambiar@company.com',     phone: '9876530001', gender: 'Male',   deptIndex: 0 },
  { firstName: 'Ranjitha',   lastName: 'Shetty',     email: 'ranjitha.shetty@company.com',    phone: '9876530002', gender: 'Female', deptIndex: 0 },
  { firstName: 'Dinesh',     lastName: 'Kulkarni',   email: 'dinesh.kulkarni@company.com',    phone: '9876530003', gender: 'Male',   deptIndex: 0 },
  { firstName: 'Bhavana',    lastName: 'Hegde',      email: 'bhavana.hegde@company.com',      phone: '9876530004', gender: 'Female', deptIndex: 0 },
  // HR Recruitment — 4
  { firstName: 'Sunil',      lastName: 'Mathew',     email: 'sunil.mathew@company.com',       phone: '9876530005', gender: 'Male',   deptIndex: 1 },
  { firstName: 'Archana',    lastName: 'Tiwari',     email: 'archana.tiwari@company.com',     phone: '9876530006', gender: 'Female', deptIndex: 1 },
  { firstName: 'Mithun',     lastName: 'George',     email: 'mithun.george@company.com',      phone: '9876530007', gender: 'Male',   deptIndex: 1 },
  { firstName: 'Saranya',    lastName: 'Krishnadas', email: 'saranya.krishnadas@company.com', phone: '9876530008', gender: 'Female', deptIndex: 1 },
  // Digital Marketing — 4
  { firstName: 'Vivek',      lastName: 'Anand',      email: 'vivek.anand@company.com',        phone: '9876530009', gender: 'Male',   deptIndex: 2 },
  { firstName: 'Ishwarya',   lastName: 'Murthy',     email: 'ishwarya.murthy@company.com',    phone: '9876530010', gender: 'Female', deptIndex: 2 },
  { firstName: 'Balaji',     lastName: 'Natarajan',  email: 'balaji.natarajan@company.com',   phone: '9876530011', gender: 'Male',   deptIndex: 2 },
  { firstName: 'Yamini',     lastName: 'Prasad',     email: 'yamini.prasad@company.com',      phone: '9876530012', gender: 'Female', deptIndex: 2 },
  // Software Development — 3
  { firstName: 'Gowtham',    lastName: 'Sundaram',   email: 'gowtham.sundaram@company.com',   phone: '9876530013', gender: 'Male',   deptIndex: 3 },
  { firstName: 'Keerthana',  lastName: 'Pillai',     email: 'keerthana.pillai@company.com',   phone: '9876530014', gender: 'Female', deptIndex: 3 },
  { firstName: 'Arun',       lastName: 'Chandrasekhar', email: 'arun.chandrasekhar@company.com', phone: '9876530015', gender: 'Male', deptIndex: 3 },
  // Talent Acquisition — 3
  { firstName: 'Padmaja',    lastName: 'Menon',      email: 'padmaja.menon@company.com',      phone: '9876530016', gender: 'Female', deptIndex: 4 },
  { firstName: 'Sriram',     lastName: 'Subramani',  email: 'sriram.subramani@company.com',   phone: '9876530017', gender: 'Male',   deptIndex: 4 },
  { firstName: 'Hema',       lastName: 'Lakshman',   email: 'hema.lakshman@company.com',      phone: '9876530018', gender: 'Female', deptIndex: 4 },
  // SEO & Content — 3
  { firstName: 'Naveen',     lastName: 'Balachandran',email: 'naveen.balachandran@company.com',phone: '9876530019', gender: 'Male',  deptIndex: 5 },
  { firstName: 'Sowmya',     lastName: 'Ramachandran',email: 'sowmya.ramachandran@company.com',phone: '9876530020', gender: 'Female',deptIndex: 5 },
  { firstName: 'Praveen',    lastName: 'Nayak',      email: 'praveen.nayak@company.com',      phone: '9876530021', gender: 'Male',   deptIndex: 5 },
]

async function seed() {
  try {
    const caRow = await db.query('SELECT id FROM client_admins LIMIT 1')
    if (!caRow.rows.length) { console.error('No client admin found.'); process.exit(1) }
    const clientAdminId = caRow.rows[0].id

    const hlRow = await db.query(
      `SELECT id, level_code, designation FROM hierarchy_levels
       WHERE client_admin_id=$1 AND UPPER(level_code)='L5' LIMIT 1`,
      [clientAdminId]
    )
    if (!hlRow.rows.length) { console.error('L5 hierarchy level not found. Add it in Hierarchy settings first.'); process.exit(1) }
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
    console.log(`Seeding ${EMPLOYEES.length} L5 employees...\n`)

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
        empData.gender, '2024-08-01',
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
