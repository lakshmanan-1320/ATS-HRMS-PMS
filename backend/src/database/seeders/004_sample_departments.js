const { query, withTransaction } = require('../../config/db')

/**
 * Create default departments for initial setup
 * Creates top-level departments that will be used for testing
 */
async function seed() {
  try {
    // Get the first client admin to find the organization_id
    const caRow = await query('SELECT client_admin_id, organization_id FROM client_admins LIMIT 1')
    if (!caRow.rows.length) {
      throw new Error('No client admin found. Run 002_default_client_admin.js first.')
    }

    const organizationId = caRow.rows[0].organization_id

    const departments = [
      { name: 'Tech Consulting', description: 'Technical consulting and software solutions' },
      { name: 'HR Recruitment', description: 'Human resources and recruitment' },
      { name: 'Digital Marketing', description: 'Digital marketing and communications' },
      { name: 'Finance & Accounts', description: 'Financial management and accounting' },
      { name: 'Customer Operations', description: 'Customer support and service delivery' },
    ]

    await withTransaction(async (client) => {
      for (const dept of departments) {
        // Check if department already exists
        const exists = await client.query(
          'SELECT department_id FROM departments WHERE organization_id=$1 AND LOWER(name)=LOWER($2) AND parent_id IS NULL',
          [organizationId, dept.name]
        )

        if (exists.rows.length) {
          console.log(`  ⏭️  Already exists: ${dept.name}`)
          continue
        }

        const result = await client.query(
          `INSERT INTO departments (
            organization_id, name, description, status
          ) VALUES ($1, $2, $3, 'active') RETURNING department_id, name`,
          [organizationId, dept.name, dept.description]
        )

        const { department_id, name } = result.rows[0]
        console.log(`✅ Created department: ${name} (ID: ${department_id})`)
      }
    })

    console.log('\nDefault departments seeded.')
  } catch (err) {
    console.error('❌ Seed departments error:', err.message)
    throw err
  }
}

module.exports = seed
