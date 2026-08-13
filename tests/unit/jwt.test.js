process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/e_library_test';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { signAccessToken, signRefreshToken, verifyToken } = require('../../src/utils/jwt');

const user = { id: 'user_123', role: 'USER' };

test('signAccessToken and verifyToken round-trip', () => {
  const token = signAccessToken(user);
  const payload = verifyToken(token);
  assert.equal(payload.sub, user.id);
  assert.equal(payload.role, user.role);
  assert.equal(payload.tokenType, undefined);
});

test('signRefreshToken marks the token type as refresh', () => {
  const token = signRefreshToken(user);
  const payload = verifyToken(token);
  assert.equal(payload.tokenType, 'refresh');
  assert.equal(payload.sub, user.id);
});

test('verifyToken throws for a tampered token', () => {
  const token = signAccessToken(user);
  assert.throws(() => verifyToken(`${token.slice(0, -2)}xx`));
});
