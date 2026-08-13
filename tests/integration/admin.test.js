const h = require('./helpers');
const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

before(async () => {
  await h.resetDb();
});

beforeEach(async () => {
  await h.resetDb();
});

test('GET /api/admin/stats is restricted to admins', async () => {
  const user = await h.createUser();
  const res = await h.api.get('/api/admin/stats').set(h.auth(user));
  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'ADMIN_REQUIRED');
});

test('GET /api/admin/stats returns library totals', async () => {
  const admin = await h.createAdmin();
  const user = await h.createUser();
  await h.createBook();
  await h.createCategory('Fantasy');
  await h.createAuthor('Tolkien');

  const res = await h.api.get('/api/admin/stats').set(h.auth(admin));
  assert.equal(res.status, 200);
  assert.equal(res.body.totals.users, 2);
  assert.equal(res.body.totals.books, 1);
  assert.equal(res.body.totals.categories, 1);
  assert.equal(res.body.totals.authors, 1);
  assert.equal(typeof res.body.totals.activeLoans, 'number');

  // user id left unused on purpose but still in the DB count above
  assert.ok(user.id);
});

test('GET /api/admin/ai-usage returns 503 when no AI token is configured', async () => {
  const admin = await h.createAdmin();
  const res = await h.api.get('/api/admin/ai-usage').set(h.auth(admin));

  // .env.test must NOT contain a real AI token, so this never hits the real API.
  assert.equal(res.status, 503);
  assert.equal(res.body.error.code, 'AI_NOT_CONFIGURED');
});
