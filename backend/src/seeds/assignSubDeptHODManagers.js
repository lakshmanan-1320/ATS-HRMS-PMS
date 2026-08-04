const { Pool } = require('pg')
const db = new Pool({ host: 'localhost', port: 5432, database: 'pms_db', user: 'postgres', password: 'postgres@123' })

// Sub-dept HOD → Parent dept L3 manager assignments
const ASSIGNMENTS = [
  { subDept: 'Software Development', parentDept: 'Tech Consulting' },
  { subDept: 'Talent Acquisition',   parentDept: 'HR Recruitment'  },
  { subDept: 'SEO & Content',        parentDept: 'Digital Marketing' },
]

async function seed() {
  try {
    const caRow = await db.query('SELECT id FROM client_admins LIMIT 1')
    const clientAdminId = caRow.rows[0].id

    let assigned = 0

    for (const { subDept, parentDept } of ASSIGNMENTS) {
      // Get sub-dept L3 HOD
      const hodRow = await db.query(`
        SELECT e.id, e.employee_code, e.first_name, e.last_name
        FROM employees e
        JOIN hierarchy_levels hl ON e.hierarchy_level_id = hl.id
        JOIN departments d ON e.department_id = d.id
        WHERE e.client_admin_id = $1 AND UPPER(hl.level_code) = 'L3' AND d.name = $2
        LIMIT 1
      `, [clientAdminId, subDept])

      if (!hodRow.rows.length) { console.log(`  No L3 found in "${subDept}" — skipped`); continue }
      const hod = hodRow.rows[0]

      // Get parent dept L3 manager
      const mgrRow = await db.query(`
        SELECT e.id, e.employee_code, e.first_name, e.last_name
        FROM employees e
        JOIN hierarchy_levels hl ON e.hierarchy_level_id = hl.id
        JOIN departments d ON e.department_id = d.id
        WHERE e.client_admin_id = $1 AND UPPER(hl.level_code) = 'L3' AND d.name = $2
        LIMIT 1
      `, [clientAdminId, parentDept])

      if (!mgrRow.rows.length) { console.log(`  No L3 found in "${parentDept}" — skipped`); continue }
      const mgr = mgrRow.rows[0]

      await db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [mgr.id, hod.id])

      console.log(`  ${hod.employee_code} ${hod.first_name} ${hod.last_name} (${subDept})`)
      console.log(`    → Manager: ${mgr.first_name} ${mgr.last_name} [${mgr.employee_code}] (${parentDept})\n`)
      assigned++
    }

    console.log(`Done. Assigned: ${assigned}`)
  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await db.end()
  }
}

seed()
