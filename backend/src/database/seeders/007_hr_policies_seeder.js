const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { query } = require('../../config/db');

/**
 * Generate formal multi-page Acas-standard PDF document using PDFKit
 */
function generatePDF(filePath, docControl, sections, versionHistory) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50, autoFirstPage: true });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    const marginX = 50;
    const contentWidth = 495; // A4 printable width

    // ── TOP LEGAL DISCLAIMER BANNER NOTICE ────────────────────────────────────
    doc.rect(marginX, 36, contentWidth, 24).fill('#f1f5f9');
    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold')
       .text('Sample Corporate HR Policy Template — Customize Before Production Deployment', marginX, 43, { width: contentWidth, align: 'center' });

    doc.moveDown(1.8);

    // ── POLICY TITLE & SUBTITLE ─────────────────────────────────────────────
    doc.fillColor('#0f172a').fontSize(18).font('Helvetica-Bold').text(docControl.title, marginX, doc.y, { width: contentWidth, align: 'center' });
    doc.moveDown(0.3);
    doc.fillColor('#64748b').fontSize(8.5).font('Helvetica')
       .text(`Document Ref: ${docControl.docRef}  |  Version: ${docControl.version}  |  Classification: ${docControl.classification}`, marginX, doc.y, { width: contentWidth, align: 'center' });
    
    doc.moveDown(0.8);
    doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(marginX, doc.y).lineTo(marginX + contentWidth, doc.y).stroke();
    doc.moveDown(1);

    // ── DOCUMENT GOVERNANCE SUMMARY BOX ─────────────────────────────────────
    doc.fillColor('#0f172a').fontSize(10.5).font('Helvetica-Bold').text('DOCUMENT CONTROL & GOVERNANCE SUMMARY', marginX, doc.y, { width: contentWidth });
    doc.moveDown(0.4);

    const boxTop = doc.y;
    const boxHeight = 84;
    doc.rect(marginX, boxTop, contentWidth, boxHeight).fillAndStroke('#f8fafc', '#cbd5e1');

    const col1X = marginX + 12;
    const col1ValX = marginX + 115;
    const col2X = marginX + 255;
    const col2ValX = marginX + 355;
    const colWidth = 130;

    const rows = [
      ['Document Ref:', docControl.docRef, 'Effective Date:', docControl.effectiveDate],
      ['Policy Owner:', docControl.owner, 'Next Review:', docControl.reviewDate],
      ['Approver:', docControl.approver, 'Version:', `v${docControl.version}`],
      ['Scope / Audience:', docControl.scope, 'Classification:', 'Internal Policy']
    ];

    rows.forEach((row, i) => {
      const rowY = boxTop + 8 + (i * 18);
      doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text(row[0], col1X, rowY, { width: 100 });
      doc.fillColor('#0f172a').fontSize(8).font('Helvetica').text(row[1], col1ValX, rowY, { width: colWidth, height: 15, ellipsis: true });

      doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text(row[2], col2X, rowY, { width: 95 });
      doc.fillColor('#0f172a').fontSize(8).font('Helvetica').text(row[3], col2ValX, rowY, { width: colWidth, height: 15, ellipsis: true });
    });

    // Reset doc.x and doc.y cleanly below the box across full width
    doc.x = marginX;
    doc.y = boxTop + boxHeight + 18;

    // ── POLICY SECTIONS ──────────────────────────────────────────────────────
    sections.forEach((sec, idx) => {
      if (doc.y > 690) {
        doc.addPage();
        doc.x = marginX;
      }

      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(`${idx + 1}. ${sec.heading.toUpperCase()}`, marginX, doc.y, { width: contentWidth });
      doc.moveDown(0.4);
      doc.fillColor('#334155').fontSize(9).font('Helvetica').text(sec.body, marginX, doc.y, { width: contentWidth, align: 'justify', lineGap: 3.5 });
      doc.moveDown(1.3);
    });

    // ── REVISION LOG BOX ─────────────────────────────────────────────────────
    if (doc.y > 650) {
      doc.addPage();
      doc.x = marginX;
    }

    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('VERSION CONTROL & REVISION HISTORY', marginX, doc.y, { width: contentWidth });
    doc.moveDown(0.4);

    versionHistory.forEach((vh) => {
      const revTop = doc.y;
      doc.rect(marginX, revTop, contentWidth, 38).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text(`Version ${vh.version}  (Effective Date: ${vh.date})`, marginX + 10, revTop + 6, { width: contentWidth - 20 });
      doc.fillColor('#475569').fontSize(8).font('Helvetica').text(`Author: ${vh.author}   |   Approved By: ${vh.approvedBy}   |   Summary: ${vh.summary}`, marginX + 10, revTop + 20, { width: contentWidth - 20 });
      doc.x = marginX;
      doc.y = revTop + 46;
    });

    doc.moveDown(1);
    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(marginX, doc.y).lineTo(marginX + contentWidth, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica')
       .text('Confidential - Acas Model Structural Governance Framework. For Internal Organization Use Only.', marginX, doc.y, { width: contentWidth, align: 'center' });

    doc.end();

    stream.on('finish', () => {
      const stats = fs.statSync(filePath);
      resolve(stats.size);
    });
    stream.on('error', reject);
  });
}

