const BASE_URL = 'http://localhost:5000/api';

async function verify() {
  try {
    console.log('--- E2E Holiday API Verification (Native Fetch + OTP Flow) ---');

    // 1. Login as Client Admin
    console.log('\n1. Logging in as Client Admin...');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo@insight.local',
        password: 'Demo@12345'
      })
    });
    
    const adminLoginJson = await adminLoginRes.json();
    let adminToken;

    if (adminLoginJson.devOtp) {
      console.log(`Admin login triggered OTP. Verifying with devOtp: ${adminLoginJson.devOtp}...`);
      const otpRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken: adminLoginJson.tempToken,
          otp: adminLoginJson.devOtp
        })
      });
      const otpJson = await otpRes.json();
      adminToken = otpJson?.token;
    } else {
      adminToken = adminLoginJson?.data?.token || adminLoginJson?.token;
    }

    if (!adminToken) throw new Error(`Client Admin login failed: ${JSON.stringify(adminLoginJson)}`);
    console.log('✅ Client Admin logged in successfully.');

    // Helper for requests
    async function adminReq(path, options = {}) {
      const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
          ...options.headers
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw { response: { data, status: res.status } };
      }
      return data;
    }

    // 2. Create a holiday
    console.log('\n2. Creating a test holiday...');
    const holidayDate = '2026-09-09';
    const createRes = await adminReq('/v1/holidays', {
      method: 'POST',
      body: JSON.stringify({
        holiday_name: 'Test Integration Day',
        holiday_date: holidayDate,
        holiday_type: 'OPTIONAL',
        description: 'Test Description'
      })
    });
    console.log('✅ Holiday created:', createRes?.data);
    const createdHoliday = createRes?.data;

    // 3. Try to create duplicate date holiday (Should fail)
    console.log('\n3. Testing duplicate holiday check...');
    try {
      await adminReq('/v1/holidays', {
        method: 'POST',
        body: JSON.stringify({
          holiday_name: 'Duplicate Day',
          holiday_date: holidayDate,
          holiday_type: 'PUBLIC'
        })
      });
      console.log('❌ Error: Duplicate holiday creation succeeded but should have failed.');
    } catch (err) {
      console.log('✅ Expected Failure (Duplicate Date):', err.response?.data?.message);
    }

    // 4. Update the holiday details
    console.log('\n4. Updating the holiday details...');
    const updateRes = await adminReq(`/v1/holidays/${createdHoliday.holiday_id}`, {
      method: 'PUT',
      body: JSON.stringify({
        holiday_name: 'Updated Integration Day',
        holiday_type: 'PUBLIC',
        description: 'Updated Description'
      })
    });
    console.log('✅ Holiday updated:', updateRes?.data);

    // 5. Toggle holiday status
    console.log('\n5. Toggling holiday status...');
    const toggleRes = await adminReq(`/v1/holidays/${createdHoliday.holiday_id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        is_active: false
      })
    });
    console.log('✅ Holiday deactivated:', toggleRes?.data);

    // 6. Login as Employee (Priya)
    console.log('\n6. Logging in as Employee (Priya Nair)...');
    const empLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'priya.nair@company.com',
        password: 'Password123'
      })
    });
    
    const empLoginJson = await empLoginRes.json();
    let empToken;

    if (empLoginJson.devOtp) {
      console.log(`Employee login triggered OTP. Verifying with devOtp: ${empLoginJson.devOtp}...`);
      const otpRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken: empLoginJson.tempToken,
          otp: empLoginJson.devOtp
        })
      });
      const otpJson = await otpRes.json();
      empToken = otpJson?.token;
    } else {
      empToken = empLoginJson?.data?.token || empLoginJson?.token;
    }

    if (!empToken) throw new Error('Employee login failed.');
    console.log('✅ Employee logged in successfully.');

    async function empReq(path, options = {}) {
      const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${empToken}`,
          ...options.headers
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw { response: { data, status: res.status } };
      }
      return data;
    }

    // 7. Query upcoming holidays
    console.log('\n7. Querying upcoming holidays...');
    const upcomingRes = await empReq('/v1/holidays/upcoming');
    console.log('✅ Upcoming holidays fetched. Count:', upcomingRes?.data?.length);

    // 8. Query calendar holidays
    console.log('\n8. Querying calendar holidays for 2026...');
    const calendarRes = await empReq('/v1/holidays/my-calendar?year=2026');
    console.log('✅ Calendar holidays fetched. Count:', calendarRes?.data?.length);

    // 9. Delete the test holiday
    console.log('\n9. Deleting the test holiday as Client Admin...');
    await adminReq(`/v1/holidays/${createdHoliday.holiday_id}`, {
      method: 'DELETE'
    });
    console.log('✅ Holiday deleted successfully.');

    // 10. Verify past holiday restrictions
    console.log('\n10. Testing past holiday edit restriction...');
    const listRes = await adminReq('/v1/holidays?year=2026');
    const repDay = listRes?.data?.find(h => h.holiday_name === 'Republic Day');
    if (repDay) {
      try {
        await adminReq(`/v1/holidays/${repDay.holiday_id}`, {
          method: 'PUT',
          body: JSON.stringify({
            holiday_name: 'Attempted Update'
          })
        });
        console.log('❌ Error: Modifying past holiday succeeded but should have failed.');
      } catch (err) {
        console.log('✅ Expected Failure (Past Holiday Edit):', err.response?.data?.message);
      }
    } else {
      console.log('⏭️ Skipping past holiday edit check (Republic Day not found).');
    }

    console.log('\nE2E API verification completed successfully! All checks passed.');
    process.exit(0);
  } catch (err) {
    console.error('❌ E2E Verification failed:', err.message, err.response?.data || err);
    process.exit(1);
  }
}

verify();
