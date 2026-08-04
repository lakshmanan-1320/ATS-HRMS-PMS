const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const SEEDED_EMAILS = [
  'arjun.sharma@company.com',
  'priya.nair@company.com',
  'rahul.verma@company.com',
  'sneha.iyer@company.com',
  'karthik.pillai@company.com',
];

async function resetSeedPasswords() {
  const hash = await bcrypt.hash('Password123', 12);
  console.log('Generated fresh hash for Password123');

  for (const email of SEEDED_EMAILS) {
    const result = await query(
      `UPDATE users
       SET password_hash = $1,
           password_reset_required = false,
           failed_login_attempts = 0,
           locked_until = NULL
       WHERE email = $2
       RETURNING email, role`,
      [hash, email]
    );
    if (result.rows.length) {
      console.log(`  Reset: ${result.rows[0].email} (${result.rows[0].role})`);
    } else {
      console.log(`  Not found: ${email}`);
    }
  }

  console.log('\nDone. All seeded employees can now log in with Password123');
  process.exit(0);
}

resetSeedPasswords().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
