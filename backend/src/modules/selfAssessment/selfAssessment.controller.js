const service = require('./selfAssessment.service');
const { STATUS_CODES } = require('../../constants/statusCodes');
const ApiError = require('../../utils/apiError');

function requireAssignedEmployee(submission, user) {
  if (submission.employee_id !== user.employeeId) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'You can only update your own self assessment.');
  }
}

function requireReviewer(user) {
  if (!['manager', 'hr', 'client_admin', 'super_admin'].includes(user.role)) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'Only a manager or administrator can review a self assessment.');
  }
}

async function getSelfAssessmentTemplate(req, res, next) {
  try {
    const { goalId } = req.params;
    const orgId = req.user.organizationId;
    const template = await service.getSelfAssessmentTemplate(goalId, orgId);
    res.status(STATUS_CODES.OK).json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
}

async function saveSelfAssessmentTemplate(req, res, next) {
  try {
    const { goalId } = req.params;
    const { questions } = req.body;
    const orgId = req.user.organizationId;
    const userId = req.user.id;

    const saved = await service.saveSelfAssessmentTemplate(orgId, goalId, questions, userId);
    res.status(STATUS_CODES.OK).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
}

async function getSubmissionAndAnswers(req, res, next) {
  try {
    const { goalId, assignmentId } = req.params;
    const orgId = req.user.organizationId;
    const data = await service.getSubmissionAndAnswers(goalId, assignmentId, orgId, req.user);
    res.status(STATUS_CODES.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function saveDraftAnswers(req, res, next) {
  try {
    const { goalId, assignmentId } = req.params;
    const { answers } = req.body;
    const orgId = req.user.organizationId;
    const userId = req.user.id;
    const role = req.user.role;

    const submission = await service.resolveSubmission(goalId, assignmentId, orgId, req.user);
    requireAssignedEmployee(submission, req.user);
    const result = await service.saveDraftAnswers(orgId, submission.submission_id, answers, userId, role);
    res.status(STATUS_CODES.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function submitAssessment(req, res, next) {
  try {
    const { goalId, assignmentId } = req.params;
    const { employeeComments, answers } = req.body;
    const orgId = req.user.organizationId;
    const userId = req.user.id;
    const role = req.user.role;

    const submission = await service.resolveSubmission(goalId, assignmentId, orgId, req.user);
    requireAssignedEmployee(submission, req.user);
    const result = await service.submitAssessment(orgId, submission.submission_id, employeeComments, answers, userId, role);
    res.status(STATUS_CODES.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function reviewAssessment(req, res, next) {
  try {
    const { goalId, assignmentId } = req.params;
    const { status, managerComments, answers } = req.body;
    const orgId = req.user.organizationId;
    const reviewerId = req.user.id;
    const role = req.user.role;

    const submission = await service.resolveSubmission(goalId, assignmentId, orgId, req.user);
    requireReviewer(req.user);
    const result = await service.reviewAssessment(orgId, submission.submission_id, reviewerId, role, { status, managerComments, answers });
    res.status(STATUS_CODES.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function acknowledgeAssessment(req, res, next) {
  try {
    const { goalId, assignmentId } = req.params;
    const orgId = req.user.organizationId;
    const userId = req.user.id;

    const submission = await service.resolveSubmission(goalId, assignmentId, orgId, req.user);
    requireAssignedEmployee(submission, req.user);
    const result = await service.acknowledgeAssessment(orgId, submission.submission_id, userId);
    res.status(STATUS_CODES.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function uploadAttachment(req, res, next) {
  try {
    const { answerId } = req.params;
    const orgId = req.user.organizationId;

    if (!req.files || req.files.length === 0) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, error: 'No files uploaded.' });
    }

    const file = req.files[0];
    const attachment = await service.uploadAttachment(orgId, answerId, file);
    res.status(STATUS_CODES.OK).json({ success: true, data: attachment });
  } catch (err) {
    next(err);
  }
}

async function verifyEvidence(req, res, next) {
  try {
    const { attachmentId } = req.params;
    const { status, managerFeedback } = req.body;
    const orgId = req.user.organizationId;

    const result = await service.verifyEvidence(orgId, attachmentId, status, managerFeedback);
    res.status(STATUS_CODES.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getSelfAssessmentConfiguration(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const config = await service.getSelfAssessmentConfiguration(orgId);
    res.status(STATUS_CODES.OK).json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
}

async function saveSelfAssessmentConfiguration(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const configJson = req.body;
    const config = await service.saveSelfAssessmentConfiguration(orgId, configJson);
    res.status(STATUS_CODES.OK).json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
}

function sendCSV(res, filename, rows, columnsMap) {
  const headers = Object.values(columnsMap).join(',')
  const keys = Object.keys(columnsMap)
  
  const body = rows.map(row => 
    keys.map(key => {
      let val = ''
      if (key.includes('.')) {
        const parts = key.split('.')
        val = row[parts[0]] ? row[parts[0]][parts[1]] : ''
      } else {
        val = row[key] ?? ''
      }
      
      const valStr = String(val)
      if (valStr.includes(',') || valStr.includes('"') || valStr.includes('\n')) {
        return `"${valStr.replace(/"/g, '""')}"`
      }
      return valStr
    }).join(',')
  )

  const csv = [headers, ...body].join('\n')
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  return res.status(STATUS_CODES.OK).send(csv)
}

async function getSummaryReport(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const { cycle_id, department_id, manager_employee_id, employee_id, status, export: exportType } = req.query;

    const rows = await service.getSummaryReport(orgId, {
      cycle_id: cycle_id || null,
      department_id: department_id || null,
      manager_employee_id: manager_employee_id || null,
      employee_id: employee_id || null,
      status: status || null
    });

    if (exportType === 'csv') {
      return sendCSV(res, 'self_assessment_summary_report.csv', rows, {
        employee_name: 'Employee Name',
        department_name: 'Department',
        cycle_name: 'Cycle Name',
        status: 'Status',
        overall_employee_score: 'Self Rating Score',
        overall_manager_score: 'Manager Review Score',
        final_score: 'Final Score',
        employee_acknowledged: 'Acknowledged'
      });
    }

    res.status(STATUS_CODES.OK).json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function getComparisonReport(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const { cycle_id, department_id, employee_id, export: exportType } = req.query;

    const rows = await service.getComparisonReport(orgId, {
      cycle_id: cycle_id || null,
      department_id: department_id || null,
      employee_id: employee_id || null
    });

    if (exportType === 'csv') {
      return sendCSV(res, 'self_assessment_comparison_report.csv', rows, {
        employee_name: 'Employee Name',
        department_name: 'Department',
        question: 'Question',
        question_type: 'Question Type',
        employee_rating: 'Employee Rating',
        manager_rating: 'Manager Rating'
      });
    }

    res.status(STATUS_CODES.OK).json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSelfAssessmentTemplate,
  saveSelfAssessmentTemplate,
  getSubmissionAndAnswers,
  saveDraftAnswers,
  submitAssessment,
  reviewAssessment,
  acknowledgeAssessment,
  uploadAttachment,
  verifyEvidence,
  getSelfAssessmentConfiguration,
  saveSelfAssessmentConfiguration,
  getSummaryReport,
  getComparisonReport
};
