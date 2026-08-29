import axios from 'axios';

/**
 * chatbotService.js
 * Service layer for local AI / RAG chatbot.
 * Interoperates between Data Security and Code of Conduct RAG flows.
 */
export async function sendChatMessage(
  message,
  category = null,
  policyId = null,
  history = []
) {
  const token = sessionStorage.getItem('sa_token');

  const endpoint = '/api/policies/ai-chat';

  // Supply both message and question properties, and only include category if explicitly selected
  const requestBody = {
    question: message,
    message,
    history,
    ...(category ? { category } : {}),
    policyId
  };

  const response = await axios.post(
    endpoint,
    requestBody,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json'
      },
      timeout: 90000 // 90 sec timeout for slow local AI inference
    }
  );

  return response.data;
}
