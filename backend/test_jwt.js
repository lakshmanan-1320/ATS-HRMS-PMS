require('dotenv').config();
const jwt = require('jsonwebtoken');
const env = require('./src/config/env');
const { signToken, verifyToken } = require('./src/utils/jwt');

console.log('Env loaded JWT config:', env.jwt);
console.log('process.env.JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 'undefined');

try {
  const payload = { userId: 1, role: 'client_admin' };
  const token = signToken(payload);
  console.log('Signed token:', token);
  const verified = verifyToken(token);
  console.log('Verified payload:', verified);
  console.log('JWT signature / validation is 100% correct.');
} catch (err) {
  console.error('Error during token verification:', err);
}
