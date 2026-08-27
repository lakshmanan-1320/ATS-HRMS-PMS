const { query } = require('../config/db');
const chatbotService = require('./chatbot.service');

async function chat(body, user) {
  const { message, category } = body;

  if (!message) {
    throw new Error('Message is required.');
  }

  let organizationId = user?.organizationId || user?.organization_id;

  // Fallback: get organization from users table
  if (!organizationId && user?.userId) {
    const result = await query(
      `
      SELECT organization_id
      FROM users
      WHERE user_id = $1
      LIMIT 1
      `,
      [user.userId]
    );

    organizationId = result.rows[0]?.organization_id;
  }

  if (!organizationId) {
    throw new Error('Organization ID is required.');
  }

  // Determine categories to search (search specific category or default to both targets)
  const targetCategory = category === 'IT_SECURITY' ? 'IT & Data Security' : 'Leave & Employee Conduct';

  // Call the unified chatbot service
  const result = await chatbotService.getChatbotResponse(
    organizationId,
    message,
    targetCategory
  );

  return {
    success: result.success,
    question: message,
    answer: result.answer,
    sources: result.sources,
    metrics: result.metrics
  };
}

module.exports = {
  chat
};