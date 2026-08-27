import axios from 'axios';

/**
 * chatbotService.js
 * Service layer for local AI / RAG chatbot.
 * Interoperates between Data Security and Code of Conduct RAG flows.
 */
export async function sendChatMessage(
  message,
  category = 'IT_SECURITY',
  policyId = null
) {
  const token = sessionStorage.getItem('sa_token');

  // Route to the appropriate backend controller dynamically based on the category
  const endpoint = category === 'IT_SECURITY' ? '/api/policies/ai-chat' : '/api/ai/chat';

  // Supply both message and question properties to satisfy both controllers
  const requestBody = {
    question: message,
    message,
    category,
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