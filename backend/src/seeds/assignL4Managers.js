const { Pool } = require('pg')

const db = new Pool({ host: 'localhost', port: 5432, database: 'pms_db', user: 'postgres', password: 'postgres@123' })

async function seed() {
  try {
    const caRow = await db.query('SELECT id FROM client_admins LIMIT 1')
    const clientAdminId = caRow.rows[0].id

    // Get all L3 employees (one per dept — will be managers for L4)
    const l3 = await db.query(`
      SELECT e.id, e.employee_code, e.first_name, e.last_name, e.department_id, d.name AS dept_name, d.parent_id
      FROM employees e
      JOIN hierarchy_levels hl ON e.hierarchy_level_id = hl.id
      JOIN departments d ON e.department_id = d.id
      WHERE e.client_admin_id = $1 AND UPPER(hl.level_code) = 'L3'
      ORDER BY e.department_id, e.id
    `, [clientAdminId])

    // Get all L4 employees (unassigned)
    const l4 = await db.query(`
      SELECT e.id, e.employee_code, e.first_name, e.last_name, e.department_id, d.name AS dept_name, d.parent_id
      FROM employees e
      JOIN hierarchy_levels hl ON e.hierarchy_level_id = hl.id
      JOIN departments d ON e.department_id = d.id
      WHERE e.client_admin_id = $1 AND UPPER(hl.level_code) = 'L4' AND e.manager_id IS NULL
      ORDER BY e.department_id, e.id
    `, [clientAdminId])

    // Build map: department_id -> [L3 managers]
    const managersByDept = {}
    for (const mgr of l3.rows) {
      if (!managersByDept[mgr.department_id]) managersByDept[mgr.department_id] = []
      managersByDept[mgr.department_id].push(mgr)
    }

    console.log(`L3 managers: ${l3.rows.length}`)
    console.log(`L4 employees (unassigned): ${l4.rows.length}\n`)

    const assignIndex = {}
    let assigned = 0, skipped = 0

    for (const emp of l4.rows) {
      // Try same department first, then parent department
      let managers = managersByDept[emp.department_id]
      if (!managers && emp.parent_id) {
        managers = managersByDept[emp.parent_id]
      }
      if (!managers) {
        console.log(`  No L3 found for ${emp.first_name} ${emp.last_name} (${emp.dept_name}) — skipped`)
        skipped++
        continue
      }

      const deptKey = emp.department_id
      if (assignIndex[deptKey] === undefined) assignIndex[deptKey] = 0
      const mgr = managers[assignIndex[deptKey] % managers.length]
      assignIndex[deptKey]++

      await db.query(
        'UPDATE employees SET manager_id = $1 WHERE id = $2',
        [mgr.id, emp.id]
      )
      console.log(`  ${emp.employee_code} ${emp.first_name} ${emp.last_name} (${emp.dept_name}) → Manager: ${mgr.first_name} ${mgr.last_name} [${mgr.employee_code}]`)
      assigned++
    }

    console.log(`\nDone. Assigned: ${assigned}, Skipped: ${skipped}`)
  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await db.end()
  }
}

seed()
