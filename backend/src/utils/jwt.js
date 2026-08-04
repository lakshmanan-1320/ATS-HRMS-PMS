const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signToken(payload, options = {}) {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
    ...options,
  });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

module.exports = {
  signToken,
  verifyToken,
};
