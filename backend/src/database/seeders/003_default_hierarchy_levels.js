const { query, withTransaction } = require('../../config/db')

/**
 * Create default hierarchy levels for a client admin
 * Standard org structure: CEO → Director → Manager → Executive → Associate
 */
async function seed() {
  try {
    // Get the first (or any) client admin to find the organization_id
    const caRow = await query('SELECT client_admin_id, organization_id FROM client_admins LIMIT 1')
    if (!caRow.rows.length) {
      throw new Error('No client admin found. Run 002_default_client_admin.js first.')
    }

    const organizationId = caRow.rows[0].organization_id

    const levels = [
      { sortOrder: 1, code: 'L1', designation: 'CEO', description: 'Chief Executive Officer' },
      { sortOrder: 2, code: 'L2', designation: 'Director', description: 'Department Director' },
      { sortOrder: 3, code: 'L3', designation: 'Manager', description: 'Team Manager' },
      { sortOrder: 4, code: 'L4', designation: 'Executive', description: 'Senior Executive / Specialist' },
      { sortOrder: 5, code: 'L5', designation: 'Associate', description: 'Associate / Junior Staff' },
    ]

    await withTransaction(async (client) => {
      for (const level of levels) {
        // Check if level already exists
        const exists = await client.query(
          'SELECT hierarchy_level_id FROM hierarchy_levels WHERE organization_id=$1 AND LOWER(level_code)=LOWER($2)',
          [organizationId, level.code]
        )

        if (exists.rows.length) {
          console.log(`  ⏭️  Already exists: ${level.code} - ${level.designation}`)
          continue
        }

        const result = await client.query(
          `INSERT INTO hierarchy_levels (
            organization_id, sort_order, level_code, designation, description
          ) VALUES ($1, $2, $3, $4, $5) RETURNING hierarchy_level_id, level_code, designation`,
          [organizationId, level.sortOrder, level.code, level.designation, level.description]
        )

        const { hierarchy_level_id, level_code, designation } = result.rows[0]
        console.log(`✅ Created: ${level_code} - ${designation} (ID: ${hierarchy_level_id})`)
      }
    })

    console.log('\nDefault hierarchy levels seeded.')
  } catch (err) {
    console.error('❌ Seed hierarchy levels error:', err.message)
    throw err
  }
}

module.exports = seed
