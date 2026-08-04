const { verifyToken } = require('../utils/jwt');
const { query } = require('../config/db');

async function test() {
  try {
    console.log('--- Testing Manager Attendance History APIs ---');

    const managers = ['kumar@example.com', 'arjun.sharma@company.com'];
    for (const email of managers) {
      console.log(`\n🔑 Testing for Manager: ${email}`);

      // 1. Login
      const loginRes = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Password12345' })
      });
      const loginJson = await loginRes.json();
      
      let token;
      if (loginJson.devOtp) {
        const verifyRes = await fetch('http://localhost:5000/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tempToken: loginJson.tempToken, otp: loginJson.devOtp })
        });
        const verifyJson = await verifyRes.json();
        token = verifyJson.token;
      } else {
        token = loginJson.data?.token || loginJson.token;
      }

      if (!token) {
        console.log(`❌ Login failed for ${email}`);
        continue;
      }

      const decoded = verifyToken(token);
      console.log('Decoded Token Payload:', {
        userId: decoded.userId,
        employeeId: decoded.employeeId,
        role: decoded.role,
        isManager: decoded.isManager
      });

      const reqOptions = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      // 2. Fetch Team Members (Subordinates)
      const membersRes = await fetch('http://localhost:5000/api/attendance/team-members', reqOptions);
      const membersJson = await membersRes.json();
      console.log(`Team members count for ${email}:`, membersJson.length);
      console.log(membersJson.map(m => `  - ${m.first_name} ${m.last_name} (${m.employee_code}, ${m.designation})`));

      // 3. Fetch Team Attendance History
      const historyRes = await fetch('http://localhost:5000/api/attendance/team-history', reqOptions);
      const historyJson = await historyRes.json();
      console.log(`Team attendance history count for ${email}:`, historyJson.length);
    }

  } catch (err) {
    console.error('Error during test:', err);
  }
}

test();
