const { query, withTransaction } = require('../../config/db')

/**
 * Seed default holidays for the current year
 * Creates Republic Day, New Year's Day, Independence Day, Christmas
 */
async function seed() {
  try {
    // Find the first client admin user from users table
    const adminUser = await query("SELECT user_id FROM users WHERE role = 'client_admin' LIMIT 1")
    if (!adminUser.rows.length) {
      throw new Error('No client admin user found. Run 002_default_client_admin.js first.')
    }
    const adminUserId = adminUser.rows[0].user_id

    const currentYear = new Date().getFullYear()

    const defaultHolidays = [
      {
        name: "New Year's Day",
        date: `${currentYear}-01-01`,
        type: 'OPTIONAL',
        description: 'New Year Day holiday'
      },
      {
        name: 'Republic Day',
        date: `${currentYear}-01-26`,
        type: 'PUBLIC',
        description: 'National Republic Day celebration'
      },
      {
        name: 'Independence Day',
        date: `${currentYear}-08-15`,
        type: 'PUBLIC',
        description: 'National Independence Day celebration'
      },
      {
        name: 'Christmas',
        date: `${currentYear}-12-25`,
        type: 'PUBLIC',
        description: 'Christmas celebration'
      }
    ]

    await withTransaction(async (client) => {
      for (const h of defaultHolidays) {
        // Check if holiday date already exists
        const exists = await client.query(
          'SELECT holiday_id FROM holidays WHERE holiday_date = $1 AND is_deleted = false',
          [h.date]
        )

        if (exists.rows.length) {
          console.log(`  ⏭️  Holiday already exists on date ${h.date}: ${h.name}`)
          continue
        }

        const result = await client.query(
          `INSERT INTO holidays (
            holiday_name, holiday_date, holiday_type, description, created_by_admin_user_id
          ) VALUES ($1, $2, $3, $4, $5) RETURNING holiday_id, holiday_name, holiday_date`,
          [h.name, h.date, h.type, h.description, adminUserId]
        )

        const created = result.rows[0]
        console.log(`✅ Created Holiday: ${created.holiday_name} on ${created.holiday_date}`)
      }
    })

    console.log('\nDefault holidays seeded.')
  } catch (err) {
    console.error('❌ Seed default holidays error:', err.message)
    throw err
  }
}

module.exports = seed
