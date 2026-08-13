const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword } = require('../../src/utils/password');

test('hashPassword produces a non-plaintext hash', async () => {
  const hash = await hashPassword('supersecret');
  assert.notStrictEqual(hash, 'supersecret');
  assert.ok(hash.includes('$2'));
});

test('verifyPassword matches the correct password', async () => {
  const hash = await hashPassword('supersecret');
  assert.equal(await verifyPassword('supersecret', hash), true);
});

test('verifyPassword rejects an incorrect password', async () => {
  const hash = await hashPassword('supersecret');
  assert.equal(await verifyPassword('wrongpassword', hash), false);
});
