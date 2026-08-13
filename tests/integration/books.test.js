const h = require('./helpers');
const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

before(async () => {
  await h.resetDb();
});

beforeEach(async () => {
  await h.resetDb();
});

test('POST /api/books requires an admin', async () => {
  const user = await h.createUser();
  const res = await h.api
    .post('/api/books')
    .set(h.auth(user))
    .send({ title: 'Nope' });
  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'ADMIN_REQUIRED');
});

test('admin can create a book with authors and categories', async () => {
  const admin = await h.createAdmin();
  const author = await h.createAuthor('J. R. R. Tolkien');
  const category = await h.createCategory('Fantasy');

  const res = await h.api
    .post('/api/books')
    .set(h.auth(admin))
    .send({
      title: 'The Hobbit',
      description: 'A hobbit adventure.',
      isbn: '9780547928227',
      language: 'en',
      authorIds: [author.id],
      categoryIds: [category.id],
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.book.title, 'The Hobbit');
  assert.equal(res.body.book.authors[0].name, 'J. R. R. Tolkien');
  assert.equal(res.body.book.categories[0].name, 'Fantasy');
  assert.equal(res.body.book.avgRating, null);
});

test('creating a book with an invalid author id fails validation', async () => {
  const admin = await h.createAdmin();
  const res = await h.api
    .post('/api/books')
    .set(h.auth(admin))
    .send({ title: 'Bad', authorIds: ['nonexistent'] });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'INVALID_AUTHOR_IDS');
});

test('creating a book with a duplicate ISBN conflicts', async () => {
  const admin = await h.createAdmin();
  await h.api
    .post('/api/books')
    .set(h.auth(admin))
    .send({ title: 'First', isbn: '1234567890' });

  const res = await h.api
    .post('/api/books')
    .set(h.auth(admin))
    .send({ title: 'Second', isbn: '1234567890' });
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'DUPLICATE_ISBN');
});

test('GET /api/books lists books with pagination', async () => {
  await h.createBook({ title: 'Book A' });
  await h.createBook({ title: 'Book B' });

  const res = await h.api.get('/api/books').set(h.auth(await h.createUser()));
  assert.equal(res.status, 200);
  assert.equal(res.body.items.length, 2);
  assert.equal(res.body.pagination.total, 2);
  assert.equal(res.body.pagination.totalPages, 1);
});

test('GET /api/books searches by title and filters by category/language', async () => {
  const fantasy = await h.createCategory('Fantasy');
  const scifi = await h.createCategory('Science Fiction');

  const book = await h.createBook({ title: 'The Hobbit', language: 'en' });
  const book2 = await h.createBook({ title: 'Dune', language: 'fr' });

  await h.prisma.bookCategory.createMany({
    data: [
      { bookId: book.id, categoryId: fantasy.id },
      { bookId: book2.id, categoryId: scifi.id },
    ],
  });

  const user = await h.createUser();

  const byTitle = await h.api.get('/api/books?search=hobbit').set(h.auth(user));
  assert.equal(byTitle.status, 200);
  assert.equal(byTitle.body.pagination.total, 1);
  assert.equal(byTitle.body.items[0].title, 'The Hobbit');

  const byCategory = await h.api.get('/api/books?category=fantasy').set(h.auth(user));
  assert.equal(byCategory.body.pagination.total, 1);
  assert.equal(byCategory.body.items[0].title, 'The Hobbit');

  const byLanguage = await h.api.get('/api/books?language=fr').set(h.auth(user));
  assert.equal(byLanguage.body.pagination.total, 1);
  assert.equal(byLanguage.body.items[0].title, 'Dune');
});

test('GET /api/books/:id returns a single book', async () => {
  const book = await h.createBook({ title: '1984' });
  const res = await h.api.get(`/api/books/${book.id}`).set(h.auth(await h.createUser()));
  assert.equal(res.status, 200);
  assert.equal(res.body.book.title, '1984');
});

test('GET /api/books/:id returns 404 for a missing book', async () => {
  const res = await h.api.get('/api/books/nonexistent').set(h.auth(await h.createUser()));
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'BOOK_NOT_FOUND');
});

test('PUT /api/books/:id updates a book (admin only)', async () => {
  const admin = await h.createAdmin();
  const book = await h.createBook({ title: 'Before' });

  const res = await h.api.put(`/api/books/${book.id}`).set(h.auth(admin)).send({ title: 'After' });
  assert.equal(res.status, 200);
  assert.equal(res.body.book.title, 'After');
});

test('DELETE /api/books/:id deletes a book (admin only)', async () => {
  const admin = await h.createAdmin();
  const book = await h.createBook();

  const res = await h.api.delete(`/api/books/${book.id}`).set(h.auth(admin));
  assert.equal(res.status, 200);

  const missing = await h.api.get(`/api/books/${book.id}`).set(h.auth(admin));
  assert.equal(missing.status, 404);
});
