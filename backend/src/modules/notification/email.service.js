const nodemailer = require('nodemailer');
const { getSmtpSettings } = require('./smtp.repository');

async function createTransporter() {
  const cfg = await getSmtpSettings();
  return nodemailer.createTransport({
    host: cfg.host,
    port: parseInt(cfg.port, 10),
    secure: cfg.encryption === 'ssl',
    auth: { user: cfg.username, pass: cfg.password },
    tls: { rejectUnauthorized: false },
  });
}

async function sendOtpEmail(toEmail, otp) {
  const cfg = await getSmtpSettings();
  const transporter = await createTransporter();

  await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
    to: toEmail,
    subject: 'Your Sign-In OTP — HR & Payroll Platform',
    html: `
      <div style="font-family:Inter,Arial,sans-serif;background:#0f172a;padding:40px 0;min-height:100vh">
        <div style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid rgba(99,102,241,0.2)">
          <div style="background:linear-gradient(135deg,#1e1b4b,#0f172a);padding:32px 36px;text-align:center">
            <div style="display:inline-block;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:20px;padding:4px 14px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#a5b4fc;margin-bottom:16px">
              Authentication
            </div>
            <h1 style="color:#f1f5f9;font-size:22px;font-weight:800;margin:0">Your Sign-In Code</h1>
          </div>
          <div style="padding:36px">
            <p style="color:#94a3b8;font-size:14px;margin-bottom:28px;line-height:1.6">
              Use the code below to complete your sign-in to the HR & Payroll Platform.
              Do <strong style="color:#f1f5f9">not</strong> share this code with anyone.
            </p>
            <div style="background:#0f172a;border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:24px;text-align:center;margin-bottom:28px">
              <div style="font-size:38px;font-weight:800;letter-spacing:12px;color:#6366f1;font-family:monospace">
                ${otp}
              </div>
            </div>
            <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px 16px;margin-bottom:24px">
              <p style="color:#fca5a5;font-size:13px;margin:0">
                ⚠️ This OTP expires in <strong>10 minutes</strong> and is valid for one use only.
              </p>
            </div>
            <p style="color:#475569;font-size:12px;text-align:center;margin:0">
              If you did not request this, please contact your system administrator immediately.
            </p>
          </div>
          <div style="background:#0f172a;padding:16px 36px;text-align:center;border-top:1px solid rgba(255,255,255,0.05)">
            <p style="color:#334155;font-size:11px;margin:0">${cfg.fromName} · HR & Payroll Platform</p>
          </div>
        </div>
      </div>
    `,
  });
}

async function testSmtpConnection(cfg) {
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: parseInt(cfg.port, 10),
    secure: cfg.encryption === 'ssl',
    auth: { user: cfg.username, pass: cfg.password },
    tls: { rejectUnauthorized: false },
  });
  await transporter.verify();
  return true;
}