async function seedHRPolicies() {
  try {
    console.log('[Seeder] Starting HR Policies seeder with extensive multi-page enterprise policy text...');

    const caRes = await query('SELECT DISTINCT organization_id FROM client_admins');
    if (!caRes.rows.length) {
      console.log('[Seeder] No organization found. Skipping HR Policies seeding.');
      return;
    }

    const uploadsDir = path.resolve('uploads/hr_policies');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    /* =========================================================================
       POLICY 1: CONSOLIDATED ATTENDANCE, WORKING HOURS & LEAVE POLICY (POL-HR-001)
       ========================================================================= */
    const attendanceLeaveDocControl = {
      docRef: 'POL-HR-001',
      title: 'Employee Attendance, Working Hours & Leave Policy',
      version: '1.0',
      effectiveDate: '2026-01-01',
      reviewDate: '2027-01-01',
      owner: 'Head of People Operations & Leave Compliance',
      approver: 'Executive Board / Chief Human Resources Officer',
      scope: 'All Confirmed, Probationary, Shift & Contract Personnel',
      classification: 'Internal Corporate Governance Policy'
    };

    const attendanceLeaveVersionHistory = [
      { version: '1.0', date: '2026-01-01', author: 'People Operations', summary: 'Comprehensive corporate attendance, shift governance, and leave entitlements policy release', approvedBy: 'CHRO' }
    ];

    const attendanceLeaveSections = [
      {
        heading: 'Legal Disclaimer & Statutory Framework Preamble',
        body: 'Please note: This free template policy is for informational purposes only and does not constitute formal legal advice. It is a generic template that may not suit your specific circumstances. When adopting or revising a policy, consult legal counsel to ensure compliance with all applicable federal, state, and local employment laws and regulations.\n\n' +
              'Our Organization has developed this comprehensive employee attendance, working hours, and leave policy to ensure a consistent, transparent, and fair approach to attendance and timeoff management. This policy is designed to create a positive, accountable, and efficient work environment, fostering teamwork and contributing directly to our organization’s long-term success.\n\n' +
              'This policy applies universally to all employees of the Organization, regardless of their position, department, or employment status. Whether you are a full-time, part-time, probationary, rotational shift, or fixed-term contract employee, good attendance, punctuality, and responsible leave planning are essential for the smooth operation of our business.'
      },
      {
        heading: 'Attendance Expectations, Punctuality & Shift Roster Governance',
        body: '1.1 Punctuality Mandate:\n' +
              'Employees are expected to arrive on time for their scheduled work hours. Punctuality is crucial for the effective operation of teams and the overall success of the company. Standard general business shift hours are from 09:30 AM to 06:30 PM, Monday through Friday, comprising 8 working hours and a 60-minute unpaid lunch break, representing 40 net working hours per week.\n\n' +
              '1.2 Rotational Shift Operations:\n' +
              'Technical support and 24/7 operational departments follow rotational rosters assigned by Line Managers:\n' +
              '• Morning Shift (Shift A): 07:00 AM – 04:00 PM\n' +
              '• Evening Shift (Shift B): 03:00 PM – 12:00 AM\n' +
              '• Night Shift (Shift C): 11:00 PM – 08:00 AM\n' +
              'Mandatory 15-minute shift handovers must occur prior to shift conclusion.\n\n' +
              '1.3 15-Minute Grace Window & Late Arrival LOP Rules:\n' +
              'A grace period is extended up to 09:45 AM. Employees may utilize this 15-minute grace window up to a maximum of 3 times per calendar month without penalty. Clock-ins recorded between 09:46 AM and 11:00 AM, or grace instances beyond 3 per month, constitute Late Arrivals. Accumulating 3 Late Arrivals in a calendar month triggers an automatic 0.5-day Loss of Pay (LOP) deduction; 6 Late Arrivals trigger a 1.0-day LOP deduction. Clock-ins after 11:00 AM automatically default to a Half-Day Absence.\n\n' +
              '1.4 Regularization SLA:\n' +
              'Employees must log attendance regularization requests in HRMS within 3 working days of any missing or erroneous punch (limited to max 3 regularization requests per month; a 4th request requires Department Head pre-approval).'
      },
      {
        heading: 'Comprehensive Paid & Unpaid Leave Categories',
        body: 'In recognition of the diverse needs of our workforce as well as the importance of work-life balance, the Organization provides various types of paid and statutory leave:\n\n' +
              '2.1 Casual Leave (CL):\n' +
              '12 working days per calendar year (accrued at 1 day per completed month). Intended for urgent, short-term personal or family obligations. CL cannot be combined with Earned Leave and cannot be taken for more than 3 consecutive working days.\n\n' +
              '2.2 Sick Leave (SL):\n' +
              '12 working days per calendar year (accrued at 1 day per month) for personal illness, medical recovery, or healthcare appointments. A medical certificate issued by a registered medical practitioner is mandatory for SL exceeding 2 consecutive days.\n\n' +
              '2.3 Earned Leave (EL / Vacation Leave):\n' +
              '15 working days per calendar year (1.25 days accrued per month), available after successful completion of 6 months of probation. Minimum application duration is 3 consecutive days. Planned EL requests must be submitted in HRMS at least 7 calendar days in advance.\n\n' +
              '2.4 Statutory Maternity & Paternity Leave:\n' +
              '26 weeks (182 calendar days) fully paid Maternity Leave for female employees for up to 2 surviving children under the Maternity Benefit Act, plus 30 days additional paid leave for pregnancy medical complications. Male employees receive 15 consecutive days of paid Paternity Leave within 6 months of child birth or legal adoption.\n\n' +
              '2.5 Bereavement Leave:\n' +
              '5 consecutive working days paid leave granted upon the demise of an immediate family member (spouse, child, parent, or sibling).\n\n' +
              '2.6 Reasonable Accommodations & Flexible Work:\n' +
              'Managers are encouraged to work with employees to identify reasonable accommodations, like flexible working hours or adjusted shift rosters, requiring Department Head written pre-approval.'
      },
      {
        heading: 'Absence Reporting, Emergency SLAs & Work From Home (WFH) Guidelines',
        body: '3.1 Unplanned Absence SLA:\n' +
              'If an employee is unable to report to work due to unexpected illness or emergency, they must notify their Line Manager via phone/message by 09:00 AM on the day of absence. If unreachable, notify HR Operations directly.\n\n' +
              '3.2 Work From Home (WFH) Framework:\n' +
              'Remote work requests require 24 hours advance manager pre-approval in HRMS. Remote employees must remain active during core hours (10:00 AM – 05:00 PM), maintain a 25 Mbps broadband connection, respond to calls/Slack within 30 minutes, and remain connected via Always-On Corporate VPN.\n\n' +
              '3.3 Overtime (OT) Governance:\n' +
              'Overtime work exceeding 2 hours requires advance written pre-approval from the functional Vice President. Pre-approved weekend OT (4+ hours) earns 1 day of Compensatory Off (Comp-Off), which must be used within 60 days or it lapses.\n\n' +
              '3.4 Service Abandonment Protocol:\n' +
              'Absence without prior notice or approved leave for 3 consecutive working days triggers an automated Show-Cause Notice. Absence for 5 consecutive working days without response is legally classified as Voluntary Abandonment of Employment, resulting in summary termination and recovery of company property.'
      },
      {
        heading: 'Attendance Tracking, Biometric Scans & Geofencing Security',
        body: '4.1 Timekeeping Systems:\n' +
              'All employees are required to record daily entry (clock-in) and exit (clock-out) punches accurately using authorized biometric entrance scanners or the mobile HRMS app.\n\n' +
              '4.2 Mobile GPS Geofencing:\n' +
              'Remote, field sales, and client-site personnel clocking in via the mobile HRMS app capture real-time GPS coordinates subject to a 50-meter geofenced radius around designated work locations.\n\n' +
              '4.3 Incomplete Punch Penalty:\n' +
              'Clocking in without clocking out flags an "Incomplete Punch" and defaults to a 0.5-day Loss of Pay unless regularized in HRMS within 3 working days.\n\n' +
              '4.4 Attendance Records Confidentiality:\n' +
              'Attendance records are confidential and accessed only by authorized HR personnel and direct supervisors involved in attendance management.'
      },
      {
        heading: 'Year-End Carry-Forward, Lapsing & Separation Leave Encashment',
        body: '5.1 Annual Lapsing of CL & SL:\n' +
              'Unutilized Casual Leave and Sick Leave lapse automatically at midnight on December 31st each year and cannot be carried forward or encashed.\n\n' +
              '5.2 Earned Leave Carry-Forward Cap:\n' +
              'A maximum of 10 days of unutilized Earned Leave may be carried forward into the subsequent calendar year.\n\n' +
              '5.3 Leave Encashment at Separation:\n' +
              'Accumulated EL beyond the carry-forward cap, up to a maximum of 30 days, is encashable upon resignation, retirement, or full separation based on basic salary.'
      },
      {
        heading: 'Policy Revisions & Employee Acknowledgment Procedures',
        body: 'The Organization recognizes that policies must evolve to align with changing workplace needs and labor laws. Policy updates will be communicated through email and corporate portal announcements. All employees are required to review and digitally acknowledge policy updates upon publication.'
      }
    ];

    /* =========================================================================
       POLICY 2: DEDICATED EMPLOYEE CODE OF CONDUCT & WORKPLACE ETHICS (POL-HR-002)
       ========================================================================= */
    const conductDocControl = {
      docRef: 'POL-HR-002',
      title: 'Employee Code of Conduct & Workplace Ethics Policy',
      version: '1.0',
      effectiveDate: '2026-01-01',
      reviewDate: '2027-01-01',
      owner: 'Head of Employee Relations & HR Compliance',
      approver: 'Executive Board / Chief Human Resources Officer',
      scope: 'All Full-Time, Probationary, Executive & Contract Personnel',
      classification: 'Internal Corporate Governance Policy'
    };

    const conductVersionHistory = [
      { version: '1.0', date: '2026-01-01', author: 'Employee Relations', summary: 'Comprehensive corporate code of conduct, POSH anti-harassment, and ethics framework release', approvedBy: 'CHRO' }
    ];

    const conductSections = [
      {
        heading: 'Legal Disclaimer & Code of Conduct Preamble',
        body: 'Please note: This free template policy is for informational purposes only and does not constitute formal legal advice. It is a corporate governance template designed to align with Acas legal frameworks, POSH statutory regulations, and international business ethics standards. Organizations customizing this document should seek qualified legal counsel.\n\n' +
              'Our Organization is committed to sustaining an ethical, respectful, and dignified work culture. This policy sets out mandatory standards of professional conduct, workplace decorum, non-discrimination, anti-harassment, conflict of interest, intellectual property protection, and progressive disciplinary governance across all operating entities.'
      },
      {
        heading: 'Professional Demeanor, Ethics & Anti-Discrimination Standards',
        body: '1.1 Professional Demeanor & Integrity:\n' +
              'Employees must uphold the highest standards of honesty, integrity, professional decorum, courtesy, and mutual respect in all interactions with colleagues, clients, vendors, and business partners.\n\n' +
              '1.2 Diversity, Equity & Non-Discrimination:\n' +
              'The Organization maintains zero tolerance for discrimination, bias, or harassment based on race, color, gender, age, religion, national origin, disability, sexual orientation, or marital status.\n\n' +
              '1.3 Workplace Attire Standards:\n' +
              'Business casual attire is required Monday through Thursday; smart casual attire is permitted on Fridays.'
      },
      {
        heading: 'Protection of Intellectual Property, Source Code & Trade Secrets',
        body: '2.1 Data & IP Confidentiality:\n' +
              'All proprietary source code, software architectures, customer records, strategic financial models, employee PII, and trade secrets remain strictly confidential during and post-employment.\n\n' +
              '2.2 Public Representation & Media Ban:\n' +
              'Employees are forbidden from speaking to media outlets, making public statements, or publishing corporate information on social media without explicit written authorization from Corporate Communications.'
      },
      {
        heading: 'Prevention of Sexual Harassment (POSH) & 90-Day ICC SLA',
        body: '3.1 Zero-Tolerance Mandate:\n' +
              'Absolute zero tolerance for physical, verbal, non-verbal unwelcome advances, sexually colored remarks, hostile work environment creation, or quid pro quo demands.\n\n' +
              '3.2 Internal Complaints Committee (ICC):\n' +
              'A statutory ICC headed by a senior female leader conducts confidential, independent inquiries into POSH complaints within a 90-day statutory SLA.\n\n' +
              '3.3 Whistleblower Anti-Retaliation Immunity:\n' +
              'Complainants and witnesses receive absolute immunity against retaliation, intimidation, or adverse employment action.'
      },
      {
        heading: 'Conflict of Interest, Anti-Bribery & Absolute Moonlighting Ban',
        body: '4.1 Absolute Moonlighting Prohibition:\n' +
              'Employees shall not engage in secondary paid employment, commercial freelancing, consulting, or side businesses during active employment without prior written approval from the Chief Executive Officer.\n\n' +
              '4.2 Gifts & Corporate Hospitality Threshold:\n' +
              'Soliciting or accepting cash, gifts, or lavish entertainment from business contacts exceeding ₹2,000 / $25 in value is strictly prohibited. Any unsolicited gift exceeding this limit must be declared to HR Operations within 48 hours.'
      },
      {
        heading: 'Progressive Disciplinary Action Matrix & Penalties',
        body: 'Conduct infractions trigger progressive stage-wise penalties:\n' +
              '• Stage 1 (Minor Infractions): Informal Counseling & Recorded Verbal Warning.\n' +
              '• Stage 2 (Repeated Breaches): Official Written Reprimand Letter placed in personnel file.\n' +
              '• Stage 3 (Severe Misconduct): Suspension without Pay (up to 14 days) or placement on a 30-60 day Performance Improvement Plan (PIP).\n' +
              '• Stage 4 (Gross Misconduct / Theft / Harassment): Summary Dismissal / Termination of Employment accompanied by civil or criminal prosecution.'
      },
      {
        heading: 'Grievance & Appeals SLA Framework',
        body: 'Employees wishing to appeal a conduct penalty may log a formal written grievance with the HR Appeals Panel within 7 working days of notice. The panel conducts an independent review and issues a final binding decision within 14 working days.'
      }
    ];

    /* =========================================================================
       POLICY 3: IT, DATA SECURITY & ACCEPTABLE USE POLICY (POL-IT-001)
       ========================================================================= */
    const itDocControl = {
      docRef: 'POL-IT-001',
      title: 'IT, Data Security & Acceptable Use Policy',
      version: '1.0',
      effectiveDate: '2026-01-01',
      reviewDate: '2027-01-01',
      owner: 'Chief Information Security Officer (CISO)',
      approver: 'Executive Board / Chief Technology Officer',
      scope: 'All Employees, Contractors & Third-Party System Users',
      classification: 'Internal Corporate Security Policy'
    };

    const itVersionHistory = [
      { version: '1.0', date: '2026-01-01', author: 'Information Security', summary: 'Comprehensive enterprise cybersecurity, access control, and acceptable use policy release', approvedBy: 'CTO' }
    ];

    const itSections = [
      {
        heading: 'Legal Disclaimer & Cybersecurity Governance Preamble',
        body: 'Please note: This free template policy is for informational purposes only and does not constitute legal or cybersecurity consulting advice. It is a corporate security framework designed to align with ISO 27001, GDPR, and cybersecurity standards. Organizations adopting this template should consult IT legal experts.\n\n' +
              'Our Organization depends on robust digital infrastructure, customer data privacy, and intellectual property security. This policy outlines mandatory rules governing company laptops, credentials, network traffic, cloud tools, VPN access, and incident reporting.'
      },
      {
        heading: 'Password Complexity, 90-Day Rotation & MFA Mandates',
        body: '1.1 Password Complexity Requirements:\n' +
              'Passwords must be at least 12 characters long, containing uppercase letters, lowercase letters, numbers, and special symbols (!@#$%^&*).\n\n' +
              '1.2 Mandatory 90-Day Rotation & Password Buffer:\n' +
              'Passwords expire automatically every 90 days. System rules prohibit reusing the previous 5 passwords.\n\n' +
              '1.3 Multi-Factor Authentication (MFA):\n' +
              'MFA is compulsory across all single-sign-on (SSO) portals, corporate email accounts, cloud databases, and VPN endpoints.\n\n' +
              '1.4 Credential Secrecy:\n' +
              'Passwords and OTP codes must NEVER be shared with anyone, including managers or IT Helpdesk technicians.'
      },
      {
        heading: 'Acceptable Use of Company Devices & Workstation Locking',
        body: '2.1 Dedicated Business Purpose:\n' +
              'Corporate laptops and desktops are assigned strictly for authorized business tasks. Installing personal gaming, torrenting, or pirated software is prohibited.\n\n' +
              '2.2 Unattended Workstation Locking:\n' +
              'Workstations must be locked whenever left unattended (Windows: Win + L; macOS: Cmd + Ctrl + Q).\n\n' +
              '2.3 Hardware Inventory Audits:\n' +
              'IT conducts mandatory semi-annual physical and digital hardware security compliance audits.'
      },
      {
        heading: 'Internet Content Filtering, Email Ethics & Encryption',
        body: '3.1 Network Traffic Monitoring:\n' +
              'Corporate internet traffic is logged. Streaming video, online gambling, torrent file sharing, and unapproved cloud storage drives are strictly blocked.\n\n' +
              '3.2 Email Usage & Data Encryption:\n' +
              'Corporate email must not be used for personal commercial subscriptions. Sensitive client records and source code must be encrypted at rest (AES-256) and in transit (TLS 1.3).\n\n' +
              '3.3 USB Port Restrictions:\n' +
              'USB mass storage ports are disabled by default. Storing corporate data on personal Google Drive or Dropbox is strictly forbidden.'
      },
      {
        heading: 'Remote Access, Always-On VPN & BYOD MDM Security',
        body: '4.1 Always-On Corporate VPN Requirement:\n' +
              'Connecting to company databases, cloud servers, or code repositories from WFH or remote locations requires logging in via the mandatory Always-On Corporate VPN.\n\n' +
              '4.2 Unencrypted Public Wi-Fi Ban:\n' +
              'Accessing company resources over open public Wi-Fi without VPN protection is strictly prohibited.\n\n' +
              '4.3 BYOD Mobile Device Management (MDM):\n' +
              'Personal mobile devices accessing corporate email or Slack must enroll in Mobile Device Management (MDM), allowing remote wipe of corporate container data upon employee departure.'
      },
      {
        heading: 'Security Incident & Phishing SLA (2-Hour Mandatory SLA)',
        body: '5.1 Mandatory 2-Hour SLA Notification:\n' +
              'Any lost device, suspicious phishing link, malware alert, or potential data breach must be reported immediately to security@company.com within 2 hours of discovery.'
      },
      {
        heading: 'Cyber Violations, Summary Penalties & Legal Enforcement',
        body: 'Non-compliance with IT security policies exposes the company to critical cyber risk. Violations trigger immediate account suspension, written reprimand, financial recovery for damages, or summary termination accompanied by civil or criminal prosecution.'
      }
    ];

    const policiesBundle = [
      { docControl: attendanceLeaveDocControl, versionHistory: attendanceLeaveVersionHistory, sections: attendanceLeaveSections, category: 'Attendance & Working Hours', filename: 'Attendance_Working_Hours_and_Leave_Policy.pdf' },
      { docControl: conductDocControl, versionHistory: conductVersionHistory, sections: conductSections, category: 'Leave & Employee Conduct', filename: 'Code_of_Conduct_and_Workplace_Ethics_Policy.pdf' },
      { docControl: itDocControl, versionHistory: itVersionHistory, sections: itSections, category: 'IT & Data Security', filename: 'IT_and_Data_Security_Policy.pdf' }
    ];

    for (const ca of caRes.rows) {
      const orgId = ca.organization_id;

      // Purge old/duplicate policies so exactly 3 clean policies exist
      await query('DELETE FROM hr_policies WHERE organization_id = $1', [orgId]);
      console.log(`  ✓ Purged old policies for org: ${orgId}`);

      const userRes = await query(
        "SELECT user_id FROM users WHERE organization_id = $1 AND role = 'client_admin' LIMIT 1",
        [orgId]
      );
      const creatorId = userRes.rows[0]?.user_id || null;

      for (const pol of policiesBundle) {
        const { docControl, versionHistory, sections, category, filename } = pol;
        const pdfPath = path.join(uploadsDir, `${orgId}_${filename}`);
        const relativeUrl = `uploads/hr_policies/${orgId}_${filename}`;

        // Generate full Acas-standard PDF with fixed layout
        const fileSize = await generatePDF(pdfPath, docControl, sections, versionHistory);

        // Build HTML content for online reader - CLEAN PROSE LAYOUT (NO RAW TABLES)
        const summaryText = sections.find(s => s.heading.includes('Expectations') || s.heading.includes('Demeanor') || s.heading.includes('Password'))?.body.slice(0, 220) + '...';
        const keywords = [category.toLowerCase(), docControl.docRef.toLowerCase(), 'policy', 'acas framework', 'governance', 'compliance'];

        const contentHtml = `
          <div style="font-family: inherit; color: #1e293b; line-height: 1.6;">
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #6366f1; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; font-size: 12px; color: #475569;">
              <strong style="color: #334155; display: block; margin-bottom: 4px;">Policy Template Disclaimer Notice</strong>
              Please note: This free template policy is for informational purposes only and does not constitute formal legal advice. It is a generic template that may not suit your specific circumstances. When adopting or revising a policy, consult legal counsel to ensure compliance with all applicable laws.
            </div>

            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
              <div style="font-size: 11px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">
                Governance & Document Control Summary
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 12px; color: #334155;">
                <div style="background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #f1f5f9;"><span style="color: #64748b; font-size: 11px; display: block; font-weight: 700;">DOCUMENT REF</span><strong>${docControl.docRef}</strong></div>
                <div style="background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #f1f5f9;"><span style="color: #64748b; font-size: 11px; display: block; font-weight: 700;">REVISION VERSION</span><strong>v${docControl.version}</strong></div>
                <div style="background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #f1f5f9;"><span style="color: #64748b; font-size: 11px; display: block; font-weight: 700;">EFFECTIVE DATE</span><strong>${docControl.effectiveDate}</strong></div>
                <div style="background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #f1f5f9;"><span style="color: #64748b; font-size: 11px; display: block; font-weight: 700;">POLICY OWNER</span><strong>${docControl.owner}</strong></div>
              </div>
            </div>

            ${sections.map((sec, idx) => `
              <section style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
                <h3 style="margin: 0 0 8px; font-size: 15px; font-weight: 800; color: #0f172a;">${idx + 1}. ${sec.heading.toUpperCase()}</h3>
                <p style="margin: 0; font-size: 13.5px; color: #334155; line-height: 1.65; white-space: pre-line;">${sec.body.replace(/\n/g, '<br/>')}</p>
              </section>
            `).join('')}

            <div style="margin-top: 28px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
              <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
                Document Revision & Governance Log
              </div>
              <div style="font-size: 12px; color: #334155; display: flex; flex-direction: column; gap: 4px;">
                <div><strong>Current Revision:</strong> Version ${docControl.version} (Effective ${docControl.effectiveDate})</div>
                <div><strong>Approved By:</strong> ${docControl.approver}</div>
                <div><strong>Revision Summary:</strong> Initial corporate framework release</div>
              </div>
            </div>
          </div>
        `.trim();

        // Plain text content for clean RAG ingestion
        const contentText = `${docControl.title.toUpperCase()} (${docControl.docRef}) - Version ${docControl.version} - Effective Date: ${docControl.effectiveDate}\n` +
          `Policy Owner: ${docControl.owner} | Approval Authority: ${docControl.approver} | Scope: ${docControl.scope}\n\n` +
          sections.map((sec, idx) => `SECTION ${idx + 1}: ${sec.heading.toUpperCase()}\n${sec.body}`).join('\n\n') +
          `\n\nDOCUMENT GOVERNANCE LOG:\n` +
          versionHistory.map(vh => `Version ${vh.version} effective ${vh.date} approved by ${vh.approvedBy}: ${vh.summary}`).join('\n');

        // Insert fresh clean policy record
        await query(
          `INSERT INTO hr_policies (
            organization_id, title, category, summary, content_html, content_text,
            keywords, document_url, document_name, document_size, version_number,
            effective_date, is_active, is_published, published_at, created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, true, NOW(), $13, $13)`,
          [
            orgId,
            docControl.title,
            category,
            summaryText,
            contentHtml,
            contentText,
            keywords,
            relativeUrl,
            filename,
            fileSize,
            docControl.version,
            docControl.effectiveDate,
            creatorId
          ]
        );
        console.log(`  ✓ Inserted lengthy policy "${docControl.title}" (${docControl.docRef}) for org: ${orgId}`);
      }
    }

    console.log('[Seeder] Reorganized lengthy HR Policies seeding completed successfully.');
  } catch (err) {
    console.error('[Seeder] Error seeding HR Policies:', err);
    throw err;
  }
}

module.exports = seedHRPolicies;
