const { Pool } = require('pg')
const db = new Pool({ host: 'localhost', port: 5432, database: 'pms_db', user: 'postgres', password: 'postgres@123' })

async function run() {
  // Sub-dept HODs (L3 in sub-departments)
  const hods = await db.query(`
    SELECT e.id, e.employee_code, e.first_name, e.last_name, d.name AS dept
    FROM employees e
    JOIN hierarchy_levels hl ON e.hierarchy_level_id = hl.id
    JOIN departments d ON e.department_id = d.id
    WHERE UPPER(hl.level_code) = 'L3' AND d.parent_id IS NOT NULL
    ORDER BY d.id
  `)

  for (const hod of hods.rows) {
    console.log(`\nHOD: ${hod.first_name} ${hod.last_name} [${hod.employee_code}] — ${hod.dept}`)
    console.log(`${'─'.repeat(60)}`)

    // Direct reports (L4)
    const l4 = await db.query(`
      SELECT e.id, e.employee_code, e.first_name, e.last_name, hl.level_code
      FROM employees e
      JOIN hierarchy_levels hl ON e.hierarchy_level_id = hl.id
      WHERE e.manager_id = $1
      ORDER BY e.id
    `, [hod.id])

    for (const mgr of l4.rows) {
      console.log(`  ${mgr.level_code} | ${mgr.employee_code} ${mgr.first_name} ${mgr.last_name}`)

      // Their L5 reports
      const l5 = await db.query(`
        SELECT e.employee_code, e.first_name, e.last_name, hl.level_code
        FROM employees e
        JOIN hierarchy_levels hl ON e.hierarchy_level_id = hl.id
        WHERE e.manager_id = $1
        ORDER BY e.id
      `, [mgr.id])

      for (const emp of l5.rows) {
        console.log(`       ${emp.level_code} | ${emp.employee_code} ${emp.first_name} ${emp.last_name}`)
      }
    }
  }

  await db.end()
}
run().catch(e => { console.error(e.message); db.end() })
