const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
  });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, tokenType: 'refresh' }, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL,
  });
}

function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

module.exports = { signAccessToken, signRefreshToken, verifyToken };
