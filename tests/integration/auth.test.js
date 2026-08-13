const h = require('./helpers');
const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

before(async () => {
  await h.resetDb();
});

beforeEach(async () => {
  await h.resetDb();
});

test('GET /api/health is available without authentication', async () => {
  const res = await h.api.get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('POST /api/auth/register creates a user and returns tokens', async () => {
  const res = await h.api
    .post('/api/auth/register')
    .send({ name: 'Alice', email: 'alice@test.com', password: 'password123' });

  assert.equal(res.status, 201);
  assert.equal(res.body.user.email, 'alice@test.com');
  assert.equal(res.body.user.role, 'USER');
  assert.equal(res.body.user.passwordHash, undefined);
  assert.ok(res.body.tokens.accessToken);
  assert.ok(res.body.tokens.refreshToken);
});

test('POST /api/auth/register rejects a duplicate email with 409', async () => {
  await h.api.post('/api/auth/register').send({ name: 'A', email: 'dup@test.com', password: 'password123' });

  const res = await h.api
    .post('/api/auth/register')
    .send({ name: 'B', email: 'dup@test.com', password: 'password123' });

  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'EMAIL_TAKEN');
});

test('POST /api/auth/register validates input', async () => {
  const res = await h.api.post('/api/auth/register').send({ name: '', email: 'not-an-email', password: 'x' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(res.body.error.details));
});

test('POST /api/auth/login authenticates and rejects wrong password', async () => {
  await h.createUser({ email: 'login@test.com', password: 'password123', name: 'Login' });

  const ok = await h.api.post('/api/auth/login').send({ email: 'login@test.com', password: 'password123' });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.tokens.accessToken);
  assert.equal(ok.body.user.email, 'login@test.com');

  const bad = await h.api.post('/api/auth/login').send({ email: 'login@test.com', password: 'wrongpass' });
  assert.equal(bad.status, 401);
  assert.equal(bad.body.error.code, 'INVALID_CREDENTIALS');
});

test('POST /api/auth/refresh issues a new token pair', async () => {
  const user = await h.createUser({ email: 'refresh@test.com' });
  const refreshToken = h.refreshTokenFor(user);

  const res = await h.api.post('/api/auth/refresh').send({ refreshToken });
  assert.equal(res.status, 200);
  assert.ok(res.body.tokens.accessToken);
  assert.ok(res.body.tokens.refreshToken);
});

test('POST /api/auth/refresh rejects an invalid token', async () => {
  const res = await h.api.post('/api/auth/refresh').send({ refreshToken: 'garbage' });
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'INVALID_REFRESH_TOKEN');
});

test('GET /api/users/me returns the current user', async () => {
  const user = await h.createUser();
  const res = await h.api.get('/api/users/me').set(h.auth(user));
  assert.equal(res.status, 200);
  assert.equal(res.body.user.id, user.id);
});

test('GET /api/users/me requires authentication', async () => {
  const res = await h.api.get('/api/users/me');
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'UNAUTHENTICATED');
});

test('PUT /api/users/me/password changes the password', async () => {
  const user = await h.createUser({ email: 'pw@test.com', password: 'oldpassword' });
  const res = await h.api
    .put('/api/users/me/password')
    .set(h.auth(user))
    .send({ currentPassword: 'oldpassword', newPassword: 'newpassword' });
  assert.equal(res.status, 200);

  const login = await h.api.post('/api/auth/login').send({ email: 'pw@test.com', password: 'newpassword' });
  assert.equal(login.status, 200);
});
