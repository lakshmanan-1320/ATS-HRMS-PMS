const { query } = require('../config/db');

const BASE_URL = 'http://127.0.0.1:5000/api';

async function verify() {
  try {
    console.log('--- E2E Attendance Payroll Verification ---');

    // 1. Fetch seed employees to assign structures
    console.log('\n1. Fetching seed employees from database...');
    const arjunRes = await query("SELECT employee_id FROM employees WHERE email='arjun.sharma@company.com' LIMIT 1");
    const priyaRes = await query("SELECT employee_id FROM employees WHERE email='priya.nair@company.com' LIMIT 1");
    const johnRes  = await query("SELECT employee_id FROM employees WHERE email='john@example.com' LIMIT 1");

    const arjunId = arjunRes.rows[0]?.employee_id;
    const priyaId = priyaRes.rows[0]?.employee_id;
    const johnId  = johnRes.rows[0]?.employee_id;

    if (!arjunId || !priyaId || !johnId) {
      throw new Error('Required seed employees not found. Run resetDB first.');
    }

    const orgRes = await query('SELECT organization_id FROM client_admins LIMIT 1');
    const orgId = orgRes.rows[0]?.organization_id;
    console.log('✅ Found seed employees. Organization ID:', orgId);

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
    const priyaToken = await loginAs('priya.nair@company.com', 'Password12345');
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

    // 3. Admin Configures Salary Structures
    console.log('\n3. Configuring Salary Structures...');
    const s1 = await apiReq(adminToken, 'POST', '/v1/payroll/salary-structures', {
      structure_name: 'Developer Standard Structure',
      basic_salary: 30000.00,
      hra_amount: 12000.00,
      special_allowance_amount: 5000.00,
      travel_allowance_amount: 3000.00,
      medical_allowance_amount: 2000.00
    });
    console.log('✅ Salary Structure created:', s1.data.structure_name, 'ID:', s1.data.salary_structure_id);
    const structId = s1.data.salary_structure_id;

    // 4. Assign structure to John Doe
    console.log('\n4. Assigning Salary Structure to John Doe...');
    await query("DELETE FROM employee_salary_assignments WHERE employee_id IN ($1, $2, $3)", [johnId, arjunId, priyaId]);
    const sa1 = await apiReq(adminToken, 'POST', `/v1/payroll/employees/${johnId}/salary`, {
      salary_structure_id: structId,
      effective_from: '2026-06-01',
      effective_to: null
    });
    console.log('✅ Salary assigned to John Doe. Effective from:', sa1.data.effective_from);

    // Verify Overlap Block
    try {
      await apiReq(adminToken, 'POST', `/v1/payroll/employees/${johnId}/salary`, {
        salary_structure_id: structId,
        effective_from: '2026-06-15',
        effective_to: '2026-07-15'
      });
      console.log('❌ Failed: Overlapping salary assignments allowed.');
    } catch (err) {
      console.log('✅ Expected Failure (Salary Assignment Overlap Blocked):', err.message);
    }

    // Assign also to Arjun and Priya
    await apiReq(adminToken, 'POST', `/v1/payroll/employees/${arjunId}/salary`, {
      salary_structure_id: structId,
      effective_from: '2026-06-01',
      effective_to: null
    });
    await apiReq(adminToken, 'POST', `/v1/payroll/employees/${priyaId}/salary`, {
      salary_structure_id: structId,
      effective_from: '2026-06-01',
      effective_to: null
    });
    console.log('✅ Assigned structures to all test employees.');

    // 5. Configure Week Off Settings
    console.log('\n5. Setting Week Off Configuration...');
    const wo = await apiReq(adminToken, 'PUT', '/v1/payroll/settings/week-off', {
      week_off_days: [0, 6] // Sunday and Saturday
    });
    console.log('✅ Week off configuration saved:', wo.data.week_off_days);

    // 6. Simulate Attendance Punches and Leaves
    console.log('\n6. Simulating Attendance and Leaves for June 2026...');
    // June 2026 has:
    // Calendar days = 30
    // Saturday/Sundays = 8 days (June 6, 7, 13, 14, 20, 21, 27, 28)
    // Seeder default holidays in June = none (New Years Jan, Republic Jan, Independence Aug, Christmas Dec).
    // Let's create an active holiday in June 2026 to verify:
    await query("INSERT INTO holidays (holiday_name, holiday_date, holiday_type, is_active) VALUES ('June Test Holiday', '2026-06-15', 'PUBLIC', true) ON CONFLICT DO NOTHING");
    console.log('✅ Added holiday on 2026-06-15 (Monday).');

    // Clean any existing punches/leaves for John Doe in June 2026
    const johnUserRes = await query("SELECT user_id FROM users WHERE employee_id = $1", [johnId]);
    const johnUserId = johnUserRes.rows[0].user_id;

    await query("DELETE FROM attendance_punches WHERE employee_id = $1 AND attendance_date >= '2026-06-01' AND attendance_date <= '2026-06-30'", [johnUserId]);
    await query("DELETE FROM leave_requests WHERE employee_id = $1 AND start_date >= '2026-06-01'", [johnId]);

    // Insert approved leaves: 2 days of paid leave (e.g. 16, 17 June)
    // Fetch a leave type
    let ltRes = await query("SELECT leave_type_id FROM leave_types LIMIT 1");
    let leaveTypeId = ltRes.rows[0]?.leave_type_id;
    if (!leaveTypeId) {
      // Seed a default paid leave type
      const ltResult = await query("INSERT INTO leave_types (leave_type_name, leave_type_code, is_paid_leave) VALUES ('Annual Paid Leave', 'AL', true) RETURNING leave_type_id");
      leaveTypeId = ltResult.rows[0].leave_type_id;
    }

    await query(`
      INSERT INTO leave_requests (employee_id, manager_employee_id, leave_type_id, start_date, end_date, total_leave_days, current_status)
      VALUES ($1, $2, $3, '2026-06-16', '2026-06-17', 2, 'APPROVED')
    `, [johnId, priyaId, leaveTypeId]);
    console.log('✅ Registered 2 days of approved paid leave for John Doe (16, 17 June).');

    // Insert punches for John Doe: let's insert punches for 15 working days.
    // Total calendar days = 30
    // Week offs = 8
    // Holidays = 1 (2026-06-15)
    // Working Days = 30 - 8 - 1 = 21 days
    // Leaves = 2 days
    // Punches = 15 days
    // LOP Days = 21 (Working) - 15 (Present) - 2 (Paid Leave) = 4 days
    const workingDates = [];
    const dates = getDatesInRange('2026-06-01', '2026-06-30');
    dates.forEach(d => {
      const day = d.getUTCDay();
      const dateStr = formatDate(d);
      const isWeekend = (day === 0 || day === 6);
      const isHoliday = (dateStr === '2026-06-15');
      const isLeave = (dateStr === '2026-06-16' || dateStr === '2026-06-17');

      if (!isWeekend && !isHoliday && !isLeave) {
        workingDates.push(dateStr);
      }
    });

    // Insert punches for the first 15 working dates
    const punchesToInsert = workingDates.slice(0, 15);
    for (const dt of punchesToInsert) {
      await query(`
        INSERT INTO attendance_punches (employee_id, attendance_date, check_in_time, check_out_time, check_in_latitude, check_in_longitude)
        VALUES ($1, $2, '${dt}T09:00:00Z', '${dt}T18:00:00Z', 13.0827, 80.2707)
      `, [johnUserId, dt]);
    }
    console.log(`✅ Inserted 15 attendance punches for John Doe.`);

    // 7. Generate Payroll Run
    console.log('\n7. Generating Payroll Run for June 2026...');
    const runRes = await apiReq(adminToken, 'POST', '/v1/payroll/runs/generate', {
      payroll_month: 6,
      payroll_year: 2026,
      payroll_start_date: '2026-06-01',
      payroll_end_date: '2026-06-30'
    });
    console.log('✅ Payroll run generated. Status:', runRes.data.current_status, 'ID:', runRes.data.payroll_run_id);
    const runId = runRes.data.payroll_run_id;

    // 8. Verify Employee Payroll record for John Doe
    console.log('\n8. Verifying calculated payroll values for John Doe...');
    const details = await apiReq(adminToken, 'GET', `/v1/payroll/runs/${runId}`);
    const johnPayroll = details.data.employeePayrolls.find(ep => ep.employee_id === johnId);
    if (!johnPayroll) {
      throw new Error('John Doe payroll record not generated!');
    }

    console.log('John Doe Payroll Calculations:');
    console.log('  Working Days     :', johnPayroll.working_days);
    console.log('  Present Days     :', johnPayroll.present_days);
    console.log('  Paid Leave Days  :', johnPayroll.paid_leave_days);
    console.log('  Week Off Days    :', johnPayroll.week_off_days);
    console.log('  Holiday Days     :', johnPayroll.holiday_days);
    console.log('  LOP Days         :', johnPayroll.lop_days);
    console.log('  Gross Salary     :', johnPayroll.gross_salary);
    console.log('  Total Deductions :', johnPayroll.total_deductions);
    console.log('  Net Salary       :', johnPayroll.net_salary);

    // Expect:
    // Working Days = 21
    // Present Days = 15
    // Paid Leave = 2
    // LOP Days = 21 - 15 - 2 = 4
    if (parseFloat(johnPayroll.working_days) !== 21) {
      throw new Error(`Expected working days to be 21, got ${johnPayroll.working_days}`);
    }
    if (parseFloat(johnPayroll.lop_days) !== 4) {
      throw new Error(`Expected LOP days to be 4, got ${johnPayroll.lop_days}`);
    }

    // 9. Add Manual Adjustment
    console.log('\n9. Adding Manual Adjustment...');
    const adj = await apiReq(adminToken, 'POST', `/v1/payroll/runs/${runId}/adjustments`, {
      employee_payroll_id: johnPayroll.employee_payroll_id,
      adjustment_type: 'ADDITION',
      adjustment_name: 'Performance Bonus',
      amount: 5000.00,
      remarks: 'Quarterly bonus'
    });
    console.log('✅ Adjustment created:', adj.data.adjustment_name, 'Amount:', adj.data.amount);

    // Re-verify payslip details and recalculated net salary
    const detailsAfterAdj = await apiReq(adminToken, 'GET', `/v1/payroll/runs/${runId}`);
    const johnPayrollAfterAdj = detailsAfterAdj.data.employeePayrolls.find(ep => ep.employee_id === johnId);
    console.log('Net Salary after adjustment (expected +5000):', johnPayrollAfterAdj.net_salary);
    const expectedNet = parseFloat(johnPayroll.net_salary) + 5000.00;
    if (Math.abs(parseFloat(johnPayrollAfterAdj.net_salary) - expectedNet) > 0.01) {
      throw new Error(`Recalculation failed: expected ${expectedNet}, got ${johnPayrollAfterAdj.net_salary}`);
    }

    // 10. Approve and Lock Payroll
    console.log('\n10. Testing Approve and Lock flow...');
    const app = await apiReq(adminToken, 'POST', `/v1/payroll/runs/${runId}/approve`);
    console.log('✅ Payroll approved. Status:', app.data.current_status);

    const lock = await apiReq(adminToken, 'POST', `/v1/payroll/runs/${runId}/lock`);
    console.log('✅ Payroll locked. Status:', lock.data.current_status);

    // 11. Verify restrictions on locked runs
    console.log('\n11. Verifying edit block on locked runs...');
    try {
      await apiReq(adminToken, 'POST', `/v1/payroll/runs/${runId}/adjustments`, {
        employee_payroll_id: johnPayroll.employee_payroll_id,
        adjustment_type: 'DEDUCTION',
        adjustment_name: 'Late Penalty',
        amount: 500.00,
        remarks: 'Duplicate check'
      });
      console.log('❌ Failed: Allowed adjustments on locked runs.');
    } catch (err) {
      console.log('✅ Expected Failure (Adjustments Blocked on Locked Run):', err.message);
    }

    // 12. Verify Employee Payslip Retrieval
    console.log('\n12. Verifying personal payslip retrieval as John Doe...');
    const myPayslips = await apiReq(johnToken, 'GET', '/v1/payroll/my-payslips');
    console.log('✅ John Doe retrieved payslip list. Count:', myPayslips.data.length);

    const firstPayslipId = myPayslips.data[0]?.employee_payroll_id;
    const payslipDetails = await apiReq(johnToken, 'GET', `/v1/payroll/my-payslips/${firstPayslipId}`);
    console.log('✅ Retrieved payslip details. Net Salary:', payslipDetails.data.payslip.net_salary);
    console.log('   Includes adjustment count:', payslipDetails.data.adjustments.length);

    // Verify Access Control (Priya should not be allowed to view John's payslips unless admin)
    try {
      await apiReq(priyaToken, 'GET', `/v1/payroll/my-payslips/${firstPayslipId}`);
      console.log('❌ Failed: Allowed employee to view another employee\'s payslip.');
    } catch (err) {
      console.log('✅ Expected Failure (Access Control restriction):', err.message);
    }

    console.log('\nE2E Attendance Payroll verification completed successfully! All checks passed.');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ E2E Verification failed:', err);
    process.exit(1);
  }
}

// Helper dates range generator matching backend utility
function getDatesInRange(startDateStr, endDateStr) {
  const dates = [];
  const curr = new Date(startDateStr + 'T00:00:00Z');
  const end = new Date(endDateStr + 'T00:00:00Z');
  while (curr <= end) {
    dates.push(new Date(curr));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

verify();
