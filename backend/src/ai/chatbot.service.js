const aiService = require('./ai.service');

/**
 * Main entrypoint for policy questions
 * 
 * @param {string} organizationId - Tenant organization ID
 * @param {string} question - Employee question
 * @returns {Promise<object>} - AI Answer and source metadata
 */
async function getChatbotResponse(organizationId, question) {
  return aiService.chat({ message: question }, { organizationId });
}

module.exports = {
  getChatbotResponse
};
