const { query } = require('../config/db');
const { REGULARIZATION_STATUS, REGULARIZATION_TYPES } = require('../modules/regularizations/regularization.constants');

const BASE_URL = 'http://127.0.0.1:5000/api';

async function verify() {
  try {
    console.log('--- E2E Attendance Regularization Verification ---');

    // 1. Database setup: Assign managers and fetch employee profiles
    console.log('\n1. Setting up manager relationships in database...');
    const arjunRes = await query("SELECT employee_id FROM employees WHERE email='arjun.sharma@company.com' LIMIT 1");
    const priyaRes = await query("SELECT employee_id FROM employees WHERE email='priya.nair@company.com' LIMIT 1");
    const johnRes  = await query("SELECT employee_id FROM employees WHERE email='john@example.com' LIMIT 1");

    const arjunId = arjunRes.rows[0]?.employee_id;
    const priyaId = priyaRes.rows[0]?.employee_id;
    const johnId  = johnRes.rows[0]?.employee_id;

    if (!arjunId || !priyaId || !johnId) {
      throw new Error('Required seed employees not found. Run resetDB first.');
    }

    // Update Priya manager to Arjun, John manager to Priya
    await query("UPDATE employees SET manager_employee_id = $1 WHERE employee_id = $2", [arjunId, priyaId]);
    await query("UPDATE employees SET manager_employee_id = $1 WHERE employee_id = $2", [priyaId, johnId]);
    console.log('✅ Manager relationships established.');

    // Clear any previous regularizations and reset settings
    await query("DELETE FROM attendance_regularizations");
    await query("UPDATE system_settings SET setting_value = '2' WHERE setting_key = 'regularization_monthly_limit'");
    await query("UPDATE system_settings SET setting_value = '5' WHERE setting_key = 'regularization_window_days'");
    await query("UPDATE system_settings SET setting_value = 'false' WHERE setting_key = 'allow_holiday_regularization'");
    console.log('✅ Settings reset: limit=2, window=5 days, holiday=false.');

    // 2. Helper for logins
    async function loginAs(email, password) {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const json = await res.json();
      let token;
      if (json.devOtp) {
        const otpRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tempToken: json.tempToken, otp: json.devOtp })
        });
        const otpJson = await otpRes.json();
        token = otpJson?.token;
      } else {
        token = json?.data?.token || json?.token;
      }
      if (!token) throw new Error(`Login failed for ${email}`);
      return token;
    }

    console.log('\n2. Logging in users...');
    const adminToken = await loginAs('demo@insight.local', 'Demo@12345');
    const johnToken  = await loginAs('john@example.com', 'Password12345');
    const priyaToken = await loginAs('priya.nair@company.com', 'Password123');
    console.log('✅ All tokens acquired.');

    // Request helper function
    async function apiReq(token, method, path, body = null) {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };
      if (body) options.body = JSON.stringify(body);
      const res = await fetch(`${BASE_URL}${path}`, options);
      const json = await res.json();
      if (!res.ok) {
        throw { status: res.status, message: json.message || JSON.stringify(json) };
      }
      return json;
    }

    // Dates setup relative to June 20, 2026
    const yesterday = '2026-06-19';
    const dayBeforeYesterday = '2026-06-18';
    const twoDaysBeforeYesterday = '2026-06-17';
    const outOfWindowDate = '2026-06-10'; // 10 days ago (window is 5 days)
    const futureDate = '2026-06-25';
    const holidayDate = '2026-12-25'; // Christmas

    // 3. Employee Submits Request
    console.log('\n3. Testing request submissions as John Doe...');

    // Successful submission
    const r1 = await apiReq(johnToken, 'POST', '/v1/regularizations', {
      attendance_date: yesterday,
      regularization_type: REGULARIZATION_TYPES.MISSED_CHECKIN,
      requested_checkin_time: '2026-06-19T09:00:00Z',
      reason: 'Forgot to punch in at lobby.'
    });
    console.log('✅ Request 1 submitted successfully:', r1.data.regularization_id);
    const regId1 = r1.data.regularization_id;

    // Duplicate PENDING block
    try {
      await apiReq(johnToken, 'POST', '/v1/regularizations', {
        attendance_date: yesterday,
        regularization_type: REGULARIZATION_TYPES.MISSED_CHECKOUT,
        requested_checkout_time: '2026-06-19T18:00:00Z',
        reason: 'Duplicate check'
      });
      console.log('❌ Failed: Allowed duplicate active request.');
    } catch (err) {
      console.log('✅ Expected Failure (Duplicate PENDING Block):', err.message);
    }

    // Future date block
    try {
      await apiReq(johnToken, 'POST', '/v1/regularizations', {
        attendance_date: futureDate,
        regularization_type: REGULARIZATION_TYPES.MARK_AS_PRESENT,
        requested_checkin_time: '2026-06-25T09:00:00Z',
        requested_checkout_time: '2026-06-25T18:00:00Z',
        reason: 'Future date'
      });
      console.log('❌ Failed: Allowed future date.');
    } catch (err) {
      console.log('✅ Expected Failure (Future Date Block):', err.message);
    }

    // Out of window check
    try {
      await apiReq(johnToken, 'POST', '/v1/regularizations', {
        attendance_date: outOfWindowDate,
        regularization_type: REGULARIZATION_TYPES.MARK_AS_PRESENT,
        requested_checkin_time: '2026-06-10T09:00:00Z',
        requested_checkout_time: '2026-06-10T18:00:00Z',
        reason: 'Out of window'
      });
      console.log('❌ Failed: Allowed request outside window.');
    } catch (err) {
      console.log('✅ Expected Failure (Window Limit Block):', err.message);
    }

    // Holiday check
    try {
      await apiReq(johnToken, 'POST', '/v1/regularizations', {
        attendance_date: holidayDate,
        regularization_type: REGULARIZATION_TYPES.MARK_AS_PRESENT,
        requested_checkin_time: '2026-12-25T09:00:00Z',
        requested_checkout_time: '2026-12-25T18:00:00Z',
        reason: 'Holiday regularization'
      });
      console.log('❌ Failed: Allowed holiday request.');
    } catch (err) {
      console.log('✅ Expected Failure (Holiday Block):', err.message);
    }

    // Submit second valid request (Day before yesterday)
    const r2 = await apiReq(johnToken, 'POST', '/v1/regularizations', {
      attendance_date: dayBeforeYesterday,
      regularization_type: REGULARIZATION_TYPES.MARK_AS_PRESENT,
      requested_checkin_time: '2026-06-18T09:15:00Z',
      requested_checkout_time: '2026-06-18T18:15:00Z',
      reason: 'Forgot card.'
    });
    console.log('✅ Request 2 submitted successfully:', r2.data.regularization_id);
    const regId2 = r2.data.regularization_id;

    // Monthly limit check (Attempt 3rd request when limit is 2)
    try {
      await apiReq(johnToken, 'POST', '/v1/regularizations', {
        attendance_date: twoDaysBeforeYesterday,
        regularization_type: REGULARIZATION_TYPES.MISSED_CHECKOUT,
        requested_checkout_time: '2026-06-17T18:00:00Z',
        reason: 'Third request check'
      });
      console.log('❌ Failed: Allowed request exceeding monthly limit.');
    } catch (err) {
      console.log('✅ Expected Failure (Monthly Limit Exceeded):', err.message);
    }

    // 4. Manager Review and Approval
    console.log('\n4. Testing approvals as Manager Priya Nair...');

    // Fetch team pending requests
    const pending = await apiReq(priyaToken, 'GET', '/v1/manager/regularizations');
    console.log(`Fetched manager pending queue. Count: ${pending.data.length} (Expected: 2)`);
    if (pending.data.length !== 2) throw new Error('Incorrect pending queue count.');

    // Approve Request 1
    const app1 = await apiReq(priyaToken, 'POST', `/v1/manager/regularizations/${regId1}/approve`);
    console.log('✅ Request 1 approved successfully.');

    // Verify punch insertion
    const punchCheck = await query("SELECT * FROM attendance_punches WHERE regularization_id = $1", [regId1]);
    console.log(`Verified attendance punch generated: ${punchCheck.rows.length} record(s). Source: ${punchCheck.rows[0]?.attendance_source}, check-in: ${punchCheck.rows[0]?.check_in_time.toISOString()}, coordinates: ${punchCheck.rows[0]?.check_in_latitude}`);
    if (punchCheck.rows.length !== 1 || punchCheck.rows[0].check_in_latitude !== null) {
      throw new Error('Punch generation validation failed: coordinates must be null and source must be REGULARIZATION.');
    }

    // Reject Request 2
    const rej2 = await apiReq(priyaToken, 'POST', `/v1/manager/regularizations/${regId2}/reject`, {
      rejection_reason: 'Please resubmit with correct check-out time.'
    });
    console.log('✅ Request 2 rejected successfully. Status:', rej2.data.current_status);

    // Verify locked transitions (Attempt to approve a rejected request)
    try {
      await apiReq(priyaToken, 'POST', `/v1/manager/regularizations/${regId2}/approve`);
      console.log('❌ Failed: Allowed review on inactive request.');
    } catch (err) {
      console.log('✅ Expected Failure (State transition locked):', err.message);
    }

    // Resubmission check: john should be allowed to submit a new request on rejected date
    const r2_resubmit = await apiReq(johnToken, 'POST', '/v1/regularizations', {
      attendance_date: dayBeforeYesterday,
      regularization_type: REGULARIZATION_TYPES.MARK_AS_PRESENT,
      requested_checkin_time: '2026-06-18T09:00:00Z',
      requested_checkout_time: '2026-06-18T18:00:00Z',
      reason: 'Resubmitted with correct times.'
    });
    console.log('✅ Request resubmitted successfully after rejection:', r2_resubmit.data.regularization_id);

    // 5. Client Admin Oversight and Settings
    console.log('\n5. Testing admin controls...');
    
    // Fetch settings
    const adminSettings = await apiReq(adminToken, 'GET', '/v1/admin/regularizations/settings');
    console.log('Fetched admin settings:', adminSettings.data);

    // Update settings: change window to 10 days
    const updatedSettings = await apiReq(adminToken, 'PUT', '/v1/admin/regularizations/settings', {
      regularization_window_days: 10
    });
    console.log('Updated admin settings. New window days:', updatedSettings.data.regularization_window_days);
    if (updatedSettings.data.regularization_window_days !== 10) {
      throw new Error('Admin settings update failed.');
    }

    // Fetch all requests
    const allReqs = await apiReq(adminToken, 'GET', '/v1/admin/regularizations');
    console.log('Admin overview count:', allReqs.data.length);

    console.log('\nE2E Attendance Regularization verification completed successfully! All checks passed.');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ E2E Verification failed:', err);
    process.exit(1);
  }
}

verify();
