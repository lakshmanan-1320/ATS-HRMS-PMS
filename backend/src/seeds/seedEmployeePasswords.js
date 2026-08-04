const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

async function seed() {
  try {
    const defaultPassword = 'Employee@1234';
    const hash = await bcrypt.hash(defaultPassword, 12);

    const result = await query(
      `UPDATE employees SET password_hash = $1 WHERE password_hash IS NULL RETURNING id, employee_code, email`,
      [hash]
    );

    console.log(`✅ Set default password for ${result.rows.length} employees`);
    console.log(`   Default password: ${defaultPassword}`);
    result.rows.slice(0, 5).forEach(e => console.log(`   ${e.employee_code} — ${e.email}`));
    if (result.rows.length > 5) console.log(`   ... and ${result.rows.length - 5} more`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

seed();
