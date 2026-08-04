const { Pool } = require('pg')
const db = new Pool({ host: 'localhost', port: 5432, database: 'pms_db', user: 'postgres', password: 'postgres@123' })

async function seed() {
  try {
    const caRow = await db.query('SELECT id FROM client_admins LIMIT 1')
    const clientAdminId = caRow.rows[0].id

    // Get L2 employee (Priya Nair)
    const l2Row = await db.query(`
      SELECT e.id, e.employee_code, e.first_name, e.last_name
      FROM employees e
      JOIN hierarchy_levels hl ON e.hierarchy_level_id = hl.id
      WHERE e.client_admin_id = $1 AND UPPER(hl.level_code) = 'L2'
      LIMIT 1
    `, [clientAdminId])

    if (!l2Row.rows.length) { console.error('No L2 employee found.'); process.exit(1) }
    const l2 = l2Row.rows[0]
    console.log(`L2 Manager: ${l2.first_name} ${l2.last_name} [${l2.employee_code}]\n`)

    // Get all parent-dept L3 HODs (departments with no parent_id)
    const l3Row = await db.query(`
      SELECT e.id, e.employee_code, e.first_name, e.last_name, d.name AS dept_name
      FROM employees e
      JOIN hierarchy_levels hl ON e.hierarchy_level_id = hl.id
      JOIN departments d ON e.department_id = d.id
      WHERE e.client_admin_id = $1 AND UPPER(hl.level_code) = 'L3'
        AND d.parent_id IS NULL AND e.manager_id IS NULL
      ORDER BY e.id
    `, [clientAdminId])

    console.log(`Assigning ${l2.first_name} ${l2.last_name} as manager for ${l3Row.rows.length} L3 HOD(s)...\n`)

    let assigned = 0
    for (const l3 of l3Row.rows) {
      await db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [l2.id, l3.id])
      console.log(`  ${l3.employee_code} ${l3.first_name} ${l3.last_name} (${l3.dept_name}) → Manager: ${l2.first_name} ${l2.last_name}`)
      assigned++
    }

    console.log(`\nDone. Assigned: ${assigned}`)
  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await db.end()
  }
}

seed()
