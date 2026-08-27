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

    // Call chatbot RAG pipeline, locked to 'IT & Data Security' category
    const result = await chatbotService.getChatbotResponse(
      organizationId,
      question.trim(),
      'IT & Data Security'
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
