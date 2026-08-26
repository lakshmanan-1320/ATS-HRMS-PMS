
const { query } = require('../config/db');
const policyRetriever = require('./policyRetriever.service');

async function chat(body, user) {
  const { message } = body;

  if (!message) {
    throw new Error('Message is required.');
  }

  let organizationId = user?.organizationId;

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

  console.log('Organization ID:', organizationId);
  console.log('User question:', message);

  const policies = await policyRetriever.retrievePolicies(
    organizationId,
    message,
    5
  );

  return {
    success: true,
    question: message,
    organizationId,
    policies
  };
}

module.exports = {
  chat
};

// async function chat(body, user) {
//   const { message } = body;

//   if (!message) {
//     throw new Error('Message is required.');
//   }

//   /*
//    * organizationId comes from the authenticated JWT.
//    *
//    * Your current req.user contains:
//    * {
//    *   userId,
//    *   organizationId,
//    *   role,
//    *   ...
//    * }
//    */

//   const organizationId = user?.organizationId;

//   if (!organizationId) {
//     throw new Error('Organization ID is required.');
//   }

//   console.log('================ AI SERVICE ================');
//   console.log('Organization ID:', organizationId);
//   console.log('User question:', message);
//   console.log('============================================');

//   const policies = await policyRetriever.retrievePolicies(
//     organizationId,
//     message,
//     5
//   );

//   return {
//     success: true,
//     question: message,
//     organizationId,
//     policies
//   };
// }

// module.exports = {
//   chat
// };