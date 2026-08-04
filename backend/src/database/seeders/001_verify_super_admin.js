const { query } = require('../../config/db')

/**
 * Verify that default super admin exists
 * The super admin is created in migration 001_schema.sql
 * This seeder ensures it exists and is active
 */
async function seed() {
  try {
    const admin = await query(
      "SELECT super_admin_id, email, full_name FROM super_admins WHERE email='admin@insighttechnology.in' LIMIT 1"
    )

    if (!admin.rows.length) {
      throw new Error('Default super admin profile not found. Please run migrations first.')
    }

    const user = await query(
      "SELECT user_id, email, role FROM users WHERE email='admin@insighttechnology.in' AND role='super_admin' LIMIT 1"
    )

    if (!user.rows.length) {
      throw new Error('Default super admin login user not found in users table.')
    }

    const { super_admin_id, email, full_name } = admin.rows[0]
    console.log(`✅ Super Admin verified: ${full_name} (${email}, Profile ID: ${super_admin_id}, User ID: ${user.rows[0].user_id})`)
  } catch (err) {
    console.error('❌ Verify admin error:', err.message)
    throw err
  }
}

module.exports = seed
