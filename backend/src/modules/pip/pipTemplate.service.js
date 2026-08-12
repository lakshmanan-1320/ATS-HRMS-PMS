const repo = require('./pip.repository');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');

async function createTemplate(orgId, data) {
  const { name, duration_days, checkin_frequency, completion_threshold_pct, metrics } = data;

  const template = await repo.createTemplate(orgId, {
    name,
    duration_days,
    checkin_frequency,
    completion_threshold_pct
  });

  const savedMetrics = await repo.saveTemplateMetrics(template.template_id, metrics);
  return { ...template, metrics: savedMetrics };
}

async function updateTemplate(orgId, templateId, data) {
  const { name, duration_days, checkin_frequency, completion_threshold_pct, metrics } = data;

  const template = await repo.updateTemplate(orgId, templateId, {
    name,
    duration_days,
    checkin_frequency,
    completion_threshold_pct
  });
  if (!template) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Template not found.');

  const savedMetrics = await repo.saveTemplateMetrics(templateId, metrics);
  return { ...template, metrics: savedMetrics };
}

async function deleteTemplate(orgId, templateId) {
  await repo.deleteTemplate(orgId, templateId);
  return true;
}

async function getTemplate(orgId, templateId) {
  const template = await repo.getTemplate(orgId, templateId);
  if (!template) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Template not found.');

  const metrics = await repo.getTemplateMetrics(templateId);
  return { ...template, metrics };
}

async function listTemplates(orgId) {
  const list = await repo.listTemplates(orgId);
  const result = [];
  for (const t of list) {
    const metrics = await repo.getTemplateMetrics(t.template_id);
    result.push({ ...t, metrics });
  }
  return result;
}

module.exports = {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates
};
