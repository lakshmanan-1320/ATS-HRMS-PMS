const { query } = require('../../config/db');

// Helper to create notifications in the existing database structure
async function createInAppNotification(recipientEmployeeId, type, title, message, entityId, entityType) {
  try {
    if (!recipientEmployeeId) return;
    await query(
      `INSERT INTO notifications (recipient_employee_id, type, title, message, entity_id, entity_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [recipientEmployeeId, type, title, message, entityId, entityType]
    );
  } catch (err) {
    console.error('Failed to create in-app notification:', err);
  }
}

// Get HR users / Client Admins for notification routing
async function getHrEmployeeIds(orgId) {
  try {
    const res = await query(
      `SELECT employee_id 
       FROM employees 
       WHERE organization_id = $1 AND role IN ('hr', 'client_admin')`,
      [orgId]
    );
    return res.rows.map(r => r.employee_id);
  } catch (err) {
    console.error('Failed to fetch HR employee IDs:', err);
    return [];
  }
}

async function getManagerEmployeeId(employeeId) {
  try {
    const res = await query(
      `SELECT manager_employee_id FROM employees WHERE employee_id = $1`,
      [employeeId]
    );
    return res.rows[0]?.manager_employee_id || null;
  } catch (err) {
    console.error('Failed to fetch manager employee ID:', err);
    return null;
  }
}

async function getEmployeeName(employeeId) {
  try {
    const res = await query(
      `SELECT CONCAT(first_name, ' ', last_name) AS name FROM employees WHERE employee_id = $1`,
      [employeeId]
    );
    return res.rows[0]?.name || 'Employee';
  } catch (err) {
    return 'Employee';
  }
}

// --- Specific PIP Alerts ---

async function notifyCandidateIdentified(orgId, employeeId, source) {
  const name = await getEmployeeName(employeeId);
  const managerId = await getManagerEmployeeId(employeeId);
  
  // Alert Manager
  if (managerId) {
    await createInAppNotification(
      managerId,
      'PIP_ALERT',
      'Potential PIP Candidate Identified',
      `${name} has been identified as a potential candidate for PIP from source: ${source}.`,
      employeeId,
      'candidate'
    );
  }

  // Alert HR/Client Admins
  const hrIds = await getHrEmployeeIds(orgId);
  for (const hrId of hrIds) {
    await createInAppNotification(
      hrId,
      'PIP_ALERT',
      'Potential PIP Candidate Identified',
      `${name} has been added to the Potential PIP Candidates Review Queue.`,
      employeeId,
      'candidate'
    );
  }
}

async function notifyApprovalPending(orgId, employeeId, candidateId) {
  const name = await getEmployeeName(employeeId);
  const hrIds = await getHrEmployeeIds(orgId);
  for (const hrId of hrIds) {
    await createInAppNotification(
      hrId,
      'PIP_ALERT',
      'PIP Approval Pending',
      `A new Performance Improvement Plan (PIP) has been recommended for ${name} and is awaiting HR approval.`,
      candidateId,
      'candidate'
    );
  }
}

async function notifyPipStarted(orgId, employeeId, pipId) {
  const name = await getEmployeeName(employeeId);
  
  // Notify Employee
  await createInAppNotification(
    employeeId,
    'PIP_ALERT',
    'Performance Improvement Plan (PIP) Started',
    `A Performance Improvement Plan (PIP) has been initiated for you. Please review and complete your Read Confirmation.`,
    pipId,
    'pip'
  );

  // Notify Manager
  const managerId = await getManagerEmployeeId(employeeId);
  if (managerId) {
    await createInAppNotification(
      managerId,
      'PIP_ALERT',
      'PIP Active for Employee',
      `The Performance Improvement Plan (PIP) is now active for ${name}. Weekly check-ins will be scheduled.`,
      pipId,
      'pip'
    );
  }
}

async function notifyCheckinDue(orgId, employeeId, checkinId, pipId) {
  const name = await getEmployeeName(employeeId);
  const managerId = await getManagerEmployeeId(employeeId);
  
  // Notify Manager
  if (managerId) {
    await createInAppNotification(
      managerId,
      'PIP_ALERT',
      'PIP Check-in Due',
      `A progress check-in is due for ${name}'s active Performance Improvement Plan (PIP).`,
      checkinId,
      'checkin'
    );
  }

  // Notify Employee
  await createInAppNotification(
    employeeId,
    'PIP_ALERT',
    'PIP Check-in Scheduled',
    `Your manager is scheduled to review your PIP progress. You may upload evidence or add comments.`,
    checkinId,
    'checkin'
  );
}

async function notifyRecommendationReady(orgId, employeeId, pipId, recommendation) {
  const name = await getEmployeeName(employeeId);
  const hrIds = await getHrEmployeeIds(orgId);
  for (const hrId of hrIds) {
    await createInAppNotification(
      hrId,
      'PIP_ALERT',
      'PIP Recommendation Engine Action Ready',
      `The recommendation engine suggests a '${recommendation}' action for ${name}'s completed PIP.`,
      pipId,
      'pip'
    );
  }
}

async function notifyPipClosed(orgId, employeeId, pipId, status) {
  // Notify Employee
  await createInAppNotification(
    employeeId,
    'PIP_ALERT',
    'Performance Improvement Plan (PIP) Completed',
    `Your Performance Improvement Plan (PIP) has been closed with status: ${status}.`,
    pipId,
    'pip'
  );

  // Notify Manager
  const managerId = await getManagerEmployeeId(employeeId);
  if (managerId) {
    await createInAppNotification(
      managerId,
      'PIP_ALERT',
      'PIP Closed for Employee',
      `The active Performance Improvement Plan (PIP) for ${name} has been closed: ${status}.`,
      pipId,
      'pip'
    );
  }
}

async function notifyPipDeadlineApproaching(orgId, employeeId, pipId, daysRemaining) {
  const name = await getEmployeeName(employeeId);
  const managerId = await getManagerEmployeeId(employeeId);
  
  if (managerId) {
    await createInAppNotification(
      managerId,
      'PIP_ALERT',
      'PIP Target Date Approaching',
      `The active PIP for ${name} will conclude in ${daysRemaining} days. Ensure all final check-ins are logged.`,
      pipId,
      'pip'
    );
  }
}

module.exports = {
  notifyCandidateIdentified,
  notifyApprovalPending,
  notifyPipStarted,
  notifyCheckinDue,
  notifyRecommendationReady,
  notifyPipClosed,
  notifyPipDeadlineApproaching
};
