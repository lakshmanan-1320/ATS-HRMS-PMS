const path = require('path');
const fs = require('fs');
const policyService = require('./policy.service');
const logger = require('../../config/logger');

// Helper to extract clean plain text from HTML for content_text
function stripHtmlTags(html = '') {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Get all policies
 */
async function getPolicies(req, res, next) {
  try {
    const organizationId = req.user.organizationId || req.user.organization_id;
    const role = req.user.role;
    const { category, search } = req.query;

    const policies = await policyService.getAllPolicies(organizationId, role, { category, search });
    return res.json({ success: true, data: policies });
  } catch (err) {
    logger.error('[PolicyController] Error fetching policies:', err);
    next(err);
  }
}

/**
 * Get single policy details
 */
async function getPolicyById(req, res, next) {
  try {
    const organizationId = req.user.organizationId || req.user.organization_id;
    const role = req.user.role;
    const { id } = req.params;

    const policy = await policyService.getPolicyById(organizationId, id, role);
    if (!policy) {
      return res.status(404).json({ success: false, message: 'Policy not found or access denied.' });
    }

    return res.json({ success: true, data: policy });
  } catch (err) {
    logger.error('[PolicyController] Error fetching policy by ID:', err);
    next(err);
  }
}

/**
 * Create a new HR policy
 */
async function createPolicy(req, res, next) {
  try {
    const organizationId = req.user.organizationId || req.user.organization_id;
    const userId = req.user.userId || req.user.id;

    const {
      title,
      category,
      summary,
      contentHtml,
      contentText,
      keywords,
      versionNumber,
      effectiveDate,
      isPublished
    } = req.body;

    if (!title || !category || !contentHtml) {
      return res.status(400).json({ success: false, message: 'Title, category, and content are required.' });
    }

    // Determine document parameters
    let documentUrl = '';
    let documentName = '';
    let documentSize = 0;

    if (req.file) {
      documentUrl = `uploads/hr_policies/${req.file.filename}`;
      documentName = req.file.originalname;
      documentSize = req.file.size;
    } else if (req.body.documentUrl) {
      documentUrl = req.body.documentUrl;
      documentName = req.body.documentName || path.basename(req.body.documentUrl);
      documentSize = parseInt(req.body.documentSize, 10) || 0;
    } else {
      return res.status(400).json({ success: false, message: 'A PDF or DOCX policy document file is required.' });
    }

    // Extract plain text if not explicitly sent
    const finalPlainContent = contentText && contentText.trim() ? contentText : stripHtmlTags(contentHtml);

    // Parse keywords
    let keywordArray = [];
    if (Array.isArray(keywords)) {
      keywordArray = keywords;
    } else if (typeof keywords === 'string') {
      keywordArray = keywords.split(',').map(k => k.trim()).filter(Boolean);
    }

    const policyData = {
      title: title.trim(),
      category: category.trim(),
      summary: summary ? summary.trim() : '',
      contentHtml: contentHtml.trim(),
      contentText: finalPlainContent,
      keywords: keywordArray,
      documentUrl,
      documentName,
      documentSize,
      versionNumber: versionNumber || '1.0',
      effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
      isPublished: String(isPublished) === 'true' || isPublished === true
    };

    const newPolicy = await policyService.createPolicy(organizationId, policyData, userId);

    if (req.logActivity) {
      await req.logActivity({
        action: 'CREATE_HR_POLICY',
        entityType: 'HR_POLICY',
        entityId: newPolicy.policy_id,
        details: { title: newPolicy.title, category: newPolicy.category }
      });
    }

    return res.status(201).json({ success: true, message: 'Policy created successfully.', data: newPolicy });
  } catch (err) {
    logger.error('[PolicyController] Error creating policy:', err);
    next(err);
  }
}

/**
 * Update an existing HR policy
 */
async function updatePolicy(req, res, next) {
  try {
    const organizationId = req.user.organizationId || req.user.organization_id;
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;

    const existing = await policyService.getPolicyById(organizationId, id, 'client_admin');
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Policy not found or access denied.' });
    }

    const {
      title,
      category,
      summary,
      contentHtml,
      contentText,
      keywords,
      versionNumber,
      effectiveDate,
      isPublished
    } = req.body;

    let documentUrl = existing.document_url;
    let documentName = existing.document_name;
    let documentSize = existing.document_size;

    if (req.file) {
      documentUrl = `uploads/hr_policies/${req.file.filename}`;
      documentName = req.file.originalname;
      documentSize = req.file.size;
    }

    const finalHtml = contentHtml !== undefined ? contentHtml.trim() : existing.content_html;
    const finalPlainContent = contentText !== undefined && contentText.trim()
      ? contentText.trim()
      : stripHtmlTags(finalHtml);

    let keywordArray = existing.keywords;
    if (keywords !== undefined) {
      if (Array.isArray(keywords)) {
        keywordArray = keywords;
      } else if (typeof keywords === 'string') {
        keywordArray = keywords.split(',').map(k => k.trim()).filter(Boolean);
      }
    }

    const policyData = {
      title: title !== undefined ? title.trim() : existing.title,
      category: category !== undefined ? category.trim() : existing.category,
      summary: summary !== undefined ? summary.trim() : existing.summary,
      contentHtml: finalHtml,
      contentText: finalPlainContent,
      keywords: keywordArray,
      documentUrl,
      documentName,
      documentSize,
      versionNumber: versionNumber !== undefined ? versionNumber.trim() : existing.version_number,
      effectiveDate: effectiveDate !== undefined ? effectiveDate : existing.effective_date,
      isPublished: isPublished !== undefined ? (String(isPublished) === 'true' || isPublished === true) : existing.is_published
    };

    const updated = await policyService.updatePolicy(organizationId, id, policyData, userId);

    if (req.logActivity) {
      await req.logActivity({
        action: 'UPDATE_HR_POLICY',
        entityType: 'HR_POLICY',
        entityId: id,
        details: { title: updated.title, category: updated.category }
      });
    }

    return res.json({ success: true, message: 'Policy updated successfully.', data: updated });
  } catch (err) {
    logger.error('[PolicyController] Error updating policy:', err);
    next(err);
  }
}

