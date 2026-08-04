const { query, withTransaction } = require('../../config/db')
const bcrypt = require('bcryptjs')

/**
 * Create a default client admin if none exists
 * Used for testing and initial setup
 * Default credentials: demo@insight.local / Demo@12345
 */
async function seed() {
  try {
    // Check if any client admin already exists
    const existing = await query('SELECT client_admin_id, email, full_name FROM client_admins LIMIT 1')

    if (existing.rows.length) {
      const { client_admin_id, email, full_name } = existing.rows[0]
      console.log(`✅ Client Admin already exists: ${full_name} (${email}, ID: ${client_admin_id})`)
      return
    }

    // Create default organization, client admin and user login
    await withTransaction(async (client) => {
      // 1. Create or get organization
      let orgResult = await client.query(
        "SELECT organization_id FROM organizations WHERE name = 'Insight Technology Demo' LIMIT 1"
      );
      let organizationId;
      if (orgResult.rows.length) {
        organizationId = orgResult.rows[0].organization_id;
      } else {
        const insertOrg = await client.query(
          "INSERT INTO organizations (name) VALUES ('Insight Technology Demo') RETURNING organization_id"
        );
        organizationId = insertOrg.rows[0].organization_id;
      }

      // 2. Create client admin profile
      const clientAdminResult = await client.query(
        `INSERT INTO client_admins (
          organization_id, full_name, email, company_name, phone, status, plan, employee_limit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING client_admin_id, email, full_name`,
        [
          organizationId,
          'Demo Client Admin',
          'demo@insight.local',
          'Insight Technology Demo',
          '+91-9999999999',
          'active',
          'professional',
          100,
        ]
      )
      const { client_admin_id, email, full_name } = clientAdminResult.rows[0]

      // 3. Create user credentials in users table
      const defaultPassword = 'Demo@12345'
      const passwordHash = await bcrypt.hash(defaultPassword, 12)
      await client.query(
        `INSERT INTO users (
          organization_id, email, password_hash, role, is_active
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          organizationId,
          'demo@insight.local',
          passwordHash,
          'client_admin',
          true
        ]
      )

      console.log(`✅ Default Client Admin created: ${full_name} (${email}, Profile ID: ${client_admin_id})`)
      console.log(`   Password: ${defaultPassword}`)
      console.log(`   ⚠️  CHANGE THIS PASSWORD IN PRODUCTION`)
    })
  } catch (err) {
    console.error('❌ Create client admin error:', err.message)
    throw err
  }
}

module.exports = seed
