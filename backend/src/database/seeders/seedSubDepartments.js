const { query } = require('../../config/db')

const SUB_DEPTS = {
  'Tech Consulting':   { name: 'Software Development', description: 'Handles software design, development and delivery' },
  'HR Recruitment':    { name: 'Talent Acquisition',   description: 'Manages sourcing, screening and onboarding of candidates' },
  'Digital Marketing': { name: 'SEO & Content',        description: 'Manages search engine optimisation and content strategy' },
  'Finance & Accounts': { name: 'Auditing & Compliance', description: 'Manages audits and financial compliance' },
  'Customer Operations': { name: 'Support Operations',  description: 'Manages customer support and services' },
}

async function seed() {
  try {
    const caRow = await query('SELECT client_admin_id, organization_id FROM client_admins LIMIT 1')
    if (!caRow.rows.length) { throw new Error('No client admin found.') }
    const organizationId = caRow.rows[0].organization_id

    const depts = await query(
      'SELECT department_id, name FROM departments WHERE parent_id IS NULL AND organization_id=$1 ORDER BY name',
      [organizationId]
    )

    console.log(`Found ${depts.rows.length} top-level department(s).\n`)

    for (const dept of depts.rows) {
      const sub = SUB_DEPTS[dept.name]
      if (!sub) {
        console.log(`  Skipped: no sub-dept defined for "${dept.name}"`)
        continue
      }

      const exists = await query(
        'SELECT department_id FROM departments WHERE LOWER(name)=LOWER($1) AND parent_id=$2',
        [sub.name, dept.department_id]
      )
      if (exists.rows.length) {
        console.log(`  Already exists: "${sub.name}" under "${dept.name}"`)
        continue
      }

      const r = await query(
        `INSERT INTO departments (organization_id, name, description, parent_id, status)
         VALUES ($1,$2,$3,$4,'active') RETURNING department_id, name`,
        [organizationId, sub.name, sub.description, dept.department_id]
      )
      console.log(`  Created: "${r.rows[0].name}" (id=${r.rows[0].department_id}) under "${dept.name}"`)
    }

    console.log('\nDone.')
  } catch (err) {
    console.error('Seed error:', err.message)
    throw err
  }
}

module.exports = seed
