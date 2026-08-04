const repository = require('./goalCompletion.repository');
const { withTransaction } = require('../../config/db');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');

async function submitCompletion(employeeId, orgId, goalId, bodyData, files = []) {
  const { comments, completion_date, links } = bodyData;

  if (!comments || !comments.trim()) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Completion comments are required.');
  }

  const goal = await repository.findGoalById(goalId);
  if (!goal) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal not found.');
  }

  if (goal.assigned_to_employee_id !== employeeId) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'You can only submit completion evidence for goals assigned to you.');
  }

  if (!['in_progress', 'active'].includes(goal.status)) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      `Goal cannot be submitted for completion when status is '${goal.status}'. Only Active or In Progress goals can be completed.`
    );
  }

  const existingPending = await repository.findPendingCompletionRequest(goalId);
  if (existingPending) {
    throw new ApiError(
      STATUS_CODES.CONFLICT,
      'A completion request is already pending verification for this goal.'
    );
  }

  let parsedLinks = [];
  if (links) {
    try {
      parsedLinks = typeof links === 'string' ? JSON.parse(links) : links;
    } catch {
      parsedLinks = [];
    }
  }

  return await withTransaction(async (client) => {
    // 1. Create request
    const request = await repository.createCompletionRequest({
      organization_id: orgId,
      goal_id: goalId,
      employee_id: employeeId,
      completion_comments: comments.trim(),
      completion_date: completion_date || null
    }, client);

    // 2. Add attachments
    let attachments = [];
    if (files && files.length > 0) {
      attachments = await repository.createAttachments(request.goal_completion_request_id, files, client);
    }

    // 3. Add links
    let savedLinks = [];
    if (Array.isArray(parsedLinks) && parsedLinks.length > 0) {
      savedLinks = await repository.createLinks(request.goal_completion_request_id, parsedLinks, client);
    }

    // 4. Update goal status to pending_verification
    await repository.updateGoalStatus(goalId, 'pending_verification', {}, client);

    return {
      ...request,
      attachments,
      links: savedLinks
    };
  });
}

async function getMyCompletionRequests(employeeId, orgId) {
  return await repository.getEmployeeCompletionRequests(employeeId, orgId);
}

async function getManagerCompletionRequests(managerEmployeeId, orgId, filters = {}) {
  return await repository.getManagerCompletionRequests(managerEmployeeId, orgId, filters);
}

async function approveCompletionRequest(requestId, user) {
  const request = await repository.findCompletionRequestById(requestId);
  if (!request) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal completion request not found.');
  }

  if (request.status !== 'PENDING') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Only PENDING requests can be approved. Current status: ${request.status}`);
  }

  return await withTransaction(async (client) => {
    const updatedRequest = await repository.approveCompletionRequest(requestId, user.userId || user.id, client);
    await repository.updateGoalStatus(request.goal_id, 'completed', { approved_by: user.employeeId || null }, client);
    return updatedRequest;
  });
}

async function rejectCompletionRequest(requestId, remarks, user) {
  if (!remarks || !remarks.trim()) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Manager remarks are required when rejecting a completion request.');
  }

  const request = await repository.findCompletionRequestById(requestId);
  if (!request) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal completion request not found.');
  }

  if (request.status !== 'PENDING') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Only PENDING requests can be rejected. Current status: ${request.status}`);
  }

  return await withTransaction(async (client) => {
    const updatedRequest = await repository.rejectCompletionRequest(requestId, remarks.trim(), user.userId || user.id, client);
    await repository.updateGoalStatus(request.goal_id, 'in_progress', { rejected_by: user.employeeId || null, rejection_reason: remarks.trim() }, client);
    return updatedRequest;
  });
}

async function getGoalCompletionHistory(goalId) {
  const goal = await repository.findGoalById(goalId);
  if (!goal) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal not found.');
  }
  return await repository.getGoalCompletionHistory(goalId);
}

module.exports = {
  submitCompletion,
  getMyCompletionRequests,
  getManagerCompletionRequests,
  approveCompletionRequest,
  rejectCompletionRequest,
  getGoalCompletionHistory,
};
