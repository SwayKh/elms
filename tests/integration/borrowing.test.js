const h = require('./helpers');
const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

before(async () => {
  await h.resetDb();
});

beforeEach(async () => {
  await h.resetDb();
});

test('POST /api/books/:id/borrow creates a digital loan', async () => {
  const user = await h.createUser();
  const book = await h.createBook();

  const res = await h.api.post(`/api/books/${book.id}/borrow`).set(h.auth(user));
  assert.equal(res.status, 201);
  assert.equal(res.body.loan.status, 'ACTIVE');
  assert.ok(new Date(res.body.loan.expiresAt) > new Date());
});

test('borrowing the same book twice conflicts', async () => {
  const user = await h.createUser();
  const book = await h.createBook();

  await h.api.post(`/api/books/${book.id}/borrow`).set(h.auth(user));
  const res = await h.api.post(`/api/books/${book.id}/borrow`).set(h.auth(user));
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'ALREADY_BORROWED');
});

test('two different users can borrow the same book simultaneously', async () => {
  const userA = await h.createUser();
  const userB = await h.createUser();
  const book = await h.createBook();

  const a = await h.api.post(`/api/books/${book.id}/borrow`).set(h.auth(userA));
  const b = await h.api.post(`/api/books/${book.id}/borrow`).set(h.auth(userB));
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
});

test('POST /api/books/:id/renew extends the expiry date', async () => {
  const user = await h.createUser();
  const book = await h.createBook();
  const loan = (await h.api.post(`/api/books/${book.id}/borrow`).set(h.auth(user))).body.loan;

  const res = await h.api.post(`/api/books/${book.id}/renew`).set(h.auth(user));
  assert.equal(res.status, 200);
  assert.ok(new Date(res.body.loan.expiresAt) > new Date(loan.expiresAt));
});

test('renewing without an active loan returns 404', async () => {
  const user = await h.createUser();
  const book = await h.createBook();
  const res = await h.api.post(`/api/books/${book.id}/renew`).set(h.auth(user));
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'LOAN_NOT_FOUND');
});

test('file access is denied without an active loan', async () => {
  const user = await h.createUser();
  const book = await h.createBook();
  const res = await h.api.get(`/api/books/${book.id}/file`).set(h.auth(user));
  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'LOAN_REQUIRED');
});

test('admin uploads a file; borrowing user can download it', async () => {
  const admin = await h.createAdmin();
  const user = await h.createUser();
  const book = await h.createBook();

  const upload = await h.api
    .post(`/api/books/${book.id}/files`)
    .set(h.auth(admin))
    .attach('file', Buffer.from('%PDF-1.4 fake content for testing'), {
      filename: 'the-book.pdf',
      contentType: 'application/pdf',
    });
  assert.equal(upload.status, 201);
  assert.equal(upload.body.file.fileType, 'PDF');
  assert.ok(upload.body.file.fileSize > 0);

  await h.api.post(`/api/books/${book.id}/borrow`).set(h.auth(user));

  const download = await h.api.get(`/api/books/${book.id}/file`).set(h.auth(user));
  assert.equal(download.status, 200);
  assert.ok(Buffer.isBuffer(download.body));
  assert.equal(download.body.toString('utf8'), '%PDF-1.4 fake content for testing');
  assert.match(download.headers['content-disposition'], /the-book\.pdf/);
});

test('a non-admin user cannot upload book files', async () => {
  const user = await h.createUser();
  const book = await h.createBook();
  const res = await h.api
    .post(`/api/books/${book.id}/files`)
    .set(h.auth(user))
    .attach('file', Buffer.from('%PDF-1.4'), { filename: 'x.pdf', contentType: 'application/pdf' });
  assert.equal(res.status, 403);
});

test('uploading an unsupported file type is rejected', async () => {
  const admin = await h.createAdmin();
  const book = await h.createBook();
  const res = await h.api
    .post(`/api/books/${book.id}/files`)
    .set(h.auth(admin))
    .attach('file', Buffer.from('#!/bin/sh'), { filename: 'evil.sh', contentType: 'text/x-sh' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'UNSUPPORTED_FILE_TYPE');
});

test('an expired loan no longer grants file access', async () => {
  const user = await h.createUser();
  const book = await h.createBook();
  const admin = await h.createAdmin();

  await h.api
    .post(`/api/books/${book.id}/files`)
    .set(h.auth(admin))
    .attach('file', Buffer.from('%PDF-1.4'), { filename: 'b.pdf', contentType: 'application/pdf' });

  await h.prisma.digitalLoan.create({
    data: {
      userId: user.id,
      bookId: book.id,
      borrowedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
    },
  });

  const res = await h.api.get(`/api/books/${book.id}/file`).set(h.auth(user));
  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'LOAN_REQUIRED');

  const count = await h.prisma.digitalLoan.count({ where: { status: 'EXPIRED' } });
  assert.equal(count, 1);
});
