const { query, withTransaction } = require('../../config/db');

// --- PIP Settings ---
async function getSettings(orgId) {
  const res = await query(
    `SELECT * FROM pip_settings WHERE organization_id = $1`,
    [orgId]
  );
  return res.rows[0] || null;
}

async function saveSettings(orgId, data) {
  const {
    enable_pip,
    allow_manager_initiation,
    require_hr_approval,
    allow_manual_creation,
    enable_monitoring,
    allow_extension,
    max_extension_count,
    default_duration_days,
    default_checkin_frequency,
    reminder_frequency_days,
    enable_recommendation_engine,
    close_threshold_pct,
    extend_threshold_pct,
    escalate_threshold_pct,
    monitoring_duration_days,
    monitoring_checkin_frequency,
    monitoring_max_extension_count,
    monitoring_close_threshold_pct,
    monitoring_extend_threshold_pct,
    monitoring_convert_threshold_pct,
    appraisal_trigger_threshold_pct
  } = data;

  const res = await query(
    `INSERT INTO pip_settings (
      organization_id, enable_pip, allow_manager_initiation, require_hr_approval,
      allow_manual_creation, enable_monitoring, allow_extension, max_extension_count,
      default_duration_days, default_checkin_frequency, reminder_frequency_days,
      enable_recommendation_engine, close_threshold_pct, extend_threshold_pct, escalate_threshold_pct,
      monitoring_duration_days, monitoring_checkin_frequency, monitoring_max_extension_count,
      monitoring_close_threshold_pct, monitoring_extend_threshold_pct, monitoring_convert_threshold_pct,
      appraisal_trigger_threshold_pct,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW())
    ON CONFLICT (organization_id) DO UPDATE SET
      enable_pip = EXCLUDED.enable_pip,
      allow_manager_initiation = EXCLUDED.allow_manager_initiation,
      require_hr_approval = EXCLUDED.require_hr_approval,
      allow_manual_creation = EXCLUDED.allow_manual_creation,
      enable_monitoring = EXCLUDED.enable_monitoring,
      allow_extension = EXCLUDED.allow_extension,
      max_extension_count = EXCLUDED.max_extension_count,
      default_duration_days = EXCLUDED.default_duration_days,
      default_checkin_frequency = EXCLUDED.default_checkin_frequency,
      reminder_frequency_days = EXCLUDED.reminder_frequency_days,
      enable_recommendation_engine = EXCLUDED.enable_recommendation_engine,
      close_threshold_pct = EXCLUDED.close_threshold_pct,
      extend_threshold_pct = EXCLUDED.extend_threshold_pct,
      escalate_threshold_pct = EXCLUDED.escalate_threshold_pct,
      monitoring_duration_days = EXCLUDED.monitoring_duration_days,
      monitoring_checkin_frequency = EXCLUDED.monitoring_checkin_frequency,
      monitoring_max_extension_count = EXCLUDED.monitoring_max_extension_count,
      monitoring_close_threshold_pct = EXCLUDED.monitoring_close_threshold_pct,
      monitoring_extend_threshold_pct = EXCLUDED.monitoring_extend_threshold_pct,
      monitoring_convert_threshold_pct = EXCLUDED.monitoring_convert_threshold_pct,
      appraisal_trigger_threshold_pct = EXCLUDED.appraisal_trigger_threshold_pct,
      updated_at = NOW()
    RETURNING *`,
    [
      orgId, enable_pip, allow_manager_initiation, require_hr_approval,
      allow_manual_creation, enable_monitoring, allow_extension, max_extension_count,
      default_duration_days, default_checkin_frequency, reminder_frequency_days,
      enable_recommendation_engine, close_threshold_pct, extend_threshold_pct, escalate_threshold_pct,
      monitoring_duration_days || 30, monitoring_checkin_frequency || 'WEEKLY', monitoring_max_extension_count || 1,
      monitoring_close_threshold_pct || 80.00, monitoring_extend_threshold_pct || 50.00, monitoring_convert_threshold_pct || 50.00,
      appraisal_trigger_threshold_pct || 50.00
    ]
  );
  return res.rows[0];
}

