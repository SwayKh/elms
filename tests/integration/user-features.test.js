const h = require('./helpers');
const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

before(async () => {
  await h.resetDb();
});

beforeEach(async () => {
  await h.resetDb();
});

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

test('favorites: add, list, remove', async () => {
  const user = await h.createUser();
  const book = await h.createBook({ title: 'Favorite Me' });

  const add = await h.api.post(`/api/favorites/${book.id}`).set(h.auth(user));
  assert.equal(add.status, 201);

  const list = await h.api.get('/api/favorites').set(h.auth(user));
  assert.equal(list.status, 200);
  assert.equal(list.body.items.length, 1);
  assert.equal(list.body.items[0].book.title, 'Favorite Me');

  const remove = await h.api.delete(`/api/favorites/${book.id}`).set(h.auth(user));
  assert.equal(remove.status, 200);

  const after = await h.api.get('/api/favorites').set(h.auth(user));
  assert.equal(after.body.items.length, 0);
});

test('favorites: favoriting a missing book returns 404', async () => {
  const user = await h.createUser();
  const res = await h.api.post('/api/favorites/nonexistent').set(h.auth(user));
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'BOOK_NOT_FOUND');
});

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

test('reviews: create, list, update, delete', async () => {
  const user = await h.createUser();
  const book = await h.createBook();

  const create = await h.api
    .post(`/api/reviews/book/${book.id}`)
    .set(h.auth(user))
    .send({ rating: 4, comment: 'Great book' });
  assert.equal(create.status, 201);
  const reviewId = create.body.review.id;

  const list = await h.api.get(`/api/reviews/book/${book.id}`).set(h.auth(user));
  assert.equal(list.status, 200);
  assert.equal(list.body.items.length, 1);
  assert.equal(list.body.items[0].rating, 4);

  const update = await h.api
    .put(`/api/reviews/${reviewId}`)
    .set(h.auth(user))
    .send({ rating: 5, comment: 'Even better on reread' });
  assert.equal(update.status, 200);
  assert.equal(update.body.review.rating, 5);

  const del = await h.api.delete(`/api/reviews/${reviewId}`).set(h.auth(user));
  assert.equal(del.status, 200);
});

test('reviews: a user can only have one review per book', async () => {
  const user = await h.createUser();
  const book = await h.createBook();
  await h.api.post(`/api/reviews/book/${book.id}`).set(h.auth(user)).send({ rating: 3 });

  const res = await h.api.post(`/api/reviews/book/${book.id}`).set(h.auth(user)).send({ rating: 5 });
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'REVIEW_EXISTS');
});

test('reviews: rating outside 1-5 is rejected', async () => {
  const user = await h.createUser();
  const book = await h.createBook();
  const res = await h.api.post(`/api/reviews/book/${book.id}`).set(h.auth(user)).send({ rating: 9 });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('reviews: a user cannot modify another user review', async () => {
  const owner = await h.createUser();
  const other = await h.createUser();
  const book = await h.createBook();

  const review = (await h.api.post(`/api/reviews/book/${book.id}`).set(h.auth(owner)).send({ rating: 4 })).body.review;

  const res = await h.api.put(`/api/reviews/${review.id}`).set(h.auth(other)).send({ rating: 1 });
  assert.equal(res.status, 404);
});

// ---------------------------------------------------------------------------
// Reading progress
// ---------------------------------------------------------------------------

test('progress: defaults to 0, updates and persists', async () => {
  const user = await h.createUser();
  const book = await h.createBook();

  const initial = await h.api.get(`/api/progress/${book.id}`).set(h.auth(user));
  assert.equal(initial.status, 200);
  assert.equal(initial.body.progress.progress, 0);

  const update = await h.api.put(`/api/progress/${book.id}`).set(h.auth(user)).send({ progress: 63 });
  assert.equal(update.status, 200);
  assert.equal(update.body.progress.progress, 63);

  const again = await h.api.get(`/api/progress/${book.id}`).set(h.auth(user));
  assert.equal(again.body.progress.progress, 63);
});

test('progress: values outside 0-100 are rejected', async () => {
  const user = await h.createUser();
  const book = await h.createBook();
  const res = await h.api.put(`/api/progress/${book.id}`).set(h.auth(user)).send({ progress: 150 });
  assert.equal(res.status, 400);
});

// ---------------------------------------------------------------------------
// Bookmarks
// ---------------------------------------------------------------------------

test('bookmarks: create, list, update, delete', async () => {
  const user = await h.createUser();
  const book = await h.createBook();

  const create = await h.api
    .post(`/api/bookmarks/${book.id}`)
    .set(h.auth(user))
    .send({ location: 'epubcfi(/6/10!/4/2/4)', note: 'Interesting passage' });
  assert.equal(create.status, 201);
  const bookmarkId = create.body.bookmark.id;

  const list = await h.api.get(`/api/bookmarks/${book.id}`).set(h.auth(user));
  assert.equal(list.status, 200);
  assert.equal(list.body.bookmarks.length, 1);

  const update = await h.api
    .put(`/api/bookmarks/${bookmarkId}`)
    .set(h.auth(user))
    .send({ note: 'Updated note' });
  assert.equal(update.status, 200);
  assert.equal(update.body.bookmark.note, 'Updated note');

  const del = await h.api.delete(`/api/bookmarks/${bookmarkId}`).set(h.auth(user));
  assert.equal(del.status, 200);
});

test('bookmarks: duplicate location in the same book conflicts', async () => {
  const user = await h.createUser();
  const book = await h.createBook();
  await h.api.post(`/api/bookmarks/${book.id}`).set(h.auth(user)).send({ location: 'page-5' });

  const res = await h.api.post(`/api/bookmarks/${book.id}`).set(h.auth(user)).send({ location: 'page-5' });
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'DUPLICATE_BOOKMARK');
});
