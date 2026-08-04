const bcrypt = require('./node_modules/bcryptjs');

// The hash from migration 007_users.sql
const hash = '$2b$12$hJxT41kooMUhgDhjr5Crp.mNa53kdGBDfLTG8FvIB0cgPJvFyB2i6';

async function check() {
  console.log('Password123:', await bcrypt.compare('Password123', hash));
  console.log('Password12345:', await bcrypt.compare('Password12345', hash));
  console.log('Demo@12345:', await bcrypt.compare('Demo@12345', hash));
  console.log('Admin@123:', await bcrypt.compare('Admin@123', hash));
  console.log('admin123:', await bcrypt.compare('admin123', hash));
}
check();
