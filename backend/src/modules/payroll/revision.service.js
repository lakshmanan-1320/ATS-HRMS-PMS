const { withTransaction, query } = require('../../config/db');
const repository = require('./revision.repository');
const payrollRepository = require('./payroll.repository');
const { logAudit } = require('../../utils/auditLog');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');

async function createRevision(orgId, employeeId, payload, createdBy) {
  return await withTransaction(async (client) => {
    // 1. Fetch active/previous configuration on the new effective date
    const oldConfig = await payrollRepository.getEmployeeSalaryConfigForDate(orgId, employeeId, payload.effective_from, client);

    const oldAmt = oldConfig ? parseFloat(oldConfig.salary_type === 'ANNUAL_CTC' ? oldConfig.ctc_amount : oldConfig.gross_salary) : 0.00;
    const newAmt = parseFloat(payload.new_salary_amount) || 0.00;

    const incrementAmount = newAmt - oldAmt;
    const incrementPercentage = oldAmt > 0 ? (incrementAmount / oldAmt) * 100 : 0.00;

    // Determine status based on effective date relative to today
    const today = new Date().toISOString().split('T')[0];
    const status = payload.effective_from <= today ? 'EFFECTIVE' : 'PENDING';

    // 2. Insert new salary config & components
    const payrollService = require('./payroll.service');
    const savePayload = await payrollService.generateSalaryConfigPayload(
      orgId,
      employeeId,
      payload.salary_type,
      newAmt,
      payload.effective_from
    );

    const newConfig = await payrollRepository.saveEmployeeSalaryConfig(orgId, employeeId, savePayload, client);

    // 3. Create the Revision Record
    const revision = await repository.createRevision(orgId, {
      employee_id: employeeId,
      old_salary_config_id: oldConfig ? oldConfig.employee_salary_config_id : null,
      new_salary_config_id: newConfig.employee_salary_config_id,
      increment_amount: incrementAmount,
      increment_percentage: incrementPercentage,
      effective_from: payload.effective_from,
      reason: payload.reason,
      remarks: payload.remarks,
      status: status,
      created_by: createdBy
    }, client);

    // 4. Log audit trace
    await logAudit({
      actorId: createdBy,
      action: 'CREATE_SALARY_REVISION',
      target: employeeId,
      metadata: {
        increment_amount: incrementAmount,
        increment_percentage: incrementPercentage,
        effective_from: payload.effective_from,
        reason: payload.reason,
        status: status
      }
    });

    return revision;
  });
}

async function getRevisionById(orgId, id) {
  const result = await repository.getRevisionById(orgId, id);
  if (!result) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Salary revision log not found.');
  }
  return result;
}

async function listRevisions(orgId, filters) {
  return await repository.listRevisions(orgId, filters);
}

async function getRevisionHistory(orgId, employeeId) {
  return await repository.getRevisionHistory(orgId, employeeId);
}

async function cancelRevision(orgId, id, actorId) {
  return await withTransaction(async (client) => {
    // 1. Fetch revision record
    const revisionRes = await client.query(`
      SELECT * FROM salary_revisions
      WHERE organization_id = $1 AND revision_id = $2
    `, [orgId, id]);
    const revision = revisionRes.rows[0];

    if (!revision) {
      throw new ApiError(STATUS_CODES.NOT_FOUND, 'Salary revision record not found.');
    }

    if (revision.status === 'CANCELLED') {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Salary revision is already cancelled.');
    }

    const today = new Date().toISOString().split('T')[0];
    const effectiveStr = new Date(revision.effective_from).toISOString().split('T')[0];

    // Check if the revision effective date is in the past
    if (effectiveStr <= today) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only future/upcoming salary revisions can be cancelled.');
    }

    // 2. Transition status to CANCELLED
    const updated = await repository.updateRevisionStatus(orgId, id, 'CANCELLED', client);

    // 3. Delete the associated new configuration (cascades components)
    if (revision.new_salary_config_id) {
      await client.query(`
        DELETE FROM employee_salary_configs
        WHERE organization_id = $1 AND employee_salary_config_id = $2
      `, [orgId, revision.new_salary_config_id]);
    }

    // 4. Safely restore the previous configuration's effective_to date
    if (revision.old_salary_config_id) {
      const nextConfigRes = await client.query(`
        SELECT effective_from FROM employee_salary_configs
        WHERE organization_id = $1 AND employee_id = $2
          AND employee_salary_config_id != $3
          AND effective_from > (
            SELECT effective_from FROM employee_salary_configs WHERE employee_salary_config_id = $4
          )
        ORDER BY effective_from ASC
        LIMIT 1
      `, [orgId, revision.employee_id, revision.new_salary_config_id, revision.old_salary_config_id]);

      if (nextConfigRes.rows.length > 0) {
        await client.query(`
          UPDATE employee_salary_configs
          SET effective_to = ($1::date - INTERVAL '1 day')::date, updated_at = NOW()
          WHERE employee_salary_config_id = $2
        `, [nextConfigRes.rows[0].effective_from, revision.old_salary_config_id]);
      } else {
        await client.query(`
          UPDATE employee_salary_configs
          SET effective_to = NULL, updated_at = NOW()
          WHERE employee_salary_config_id = $1
        `, [revision.old_salary_config_id]);
      }
    }

    // 5. Log Audit
    await logAudit({
      actorId,
      action: 'CANCEL_SALARY_REVISION',
      target: revision.employee_id,
      metadata: {
        revision_id: id,
        increment_amount: revision.increment_amount,
        effective_from: revision.effective_from
      }
    });

    return updated;
  });
}

async function getDashboardStats(orgId) {
  return await repository.getDashboardStats(orgId);
}

module.exports = {
  createRevision,
  getRevisionById,
  listRevisions,
  getRevisionHistory,
  cancelRevision,
  getDashboardStats
};
