import axios from 'axios';

/**
 * chatbotService.js
 * Service layer encapsulating API calls to backend AI chat endpoints.
 */
export async function sendChatMessage(message) {
  const token = sessionStorage.getItem('sa_token');
  
  const response = await axios.post(
    '/api/policies/ai-chat',
    {
      question: message
    },
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 90000 // 90 sec timeout for AI inference
    }
  );

  return response.data;
}