async function sendTemporaryPasswordEmail(toEmail, tempPassword) {
  const env = require('../../config/env');
  const cleanEmail = toEmail.toLowerCase().trim();

  if (env.nodeEnv === 'development') {
    console.log(`
============================================================
🔑 [DEVELOPMENT] EMPLOYEE LOGIN CREDENTIALS
Email:    ${cleanEmail}
Password: ${tempPassword}
Portal:   ${env.portalUrl}
============================================================
`);
  }

  if (!env.emailEnabled) {
    console.info(`[Email] Skipping credentials email to ${cleanEmail} because EMAIL_ENABLED=false`);
    return;
  }

  const cfg = await getSmtpSettings();
  const transporter = await createTransporter();

  await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
    to: cleanEmail,
    subject: 'Your Account Credentials — HR & Payroll Platform',
    html: `
      <div style="font-family:Inter,Arial,sans-serif;background:#0f172a;padding:40px 0;min-height:100vh">
        <div style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid rgba(99,102,241,0.2)">
          <div style="background:linear-gradient(135deg,#1e1b4b,#0f172a);padding:32px 36px;text-align:center">
            <h1 style="color:#f1f5f9;font-size:22px;font-weight:800;margin:0">Welcome to the Platform</h1>
          </div>
          <div style="padding:36px">
            <p style="color:#94a3b8;font-size:14px;margin-bottom:28px;line-height:1.6">
              An account has been created for you. You can sign in using your email address and the temporary password below.
            </p>
            <div style="background:#0f172a;border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:24px;margin-bottom:28px">
              <table style="width:100%;border-collapse:collapse;font-size:13px;color:#94a3b8">
                <tr>
                  <td style="padding:6px 0;font-weight:700;color:#f1f5f9;width:35%">Login Email</td>
                  <td style="padding:6px 0;font-family:monospace;color:#a5b4fc">${cleanEmail}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-weight:700;color:#f1f5f9">Temporary Password</td>
                  <td style="padding:6px 0;font-family:monospace;color:#6366f1;font-weight:bold;font-size:16px">${tempPassword}</td>
                </tr>
              </table>
            </div>
            <div style="text-align:center;margin-bottom:28px">
              <a href="${env.portalUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;box-shadow:0 4px 12px rgba(99,102,241,0.3)">
                Login to Employee Portal
              </a>
            </div>
            <p style="color:#e2e8f0;font-size:13px;margin:0;line-height:1.5">
              ⚠️ <strong>Security Notice:</strong> You will be prompted to change this temporary password and complete OTP verification on your first sign-in.
            </p>
          </div>
          <div style="background:#0f172a;padding:16px 36px;text-align:center;border-top:1px solid rgba(255,255,255,0.05)">
            <p style="color:#334155;font-size:11px;margin:0">${cfg.fromName} · HR & Payroll Platform</p>
          </div>
        </div>
      </div>
    `,
  });
}

