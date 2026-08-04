const { verifyToken } = require('../utils/jwt');
const { query } = require('../config/db');
const bcrypt = require('bcryptjs');

async function test() {
  try {
    console.log('--- Testing Client Admin API ---');

    // 1. Fetch user from DB
    const userRes = await query("SELECT * FROM users WHERE email = 'demo@insight.local'");
    if (!userRes.rows.length) {
      console.log('❌ User demo@insight.local not found in DB!');
      return;
    }
    const user = userRes.rows[0];
    console.log('User in DB:', {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      organization_id: user.organization_id
    });

    // 2. Perform Login via fetch to see what payload/token is generated
    const loginUrl = 'http://localhost:5000/api/auth/login';
    console.log('Logging in to:', loginUrl);
    const loginRes = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@insight.local', password: 'Demo@12345' })
    });
    const loginJson = await loginRes.json();
    console.log('Login Response:', loginJson);

    let token;
    if (loginJson.devOtp) {
      console.log('OTP is required. Using devOtp:', loginJson.devOtp);
      const verifyRes = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken: loginJson.tempToken, otp: loginJson.devOtp })
      });
      const verifyJson = await verifyRes.json();
      console.log('OTP Verification Response:', verifyJson);
      token = verifyJson.token;
    } else {
      token = loginJson.data?.token || loginJson.token;
    }

    if (!token) {
      console.log('❌ Login failed, no token returned!');
      return;
    }

    // 3. Decode token
    const decoded = verifyToken(token);
    console.log('Decoded Token Payload:', decoded);

    // 4. Query employees, departments, hierarchy levels via API
    const reqOptions = {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const empRes = await fetch('http://localhost:5000/api/client-admin/employees', reqOptions);
    const empJson = await empRes.json();
    console.log('API /employees status:', empRes.status, 'Count:', empJson.length, empJson);

    const deptRes = await fetch('http://localhost:5000/api/client-admin/departments', reqOptions);
    const deptJson = await deptRes.json();
    console.log('API /departments status:', deptRes.status, 'Count:', deptJson.length, deptJson);

    const hlRes = await fetch('http://localhost:5000/api/client-admin/hierarchy-levels', reqOptions);
    const hlJson = await hlRes.json();
    console.log('API /hierarchy-levels status:', hlRes.status, 'Count:', hlJson.length, hlJson);

  } catch (err) {
    console.error('Error during test:', err);
  }
}

test();