/**
 * Toggle policy lifecycle status (Draft / Published / Retired)
 */
async function updatePolicyStatus(req, res, next) {
  try {
    const organizationId = req.user.organizationId || req.user.organization_id;
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;
    const { isActive, isPublished } = req.body;

    const updated = await policyService.updatePolicyStatus(organizationId, id, { isActive, isPublished }, userId);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Policy not found or access denied.' });
    }

    if (req.logActivity) {
      await req.logActivity({
        action: 'UPDATE_HR_POLICY_STATUS',
        entityType: 'HR_POLICY',
        entityId: id,
        details: { isActive: updated.is_active, isPublished: updated.is_published }
      });
    }

    return res.json({ success: true, message: 'Policy status updated successfully.', data: updated });
  } catch (err) {
    logger.error('[PolicyController] Error updating policy status:', err);
    next(err);
  }
}

/**
 * Delete an HR policy
 */
async function deletePolicy(req, res, next) {
  try {
    const organizationId = req.user.organizationId || req.user.organization_id;
    const { id } = req.params;

    const deleted = await policyService.deletePolicy(organizationId, id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Policy not found or access denied.' });
    }

    return res.json({ success: true, message: 'Policy deleted successfully.' });
  } catch (err) {
    logger.error('[PolicyController] Error deleting policy:', err);
    next(err);
  }
}

/**
 * Secure Authenticated Document Download Endpoint
 */
async function getPolicyDocument(req, res, next) {
  try {
    const organizationId = req.user.organizationId || req.user.organization_id;
    const role = req.user.role;
    const { id } = req.params;

    const policy = await policyService.getPolicyById(organizationId, id, role);
    if (!policy || !policy.document_url) {
      return res.status(404).json({ success: false, message: 'Document not found or access denied.' });
    }

    const absolutePath = path.resolve(process.cwd(), policy.document_url);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, message: 'Physical document file missing on server.' });
    }

    // Securely serve the document file
    return res.download(absolutePath, policy.document_name);
  } catch (err) {
    logger.error('[PolicyController] Error downloading policy document:', err);
    next(err);
  }
}

module.exports = {
  getPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  updatePolicyStatus,
  deletePolicy,
  getPolicyDocument
};
