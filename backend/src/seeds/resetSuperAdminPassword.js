const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

async function reset() {
  try {
    const newPassword = 'Admin@12324';
    const hash = await bcrypt.hash(newPassword, 12);

    const result = await query(
      `UPDATE super_admins SET password_hash=$1, updated_at=NOW()
       WHERE email='info@insighthcm.in'
       RETURNING id, email, full_name`,
      [hash]
    );

    if (!result.rows.length) {
      console.error('❌ Super admin not found.');
      process.exit(1);
    }

    console.log(`✅ Password reset for: ${result.rows[0].full_name} (${result.rows[0].email})`);
    console.log(`   New password: ${newPassword}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

reset();
