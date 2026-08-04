const { query, withTransaction } = require('../config/db');
const bcrypt = require('bcryptjs');

async function seedJohn() {
  try {
    const caRow = await query('SELECT organization_id FROM client_admins LIMIT 1');
    if (!caRow.rows.length) {
      console.error('No client admin/organization found. Please run resetDB first.');
      process.exit(1);
    }
    const organizationId = caRow.rows[0].organization_id;

    const email = 'john@example.com';
    const password = 'Password12345';
    const passwordHash = await bcrypt.hash(password, 12);

    await withTransaction(async (client) => {
      // Check if employee exists
      const existingEmp = await client.query('SELECT employee_id FROM employees WHERE email = $1 AND organization_id = $2', [email, organizationId]);
      let employeeId;

      if (!existingEmp.rows.length) {
        const empResult = await client.query(`
          INSERT INTO employees (
            organization_id, employee_code, first_name, last_name, email, phone, gender, status, employment_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING employee_id
        `, [
          organizationId,
          'EMP1001',
          'John',
          'Doe',
          email,
          '9876543210',
          'Male',
          'active',
          'full_time'
        ]);
        employeeId = empResult.rows[0].employee_id;
        console.log(`Created employee record for John Doe (ID: ${employeeId})`);
      } else {
        employeeId = existingEmp.rows[0].employee_id;
        console.log(`Employee record already exists for John Doe (ID: ${employeeId})`);
      }

      // Check if user login exists
      const existingUser = await client.query('SELECT user_id FROM users WHERE email = $1 AND organization_id = $2', [email, organizationId]);
      if (!existingUser.rows.length) {
        await client.query(`
          INSERT INTO users (
            organization_id, employee_id, email, password_hash, role, is_active, attendance_enabled, password_reset_required
          ) VALUES ($1, $2, $3, $4, $5, true, true, false)
        `, [
          organizationId,
          employeeId,
          email,
          passwordHash,
          'employee'
        ]);
        console.log(`Created user login for ${email} with password: ${password}`);
      } else {
        await client.query(`
          UPDATE users
          SET password_hash = $1, password_reset_required = false
          WHERE email = $2 AND organization_id = $3
        `, [passwordHash, email, organizationId]);
        console.log(`Updated user login password for ${email} to: ${password}`);
      }
    });

    console.log('Seed John Doe complete.');
  } catch (err) {
    console.error('Failed to seed John Doe:', err);
  }
}

if (require.main === module) {
  seedJohn().then(() => process.exit(0));
}

module.exports = seedJohn;
