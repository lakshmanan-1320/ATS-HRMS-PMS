const chatbotService = require('./chatbot.service');
const logger = require('../config/logger');

/**
 * Handles AI Chat queries based on tenant Data Security policies
 */
async function handleChatQuery(req, res, next) {
  try {
    const organizationId = req.user?.organizationId || req.user?.organization_id;
    const { question } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required in user context.'
      });
    }

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Question is required.'
      });
    }

    let searchCategory = undefined;
    if (req.body.category) {
      searchCategory = req.body.category === 'IT_SECURITY' ? 'IT & Data Security' : 'Leave & Employee Conduct';
    }

    // Call chatbot RAG pipeline, passing mapped category filter (or undefined to default to both targets)
    const result = await chatbotService.getChatbotResponse(
      organizationId,
      question.trim(),
      searchCategory
    );

    return res.json(result);
  } catch (err) {
    logger.error('[ChatbotController] Error handling policy AI chat query:', err);
    next(err);
  }
}

module.exports = {
  handleChatQuery
};
