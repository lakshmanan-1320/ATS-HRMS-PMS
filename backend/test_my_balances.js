async function run() {
  try {
    console.log("1. Logging in as john@example.com...");
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'john@example.com', password: 'Password12345' })
    });
    const loginData = await loginRes.json();
    console.log("Login result:", loginData);

    const tempToken = loginData.tempToken;
    const otp = loginData.devOtp;

    console.log(`2. Verifying OTP: ${otp} with token: ${tempToken?.slice(0, 20)}...`);
    const verifyRes = await fetch('http://localhost:5000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp, tempToken })
    });
    const verifyData = await verifyRes.json();
    console.log("Verify OTP result:", verifyData);
    const token = verifyData.token;

    console.log("3. Fetching balances for John...");
    const balanceRes = await fetch('http://localhost:5000/api/v1/leave/balances/my', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Balances response status:", balanceRes.status);
    const balances = await balanceRes.json();
    console.log("Balances response:", balances);
  } catch (err) {
    console.error("Error in API check:", err.message);
  }
}

run();
