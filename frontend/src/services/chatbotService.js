import axios from 'axios';

/**
 * chatbotService.js
 * Service layer for local AI / RAG chatbot.
 */

const API_BASE_URL = 'http://localhost:5000';

export async function sendChatMessage(
  message,
  category = 'IT_SECURITY',
  policyId = null
) {
  const token = sessionStorage.getItem('sa_token');

  const response = await axios.post(
    `${API_BASE_URL}/api/ai/chat`,
    {
      message,
      category,
      policyId
    },
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json'
      },
      timeout: 60000
    }
  );

  return response.data;
}