async function sendLeaveSubmittedEmail(toEmail, { employeeName, leaveType, startDate, endDate, totalDays, reason }) {
  const cfg = await getSmtpSettings();
  const transporter = await createTransporter();
  await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
    to: toEmail,
    subject: `Leave Request from ${employeeName} — Action Required`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:40px 0">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.06)">
          <div style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:28px 36px">
            <h1 style="color:#ffffff;font-size:20px;font-weight:800;margin:0">New Leave Request</h1>
            <p style="color:#c7d2fe;font-size:13px;margin:6px 0 0 0">Requires your approval</p>
          </div>
          <div style="padding:32px 36px">
            <p style="color:#475569;font-size:14px;margin-bottom:24px"><strong style="color:#1e293b">${employeeName}</strong> has submitted a leave request that requires your review.</p>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;width:45%">Leave Type</td><td style="padding:10px 0;color:#1e293b;font-weight:600;border-bottom:1px solid #f1f5f9">${leaveType}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9">Start Date</td><td style="padding:10px 0;color:#1e293b;font-weight:600;border-bottom:1px solid #f1f5f9">${startDate}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9">End Date</td><td style="padding:10px 0;color:#1e293b;font-weight:600;border-bottom:1px solid #f1f5f9">${endDate}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9">Total Days</td><td style="padding:10px 0;color:#1e293b;font-weight:600;border-bottom:1px solid #f1f5f9">${totalDays}</td></tr>
              ${reason ? `<tr><td style="padding:10px 0;color:#64748b">Reason</td><td style="padding:10px 0;color:#1e293b">${reason}</td></tr>` : ''}
            </table>
            <p style="color:#64748b;font-size:12px;margin-top:28px">Please log in to the portal to approve or reject this request.</p>
          </div>
          <div style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0">
            <p style="color:#94a3b8;font-size:11px;margin:0">${cfg.fromName} · HR & Payroll Platform</p>
          </div>
        </div>
      </div>
    `,
  });
}

async function sendLeaveDecisionEmail(toEmail, { employeeName, leaveType, startDate, endDate, status, remarks }) {
  const cfg = await getSmtpSettings();
  const transporter = await createTransporter();
  const isApproved = status === 'APPROVED';
  const color = isApproved ? '#16a34a' : '#dc2626';
  const bgColor = isApproved ? '#dcfce7' : '#fee2e2';
  await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
    to: toEmail,
    subject: `Your Leave Request has been ${isApproved ? 'Approved' : 'Rejected'}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:40px 0">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.06)">
          <div style="background:${isApproved ? 'linear-gradient(135deg,#16a34a,#15803d)' : 'linear-gradient(135deg,#dc2626,#b91c1c)'};padding:28px 36px">
            <h1 style="color:#ffffff;font-size:20px;font-weight:800;margin:0">Leave ${isApproved ? 'Approved' : 'Rejected'}</h1>
          </div>
          <div style="padding:32px 36px">
            <p style="color:#475569;font-size:14px;margin-bottom:24px">Hi <strong style="color:#1e293b">${employeeName}</strong>, your leave request has been <strong style="color:${color}">${status.toLowerCase()}</strong>.</p>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;width:45%">Leave Type</td><td style="padding:10px 0;color:#1e293b;font-weight:600;border-bottom:1px solid #f1f5f9">${leaveType}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9">Start Date</td><td style="padding:10px 0;color:#1e293b;font-weight:600;border-bottom:1px solid #f1f5f9">${startDate}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9">End Date</td><td style="padding:10px 0;color:#1e293b;font-weight:600;border-bottom:1px solid #f1f5f9">${endDate}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9">Status</td><td style="padding:10px 0"><span style="background:${bgColor};color:${color};padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700">${status}</span></td></tr>
              ${remarks ? `<tr><td style="padding:10px 0;color:#64748b">Remarks</td><td style="padding:10px 0;color:#1e293b">${remarks}</td></tr>` : ''}
            </table>
          </div>
          <div style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0">
            <p style="color:#94a3b8;font-size:11px;margin:0">${cfg.fromName} · HR & Payroll Platform</p>
          </div>
        </div>
      </div>
    `,
  });
}

async function sendRegularizationSubmittedEmail(toEmail, { employeeName, attendanceDate, type, reason }) {
  const cfg = await getSmtpSettings();
  const transporter = await createTransporter();
  await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
    to: toEmail,
    subject: `Regularization Request from ${employeeName} — Action Required`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:40px 0">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.06)">
          <div style="background:linear-gradient(135deg,#0891b2,#0e7490);padding:28px 36px">
            <h1 style="color:#ffffff;font-size:20px;font-weight:800;margin:0">Regularization Request</h1>
            <p style="color:#a5f3fc;font-size:13px;margin:6px 0 0 0">Requires your approval</p>
          </div>
          <div style="padding:32px 36px">
            <p style="color:#475569;font-size:14px;margin-bottom:24px"><strong style="color:#1e293b">${employeeName}</strong> has submitted an attendance regularization request.</p>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;width:45%">Date</td><td style="padding:10px 0;color:#1e293b;font-weight:600;border-bottom:1px solid #f1f5f9">${attendanceDate}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9">Type</td><td style="padding:10px 0;color:#1e293b;font-weight:600;border-bottom:1px solid #f1f5f9">${type}</td></tr>
              ${reason ? `<tr><td style="padding:10px 0;color:#64748b">Reason</td><td style="padding:10px 0;color:#1e293b">${reason}</td></tr>` : ''}
            </table>
            <p style="color:#64748b;font-size:12px;margin-top:28px">Please log in to the portal to approve or reject this request.</p>
          </div>
          <div style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0">
            <p style="color:#94a3b8;font-size:11px;margin:0">${cfg.fromName} · HR & Payroll Platform</p>
          </div>
        </div>
      </div>
    `,
  });
}

async function sendRegularizationDecisionEmail(toEmail, { employeeName, attendanceDate, status, reason }) {
  const cfg = await getSmtpSettings();
  const transporter = await createTransporter();
  const isApproved = status === 'APPROVED';
  const color = isApproved ? '#16a34a' : '#dc2626';
  const bgColor = isApproved ? '#dcfce7' : '#fee2e2';
  await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
    to: toEmail,
    subject: `Your Regularization Request has been ${isApproved ? 'Approved' : 'Rejected'}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:40px 0">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.06)">
          <div style="background:${isApproved ? 'linear-gradient(135deg,#16a34a,#15803d)' : 'linear-gradient(135deg,#dc2626,#b91c1c)'};padding:28px 36px">
            <h1 style="color:#ffffff;font-size:20px;font-weight:800;margin:0">Regularization ${isApproved ? 'Approved' : 'Rejected'}</h1>
          </div>
          <div style="padding:32px 36px">
            <p style="color:#475569;font-size:14px;margin-bottom:24px">Hi <strong style="color:#1e293b">${employeeName}</strong>, your attendance regularization request has been <strong style="color:${color}">${status.toLowerCase()}</strong>.</p>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;width:45%">Date</td><td style="padding:10px 0;color:#1e293b;font-weight:600;border-bottom:1px solid #f1f5f9">${attendanceDate}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9">Status</td><td style="padding:10px 0"><span style="background:${bgColor};color:${color};padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700">${status}</span></td></tr>
              ${reason ? `<tr><td style="padding:10px 0;color:#64748b">Remarks</td><td style="padding:10px 0;color:#1e293b">${reason}</td></tr>` : ''}
            </table>
          </div>
          <div style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0">
            <p style="color:#94a3b8;font-size:11px;margin:0">${cfg.fromName} · HR & Payroll Platform</p>
          </div>
        </div>
      </div>
    `,
  });
}

