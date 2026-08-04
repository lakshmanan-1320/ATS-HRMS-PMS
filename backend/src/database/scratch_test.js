const { query } = require('../config/db');
const { comparePassword, hashPassword } = require('../utils/hash');
const { findUserByEmail, updateUserPassword } = require('../modules/auth/user.repository');

async function test() {
  try {
    const email = 'priya.nair@company.com';
    const user = await findUserByEmail(email);
    console.log('User found:', user ? 'Yes' : 'No');
    if (!user) return;

    console.log('Current password hash:', user.password_hash);
    
    // Test match with temporary password 'Password123'
    const isTempMatch = await comparePassword('Password123', user.password_hash);
    console.log('Matches temporary password "Password123":', isTempMatch);

    // Let's simulate change password to 'NewPassword123'
    const newHash = await hashPassword('NewPassword123');
    await updateUserPassword(user.user_id, newHash);
    console.log('Password updated to "NewPassword123". New hash:', newHash);

    // Fetch user again
    const updatedUser = await findUserByEmail(email);
    console.log('Updated password reset required:', updatedUser.password_reset_required);

    // Test match with new password
    const isNewMatch = await comparePassword('NewPassword123', updatedUser.password_hash);
    console.log('Matches new password "NewPassword123":', isNewMatch);

    // Reset back to Password123 for default seeder status
    const resetHash = await hashPassword('Password123');
    await query('UPDATE users SET password_hash=$1, password_reset_required=true WHERE user_id=$2', [resetHash, user.user_id]);
    console.log('Reset user back to Password123/reset_required=true.');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    process.exit(0);
  }
}

test();
