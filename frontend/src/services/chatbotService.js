import axios from 'axios';

/**
 * chatbotService.js
 * Service layer encapsulating API calls to backend AI chat endpoints.
 */
export async function sendChatMessage(message, category = 'IT_SECURITY', policyId = null) {
  const token = sessionStorage.getItem('sa_token');
  
  const response = await axios.post(
    '/api/ai/chat',
    {
      message,
      category,
      policyId
    },
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 45000 // 45 sec timeout for AI inference
    }
  );

  return response.data;
}