async function sendAppraisalCycleOpenedEmail(toEmail, { employeeName, cycleName, periodStart, periodEnd }) {
  const cfg = await getSmtpSettings();
  const transporter = await createTransporter();
  await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
    to: toEmail,
    subject: `Appraisal Cycle "${cycleName}" is Now Open`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:40px 0">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.06)">
          <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:28px 36px">
            <h1 style="color:#ffffff;font-size:20px;font-weight:800;margin:0">Appraisal Cycle Opened</h1>
            <p style="color:#ddd6fe;font-size:13px;margin:6px 0 0 0">Your performance review period has begun</p>
          </div>
          <div style="padding:32px 36px">
            <p style="color:#475569;font-size:14px;margin-bottom:24px">Hi <strong style="color:#1e293b">${employeeName}</strong>, a new appraisal cycle has been opened. Please log in to complete your self-assessment.</p>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;width:45%">Cycle Name</td><td style="padding:10px 0;color:#1e293b;font-weight:600;border-bottom:1px solid #f1f5f9">${cycleName}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9">Period Start</td><td style="padding:10px 0;color:#1e293b;font-weight:600;border-bottom:1px solid #f1f5f9">${periodStart}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b">Period End</td><td style="padding:10px 0;color:#1e293b;font-weight:600">${periodEnd}</td></tr>
            </table>
          </div>
          <div style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0">
            <p style="color:#94a3b8;font-size:11px;margin:0">${cfg.fromName} · HR & Payroll Platform</p>
          </div>
        </div>
      </div>
    `,
  });
}

async function sendGoalDeadlineReminderEmail(toEmail, { employeeName, goalTitle, dueDate }) {
  const cfg = await getSmtpSettings();
  const transporter = await createTransporter();
  await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
    to: toEmail,
    subject: `Goal Deadline Reminder — "${goalTitle}" due in 3 days`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:40px 0">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.06)">
          <div style="background:linear-gradient(135deg,#d97706,#b45309);padding:28px 36px">
            <h1 style="color:#ffffff;font-size:20px;font-weight:800;margin:0">Goal Deadline Approaching</h1>
            <p style="color:#fde68a;font-size:13px;margin:6px 0 0 0">Due in 3 days</p>
          </div>
          <div style="padding:32px 36px">
            <p style="color:#475569;font-size:14px;margin-bottom:24px">Hi <strong style="color:#1e293b">${employeeName}</strong>, a goal assigned to you is due in <strong style="color:#d97706">3 days</strong>. Please update your progress.</p>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;width:45%">Goal</td><td style="padding:10px 0;color:#1e293b;font-weight:600;border-bottom:1px solid #f1f5f9">${goalTitle}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b">Due Date</td><td style="padding:10px 0;color:#dc2626;font-weight:700">${dueDate}</td></tr>
            </table>
          </div>
          <div style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0">
            <p style="color:#94a3b8;font-size:11px;margin:0">${cfg.fromName} · HR & Payroll Platform</p>
          </div>
        </div>
      </div>
    `,
  });
}

