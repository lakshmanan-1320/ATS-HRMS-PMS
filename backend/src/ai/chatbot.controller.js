const aiService = require('./ai.service');
const logger = require('../config/logger');

/**
 * Handles AI Chat queries based on tenant HR policies
 */
async function handleChatQuery(req, res, next) {
  try {
    const result = await aiService.chat(req.body, req.user);
    return res.json(result);
  } catch (err) {
    logger.error('[ChatbotController] Error handling policy AI chat query:', err);
    next(err);
  }
}

module.exports = {
  handleChatQuery
};
