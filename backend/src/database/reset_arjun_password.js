const { query } = require('../config/db');
const bcrypt = require('bcryptjs');

async function reset() {
  try {
    const passwordHash = await bcrypt.hash('Password123', 12);
    const result = await query(
      "UPDATE users SET password_hash = $1, password_reset_required = false WHERE email = 'arjun@example.com' RETURNING user_id",
      [passwordHash]
    );
    if (result.rows.length) {
      console.log('✅ Successfully reset password for arjun@example.com to: Password123');
    } else {
      console.log('❌ Failed: User arjun@example.com not found!');
    }
  } catch (err) {
    console.error('Error resetting password:', err);
  }
}

reset();