async function sendPayrollProcessedEmail(toEmail, { employeeName, payrollMonth, payrollYear }) {
  const cfg = await getSmtpSettings();
  const transporter = await createTransporter();
  const monthName = new Date(payrollYear, payrollMonth - 1, 1).toLocaleString('en-US', { month: 'long' });
  await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
    to: toEmail,
    subject: `Your Payslip for ${monthName} ${payrollYear} is Ready`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:40px 0">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.06)">
          <div style="background:linear-gradient(135deg,#0f766e,#0d9488);padding:28px 36px">
            <h1 style="color:#ffffff;font-size:20px;font-weight:800;margin:0">Payslip Ready</h1>
            <p style="color:#99f6e4;font-size:13px;margin:6px 0 0 0">${monthName} ${payrollYear}</p>
          </div>
          <div style="padding:32px 36px">
            <p style="color:#475569;font-size:14px;margin-bottom:24px">Hi <strong style="color:#1e293b">${employeeName}</strong>, your payslip for <strong style="color:#0f766e">${monthName} ${payrollYear}</strong> has been processed and is now available in the portal.</p>
            <p style="color:#64748b;font-size:13px">Log in to the employee portal and navigate to <strong>Payslips</strong> to view and download your payslip.</p>
          </div>
          <div style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0">
            <p style="color:#94a3b8;font-size:11px;margin:0">${cfg.fromName} · HR & Payroll Platform</p>
          </div>
        </div>
      </div>
    `,
  });
}

module.exports = {
  sendOtpEmail,
  testSmtpConnection,
  sendTemporaryPasswordEmail,
  sendLeaveSubmittedEmail,
  sendLeaveDecisionEmail,
  sendRegularizationSubmittedEmail,
  sendRegularizationDecisionEmail,
  sendAppraisalCycleOpenedEmail,
  sendGoalDeadlineReminderEmail,
  sendPayrollProcessedEmail,
  sendOptionalHolidaySubmittedEmail,
  sendOptionalHolidayDecisionEmail,
};

async function sendOptionalHolidaySubmittedEmail(toEmail, { employeeName, holidayName, holidayDate }) {
  const cfg = await getSmtpSettings();
  const transporter = await createTransporter();
  await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
    to: toEmail,
    subject: `Optional Holiday Request - ${employeeName}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:40px 0">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.06)">
          <div style="background:linear-gradient(135deg,#0369a1,#0284c7);padding:28px 36px">
            <h1 style="color:#ffffff;font-size:20px;font-weight:800;margin:0">Optional Holiday Requested</h1>
          </div>
          <div style="padding:32px 36px">
            <p style="color:#475569;font-size:14px;margin-bottom:24px">Dear Manager,</p>
            <p style="color:#475569;font-size:14px;margin-bottom:24px">
              <strong style="color:#1e293b">${employeeName}</strong> has submitted an optional holiday request for <strong>${holidayName}</strong> on <strong>${holidayDate}</strong>.
            </p>
            <p style="color:#64748b;font-size:13px">Log in to the manager portal to review this request.</p>
          </div>
          <div style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0">
            <p style="color:#94a3b8;font-size:11px;margin:0">${cfg.fromName} · HR & Payroll Platform</p>
          </div>
        </div>
      </div>
    `,
  });
}

async function sendOptionalHolidayDecisionEmail(toEmail, { employeeName, holidayName, holidayDate, status, remarks }) {
  const cfg = await getSmtpSettings();
  const transporter = await createTransporter();
  await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
    to: toEmail,
    subject: `Optional Holiday Request ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:40px 0">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.06)">
          <div style="background:linear-gradient(135deg,${status === 'APPROVED' ? '#15803d,#16a34a' : '#b91c1c,#dc2626'});padding:28px 36px">
            <h1 style="color:#ffffff;font-size:20px;font-weight:800;margin:0">Optional Holiday ${status === 'APPROVED' ? 'Approved' : 'Rejected'}</h1>
          </div>
          <div style="padding:32px 36px">
            <p style="color:#475569;font-size:14px;margin-bottom:24px">Dear ${employeeName},</p>
            <p style="color:#475569;font-size:14px;margin-bottom:24px">
              Your optional holiday request for <strong>${holidayName}</strong> on <strong>${holidayDate}</strong> has been <strong>${status.toLowerCase()}</strong>.
            </p>
            ${remarks ? `<p style="color:#475569;font-size:14px"><strong>Remarks:</strong> ${remarks}</p>` : ''}
          </div>
          <div style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0">
            <p style="color:#94a3b8;font-size:11px;margin:0">${cfg.fromName} · HR & Payroll Platform</p>
          </div>
        </div>
      </div>
    `,
  });
}