// --- PIP Bell Curve Settings ---
async function getBellCurveSettings(orgId) {
  const res = await query(
    `SELECT pbcs.*, bcb.bucket_name, bcb.color
     FROM pip_bell_curve_settings pbcs
     JOIN bell_curve_buckets bcb ON pbcs.bucket_id = bcb.bucket_id
     WHERE pbcs.organization_id = $1`,
    [orgId]
  );
  return res.rows;
}

async function saveBellCurveSettings(orgId, settingsList) {
  return await withTransaction(async (client) => {
    // Delete existing settings
    await client.query(
      `DELETE FROM pip_bell_curve_settings WHERE organization_id = $1`,
      [orgId]
    );

    const inserted = [];
    for (const item of settingsList) {
      const res = await client.query(
        `INSERT INTO pip_bell_curve_settings (organization_id, bucket_id, min_appraisal_score)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [orgId, item.bucket_id, item.min_appraisal_score || null]
      );
      inserted.push(res.rows[0]);
    }
    return inserted;
  });
}

// --- PIP Templates ---
async function createTemplate(orgId, data) {
  const { name, duration_days, checkin_frequency, completion_threshold_pct } = data;
  const res = await query(
    `INSERT INTO pip_templates (organization_id, name, duration_days, checkin_frequency, completion_threshold_pct)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [orgId, name, duration_days, checkin_frequency, completion_threshold_pct]
  );
  return res.rows[0];
}

async function updateTemplate(orgId, templateId, data) {
  const { name, duration_days, checkin_frequency, completion_threshold_pct } = data;
  const res = await query(
    `UPDATE pip_templates
     SET name = $1, duration_days = $2, checkin_frequency = $3, completion_threshold_pct = $4, updated_at = NOW()
     WHERE template_id = $5 AND organization_id = $6
     RETURNING *`,
    [name, duration_days, checkin_frequency, completion_threshold_pct, templateId, orgId]
  );
  return res.rows[0] || null;
}

async function deleteTemplate(orgId, templateId) {
  await query(
    `DELETE FROM pip_templates WHERE template_id = $1 AND organization_id = $2`,
    [templateId, orgId]
  );
  return true;
}

async function getTemplate(orgId, templateId) {
  const res = await query(
    `SELECT * FROM pip_templates WHERE template_id = $1 AND organization_id = $2`,
    [templateId, orgId]
  );
  return res.rows[0] || null;
}

async function listTemplates(orgId) {
  const res = await query(
    `SELECT * FROM pip_templates WHERE organization_id = $1 ORDER BY created_at DESC`,
    [orgId]
  );
  return res.rows;
}

// --- Template Metrics ---
async function saveTemplateMetrics(templateId, metrics) {
  return await withTransaction(async (client) => {
    await client.query(
      `DELETE FROM pip_template_metrics WHERE template_id = $1`,
      [templateId]
    );

    const inserted = [];
    for (const m of metrics) {
      const res = await client.query(
        `INSERT INTO pip_template_metrics (
          template_id, metric_name, metric_source, metric_key, target_type, default_target, weight, display_order, required
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          templateId, m.metric_name, m.metric_source, m.metric_key || null, m.target_type || 'PERCENTAGE',
          m.default_target, m.weight, m.display_order || 0, m.required !== false
        ]
      );
      inserted.push(res.rows[0]);
    }
    return inserted;
  });
}

async function getTemplateMetrics(templateId) {
  const res = await query(
    `SELECT * FROM pip_template_metrics WHERE template_id = $1 ORDER BY display_order ASC`,
    [templateId]
  );
  return res.rows;
}

// --- PIP Candidates ---
async function createCandidate(orgId, data) {
  const {
    employee_id, source, source_reference_id, appraisal_score,
    bell_curve_bucket_id, status, recommendation_reason, created_by
  } = data;

  const res = await query(
    `INSERT INTO pip_candidates (
      organization_id, employee_id, source, source_reference_id, appraisal_score,
      bell_curve_bucket_id, status, recommendation_reason, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      orgId, employee_id, source, source_reference_id || null, appraisal_score || null,
      bell_curve_bucket_id || null, status || 'PENDING', recommendation_reason || null, created_by || null
    ]
  );
  return res.rows[0];
}

async function getCandidate(orgId, candidateId) {
  const res = await query(
    `SELECT pc.candidate_id, pc.organization_id, pc.employee_id, pc.source, pc.source_reference_id,
            COALESCE(pc.appraisal_score, (
              SELECT final_score 
              FROM manager_appraisals ma 
              WHERE ma.employee_id = pc.employee_id AND ma.status = 'submitted' AND ma.final_score IS NOT NULL 
              ORDER BY ma.created_at DESC 
              LIMIT 1
            )) AS appraisal_score,
            pc.bell_curve_bucket_id, pc.status, pc.recommendation_reason, pc.rejection_remarks, pc.created_by, pc.created_at, pc.updated_at,
            e.first_name, e.last_name, e.employee_code, e.designation,
            dept.name AS department_name,
            CONCAT(mgr.first_name, ' ', mgr.last_name) AS manager_name
     FROM pip_candidates pc
     JOIN employees e ON pc.employee_id = e.employee_id
     LEFT JOIN departments dept ON e.department_id = dept.department_id
     LEFT JOIN employees mgr ON e.manager_employee_id = mgr.employee_id
     WHERE pc.candidate_id = $1 AND pc.organization_id = $2`,
    [candidateId, orgId]
  );
  return res.rows[0] || null;
}

async function updateCandidateStatus(orgId, candidateId, status, remarks, userContextId) {
  const fieldName = status === 'REJECTED' ? 'rejection_remarks' : 'rejection_remarks'; // use same field for audit logs/remarks
  const res = await query(
    `UPDATE pip_candidates
     SET status = $1, rejection_remarks = $2, updated_at = NOW()
     WHERE candidate_id = $3 AND organization_id = $4
     RETURNING *`,
    [status, remarks || null, candidateId, orgId]
  );
  return res.rows[0] || null;
}

async function listCandidates(orgId, filters = {}) {
  let sql = `
     SELECT pc.candidate_id, pc.organization_id, pc.employee_id, pc.source, pc.source_reference_id,
            COALESCE(pc.appraisal_score, (
              SELECT final_score 
              FROM manager_appraisals ma 
              WHERE ma.employee_id = pc.employee_id AND ma.status = 'submitted' AND ma.final_score IS NOT NULL 
              ORDER BY ma.created_at DESC 
              LIMIT 1
            )) AS appraisal_score,
            pc.bell_curve_bucket_id, pc.status, pc.recommendation_reason, pc.rejection_remarks, pc.created_by, pc.created_at, pc.updated_at,
            e.first_name, e.last_name, e.employee_code, e.designation,
            dept.name AS department_name,
            CONCAT(mgr.first_name, ' ', mgr.last_name) AS manager_name,
            bcb.bucket_name AS bell_curve_bucket_name, bcb.color AS bell_curve_bucket_color
     FROM pip_candidates pc
     JOIN employees e ON pc.employee_id = e.employee_id
     LEFT JOIN departments dept ON e.department_id = dept.department_id
     LEFT JOIN employees mgr ON e.manager_employee_id = mgr.employee_id
     LEFT JOIN bell_curve_buckets bcb ON pc.bell_curve_bucket_id = bcb.bucket_id
     WHERE pc.organization_id = $1
  `;
  const params = [orgId];
  let idx = 2;

  if (filters.status) {
    sql += ` AND pc.status = $${idx++}`;
    params.push(filters.status);
  }
  if (filters.employee_id) {
    sql += ` AND pc.employee_id = $${idx++}`;
    params.push(filters.employee_id);
  }

  sql += ` ORDER BY pc.created_at DESC`;

  const res = await query(sql, params);
  return res.rows;
}

// --- Active PIP Records ---
async function createPip(orgId, data) {
  const {
    employee_id, candidate_id, template_id, status, start_date, end_date,
    checkin_frequency, reason, created_by, parent_pip_id, is_monitoring
  } = data;

  const res = await query(
    `INSERT INTO pips (
      organization_id, employee_id, candidate_id, template_id, status,
      start_date, end_date, checkin_frequency, reason, created_by, parent_pip_id, is_monitoring
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      orgId, employee_id, candidate_id || null, template_id || null, status || 'ACTIVE',
      start_date, end_date, checkin_frequency || 'WEEKLY', reason, created_by || null, parent_pip_id || null, is_monitoring || false
    ]
  );
  return res.rows[0];
}

async function getPip(orgId, pipId) {
  const res = await query(
    `SELECT p.*,
            e.first_name, e.last_name, e.employee_code, e.designation,
            dept.name AS department_name,
            CONCAT(mgr.first_name, ' ', mgr.last_name) AS manager_name,
            t.name AS template_name,
            parent.status AS parent_status,
            parent.start_date AS parent_start_date,
            parent.end_date AS parent_end_date
     FROM pips p
     JOIN employees e ON p.employee_id = e.employee_id
     LEFT JOIN departments dept ON e.department_id = dept.department_id
     LEFT JOIN employees mgr ON e.manager_employee_id = mgr.employee_id
     LEFT JOIN pip_templates t ON p.template_id = t.template_id
     LEFT JOIN pips parent ON p.parent_pip_id = parent.pip_id
     WHERE p.pip_id = $1 AND p.organization_id = $2`,
    [pipId, orgId]
  );
  return res.rows[0] || null;
}

async function updatePipStatus(orgId, pipId, status, remarks, userContextId) {
  const res = await query(
    `UPDATE pips
     SET status = $1, hr_decision_remarks = $2, updated_at = NOW()
     WHERE pip_id = $3 AND organization_id = $4
     RETURNING *`,
    [status, remarks || null, pipId, orgId]
  );
  return res.rows[0] || null;
}

async function extendPip(orgId, pipId, newEndDate, remarks) {
  const res = await query(
    `UPDATE pips
     SET status = 'EXTENDED',
         end_date = $1,
         extension_count = extension_count + 1,
         hr_decision_remarks = $2,
         updated_at = NOW()
     WHERE pip_id = $3 AND organization_id = $4
     RETURNING *`,
    [newEndDate, remarks || null, pipId, orgId]
  );
  return res.rows[0] || null;
}

async function confirmRead(orgId, pipId) {
  const res = await query(
    `UPDATE pips
     SET employee_acknowledged = TRUE,
         employee_acknowledged_at = NOW(),
         updated_at = NOW()
     WHERE pip_id = $1 AND organization_id = $2
     RETURNING *`,
    [pipId, orgId]
  );
  return res.rows[0] || null;
}

async function updateOverallProgress(orgId, pipId, progress) {
  const res = await query(
    `UPDATE pips
     SET overall_progress = $1, updated_at = NOW()
     WHERE pip_id = $2 AND organization_id = $3
     RETURNING *`,
    [progress, pipId, orgId]
  );
  return res.rows[0] || null;
}

async function listPips(orgId, filters = {}) {
  let sql = `
     SELECT p.*,
            e.first_name, e.last_name, e.employee_code, e.designation,
            dept.name AS department_name,
            CONCAT(mgr.first_name, ' ', mgr.last_name) AS manager_name,
            t.name AS template_name
     FROM pips p
     JOIN employees e ON p.employee_id = e.employee_id
     LEFT JOIN departments dept ON e.department_id = dept.department_id
     LEFT JOIN employees mgr ON e.manager_employee_id = mgr.employee_id
     LEFT JOIN pip_templates t ON p.template_id = t.template_id
     WHERE p.organization_id = $1
  `;
  const params = [orgId];
  let idx = 2;

  if (filters.status) {
    sql += ` AND p.status = $${idx++}`;
    params.push(filters.status);
  }
  if (filters.employee_id) {
    sql += ` AND p.employee_id = $${idx++}`;
    params.push(filters.employee_id);
  }
  if (filters.manager_employee_id) {
    sql += ` AND e.manager_employee_id = $${idx++}`;
    params.push(filters.manager_employee_id);
  }
  if (filters.is_monitoring !== undefined) {
    sql += ` AND p.is_monitoring = $${idx++}`;
    params.push(filters.is_monitoring === 'true' || filters.is_monitoring === true);
  }

  sql += ` ORDER BY p.created_at DESC`;

  const res = await query(sql, params);
  return res.rows;
}

async function getPipHistory(orgId, employeeId) {
  const res = await query(
    `SELECT p.*, t.name AS template_name
     FROM pips p
     LEFT JOIN pip_templates t ON p.template_id = t.template_id
     WHERE p.employee_id = $1 AND p.organization_id = $2
     ORDER BY p.created_at DESC`,
    [employeeId, orgId]
  );
  return res.rows;
}

// --- PIP Metrics ---
async function savePipMetrics(pipId, metrics) {
  return await withTransaction(async (client) => {
    await client.query(
      `DELETE FROM pip_metrics WHERE pip_id = $1`,
      [pipId]
    );

    const inserted = [];
    for (const m of metrics) {
      const res = await client.query(
        `INSERT INTO pip_metrics (
          pip_id, metric_name, metric_source, metric_key, target_type, target_value, weight, display_order, required,
          direction, calculation_type, measurement_frequency, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          pipId, m.metric_name, m.metric_source, m.metric_key || null, m.target_type || 'PERCENTAGE',
          m.target_value, m.weight, m.display_order || 0, m.required !== false,
          m.direction || 'HIGHER_IS_BETTER', m.calculation_type || 'HIGHER_IS_BETTER', m.measurement_frequency || 'WEEKLY', m.is_active !== false
        ]
      );
      inserted.push(res.rows[0]);
    }
    return inserted;
  });
}

async function getPipMetrics(pipId) {
  const res = await query(
    `SELECT * FROM pip_metrics WHERE pip_id = $1 ORDER BY display_order ASC`,
    [pipId]
  );
  return res.rows;
}

async function updateMetricProgress(metricId, currentValue, completionPct) {
  const res = await query(
    `UPDATE pip_metrics
     SET current_value = $1, completion_pct = $2, updated_at = NOW()
     WHERE pip_metric_id = $3
     RETURNING *`,
    [currentValue, completionPct, metricId]
  );
  return res.rows[0] || null;
}

// --- PIP Check-ins ---
async function createCheckin(pipId, data) {
  const { checkin_date, status } = data;
  const res = await query(
    `INSERT INTO pip_checkins (pip_id, checkin_date, status)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [pipId, checkin_date, status || 'PENDING']
  );
  return res.rows[0];
}

async function getCheckin(checkinId) {
  const res = await query(
    `SELECT * FROM pip_checkins WHERE checkin_id = $1`,
    [checkinId]
  );
  return res.rows[0] || null;
}

async function listCheckins(pipId) {
  const res = await query(
    `SELECT * FROM pip_checkins WHERE pip_id = $1 ORDER BY checkin_date ASC`,
    [pipId]
  );
  return res.rows;
}

async function completeCheckin(checkinId, data) {
  const {
    overall_progress_at_checkin, manager_progress_rating, manager_notes,
    action_items, risks, next_meeting_date
  } = data;

  const res = await query(
    `UPDATE pip_checkins
     SET status = 'COMPLETED',
         overall_progress_at_checkin = $1,
         manager_progress_rating = $2,
         manager_notes = $3,
         action_items = $4,
         risks = $5,
         next_meeting_date = $6,
         updated_at = NOW()
     WHERE checkin_id = $7
     RETURNING *`,
    [
      overall_progress_at_checkin, manager_progress_rating, manager_notes || null,
      action_items || null, risks || null, next_meeting_date || null, checkinId
    ]
  );
  return res.rows[0] || null;
}

async function updateEmployeeCheckinComments(checkinId, comments) {
  const res = await query(
    `UPDATE pip_checkins
     SET employee_comments = $1, updated_at = NOW()
     WHERE checkin_id = $2
     RETURNING *`,
    [comments, checkinId]
  );
  return res.rows[0] || null;
}

// --- Check-in Metric Values ---
async function saveCheckinMetricValues(checkinId, metricValues) {
  const inserted = [];
  for (const mv of metricValues) {
    const res = await query(
      `INSERT INTO pip_checkin_metric_values (checkin_id, pip_metric_id, current_value, completion_pct)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (checkin_id, pip_metric_id) DO UPDATE SET
         current_value = EXCLUDED.current_value,
         completion_pct = EXCLUDED.completion_pct
       RETURNING *`,
      [checkinId, mv.pip_metric_id, mv.current_value, mv.completion_pct]
    );
    inserted.push(res.rows[0]);
  }
  return inserted;
}

async function getCheckinMetricValues(checkinId) {
  const res = await query(
    `SELECT pcmv.*, pm.metric_name, pm.metric_source, pm.target_type, pm.target_value
     FROM pip_checkin_metric_values pcmv
     JOIN pip_metrics pm ON pcmv.pip_metric_id = pm.pip_metric_id
     WHERE pcmv.checkin_id = $1`,
    [checkinId]
  );
  return res.rows;
}

// --- PIP Evidence Upload ---
async function createEvidence(pipId, checkinId, uploadedBy, fileName, filePath, description) {
  const res = await query(
    `INSERT INTO pip_evidence (pip_id, checkin_id, uploaded_by, file_name, file_path, description)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [pipId, checkinId || null, uploadedBy || null, fileName, filePath, description || null]
  );
  return res.rows[0];
}

async function getEvidence(pipId) {
  const res = await query(
    `SELECT pe.*, u.email AS uploaded_by_email
     FROM pip_evidence pe
     LEFT JOIN users u ON pe.uploaded_by = u.user_id
     WHERE pe.pip_id = $1
     ORDER BY pe.created_at DESC`,
    [pipId]
  );
  return res.rows;
}

async function getLatestEmployeeAppraisal(orgId, employeeId) {
  const res = await query(
    `SELECT final_score 
     FROM manager_appraisals ma
     JOIN employees e ON ma.employee_id = e.employee_id
     WHERE e.employee_id = $1 AND e.organization_id = $2 AND ma.status = 'submitted' AND ma.final_score IS NOT NULL
     ORDER BY ma.created_at DESC
     LIMIT 1`,
    [employeeId, orgId]
  );
  return res.rows[0] || null;
}

async function getMetricTrendSnapshots(pipId) {
  const res = await query(
    `SELECT cmv.pip_metric_id, cmv.current_value, cmv.completion_pct,
            c.checkin_date, c.checkin_id
     FROM pip_checkin_metric_values cmv
     JOIN pip_checkins c ON cmv.checkin_id = c.checkin_id
     WHERE c.pip_id = $1 AND c.status = 'COMPLETED'
     ORDER BY c.checkin_date ASC`,
    [pipId]
  );
  return res.rows;
}

module.exports = {
  getMetricTrendSnapshots,
  getLatestEmployeeAppraisal,
  getSettings,
  saveSettings,
  getBellCurveSettings,
  saveBellCurveSettings,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  saveTemplateMetrics,
  getTemplateMetrics,
  createCandidate,
  getCandidate,
  updateCandidateStatus,
  listCandidates,
  createPip,
  getPip,
  updatePipStatus,
  extendPip,
  confirmRead,
  updateOverallProgress,
  listPips,
  getPipHistory,
  savePipMetrics,
  getPipMetrics,
  updateMetricProgress,
  createCheckin,
  getCheckin,
  listCheckins,
  completeCheckin,
  updateEmployeeCheckinComments,
  saveCheckinMetricValues,
  getCheckinMetricValues,
  createEvidence,
  getEvidence
};
